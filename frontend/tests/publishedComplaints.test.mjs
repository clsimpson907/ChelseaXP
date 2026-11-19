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
const ok = (rows, cursor) => ({ ok: true, headers: new Headers(cursor ? { 'X-Next-Cursor': cursor } : {}), text: async () => JSON.stringify(rows) })
const limited = seconds => ({ ok: false, status: 429, headers: new Headers({ 'Retry-After': seconds }) })

test('429 retries the same page and retains earlier pages', async () => {
  const offsets = []
  const first = Array.from({ length: 50 }, (_, i) => ({ subject: String(i), message: 'body' }))
  const api = cache(async url => {
    offsets.push(url.searchParams.get('cursor'))
    return offsets.length === 1 ? ok(first, 'page-two') : offsets.length === 2 ? limited('2') : ok([])
  })
  await api.refreshPublishedCopies()
  assert.deepEqual(offsets, [null, 'page-two', 'page-two'])
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

test('interrupted body downloads retry the current cursor without losing prior pages', async () => {
  const cursors = []
  const first = [{ subject: 'first', message: 'body' }]
  const second = [{ subject: 'second', message: 'body' }]
  const api = cache(async url => {
    cursors.push(url.searchParams.get('cursor'))
    if (cursors.length === 1) return ok(first, 'next-page')
    if (cursors.length === 2) return {
      ...ok([]), text: async () => { throw new TypeError('Body download interrupted') },
    }
    return ok(second)
  })
  await api.refreshPublishedCopies()
  assert.deepEqual(cursors, [null, 'next-page', 'next-page'])
  assert.deepEqual(api.delays, [1000])
  assert.deepEqual(Object.values(api.getPublishedCopies()), [...first, ...second])
})

test('repeated interrupted bodies stop after three attempts and preserve cached copies', async () => {
  let fail = false
  let attempts = 0
  const api = cache(async () => {
    attempts++
    return fail ? { ...ok([]), text: async () => { throw new TypeError('Interrupted') } }
      : ok([{ subject: 'saved', message: 'body' }])
  })
  await api.refreshPublishedCopies()
  fail = true
  await assert.rejects(api.refreshPublishedCopies(), /Interrupted/)
  assert.equal(attempts, 4)
  assert.deepEqual(api.delays, [1000, 3000])
  assert.equal(api.getPublishedCopies()[0].subject, 'saved')
})
