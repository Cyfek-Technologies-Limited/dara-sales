require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const dbUrl = new URL(process.env.DATABASE_URL); dbUrl.searchParams.set('sslmode', 'verify-full');
const pool = new Pool({ connectionString: dbUrl.toString(), connectionTimeoutMillis: 10000, max: 1 });
(async () => {
  const results = await pool.query(`SELECT a."enabled", a."status", a."campaignId" LIKE 'smtp:%' AS "smtpCampaign",
    s."id" IS NOT NULL AS "hasSender", s."smtpPassword" IS NOT NULL AS "hasPassword",
    COUNT(j."id")::int AS "jobs", COUNT(j."id") FILTER (WHERE j."status" = 'QUEUED')::int AS "queued",
    MAX(j."attempts") AS "maxAttempts", MIN(j."availableAt") AS "availableAt", NOW() AS "serverTime"
    FROM "EmailAutomation" a LEFT JOIN "OrganizationEmailSender" s ON s."id" = a."senderId" AND s."organizationId" = a."organizationId"
    LEFT JOIN "EmailSyncJob" j ON j."organizationId" = a."organizationId" AND j."campaignId" = a."campaignId"
    GROUP BY a."organizationId", a."enabled", a."status", a."campaignId", s."id", s."smtpPassword"`);
  console.log(JSON.stringify(results.rows));
  const duplicates = await pool.query(`SELECT COUNT(*)::int AS "duplicateInboxGroups", COALESCE(SUM(n - 1), 0)::int AS "extraLeadRecords"
    FROM (SELECT COUNT(*) AS n FROM "SalesLead" l JOIN "EmailAutomation" a ON a."organizationId" = l."organizationId"
      LEFT JOIN "IndustryCategory" c ON c."id" = l."industryCategoryId"
      WHERE a."enabled" = TRUE AND a."status" = 'READY' AND l."stage" = 'LEAD' AND NULLIF(TRIM(l."email"),'') IS NOT NULL
      AND (a."industryId" IS NULL OR c."industryId" = a."industryId")
      GROUP BY l."organizationId", LOWER(TRIM(l."email")) HAVING COUNT(*) > 1) grouped`);
  console.log(JSON.stringify(duplicates.rows));
  const selection = await pool.query(`SELECT a."organizationId" FROM "EmailAutomation" a
    JOIN "EmailSyncJob" j ON j."organizationId" = a."organizationId" AND j."campaignId" = a."campaignId"
    WHERE a."enabled" = TRUE AND a."campaignId" LIKE 'smtp:%' AND j."status" = 'QUEUED' AND j."availableAt" <= NOW()
    AND NOT EXISTS (SELECT 1 FROM "EmailSyncJob" r WHERE r."organizationId" = a."organizationId" AND r."attempts" > 0 AND r."updatedAt" > NOW() - INTERVAL '1 minute')
    AND (SELECT COUNT(*) FROM "EmailSyncJob" d WHERE d."organizationId" = a."organizationId" AND d."sentAt" > NOW() - INTERVAL '24 hours') < 30
    GROUP BY a."organizationId" ORDER BY MIN(j."createdAt") LIMIT 1`);
  console.log(JSON.stringify({ eligibleWorkspaces: selection.rows.length }));
  const locks = await pool.query(`SELECT COUNT(*)::int AS "workerSessionLocks" FROM pg_locks l
    JOIN "EmailAutomation" a ON l.objid::bigint = ((hashtext('smtp-send:' || a."organizationId")::bigint + 4294967296) % 4294967296)
    WHERE l.locktype = 'advisory' AND l.granted`);
  console.log(JSON.stringify(locks.rows));
  const source = require('fs').readFileSync(require('path').join(__dirname, '../lib/email-outreach.ts'), 'utf8');
  const templates = [...source.matchAll(/(?:pool|client)\.query\(`([\s\S]*?)`/g)].map(match => match[1]);
  for (const sql of templates) {
    if (sql.startsWith('INSERT INTO "EmailSyncJob"') || sql.startsWith('UPDATE "EmailSyncJob" SET "status" = \'SENDING\'')) {
      // EXPLAIN without ANALYZE only plans the statement; it never changes rows.
      const parameters = sql.includes('$2') ? [null, 'diagnostic-nonexistent-campaign'] : [null];
      await pool.query('EXPLAIN ' + sql.replace(/\\\\/g, '\\'), parameters);
      console.log('Queue statement planning succeeded.');
    }
  }
})().catch(e => { console.error('Database diagnostic failed:', e.code || 'connection error', e.code ? e.message : ''); process.exitCode = 1; }).finally(() => pool.end());
