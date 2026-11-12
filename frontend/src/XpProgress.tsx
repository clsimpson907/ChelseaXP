import { useEffect, useState } from 'react'

const segmentCount = 18

type ProgressProps = {
  label: string
  icon: string
  messages: readonly [string, ...string[]]
  complete: boolean
  onCancel: () => void
}

export default function XpProgress({ label, icon, messages, complete, onCancel }: ProgressProps) {
  const [step, setStep] = useState(() => ({
    filled: 0,
    message: Math.floor(Math.random() * messages.length),
  }))

  useEffect(() => {
    if (complete || step.filled >= segmentCount - 2) return

    const timer = globalThis.setTimeout(() => {
      const jump = 2 + Math.floor(Math.random() * 4)
      const messageOffset = 1 + Math.floor(Math.random() * Math.max(0, messages.length - 1))
      setStep({
        filled: Math.min(segmentCount - 2, step.filled + jump),
        message: (step.message + messageOffset) % messages.length,
      })
    }, 230 + Math.random() * 170)
    return () => globalThis.clearTimeout(timer)
  }, [complete, messages.length, step])

  const filled = complete ? segmentCount : step.filled

  return (
    <section className="xp-progress" aria-label={label}>
      <div className="xp-progress-row">
        <img src={icon} alt="" width="42" height="42" />
        <div className="xp-progress-details">
          <p role="status">{complete ? 'Putting everything back where we found it…' : messages[step.message]}</p>
          <div className="xp-progress-track" role="progressbar" aria-label={label}>
            {Array.from({ length: segmentCount }, (_, index) => (
              <span key={index} aria-hidden="true" data-filled={index < filled} />
            ))}
          </div>
        </div>
      </div>
      <button type="button" onClick={onCancel}>Cancel</button>
    </section>
  )
}
