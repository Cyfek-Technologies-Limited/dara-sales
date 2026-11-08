import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!/^[a-f0-9-]{36}$/i.test(token)) return new NextResponse('Invalid unsubscribe link.', { status: 400 })
  return new NextResponse(`<!doctype html><html><body style="font-family:system-ui;padding:40px"><h1>Unsubscribe from this business</h1><p>You will stop receiving automated emails from this business.</p><form method="post"><button type="submit">Unsubscribe</button></form></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'" } })
}
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!/^[a-f0-9-]{36}$/i.test(token)) return new NextResponse('Invalid unsubscribe link.', { status: 400 })
  await pool.query(`INSERT INTO "EmailSuppression" ("organizationId", "email")
    SELECT "organizationId", "email" FROM "EmailSyncJob" WHERE "unsubscribeToken" = $1
    ON CONFLICT DO NOTHING RETURNING "email"`, [token])
  return new NextResponse('You have been unsubscribed from this business’s automated emails.', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
