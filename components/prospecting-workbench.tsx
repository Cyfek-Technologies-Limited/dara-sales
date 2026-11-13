'use client'

import { FormEvent, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ExternalLink, LoaderCircle, Plus, Search, Radar } from 'lucide-react'
import { useProspectingDraft } from '@/components/use-prospecting-draft'
import { type ProspectingDraft } from '@/lib/prospecting-draft'

type Suggestion = { name: string; reason: string; subcategories: string[] }
type Category = { id: string; name: string; industryName: string; industryId: string }
type Teammate = { id: string; name: string | null; email: string }
type Business = { generalCompanyContact?: boolean; emailSourceUrl?: string; phoneSourceUrl?: string; contactLookupStatus?: string; contactLookupMessage?: string; contactPagesChecked?: string[]; contactName?: string; contactJobTitle?: string; contactDepartment?: string; personSourceUrl?: string; businessName: string; summary: string; buyerReason?: string; website: string; sourceUrl: string; publicEmail?: string; publicPhone?: string; contactSourceUrl?: string }

const fieldClassName = 'mt-1.5 w-full rounded-xl border-[1px] border-black/30 bg-white px-3.5 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-[#173b65] focus:ring-4 focus:ring-[#dbe5f0] disabled:cursor-wait'
const categoryColors = ['bg-violet-100 text-violet-900', 'bg-cyan-100 text-cyan-900', 'bg-amber-100 text-amber-900', 'bg-rose-100 text-rose-900', 'bg-emerald-100 text-emerald-900', 'bg-[#dbe5f0] text-[#0b1f3a]']

