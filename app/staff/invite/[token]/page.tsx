'use client'

import { FormEvent, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function StaffInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('')
    const data = new FormData(event.currentTarget)
    const result = await authClient.signUp.email({ email: String(data.get('email')), password: String(data.get('password')), name: String(data.get('name')) })
    if (result.error) { setError(result.error.message || 'Could not create your account.'); setPending(false); return }
    const response = await fetch('/api/invites/accept', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) })
    if (!response.ok) { setError((await response.json()).error || 'This invite is no longer valid.'); setPending(false); return }
    router.replace('/dashboard'); router.refresh()
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#07121f] px-5"><form onSubmit={submit} className="flex w-full max-w-md flex-col gap-4 rounded-[28px] bg-[#f4f6f9] p-8 text-[#111827]"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5366df]">Dara team invite</p><h1 className="font-serif text-4xl">Join the sales team.</h1><p className="text-sm text-[#596579]">Create your staff account to access your organization workspace.</p><input name="name" required placeholder="Full name" className="rounded-xl border border-[#d6deea] bg-[#ffffff] px-4 py-3" /><input name="email" type="email" required placeholder="Work email" className="rounded-xl border border-[#d6deea] bg-[#ffffff] px-4 py-3" /><input name="password" type="password" minLength={8} required placeholder="Password" className="rounded-xl border border-[#d6deea] bg-[#ffffff] px-4 py-3" />{error && <p role="alert" className="text-sm text-[#b43825]">{error}</p>}<button disabled={pending} className="rounded-full bg-[#5366df] px-5 py-3 text-sm font-semibold text-white">{pending ? 'Creating account…' : 'Join workspace'}</button></form></main>
}
