import { pool } from '@/lib/db'
import { researchProspects, type ResearchProgress } from '@/lib/prospect-research'

// Each scheduler tick claims one small batch. No request searches 100 companies at once.
export async function processProspectDiscovery() {
  if (!process.env.OPENAI_API_KEY) return { state: 'not-configured' }
  const leaseId = crypto.randomUUID()
  const job = (await pool.query(`WITH due AS (
    SELECT d."organizationId", d."authUserId" FROM "ProspectDiscovery" d
    JOIN "OrganizationMember" m ON m."organizationId"=d."organizationId" AND m."authUserId"=d."authUserId"
    WHERE d."enabled" AND m."status"='ACTIVE' AND m."role" IN ('ADMIN','STAFF')
      AND d."nextRunAt" <= now() AND (d."lockedUntil" IS NULL OR d."lockedUntil" < now())
      AND (d."day" <> CURRENT_DATE OR (d."addedToday" < d."dailyTarget" AND d."runsToday" < 30))
    ORDER BY d."nextRunAt" FOR UPDATE OF d SKIP LOCKED LIMIT 1
  ) UPDATE "ProspectDiscovery" d SET "lockedUntil"=now()+interval '5 minutes', "leaseId"=$1,
    "addedToday"=CASE WHEN "day"=CURRENT_DATE THEN "addedToday" ELSE 0 END,
    "runsToday"=CASE WHEN "day"=CURRENT_DATE THEN "runsToday"+1 ELSE 1 END,
    "day"=CURRENT_DATE, "lastRunAt"=now(), "progress"='{"phase":"SEARCHING","message":"Preparing the next industry search."}'::jsonb
    FROM due WHERE d."organizationId"=due."organizationId" AND d."authUserId"=due."authUserId" RETURNING d.*`, [leaseId])).rows[0]
  if (!job) return { state: 'idle' }
  let added = 0, updated = 0
  let message = ''
  const report = async (progress: ResearchProgress) => {
    await pool.query(`UPDATE "ProspectDiscovery" SET "progress"=$4::jsonb
      WHERE "organizationId"=$1 AND "authUserId"=$2 AND "leaseId"=$3 AND "enabled" AND "lockedUntil">now()`,
    [job.organizationId,job.authUserId,leaseId,JSON.stringify(progress)])
  }
  try {
    const member = (await pool.query(`SELECT "role", "industryId", "industryIds" FROM "OrganizationMember"
      WHERE "organizationId"=$1 AND "authUserId"=$2 AND "status"='ACTIVE'`, [job.organizationId, job.authUserId])).rows[0]
    if (!member) throw new Error('Membership is no longer active.')
    const assigned = member.industryIds?.length ? member.industryIds : member.industryId ? [member.industryId] : []
    const categories = (await pool.query(`SELECT c."id", i."id" AS "industryId", i."name" AS "industry"
      FROM "IndustryCategory" c JOIN "Industry" i ON i."id"=c."industryId"
      WHERE i."organizationId"=$1 AND ($2::text[] IS NULL OR i."id"=ANY($2::text[])) ORDER BY i."name",c."name"`,
    [job.organizationId, member.role === 'ADMIN' ? null : assigned])).rows
    if (!categories.length) throw new Error('No assigned industry categories are available. Ask an administrator to assign industries.')
    const category = categories[job.categoryCursor % categories.length]
    const existing = (await pool.query(`SELECT "businessName" FROM "SalesLead" WHERE "organizationId"=$1 ORDER BY "createdAt" DESC LIMIT 150`, [job.organizationId])).rows
    // Industry-only discovery intentionally uses the same category search mode as staff.
    const response = await researchProspects({ location: job.location, categoryId: category.id,
      targetContact: job.targetContact, resultLimit: 5, contactPreference: 'ANY' },
    { organizationId: job.organizationId, role: 'STAFF', industryIds: categories.map((c: { industryId: string }) => c.industryId) },
    `\nAlready saved businesses to exclude: ${JSON.stringify(existing.map((r: { businessName: string }) => r.businessName))}. Search for different businesses; vary search terms and locality within the requested location. Batch number ${job.categoryCursor + 1}.`, report)
    const data = await response.json()
    if (!response.ok) throw new Error(data.code ? `Research failed (${data.code}).` : 'Research provider could not complete this batch.')
    await report({ phase: 'SAVING', message: 'Removing duplicates and saving prospects to your pipeline.', total: data.businesses?.length || 0 })
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Fence expired, paused or superseded work before saving anything.
      const current = (await client.query(`SELECT d.*,m."role",m."industryId",m."industryIds" FROM "ProspectDiscovery" d
        JOIN "OrganizationMember" m ON m."organizationId"=d."organizationId" AND m."authUserId"=d."authUserId"
        WHERE d."organizationId"=$1 AND d."authUserId"=$2 AND d."leaseId"=$3 AND d."enabled"
        AND d."lockedUntil">now() AND m."status"='ACTIVE' FOR UPDATE OF d`, [job.organizationId, job.authUserId, leaseId])).rows[0]
      const currentAssignments = current?.industryIds?.length ? current.industryIds : current?.industryId ? [current.industryId] : []
      if (!current || (current.role !== 'ADMIN' && !currentAssignments.includes(category.industryId))) throw new Error('Discovery paused or industry assignment changed.')
      await client.query('SELECT "id" FROM "Organization" WHERE "id"=$1 FOR UPDATE', [job.organizationId])
      for (const business of data.businesses || []) {
        if (!business.publicEmail && !business.publicPhone) continue
        const host = new URL(business.website).hostname.toLowerCase().replace(/^www\./, '')
        const duplicate = (await client.query(`SELECT "id","ownerId" FROM "SalesLead" WHERE "organizationId"=$1
          AND (lower("businessName")=lower($2) OR lower(regexp_replace(split_part(split_part(COALESCE("website",''),'://',2),'/',1),'^www\\.',''))=$3)
          LIMIT 1`, [job.organizationId, business.businessName, host])).rows[0]
        const source = `Automatic research: ${business.sourceUrl} | Email source: ${business.emailSourceUrl || ''} | Phone source: ${business.phoneSourceUrl || ''} | Person source: ${business.personSourceUrl || ''}${business.generalEmail || business.generalCompanyContact ? ' | Email: general company inbox' : ''}${business.generalPhone || business.generalCompanyContact ? ' | Phone: general company number' : ''}`
        if (duplicate) {
          if (current.role === 'ADMIN' || duplicate.ownerId === job.authUserId) {
            const result = await client.query(`UPDATE "SalesLead" SET "email"=COALESCE(NULLIF("email",''),$2),
              "phone"=COALESCE(NULLIF("phone",''),$3), "source"=COALESCE("source",'') || $4,"updatedAt"=now()
              WHERE "id"=$1 AND ((COALESCE("email",'')='' AND $2::text IS NOT NULL) OR (COALESCE("phone",'')='' AND $3::text IS NOT NULL))`,
            [duplicate.id, business.publicEmail || null, business.publicPhone || null, ' | '+source])
            updated += result.rowCount || 0
          }
          continue
        }
        if (added >= current.dailyTarget - current.addedToday) break
        await client.query(`INSERT INTO "SalesLead" ("id","organizationId","ownerId","businessName","email","phone","industry","industryCategoryId","website","source","notes","contactName","contactJobTitle","contactDepartment","updatedAt")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())`,
        [crypto.randomUUID(),job.organizationId,current.role === 'STAFF' ? job.authUserId : null,business.businessName,
          business.publicEmail || null,business.publicPhone || null,category.industry,category.id,business.website,source,
          business.summary,business.contactName || null,business.contactJobTitle || null,business.contactDepartment || null])
        added++
      }
      message = `${added} new prospects saved; ${updated} existing contacts updated. ${data.warning || ''}`.trim()
      await client.query(`UPDATE "ProspectDiscovery" SET "addedToday"="addedToday"+$4,"totalAdded"="totalAdded"+$4,
        "categoryCursor"="categoryCursor"+1,"lockedUntil"=NULL,"leaseId"=NULL,"lastMessage"=$5,
        "progress"=jsonb_build_object('phase','COMPLETE','message',$5::text),
        "nextRunAt"=now()+interval '30 minutes' WHERE "organizationId"=$1 AND "authUserId"=$2 AND "leaseId"=$3`,
      [job.organizationId,job.authUserId,leaseId,added,message])
      await client.query('COMMIT')
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    return { state: 'completed', added, updated }
  } catch (error) {
    console.error('[prospecting] Automatic discovery batch failed', { name: error instanceof Error ? error.name : 'Unknown' })
    message = error instanceof Error && /^(Research|No assigned|Discovery|Membership)/.test(error.message) ? error.message : 'This discovery batch failed. It will retry automatically.'
    await pool.query(`UPDATE "ProspectDiscovery" SET "lockedUntil"=NULL,"leaseId"=NULL,"lastMessage"=$4,
      "progress"=jsonb_build_object('phase','ERROR','message',$4::text),
      "categoryCursor"="categoryCursor"+1,"nextRunAt"=now()+interval '1 hour'
      WHERE "organizationId"=$1 AND "authUserId"=$2 AND "leaseId"=$3`, [job.organizationId,job.authUserId,leaseId,message])
    return { state: 'retry-scheduled' }
  }
}