export default function ProspectingWorkbench({ categories, teammates, storageKey, initialDraft, draftUpdatedAt, autoAssignUserId }: { categories: Category[]; teammates: Teammate[]; storageKey: string; initialDraft: ProspectingDraft; draftUpdatedAt: number; autoAssignUserId?: string }) {
  const router = useRouter()
  const { form, update, status: draftStatus, ready } = useProspectingDraft(storageKey, initialDraft, draftUpdatedAt)
  const { offering, businessInput = offering || form.websiteUrl || '', location, categoryId: draftCategoryId, keywords, businessSize, contactPreference, exclusions, resultLimit, ownerId } = form
  const categoryId = autoAssignUserId && !categories.some(category => category.id === draftCategoryId) ? categories[0]?.id || '' : draftCategoryId
  const setOffering = (value: string) => update('offering', value)
  const setLocation = (value: string) => update('location', value)
  const setCategoryId = (value: string) => update('categoryId', value)
  const setKeywords = (value: string) => update('keywords', value)
  const setBusinessSize = (value: string) => update('businessSize', value)
  const setContactPreference = (value: string) => update('contactPreference', value)
  const setExclusions = (value: string) => update('exclusions', value)
  const setResultLimit = (value: string) => update('resultLimit', value)
  const setOwnerId = (value: string) => update('ownerId', value)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [resultContext, setResultContext] = useState<{ categoryId: string; location: string; targetContact: string } | null>(null)
  const [loading, setLoading] = useState('')
  const [savingName, setSavingName] = useState('')
  const [savingLeadKey, setSavingLeadKey] = useState('')
  const [savingAll, setSavingAll] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; saved: number; existing: number; failed: number } | null>(null)
  const saveInFlight = useRef(false)
  const [leadStatuses, setLeadStatuses] = useState<Record<string, { kind: 'success' | 'error'; message: string }>>({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [websiteSources, setWebsiteSources] = useState<string[]>([])
  const selectedOwnerId = autoAssignUserId || (teammates.some((teammate) => teammate.id === ownerId) ? ownerId : '')

  const isWebsiteInput = /^(?:https?:\/\/|www\.)\S+$/i.test(businessInput.trim()) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#]\S*)?$/i.test(businessInput.trim())

  function changeBusinessInput(value: string) {
    update('businessInput', value)
    const isUrl = /^(?:https?:\/\/|www\.)\S+$/i.test(value.trim()) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#]\S*)?$/i.test(value.trim())
    update('websiteUrl', isUrl ? value : '')
    setOffering(isUrl ? '' : value)
    setWebsiteSources([])
  }

  async function suggestIndustries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || saveInFlight.current) return
    setLoading(isWebsiteInput ? 'website' : 'suggest'); setError(''); setMessage(''); setSuggestions([]); setWebsiteSources([])
    try {
      const response = await fetch('/api/admin/prospecting/suggest', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(isWebsiteInput ? { websiteUrl: businessInput.trim(), location } : { offering: businessInput, location }),
        signal: AbortSignal.timeout(isWebsiteInput ? 80000 : 40000),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not suggest industries.')
      if (isWebsiteInput) setOffering(data.offering)
      setSuggestions(data.industries)
      setWebsiteSources(data.sourceUrls || [])
    } catch (cause) {
      setError(cause instanceof Error && cause.name === 'TimeoutError' ? 'Research took too long. Try again, or enter a brief description of your business.' : cause instanceof Error ? cause.message : 'Could not suggest industries.')
    } finally { setLoading('') }
  }

  async function saveSuggestion(suggestion: Suggestion) {
    setSavingName(suggestion.name); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/prospecting/industries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: suggestion.name, subcategories: suggestion.subcategories }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not add industry.')
      setMessage(`${suggestion.name} has been added to your Industries with its suggested categories.`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add industry.') }
    finally { setSavingName('') }
  }

  async function searchBusinesses(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || saveInFlight.current) return
    setLoading('search'); setError(''); setMessage(''); setBusinesses([]); setLeadStatuses({}); setBulkProgress(null)
    try {
      const targetContact = form.targetContact?.trim() || ''
      const response = await fetch('/api/admin/prospecting/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ offering, location, categoryId, keywords, businessSize, contactPreference, targetContact, exclusions, resultLimit: Number(resultLimit) }), signal: AbortSignal.timeout(115000) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not search for businesses.')
      setBusinesses(data.businesses || [])
      setResultContext({ categoryId, location, targetContact })
      if (!data.businesses?.length) setMessage(data.contactCandidatesChecked ? 'Businesses were researched, but their available contacts did not meet your selected requirements. Try fewer contact requirements or another category.' : 'No sourced potential buyers matched this search. Sellers and suppliers of your offering are excluded. Try a broader location or another customer category.')
      else setMessage(targetContact ? `${data.businesses.length} businesses found. Looked for ${targetContact} contacts on official company pages.` : `${data.businesses.length} businesses found. Published contacts were checked on their websites and contact pages.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not search for businesses.') }
    finally { setLoading('') }
  }

  async function persistBusiness(business: Business, saveCategoryId: string, assignedOwnerId: string): Promise<'saved' | 'existing' | 'failed'> {
    const key = `${business.businessName}:${business.website}`
    setSavingLeadKey(key)
    try {
      const response = await fetch('/api/admin/prospecting/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...business, categoryId: saveCategoryId, ownerId: assignedOwnerId }), signal: AbortSignal.timeout(45000) })
      const data = await response.json().catch(() => ({}))
      if (response.status === 409) {
        setLeadStatuses(current => ({ ...current, [key]: { kind: 'success', message: 'Already in your prospects. Skipped duplicate.' } }))
        return 'existing'
      }
      if (!response.ok) throw new Error(data.error || 'Could not save this prospect.')
      const teammate = teammates.find(item => item.id === data.ownerId)
      setLeadStatuses(current => ({ ...current, [key]: { kind: 'success', message: autoAssignUserId ? 'Added to your prospects.' : data.ownerId ? `Added to ${teammate?.name || teammate?.email || 'your teammate'}'s prospects.` : 'Saved to prospects as unassigned.' } }))
      return 'saved'
    } catch (cause) {
      const message = cause instanceof Error && cause.name === 'TimeoutError'
        ? 'Saving took too long. Check the prospects page before trying again.'
        : cause instanceof Error ? cause.message : 'Could not save this prospect.'
      setLeadStatuses(current => ({ ...current, [key]: { kind: 'error', message } }))
      return 'failed'
    }
  }

  async function saveBusiness(business: Business) {
    const key = `${business.businessName}:${business.website}`
    if (saveInFlight.current || leadStatuses[key]?.kind === 'success') return
    const saveCategoryId = resultContext?.categoryId || categoryId
    if (!saveCategoryId) {
      setLeadStatuses(current => ({ ...current, [key]: { kind: 'error', message: 'Choose an industry category and search again before adding this prospect.' } }))
      return
    }
    saveInFlight.current = true
    setError(''); setMessage(''); setBulkProgress(null)
    try { await persistBusiness(business, saveCategoryId, selectedOwnerId); router.refresh() }
    finally { saveInFlight.current = false; setSavingLeadKey('') }
  }

  const remainingBusinesses = [...new Map(businesses.filter(business => leadStatuses[`${business.businessName}:${business.website}`]?.kind !== 'success').map(business => [`${business.businessName}:${business.website}`, business])).values()]

  async function saveAllBusinesses() {
    if (saveInFlight.current || !remainingBusinesses.length) return
    const saveCategoryId = resultContext?.categoryId || categoryId
    if (!saveCategoryId) { setError('Choose an industry category and search again before adding prospects.'); return }
    const targets = [...remainingBusinesses]
    const assignedOwnerId = selectedOwnerId
    const progress = { done: 0, total: targets.length, saved: 0, existing: 0, failed: 0 }
    saveInFlight.current = true
    setSavingAll(true); setBulkProgress({ ...progress }); setError(''); setMessage('')
    try {
      for (const business of targets) {
        const outcome = await persistBusiness(business, saveCategoryId, assignedOwnerId)
        if (outcome === 'saved') progress.saved++
        else if (outcome === 'existing') progress.existing++
        else progress.failed++
        progress.done++
        setBulkProgress({ ...progress })
      }
      router.refresh()
    } finally { saveInFlight.current = false; setSavingAll(false); setSavingLeadKey('') }
  }

  const selectedCategory = categories.find((category) => category.id === (resultContext?.categoryId || categoryId))
  const feedback = error || message

  return <div className="mt-5 space-y-4">
    {!autoAssignUserId && <section className="rounded-2xl border-[1px] border-black/30 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#102842] text-white"><Radar className="size-5" /></span><div><h1 className="text-lg font-bold text-[#0b1f3a]">Tell us about your business</h1><p className="mt-1 text-xs leading-5 text-[#475569]">Describe your business, product, or service, or paste your website URL. Dara will suggest industries that could become your customers or clients.</p></div></div>
      <form onSubmit={suggestIndustries} className="mt-5">
        <fieldset disabled={!ready || Boolean(loading) || Boolean(savingLeadKey) || savingAll} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
          <label className="text-[13px] font-semibold text-slate-800 sm:col-span-2">Tell us about your business / enter your business URL<textarea required maxLength={600} value={businessInput} onChange={event => changeBusinessInput(event.target.value)} placeholder="Describe your business or paste your business URL" className={`${fieldClassName} min-h-24 resize-y`} /><span className="mt-1 block text-[11px] font-normal leading-5 text-slate-600">For example: We are an advertising agency helping brands promote their products. Or simply paste https://yourbusiness.com.</span></label>
          <label className="text-[13px] font-semibold text-slate-800">Target customer location<input required maxLength={160} value={location} onChange={event => setLocation(event.target.value)} placeholder="Lagos, Nigeria" className={fieldClassName} /></label>
          <div className="flex items-end"><button disabled={!businessInput.trim() || !location.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#142e50] disabled:cursor-not-allowed disabled:opacity-50">{loading === 'website' || loading === 'suggest' ? <LoaderCircle className="size-4 animate-spin" /> : <Radar className="size-4" />}{loading === 'website' ? 'Reading your website...' : loading === 'suggest' ? 'Finding industries...' : 'Suggest industries'}</button></div>
        </fieldset>
      </form>
      <p role="status" className="mt-3 text-xs text-slate-600">{ready ? draftStatus : 'Restoring your saved inputs...'}</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300 bg-rose-100 p-3 text-xs leading-5 text-rose-900">{error}</p>}
      {isWebsiteInput && offering && <label className="mt-4 block text-xs font-semibold text-slate-800">Business description from your website<textarea maxLength={500} value={offering} onChange={event => setOffering(event.target.value)} disabled={Boolean(loading) || Boolean(savingLeadKey) || savingAll} className={`${fieldClassName} min-h-24 resize-y`} /><span className="mt-1 block font-normal text-slate-600">Review or edit this summary before finding businesses.</span></label>}
      {websiteSources.length > 0 && <div className="mt-4 rounded-xl bg-[#edf2f7] p-4"><p className="text-xs font-semibold text-[#0b1f3a]">Pages used to understand your business</p><ul className="mt-2 space-y-2">{websiteSources.map(url => <li key={url}><a href={url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-xs text-[#173b65] underline"><span className="truncate">{url}</span><ExternalLink className="size-3 shrink-0" /></a></li>)}</ul></div>}
      {suggestions.length > 0 && <div className="mt-5 grid gap-3 lg:grid-cols-2">{suggestions.map((suggestion) => <article key={suggestion.name} className="rounded-xl border-[1px] border-black/30 bg-white p-4 shadow-sm transition hover:shadow-md"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{suggestion.name}</h3><p className="mt-1 text-xs leading-5 text-[#475569]">{suggestion.reason}</p></div><button type="button" onClick={() => saveSuggestion(suggestion)} disabled={Boolean(savingName)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border-[1px] border-black/30 bg-[#0b1f3a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#142e50] disabled:opacity-50">{savingName === suggestion.name ? <LoaderCircle className="size-3 animate-spin" /> : <Plus className="size-3" />}Add industry</button></div><div className="mt-3 flex flex-wrap gap-1.5">{suggestion.subcategories.map((category, index) => <span key={category} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${categoryColors[index % categoryColors.length]}`}>{category}</span>)}</div></article>)}</div>}
    </section>}

    <section className="rounded-2xl border-[1px] border-black/30 bg-gradient-to-br from-[#f1f4f8] via-white to-[#edf2f7] p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#102842] text-white shadow-md shadow-[#0b1f3a]/20"><Search className="size-5" /></span><div><h2 className="text-lg font-bold text-[#0b1f3a]">Discover businesses</h2><p className="mt-1 text-xs leading-5 text-[#475569]">Search current web results for businesses in a saved category. Review the official website and source page before adding any prospect.</p></div></div>
      {categories.length ? <form onSubmit={searchBusinesses} className="mt-5">
        <p className="mb-4 rounded-xl border border-[#b9cbe0] bg-[#e5edf6] p-3 text-xs leading-5 text-[#0b1f3a]">{autoAssignUserId ? 'Find businesses in your assigned industry. Any saved prospects are automatically assigned to you.' : 'Search targets potential customers who use what you sell. Businesses selling, distributing, or supplying the same offering are excluded.'}</p>
        <fieldset disabled={!ready || Boolean(loading) || Boolean(savingLeadKey) || savingAll} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
          <label className="text-[13px] font-semibold text-slate-800">Industry category
            <select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={fieldClassName}>
              <option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.industryName} / {category.name}</option>)}
            </select>
          </label>
          <label className="text-[13px] font-semibold text-slate-800">Target location
            <input required maxLength={160} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="For example: Ikeja, Lagos, Nigeria" className={fieldClassName} />
            <span className="mt-1 block text-[11px] font-normal text-[#475569]">Use a country, city, or neighbourhood to focus the search.</span>
          </label>
          <label className="text-[13px] font-semibold text-slate-800 sm:col-span-2">Search keywords <span className="font-normal text-[#475569]">(optional)</span>
            <input maxLength={300} value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="For example: food manufacturers, factories, packaging plants" className={fieldClassName} />
            <span className="mt-1 block text-[11px] font-normal text-[#475569]">Add products, services, specialities, or types of business to prioritise.</span>
          </label>
          <label className="text-[13px] font-semibold text-slate-800 sm:col-span-2">Who do you want to reach? <span className="font-normal text-[#475569]">(optional)</span>
            <input maxLength={120} value={form.targetContact ?? ''} onChange={(event) => update('targetContact', event.target.value)} placeholder="For example: procurement manager, maintenance team, or business development" className={fieldClassName} />
            <span className="mt-1 block text-[11px] font-normal text-[#475569]">Enter a role or team to look for publicly listed work contacts. Leave blank to include general company contacts.</span>
          </label>
          <label className="text-[13px] font-semibold text-slate-800">Preferred business size
            <select value={businessSize} onChange={(event) => setBusinessSize(event.target.value)} className={fieldClassName}>
              <option value="ANY">Any size</option><option value="SMALL">Small businesses (1-50 employees)</option><option value="MEDIUM">Medium businesses (51-250 employees)</option><option value="LARGE">Large businesses (251+ employees)</option>
            </select>
            <span className="mt-1 block text-[11px] font-normal text-[#475569]">A preference when size is publicly available; unknown sizes may appear.</span>
          </label>
          <label className="text-[13px] font-semibold text-slate-800">Contact details required
            <select value={contactPreference} onChange={(event) => setContactPreference(event.target.value)} className={fieldClassName}>
              <option value="ANY">Any business, with or without contacts</option><option value="EMAIL">{form.targetContact.trim() ? 'Email for the matching person or team' : 'Public business email'}</option><option value="PHONE">{form.targetContact.trim() ? 'Phone for the matching person or team' : 'Public business phone'}</option><option value="BOTH">Both email and phone</option>
            </select>
          </label>
          <label className="text-[13px] font-semibold text-slate-800 sm:col-span-2">Exclude businesses or keywords <span className="font-normal text-[#475569]">(optional)</span>
            <input maxLength={300} value={exclusions} onChange={(event) => setExclusions(event.target.value)} placeholder="For example: consultants, resellers, businesses already contacted" className={fieldClassName} />
          </label>
          <label className="text-[13px] font-semibold text-slate-800">Maximum results
            <select value={resultLimit} onChange={(event) => setResultLimit(event.target.value)} className={fieldClassName}>
              <option value="5">Up to 5 businesses</option><option value="8">Up to 8 businesses</option><option value="12">Up to 12 businesses</option>
            </select>
          </label>
          <label className="text-[13px] font-semibold text-slate-800">Assign saved prospects to (optional)
            <select disabled={Boolean(autoAssignUserId)} value={selectedOwnerId} onChange={(event) => setOwnerId(event.target.value)} className={fieldClassName}>
              {!autoAssignUserId && <option value="">Unassigned</option>}{teammates.map((teammate) => <option key={teammate.id} value={teammate.id}>{teammate.name || teammate.email}</option>)}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button disabled={loading === 'search' || (!autoAssignUserId && !offering.trim()) || !location.trim() || !categoryId} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#0b1f3a]/20 transition hover:bg-[#142e50] focus-visible:ring-4 focus-visible:ring-[#c9d8e8] disabled:cursor-not-allowed disabled:opacity-50">
              {loading === 'search' ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}{loading === 'search' ? 'Finding businesses and checking contact pages...' : 'Find businesses'}
            </button>
            <p className="mt-2 text-[11px] leading-5 text-[#475569]">These fields guide web research. More restrictive searches may return fewer results. Review each source before saving a prospect.</p>
          </div>
        </fieldset>
      </form> : <div className="mt-4 rounded-xl bg-[#f4f6f9] p-4 text-xs leading-5 text-[#475569]">{autoAssignUserId ? 'Ask your administrator to assign an industry with categories before searching.' : 'Add industries and categories before searching.'} <Link href="/admin/industries" className="font-semibold underline">Manage industries</Link></div>}
      {feedback && <p role={error ? 'alert' : 'status'} className={`mt-4 rounded-lg p-3 text-xs ${error ? 'border border-rose-300 bg-rose-100 text-rose-900' : 'border border-emerald-300 bg-emerald-100 text-emerald-950'}`}>{feedback}</p>}
      {businesses.length > 0 && <div className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold">Review search results</h3><p className="mt-1 text-xs text-[#475569]">{selectedCategory ? selectedCategory.industryName + ' / ' + selectedCategory.name : 'Selected category'} / {resultContext?.location || location} / {businesses.length} possible businesses</p></div>
          <div className="flex flex-wrap items-center gap-4"><Link href="/admin/leads" className="text-xs font-semibold text-[#173b65] underline">View prospects</Link><button type="button" onClick={saveAllBusinesses} disabled={savingAll || Boolean(savingLeadKey) || Boolean(loading) || !remainingBusinesses.length} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{savingAll ? <LoaderCircle className="size-4 animate-spin" /> : !remainingBusinesses.length ? <CheckCircle2 className="size-4" /> : <Plus className="size-4" />}{savingAll ? `Adding ${bulkProgress?.done || 0} of ${bulkProgress?.total || 0}...` : !remainingBusinesses.length ? 'All prospects added' : `Add all prospects (${remainingBusinesses.length})`}</button></div>
        </div>
        <div className="rounded-xl border-[1px] border-black/30 bg-[#edf2f7] p-4">
          <label htmlFor="results-owner" className="block text-[13px] font-semibold text-slate-800">Assign these prospects to (optional)</label>
          <select id="results-owner" value={selectedOwnerId} onChange={(event) => setOwnerId(event.target.value)} disabled={Boolean(autoAssignUserId) || Boolean(savingLeadKey) || savingAll} aria-describedby="results-owner-help" className={fieldClassName}>
            <option value="">Unassigned</option>{teammates.map((teammate) => <option key={teammate.id} value={teammate.id}>{teammate.name || teammate.email}</option>)}
          </select>
          <p id="results-owner-help" className="mt-2 text-xs text-slate-600">{autoAssignUserId ? 'Prospects you add are assigned to you automatically.' : teammates.length ? 'Save prospects as unassigned, or choose a teammate to receive them.' : <>No active teammates yet. Prospects will be saved as unassigned. <Link href="/admin/team" className="font-semibold text-[#173b65] underline">Manage team</Link></>}</p>
        </div>
        {bulkProgress && <div role="status" className={`rounded-xl border p-4 text-sm ${bulkProgress.failed ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>
          <p className="font-semibold">{savingAll ? `Adding prospects: ${bulkProgress.done} of ${bulkProgress.total} processed` : 'Bulk add finished'}</p>
          <p className="mt-1">{bulkProgress.saved} added ? {bulkProgress.existing} already saved ? {bulkProgress.failed} could not be saved</p>
          {savingAll && <div role="progressbar" aria-label="Adding prospects" aria-valuemin={0} aria-valuemax={bulkProgress.total} aria-valuenow={bulkProgress.done} className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-[#0b1f3a] transition-[width]" style={{ width: `${bulkProgress.done / bulkProgress.total * 100}%` }} /></div>}
          {!savingAll && bulkProgress.failed > 0 && <p className="mt-2 text-xs">Review the errors beside each prospect. Click Add all prospects again to retry those that failed.</p>}
        </div>}
        <p className="text-xs leading-5 text-slate-500">{resultContext?.targetContact ? <>Target: <strong>{resultContext.targetContact}</strong>. When no direct details are found, Dara looks for an official procurement or supplier inbox.</> : 'Contact details come from official company pages and may include general inboxes or main phone numbers.'}</p>
        <div className="overflow-x-auto rounded-xl border-[1px] border-black/30 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Company','Email','Phone','Sources / save'].map(title => <th key={title} className="whitespace-nowrap px-4 py-3">{title}</th>)}</tr></thead><tbody>
        {businesses.map((business) => {
          const key = business.businessName + ':' + business.website
          const status = leadStatuses[key]
          const isSaving = savingLeadKey === key
          const isSaved = status?.kind === 'success'
          return <tr key={key} className="border-t border-black/10 align-top hover:bg-slate-50">
            <td className="min-w-64 px-4 py-4">
              <h4 className="font-semibold">{business.businessName}</h4>
              <p className="mt-1 text-xs leading-5 text-slate-600">{business.summary}</p>
              {business.buyerReason && <p className="mt-2 text-xs leading-5 text-[#173b65]"><strong>Customer fit: </strong>{business.buyerReason}</p>}
              {resultContext?.targetContact && <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5">
                {business.generalCompanyContact ? <><strong>General company contacts</strong><p>No direct contact for the requested person or team was found.</p></> : business.contactName ? <><strong>{business.contactName}</strong><p>{[business.contactJobTitle, business.contactDepartment].filter(Boolean).join(' · ')}</p></>
                  : 'targetTeamSourceUrl' in business && typeof business.targetTeamSourceUrl === 'string' && business.targetTeamSourceUrl
                    ? <a href={business.targetTeamSourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#173b65] underline">{business.contactDepartment} ({'inboxScope' in business && business.inboxScope === 'GROUP' ? 'group inbox' : business.publicEmail ? 'department inbox' : 'team source'})</a>
                    : 'No matching person or team found'}
              </div>}
            </td>
            <td className="px-4 py-4">{business.publicEmail ? <a href={'mailto:' + business.publicEmail} className="text-[#173b65] hover:underline">{business.publicEmail}</a> : <span title={business.contactLookupMessage}>{business.contactLookupStatus === 'UNAVAILABLE' ? 'Lookup unavailable' : 'Not found on checked pages'}</span>}</td>
            <td className="whitespace-nowrap px-4 py-4">{business.publicPhone ? <a href={'tel:' + business.publicPhone} className="text-[#173b65] hover:underline">{business.publicPhone}</a> : <span title={business.contactLookupMessage}>{business.contactLookupStatus === 'UNAVAILABLE' ? 'Lookup unavailable' : 'Not found on checked pages'}</span>}</td>
            <td className="min-w-48 space-y-2 px-4 py-4"><div className="flex flex-wrap gap-3 text-xs"><a href={business.website} target="_blank" rel="noreferrer" className="text-[#173b65] underline">Website</a><a href={business.sourceUrl} target="_blank" rel="noreferrer" className="text-[#173b65] underline">Business source</a>{business.emailSourceUrl && <a href={business.emailSourceUrl} target="_blank" rel="noreferrer" className="text-[#173b65] underline">Email source</a>}{business.phoneSourceUrl && <a href={business.phoneSourceUrl} target="_blank" rel="noreferrer" className="text-[#173b65] underline">Phone source</a>}{!business.emailSourceUrl && !business.phoneSourceUrl && business.contactSourceUrl && <a href={business.contactSourceUrl} target="_blank" rel="noreferrer" className="text-[#173b65] underline">Contact source</a>}{business.personSourceUrl && <a href={business.personSourceUrl} target="_blank" rel="noreferrer" className="text-[#173b65] underline">Person source</a>}</div>
              {!business.publicEmail && !business.publicPhone && business.contactLookupMessage && <p className="text-xs leading-5 text-amber-800">{business.contactLookupMessage}</p>}
              <button type="button" disabled={Boolean(savingLeadKey) || savingAll || isSaved} onClick={() => saveBusiness(business)} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1f3a] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{isSaving ? <LoaderCircle className="size-4 animate-spin" /> : isSaved ? <CheckCircle2 className="size-4" /> : <Plus className="size-4" />}{isSaving ? 'Saving...' : isSaved ? 'Saved to prospects' : 'Add to prospects'}</button>
              {status && <p role={status.kind === 'error' ? 'alert' : 'status'} className={`text-xs leading-5 ${status.kind === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{status.message}</p>}
            </td>
          </tr>
        })}
        </tbody></table></div>
      </div>}
    </section>
    <p className="text-[11px] leading-5 text-[#64748b]">Search findings can be incomplete or outdated. Confirm the business and contact details from the linked source before outreach.</p>
  </div>
}
