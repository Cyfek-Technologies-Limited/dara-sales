import { NextResponse } from 'next/server'
export async function GET() { return NextResponse.json({ error: 'Connect an SMTP mailbox from Email outreach instead.' }, { status: 410 }) }
export const POST = GET
