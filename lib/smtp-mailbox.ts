import nodemailer from 'nodemailer'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'

export function smtpReady() {
  return /^[a-f0-9]{64}$/i.test(process.env.SMTP_ENCRYPTION_KEY || '')
}
function key() {
  if (!smtpReady()) throw new Error('The platform administrator needs to configure SMTP_ENCRYPTION_KEY.')
  return Buffer.from(process.env.SMTP_ENCRYPTION_KEY!, 'hex')
}
export function encryptPassword(password: string, organizationId: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from(organizationId))
  const content = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), content].map(part => part.toString('base64')).join('.')
}
function decryptPassword(value: string, organizationId: string) {
  const [iv, tag, content] = value.split('.').map(part => Buffer.from(part, 'base64'))
  const cipher = createDecipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from(organizationId)); cipher.setAuthTag(tag)
  return Buffer.concat([cipher.update(content), cipher.final()]).toString('utf8')
}
const blocked = new BlockList()
for (const [ip, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]] as const) blocked.addSubnet(ip, prefix, 'ipv4')
export async function smtpTransport(row: { smtpHost: string; smtpPort: number; smtpUsername: string; smtpPassword: string; organizationId: string }, plainPassword?: string) {
  // Resolve once, reject internal destinations, and pin the public address against DNS rebinding.
  if (isIP(row.smtpHost) || !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/i.test(row.smtpHost) || ![465,587].includes(row.smtpPort)) throw new Error('Enter a public SMTP hostname and port 465 or 587.')
  const addresses = await lookup(row.smtpHost, { all: true, family: 4 })
  if (!addresses.length || addresses.some(item => blocked.check(item.address, 'ipv4'))) throw new Error('The SMTP hostname must resolve to a public mail server.')
  return nodemailer.createTransport({
    host: addresses[0].address, port: row.smtpPort, secure: row.smtpPort === 465,
    requireTLS: true, tls: { servername: row.smtpHost, minVersion: 'TLSv1.2', rejectUnauthorized: true },
    auth: { user: row.smtpUsername, pass: plainPassword ?? decryptPassword(row.smtpPassword, row.organizationId) },
    connectionTimeout: 15000, greetingTimeout: 10000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
  })
}
