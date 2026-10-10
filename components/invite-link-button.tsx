'use client'

import { useState } from 'react'

export function InviteLinkButton() {
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)

  async function generate() {
    setPending(true)
    setMessage('')
    try {
      const response = await fetch('/api/invites', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        const issue = data.error
        setMessage(issue?.code ? `${issue.code}: ${issue.message}` : (issue || 'INTERNAL_SERVER_ERROR: Could not create invite'))
        return
      }
      await navigator.clipboard.writeText(data.url)
      setMessage('Invitation link has been copied. You can now send to your team.')
    } catch {
      setMessage('NETWORK_ERROR: Could not create an invitation link. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="group inline-flex items-center gap-2 rounded-xl bg-[#f15b35] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(241,91,53,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#df4e2c] hover:shadow-[0_12px_24px_rgba(241,91,53,0.28)] active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
      >
        <span className="grid size-5 place-items-center rounded-md bg-white/15 text-sm transition-transform duration-200 group-hover:rotate-90">+</span>
        {pending ? 'Creating link…' : 'Invite staff'}
      </button>
      {message && (
        <div role="status" className="absolute right-0 top-[calc(100%+10px)] z-20 w-72 origin-top-right animate-[invite-pop_220ms_ease-out] rounded-xl border border-[#e8dfd5] bg-white px-4 py-3 text-xs leading-5 text-[#514b43] shadow-[0_14px_35px_rgba(35,28,20,0.14)]">
          <span className="mr-2 inline-block size-2 rounded-full bg-[#63ad72] align-middle" />
          {message}
        </div>
      )}
    </div>
  )
}
