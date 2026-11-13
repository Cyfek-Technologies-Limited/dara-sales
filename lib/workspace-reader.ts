import { pool } from '@/lib/db'

// Use these scoped relations for workspace reads, including aggregates and joins.
// Ownership comes from the authenticated membership, never request parameters.
export function workspaceReader(organization: { id: string; role: string }, userId: string) {
  if (!organization.id || !userId || !['ADMIN', 'STAFF'].includes(organization.role)) throw new Error('Active workspace membership required')
  return {
    query(sql: string, values: unknown[] = []) {
      if (!/^\s*(SELECT|WITH)\s/i.test(sql)) throw new Error('Workspace reader only supports reads')
      const organizationParam = `$${values.length + 1}`
      const ownerParam = `$${values.length + 2}`
      const scope = `"VisibleSalesLead" AS (
        SELECT * FROM "SalesLead" WHERE "organizationId" = ${organizationParam}
          AND (${ownerParam}::text IS NULL OR "ownerId" = ${ownerParam})
      ), "VisibleSalesOutreach" AS (
        SELECT s.* FROM "SalesOutreach" s WHERE s."organizationId" = ${organizationParam}
          AND EXISTS (SELECT 1 FROM "VisibleSalesLead" l WHERE l."id" = s."leadId")
      ), "VisibleEmailSyncJob" AS (
        SELECT j.* FROM "EmailSyncJob" j WHERE j."organizationId" = ${organizationParam}
          AND EXISTS (SELECT 1 FROM "VisibleSalesLead" l WHERE l."id" = j."leadId")
      )`
      const text = /^\s*WITH\s/i.test(sql)
        ? sql.replace(/^\s*WITH\s/i, `WITH ${scope}, `)
        : `WITH ${scope} ${sql}`
      return pool.query(text, [...values, organization.id, organization.role === 'STAFF' ? userId : null])
    },
  }
}
