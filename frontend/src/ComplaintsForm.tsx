import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import XpProgress from './XpProgress'
import { showProgressUntil } from './progressTiming'

const checkingMessages = [
  'Looking for the Complaints Department…',
  'Checking whether the inbox has room for drama…',
  'Asking the quota goblin for a head count…',
  'Waiting for the Complaints Department to pick up…',
  'Checking the inbox for signs of life…',
] as const

const sendingMessages = [
  'Filing your grievance under Extremely Important…',
  'Teaching the envelope how to find me…',
  'Applying one ceremonial postage stamp…',
  'Handing the complaint to a very small courier…',
  'Trying to make the inbox look busy…',
] as const

const checkingReverseMessages = [
  'The quota goblin asked for a recount…',
  'That drawer was labeled wrong…',
  'The inbox answered on the other line…',
] as const

const sendingReverseMessages = [
  'Oops. Put that stamp on backwards…',
  'The courier went back for their tiny hat…',
  'Refolding the complaint with more conviction…',
] as const

const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5080'
const maxMessageLength = 2000

const quotaErrors = {
  'daily-limit': { error: '0002 : DAILY_QUOTA_FULL', message: 'Everyone’s daily complaint quota has been reached.' },
  'burst-limit': { error: '0004 : TEN_MINUTE_QUOTA_FULL', message: 'Everyone’s 10-minute complaint quota has been reached.' },
  'hourly-limit': { error: '0005 : HOURLY_QUOTA_FULL', message: 'You’ve reached your hourly complaint limit.' },
} as const

type QuotaCode = keyof typeof quotaErrors
type Blocked =
  | { state: 'paused' }
  | { state: QuotaCode; resetAt: string }

type Availability = Blocked | { state: 'checking' | 'available' | 'unavailable' }

function blockedState(code: unknown, resetAt: unknown): Blocked | null {
  if (code === 'paused') return { state: 'paused' }
  if ((code === 'daily-limit' || code === 'burst-limit' || code === 'hourly-limit') && typeof resetAt === 'string' && Number.isFinite(Date.parse(resetAt))) {
    return { state: code, resetAt }
  }
  return null
}

