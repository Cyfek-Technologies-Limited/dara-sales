import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'
import { smartleadRequest } from '@/lib/smartlead'
import { googleMailboxConfig, hashMailboxValue, mailboxCookie, mailboxCookiePath, mailboxScope } from '@/lib/google-mailbox'

export const maxDuration = 60

export async function GET(request: Request) {
  const config = googleMailboxConfig()
  if (!config) return NextResponse.json({ error: 'Google mailbox connection is not configured.' }, { status: 503 })
  function finish(status: string) {
    const destination = new URL('/admin/email-outreach', config!.origin)
    destination.searchParams.set('mailbox', status)
    const response = NextResponse.redirect(destination, { status: 303, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
    response.cookies.set(mailboxCookie, '', { httpOnly: true, secure: new URL(config!.origin).protocol === 'https:', sameSite: 'lax', path: mailboxCookiePath, maxAge: 0 })
    return response
  }
  let stage = 'state'
  try {
    const admin = await getAdminSession()
    if (!admin) return finish('expired')
    const query = new URL(request.url).searchParams
    const state = query.get('state') || ''
    const browser = (await cookies()).get(mailboxCookie)?.value || ''
    if (!/^[a-zA-Z0-9_-]{43}$/.test(state) || !browser) return finish('expired')
    // Consume once and require the same browser, admin, and organization.
    const saved = (await pool.query(`DELETE FROM "MailboxOAuthState" WHERE "id" = $1 AND "browserHash" = $2
      AND "organizationId" = $3 AND "authUserId" = $4 AND "expiresAt" > NOW() RETURNING "codeVerifier"`,
      [hashMailboxValue(state), hashMailboxValue(browser), admin.organization.id, admin.user.id])).rows[0]
    if (!saved) return finish('expired')
    if (query.get('error')) return finish('cancelled')
    const code = query.get('code')
    if (!code || code.length > 4096) return finish('expired')
    stage = 'google-token'
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, cache: 'no-store', redirect: 'error',
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri,
        grant_type: 'authorization_code', code, code_verifier: saved.codeVerifier }), signal: AbortSignal.timeout(12000),
    })
    const token = await tokenResponse.json().catch(() => ({}))
    if (!tokenResponse.ok || !token.access_token || !token.refresh_token || token.token_type?.toLowerCase() !== 'bearer') return finish('permissions')
    if (typeof token.scope !== 'string' || !token.scope.split(' ').includes(mailboxScope)) return finish('permissions')
    const expiresIn = Number(token.expires_in)
    if (!Number.isFinite(expiresIn) || expiresIn <= 0) return finish('permissions')
    stage = 'google-identity'
    const identityResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
    })
    const identity = await identityResponse.json().catch(() => ({}))
    if (!identityResponse.ok || identity.email_verified !== true || typeof identity.email !== 'string'
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email) || typeof identity.sub !== 'string') return finish('permissions')
    const email = identity.email.toLowerCase().trim()
    stage = 'workspace-binding'
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Lock the Google identity as well as the mailbox; aliases cannot claim it twice.
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`google-mailbox:${identity.sub}`])
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`mailbox-email:${email}`])
      const existing = (await client.query(`SELECT "id", "organizationId", "providerAccountId" FROM "OrganizationEmailSender"
        WHERE "googleSubject" = $1 OR LOWER("email") = $2 FOR UPDATE`, [identity.sub, email])).rows
      if (existing.some((row: { organizationId: string }) => row.organizationId !== admin.organization.id)) {
        await client.query('ROLLBACK')
        return finish('already-linked')
      }
      stage = 'smartlead-oauth'
      const result = await smartleadRequest(process.env.SMARTLEAD_API_KEY!, 'email-accounts/save-oauth', {
        from_name: typeof identity.name === 'string' ? identity.name.slice(0, 160) : admin.organization.name,
        from_email: email, username: email, type: 'GMAIL',
        ...(existing[0] ? { id: Number(existing[0].providerAccountId) } : {}),
        token: { scope: token.scope, token_type: 'Bearer', access_token: token.access_token, refresh_token: token.refresh_token, expiry_date: Date.now() + expiresIn * 1000 },
        use_whitelabel_credentials: true, warmup_enabled: false, max_email_per_day: 30, time_to_wait_in_mins: 8,
      })
      const account = result.data
      if (!account || !/^[1-9]\d*$/.test(String(account.id)) || account.from_email?.toLowerCase() !== email
        || account.is_smtp_success !== true || account.is_imap_success !== true) throw new Error('Mailbox verification incomplete')
      stage = 'save-binding'
      const binding = existing[0] ? await client.query(`UPDATE "OrganizationEmailSender"
        SET "providerAccountId" = $3, "email" = $4, "verifiedAt" = NOW(), "googleSubject" = $5
        WHERE "id" = $1 AND "organizationId" = $2 RETURNING "id"`,
        [existing[0].id, admin.organization.id, String(account.id), email, identity.sub])
        : await client.query(`INSERT INTO "OrganizationEmailSender" ("id", "organizationId", "providerAccountId", "email", "verifiedAt", "googleSubject")
        VALUES ($1,$2,$3,$4,NOW(),$5) ON CONFLICT ("providerAccountId") DO UPDATE SET "email" = $4, "verifiedAt" = NOW(), "googleSubject" = $5
        WHERE "OrganizationEmailSender"."organizationId" = $2 RETURNING "id"`,
        [crypto.randomUUID(), admin.organization.id, String(account.id), email, identity.sub])
      if (!binding.rows.length) throw new Error('Mailbox belongs to another workspace')
      await client.query('COMMIT')
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    return finish('connected')
  } catch {
    // Do not log provider errors, URLs, authorization codes, or OAuth tokens.
    console.error('[mailbox] Google connection failed', { stage })
    return finish('failed')
  }
}
