// Offline worker regression checks: no live database, API calls or email sends.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

async function scenario({ remaining = 50, revoked = false, providerFailure = false, locations, cursor = 0, categoryCount = 1 } = {}) {
  const queries = [], inserts = [], updates = []
  const job = { organizationId: 'org', authUserId: 'staff', categoryCursor: cursor, location: 'Lagos', locations, dailyTarget: 50, addedToday: 50 - remaining }
  let searched
  const member = { role: 'STAFF', industryIds: revoked ? ['different'] : ['industry'] }
  async function query(sql, values = []) {
    queries.push({ sql, values })
    if (sql.startsWith('WITH due')) return { rows: [job] }
    if (sql.startsWith('SELECT "role"')) return { rows: [{ role: 'STAFF', industryIds: ['industry'] }] }
    if (sql.includes('FROM "IndustryCategory"')) return { rows: Array.from({length:categoryCount},(_,i)=>({ id: i ? `category${i}` : 'category', industryId:'industry',industry:'Manufacturing' })) }
    if (sql.startsWith('SELECT "businessName"')) return { rows: [] }
    if (sql.startsWith('SELECT d.*')) return { rows: [{ ...job, ...member }] }
    if (sql.startsWith('SELECT "id","ownerId"')) return { rows: values[1] === 'Other owner' ? [{ id: 'other', ownerId: 'someone-else' }] : values[1] === 'Own existing' ? [{ id: 'own', ownerId: 'staff' }] : [] }
    if (sql.startsWith('INSERT INTO "SalesLead"')) inserts.push(values)
    if (sql.startsWith('UPDATE "SalesLead"')) updates.push(values)
    return { rows: [], rowCount: 1 }
  }
  const pool = { query, connect: async () => ({ query, release() {} }) }
  const businesses = ['Other owner','Own existing','First new','Second new','No contacts'].map((name,index) => ({ businessName:name,website:`https://example${index}.com`,sourceUrl:`https://example${index}.com/about`, publicEmail:index===4?'':`work@example${index}.com`,summary:'Sourced company' }))
  const researchProspects = async (body, scope, exclusions, report) => {
    searched = {location:body.location,category:body.categoryId}
    assert.equal(scope.role, 'STAFF')
    assert.ok(Array.from(scope.industryIds).every(id=>id==='industry'))
    await report({ phase:'SEARCHING', message:'Searching public sources.' })
    await report({ phase:'CONTACTS', message:'Checking contacts.', company:'First new',checked:1,total:2 })
    return { ok: !providerFailure, json: async () => providerFailure ? { code:'SEARCH_TIMEOUT' } : { businesses } }
  }
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync('lib/automatic-prospecting.ts','utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText
  vm.runInNewContext(source, { module,exports:module.exports,require(name) { if(name==='@/lib/db')return {pool};if(name==='@/lib/prospect-research')return {researchProspects};throw Error(name) },process:{env:{OPENAI_API_KEY:'offline-fixture'}},crypto:require('node:crypto').webcrypto,URL,console:{error() {}} })
  const result = await module.exports.processProspectDiscovery()
  return { result,queries,inserts,updates,searched }
}

;(async () => {
  const normal = await scenario()
  assert.equal(normal.result.state,'completed')
  assert.equal(normal.result.added,2)
  assert.equal(normal.inserts.length,2)
  assert.ok(normal.inserts.every(values => values[2]==='staff'))
  assert.deepEqual(normal.updates.map(values=>values[0]),['own'])
  assert.ok(normal.queries.some(q=>q.sql==='COMMIT'))
  const reported=normal.queries.filter(q=>q.sql.includes('SET "progress"=$4')).map(q=>JSON.parse(q.values[3]))
  assert.deepEqual(reported.map(p=>p.phase),['SEARCHING','CONTACTS','SAVING'])
  assert.equal(reported[1].company,'First new')
  assert.equal(reported[1].checked,1)
  assert.ok(normal.queries.filter(q=>q.sql.includes('SET "progress"=$4')).every(q=>q.sql.includes('"leaseId"=$3') && q.sql.includes('"enabled"')))
  const capped = await scenario({ remaining:1 })
  assert.equal(capped.inserts.length,1)
  const revoked = await scenario({ revoked:true })
  assert.equal(revoked.inserts.length,0)
  assert.equal(revoked.result.state,'retry-scheduled')
  assert.ok(revoked.queries.some(q=>q.sql==='ROLLBACK'))
  const failed = await scenario({ providerFailure:true })
  assert.equal(failed.inserts.length,0)
  assert.equal(failed.result.state,'retry-scheduled')
  assert.ok(failed.queries.some(q=>q.sql.includes("interval '1 hour'")))
  assert.equal(normal.searched.location,'Lagos') // Legacy single-location settings.
  const pairs=[]
  for(let cursor=0;cursor<6;cursor++) pairs.push((await scenario({locations:['Lagos','Abuja','Ibadan'],cursor,categoryCount:2})).searched)
  assert.deepEqual(pairs,[
    {location:'Lagos',category:'category'},{location:'Abuja',category:'category'},{location:'Ibadan',category:'category'},
    {location:'Lagos',category:'category1'},{location:'Abuja',category:'category1'},{location:'Ibadan',category:'category1'},
  ])
  assert.deepEqual((await scenario({locations:['Lagos','Abuja','Ibadan'],cursor:6,categoryCount:2})).searched,pairs[0])
  console.log('Passed: staff ownership, duplicate privacy, contact requirement, daily cap, revoked assignments, research retry.')
})().catch(error=>{console.error(error);process.exitCode=1})
