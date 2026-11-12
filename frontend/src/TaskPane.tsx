import { useId, useState } from 'react'
import type { ReactNode } from 'react'

export default function TaskPane({ label, children }: { label: string; children: ReactNode }) {
  return <aside className="window-sidebar task-pane" aria-label={label}>{children}</aside>
}

export function TaskSection({ title, children, defaultExpanded = true }: { title: string; children: ReactNode; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const sectionId = useId()

  return (
    <section className="task-pane-section">
      <h2>
        <button type="button" aria-expanded={expanded} aria-controls={sectionId}
          onClick={() => setExpanded((previous) => !previous)}>
          <span>{title}</span>
          <span className="task-pane-toggle" aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
        </button>
      </h2>
      <div className="task-pane-actions" id={sectionId} hidden={!expanded}>{children}</div>
    </section>
  )
}
