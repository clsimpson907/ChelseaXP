import BlueScreen from './BlueScreen'
import { dragItem, dropItem } from './explorerDrag'
import { moveItem, recycleFolder, restoreFolder, touchFolderPath, type FolderState, type SessionFile } from './recycleFolders'
import { reviewReturnKey } from './ComplaintReview'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import DesktopWindow from './DesktopWindow'
import PhoneCalendar from './PhoneCalendar'
import { siteDate } from './siteDate'
import ComplaintsForm from './ComplaintsForm'
import ControlPanel from './ControlPanel'
import HelpCenter from './HelpCenter'
import DocumentExplorer, { type DesktopItem } from './DocumentExplorer'
import { locations, fixedLocations, movableLocations, premadeModifiedAt, type FolderId, type SessionFolder } from './explorerLocations'
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
type WindowEntry = { id: AppId; instance: number; caption?: string; minimized: boolean; folder?: FolderId; navigation?: number; controlPage?: 'complaints'; helpTopic?: string }

let nextWindowInstance = 2

const linkedInUrl = 'https://www.linkedin.com/in/chelsea-simpson-54437215a/'
const desktopShortcuts = [
  ...shortcuts,
  { id: 'network', label: locations.network.name, icon: '/icons/my-network-places.png' },
  { id: 'linkedin', label: 'LinkedIn', icon: '/icons/linkedin.png' },
] as const
type DesktopShortcutId = (typeof desktopShortcuts)[number]['id']

const startingDesktop = [
  shortcuts[0],
  { id: 'linkedin', label: 'LinkedIn', icon: '/icons/linkedin.png' },
  { id: 'recycle', label: locations.recycle.name, icon: '/icons/recycle-bin.png' },
] as const

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

function AppContent({ entry, setCaption, open, close, active, desktopItems, sessionFolders, sessionFiles, move, locationDates, addFolder, renameFolder, deleteFolder, recycleBin }: {
  entry: WindowEntry
  desktopItems: DesktopItem[]
  setCaption: (instance: number, caption: string) => void
  sessionFolders: SessionFolder[]
  sessionFiles: SessionFile[]
  move: (id: string, parent: FolderId, now: number) => void
  locationDates: FolderState['locationDates']
  addFolder: (parent: FolderId) => SessionFolder
  renameFolder: (id: FolderId, name: string) => string | undefined
  deleteFolder: (id: string, now: number) => void
  recycleBin: {
    trash: FolderState['trash']
    restore: (id: string) => void
    restoreAll: () => void
    empty: () => void
    hidingComplaints: boolean
  }
  open: (id: AppId, folder?: FolderId, controlPage?: 'complaints', helpTopic?: string) => void
  close: () => void
  active: boolean
}) {
  const { id, folder, navigation, instance } = entry
  const updateCaption = useCallback((caption: string) => setCaption(instance, caption), [instance, setCaption])
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
      return <DocumentExplorer onCaptionChange={updateCaption} key={navigation} initialFolder={folder ?? id} desktopItems={desktopItems}
        sessionFolders={sessionFolders} sessionFiles={sessionFiles} move={move} locationDates={locationDates} addFolder={addFolder} renameFolder={renameFolder} deleteFolder={deleteFolder} recycleBin={recycleBin}
        openCredits={() => open('notepad')} openControlPanel={() => open('control')} />
    case 'notepad':
      return <pre className="notepad-text">{credits}</pre>
    case 'control':
      return <ControlPanel active={active} onCaptionChange={updateCaption} key={navigation} initialPage={entry.controlPage} openHelp={() => open('help')}
        openFolder={(destination) => open(destination === 'documents' ? 'documents' : 'computer', destination)} />
    case 'help':
      return <HelpCenter onCaptionChange={updateCaption} key={navigation} initialTopic={entry.helpTopic} openComplaints={() => open('complaints')} openDepartment={() => open('control', undefined, 'complaints')} />
    case 'complaints':
      return <ComplaintsForm onClose={close} active={active} openPrivacy={() => open('help', undefined, undefined, 'Complaint privacy notice')} />
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

  return (
    <span className={showDate ? 'phone-date' : 'taskbar-clock'}>
      {time}
      {!showDate && !compact && <span className="taskbar-date-tooltip">{todayFormat.format(siteDate(now))}</span>}
    </span>
  )
}

