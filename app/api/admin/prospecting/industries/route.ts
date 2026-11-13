import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'Sign in as an active workspace member.' }, { status: 401 })
  const organization = (await pool.query(
    `SELECT o."id" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" IN ('ADMIN','STAFF') AND m."status" = 'ACTIVE' ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id],
  )).rows[0]
  if (!organization) return NextResponse.json({ error: 'Active workspace not found.' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''
  const subcategories = Array.isArray(body.subcategories) ? body.subcategories.filter((item): item is string => typeof item === 'string').map((item) => item.trim().slice(0, 80)).filter(Boolean) : []
  if (!name || subcategories.length !== 6 || new Set(subcategories.map((item) => item.toLowerCase())).size !== 6) {
    return NextResponse.json({ error: 'An industry and six different subcategories are required.' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let industry = (await client.query(
      `SELECT "id" FROM "Industry" WHERE "organizationId" = $1 AND LOWER("name") = LOWER($2) LIMIT 1`,
      [organization.id, name],
    )).rows[0]
    if (!industry) {
      industry = { id: crypto.randomUUID() }
      await client.query(`INSERT INTO "Industry" ("id", "organizationId", "name") VALUES ($1,$2,$3)`, [industry.id, organization.id, name])
    }
    const existingCategories = (await client.query(
      `SELECT LOWER("name") AS name FROM "IndustryCategory" WHERE "industryId" = $1 ORDER BY "createdAt", "name"`,
      [industry.id],
    )).rows
    const existingNames = new Set<string>(existingCategories.map((item) => item.name))
    let remainingSlots = Math.max(0, 6 - existingCategories.length)
    for (const category of subcategories) {
      if (remainingSlots === 0) break
      if (existingNames.has(category.toLowerCase())) continue
      await client.query(
        `INSERT INTO "IndustryCategory" ("id", "industryId", "name") VALUES ($1,$2,$3) ON CONFLICT ("industryId", "name") DO NOTHING`,
        [crypto.randomUUID(), industry.id, category],
      )
      existingNames.add(category.toLowerCase())
      remainingSlots -= 1
    }
    const saved = (await client.query(`SELECT "id", "name" FROM "IndustryCategory" WHERE "industryId" = $1`, [industry.id])).rows
    await client.query('COMMIT')
    return NextResponse.json({ id: industry.id, name, categories: saved })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[prospecting] Could not save suggested industry', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Could not add this industry to your workspace.' }, { status: 500 })
  } finally {
    client.release()
  }
}
