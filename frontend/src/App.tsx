import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import DocumentExplorer from './DocumentExplorer'
import './desktop.css'

const apps = [
  { id: 'about', label: 'About Me', icon: '👤' },
  { id: 'documents', label: 'My Documents', icon: '📁' },
  { id: 'complaints', label: 'Complaints', icon: '💌' },
] as const

type AppId = (typeof apps)[number]['id']
type Point = { x: number; y: number }

function LinkedInShortcut({ onClick }: { onClick?: () => void }) {
  return (
    <a
      href="https://www.linkedin.com/in/chelsea-simpson-54437215a/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LinkedIn (opens in a new tab)"
      onClick={onClick}
    >
      <span className="linkedin-icon" aria-hidden="true">in</span>
      <span>LinkedIn</span>
    </a>
  )
}

function AppContent({ id, open }: { id: AppId; open: (id: AppId) => void }) {
  switch (id) {
    case 'about':
      return (
        <div className="profile">
          <aside className="profile-sidebar" aria-label="Portfolio shortcuts">
            <img className="profile-picture account-picture" src="/chelsea.jpg" alt="Chelsea Simpson" width="130" height="130" />
            <button onClick={() => open('documents')}>📁 <span>My Documents</span></button>
          </aside>
          <div className="profile-main">
            <h1>Hi, I’m Chelsea Simpson!</h1>
            <p className="profile-role">Software Developer</p>
            <p>I spent five years developing and supporting C# and .NET applications for state and local government clients at Selectron Technologies. I started on the support team, where I used SQL Server to track down bugs, then moved to customer development, where I built a text messaging service for municipal utilities. I have a bachelor’s degree in computer science from Portland State University.</p>
            <div className="profile-details">
              <section>
                <h2>Technical skills</h2>
                <ul>
                  <li>C#, .NET, and ASP.NET</li>
                  <li>Microsoft SQL Server</li>
                  <li>REST and SOAP integrations</li>
                  <li>Azure DevOps</li>
                </ul>
              </section>
              <section>
                <h2>Off the clock</h2>
                <p>I adore my sweet little kitty Birby, and I carry a Magic 8 Ball in case I need a second opinion. I love <i>Dwarf Fortress</i>, <i>Crusader Kings</i>, and <i>The Sims</i>, and taking my three-year-old daughter out for rides on my e-bike.</p>
              </section>
            </div>
            <div className="profile-actions">
              <button onClick={() => open('documents')}>Open My Documents →</button>
            </div>
          </div>
        </div>
      )
    case 'documents':
      return <DocumentExplorer />
    case 'complaints':
      return <><h1>Complaints</h1><p>Complaints is offline for now.</p></>
  }
}

const taskbarTimeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

function TaskbarClock() {
  const [time, setTime] = useState(() => taskbarTimeFormat.format(new Date()))

  useEffect(() => {
    const update = () => setTime(taskbarTimeFormat.format(new Date()))
    const timer = globalThis.setInterval(update, 1000)
    return () => globalThis.clearInterval(timer)
  }, [])

  return <span className="taskbar-clock">{time}</span>
}

