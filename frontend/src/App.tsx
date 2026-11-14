import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import DesktopWindow from './DesktopWindow'
import PhoneCalendar from './PhoneCalendar'
import { siteDate } from './siteDate'
import ComplaintsForm from './ComplaintsForm'
import ControlPanel from './ControlPanel'
import HelpCenter from './HelpCenter'
import DocumentExplorer, { type DesktopShortcut } from './DocumentExplorer'
import { locations, type FolderId, type SessionFolder } from './explorerLocations'
import credits from './credits.txt?raw'
import './desktop.css'

const shortcuts = [
  { id: 'about', label: 'About Me', icon: '/icons/user-accounts.png' },
  { id: 'computer', label: 'My Computer', icon: '/icons/my-computer.png' },
  { id: 'documents', label: 'My Documents', icon: '/icons/my-documents.png' },
  { id: 'control', label: 'Control Panel', icon: '/icons/control-panel.png' },
] as const

const apps = [
  ...shortcuts,
  { id: 'complaints', label: 'Complaints', icon: '/icons/mail.png' },
  { id: 'help', label: 'Help and Support Center', icon: '/icons/help-and-support.png' },
  { id: 'notepad', label: 'Credits.txt - Notepad', icon: '/icons/document.png' },
] as const

type AppId = (typeof apps)[number]['id']
type WindowEntry = { id: AppId; minimized: boolean; folder?: FolderId; navigation?: number; controlPage?: 'complaints' }

const linkedInUrl = 'https://www.linkedin.com/in/chelsea-simpson-54437215a/'
const desktopShortcuts = [
  ...shortcuts,
  { id: 'network', label: locations.network.name, icon: '/icons/my-network-places.png' },
  { id: 'linkedin', label: 'LinkedIn', icon: '/icons/linkedin.png' },
] as const
type DesktopShortcutId = (typeof desktopShortcuts)[number]['id']

const phoneLayout = '(max-width: 700px) and (pointer: coarse) and (hover: none)'

function subscribeToPhoneLayout(onChange: () => void) {
  const media = globalThis.matchMedia(phoneLayout)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function isPhoneLayout() {
  return globalThis.matchMedia(phoneLayout).matches
}

function LinkedInShortcut({ onClick }: { onClick?: () => void }) {
  return (
    <a
      href={linkedInUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LinkedIn (opens in a new tab)"
      onClick={onClick}
    >
      <img className="linkedin-icon" src="/icons/linkedin.png" alt="" />
      <span>LinkedIn</span>
    </a>
  )
}

function AppContent({ entry, open, close, active, sessionFolders, addFolder, renameFolder, deleteFolder }: {
  entry: WindowEntry
  sessionFolders: SessionFolder[]
  addFolder: (parent: FolderId) => SessionFolder
  renameFolder: (id: FolderId, name: string) => string | undefined
  deleteFolder: (id: FolderId) => void
  open: (id: AppId, folder?: FolderId, controlPage?: 'complaints') => void
  close: () => void
  active: boolean
}) {
  const { id, folder, navigation } = entry
  function launchShortcut(shortcutId: DesktopShortcutId) {
    if (shortcutId === 'linkedin') window.open(linkedInUrl, '_blank', 'noopener,noreferrer')
    else if (shortcutId === 'network') open('computer', 'network')
    else open(shortcutId)
  }

  const explorerShortcuts: DesktopShortcut[] = desktopShortcuts.map(({ id: shortcutId, label, icon }) => ({
    id: shortcutId,
    name: label,
    icon,
    folder: shortcutId === 'computer' || shortcutId === 'documents' || shortcutId === 'network' ? shortcutId : undefined,
    open: () => launchShortcut(shortcutId),
  }))

  switch (id) {
    case 'about':
      return (
        <div className="profile">
          <div className="window-sidebar profile-sidebar">
            <img className="profile-picture account-picture" src="/chelsea.jpg" alt="Chelsea Simpson" width="130" height="130" />
          </div>
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
    case 'computer':
    case 'documents':
      return <DocumentExplorer key={navigation} initialFolder={folder ?? id} desktopShortcuts={explorerShortcuts}
        sessionFolders={sessionFolders} addFolder={addFolder} renameFolder={renameFolder} deleteFolder={deleteFolder}
        openCredits={() => open('notepad')} openControlPanel={() => open('control')} />
    case 'notepad':
      return <pre className="notepad-text">{credits}</pre>
    case 'control':
      return <ControlPanel key={navigation} initialPage={entry.controlPage} openHelp={() => open('help')}
        openFolder={(destination) => open(destination === 'documents' ? 'documents' : 'computer', destination)} />
    case 'help':
      return <HelpCenter openComplaints={() => open('complaints')} openDepartment={() => open('control', undefined, 'complaints')} />
    case 'complaints':
      return <ComplaintsForm onClose={close} active={active} />
  }
}

const taskbarTimeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

const todayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' })

function LocalClock({ showDate = false, compact = false }: { showDate?: boolean; compact?: boolean }) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(new Date()), 1000)
    return () => globalThis.clearInterval(timer)
  }, [])

  const time = showDate ? todayFormat.format(siteDate(now))
    : compact ? taskbarTimeFormat.formatToParts(now)
      .filter(({ type }) => type !== 'dayPeriod')
      .map(({ value }) => value).join('').trim()
    : taskbarTimeFormat.format(now)

  return <span className={showDate ? 'phone-date' : 'taskbar-clock'}>{time}</span>
}

