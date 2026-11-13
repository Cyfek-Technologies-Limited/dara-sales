import { randomUUID } from 'node:crypto'

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024
export type EmailAttachment = { id: string; name: string; type: string; size: number; content: string }

export function attachmentMetadata(files: EmailAttachment[]) {
  return files.map(({ id, name, type, size }) => ({ id, name, type, size }))
}

export function resolveAttachments(input: unknown, saved: EmailAttachment[]): EmailAttachment[] {
  if (input == null) return []
  if (!Array.isArray(input) || input.length > 3) throw new Error('Choose up to 3 attachments, totalling no more than 2 MB.')
  const files = input.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid attachment.')
    const file = value as Record<string, unknown>
    if (typeof file.id === 'string' && !file.content) {
      const existing = saved.find(item => item.id === file.id)
      if (!existing) throw new Error('An attachment is no longer available. Reload and choose it again.')
      return existing
    }
    const name = typeof file.name === 'string' ? file.name.trim() : ''
    const content = typeof file.content === 'string' ? file.content : ''
    if (!name || name.length > 160 || /[\\/\x00-\x1f\x7f]/.test(name) || !content || content.length > 2800000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(content)) throw new Error('Invalid attachment name or content.')
    const bytes = Buffer.from(content, 'base64')
    if (bytes.toString('base64') !== content) throw new Error('Invalid attachment encoding.')
    const extension = name.split('.').pop()?.toLowerCase()
    let type = ''
    if (extension === 'pdf' && bytes.subarray(0, 5).toString() === '%PDF-') type = 'application/pdf'
    if (extension === 'png' && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) type = 'image/png'
    if (['jpg','jpeg'].includes(extension || '') && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) type = 'image/jpeg'
    if (extension === 'txt' && !bytes.includes(0) && Buffer.from(bytes.toString('utf8')).equals(bytes)) type = 'text/plain'
    if (!type || !bytes.length) throw new Error('Attachments must be PDF, PNG, JPG, or plain text files.')
    return { id: randomUUID(), name, type, content, size: bytes.length }
  })
  if (new Set(files.map(file => file.id)).size !== files.length || files.reduce((total, file) => total + file.size, 0) > MAX_ATTACHMENT_BYTES) throw new Error('Attachments must total no more than 2 MB, without duplicates.')
  return files
}

export function optionalSendingAttachments(input: unknown) {
  const files: EmailAttachment[] = []
  let skipped = input != null && !Array.isArray(input)
  if (Array.isArray(input)) {
    for (const value of input) {
      try {
        const [file] = resolveAttachments([value], [])
        if (files.length >= 3 || files.reduce((total, item) => total + item.size, 0) + file.size > MAX_ATTACHMENT_BYTES) { skipped = true; continue }
        files.push(file)
      } catch { skipped = true }
    }
  }
  return { files, skipped }
}
