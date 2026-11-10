import { headers } from 'next/headers'
import { after, NextResponse } from 'next/server'
import { prepareEmailAutomation, processEmailQueue } from '@/lib/email-outreach'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { sameBusinessWebsite } from '@/lib/website-contacts'

export const maxDuration = 60

async function getAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const organization = (await pool.query(
    `SELECT o."id" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id],
  )).rows[0]
  return organization ? { organizationId: organization.id } : null
}

function validWebUrl(value: unknown) {
  if (typeof value !== 'string' || value.length > 600) return null
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null
    return url.toString()
  } catch { return null }
}

export async function POST(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Sign in as an organization admin.' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const businessName = typeof body.businessName === 'string' ? body.businessName.trim().slice(0, 160) : ''
  const summary = typeof body.summary === 'string' ? body.summary.trim().slice(0, 300) : ''
  const website = validWebUrl(body.website)
  const sourceUrl = validWebUrl(body.sourceUrl)
  const rawEmail = typeof body.publicEmail === 'string' ? body.publicEmail.trim().slice(0, 254) : ''
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null
  const rawPhone = typeof body.publicPhone === 'string' ? body.publicPhone.trim().slice(0, 40) : ''
  const phone = /^[+\d(][\d\s().+-]{6,38}$/.test(rawPhone) && rawPhone.replace(/\D/g, '').length >= 7 ? rawPhone : null
  const contactSourceUrl = validWebUrl(body.contactSourceUrl)
  const emailSourceUrl = validWebUrl(body.emailSourceUrl) || contactSourceUrl
  const phoneSourceUrl = validWebUrl(body.phoneSourceUrl) || contactSourceUrl
  const personSourceUrl = validWebUrl(body.personSourceUrl)
  const personSourceValid = personSourceUrl && website && new URL(personSourceUrl).hostname.toLowerCase().replace(/^www\./, '') === new URL(website).hostname.toLowerCase().replace(/^www\./, '')
  const contactName = personSourceValid && typeof body.contactName === 'string' ? body.contactName.trim().slice(0, 160) : null
  const contactJobTitle = contactName && typeof body.contactJobTitle === 'string' ? body.contactJobTitle.trim().slice(0, 160) : null
  const teamSourceUrl = validWebUrl(body.targetTeamSourceUrl)
  const groupInbox = body.inboxScope === 'GROUP' && !contactName && !phone && Boolean(email && website && teamSourceUrl
    && teamSourceUrl === emailSourceUrl && sameBusinessWebsite(website, teamSourceUrl)
    && email.split('@')[1].toLowerCase() === new URL(teamSourceUrl).hostname.toLowerCase().replace(/^www\./, ''))
  const teamSourceValid = teamSourceUrl && website && (groupInbox || sameBusinessWebsite(teamSourceUrl, website))
  const contactDepartment = (contactName || teamSourceValid) && typeof body.contactDepartment === 'string' ? body.contactDepartment.trim().slice(0, 100) : null
  const requestedOwnerId = typeof body.ownerId === 'string' ? body.ownerId.trim() : ''
  const categoryId = typeof body.categoryId === 'string' ? body.categoryId : ''
  if (!businessName || !website || !sourceUrl || !categoryId) return NextResponse.json({ error: 'Business, website, source link, and category are required.' }, { status: 400 })

  const category = (await pool.query(
    `SELECT c."id", i."name" AS "industryName" FROM "IndustryCategory" c JOIN "Industry" i ON i."id" = c."industryId"
     WHERE c."id" = $1 AND i."organizationId" = $2`, [categoryId, admin.organizationId],
  )).rows[0]
  const owner = requestedOwnerId ? (await pool.query(
    `SELECT m."authUserId" FROM "OrganizationMember" m
     WHERE m."authUserId" = $1 AND m."organizationId" = $2 AND m."role" = 'STAFF' AND m."status" = 'ACTIVE'`,
    [requestedOwnerId, admin.organizationId],
  )).rows[0] : null
  const ownerId = owner?.authUserId || null
  if (!category) return NextResponse.json({ error: 'Choose a valid industry category.' }, { status: 400 })
  if (email && !groupInbox && (!emailSourceUrl || !sameBusinessWebsite(emailSourceUrl, website!)) || phone && (!phoneSourceUrl || !sameBusinessWebsite(phoneSourceUrl, website!))) {
    return NextResponse.json({ error: 'Contact details need a source page on the business website.' }, { status: 400 })
  }

  const duplicate = (await pool.query(
    `SELECT "id" FROM "SalesLead" WHERE "organizationId" = $1 AND
      (LOWER("businessName") = LOWER($2) OR LOWER(COALESCE("website", '')) = LOWER($3)) LIMIT 1`,
    [admin.organizationId, businessName, website],
  )).rows[0]
  if (duplicate) return NextResponse.json({ error: 'This business is already in your prospect pipeline.' }, { status: 409 })

  const leadId = crypto.randomUUID()
  const teamSource = teamSourceValid && contactDepartment ? ` | ${groupInbox ? 'Group inbox' : body.inboxScope === 'DEPARTMENT' ? 'Department inbox' : 'Team'} source: ${teamSourceUrl}` : ''
  try {
    await prepareEmailAutomation(admin.organizationId).catch(() => console.error('[email] Could not prepare automation; scheduled worker will recover'))
    await pool.query(
      `INSERT INTO "SalesLead" ("id", "organizationId", "ownerId", "businessName", "email", "phone", "industry", "industryCategoryId", "website", "source", "notes", "contactName", "contactJobTitle", "contactDepartment", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())`,
      [leadId, admin.organizationId, ownerId, businessName, email, phone, category.industryName, categoryId, website, `Web research source: ${sourceUrl}${email && emailSourceUrl ? ` | Email source: ${emailSourceUrl}` : ''}${phone && phoneSourceUrl ? ` | Phone source: ${phoneSourceUrl}` : ''}${personSourceValid && contactName ? ` | Person source: ${personSourceUrl}` : ''}${teamSource}`, summary, contactName, contactJobTitle, contactDepartment],
    )
    after(() => processEmailQueue(admin.organizationId).then(() => {}).catch(() => console.error('[email] Background sync failed')))
    return NextResponse.json({ ok: true, id: leadId, ownerId }, { status: 201 })
  } catch (error) {
    console.error('[prospecting] Could not save business prospect', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Could not add this business to the prospects pipeline.' }, { status: 500 })
  }
}
