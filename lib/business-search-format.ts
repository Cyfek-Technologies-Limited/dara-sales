const nullableText = { type: ['string', 'null'] }
const properties = {
  businessName: { type: 'string' }, summary: { type: 'string' }, buyerReason: { type: 'string' },
  website: { type: 'string' }, sourceUrl: { type: 'string' },
  customerRole: { type: 'string', enum: ['END_USER','SELLER','UNCERTAIN'] }, sellsOffering: { type: 'boolean' },
  contactName: nullableText, contactJobTitle: nullableText, contactDepartment: nullableText,
  personSourceUrl: nullableText, personEvidence: nullableText,
  publicEmail: nullableText, publicPhone: nullableText, contactSourceUrl: nullableText,
  emailSourceUrl: nullableText, phoneSourceUrl: nullableText, emailEvidence: nullableText, phoneEvidence: nullableText,
  targetContactMatch: { type: 'string', enum: ['PERSON','TEAM','NONE'] }, targetTeamSourceUrl: nullableText,
  fallbackInbox: { type: ['object','null'], additionalProperties: false,
    properties: { email: { type: 'string' }, sourceUrl: { type: 'string' }, name: { type: 'string' }, scope: { type: 'string', enum: ['DEPARTMENT','GROUP'] } },
    required: ['email','sourceUrl','name','scope'] },
}

export const businessSearchFormat = {
  type: 'json_schema', name: 'business_search', strict: true,
  schema: { type: 'object', additionalProperties: false, required: ['businesses'],
    properties: { businesses: { type: 'array', items: {
      type: 'object', additionalProperties: false, properties, required: Object.keys(properties),
    } } } },
}
