import { NextResponse } from 'next/server'
import { getWorkspaceSession } from '@/lib/admin-session'
import { pool } from '@/lib/db'

export async function GET(request: Request) {
  const admin = await getWorkspaceSession()
  if (!admin) return NextResponse.json({ error: 'Sign in as an active workspace member.' }, { status: 401 })
  const params = new URL(request.url).searchParams
  const page = Math.max(1, Math.min(100000, Number(params.get('page')) || 1)) | 0
  const search = (params.get('search') || '').trim().slice(0, 160)
  const industry = (params.get('industry') || '').slice(0, 160)
  try {
    const result = await pool.query(`SELECT l."id", l."businessName", l."contactName", l."contactJobTitle", l."contactDepartment", l."email", l."phone", l."industry", l."website", l."source",
      EXISTS (SELECT 1 FROM "EmailSuppression" s WHERE s."organizationId" = l."organizationId" AND s."email" = LOWER(TRIM(l."email"))) AS "unsubscribed",
      COUNT(*) OVER()::int AS "totalRows"
      FROM "SalesLead" l LEFT JOIN "IndustryCategory" c ON c."id" = l."industryCategoryId"
      WHERE l."organizationId" = $1 AND l."stage" = 'LEAD' AND ($2 = '' OR c."industryId" = $2)
      AND ($3 = '' OR STRPOS(LOWER(CONCAT_WS(' ',l."businessName",l."contactName",l."email",l."phone")),LOWER($3)) > 0)
      ORDER BY l."createdAt" DESC, l."id" LIMIT 25 OFFSET $4`, [admin.organization.id, industry, search, (page - 1) * 25])
    return NextResponse.json({ contacts: result.rows, totalRows: result.rows[0]?.totalRows || 0, page }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: 'Could not load saved contacts.' }, { status: 503 }) }
}
