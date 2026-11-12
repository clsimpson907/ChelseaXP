import { useRef, useState } from 'react'
import { explorerPlaces, locations, type LocationId } from './explorerLocations'
import TaskPane, { TaskSection } from './TaskPane'

const categories = [
  {
    id: 'feedback', label: 'Help and Feedback', icon: '/icons/help-and-support.png',
    items: [
      { id: 'complaints', label: 'Complaints Department', icon: '/icons/event-viewer.png' },
    ],
  },
] as const

type Location = { kind: 'home' } | { kind: 'category'; id: string } | { kind: 'item'; id: string }

export default function ControlPanel({ openComplaints, openFolder }: {
  openComplaints: () => void
  openFolder: (id: LocationId) => void
}) {
  const [view, setView] = useState<'category' | 'classic'>('category')
  const [location, setLocation] = useState<Location>({ kind: 'home' })
  const heading = useRef<HTMLHeadingElement>(null)
  const content = useRef<HTMLElement>(null)

  const category = location.kind === 'category'
    ? categories.find((entry) => entry.id === location.id)
    : undefined
  const items = categories.flatMap((entry) => entry.items)
  const item = location.kind === 'item' ? items.find((entry) => entry.id === location.id) : undefined
  const categoryHome = location.kind === 'home' && view === 'category'

  function navigate(next: Location) {
    setLocation(next)
    content.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }

  function switchView() {
    setView((current) => current === 'category' ? 'classic' : 'category')
    navigate({ kind: 'home' })
  }

  return (
    <div className="explorer control-panel">
      <div className="control-panel-address">
        <span aria-hidden="true">Address</span>
        <nav aria-label="Control Panel path">
          {location.kind === 'home' ? <span aria-current="location">Control Panel</span> : (
            <>
              <button onClick={() => navigate({ kind: 'home' })}>Control Panel</button>
              <span aria-hidden="true">›</span>
              <span aria-current="location">{item?.label ?? category?.label}</span>
            </>
          )}
        </nav>
      </div>
      <div className="control-panel-layout">
        <TaskPane label="Control Panel tasks">
          <TaskSection title="Control Panel">
            <button onClick={switchView}>Switch to {view === 'category' ? 'Classic View' : 'Category View'}</button>
          </TaskSection>
          {location.kind !== 'item' && (
            <TaskSection title="See Also">
              <button onClick={openComplaints}>
                <img src="/icons/mail.png" alt="" width="16" height="16" /> Submit a complaint
              </button>
            </TaskSection>
          )}
          <TaskSection title="Other Places">
            {explorerPlaces.map((id) => (
              <button key={id} type="button" onClick={() => openFolder(id)}>
                <img src={`/icons/${locations[id].icon}.png`} alt="" width="16" height="16" /> {locations[id].name}
              </button>
            ))}
          </TaskSection>
        </TaskPane>
        <section className={`control-panel-content${categoryHome ? ' control-panel-content--categories' : ''}`}
          ref={content} aria-labelledby="control-panel-heading">
          <h1 id="control-panel-heading" ref={heading} tabIndex={-1}>
            {item?.label ?? category?.label ?? (categoryHome ? 'Pick a category' : 'Control Panel')}
          </h1>
          {categoryHome && (
            <ul className="control-panel-categories">
              {categories.map(({ id, label, icon }) => (
                <li key={id}>
                  <button onClick={() => navigate({ kind: 'category', id })}>
                    <img src={icon} alt="" width="40" height="40" /> {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!item && !categoryHome && (
            <ul className="control-panel-items">
              {(category?.items ?? items).map(({ id, label, icon }) => (
                <li key={id}>
                  <button onClick={() => navigate({ kind: 'item', id })}>
                    <img src={icon} alt="" width="42" height="42" /> {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {item?.id === 'complaints' && (
            <div className="complaints-department">
              <p>Found a bug, spotted something confusing, or just have a grievance? The Complaints app sends your message privately to Chelsea. She’ll use your email address to reply if needed.</p>
              <p>The Recycle Bin is planned as a public collection of approved complaints. Before anything appears there, Chelsea will review the text and remove names, email addresses, and other identifying details.</p>
              <button className="department-action" onClick={openComplaints}>Open Complaints</button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
