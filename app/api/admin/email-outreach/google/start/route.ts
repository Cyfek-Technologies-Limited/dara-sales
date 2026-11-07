import { randomBytes, createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'
import { googleMailboxConfig, hashMailboxValue, mailboxCookie, mailboxCookiePath, mailboxScope } from '@/lib/google-mailbox'

export async function POST(request: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active organization admin.' }, { status: 401 })
  const config = googleMailboxConfig()
  if (!config) return NextResponse.json({ error: 'Google mailbox connection is awaiting platform setup. Your administrator needs to configure the Google OAuth connection.' }, { status: 503 })
  if (request.headers.get('origin') !== config.origin) return NextResponse.json({ error: 'Open Dara using its configured website address before connecting a mailbox.' }, { status: 403 })
  try {
    const state = randomBytes(32).toString('base64url')
    const browser = randomBytes(32).toString('base64url')
    const verifier = randomBytes(48).toString('base64url')
    await pool.query('DELETE FROM "MailboxOAuthState" WHERE "expiresAt" < NOW()')
    await pool.query(`INSERT INTO "MailboxOAuthState" ("id", "organizationId", "authUserId", "browserHash", "codeVerifier", "expiresAt")
      VALUES ($1,$2,$3,$4,$5,NOW() + INTERVAL '10 minutes')`, [hashMailboxValue(state), admin.organization.id, admin.user.id, hashMailboxValue(browser), verifier])
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.search = new URLSearchParams({
      client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code',
      scope: `openid email profile ${mailboxScope}`, state, access_type: 'offline', prompt: 'consent select_account',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
    }).toString()
    const response = NextResponse.json({ url: url.toString() }, { headers: { 'Cache-Control': 'no-store' } })
    response.cookies.set(mailboxCookie, browser, { httpOnly: true, secure: new URL(config.origin).protocol === 'https:', sameSite: 'lax', path: mailboxCookiePath, maxAge: 600 })
    return response
  } catch { return NextResponse.json({ error: 'Could not start the mailbox connection. Check the database migration and try again.' }, { status: 503 }) }
}