export default function App() {
  const [selected, setSelected] = useState<AppId | null>('about')
  const [minimized, setMinimized] = useState(false)
  const [startOpen, setStartOpen] = useState(false)
  const [position, setPosition] = useState<Point | null>(null)
  const desktop = useRef<HTMLElement>(null)
  const window = useRef<HTMLElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const startProfileButton = useRef<HTMLButtonElement>(null)
  const taskButton = useRef<HTMLButtonElement>(null)
  const pendingFocus = useRef(false)
  const drag = useRef<{ pointer: number; offset: Point } | null>(null)

  const current = apps.find((app) => app.id === selected)
  const visible = current !== undefined && !minimized

  useEffect(() => {
    if (visible && pendingFocus.current) {
      window.current?.focus()
      pendingFocus.current = false
    }
  }, [selected, visible])

  useEffect(() => {
    if (startOpen) startProfileButton.current?.focus()
  }, [startOpen])

  useEffect(() => {
    const resetPosition = () => setPosition(null)
    globalThis.addEventListener('resize', resetPosition)
    return () => globalThis.removeEventListener('resize', resetPosition)
  }, [])

  function open(id: AppId) {
    if (id === selected && visible) {
      window.current?.focus()
    } else {
      pendingFocus.current = true
      if (id !== selected) setPosition(null)
      setSelected(id)
      setMinimized(false)
    }
    setStartOpen(false)
  }

  function close() {
    setSelected(null)
    setPosition(null)
    requestAnimationFrame(() => {
      const shell = desktop.current
      const shortcut = shell?.querySelector<HTMLButtonElement>(`[data-app="${selected}"]`)
      shortcut?.focus()
    })
  }

  function minimize() {
    setMinimized(true)
    taskButton.current?.focus()
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    const bounds = window.current?.getBoundingClientRect()
    if (!bounds || event.button !== 0 || event.pointerType === 'touch') return
    if ((event.target as HTMLElement).closest('button')) return
    drag.current = {
      pointer: event.pointerId,
      offset: { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveWindow(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current
    const bounds = desktop.current?.getBoundingClientRect()
    const panel = window.current
    if (!active || active.pointer !== event.pointerId || !bounds || !panel) return
    setPosition({
      x: Math.max(0, Math.min(bounds.width - panel.offsetWidth, event.clientX - bounds.left - active.offset.x)),
      y: Math.max(0, Math.min(bounds.height - panel.offsetHeight, event.clientY - bounds.top - active.offset.y)),
    })
  }

  return (
    <div className={`shell${visible ? ' shell--app-open' : ''}`} onKeyDown={(event) => {
      if (event.key === 'Escape' && startOpen) {
        setStartOpen(false)
        startButton.current?.focus()
      }
    }}>
      <main className="desktop" ref={desktop}>
        <div className="phone-status"><TaskbarClock /></div>
        <nav className="shortcuts" aria-label="Portfolio apps">
          {apps.map(({ id, label, icon }) => (
            <button key={id} data-app={id} onClick={() => open(id)}>
              {id === 'about' ? (
                <img className="shortcut-picture account-picture" src="/chelsea.jpg" alt="" width="38" height="38" />
              ) : (
                <span className="shortcut-icon" aria-hidden="true">{icon}</span>
              )}
              <span>{label}</span>
            </button>
          ))}
          <LinkedInShortcut />
        </nav>

        {visible && current && (
          <article
            className={`app-window${position ? ' app-window--moved' : ''}`}
            aria-labelledby="window-title"
            ref={window}
            tabIndex={-1}
            style={position ? { left: position.x, top: position.y } : undefined}
          >
            <div className="title-bar" onPointerDown={beginDrag} onPointerMove={moveWindow}
              onLostPointerCapture={() => { drag.current = null }}>
              <button className="phone-back" onClick={close}>‹ Back to menu</button>
              <span id="window-title"><span aria-hidden="true">{current.icon} </span>{current.label}</span>
              <div className="window-controls">
                <button aria-label={`Minimize ${current.label}`} onClick={minimize}>−</button>
                <button aria-label={`Close ${current.label}`} onClick={close}>×</button>
              </div>
            </div>
            <div className={`window-body${current.id === 'about' ? ' window-body--profile' : current.id === 'documents' ? ' window-body--explorer' : ''}`}>
              <AppContent id={current.id} open={open} />
            </div>
          </article>
        )}
      </main>

      {startOpen && (
        <>
          <div className="menu-dismiss" onClick={() => setStartOpen(false)} aria-hidden="true" />
          <nav className="start-menu" id="start-menu" aria-label="Start menu">
            <button className="start-header" ref={startProfileButton} onClick={() => open('about')}>
              <img className="account-picture" src="/chelsea.jpg" alt="" width="44" height="44" />
              <span>Chelsea Simpson</span>
            </button>
            <div className="start-columns">
              <div className="start-column">
                <button onClick={() => open('complaints')}>
                  <span className="start-app-icon" aria-hidden="true">💌</span>
                  Complaints
                </button>
              </div>
              <div className="start-column">
                <button onClick={() => open('documents')}>
                  <span className="start-app-icon" aria-hidden="true">📁</span>
                  My Documents
                </button>
                <LinkedInShortcut onClick={() => {
                  setStartOpen(false)
                  startButton.current?.focus()
                }} />
              </div>
            </div>
          </nav>
        </>
      )}
      <footer className="taskbar">
        <button className="start-button" aria-expanded={startOpen} aria-controls={startOpen ? 'start-menu' : undefined}
          ref={startButton} onClick={() => setStartOpen(!startOpen)}>
          <span className="start-logo" aria-hidden="true">✿</span> Start
        </button>
        {current && (
          <button className="task-button" aria-pressed={!minimized} ref={taskButton}
            onClick={() => minimized ? open(current.id) : minimize()}>
            <span aria-hidden="true">{current.icon} </span>{current.label}
          </button>
        )}
        <TaskbarClock />
      </footer>
    </div>
  )
}