export default function App() {
  const [crashed, setCrashed] = useState(false)

  if (crashed) return <BlueScreen
    message="An error has occurred. ChelseaXP could not continue."
    explanation="The ChelseaXP system folder was deleted. Your desktop will restart."
    code="0006 : CHELSEAXP_SYSTEM_FOLDER_DELETED"
    onContinue={() => setCrashed(false)} />

  return <DesktopSession crash={() => setCrashed(true)} />
}

function DesktopSession({ crash }: { crash: () => void }) {
  const [returningToReview] = useState(() => sessionStorage.getItem(reviewReturnKey) !== null)
  const [windows, setWindows] = useState<WindowEntry[]>(() => returningToReview
    ? [{ id: 'about', instance: 0, minimized: false }, { id: 'control', instance: 1, minimized: false, controlPage: 'complaints' }]
    : [{ id: 'about', instance: 0, minimized: false }])
  const [{ folders: sessionFolders, files: sessionFiles, trash, locationDates }, setFolderState] = useState<FolderState>({ folders: movableLocations.map((id) => ({ id, ...locations[id], modifiedAt: premadeModifiedAt })), files: [{ id: 'credits', name: 'Credits.txt', parent: 'documents', icon: 'document', modifiedAt: premadeModifiedAt }], trash: [], locationDates: {} })
  const [hidingComplaints, setHidingComplaints] = useState(false)
  useEffect(() => {
    if (!hidingComplaints) return
    const timer = window.setTimeout(() => setHidingComplaints(false), 1000)
    return () => window.clearTimeout(timer)
  }, [hidingComplaints])

  const recycleBin = {
    trash,
    restore: (id: string) => {
      const now = Date.now()
      setFolderState((state) => restoreFolder(state, id, now))
    },
    restoreAll: () => {
      const now = Date.now()
      setFolderState((state) => state.trash.reduceRight(
        (current, { root }) => restoreFolder(current, root.id, now), state,
      ))
      setHidingComplaints(true)
    },
    empty: () => {
      setFolderState((state) => ({ ...state, trash: [] }))
      setHidingComplaints(true)
    },
    hidingComplaints,
  }
  const [phoneHome, setPhoneHome] = useState(!returningToReview)
  const [phonePage, setPhonePage] = useState<'today' | 'programs' | 'calendar'>('today')
  const [startOpen, setStartOpen] = useState(false)
  const [selectedShortcut, setSelectedShortcut] = useState<string | null>(null)
  const desktop = useRef<HTMLElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const phoneStartButton = useRef<HTMLButtonElement>(null)
  const startProfileButton = useRef<HTMLButtonElement>(null)
  const isPhone = useSyncExternalStore(subscribeToPhoneLayout, isPhoneLayout)

  const active = windows.findLast((entry) => !entry.minimized)?.instance
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

  function activate(instance: number) {
    setWindows((entries) => {
      const entry = entries.find((item) => item.instance === instance)
      if (!entry || entry.minimized || entries.at(-1)?.instance === instance) return entries
      return [...entries.filter((item) => item.instance !== instance), entry]
    })
  }

  function folderNameExists(parent: FolderId, name: string, except?: FolderId) {
    const normalized = name.toLowerCase()
    if (parent === 'desktop' && startingDesktop.some(({ label }) => label.toLowerCase() === normalized)) return true
    return [...Object.entries(fixedLocations), ...sessionFolders.map((folder) => [folder.id, folder] as const)]
      .some(([id, folder]) => id !== except && folder.parent === parent && folder.name.toLowerCase() === name.toLowerCase())
      || sessionFiles.some((file) => file.parent === parent && file.name.toLowerCase() === normalized)
  }

  function addFolder(parent: FolderId): SessionFolder {
    let name = 'New Folder'
    for (let number = 2; folderNameExists(parent, name); number += 1) name = 'New Folder (' + number + ')'
    const folder: SessionFolder = { id: ('folder-' + crypto.randomUUID()) as FolderId, name, parent, icon: 'folder', modifiedAt: Date.now() }
    setFolderState((state) => touchFolderPath({ ...state, folders: [...state.folders, folder] }, folder.id, folder.modifiedAt))
    return folder
  }

  function renameFolder(id: FolderId, input: string) {
    const folder = sessionFolders.find((entry) => entry.id === id)
    if (!folder) return
    const name = input.trim()
    if (!name || name === '.' || name === '..' || /[\\/:*?"<>|]/.test(name)) return 'Enter a valid folder name.'
    if (folderNameExists(folder.parent, name, id)) return 'A file or folder already has that name.'
    if (folder.name === name) return
    const now = Date.now()
    setFolderState((state) => touchFolderPath({ ...state, folders: state.folders
      .map((entry) => entry.id === id ? { ...entry, name, renamed: true } : entry) }, id, now))
  }

  function deleteFolder(id: string, now: number) {
    if (id === 'chelseaxp-system') {
      crash()
      return
    }
    setFolderState((state) => recycleFolder(state, id, now))
  }

  function move(id: string, parent: FolderId, now: number) {
    if (parent === 'desktop' && startingDesktop.some(({ label }) =>
      [...sessionFolders, ...sessionFiles].some((item) => item.id === id && item.name.toLowerCase() === label.toLowerCase()))) return
    setFolderState((state) => moveItem(state, id, parent, now))
  }

  function shortcutActivation(id: string, launch: () => void) {
    return {
      'data-selected': !isPhone && selectedShortcut === id,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!isPhone) setSelectedShortcut(id)
        if (isPhone || event.detail === 0) launch()
      },
      onDoubleClick: () => { if (!isPhone) launch() },
    }
  }

  function open(id: AppId, folder?: FolderId, controlPage?: 'complaints', helpTopic?: string) {
    const destinationId = folder ?? (id === 'documents' ? 'documents' : undefined)
    if (destinationId && !Object.hasOwn(fixedLocations, destinationId) &&
      !sessionFolders.some((item) => item.id === destinationId)) return
    const existing = isPhone ? windows.findLast((entry) => entry.id === id) : undefined
    const instance = existing?.instance ?? nextWindowInstance++
    const entry = { ...existing, id, instance, minimized: false }
    const destination = folder || controlPage || helpTopic
      ? { ...entry, folder, controlPage, helpTopic, caption: undefined, navigation: (entry.navigation ?? 0) + 1 }
      : entry
    setWindows((entries) => [...entries.filter((item) => item.instance !== instance), destination])
    setPhoneHome(false)
    setStartOpen(false)
    focusWindow(instance)
  }

  function focusWindow(instance: number) {
    requestAnimationFrame(() => document.getElementById(`window-${instance}`)?.focus())
  }

  function close(instance: number) {
    const id = windows.find((entry) => entry.instance === instance)?.id
    setWindows((entries) => entries.filter((entry) => entry.instance !== instance))
    if (isPhone) {
      setPhoneHome(true)
      setPhonePage('today')
    }
    requestAnimationFrame(() => {
      desktop.current?.querySelector<HTMLButtonElement>(`[data-app="${id}"]`)?.focus()
    })
  }

  function minimize(instance: number) {
    setWindows((entries) => entries.map((entry) => entry.instance === instance ? { ...entry, minimized: true } : entry))
    document.getElementById(`task-${instance}`)?.focus()
  }

  const setCaption = useCallback((instance: number, caption: string) => {
    setWindows((entries) => entries.map((entry) => entry.instance === instance ? { ...entry, caption } : entry))
  }, [])

  function restore(entry: WindowEntry) {
    setWindows((entries) => [...entries.filter((item) => item.instance !== entry.instance), { ...entry, minimized: false }])
    focusWindow(entry.instance)
  }

  function launchShortcut(id: DesktopShortcutId | 'recycle') {
    if (id === 'linkedin') window.open(linkedInUrl, '_blank', 'noopener,noreferrer')
    else if (id === 'network' || id === 'recycle') open('computer', id)
    else open(id)
  }

  const desktopItems: DesktopItem[] = [
    ...startingDesktop.map(({ id, label, icon }) => ({
      id, name: label, icon, type: id === 'recycle' ? 'System Folder' : 'Shortcut',
      folder: id === 'recycle' ? id : undefined, open: () => launchShortcut(id),
    })),
    ...sessionFiles.filter(({ parent }) => parent === 'desktop').map((file) => ({
      ...file, type: 'Text document', movable: true, open: () => open('notepad'),
    })),
    ...sessionFolders.filter(({ parent }) => parent === 'desktop').map((folder) => ({
      ...folder, type: 'File Folder', movable: true, folder: folder.id,
      open: () => open('computer', folder.id),
    })),
  ]

  return (
    <div className={`shell${phoneApp !== undefined ? ' shell--app-open' : ''}`} onPointerDown={(event) => {
      if (!isPhone && !(event.target as Element).closest('.shortcuts > button')) setSelectedShortcut(null)
    }} onKeyDown={(event) => {
      if (event.key === 'Escape' && startOpen) {
        dismissStart()
      }
    }}>
      <main className="desktop" ref={desktop}
        onDragOver={(event) => { if (!isPhone && !(event.target as Element).closest('.app-window, button')) dropItem('desktop', move).onDragOver(event) }}
        onDrop={(event) => { if (!isPhone && !(event.target as Element).closest('.app-window, button')) dropItem('desktop', move).onDrop(event) }}>
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
        {isPhone && phoneApp === undefined && phonePage === 'today' && (
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
        <nav className={isPhone ? "phone-programs" : "shortcuts"} hidden={isPhone && (phoneApp !== undefined || phonePage !== 'programs')}
          aria-label={isPhone ? "Programs" : "Portfolio apps"}>
          {isPhone && desktopShortcuts.map(({ id, label, icon }) => id === 'linkedin' ? <LinkedInShortcut key={id} /> : (
            <button key={id} data-app={id} {...shortcutActivation(id, () => launchShortcut(id))}>
              <img className="shortcut-icon" src={icon} alt="" />
              <span>{label}</span>
            </button>
          ))}
          {desktopItems.filter(({ id }) => !isPhone || (id !== 'about' && id !== 'linkedin')).map((item) => (
            <button key={item.id} data-app={item.id} {...shortcutActivation(item.id, item.open)}
              {...(item.movable ? dragItem(item.id) : {})}
              {...(item.movable && item.folder ? dropItem(item.folder, move) : {})}
              onKeyDown={(event) => {
                if (event.key === 'Delete' && selectedShortcut === item.id && item.movable && !item.folder) {
                  event.preventDefault()
                  deleteFolder(item.id, Date.now())
                  setSelectedShortcut(null)
                }
              }}>
              <img className="shortcut-icon" src={item.icon.startsWith('/') ? item.icon : '/icons/' + item.icon + '.png'} alt="" />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        {windows.map((entry, index) => {
          const app = apps.find(({ id }) => id === entry.id)!
          const { instance } = entry
          const hidden = entry.minimized || (isPhone && phoneApp !== instance)
          const foreground = !hidden && active === instance

          return (
            <DesktopWindow key={instance} instance={instance} id={app.id} title={entry.caption ?? app.label} icon={app.icon}
              desktop={desktop} depth={index + 1} active={foreground} hidden={hidden}
              onActivate={() => activate(instance)} onMinimize={() => minimize(instance)} onClose={() => close(instance)}>
              <AppContent entry={entry} desktopItems={desktopItems} sessionFolders={sessionFolders} sessionFiles={sessionFiles} move={move} locationDates={locationDates}
                setCaption={setCaption}
                addFolder={addFolder} renameFolder={renameFolder} deleteFolder={deleteFolder} recycleBin={recycleBin} open={open} close={() => close(instance)} active={foreground} />
            </DesktopWindow>
          )
        })}
        {isPhone && phoneApp === undefined && phonePage === 'calendar' && <PhoneCalendar />}
        <footer className="phone-softkeys" id="phone-softkeys">
          {phoneApp !== undefined ? (
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
                  {(['documents', 'pictures', 'music', 'computer'] as const).filter((id) => id === 'computer' || sessionFolders.some((folder) => folder.id === id)).map((id) => (
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
          ref={startButton}
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse' && event.button === 0) {
              event.preventDefault()
              setStartOpen((open) => !open)
            }
          }}
          onClick={(event) => {
            if (event.detail === 0 || (event.nativeEvent as PointerEvent).pointerType !== 'mouse') {
              setStartOpen((open) => !open)
            }
          }}>
          <span className="start-logo" aria-hidden="true"><img src="/icons/start-paw.svg" alt="" width="22" height="22" /></span> Start
        </button>
        {windows.toSorted((left, right) => left.instance - right.instance).map((entry) => {
          const app = apps.find(({ id }) => id === entry.id)!
          const { instance } = entry
          return (
            <button key={instance} id={`task-${instance}`} className="task-button"
              aria-pressed={active === instance} aria-controls={`window-${instance}`}
              onClick={() => active === instance ? minimize(instance) : restore(entry)}>
              <img className="window-icon" src={app.icon} alt="" /><span>{entry.caption ?? app.label}</span>
            </button>
          )
        })}
        <LocalClock />
      </footer>
    </div>
  )
}
