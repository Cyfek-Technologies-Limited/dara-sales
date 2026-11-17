export class BusinessSearchOutputError extends Error {
  readonly code = 'SEARCH_OUTPUT_INVALID'
}

// Web research may include prose, fences, or a response cut off halfway
// through the last record. Preserve complete objects; never repair or invent
// an incomplete company, URL, or contact value.
export function parseBusinessSearchOutput(text: string): { businesses: Record<string, unknown>[]; partial: boolean } {
  const first = text.indexOf('{'), last = text.lastIndexOf('}')
  if (first >= 0 && last >= first) {
    try {
      const value = JSON.parse(text.slice(first, last + 1))
      if (value && Array.isArray(value.businesses)) return { businesses: value.businesses.filter((item: unknown) => item && typeof item === 'object' && !Array.isArray(item)), partial: false }
    } catch { /* Read only complete records below. */ }
  }
  const start = /"businesses"\s*:\s*\[/.exec(text)
  if (!start) throw new BusinessSearchOutputError('The research provider did not return a usable business list. Retry with 5 results.')
  const businesses: Record<string, unknown>[] = []
  let depth = 0, quoted = false, escaped = false, recordStart = -1
  for (let i = start.index + start[0].length; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') { quoted = true; continue }
    if (!depth && char === ']') break
    if (char === '{') { if (!depth) recordStart = i; depth++ }
    if (char === '}' && depth > 0) {
      depth--
      if (!depth && recordStart >= 0) {
        try {
          const value = JSON.parse(text.slice(recordStart, i + 1))
          if (value && typeof value === 'object' && !Array.isArray(value)) businesses.push(value)
        } catch { /* A malformed record is not a valid prospect. */ }
        recordStart = -1
      }
    }
  }
  if (!businesses.length) throw new BusinessSearchOutputError('The research provider returned an incomplete business list. Retry with 5 results.')
  return { businesses, partial: true }
}
