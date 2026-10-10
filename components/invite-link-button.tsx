'use client'

import { useState } from 'react'
export function InviteLinkButton() {
  const [message, setMessage] = useState('')
  async function generate() {
    const response = await fetch('/api/invites', { method: 'POST' })
    const data = await response.json()
    if (!response.ok) { setMessage(data.error || 'Could not create invite'); return }
    await navigator.clipboard.writeText(data.url); setMessage('Copied invite link')
  }
  return <div className="flex items-center gap-2"><button onClick={generate} className="rounded-full bg-[#f15b35] px-4 py-2 text-xs font-semibold text-white">Invite staff</button>{message && <span className="text-xs text-[#6e6a62]">{message}</span>}</div>
}
