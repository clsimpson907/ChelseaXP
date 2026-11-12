import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5080'
const maxMessageLength = 2000

type Blocked =
  | { state: 'paused' }
  | { state: 'daily-limit'; resetAt: string }

type Availability = Blocked | { state: 'checking' | 'available' | 'unavailable' }

function blockedState(code: unknown, resetAt: unknown): Blocked | null {
  if (code === 'paused') return { state: 'paused' }
  if (code === 'daily-limit' && typeof resetAt === 'string' && Number.isFinite(Date.parse(resetAt))) {
    return { state: 'daily-limit', resetAt }
  }
  return null
}

export default function ComplaintsForm() {
  const [availability, setAvailability] = useState<Availability>({ state: 'checking' })
  const [check, setCheck] = useState(0)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null)
  const blockedHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function checkAvailability() {
      try {
        const response = await fetch(new URL('/api/complaints/status', apiOrigin), {
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
        })
        // The previous API revision has no availability route during rollout.
        if (response.status === 404) {
          setAvailability({ state: 'available' })
          return
        }
        if (!response.ok) throw new Error('Availability request failed')

        const result = await response.json()
        const state = result.state === 'available' ? { state: 'available' as const }
          : blockedState(result.state, result.resetAt)
        setAvailability(state ?? { state: 'unavailable' })
      } catch {
        if (!controller.signal.aborted) setAvailability({ state: 'unavailable' })
      }
    }

    void checkAvailability()
    return () => controller.abort()
  }, [check])

  useEffect(() => {
    if (availability.state === 'paused' || availability.state === 'daily-limit') {
      blockedHeading.current?.focus()
    }
  }, [availability.state])

  function retryAvailability() {
    setAvailability({ state: 'checking' })
    setCheck((previous) => previous + 1)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending || availability.state !== 'available') return

    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('name') ?? '').trim()
    const email = String(fields.get('email') ?? '').trim()
    const message = String(fields.get('message') ?? '').trim()
    if (!message) {
      setFeedback({ text: 'Please enter a message.', error: true })
      form.querySelector('textarea')?.focus()
      return
    }

    setSending(true)
    setFeedback(null)
    try {
      const response = await fetch(new URL('/api/complaints', apiOrigin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
        signal: AbortSignal.timeout(45000),
      })

      if (response.status === 202) {
        form.reset()
        setFeedback({ text: 'Thanks! Your complaint was accepted for email delivery.', error: false })
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

  const blocked = availability.state === 'paused' || availability.state === 'daily-limit'

  return (
    <>
      {blocked && (
        <section className="complaints-blue-screen" aria-labelledby="complaints-blocked-heading">
          <h1 id="complaints-blocked-heading" ref={blockedHeading} tabIndex={-1}>
            {availability.state === 'paused' ? 'Complaints paused' : 'Complaint inbox full'}
          </h1>
          {availability.state === 'paused' ? (
            <p>Complaints is temporarily disabled. Please check back later.</p>
          ) : (
            <p>
              Today’s complaint quota has been reached. Try again after{' '}
              <time dateTime={availability.resetAt}>
                {new Date(availability.resetAt).toLocaleString(undefined, {
                  dateStyle: 'medium', timeStyle: 'short',
                })}
              </time>{' '}your local time.
            </p>
          )}
          <button type="button" onClick={retryAvailability}>Check again</button>
        </section>
      )}

      {availability.state === 'checking' && <p role="status">Checking Complaints availability…</p>}
      {availability.state === 'unavailable' && (
        <div className="complaints-unavailable">
          <h1>Complaints unavailable</h1>
          <p>Availability couldn’t be checked. Please try again later.</p>
          <button type="button" onClick={retryAvailability}>Check again</button>
        </div>
      )}

      <div hidden={availability.state !== 'available'}>
        <h1>Complaints</h1>
        <p>Your message goes to Chelsea by email. She’ll use your email address to reply if needed.</p>
        <form className="complaints-form" onSubmit={submit} aria-busy={sending}>
          <label htmlFor="complaint-name">Name (optional)</label>
          <input id="complaint-name" name="name" autoComplete="name" maxLength={100} readOnly={sending} />
          <label htmlFor="complaint-email">Email address</label>
          <input id="complaint-email" name="email" type="email" autoComplete="email" maxLength={254} required readOnly={sending} />
          <label htmlFor="complaint-message">Message</label>
          <textarea id="complaint-message" name="message" rows={6} maxLength={maxMessageLength} required readOnly={sending} />
          <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send complaint'}</button>
        </form>
        <p className="complaint-feedback" role="status">
          {feedback && <span className={feedback.error ? 'complaint-error' : undefined}>{feedback.text}</span>}
        </p>
      </div>
    </>
  )
}
