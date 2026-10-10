'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [role, setRole] = useState<'company' | 'staff'>('company')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (event.nativeEvent instanceof SubmitEvent && (event.nativeEvent as SubmitEvent).submitter === null) return
    setPending(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '')
    const password = String(data.get('password') ?? '')
    const name = String(data.get('name') ?? '')
    try {
      const result = mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name })
      if (result.error) {
        console.error('[v0] Authentication request failed:', result.error)
        setError(result.error.message || 'We could not complete that request. Check your details and try again.')
        setPending(false)
        return
      }
        router.push(mode === 'sign-up' && role === 'company' ? '/onboarding' : '/dashboard')
        router.refresh()
    } catch (cause) {
      console.error('[v0] Authentication request threw:', cause)
      setError(cause instanceof Error ? cause.message : 'The request failed before the server returned a response. Please try again.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-4 rounded-[28px] border border-[#e1d9c5] bg-[#f4edda] p-7 text-[#171716] shadow-2xl">
      <div><a href="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f15b35]">Sequoia</a><h1 className="mt-3 font-serif text-4xl font-normal">{mode === 'sign-in' ? 'Welcome back.' : 'Move sales forward.'}</h1><p className="mt-2 text-sm text-[#6d6a60]">{mode === 'sign-in' ? 'Sign in to your sales workspace.' : 'Create your workspace and start your one-week trial.'}</p></div>
      {mode === 'sign-up' && <div className="flex gap-2 rounded-xl bg-[#e9e0c9] p-1 text-sm"><button type="button" onClick={() => setRole('company')} className={`flex-1 rounded-lg px-3 py-2 ${role === 'company' ? 'bg-[#171716] text-white' : ''}`}>Company admin</button><button type="button" onClick={() => setRole('staff')} className={`flex-1 rounded-lg px-3 py-2 ${role === 'staff' ? 'bg-[#171716] text-white' : ''}`}>Sales staff</button></div>}
      {mode === 'sign-up' && <input name="name" required placeholder={role === 'company' ? 'Your name' : 'Full name'} className="rounded-xl border border-[#d7cdb6] bg-[#fffaf0] px-4 py-3 outline-none" />}
      <input name="email" type="email" required placeholder="Work email" className="rounded-xl border border-[#d7cdb6] bg-[#fffaf0] px-4 py-3 outline-none" />
      <input name="password" type="password" minLength={8} required placeholder="Password" className="rounded-xl border border-[#d7cdb6] bg-[#fffaf0] px-4 py-3 outline-none" />
      {mode === 'sign-up' && <p className="text-xs text-[#6d6a60]">{role === 'company' ? 'You can invite your team after creating the organization.' : 'Staff access is granted through an organization invitation.'}</p>}
      {error && <p role="alert" className="text-sm text-[#b43825]">{error}</p>}
      <button disabled={pending} className="rounded-full bg-[#f15b35] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create workspace'}</button>
      <a href={mode === 'sign-in' ? '/sign-up' : '/sign-in'} className="text-center text-xs underline">{mode === 'sign-in' ? 'Create a new workspace' : 'Already have an account? Sign in'}</a>
    </form>
  )
}