export default function ComplaintsForm({ onClose, active, openPrivacy }: { onClose: () => void; active: boolean; openPrivacy: () => void }) {
  const elementId = useId()
  const [availability, setAvailability] = useState<Availability>({ state: 'checking' })
  const [sending, setSending] = useState(false)
  const [progressComplete, setProgressComplete] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null)
  const crashDialog = useRef<HTMLDialogElement>(null)
  const hasOpenedForm = useRef(false)
  const messageInput = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function checkAvailability() {
      try {
        const response = await showProgressUntil(fetch(new URL('/api/complaints/status', apiOrigin), {
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
        }), () => {
          if (!controller.signal.aborted) setProgressComplete(true)
        })
        if (controller.signal.aborted) return
        if (!response.ok) throw new Error('Availability request failed')

        const result = await response.json()
        if (controller.signal.aborted) return
        const state = result.state === 'available' ? { state: 'available' as const }
          : blockedState(result.state, result.resetAt)
        setAvailability(state ?? { state: 'unavailable' })
      } catch {
        if (!controller.signal.aborted) setAvailability({ state: 'unavailable' })
      }
    }

    void checkAvailability()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (availability.state === 'available') {
      hasOpenedForm.current = true
      return
    }

    const dialog = crashDialog.current
    if (!active || !dialog || availability.state === 'checking') return

    dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [active, availability.state])

  function dismissCrash() {
    if (!crashDialog.current?.open) return
    crashDialog.current.close()
    if (hasOpenedForm.current) {
      setFeedback({ text: explanation, error: true })
      setAvailability({ state: 'available' })
      requestAnimationFrame(() => messageInput.current?.focus())
    } else {
      onClose()
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending || availability.state !== 'available') return

    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('name') ?? '').trim()
    const email = String(fields.get('email') ?? '').trim()
    const subject = String(fields.get('subject') ?? '').trim()
    const message = String(fields.get('message') ?? '').trim()
    if (!subject) {
      form.querySelector<HTMLInputElement>('[name="subject"]')?.focus()
      setFeedback({ text: 'Enter a subject.', error: true })
      return
    }
    if (!message) {
      setFeedback({ text: 'Please enter a message.', error: true })
      form.querySelector('textarea')?.focus()
      return
    }

    setProgressComplete(false)
    setSending(true)
    setFeedback(null)
    try {
      const response = await showProgressUntil(fetch(new URL('/api/complaints', apiOrigin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
        signal: AbortSignal.timeout(45000),
      }), () => setProgressComplete(true))

      if (response.status === 202) {
        form.reset()
        setFeedback({ text: 'Thanks! Your complaint was submitted.', error: false })
        return
      }

      const result = await response.json().catch(() => null)
      const blocked = blockedState(result?.code, result?.resetAt)
      if (blocked) {
        setAvailability(blocked)
        return
      }

      const fallback = response.status === 429
        ? 'The submission limit has been reached. Please try again later.'
        : 'Your complaint could not be sent. Please try again later.'
      setFeedback({ text: typeof result?.message === 'string' ? result.message : fallback, error: true })
    } catch {
      setFeedback({ text: 'The server did not confirm your submission. Please try again later.', error: true })
    } finally {
      setSending(false)
    }
  }

  const blocked = availability.state !== 'checking' && availability.state !== 'available'
  const quota = 'resetAt' in availability ? quotaErrors[availability.state] : null
  const explanation = 'resetAt' in availability
    ? quotaErrors[availability.state].message + ' Try again after ' + new Date(availability.resetAt).toLocaleString(undefined, {
        dateStyle: 'medium', timeStyle: 'medium',
      }) + ' (local time).'
    : availability.state === 'paused'
      ? 'Complaints is temporarily disabled. Please check back later.'
      : 'Availability couldn’t be checked. Please try again later.'
  const crashCode = quota?.error ?? (availability.state === 'paused' ? '0001 : COMPLAINTS_PAUSED' : '0003 : STATUS_CHECK_FAILED')
  return (
    <>
      <dialog
        className="complaints-blue-screen"
        ref={crashDialog}
        aria-labelledby={elementId + '-complaints-crash-title'}
        aria-describedby={elementId + '-complaints-crash-message'}
        onClick={dismissCrash}
        onKeyDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
          dismissCrash()
        }}
        onCancel={(event) => {
          event.preventDefault()
          dismissCrash()
        }}
      >
        {blocked && (
          <div className="crash-content">
            <h1 id={elementId + '-complaints-crash-title'}>ChelseaXP</h1>
            <p>An error has occurred. Complaints could not continue.</p>
            <p id={elementId + '-complaints-crash-message'}>{explanation}</p>
            <p>Error: CXP : {crashCode}</p>
            <button type="button">Press any key or click to continue <span aria-hidden="true">_</span></button>
          </div>
        )}
      </dialog>

      {availability.state === 'checking' && (
        <XpProgress label="Checking Complaints availability" icon="/icons/connection-status.png"
          messages={checkingMessages} reverseMessages={checkingReverseMessages} complete={progressComplete} onCancel={onClose} />
      )}
      {sending && (
        <XpProgress label="Sending complaint" icon="/icons/mail.png"
          messages={sendingMessages} reverseMessages={sendingReverseMessages} complete={progressComplete} onCancel={onClose} />
      )}

      <div hidden={availability.state !== 'available' || sending}>
        <h1>Complaints</h1>
        <p>Your message goes privately to me by email. I’ll use your email address if I need to reply. <button className="complaint-privacy-link" type="button" onClick={openPrivacy}>Read the privacy notice</button></p>
        <form className="complaints-form" onSubmit={submit} aria-busy={sending}>
          <label htmlFor={elementId + '-complaint-name'}>Name (optional)</label>
          <input id={elementId + '-complaint-name'} name="name" autoComplete="name" maxLength={100} readOnly={sending} />
          <label htmlFor={elementId + '-complaint-email'}>Email address</label>
          <input id={elementId + '-complaint-email'} name="email" type="email" autoComplete="email" maxLength={254} required readOnly={sending} />
          <label htmlFor={elementId + '-complaint-subject'}>Subject</label>
          <input id={elementId + '-complaint-subject'} name="subject" required maxLength={120} readOnly={sending} />
          <label htmlFor={elementId + '-complaint-message'}>Message</label>
          <textarea ref={messageInput} id={elementId + '-complaint-message'} name="message" rows={6} maxLength={maxMessageLength} required readOnly={sending} />
          <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send complaint'}</button>
        </form>
        <p className="complaint-feedback" role="status">
          {feedback && <span className={feedback.error ? 'complaint-error' : undefined}>{feedback.text}</span>}
        </p>
      </div>
    </>
  )
}