export default function App() {
  const [windows, setWindows] = useState<WindowEntry[]>([{ id: 'about', minimized: false }])
  const [sessionFolders, setSessionFolders] = useState<SessionFolder[]>([])
  const [phoneHome, setPhoneHome] = useState(true)
  const [phonePage, setPhonePage] = useState<'today' | 'programs' | 'calendar'>('today')
  const [startOpen, setStartOpen] = useState(false)
  const desktop = useRef<HTMLElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const phoneStartButton = useRef<HTMLButtonElement>(null)
  const startProfileButton = useRef<HTMLButtonElement>(null)
  const isPhone = useSyncExternalStore(subscribeToPhoneLayout, isPhoneLayout)

  const active = windows.findLast((entry) => !entry.minimized)?.id
  const phoneApp = isPhone && !phoneHome ? active : undefined

  useEffect(() => {
    if (startOpen) startProfileButton.current?.focus()
  }, [startOpen])

  function dismissStart() {
    setStartOpen(false)
    const button = phoneStartButton.current?.getClientRects().length
      ? phoneStartButton.current
      : startButton.current
    button?.focus()
  }

  function activate(id: AppId) {
    setWindows((entries) => {
      const entry = entries.find((item) => item.id === id)
      if (!entry || entry.minimized || entries.at(-1)?.id === id) return entries
      return [...entries.filter((item) => item.id !== id), entry]
    })
  }

  function folderNameExists(parent: FolderId, name: string, except?: FolderId) {
    const normalized = name.toLowerCase()
    if (parent === 'desktop' && desktopShortcuts.some(({ label }) => label.toLowerCase() === normalized)) return true
    return [...Object.entries(locations), ...sessionFolders.map((folder) => [folder.id, folder] as const)]
      .some(([id, folder]) => id !== except && folder.parent === parent && folder.name.toLowerCase() === name.toLowerCase())
      || (parent === 'documents' && ['résumé.pdf', 'credits.txt'].includes(name.toLowerCase()))
  }

  function addFolder(parent: FolderId): SessionFolder {
    let name = 'New Folder'
    for (let number = 2; folderNameExists(parent, name); number += 1) name = 'New Folder (' + number + ')'
    const folder: SessionFolder = { id: ('folder-' + crypto.randomUUID()) as FolderId, name, parent, icon: 'folder' }
    setSessionFolders((current) => [...current, folder])
    return folder
  }

  function renameFolder(id: FolderId, input: string) {
    const folder = sessionFolders.find((entry) => entry.id === id)
    if (!folder) return
    const name = input.trim()
    if (!name || name === '.' || name === '..' || /[\\/:*?"<>|]/.test(name)) return 'Enter a valid folder name.'
    if (folderNameExists(folder.parent, name, id)) return 'A file or folder already has that name.'
    setSessionFolders((current) => current.map((entry) => entry.id === id && entry.name !== name ? { ...entry, name, renamed: true } : entry))
  }

  function deleteFolder(id: FolderId) {
    setSessionFolders((current) => {
      if (!current.some((folder) => folder.id === id)) return current
      const parents = new Map(current.map((folder) => [folder.id, folder.parent]))

      function isDeleted(folder: FolderId): boolean {
        const parent = parents.get(folder)
        return folder === id || (parent !== undefined && isDeleted(parent))
      }

      return current.filter((folder) => !isDeleted(folder.id))
    })
  }

  function open(id: AppId, folder?: FolderId, controlPage?: 'complaints') {
    setWindows((entries) => {
      const existing = entries.find((entry) => entry.id === id)
      const entry = { ...existing, id, minimized: false }
      return [
        ...entries.filter((item) => item.id !== id),
        folder || controlPage ? { ...entry, folder, controlPage, navigation: (entry.navigation ?? 0) + 1 } : entry,
      ]
    })
    setPhoneHome(false)
    setStartOpen(false)
    requestAnimationFrame(() => document.getElementById(`window-${id}`)?.focus())
  }

  function close(id: AppId) {
    setWindows((entries) => entries.filter((entry) => entry.id !== id))
    if (isPhone) {
      setPhoneHome(true)
      setPhonePage('today')
    }
    requestAnimationFrame(() => {
      desktop.current?.querySelector<HTMLButtonElement>(`[data-app="${id}"]`)?.focus()
    })
  }

  function minimize(id: AppId) {
    setWindows((entries) => entries.map((entry) => entry.id === id ? { ...entry, minimized: true } : entry))
    document.getElementById(`task-${id}`)?.focus()
  }

  return (
    <div className={`shell${phoneApp ? ' shell--app-open' : ''}`} onKeyDown={(event) => {
      if (event.key === 'Escape' && startOpen) {
        dismissStart()
      }
    }}>
      <main className="desktop" ref={desktop}>
        <header className="phone-status">
          <button ref={phoneStartButton} aria-expanded={startOpen} aria-controls={startOpen ? 'start-menu' : undefined}
            onClick={() => setStartOpen(!startOpen)}>
            <span className="start-logo" aria-hidden="true"><img src="/icons/start-paw.svg" alt="" width="22" height="22" /></span> Start
          </button>
          <div className="phone-status-indicators">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 2h7L4.5 6 1 2ZM4 6h1v7H4zM7 10h2v4H7zM10 7h2v7h-2zM13 4h2v10h-2z" />
            </svg>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
              <path fill="currentColor" d="M1 6h3l4-4v12l-4-4H1z" />
              <path fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" d="m10.5 5 3-2m-2.5 5h4m-4.5 3 3 2" />
            </svg>
            <LocalClock compact />
          </div>
        </header>
        {isPhone && !phoneApp && phonePage === 'today' && (
          <section className="phone-today" aria-label="Today">
            <LocalClock showDate />
            <button type="button" className="phone-owner" onClick={() => open('about')}>
              <img src="/icons/user-accounts.png" alt="" width="20" height="20" />
              <span>Owner: Chelsea Simpson</span>
            </button>
            <div className="phone-today-row">
              <img src="/icons/mail.png" alt="" width="20" height="20" />
              <span>No unread messages</span>
            </div>
            <button type="button" className="phone-owner" onClick={() => open('help')}>
              <img src="/icons/help-and-support.png" alt="" width="20" height="20" />
              <span>Help and Support Center</span>
            </button>
          </section>
        )}
        <nav className={isPhone ? "phone-programs" : "shortcuts"} hidden={isPhone && (Boolean(phoneApp) || phonePage !== 'programs')}
          aria-label={isPhone ? "Programs" : "Portfolio apps"}>
          {desktopShortcuts.map(({ id, label, icon }) => id === 'linkedin' ? <LinkedInShortcut key={id} /> : (
            <button key={id} data-app={id} onClick={() => {
              if (id === 'network') open('computer', 'network')
              else if (id === 'computer' || id === 'documents') open(id, id)
              else open(id)
            }}>
              <img className="shortcut-icon" src={icon} alt="" />
              <span>{label}</span>
            </button>
          ))}
          {sessionFolders.filter(({ parent }) => parent === 'desktop').map(({ id, name, icon }) => (
            <button key={id} onClick={() => open('computer', id)}>
              <img className="shortcut-icon" src={'/icons/' + icon + '.png'} alt="" />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        {apps.map((app) => {
          const index = windows.findIndex((entry) => entry.id === app.id)
          if (index === -1) return null
          const hidden = windows[index].minimized || (isPhone && phoneApp !== app.id)
          const foreground = !hidden && active === app.id

          return (
            <DesktopWindow key={app.id} id={app.id} title={app.label} icon={app.icon}
              desktop={desktop} depth={index + 1} active={foreground} hidden={hidden}
              onActivate={() => activate(app.id)} onMinimize={() => minimize(app.id)} onClose={() => close(app.id)}>
              <AppContent entry={windows[index]} sessionFolders={sessionFolders}
                addFolder={addFolder} renameFolder={renameFolder} deleteFolder={deleteFolder} open={open} close={() => close(app.id)} active={foreground} />
            </DesktopWindow>
          )
        })}
        {isPhone && !phoneApp && phonePage === 'calendar' && <PhoneCalendar />}
        <footer className="phone-softkeys">
          {phoneApp ? (
            <button onClick={() => close(phoneApp)}>Today</button>
          ) : (
            <button onClick={() => setPhonePage(phonePage === 'today' ? 'calendar' : 'today')}>
              {phonePage === 'today' ? 'Calendar' : 'Today'}
            </button>
          )}
          <LinkedInShortcut />
        </footer>
      </main>

      {startOpen && (
        <>
          <div className="menu-dismiss" onClick={() => setStartOpen(false)} aria-hidden="true" />
          {isPhone ? (
            <nav className="start-menu handheld-start" id="start-menu" aria-label="Start menu">
              <button type="button" ref={startProfileButton} onClick={() => {
                setPhoneHome(true)
                setPhonePage('today')
                dismissStart()
              }}>Today</button>
              <button type="button" onClick={() => {
                setPhoneHome(true)
                setPhonePage('calendar')
                dismissStart()
              }}>Calendar</button>
              <button type="button" onClick={() => open('about')}>
                <img src="/icons/user-accounts.png" alt="" /> About Me
              </button>
              <button type="button" onClick={() => open('documents', 'documents')}>
                <img src="/icons/my-documents.png" alt="" /> My Documents
              </button>
              <LinkedInShortcut onClick={dismissStart} />
              <div className="handheld-start-system">
                <button type="button" onClick={() => {
                  setPhoneHome(true)
                  setPhonePage('programs')
                  dismissStart()
                }}>Programs</button>
                <button type="button" onClick={() => open('control')}>
                  <img src="/icons/control-panel.png" alt="" /> Control Panel
                </button>
                <button type="button" onClick={() => open('help')}>
                  <img src="/icons/help-and-support.png" alt="" /> Help and Support Center
                </button>
              </div>
            </nav>
          ) : (
          <nav className="start-menu" id="start-menu" aria-label="Start menu">
            <button className="start-header" ref={startProfileButton} onClick={() => open('about')}>
              <img className="account-picture" src="/chelsea.jpg" alt="" width="44" height="44" />
              <span>Chelsea Simpson</span>
            </button>
            <div className="start-columns">
              <div className="start-column">
                <LinkedInShortcut onClick={dismissStart} />
              </div>
              <div className="start-column start-system-column">
                <div className="start-folder-links">
                  {(['documents', 'pictures', 'music', 'computer'] as const).map((id) => (
                    <button key={id} onClick={() => open(id === 'computer' ? 'computer' : 'documents', id)}>
                      <img className="start-app-icon" src={'/icons/' + locations[id].icon + '.png'} alt="" />
                      {locations[id].name}
                    </button>
                  ))}
                </div>
                <div className="start-system-group">
                  <button onClick={() => open('control')}>
                    <img className="start-app-icon" src="/icons/control-panel.png" alt="" />
                    Control Panel
                  </button>
                </div>
                <div className="start-system-group">
                  <button onClick={() => open('help')}>
                    <img className="start-app-icon" src="/icons/help-and-support.png" alt="" />
                    Help and Support Center
                  </button>
                </div>
              </div>
            </div>
          </nav>
          )}
        </>
      )}
      <footer className="taskbar">
        <button className="start-button" aria-expanded={startOpen} aria-controls={startOpen ? 'start-menu' : undefined}
          ref={startButton} onClick={() => setStartOpen(!startOpen)}>
          <span className="start-logo" aria-hidden="true"><img src="/icons/start-paw.svg" alt="" width="22" height="22" /></span> Start
        </button>
        {apps.filter((app) => windows.some((entry) => entry.id === app.id)).map((app) => (
          <button key={app.id} id={`task-${app.id}`} className="task-button"
            aria-pressed={active === app.id} aria-controls={`window-${app.id}`}
            onClick={() => active === app.id ? minimize(app.id) : open(app.id)}>
            <img className="window-icon" src={app.icon} alt="" /><span>{app.label}</span>
          </button>
        ))}
        <LocalClock />
      </footer>
    </div>
  )
}
