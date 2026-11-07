import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'
import { cleanProspectingDraft } from '@/lib/prospecting-draft'

export async function POST(request: Request) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active admin.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body?.form || typeof body.form !== 'object') return NextResponse.json({ error: 'Invalid prospecting preferences.' }, { status: 400 })
  try {
    const result = await pool.query(`INSERT INTO "ProspectingPreference" ("organizationId", "authUserId", "form")
      VALUES ($1,$2,$3::jsonb) ON CONFLICT ("organizationId", "authUserId") DO UPDATE
      SET "form" = EXCLUDED."form", "updatedAt" = NOW() RETURNING "updatedAt"`,
      [admin.organization.id, admin.user.id, JSON.stringify(cleanProspectingDraft(body.form))])
    return NextResponse.json({ ok: true, updatedAt: result.rows[0].updatedAt })
  } catch {
    return NextResponse.json({ error: 'Could not sync your form to your account. Your browser draft is retained.' }, { status: 503 })
  }
}
