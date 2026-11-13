import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getWorkspaceSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'
import { encryptPassword, smtpTransport } from '@/lib/smtp-mailbox'

export async function POST(request: Request) {
  const admin = await getWorkspaceSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active workspace member.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const smtpHost = typeof body.host === 'string' ? body.host.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const senderName = typeof body.senderName === 'string' ? body.senderName.trim() : ''
  const smtpPort = Number(body.port)
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 254 || !password || password.length > 1024 || !senderName || senderName.length > 120 || /[\r\n]/.test(senderName)) return NextResponse.json({ error: 'Enter your business name, mailbox email, and SMTP password.' }, { status: 400 })
  try {
    const encrypted = encryptPassword(password, admin.organization.id)
    const transport = await smtpTransport({ smtpHost, smtpPort, smtpUsername: email, smtpPassword: encrypted, organizationId: admin.organization.id }, password)
    await transport.verify() // Authentication only; no email is sent.
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`outreach:${admin.organization.id}`])
      if ((await client.query('SELECT 1 FROM "EmailAutomation" WHERE "organizationId" = $1 AND "enabled" = TRUE', [admin.organization.id])).rows.length) throw new Error('active')
      await client.query(`INSERT INTO "OrganizationEmailSender" ("id", "organizationId", "providerAccountId", "email", "verifiedAt", "smtpHost", "smtpPort", "smtpUsername", "smtpPassword", "senderName")
        VALUES ($1,$2,$3,$4,NOW(),$5,$6,$4,$7,$8) ON CONFLICT ("providerAccountId") DO UPDATE SET
        "smtpHost"=$5,"smtpPort"=$6,"smtpUsername"=$4,"smtpPassword"=$7,"senderName"=$8,"verifiedAt"=NOW()
        WHERE "OrganizationEmailSender"."organizationId" = $2`, [randomUUID(), admin.organization.id, `smtp:${admin.organization.id}:${email}`, email, smtpHost, smtpPort, encrypted, senderName])
      await client.query('COMMIT')
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    return NextResponse.json({ ok: true, message: 'Business mailbox connected. Select it below and approve your message to start sending.' })
  } catch {
    return NextResponse.json({ error: 'Could not connect. Pause active outreach, check the public SMTP host, port 465/587, email, and SMTP/app password. Your provider must allow SMTP sign-in.' }, { status: 400 })
  }
}
