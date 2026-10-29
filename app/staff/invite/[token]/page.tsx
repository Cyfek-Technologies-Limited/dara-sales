'use client'

import { FormEvent, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function StaffInvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function acceptInvite() {
    const response = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new Error(result.error || 'This invite is no longer valid.')
    }
    router.replace('/dashboard')
    router.refresh()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const result = await authClient.signUp.email({
        email: String(data.get('email')),
        password: String(data.get('password')),
        name: String(data.get('name')),
      })
      if (result.error) throw new Error(result.error.message || 'Could not create your account.')
      await acceptInvite()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not join this workspace.')
      setPending(false)
    }
  }

  async function continueWithGoogle() {
    setPending(true)
    setError('')
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `/staff/invite/${encodeURIComponent(token)}`,
      })
      if (result.error) throw new Error(result.error.message || 'Google sign-in could not be started.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-in could not be started.')
      setPending(false)
    }
  }

  async function joinWithCurrentAccount() {
    setPending(true)
    setError('')
    try {
      await acceptInvite()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not join this workspace.')
      setPending(false)
    }
  }

  async function useAnotherAccount() {
    setPending(true)
    await authClient.signOut()
    router.refresh()
    setPending(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07121f] px-5">
      <section className="flex w-full max-w-md flex-col gap-4 rounded-[28px] bg-[#f4f6f9] p-8 text-[#111827]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5366df]">Dara team invite</p>
        <h1 className="font-serif text-4xl">Join the sales team.</h1>
        <p className="text-sm text-[#596579]">Create your staff account or continue with Google to access your organization workspace.</p>

        {sessionPending ? (
          <p className="text-sm text-[#596579]">Checking your sign-in…</p>
        ) : session?.user ? (
          <>
            <p className="rounded-xl bg-white px-4 py-3 text-sm text-[#596579]">Signed in as <span className="font-semibold text-[#07121f]">{session.user.email}</span></p>
            {error && <p role="alert" className="text-sm text-[#b43825]">{error}</p>}
            <button type="button" onClick={joinWithCurrentAccount} disabled={pending} className="rounded-full bg-[#07121f] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? 'Joining workspace…' : 'Accept invite'}
            </button>
            <button type="button" onClick={useAnotherAccount} disabled={pending} className="text-sm text-[#596579] underline disabled:opacity-60">
              Use another account
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <input name="name" required placeholder="Full name" className="rounded-xl border border-[#d6deea] bg-white px-4 py-3" />
            <input name="email" type="email" required placeholder="Work email" className="rounded-xl border border-[#d6deea] bg-white px-4 py-3" />
            <input name="password" type="password" minLength={8} required placeholder="Password" className="rounded-xl border border-[#d6deea] bg-white px-4 py-3" />
            {error && <p role="alert" className="text-sm text-[#b43825]">{error}</p>}
            <button disabled={pending} className="rounded-full bg-[#07121f] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {pending ? 'Creating account…' : 'Join workspace'}
            </button>
            <div className="flex items-center gap-3 text-xs text-[#657286]"><span className="h-px flex-1 bg-[#d6deea]" />or<span className="h-px flex-1 bg-[#d6deea]" /></div>
            <button type="button" onClick={continueWithGoogle} disabled={pending} className="inline-flex items-center justify-center gap-3 rounded-full border border-[#d6deea] bg-white px-5 py-3 text-sm font-semibold disabled:opacity-60">
              <svg aria-hidden="true" className="size-5" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" />
                <path fill="#FF3D00" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20 20 0 0 0 24 44Z" />
                <path fill="#4CAF50" d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18l6.8-5.2Z" />
                <path fill="#1976D2" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.2C14.2 15.6 18.7 12 24 12Z" />
              </svg>
              Continue with Google
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
