// Enforce the exact shape consumed by the industry cards and save endpoint.
export const industrySuggestionsFormat = {
  type: 'json_schema',
  name: 'industry_suggestions',
  strict: true,
  schema: {
    type: 'object', additionalProperties: false,
    required: ['industries'],
    properties: {
      industries: {
        type: 'array', minItems: 1, maxItems: 5,
        items: {
          type: 'object', additionalProperties: false,
          required: ['name', 'reason', 'subcategories'],
          properties: {
            name: { type: 'string' },
            reason: { type: 'string' },
            subcategories: { type: 'array', minItems: 6, maxItems: 6, items: { type: 'string' } },
          },
        },
      },
    },
  },
}
