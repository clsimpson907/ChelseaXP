import { useState } from 'react'
import type { FormEvent } from 'react'

const apiOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5080'
const maxMessageLength = 2000

export default function ComplaintsForm() {
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return

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

  return (
    <>
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
    </>
  )
}
