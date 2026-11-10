export type ProspectingDraft = {
  businessInput: string
  websiteUrl: string
  offering: string
  location: string
  categoryId: string
  keywords: string
  businessSize: string
  contactPreference: string
  targetContact: string
  exclusions: string
  resultLimit: string
  ownerId: string
}

export const emptyProspectingDraft: ProspectingDraft = {
  businessInput: '', websiteUrl: '', offering: '', location: '', categoryId: '', keywords: '', businessSize: 'ANY',
  contactPreference: 'ANY', targetContact: '', exclusions: '', resultLimit: '8', ownerId: '',
}

export function cleanProspectingDraft(value: unknown): ProspectingDraft {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const text = (key: string, max: number) => typeof input[key] === 'string' ? input[key].slice(0, max) : ''
  const choice = (key: string, options: string[], fallback: string) => typeof input[key] === 'string' && options.includes(input[key]) ? input[key] : fallback
  return {
    businessInput: text('businessInput', 600) || text('offering', 500) || text('websiteUrl', 600),
    websiteUrl: text('websiteUrl', 600),
    offering: text('offering', 500), location: text('location', 160), categoryId: text('categoryId', 160),
    keywords: text('keywords', 300), exclusions: text('exclusions', 300), ownerId: text('ownerId', 160),
    businessSize: choice('businessSize', ['ANY', 'SMALL', 'MEDIUM', 'LARGE'], 'ANY'),
    contactPreference: choice('contactPreference', ['ANY', 'EMAIL', 'PHONE', 'BOTH'], 'ANY'),
    targetContact: text('targetContact', 120),
    resultLimit: choice('resultLimit', ['5', '8', '12'], '8'),
  }
}
