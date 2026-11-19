import { refreshPublishedCopies } from './publishedComplaints'
import RunDialog from './RunDialog'
import { rememberRunEntry, type RunTarget } from './runEntries'
import ExplorerItemDialog from './ExplorerItemDialog'
import BlueScreen from './BlueScreen'
import ForkBomb from './ForkBomb'
import { dragItem, dropItem } from './explorerDrag'
import { deleteConfirmationIcon, favoriteShortcutId, favoriteTargetId, getDragActions, getFavoriteTarget, moveItem, recycleFolder, restoreFolder, touchFolderPath, type ExplorerFavorites, type FolderState, type SessionFile } from './recycleFolders'
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

function isExplorerApp(id: string) {
  return id === 'computer' || id === 'documents'
}
type WindowEntry = { id: AppId; instance: number; caption?: string; icon?: string; minimized: boolean; folder?: FolderId; navigation?: number; controlPage?: 'complaints'; helpTopic?: string; search?: boolean }

let nextWindowInstance = 2

const linkedInUrl = 'https://www.linkedin.com/in/chelsea-simpson-54437215a/'
const desktopShortcuts = [
  ...shortcuts,
  { id: 'network', label: locations.network.name, icon: '/icons/my-network-places.png' },
  { id: 'linkedin', label: 'LinkedIn', icon: '/icons/linkedin.png' },
] as const
type DesktopShortcutId = (typeof desktopShortcuts)[number]['id']

const initialFiles: SessionFile[] = [
  { id: 'forkbomb', name: 'forkbomb.exe', icon: 'application-window', parent: 'downloads', type: 'Application', modifiedAt: premadeModifiedAt },
  { id: 'about', name: shortcuts[0].label, icon: shortcuts[0].icon, parent: 'desktop', type: 'Application', modifiedAt: premadeModifiedAt },
  { id: 'linkedin', name: 'LinkedIn', icon: '/icons/linkedin.png', parent: 'desktop', type: 'Internet link', modifiedAt: premadeModifiedAt },
  { id: 'credits', name: 'Credits.txt', icon: 'document', parent: 'documents', type: 'Text document', modifiedAt: premadeModifiedAt },
]

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

