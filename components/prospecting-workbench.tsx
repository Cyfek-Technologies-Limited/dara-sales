'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, LoaderCircle, Plus, Search, Sparkles } from 'lucide-react'

type Suggestion = { name: string; reason: string; subcategories: string[] }
type Category = { id: string; name: string; industryName: string; industryId: string }
type Teammate = { id: string; name: string | null; email: string }
type Business = { businessName: string; summary: string; website: string; sourceUrl: string; publicEmail?: string; publicPhone?: string; contactSourceUrl?: string }

const fieldClassName = 'mt-1.5 w-full rounded-xl border-[1px] border-black/30 bg-white px-3.5 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-violet-600 focus:ring-4 focus:ring-violet-100 disabled:cursor-wait'
const categoryColors = ['bg-violet-100 text-violet-900', 'bg-cyan-100 text-cyan-900', 'bg-amber-100 text-amber-900', 'bg-rose-100 text-rose-900', 'bg-emerald-100 text-emerald-900', 'bg-blue-100 text-blue-900']

export default function ProspectingWorkbench({ categories, teammates }: { categories: Category[]; teammates: Teammate[] }) {
  const router = useRouter()
  const [offering, setOffering] = useState('')
  const [location, setLocation] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [keywords, setKeywords] = useState('')
  const [businessSize, setBusinessSize] = useState('ANY')
  const [contactPreference, setContactPreference] = useState('ANY')
  const [exclusions, setExclusions] = useState('')
  const [resultLimit, setResultLimit] = useState('8')
  const [resultContext, setResultContext] = useState<{ categoryId: string; location: string } | null>(null)
  const [ownerId, setOwnerId] = useState(teammates[0]?.id || '')
  const [loading, setLoading] = useState('')
  const [savingName, setSavingName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function suggestIndustries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading('suggest'); setError(''); setMessage(''); setSuggestions([])
    try {
      const response = await fetch('/api/admin/prospecting/suggest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ offering, location }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not suggest industries.')
      setSuggestions(data.industries)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not suggest industries.') }
    finally { setLoading('') }
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
    setLoading('search'); setError(''); setMessage(''); setBusinesses([])
    try {
      const response = await fetch('/api/admin/prospecting/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ offering, location, categoryId, keywords, businessSize, contactPreference, exclusions, resultLimit: Number(resultLimit) }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not search for businesses.')
      setBusinesses(data.businesses || [])
      setResultContext({ categoryId, location })
      if (!data.businesses?.length) setMessage('No sourced businesses matched this search. Try a broader location, fewer keywords, or a less restrictive contact preference.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not search for businesses.') }
    finally { setLoading('') }
  }

  async function saveBusiness(business: Business) {
    setSavingName(business.businessName); setError(''); setMessage('')
    try {
      const response = await fetch('/api/admin/prospecting/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...business, categoryId: resultContext?.categoryId, ownerId }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not save this lead.')
      setBusinesses((current) => current.filter((item) => item.businessName !== business.businessName))
      setMessage(`${business.businessName} was added to the selected teammate’s leads.`)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this lead.') }
    finally { setSavingName('') }
  }

  const selectedCategory = categories.find((category) => category.id === (resultContext?.categoryId || categoryId))
  const feedback = error || message

  return <div className="mt-5 space-y-4">
    <section className="rounded-2xl border-[1px] border-black/30 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-600/25"><Sparkles className="size-5" /></span><div><h2 className="text-lg font-bold text-violet-950">Find your best-fit industries</h2><p className="mt-1 text-xs leading-5 text-[#475569]">Describe what you sell and the location you want to reach. AI will suggest relevant industries and six subcategories for each.</p></div></div>
      <form onSubmit={suggestIndustries} className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-[13px] font-semibold text-slate-800 sm:col-span-2">What product or service are you selling?<textarea required maxLength={500} value={offering} onChange={(event) => setOffering(event.target.value)} placeholder="For example: digital outdoor signage and campaign placement for local brands" className={`${fieldClassName} min-h-24 resize-y`} /></label><label className="text-[13px] font-semibold text-slate-800">Target location<input required maxLength={160} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Lagos, Nigeria" className={fieldClassName} /></label><div className="flex items-end"><button disabled={loading === 'suggest'} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-violet-700/20 transition hover:bg-violet-800 focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60">{loading === 'suggest' ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{loading === 'suggest' ? 'Finding industries…' : 'Suggest industries'}</button></div></form>
      {suggestions.length > 0 && <div className="mt-5 grid gap-3 lg:grid-cols-2">{suggestions.map((suggestion) => <article key={suggestion.name} className="rounded-xl border-[1px] border-black/30 bg-white p-4 shadow-sm transition hover:shadow-md"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{suggestion.name}</h3><p className="mt-1 text-xs leading-5 text-[#475569]">{suggestion.reason}</p></div><button type="button" onClick={() => saveSuggestion(suggestion)} disabled={Boolean(savingName)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border-[1px] border-black/30 bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50">{savingName === suggestion.name ? <LoaderCircle className="size-3 animate-spin" /> : <Plus className="size-3" />}Add industry</button></div><div className="mt-3 flex flex-wrap gap-1.5">{suggestion.subcategories.map((category, index) => <span key={category} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${categoryColors[index % categoryColors.length]}`}>{category}</span>)}</div></article>)}</div>}
    </section>

    <section className="rounded-2xl border-[1px] border-black/30 bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/25"><Search className="size-5" /></span><div><h2 className="text-lg font-bold text-teal-950">Discover businesses</h2><p className="mt-1 text-xs leading-5 text-[#475569]">Search current web results for businesses in a saved category. Review the official website and source page before adding any prospect.</p></div></div>
      {categories.length ? <form onSubmit={searchBusinesses} className="mt-5">
        <fieldset disabled={loading === 'search'} className="grid gap-4 sm:grid-cols-2 disabled:opacity-70">
          <label className="text-[13px] font-semibold text-slate-800">Industry category
            <select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={fieldClassName}>
              <option value="">Choose a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.industryName} / {category.name}</option>)}
            </select>
          </label>
          <label className="text-[13px] font-semibold text-slate-800">Target location
            <input required maxLength={160} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="For example: Ikeja, Lagos, Nigeria" className={fieldClassName} />
            <span className="mt-1 block text-[11px] font-normal text-[#475569]">Use a country, city, or neighbourhood to focus the search.</span>
          </label>
          <label className="text-[13px] font-semibold text-slate-800 sm:col-span-2">Product or service you sell
            <textarea required maxLength={500} value={offering} onChange={(event) => setOffering(event.target.value)} placeholder="What do you offer these businesses?" className={`${fieldClassName} min-h-24 resize-y`} />
          </label>
          <label className="text-[13px] font-semibold text-slate-800 sm:col-span-2">Search keywords <span className="font-normal text-[#475569]">(optional)</span>
            <input maxLength={300} value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="For example: food manufacturers, factories, packaging plants" className={fieldClassName} />
            <span className="mt-1 block text-[11px] font-normal text-[#475569]">Add products, services, specialities, or types of business to prioritise.</span>
          </label>
          <label className="text-[13px] font-semibold text-slate-800">Preferred business size
            <select value={businessSize} onChange={(event) => setBusinessSize(event.target.value)} className={fieldClassName}>
              <option value="ANY">Any size</option><option value="SMALL">Small businesses (1-50 employees)</option><option value="MEDIUM">Medium businesses (51-250 employees)</option><option value="LARGE">Large businesses (251+ employees)</option>
            </select>
            <span className="mt-1 block text-[11px] font-normal text-[#475569]">A preference when size is publicly available; unknown sizes may appear.</span>
          </label>
          <label className="text-[13px] font-semibold text-slate-800">Contact details required
            <select value={contactPreference} onChange={(event) => setContactPreference(event.target.value)} className={fieldClassName}>
              <option value="ANY">Any business, with or without contacts</option><option value="EMAIL">Public business email</option><option value="PHONE">Public business phone</option><option value="BOTH">Both email and phone</option>
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
          <label className="text-[13px] font-semibold text-slate-800">Assign saved leads to
            <select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className={fieldClassName}>
              <option value="">Choose a teammate</option>{teammates.map((teammate) => <option key={teammate.id} value={teammate.id}>{teammate.name || teammate.email}</option>)}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button disabled={loading === 'search' || !offering.trim() || !location.trim() || !categoryId} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-md shadow-teal-700/20 transition hover:bg-teal-800 focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-not-allowed disabled:opacity-50">
              {loading === 'search' ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}{loading === 'search' ? 'Searching the web...' : 'Find businesses'}
            </button>
            <p className="mt-2 text-[11px] leading-5 text-[#475569]">These fields guide web research. More restrictive searches may return fewer results. Review each source before saving a lead.</p>
          </div>
        </fieldset>
      </form> : <div className="mt-4 rounded-xl bg-[#f4f6f9] p-4 text-xs leading-5 text-[#475569]">Add industries and categories before searching. <Link href="/admin/industries" className="font-semibold underline">Manage industries</Link></div>}
      {feedback && <p role={error ? 'alert' : 'status'} className={`mt-4 rounded-lg p-3 text-xs ${error ? 'border border-rose-300 bg-rose-100 text-rose-900' : 'border border-emerald-300 bg-emerald-100 text-emerald-950'}`}>{feedback}</p>}
      {businesses.length > 0 && <div className="mt-5 space-y-3"><div><h3 className="text-sm font-semibold">Review search results</h3><p className="mt-1 text-xs text-[#475569]">{selectedCategory ? `${selectedCategory.industryName} · ${selectedCategory.name}` : 'Selected category'} · {resultContext?.location || location} · {businesses.length} possible businesses</p></div>{businesses.map((business) => <article key={`${business.businessName}:${business.website}`} className="rounded-xl border-[1px] border-black/30 bg-white p-4 shadow-sm transition hover:shadow-md"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><h4 className="font-semibold">{business.businessName}</h4><p className="mt-1 text-xs leading-5 text-[#475569]">{business.summary}</p>{(business.publicEmail || business.publicPhone) && <div className="mt-2 space-y-1 text-xs text-[#475467]">{business.publicEmail && <p>Email: <a className="font-medium text-violet-700 hover:underline" href={`mailto:${business.publicEmail}`}>{business.publicEmail}</a></p>}{business.publicPhone && <p>Phone: <a className="font-medium text-violet-700 hover:underline" href={`tel:${business.publicPhone}`}>{business.publicPhone}</a></p>}</div>}<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium"><a href={business.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-700 hover:underline">Official website <ExternalLink className="size-3" /></a><a href={business.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-700 hover:underline">Research source <ExternalLink className="size-3" /></a>{business.contactSourceUrl && <a href={business.contactSourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-700 hover:underline">Contact source <ExternalLink className="size-3" /></a>}</div></div><button type="button" onClick={() => saveBusiness(business)} disabled={!ownerId || Boolean(savingName)} className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">{savingName === business.businessName ? <LoaderCircle className="size-3 animate-spin" /> : <Plus className="size-3" />}Add to leads</button></div></article>)}</div>}
    </section>
    <p className="text-[11px] leading-5 text-[#64748b]">Search findings can be incomplete or outdated. Confirm the business and contact details from the linked source before outreach.</p>
  </div>
}
