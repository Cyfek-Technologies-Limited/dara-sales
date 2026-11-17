/** Only public person profiles; never login, search, feeds or company pages. */
export function linkedInProfile(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 600) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !/^(?:[a-z]{2,3}\.|www\.)?linkedin\.com$/i.test(url.hostname)
      || !/^\/in\/[a-z0-9_%.-]+\/?$/i.test(url.pathname)) return null
    return `https://www.linkedin.com${url.pathname.replace(/\/$/, '')}`
  } catch { return null }
}

export function publishedContactEvidence(value: string, evidence: unknown, phone = false) {
  if (!value || typeof evidence !== 'string' || evidence.length > 2000) return false
  return phone
    ? value.replace(/\D/g, '').length >= 7 && evidence.replace(/\D/g, '').includes(value.replace(/\D/g, ''))
    : evidence.toLowerCase().includes(value.toLowerCase())
}