function AppContent({ entry, selection, setSelection, setCaption, open, close, active, explorerAvailable, desktopItems, sessionFolders, sessionFiles, openFile, move, locationDates, addFolder, renameFolder, deleteFolder, recycleBin, favorites, drag }: {
  entry: WindowEntry
  selection: string | null
  setSelection: (id: string | null) => void
  desktopItems: DesktopItem[]
  drag: (id: string) => ReturnType<typeof dragItem>
  favorites: ExplorerFavorites
  setCaption: (instance: number, caption: string, icon?: string) => void
  sessionFolders: SessionFolder[]
  sessionFiles: SessionFile[]
  openFile: (id: SessionFile['id']) => void
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
  explorerAvailable: boolean
}) {
  const { id, folder, navigation, instance } = entry
  const updateCaption = useCallback((caption: string, icon?: string) => setCaption(instance, caption, icon), [instance, setCaption])
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
            <div className="profile-details">
              <section>
                <h2>About ChelseaXP</h2>
                <p>I don't know what you're doing on my computer from 2006, but please try not to make a mess or break anything! Just kidding, this is my Windows XP tribute/parody site. I'm very fond of the Windows XP/98 era of tech. The internet felt like it was so full of possibilities, and personal computers felt like their own magical micro-universe. I'm trying to capture some of that feeling bit by bit. Please take a look around and make yourself at home.</p>
              </section>
              <section>
                <h2>About me</h2>
                <p>I’m Chelsea. I like tinkering with old computers, playing games that eat up an entire afternoon, and bothering my cat Birby. Lately I've been keeping a Magic 8 Ball in my bag in case I need reassurance. It always agrees with me as long as I shake it enough times.</p>
              </section>
            </div>
            <div className="profile-actions">
              {explorerAvailable && <button onClick={() => open('documents')}>Open My Documents →</button>}
            </div>
          </div>
        </div>
      )
    case 'computer':
    case 'documents':
      return <DocumentExplorer active={active} onCaptionChange={updateCaption} selection={selection} setSelection={setSelection} key={navigation} favorites={favorites} initialFolder={folder ?? id} initialSearch={entry.search} desktopItems={desktopItems} drag={drag}
        sessionFolders={sessionFolders} sessionFiles={sessionFiles} openFile={openFile} move={move} locationDates={locationDates} addFolder={addFolder} renameFolder={renameFolder} deleteFolder={deleteFolder} recycleBin={recycleBin}
        openHelp={() => open('help')} openControlPanel={() => open('control')} />
    case 'notepad':
      return <pre className="notepad-text">{credits}</pre>
    case 'control':
      return <ControlPanel onClose={close} active={active} onCaptionChange={updateCaption} key={navigation} initialPage={entry.controlPage} openHelp={() => open('help')}
        favoriteCommands={explorerAvailable ? favorites.items.map((target) => ({
          label: target.name, action: () => favorites.open(target, (folder) => open('computer', folder)),
        })) : []}
        openFolder={explorerAvailable ? (destination) => open(destination === 'documents' ? 'documents' : 'computer', destination) : undefined} />
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
  useEffect(() => {
    void refreshPublishedCopies().catch(() => {})
  }, [])

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
  const [folderState, setFolderState] = useState<FolderState>(() => ({
    folders: movableLocations.map((id) => ({ id, ...locations[id], modifiedAt: premadeModifiedAt })),
    files: initialFiles,
    trash: [],
    locationDates: {},
    favorites: [
      { id: 'documents', folder: 'documents', name: locations.documents.name, icon: locations.documents.icon },
      ...initialFiles.filter(({ id }) => id === 'about' || id === 'credits').map(({ id, name, icon }) => ({ id, name, icon })),
    ],
  }))
  const { folders: sessionFolders, files: sessionFiles, trash, locationDates } = folderState
  const [pendingRecycle, setPendingRecycle] = useState<string | null>(null)
  const [brokenShortcut, setBrokenShortcut] = useState<string | null>(null)
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  function addFavorite(id: string, now: number) {
    setFolderState((state) => {
      const target = getFavoriteTarget(state, id)
      if (!target || state.favorites.some((favorite) => favorite.id === id)) return state
      return touchFolderPath({ ...state, favorites: [...state.favorites, target] }, 'favorites', now)
    })
  }

  const favorites: ExplorerFavorites = {
    items: folderState.favorites.map((favorite) => getFavoriteTarget(folderState, favorite.id) ??
      { ...favorite, broken: true, icon: deleteConfirmationIcon }),
    open: (target, openFolder) => {
      if (target.broken) setBrokenShortcut(target.name)
      else if (target.folder) openFolder(target.folder)
      else {
        const file = sessionFiles.find(({ id }) => id === target.id)
        if (file) openFile(file.id)
      }
    },
    copy: setCopiedItem,
    clipboardReady: Boolean(copiedItem && getFavoriteTarget(folderState, copiedItem)),
    paste: (now: number) => { if (copiedItem) addFavorite(copiedItem, now) },
  }
  const recycleTarget = sessionFolders.find(({ id }) => id === pendingRecycle) ?? sessionFiles.find(({ id }) => id === pendingRecycle)
    ?? favorites.items.map((item) => ({ ...item, id: favoriteShortcutId(item.id), shortcut: true }))
      .find(({ id }) => id === pendingRecycle)

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
  const [runOpen, setRunOpen] = useState(false)
  const [recentRunEntries, setRecentRunEntries] = useState<string[]>([])
  const [recentRunDocuments, setRecentRunDocuments] = useState<string[]>([])
  const [forkBombOpen, setForkBombOpen] = useState(false)
  const [explorerSelection, setExplorerSelection] = useState<{ owner: string; id: string } | null>(null)
  const [selectedShortcut, setSelectedShortcut] = useState<string | null>(null)
  const desktop = useRef<HTMLElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const phoneStartButton = useRef<HTMLButtonElement>(null)
  const startProfileButton = useRef<HTMLButtonElement>(null)
  const isPhone = useSyncExternalStore(subscribeToPhoneLayout, isPhoneLayout)

  const availableWindows = isPhone ? windows.filter(({ id }) => !isExplorerApp(id)) : windows
  const active = availableWindows.findLast((entry) => !entry.minimized)?.instance
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

  function drag(id: string) {
    return dragItem(id, getDragActions(folderState, id))
  }

  function move(id: string, parent: FolderId, now: number) {
    if (parent === 'recycle') {
      if (getDragActions(folderState, id).recyclable) setPendingRecycle(id)
      return
    }
    if (parent === 'favorites') {
      addFavorite(favoriteTargetId(folderState, id), now)
      return
    }
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

  function open(id: AppId, folder?: FolderId, controlPage?: 'complaints', helpTopic?: string, search?: boolean) {
    if (isPhone && isExplorerApp(id)) return
    const destinationId = folder ?? (id === 'documents' ? 'documents' : undefined)
    if (destinationId && !Object.hasOwn(fixedLocations, destinationId) &&
      !sessionFolders.some((item) => item.id === destinationId)) return
    const existing = isPhone ? windows.findLast((entry) => entry.id === id) : undefined
    const instance = existing?.instance ?? nextWindowInstance++
    const entry = { ...existing, id, instance, minimized: false }
    const destination = folder || controlPage || helpTopic || search
      ? { ...entry, folder, controlPage, helpTopic, search, caption: undefined, icon: undefined, navigation: (entry.navigation ?? 0) + 1 }
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

  const setCaption = useCallback((instance: number, caption: string, icon?: string) => {
    setWindows((entries) => entries.map((entry) => entry.instance === instance ? { ...entry, caption, icon } : entry))
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

  function openFile(id: SessionFile['id']) {
    if (id === 'credits') open('notepad')
    else if (id === 'forkbomb') setForkBombOpen(true)
    else launchShortcut(id)
  }

  function openSearch() {
    open('computer', 'computer', undefined, undefined, true)
  }

  function runTargets(): RunTarget[] {
    const folders: Partial<Record<FolderId, { name: string; parent: FolderId | null; icon: string }>> = {
      ...fixedLocations, ...Object.fromEntries(sessionFolders.map((folder) => [folder.id, folder])),
    }
    function pathTo(id: FolderId): string {
      const folder = folders[id]
      if (!folder) return ''
      if (id === 'disk') return 'C:'
      if (!folder.parent) return folder.name
      return pathTo(folder.parent) + '\\' + folder.name
    }

    return [
      ...apps.filter(({ id }) => id !== 'notepad' && id !== 'about' && id !== 'computer' && id !== 'documents')
        .map(({ id, label, icon }) => ({ name: id === 'complaints' ? 'Complaints.exe' : label, kind: 'program' as const, icon, open: () => open(id) })),
      ...Object.entries(folders).flatMap(([key, folder]) => {
        const id = key as FolderId
        if (!folder || id === 'birby' || id === 'chelseaxp-system') return []
        return [{ name: folder.name, kind: 'folder' as const, path: pathTo(id), location: id, parent: folder.parent, icon: folder.icon, open: () => open('computer', id) }]
      }),
      ...sessionFiles.map(({ id, name, icon, parent, type }) => ({
        name, kind: type === 'Application' ? 'program' as const : 'file' as const,
        path: pathTo(parent) + '\\' + name, parent, icon, open: () => openFile(id),
      })),
    ]
  }

  const startSearchAndRun = <>
    {!isPhone && <button type="button" onClick={openSearch}>
      <img className="start-app-icon" src="/icons/start-search.png" alt="" /> Search
    </button>}
    <button type="button" onClick={() => {
      setStartOpen(false)
      setRunOpen(true)
    }}>
      <img className="start-app-icon" src="/icons/run.png" alt="" /> Run…
    </button>
  </>

  const desktopFiles = sessionFiles.filter(({ parent }) => parent === 'desktop').map((file) => ({
    ...file, movable: true, open: () => openFile(file.id),
  }))
  const desktopItems: DesktopItem[] = [
    ...desktopFiles.filter(({ id }) => id !== 'credits'),
    { id: 'recycle', name: locations.recycle.name, icon: '/icons/recycle-bin.png',
      type: 'System Folder', folder: 'recycle', open: () => launchShortcut('recycle') },
    ...desktopFiles.filter(({ id }) => id === 'credits'),
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
      {runOpen && <RunDialog targets={runTargets().filter(({ kind }) => !isPhone || kind === 'program')}
        recent={recentRunEntries} recentDocuments={recentRunDocuments}
        onCreateFolder={isPhone ? undefined : (parent) => addFolder(parent).id}
        onClose={() => {
          setRunOpen(false)
          requestAnimationFrame(() => (isPhone ? phoneStartButton : startButton).current?.focus())
        }}
        onHelp={() => {
          setRunOpen(false)
          open('help', undefined, undefined, 'Using Run')
        }}
        onRun={(target, command) => {
          if (target.kind === 'program') setRecentRunEntries((recent) => rememberRunEntry(recent, command))
          else if (target.kind === 'file') setRecentRunDocuments((recent) => rememberRunEntry(recent, command))
          setRunOpen(false)
          target.open()
        }} />}
      {forkBombOpen && <ForkBomb onContinue={() => setForkBombOpen(false)} />}
      {brokenShortcut && <BlueScreen
        message="An error has occurred. The shortcut could not be opened."
        explanation={`“${brokenShortcut}” points to an item that is no longer available.`}
        code="0016 : SHORTCUT_TARGET_MISSING" onContinue={() => setBrokenShortcut(null)} />}
      {recycleTarget && <ExplorerItemDialog name={recycleTarget.name} isFolder={!('shortcut' in recycleTarget) && !('type' in recycleTarget)}
        onCancel={() => setPendingRecycle(null)}
        onConfirm={(event) => {
          deleteFolder(recycleTarget.id, Math.round(performance.timeOrigin + event.timeStamp))
          setSelectedShortcut(null)
          setPendingRecycle(null)
        }} />}
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
              <span>Help and Support</span>
            </button>
          </section>
        )}
        <nav className={isPhone ? "phone-programs" : "shortcuts"} hidden={isPhone && (phoneApp !== undefined || phonePage !== 'programs')}
          aria-label={isPhone ? "Programs" : "Portfolio apps"}>
          {isPhone && desktopShortcuts.filter(({ id }) => !isExplorerApp(id) && id !== 'network').map(({ id, label, icon }) => id === 'linkedin' ? <LinkedInShortcut key={id} /> : (
            <button key={id} data-app={id} {...shortcutActivation(id, () => launchShortcut(id))}>
              <img className="shortcut-icon" src={icon} alt="" />
              <span>{label}</span>
            </button>
          ))}
          {(!isPhone ? desktopItems : []).map((item) => (
            <button key={item.id} data-app={item.id} {...shortcutActivation(item.id, item.open)}
              {...drag(item.id)}
              {...(item.folder ? dropItem(item.folder, move) : {})}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' &&
                    getFavoriteTarget(folderState, item.id)) {
                  event.preventDefault()
                  favorites.copy(item.id)
                }
                if (event.key === 'Delete' && selectedShortcut === item.id && (item.movable || item.recyclable)) {
                  event.preventDefault()
                  setPendingRecycle(item.id)
                }
              }}>
              <img className="shortcut-icon" src={item.icon.startsWith('/') ? item.icon : '/icons/' + item.icon + '.png'} alt="" />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        {availableWindows.map((entry, index) => ({ entry, depth: index + 1 }))
          .sort((first, second) => first.entry.instance - second.entry.instance).map(({ entry, depth }) => {
          const app = apps.find(({ id }) => id === entry.id)!
          const { instance } = entry
          const hidden = entry.minimized || (isPhone && phoneApp !== instance)
          const foreground = !hidden && active === instance
          const selectionOwner = `${instance}:${entry.navigation ?? 0}`

          return (
            <DesktopWindow key={instance} instance={instance} id={app.id} title={entry.caption ?? app.label} icon={entry.icon ?? app.icon}
              desktop={desktop} depth={depth} active={foreground} hidden={hidden}
              onActivate={() => activate(instance)} onMinimize={() => minimize(instance)} onClose={() => close(instance)}>
              <AppContent entry={entry} explorerAvailable={!isPhone} selection={explorerSelection?.owner === selectionOwner ? explorerSelection.id : null}
                setSelection={(id) => setExplorerSelection((current) => {
                  if (id !== null) return { owner: selectionOwner, id }
                  return current?.owner === selectionOwner ? null : current
                })} favorites={favorites} drag={drag} desktopItems={desktopItems} sessionFolders={sessionFolders} sessionFiles={sessionFiles} openFile={openFile} move={move} locationDates={locationDates}
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
              }}>
                <img src="/icons/desktop.png" alt="" /> Today
              </button>
              <button type="button" onClick={() => {
                setPhoneHome(true)
                setPhonePage('calendar')
                dismissStart()
              }}>
                <img src="/icons/date-and-time.png" alt="" /> Calendar
              </button>
              <button type="button" onClick={() => open('about')}>
                <img src="/icons/user-accounts.png" alt="" /> About Me
              </button>
              <LinkedInShortcut onClick={dismissStart} />
              <div className="handheld-start-system">
                <button type="button" onClick={() => {
                  setPhoneHome(true)
                  setPhonePage('programs')
                  dismissStart()
                }}>
                  <img src="/icons/start-menu-programs.png" alt="" /> Programs
                </button>
                <button type="button" onClick={() => open('control')}>
                  <img src="/icons/control-panel.png" alt="" /> Control Panel
                </button>
                <button type="button" onClick={() => open('help')}>
                  <img src="/icons/help-and-support.png" alt="" /> Help and Support
                </button>
                {startSearchAndRun}
              </div>
            </nav>
          ) : (
          <nav className="start-menu" id="start-menu" aria-label="Start menu">
            <div className="start-header">
              <button type="button" className="start-portrait" ref={startProfileButton} aria-label="Open About Me" onClick={() => open('about')}>
                <img className="account-picture" src="/chelsea.jpg" alt="" width="40" height="40" />
              </button>
              <span>Chelsea Simpson</span>
            </div>
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
                    Help and Support
                  </button>
                  {startSearchAndRun}
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
              <img className="window-icon" src={entry.icon ?? app.icon} alt="" /><span>{entry.caption ?? app.label}</span>
            </button>
          )
        })}
        <LocalClock />
      </footer>
    </div>
  )
}
