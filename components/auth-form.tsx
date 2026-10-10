'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const result = mode === 'sign-in'
        ? await authClient.signIn.email({ email: String(data.get('email') ?? ''), password: String(data.get('password') ?? '') })
        : await authClient.signUp.email({ email: String(data.get('email') ?? ''), password: String(data.get('password') ?? ''), name: String(data.get('name') ?? '') })
      if (result.error) {
        console.error('[v0] Authentication request failed:', result.error)
        setError(`${result.error.code || 'AUTH_REQUEST_FAILED'}: ${result.error.message || 'Check your details and try again.'}`)
        return
      }
      if (mode === 'sign-up') {
        router.replace('/onboarding')
      } else {
        const redirectResponse = await fetch('/api/auth/redirect', { cache: 'no-store' })
        const redirectData = await redirectResponse.json()
        if (!redirectResponse.ok) {
          setError(`${redirectData.code || 'ROLE_LOOKUP_FAILED'}: Could not determine your workspace role.`)
          return
        }
        console.log('[v0] Sign-in role redirect:', redirectData)
        router.replace(redirectData.destination)
      }
      router.refresh()
    } catch (cause) {
      console.error('[v0] Authentication request threw:', cause)
      setError(cause instanceof Error ? cause.message : 'The request failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function continueWithGoogle() {
    setPending(true)
    const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/onboarding' })
    if (result.error) setError(`${result.error.code || 'GOOGLE_AUTH_FAILED'}: ${result.error.message || 'Google sign-in could not be started.'}`)
    setPending(false)
  }

  return <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-4 rounded-[28px] border border-[#e1d9c5] bg-[#f4edda] p-7 text-[#171716] shadow-2xl">
    <div><a href="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f15b35]">Sequoia</a><h1 className="mt-3 font-serif text-4xl font-normal">{mode === 'sign-in' ? 'Welcome back.' : 'Create your workspace.'}</h1><p className="mt-2 text-sm text-[#6d6a60]">{mode === 'sign-in' ? 'Sign in to your sales workspace.' : 'Create a company workspace and invite your sales team privately.'}</p></div>
    {mode === 'sign-up' && <input name="name" required placeholder="Your name" className="rounded-xl border border-[#d7cdb6] bg-[#fffaf0] px-4 py-3 outline-none" />}
    <input name="email" type="email" required placeholder="Work email" className="rounded-xl border border-[#d7cdb6] bg-[#fffaf0] px-4 py-3 outline-none" />
    <input name="password" type="password" minLength={8} required placeholder="Password" className="rounded-xl border border-[#d7cdb6] bg-[#fffaf0] px-4 py-3 outline-none" />
    {error && <p role="alert" className="text-sm text-[#b43825]">{error}</p>}
    <button disabled={pending} className="rounded-full bg-[#f15b35] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create workspace'}</button>
    <div className="flex items-center gap-3 text-xs text-[#8b867d]"><span className="h-px flex-1 bg-[#d7cdb6]" />or<span className="h-px flex-1 bg-[#d7cdb6]" /></div>
    <button type="button" onClick={continueWithGoogle} disabled={pending} className="rounded-full border border-[#cfc4aa] px-5 py-3 text-sm font-semibold disabled:opacity-60">Continue with Google</button>
    <a href={mode === 'sign-in' ? '/sign-up' : '/sign-in'} className="text-center text-xs underline">{mode === 'sign-in' ? 'Create a company workspace' : 'Already have an account? Sign in'}</a>
  </form>
}
