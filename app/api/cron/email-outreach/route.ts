import { timingSafeEqual } from 'node:crypto'
import { after, NextResponse } from 'next/server'
import { processEmailQueue } from '@/lib/email-outreach'
import { processProspectDiscovery } from '@/lib/automatic-prospecting'

export const maxDuration = 180
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const actual = Buffer.from(request.headers.get('authorization') || '')
  const expected = Buffer.from(`Bearer ${secret || ''}`)
  const headers = { 'Cache-Control': 'no-store' }
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  // Check scheduler authentication without sending or changing queue records.
  if (new URL(request.url).searchParams.get('check') === '1') return NextResponse.json({ ok: true, mode: 'connection-check' }, { headers })
  try {
    // Keep long web research out of the scheduler's response timeout. Next's
    // after() retains the invocation; durable leases recover interrupted work.
    after(async () => {
      try { await processProspectDiscovery() }
      catch (error) { console.error('[prospecting] Scheduled discovery failed', { code: (error as { code?: string })?.code || 'UNEXPECTED_ERROR' }) }
    })
    return NextResponse.json({ ok: true, processed: await processEmailQueue(), discovery: 'scheduled' }, { headers })
  }
  catch (error) {
    console.error('[email] Scheduled queue processing failed', { code: (error as { code?: string })?.code || 'UNEXPECTED_ERROR' })
    return NextResponse.json({ error: 'Queue processing failed.' }, { status: 500, headers })
  }
}
