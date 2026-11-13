import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib'

type Page = { url: string; html: string }
type Found = { value: string; sourceUrl: string; rank: number }
export type WebsiteContacts = {
  publicEmail: string; publicPhone: string; emailSourceUrl: string; phoneSourceUrl: string;
  contactSourceUrl: string; contactLookupStatus: 'FOUND' | 'PARTIAL' | 'NOT_FOUND' | 'UNAVAILABLE';
  contactLookupMessage: string; contactPagesChecked: string[];
}

const blocked = new BlockList()
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]] as const) blocked.addSubnet(address, prefix, 'ipv4')

export function sameBusinessWebsite(candidate: string, website: string) {
  try {
    const url = new URL(candidate)
    const base = new URL(website).hostname.toLowerCase().replace(/^www\./, '')
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    return ['https:','http:'].includes(url.protocol) && !url.username && !url.password && !url.port && !isIP(host)
      && (host === base || host.endsWith(`.${base}`))
  } catch { return false }
}

async function readPage(input: string, website: string, deadline: number, redirects = 0, javascript = false): Promise<Page> {
  if (redirects > 3 || Date.now() >= deadline || !sameBusinessWebsite(input, website)) throw new Error('Website unavailable')
  const url = new URL(input)
  let timer: ReturnType<typeof setTimeout> | undefined
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true, family: 4 }),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Lookup timed out')), Math.max(1, deadline - Date.now())) }),
  ]).finally(() => clearTimeout(timer))
  if (!addresses.length || addresses.some(item => blocked.check(item.address, 'ipv4'))) throw new Error('Non-public website')
  // Pin DNS resolution, including each redirect. Never forward cookies or credentials.
  const result = await new Promise<Page | { redirect: string }>((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      method: 'GET', agent: false, family: 4,
      lookup: (_hostname, _options, callback) => callback(null, addresses[0].address, 4),
      signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
      headers: { 'User-Agent': 'DaraContactResearch/1.0', Accept: javascript ? 'application/javascript,text/javascript,text/plain' : 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity' },
    }, response => {
      if ([301,302,303,307,308].includes(response.statusCode || 0) && response.headers.location) {
        response.destroy()
        try { resolve({ redirect: new URL(response.headers.location, url).toString() }) } catch { reject(new Error('Invalid website redirect')) }
        return
      }
      if (response.statusCode !== 200 || !(javascript ? /(?:java|ecma)script|text\/plain/i : /text\/html|application\/xhtml\+xml/i).test(response.headers['content-type'] || '')) {
        response.destroy(); reject(new Error('Page could not be read')); return
      }
      let wireBytes = 0
      response.on('data', (chunk: Buffer) => { wireBytes += chunk.length; if (wireBytes > 1500000) response.destroy(new Error('Page too large')) })
      const encoding = response.headers['content-encoding']
      const decoder = encoding === 'gzip' ? createGunzip() : encoding === 'deflate' ? createInflate() : encoding === 'br' ? createBrotliDecompress() : null
      if (decoder) response.on('error', error => decoder.destroy(error))
      const stream = decoder ? response.pipe(decoder) : response
      void (async () => {
        try {
          let size = 0
          const chunks: Buffer[] = []
          for await (const chunk of stream) {
            const buffer = Buffer.from(chunk); size += buffer.length
            if (size > 1500000) { response.destroy(); stream.destroy(); throw new Error('Page too large') }
            chunks.push(buffer)
          }
          const html = Buffer.concat(chunks).toString('utf8')
          if (/checking your browser|just a moment\.\.\.|verify you are human|cf-chl-/i.test(html.slice(0, 15000))) throw new Error('Website blocked automated access')
          resolve({ url: url.toString(), html })
        } catch (error) { reject(error) }
      })()
    })
    request.on('error', reject); request.end()
  })
  return 'redirect' in result ? readPage(result.redirect, website, deadline, redirects + 1, javascript) : result
}

