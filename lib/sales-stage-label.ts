// Keep persisted stage codes stable while presenting the workspace terminology.
// LEAD is the original outreach stage; PROSPECT is a positive response.
export function salesStageLabel(stage: string) {
  if (stage === 'LEAD') return 'Prospect'
  if (stage === 'PROSPECT') return 'Lead'
  return stage.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
}
