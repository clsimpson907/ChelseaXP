import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import assert from 'node:assert/strict'

function cache(fetch) {
  const delays = []
  const source = stripTypeScriptTypes(readFileSync(new URL('../src/publishedComplaints.ts', import.meta.url), 'utf8'))
    .replaceAll('import.meta.env', 'env').replace(/export /g, '')
  const api = new Function('env', 'fetch', 'globalThis', source + '; return { refreshPublishedCopies, getPublishedCopies };')(
    {}, fetch, { setTimeout: (callback, delay) => { delays.push(delay); queueMicrotask(callback) } })
  return { ...api, delays }
}
const ok = rows => ({ ok: true, json: async () => rows })
const limited = seconds => ({ ok: false, status: 429, headers: new Headers({ 'Retry-After': seconds }) })

test('429 retries the same page and retains earlier pages', async () => {
  const offsets = []
  const first = Array.from({ length: 50 }, (_, i) => ({ subject: String(i), message: 'body' }))
  const api = cache(async url => {
    offsets.push(url.searchParams.get('offset'))
    return offsets.length === 1 ? ok(first) : offsets.length === 2 ? limited('2') : ok([])
  })
  await api.refreshPublishedCopies()
  assert.deepEqual(offsets, ['0', '50', '50'])
  assert.deepEqual(api.delays, [2000])
  assert.equal(Object.keys(api.getPublishedCopies()).length, 50)
})

test('repeated throttling is bounded and retains the previous cache', async () => {
  let fail = false
  let attempts = 0
  const api = cache(async () => { attempts++; return fail ? limited('1') : ok([{ subject: 'saved', message: 'body' }]) })
  await api.refreshPublishedCopies()
  fail = true
  await assert.rejects(api.refreshPublishedCopies())
  assert.equal(attempts, 4)
  assert.equal(api.getPublishedCopies()[0].subject, 'saved')
})

test('excessive Retry-After does not retry early', async () => {
  const api = cache(async () => limited('120'))
  await assert.rejects(api.refreshPublishedCopies())
  assert.deepEqual(api.delays, [])
})