// Read literal rendered contact values, never execute website JavaScript.
// Restrict to contact links and UI/data properties so library author emails
// (for example addresses in copyright comments) are not treated as contacts.
function scriptContactMarkup(script: string) {
  const decoded = script.replace(/\\u([\da-f]{4})|\\x([\da-f]{2})/gi, (_, unicode, hex) => String.fromCharCode(parseInt(unicode || hex, 16))).replace(/\\\//g, '/')
  const values = [
    ...[...decoded.matchAll(/["'`](?:mailto:|tel:)([^"'`\r\n]{1,300})["'`]/gi)].map(match => match[0].slice(1, -1)),
    ...[...decoded.matchAll(/\b(?:children|email|telephone|phone)["']?\s*:\s*["'`]([^"'`\r\n]{1,254})["'`]/g)].map(match => match[1]),
  ]
  return values.filter(value => /^(?:(?:mailto:)?[^\s<>"']+@[^\s<>"']+\.[a-z]{2,}|(?:tel:)?\+?[\d(][\d\s().-]{6,38})$/i.test(value))
    .map(value => {
      const contact = value.replace(/^(?:mailto|tel):/i, '')
      return (contact.includes('@') ? contact : `Phone: ${contact}`).replace(/[<>&"']/g, char => `&#${char.charCodeAt(0)};`)
    }).join('\n')
}

function decode(value: string) {
  const entities: Record<string,string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', commat: '@', period: '.', plus: '+' }
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity.startsWith('#')) {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
    }
    return entities[entity.toLowerCase()] ?? whole
  })
}
function attribute(tag: string, name: string) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)
  return decode(match?.[1] ?? match?.[2] ?? match?.[3] ?? '')
}
function uri(value: string) { try { return decodeURIComponent(value) } catch { return value } }
function cloudflareEmails(html: string) {
  return [...html.matchAll(/data-cfemail\s*=\s*["']([\da-f]+)["']/gi)].map(match => {
    const bytes = Buffer.from(match[1], 'hex')
    return [...bytes.subarray(1)].map(byte => String.fromCharCode(byte ^ bytes[0])).join('')
  }).join(' ')
}

function contactsOnPage(page: Page) {
  const emails: Found[] = [], phones: Found[] = []
  const addEmail = (raw: string, rank = 0) => {
    const value = raw.trim().replace(/[.,;:]+$/, '').toLowerCase()
    if (value.length > 254 || !/^[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d.-]+\.[a-z]{2,}$/i.test(value)
      || /\.(png|jpg|jpeg|gif|webp|svg|css|js)$/i.test(value) || /^(noreply|no-reply|donotreply)@/i.test(value)
      || /@(example\.(com|org|net)|sentry\.io|wixpress\.com)$/i.test(value)) return
    const general = /^(info|hello|contact|enquir(?:y|ies)|sales|office|admin|admissions|support|marketing)([._-]|@)/i.test(value)
    const domain = new URL(page.url).hostname.replace(/^www\./, '')
    const emailDomain = value.split('@')[1]
    const ownDomain = emailDomain === domain || domain.endsWith(`.${emailDomain}`) || emailDomain.endsWith(`.${domain}`)
    emails.push({ value, sourceUrl: page.url, rank: rank + (general ? 20 : 0) + (ownDomain ? 30 : 0) })
  }
  const addPhone = (raw: string, rank = 0) => {
    const value = raw.trim().replace(/;.*$/, '').replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, ' ')
    const digits = value.replace(/\D/g, '')
    if (!/^[+\d(][\d\s().+-]+$/.test(value) || digits.length < 7 || digits.length > 15 || value.length > 40 || /^(\d)\1+$/.test(digits)) return
    phones.push({ value, sourceUrl: page.url, rank })
  }
  const tags = [...page.html.matchAll(/<a\b[^>]{0,4000}>/gi)]
  for (const [tag] of tags) {
    const href = attribute(tag, 'href')
    if (/^mailto:/i.test(href)) for (const email of uri(href.slice(7).split('?')[0]).split(/[;,]/)) addEmail(email, 30)
    if (/^tel:/i.test(href)) addPhone(uri(href.slice(4)), 40)
    if (/^https?:\/\/(?:wa\.me|api\.whatsapp\.com)\//i.test(href)) {
      try { const url = new URL(href); addPhone('+' + (url.hostname === 'wa.me' ? url.pathname.slice(1) : url.searchParams.get('phone') || ''), 20) } catch { /* Ignore malformed links. */ }
    }
  }
  // Structured Organization/LocalBusiness data often carries contacts not repeated in visible text.
  for (const match of page.html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (value: unknown, depth = 0) => {
        if (!value || typeof value !== 'object' || depth > 12) return
        if (Array.isArray(value)) { value.slice(0,100).forEach(item => walk(item, depth + 1)); return }
        for (const [key, item] of Object.entries(value)) {
          if (key === 'email' && typeof item === 'string') addEmail(item.replace(/^mailto:/i,''), 20)
          else if (key === 'telephone' && typeof item === 'string') addPhone(item, 30)
          else if (item && typeof item === 'object') walk(item, depth + 1)
        }
      }
      walk(JSON.parse(match[1]))
    } catch { /* Some websites publish malformed JSON-LD. Visible content still works. */ }
  }
  const visible = decode(page.html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, '\n'))
    .replace(/([\w.+-]+)\s*(?:\[at\]|\(at\))\s*([\w.-]+)\s*(?:\[dot\]|\(dot\))\s*([a-z]{2,})/gi, '$1@$2.$3')
  for (const email of (visible + ' ' + cloudflareEmails(page.html)).match(/[a-z\d.!#$%&'*+/=?^_`{|}~-]+@[a-z\d.-]+\.[a-z]{2,}/gi) || []) addEmail(email)
  for (const match of visible.matchAll(/(?:telephone|tel|phone|mobile|whats\s?app|call(?:\s+us)?|hotline)(?:\s+(?:numbers?|nos?\.?))?\s*[:;.\-]?\s*(\+?\d[\d \t().-]{5,35}\d)/gi)) addPhone(match[1], 10)
  // Nigerian business numbers are frequently published as 0802 321 1344,
  // without a tel link or a phone label. Extract each number independently.
  for (const match of visible.matchAll(/(?<!\d)0[789]\d(?:[ \t().-]*\d){8}(?!\d)/g)) addPhone(match[0], 15)
  for (const match of visible.matchAll(/\+234[ \t().-]*(?:\(0\)[ \t.-]*)?[789]\d(?:[ \t().-]*\d){8}(?!\d)/g)) addPhone(match[0].replace('(0)', ''), 15)
  for (const match of visible.matchAll(/(?:\+\d[\d \t().-]{6,30}\d|\b0[789]\d{9}\b)/g)) addPhone(match[0])
  return { emails, phones }
}

export async function extractWebsiteContacts(website: string, preferredPages: string[] = [], batchDeadline = Date.now() + 35000): Promise<WebsiteContacts> {
  const deadline = Math.min(batchDeadline, Date.now() + 18000)
  const pages: Page[] = []
  const read = async (url: string) => {
    try { const page = await readPage(url, website, Math.min(deadline, Date.now() + 5000)); pages.push(page); return page } catch { return null }
  }
  const homepage = await read(website)
  const initial = homepage ? contactsOnPage(homepage) : null
  if (!initial?.emails.length || !initial?.phones.length) {
    const candidates = new Set<string>()
    for (const url of preferredPages) if (sameBusinessWebsite(url, website)) candidates.add(url)
    if (homepage) {
      const links = [...homepage.html.matchAll(/<a\b[^>]{0,4000}>/gi)].map(match => {
        try {
          const url = new URL(attribute(match[0], 'href'), homepage.url); url.hash = ''
          const label = homepage.html.slice((match.index || 0) + match[0].length, (match.index || 0) + match[0].length + 300).split(/<\/a>/i)[0]
          return { url: url.toString(), text: decode(label.replace(/<[^>]+>/g, ' ')) }
        } catch { return null }
      }).filter((link): link is { url: string; text: string } => Boolean(link && sameBusinessWebsite(link.url, website) && /contact|get.in.touch|reach.us|enquir/i.test(link.url + ' ' + link.text)))
      for (const link of links.sort((a,b) => a.url.length - b.url.length)) candidates.add(link.url)
    }
    for (const path of ['/contact', '/contact-us', '/contact-us/', '/contact.html', '/contact.php', '/about/contact']) candidates.add(new URL(path, homepage?.url || website).toString())
    const targets = [...candidates].filter(url => url !== homepage?.url && !/\.(pdf|jpe?g|png|zip|docx?)(\?|$)/i.test(url)).slice(0,4)
    await Promise.allSettled(targets.map(read))
  }
  const all = pages.map(contactsOnPage)
  const assetSources: string[] = []
  // Inline hydration data and React/Vue bundles can contain the rendered footer
  // even when the initial HTML is only an empty application shell.
  for (const page of pages) {
    const inline = [...page.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => scriptContactMarkup(match[1])).join('\n')
    if (inline) all.push(contactsOnPage({ url: page.url, html: inline }))
  }
  if (!all.some(item => item.emails.length) || !all.some(item => item.phones.length)) {
    const assets = new Map<string, string>()
    for (const page of pages) {
      for (const [tag] of page.html.matchAll(/<(?:script|link)\b[^>]{0,4000}>/gi)) {
        const src = attribute(tag, 'src') || (/modulepreload|as\s*=\s*["']script/i.test(tag) ? attribute(tag, 'href') : '')
        if (!src) continue
        try {
          const url = new URL(src, page.url); url.hash = ''
          if (sameBusinessWebsite(url.toString(), website) && /\.(?:m?js)(?:$|\?)/i.test(url.pathname) && !/analytics|gtag|tracking|vendor/i.test(url.pathname)) assets.set(url.toString(), page.url)
        } catch { /* Ignore invalid asset URLs. */ }
      }
    }
    await Promise.allSettled([...assets].slice(0,3).map(async ([url, sourceUrl]) => {
      const asset = await readPage(url, website, Math.min(deadline, Date.now() + 5000), 0, true)
      assetSources.push(asset.url)
      all.push(contactsOnPage({ url: sourceUrl, html: scriptContactMarkup(asset.html) }))
    }))
  }
  const email = all.flatMap(item => item.emails).sort((a,b) => b.rank - a.rank)[0]
  const phone = all.flatMap(item => item.phones).sort((a,b) => b.rank - a.rank)[0]
  const status = email && phone ? 'FOUND' : email || phone ? 'PARTIAL' : pages.length ? 'NOT_FOUND' : 'UNAVAILABLE'
  return { publicEmail: email?.value || '', publicPhone: phone?.value || '', emailSourceUrl: email?.sourceUrl || '', phoneSourceUrl: phone?.sourceUrl || '',
    contactSourceUrl: email?.sourceUrl || phone?.sourceUrl || '', contactLookupStatus: status,
    contactLookupMessage: status === 'UNAVAILABLE' ? 'Website contact lookup was blocked or timed out. Open the website to review its contact page.'
      : status === 'NOT_FOUND' ? 'No email or phone was found in the pages we could read.' : status === 'PARTIAL' ? 'Some published contact details were found; other details could not be extracted.' : 'Email and phone extracted from the business website.',
    contactPagesChecked: [...new Set([...pages.map(page => page.url), ...assetSources])],
  }
}
