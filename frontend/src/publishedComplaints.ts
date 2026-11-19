export type PublicCopy = { subject: string; message: string }

export const complaintApiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5080'
export const reviewConfigured = Boolean(import.meta.env.VITE_ENTRA_TENANT_NAME &&
  import.meta.env.VITE_ENTRA_TENANT_ID && import.meta.env.VITE_ENTRA_BROWSER_CLIENT_ID &&
  import.meta.env.VITE_ENTRA_API_CLIENT_ID)
const previewSetting = import.meta.env.VITE_COMPLAINT_REVIEW_PREVIEW
export const localComplaintPreview = import.meta.env.DEV &&
  (previewSetting === 'true' || (previewSetting !== 'false' && !reviewConfigured))

let publishedCopies: Partial<Record<number, PublicCopy>> = {}
const listeners = new Set<() => void>()
let loading: Promise<void> | undefined
let refreshRequested = false

export function subscribeToPublishedCopies(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getPublishedCopies() {
  return publishedCopies
}

function updateCopies(copies: typeof publishedCopies) {
  publishedCopies = copies
  listeners.forEach((listener) => listener())
}

export function publishCopy(id: number, copy: PublicCopy) {
  if (!publishedCopies[id]) updateCopies({ ...publishedCopies, [id]: copy })
}

export function refreshPublishedCopies(afterPublish = false) {
  if (localComplaintPreview) return Promise.resolve()
  if (loading && afterPublish) refreshRequested = true
  return loading ??= loadCopies().finally(() => { loading = undefined })
}

async function fetchPublishedPage(url: URL) {
  for (let attempt = 0; ; attempt++) {
    let response: Response | undefined
    try {
      response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(20000),
      })
    } catch (error) {
      if (attempt >= 2) throw error
    }
    if (response?.ok) return response
    if (response && (attempt >= 2 || ![408, 429, 502, 503, 504].includes(response.status))) {
      throw new Error('Could not load published complaints')
    }
    let delay = attempt === 0 ? 1000 : 3000
    if (response?.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const seconds = retryAfter === null ? NaN : Number(retryAfter)
      const requested = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter ?? '') - Date.now()
      if (requested > 60000) throw new Error('Public refresh retry exceeds its wait limit')
      delay = Number.isFinite(requested) ? Math.max(1000, requested) : 60000
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, delay))
  }
}

async function loadCopies() {
  do {
    refreshRequested = false
    const copies: PublicCopy[] = []
    for (;;) {
      const url = new URL('/api/complaints/published', complaintApiOrigin)
      url.searchParams.set('offset', String(copies.length))
      const response = await fetchPublishedPage(url)
      const page: PublicCopy[] = await response.json()
      copies.push(...page)
      if (page.length < 50) break
    }
    updateCopies(Object.fromEntries(copies.map((copy, index) => [index, copy])))
  } while (refreshRequested)
}
