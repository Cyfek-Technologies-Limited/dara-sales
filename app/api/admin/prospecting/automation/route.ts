import { NextResponse } from 'next/server'
import { getWorkspaceSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic'
export async function GET() {
  const workspace = await getWorkspaceSession()
  if (!workspace) return NextResponse.json({ error: 'Sign in to your workspace.' }, { status: 401 })
  const { organization, user } = workspace
  const row = (await pool.query(`SELECT "enabled","location","targetContact","dailyTarget",
    CASE WHEN "day"=CURRENT_DATE THEN "addedToday" ELSE 0 END AS "addedToday",
    CASE WHEN "day"=CURRENT_DATE THEN "runsToday" ELSE 0 END AS "runsToday",
    "totalAdded","lastRunAt","nextRunAt","lastMessage",("lockedUntil">now()) AS "running"
    FROM "ProspectDiscovery" WHERE "organizationId"=$1 AND "authUserId"=$2`, [organization.id,user.id])).rows[0]
  const form = (await pool.query(`SELECT "form" FROM "ProspectingPreference" WHERE "organizationId"=$1 AND "authUserId"=$2`, [organization.id,user.id])).rows[0]?.form
  return NextResponse.json({ discovery: row || { enabled: false, location: form?.location || '', targetContact: form?.targetContact || '', dailyTarget: 50, addedToday: 0, totalAdded: 0 }, configured: Boolean(process.env.OPENAI_API_KEY), staff: organization.role === 'STAFF' }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function POST(request: Request) {
  const workspace = await getWorkspaceSession()
  if (!workspace) return NextResponse.json({ error: 'Sign in to your workspace.' }, { status: 401 })
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const location = typeof body.location === 'string' ? body.location.trim().slice(0,160) : ''
  const targetContact = typeof body.targetContact === 'string' ? body.targetContact.trim().slice(0,120) : ''
  if (typeof body.enabled !== 'boolean' || ![50,100].includes(body.dailyTarget) || (body.enabled && !location)) return NextResponse.json({ error: 'Enter a location and select 50 or 100 prospects per day.' }, { status: 400 })
  if (body.enabled && !process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'Web research is not configured.' }, { status: 503 })
  const { organization, user } = workspace
  const assigned = organization.industryIds?.length ? organization.industryIds : organization.industryId ? [organization.industryId] : []
  const count = (await pool.query(`SELECT c."id" FROM "IndustryCategory" c JOIN "Industry" i ON i."id"=c."industryId"
    WHERE i."organizationId"=$1 AND ($2::text[] IS NULL OR i."id"=ANY($2::text[])) LIMIT 1`, [organization.id,organization.role === 'STAFF' ? assigned : null])).rows.length
  if (body.enabled && !count) return NextResponse.json({ error: 'Add industry categories or ask an administrator to assign industries first.' }, { status: 400 })
  await pool.query(`INSERT INTO "ProspectDiscovery" ("organizationId","authUserId","enabled","location","targetContact","dailyTarget")
    VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT ("organizationId","authUserId") DO UPDATE SET
    "enabled"=$3,"location"=$4,"targetContact"=$5,"dailyTarget"=$6,"leaseId"=NULL,"lockedUntil"=NULL,
    "nextRunAt"=now(),"lastMessage"=CASE WHEN $3 THEN 'Waiting for the scheduler.' ELSE 'Automatic discovery paused.' END`,
  [organization.id,user.id,body.enabled,location,targetContact,body.dailyTarget])
  return NextResponse.json({ ok: true })
}
