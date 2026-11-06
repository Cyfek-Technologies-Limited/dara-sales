import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'

async function getAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const organization = (await pool.query(
    `SELECT o."id" FROM "Organization" o JOIN "OrganizationMember" m ON m."organizationId" = o."id"
     WHERE m."authUserId" = $1 AND m."role" = 'ADMIN' ORDER BY o."createdAt" DESC LIMIT 1`, [session.user.id],
  )).rows[0]
  return organization ? { userId: session.user.id, organizationId: organization.id } : null
}

export async function POST(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Sign in as an organization admin.' }, { status: 401 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'AI suggestions are not configured. Add OPENAI_API_KEY to the server environment.' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const offering = typeof body.offering === 'string' ? body.offering.trim().slice(0, 500) : ''
  const location = typeof body.location === 'string' ? body.location.trim().slice(0, 160) : ''
  if (!offering || !location) return NextResponse.json({ error: 'Describe what you sell and enter a target location.' }, { status: 400 })

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_PROSPECTING_MODEL || 'gpt-4.1-mini',
        input: [
          { role: 'system', content: 'You are a careful B2B market researcher. Suggest plausible target industries based on a product or service and location. Do not claim you verified market size or specific businesses. Return only JSON with an industries array; each item must have name, reason, and exactly six concise subcategories.' },
          { role: 'user', content: `Product or service: ${offering}\nTarget location: ${location}\nReturn up to 5 distinct, relevant industries and exactly six useful business subcategories for each.` },
        ],
        text: { format: { type: 'json_object' } },
        max_output_tokens: 1800,
      }),
      signal: AbortSignal.timeout(30000),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.error('[prospecting] AI provider error', response.status, result.error?.type || '')
      return NextResponse.json({ error: 'The AI service could not suggest industries. Check the AI provider configuration and try again.' }, { status: 502 })
    }
    const outputText = result.output_text || result.output?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content || []).find((part: { type: string }) => part.type === 'output_text')?.text
    const parsed = JSON.parse(outputText || '{}')
    const industries = Array.isArray(parsed.industries) ? parsed.industries.slice(0, 5).flatMap((item: Record<string, unknown>) => {
      const name = typeof item.name === 'string' ? item.name.trim().slice(0, 100) : ''
      const reason = typeof item.reason === 'string' ? item.reason.trim().slice(0, 400) : ''
      const categories = Array.isArray(item.subcategories) ? item.subcategories.filter((value): value is string => typeof value === 'string').map((value) => value.trim().slice(0, 80)).filter(Boolean).slice(0, 6) : []
      return name && reason && categories.length === 6 ? [{ name, reason, subcategories: categories }] : []
    }) : []
    if (!industries.length) return NextResponse.json({ error: 'The AI did not return a usable set of industries. Please try a more specific product description.' }, { status: 502 })
    return NextResponse.json({ industries })
  } catch (error) {
    console.error('[prospecting] AI request failed', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'Could not reach the AI suggestion service. Try again shortly.' }, { status: 502 })
  }
}
