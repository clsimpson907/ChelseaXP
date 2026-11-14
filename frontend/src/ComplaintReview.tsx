import { getPublishedCopies, publishCopy, subscribeToPublishedCopies, type PublicCopy } from './publishedComplaints'
import NavigationHistory from './NavigationHistory'
import type { ComponentProps } from 'react'
import ExplorerMenuBar, { type MenuAction } from './ExplorerMenuBar'
import { createPortal } from 'react-dom'
import type { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'

const tenant = import.meta.env.VITE_ENTRA_TENANT_NAME
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID
const browserId = import.meta.env.VITE_ENTRA_BROWSER_CLIENT_ID
const apiId = import.meta.env.VITE_ENTRA_API_CLIENT_ID
const configured = Boolean(tenant && tenantId && browserId && apiId)
const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5080'

let client: Promise<PublicClientApplication> | undefined

function signInClient() {
  return client ??= initializeSignInClient().catch((error) => {
    client = undefined
    throw error
  })
}

async function initializeSignInClient() {
  const { PublicClientApplication } = await import('@azure/msal-browser')
  const auth = new PublicClientApplication({
    auth: {
      clientId: browserId,
      authority: 'https://' + tenant + '.ciamlogin.com/' + tenantId,
      knownAuthorities: [tenant + '.ciamlogin.com'],
      redirectUri: new URL('/auth-redirect.html', window.location.origin).href,
    },
    cache: { cacheLocation: 'sessionStorage' },
  })
  await auth.initialize()
  return auth
}

export const reviewReturnKey = 'chelseaxp-review-signin'
const scopes = ['api://' + apiId + '/ComplaintReview.Access']
let redirectResult: ReturnType<PublicClientApplication['handleRedirectPromise']> | undefined

const previewSetting = import.meta.env.VITE_COMPLAINT_REVIEW_PREVIEW
const localPreview = import.meta.env.DEV &&
  (previewSetting === 'true' || (previewSetting !== 'false' && !configured))

export default function ComplaintReview({ active, help, navigation }: { active: boolean; help: MenuAction[]; navigation: ComponentProps<typeof NavigationHistory> }) {
  return localPreview ? <ComplaintReviewPreview active={active} help={help} navigation={navigation} /> : <EntraReview />
}

function EntraReview() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [role, setRole] = useState<'admin' | 'moderator' | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!configured) return
    let active = true

    async function signIn() {
      setBusy(true)
      try {
        const auth = await signInClient()
        const returning = sessionStorage.getItem(reviewReturnKey) !== null
        const session = await (redirectResult ??= auth.handleRedirectPromise())
        if (!active) return
        sessionStorage.removeItem(reviewReturnKey)
        if (!session) {
          if (returning) throw new Error('Sign-in did not finish')
          const existing = auth.getActiveAccount()
          if (existing) {
            const token = await auth.acquireTokenSilent({ scopes, account: existing })
            await checkAccess(token)
            return
          }
          sessionStorage.setItem(reviewReturnKey, '1')
          await auth.acquireTokenRedirect({ scopes, prompt: 'select_account' })
          return
        }
        redirectResult = Promise.resolve(null)
        await checkAccess(session)
        if (active && session.account) auth.setActiveAccount(session.account)
      } catch {
        if (!active) return
        sessionStorage.removeItem(reviewReturnKey)
        setFeedback('Sign-in couldn’t be completed. Close and reopen the department to try again.')
      } finally {
        if (active) setBusy(false)
      }
    }

    async function checkAccess(session: { accessToken: string; account: AccountInfo | null }) {
      const response = await fetch(new URL('/api/complaints/review/session', apiOrigin), {
        headers: { Authorization: 'Bearer ' + session.accessToken },
        cache: 'no-store',
      })
      if (!active) return
      if (response.status === 401 || response.status === 403) {
        setFeedback('This account doesn’t have access to the Complaints Department.')
        return
      }
      if (!response.ok) throw new Error('Access check failed')
      const result = await response.json()
      if (!active) return
      if (result.role !== 'admin' && result.role !== 'moderator') throw new Error('Unexpected access response')
      setAccount(session.account)
      setRole(result.role)
    }

    void signIn()
    return () => { active = false }
  }, [])

  async function signOut() {
    setBusy(true)
    setFeedback('')
    try {
      const auth = await signInClient()
      await auth.logoutPopup({ account, postLogoutRedirectUri: window.location.origin })
    } catch {
      setFeedback('The sign-out window couldn’t finish. You’re signed out of the department.')
    } finally {
      setRole(null)
      setFeedback((message) => message || 'Signed out. Close and reopen the department to sign in again.')
      setAccount(null)
      setBusy(false)
    }
  }

  if (!configured) return <p>Private review sign-in is currently unavailable.</p>

  return (
    <>
      {role ? <>
        <p>Signed in as {role === 'admin' ? 'Admin' : 'Moderator'}.</p>
        <button type="button" disabled={busy} onClick={signOut}>Sign out</button>
      </> : busy ? <p role="status">Opening sign-in…</p> : null}
      <p role="status">{feedback}</p>
    </>
  )
}


const submissionFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

const sampleComplaints = [
  { submittedAt: '2026-11-13T20:12:00Z', title: 'Where did the Start menu go?', name: 'Sample visitor', email: 'visitor@example.invalid', ip: '192.0.2.24', message: 'I resized the window and couldn’t find Start for a second. I found it again, but by then I’d already started writing this complaint.' },
  { submittedAt: '2026-11-12T16:40:00Z', title: 'The cat facts are distracting', name: '', email: 'cats@example.invalid', ip: '198.51.100.17', message: 'I opened Help and Support to find a folder and left knowing how many whiskers cats have. I still haven’t found my folder.' },
  { submittedAt: '2026-11-11T23:05:00Z', title: 'My new folder disappeared', name: 'Sample Explorer user', email: 'explorer@example.invalid', ip: '203.0.113.42', message: 'I made a folder on the desktop and it was gone after I refreshed. Is there somewhere I can read about how folders work?' },
]

const savedPreviewDrafts: Record<number, PublicCopy> = {}

function ComplaintReviewPreview({ active, help, navigation }: { active: boolean; help: MenuAction[]; navigation: ComponentProps<typeof NavigationHistory> }) {
  const elementId = useId()
  const [selected, setSelected] = useState(0)
  const [reading, setReading] = useState(false)
  const [role, setRole] = useState<'admin' | 'moderator'>('admin')
  const [drafts, setDrafts] = useState(() => ({ ...savedPreviewDrafts }))
  const [undoHistory, setUndoHistory] = useState<Record<number, (PublicCopy | undefined)[]>>({})
  const [redoHistory, setRedoHistory] = useState<Record<number, (PublicCopy | undefined)[]>>({})
  const publishedCopies = useSyncExternalStore(subscribeToPublishedCopies, getPublishedCopies)
  const complaint = sampleComplaints[selected]
  const draft = drafts[selected]
  const subjectRef = useRef<HTMLHeadingElement>(null)
  const messageRef = useRef<HTMLParagraphElement>(null)
  const [selection, setSelection] = useState<{ complaint: number; field: 'subject' | 'message'; start: number; end: number } | null>(null)
  const locked = Boolean(publishedCopies[selected])
  const canRedact = !locked && selection?.complaint === selected
  const publicCopy = publishedCopies[selected] ?? draft ?? { subject: complaint.title, message: complaint.message }

  useEffect(() => {
    function captureSelection() {
      const current = window.getSelection()
      if (!current?.rangeCount || current.isCollapsed) return
      const range = current.getRangeAt(0)
      const field = subjectRef.current?.contains(range.commonAncestorContainer) ? 'subject' : 'message'
      const element = field === 'subject' ? subjectRef.current : messageRef.current
      if (!element?.contains(range.commonAncestorContainer) || !range.toString().trim()) {
        setSelection(null)
        return
      }
      const prefix = range.cloneRange()
      prefix.selectNodeContents(element)
      prefix.setEnd(range.startContainer, range.startOffset)
      const start = prefix.toString().length
      setSelection({ complaint: selected, field, start, end: start + range.toString().length })
    }

    document.addEventListener('selectionchange', captureSelection)
    return () => document.removeEventListener('selectionchange', captureSelection)
  }, [selected])

  function redact() {
    if (getPublishedCopies()[selected] || !selection || selection.complaint !== selected) return
    const { field, start, end } = selection
    const text = publicCopy[field]
    const redactedText = text.slice(0, start) + text.slice(start, end).replace(/\S/gu, '#') + text.slice(end)
    if (redactedText === text) return
    setUndoHistory((current) => ({ ...current, [selected]: [...(current[selected] ?? []), draft] }))
    setDrafts((current) => ({
      ...current,
      [selected]: { ...publicCopy, [field]: redactedText },
    }))
    setRedoHistory((current) => ({ ...current, [selected]: [] }))
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }
  const canUndo = !locked && Boolean(undoHistory[selected]?.length)
  const canRedo = !locked && Boolean(redoHistory[selected]?.length)

  function restoreHistory(direction: 'undo' | 'redo') {
    if (getPublishedCopies()[selected]) return
    const [history, setHistory, setOppositeHistory] = direction === 'undo'
      ? [undoHistory, setUndoHistory, setRedoHistory] as const
      : [redoHistory, setRedoHistory, setUndoHistory] as const
    const entries = history[selected]
    if (!entries?.length) return
    const previous = entries.at(-1)
    setDrafts((current) => {
      const next = { ...current }
      if (previous) next[selected] = previous
      else delete next[selected]
      return next
    })
    setHistory((current) => ({ ...current, [selected]: entries.slice(0, -1) }))
    setOppositeHistory((current) => ({ ...current, [selected]: [...(current[selected] ?? []), draft] }))
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  const canPublish = role === 'admin' && !locked
  const softkeys = active ? document.getElementById('phone-softkeys') : null

  function publish() {
    if (!canPublish || getPublishedCopies()[selected]) return
    publishCopy(selected, publicCopy)
    delete savedPreviewDrafts[selected]
  }

  return (
    <div className="complaint-review-preview" data-reading={reading}>
      <ExplorerMenuBar label="Complaints Department menus" menus={{
        File: [
          { label: 'Save as draft', disabled: locked, action: () => {
            if (getPublishedCopies()[selected]) return
            savedPreviewDrafts[selected] = publicCopy
          } },
          ...(role === 'admin' ? [{ label: 'Publish', action: publish, disabled: !canPublish }] : []),
        ],
        Edit: [
          { label: 'Redact', action: redact, disabled: !canRedact },
          { label: 'Undo', action: () => restoreHistory('undo'), disabled: !canUndo },
          { label: 'Redo', action: () => restoreHistory('redo'), disabled: !canRedo },
        ],
        Help: help,
      }} />
      <div className="complaint-review-preview-header">
        <div className="explorer-toolbar complaint-review-toolbar" role="group" aria-label="Complaint navigation and actions">
          <NavigationHistory {...navigation} />
          <span className="explorer-toolbar-divider" aria-hidden="true" />
          <button type="button" aria-label="Redact" data-tooltip="Redact" disabled={!canRedact} onClick={redact}><img src="/icons/complaint-redact.png" alt="" width="20" height="20" /></button>
          <button type="button" disabled={!canUndo} onClick={() => restoreHistory('undo')} aria-label="Undo"><img src="/icons/complaint-undo.png" alt="" width="20" height="20" />Undo</button>
          <button type="button" disabled={!canRedo} onClick={() => restoreHistory('redo')} aria-label="Redo" data-tooltip="Redo"><img src="/icons/complaint-redo.png" alt="" width="20" height="20" /></button>
          {role === 'admin' && <button className="complaint-desktop-publish" type="button" disabled={!canPublish} onClick={publish} aria-label="Publish" data-tooltip="Publish"><img src="/icons/complaint-publish.png" alt="" width="20" height="20" /></button>}
        </div>
        <button className="complaint-inbox-back" type="button" onClick={() => setReading(false)}>Back to Inbox</button>
        <p>Local preview · Sample complaints</p>
        <label>Preview role <select value={role} onChange={(event) => {
          setRole(event.target.value === 'moderator' ? 'moderator' : 'admin')
        }}>
          <option value="admin">Admin</option>
          <option value="moderator">Moderator</option>
        </select></label>
      </div>
      <div className="complaint-review-panes">
        <section className="complaint-inbox" aria-labelledby={elementId + '-inbox'}>
          <h2 id={elementId + '-inbox'}>Inbox</h2>
          <p className="complaint-inbox-sort">Arranged by: Submitted</p>
          <ul>{sampleComplaints.map(({ title, submittedAt }, index) => {
            const isPublished = Boolean(publishedCopies[index])
            const icon = isPublished ? 'help-favorites' : 'mail'
            return (
            <li key={title}>
              <button type="button" aria-pressed={selected === index} onClick={() => {
                setSelected(index)
                setSelection(null)
                setReading(true)
              }}>
                <img src={`/icons/${icon}.png`} alt={isPublished ? "Published" : ""} title={isPublished ? "Published" : undefined} width="18" height="18" />
                <strong>{title}</strong>
                <time dateTime={submittedAt}>{submissionFormat.format(new Date(submittedAt))}</time>
              </button>
            </li>
            )
          })}</ul>
        </section>
        <article className="complaint-reading-pane" aria-labelledby={elementId + '-detail'}>
          <h2 ref={subjectRef} id={elementId + '-detail'} title={publicCopy.subject}>{publicCopy.subject}</h2>
          <dl>
            <dt>From</dt><dd title={complaint.name || 'Anonymous'}>{complaint.name || 'Anonymous'}</dd>
            <dt>Submitted</dt><dd title={submissionFormat.format(new Date(complaint.submittedAt))}><time dateTime={complaint.submittedAt}>{submissionFormat.format(new Date(complaint.submittedAt))}</time></dd>
            {role === 'admin' && <>
              <dt>Email</dt><dd title={complaint.email}>{complaint.email}</dd>
              <dt>IP address</dt><dd title={complaint.ip}>{complaint.ip}</dd>
            </>}
          </dl>
          <div className="complaint-message-sheet">
            <img className="complaint-message-icon" src={locked ? '/icons/help-favorites.png' : '/icons/mail.png'} alt={locked ? 'Published' : ''} title={locked ? 'Published' : undefined} width="24" height="24" />
            <p ref={messageRef} className="complaint-original-message">{publicCopy.message}</p>
          </div>
        </article>
      </div>
      {softkeys && createPortal(
        <div className="complaint-phone-actions">
          <button type="button" disabled={!reading || !canRedact} onClick={redact}>Redact</button>
          <button type="button" disabled={!reading || !canUndo} onClick={() => restoreHistory('undo')}>Undo</button>
          <button type="button" disabled={!reading || !canRedo} onClick={() => restoreHistory('redo')}>Redo</button>
          {role === 'admin' && <button type="button" disabled={!reading || !canPublish} onClick={publish}>Publish</button>}
        </div>,
        softkeys,
      )}
    </div>
  )
}
