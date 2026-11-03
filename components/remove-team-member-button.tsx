'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function RemoveTeamMemberButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function removeMember() {
    if (!window.confirm(`Remove ${name} from this workspace? Their saved leads and outreach history will remain.`)) return
    setPending(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/team/${encodeURIComponent(userId)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Could not remove this team member.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove this team member.')
    } finally {
      setPending(false)
    }
  }

  return <div className="flex flex-col items-start gap-1"><button type="button" onClick={removeMember} disabled={pending} aria-label={`Remove ${name}`} className="inline-flex items-center gap-1.5 rounded-lg border border-black/20 px-2.5 py-2 text-[10px] font-semibold text-[#9f3030] hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-3.5" />{pending ? 'Removing…' : 'Remove'}</button>{error && <span role="alert" className="max-w-32 text-[10px] text-red-700">{error}</span>}</div>
}
