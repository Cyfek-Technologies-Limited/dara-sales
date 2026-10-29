import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

const stages = ['LEAD', 'PROSPECT', 'CLIENT', 'ONBOARDED', 'CAMPAIGN_SUCCESSFUL', 'LOST']
const nextStages: Record<string, string[]> = {
  LEAD: ['LEAD', 'PROSPECT', 'LOST'],
  PROSPECT: ['PROSPECT', 'CLIENT', 'LOST'],
  CLIENT: ['CLIENT', 'ONBOARDED', 'LOST'],
  ONBOARDED: ['ONBOARDED', 'CAMPAIGN_SUCCESSFUL', 'LOST'],
  CAMPAIGN_SUCCESSFUL: ['CAMPAIGN_SUCCESSFUL'],
  LOST: ['LOST', 'LEAD'],
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { id } = await params
  const member = (await pool.query(
    `SELECT "organizationId" FROM "OrganizationMember" WHERE "authUserId" = $1 AND "role" = 'STAFF' AND "status" = 'ACTIVE' ORDER BY "joinedAt" DESC LIMIT 1`,
    [session.user.id],
  )).rows[0]
  if (!member) return NextResponse.json({ error: 'Active staff membership required.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const stage = typeof body.stage === 'string' ? body.stage.toUpperCase() : ''
  const spend = body.advertiserSpend === undefined ? undefined : Number(body.advertiserSpend)
  if (!stages.includes(stage) || (spend !== undefined && (!Number.isFinite(spend) || spend < 0))) {
    return NextResponse.json({ error: 'Choose a valid pipeline stage and non-negative advertiser spend.' }, { status: 400 })
  }
  const current = (await pool.query(
    `SELECT "stage", "advertiserSpend"::text AS "advertiserSpend" FROM "SalesLead" WHERE "id" = $1 AND "organizationId" = $2 AND "ownerId" = $3`,
    [id, member.organizationId, session.user.id],
  )).rows[0]
  if (!current) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 })
  if (!nextStages[current.stage]?.includes(stage)) {
    return NextResponse.json({ error: `Move this record forward from ${current.stage.replaceAll('_', ' ').toLowerCase()} before selecting that stage.` }, { status: 409 })
  }
  const finalSpend = spend ?? Number(current.advertiserSpend)
  if (stage === 'CAMPAIGN_SUCCESSFUL' && finalSpend <= 0) {
    return NextResponse.json({ error: 'Enter the advertiser spend before marking a campaign successful.' }, { status: 400 })
  }
  await pool.query(
    `UPDATE "SalesLead" SET "stage" = $1, "advertiserSpend" = $2,
       "campaignSuccessfulAt" = CASE WHEN $1 = 'CAMPAIGN_SUCCESSFUL' THEN COALESCE("campaignSuccessfulAt", NOW()) ELSE NULL END,
       "updatedAt" = NOW() WHERE "id" = $3 AND "organizationId" = $4 AND "ownerId" = $5`,
    [stage, finalSpend, id, member.organizationId, session.user.id],
  )
  return NextResponse.json({ ok: true, commission: stage === 'CAMPAIGN_SUCCESSFUL' ? finalSpend * 0.1 : 0 })
}
