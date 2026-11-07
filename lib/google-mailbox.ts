import { createHash } from 'node:crypto'

export const mailboxScope = 'https://mail.google.com/'
export const mailboxCookie = 'dara_mailbox_oauth'
export const mailboxCookiePath = '/api/admin/email-outreach/google'
export const hashMailboxValue = (value: string) => createHash('sha256').update(value).digest('hex')

export function googleMailboxConfig() {
  const clientId = process.env.GOOGLE_MAILBOX_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_MAILBOX_CLIENT_SECRET?.trim()
  const rawRedirect = process.env.GOOGLE_MAILBOX_REDIRECT_URI?.trim()
  if (!clientId || !clientSecret || !rawRedirect || !process.env.SMARTLEAD_API_KEY
    || process.env.SMARTLEAD_GOOGLE_OAUTH_CONFIGURED !== 'true') return null
  try {
    const redirect = new URL(rawRedirect)
    if (redirect.username || redirect.password || redirect.search || redirect.hash
      || redirect.pathname !== '/api/admin/email-outreach/google/callback'
      || (redirect.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && redirect.protocol === 'http:' && redirect.hostname === 'localhost'))) return null
    return { clientId, clientSecret, redirectUri: redirect.toString(), origin: redirect.origin }
  } catch { return null }
}
