import { useNavigation } from './useNavigation'
import { dragItem, dropItem } from './explorerDrag'
import type { DeletedFolder, FolderState, SessionFile } from './recycleFolders'
import ExplorerDialog from './ExplorerDialog'
import { getPublishedCopies, refreshPublishedCopies, subscribeToPublishedCopies } from './publishedComplaints'
import AddressPicker from './AddressPicker'
import NavigationHistory from './NavigationHistory'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import InsertDiskDialog from './InsertDiskDialog'
import ExplorerItemDialog from './ExplorerItemDialog'
import SearchCompanion, { type SearchCriteria } from './SearchCompanion'
import ChromeOverflow from './ChromeOverflow'
import ExplorerMenuBar from './ExplorerMenuBar'
import TaskPane, { TaskSection } from './TaskPane'
import { fixedLocationIds, locations, premadeModifiedAt, type FolderId, type SessionFolder } from './explorerLocations'

type Entry = { modifiedAt?: number; id: string; name: string; icon: string; type: string; folder?: FolderId; open?: () => void }
export type DesktopItem = Entry & { open: () => void; movable?: boolean }
const modifiedDateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' })
const modifiedTimeFormat = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' })

const views = ['Tiles', 'Icons', 'List', 'Details', 'Thumbnails'] as const
type View = (typeof views)[number]

function Icon({ icon, size = 16 }: { icon: string; size?: number }) {
  return <img src={icon.startsWith('/') ? icon : '/icons/' + icon + '.png'} alt="" width={size} height={size} />
}

export default function DocumentExplorer({
  onCaptionChange, initialFolder, openCredits, openControlPanel, sessionFolders, sessionFiles, move, locationDates, addFolder, renameFolder, deleteFolder, desktopItems, recycleBin,
}: {
  onCaptionChange: (caption: string) => void
  initialFolder: FolderId
  openCredits: () => void
  openControlPanel: () => void
  sessionFolders: SessionFolder[]
  sessionFiles: SessionFile[]
  move: (id: string, parent: FolderId, now: number) => void
  locationDates: FolderState['locationDates']
  desktopItems: DesktopItem[]
  addFolder: (parent: FolderId) => SessionFolder
  renameFolder: (id: FolderId, name: string) => string | undefined
  deleteFolder: (id: string, now: number) => void
  recycleBin: {
    trash: DeletedFolder[]
    restore: (id: string) => void
    restoreAll: () => void
    empty: () => void
    hidingComplaints: boolean
  }
}) {
  const history = useNavigation<FolderId[]>(() => {
    const path = [initialFolder]
    const getParent = (id: FolderId) => sessionFolders.find((folder) => folder.id === id)?.parent ??
      (Object.hasOwn(locations, id) ? locations[id as keyof typeof locations].parent : undefined)
    let parent = getParent(initialFolder)
    while (parent) {
      path.push(parent)
      const id = parent
      parent = getParent(id)
    }
    return [path]
  })
  const [address, setAddress] = useState<FolderId | null>(null)
  const [emptyDrive, setEmptyDrive] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [itemDialog, setItemDialog] = useState<{ deleteName: string; isFolder: boolean; folder?: string } | { deniedName: string; operation: 'rename' | 'delete' } | null>(null)
  const [selection, setSelection] = useState<string | null>(null)
  const [editing, setEditing] = useState<FolderId | null>(null)
  useEffect(() => {
    if (!editing) return
    renameInput.current?.focus()
    renameInput.current?.select()
  }, [editing])
  const [nameError, setNameError] = useState('')
  const [showMobileTasks, setShowMobileTasks] = useState(false)
  const [sidebar, setSidebar] = useState<'tasks' | 'folders' | 'search'>('tasks')
  const [search, setSearch] = useState<SearchCriteria | null>(null)
  const [folderView, setFolderView] = useState<View>('Icons')
  const [desktopView, setDesktopView] = useState<View>('Icons')
  const [picturesView, setPicturesView] = useState<View>('Icons')
  const files = useRef<HTMLElement>(null)
  const lastPointer = useRef('')
  const renameInput = useRef<HTMLInputElement>(null)
  const folders: Record<FolderId, { name: string; parent: FolderId | null; icon: string; renamed?: boolean; modifiedAt?: number }> = Object.fromEntries([
    ...fixedLocationIds.map((id) => [id, { ...locations[id], modifiedAt: locationDates[id] ?? premadeModifiedAt }]),
    ...sessionFolders.map((folder) => [folder.id, folder]),
  ])
  const folderIds: FolderId[] = [...fixedLocationIds, ...sessionFolders.map((folder) => folder.id)]
  // A history entry retains its ancestors so deletion can fall back to a surviving folder.
  const locationId = history.current.find((id) => folders[id]) ?? 'desktop'
  useEffect(() => { files.current?.scrollTo(0, 0) }, [locationId])
  const location = folders[locationId]
  const isDesktop = locationId === 'desktop'
  const isComputer = locationId === 'computer'
  const isMusic = locationId === 'music'
  const isPictures = locationId === 'pictures'
  const isProtectedDisk = locationId === 'disk'
  const [driveRevealed, setDriveRevealed] = useState(false)
  const hiddenContents = (isProtectedDisk && !driveRevealed) || locationId === 'chelseaxp-system'
  const view = isDesktop ? desktopView : isPictures ? picturesView : folderView
  const setView = isDesktop ? setDesktopView : isPictures ? setPicturesView : setFolderView
  const addressId = address && folders[address] ? address : locationId
  const deleteTarget = itemDialog && 'deleteName' in itemDialog ? itemDialog : null
  const denied = itemDialog && 'deniedName' in itemDialog ? itemDialog : null
  const { back, forward } = history.destinations(([id]) => folders[id]?.name)

  function ancestors(id: FolderId): FolderId[] {
    const parent = folders[id].parent
    return parent ? [id, ...ancestors(parent)] : [id]
  }
  const addressParts = ancestors(addressId).reverse().filter((id) =>
    id === addressId || (id !== 'desktop' && id !== 'computer' && addressId !== 'disk'))
  function getOtherPlaces(): FolderId[] {
    switch (locationId) {
      case 'documents': return ['desktop', 'computer', 'network']
      case 'desktop': return ['documents', 'network']
      case 'computer': return ['network', 'documents']
      case 'disk': return ['computer', 'documents', 'network']
      case 'recycle': return ['desktop', 'documents', 'computer', 'network']
      case 'network': return ['desktop', 'documents', 'computer']
    }

    const parent = location.parent
    const places: FolderId[] = []
    if (parent) places.push(parent)
    if (!parent || folders[parent].parent !== 'documents') places.push('documents')
    places.push('computer', 'network')
    return [...new Set(places)]
  }
  const otherPlaces = getOtherPlaces().filter((id) => folders[id])

  const published = useSyncExternalStore(subscribeToPublishedCopies, getPublishedCopies)
  const [publishedError, setPublishedError] = useState(false)
  useEffect(() => {
    if (locationId !== 'published-complaints') return
    let active = true
    void refreshPublishedCopies().then(
      () => { if (active) setPublishedError(false) },
      () => { if (active) setPublishedError(true) },
    )
    return () => { active = false }
  }, [locationId])
  const [readingComplaint, setReadingComplaint] = useState<{ subject: string; message: string } | null>(null)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  useEffect(() => {
    if (!restoring) return
    const timer = window.setTimeout(() => setRestoring(null), 1000)
    return () => window.clearTimeout(timer)
  }, [restoring])

  const isRecycleLocation = locationId === 'recycle' || locationId === 'published-complaints'
  const canCreate = !isRecycleLocation && !isComputer && !hiddenContents && locationId !== 'network' && locationId !== 'birby'

  function folderEntry(id: FolderId): Entry {
    const folder = folders[id]
    return { id, name: folder.name, icon: folder.icon, type: 'File Folder', folder: id, modifiedAt: folder.modifiedAt }
  }

  function folderPath(id: FolderId): string {
    if (id === 'disk') return 'C:\\'
    const folder = folders[id]
    return folder.parent ? folderPath(folder.parent) + ' › ' + folder.name : folder.name
  }

  const folderEntries = folderIds.filter((id) => folders[id].parent === locationId).map(folderEntry)
  if (locationId === 'chelsea') {
    folderEntries.push({ ...folderEntry('desktop'), id: 'profile-desktop', icon: 'folder' })
    if (folders.documents && folders.documents.parent !== 'chelsea') {
      folderEntries.push({ ...folderEntry('documents'), id: 'profile-documents', icon: 'folder' })
    }
    folderEntries.sort((first, second) => first.name.localeCompare(second.name))
  }
  const documentEntries: (Entry & { parent: FolderId })[] = sessionFiles.map((file) => ({ ...file, type: 'Text document' }))
  const trashEntries: Entry[] = recycleBin.trash.map(({ root, isFile }) => ({
    id: root.id, name: root.name, icon: root.icon, type: isFile ? 'Deleted file' : 'Deleted folder', modifiedAt: root.modifiedAt,
  }))
  const complaintEntries: Entry[] = Object.entries(published).flatMap(([id, copy]) => copy ? [{
    id: 'complaint-' + id, name: copy.subject, icon: 'mail', type: 'Published complaint',
    open: () => setReadingComplaint(copy),
  }] : [])
  const removableDrives: Entry[] = [
    { id: 'floppy-drive', name: '3½ Floppy (A:)', icon: 'floppy-disk', type: 'Removable Drive', open: () => setEmptyDrive('A:') },
    { id: 'cd-drive', name: 'CD Drive (D:)', icon: 'optical-drive', type: 'Removable Drive', open: () => setEmptyDrive('D:') },
  ]
  const computerGroups = [
    { title: 'Files Stored on This Computer', entries: folderEntries.filter(({ id }) => id !== 'disk') },
    { title: 'Hard Disk Drives', entries: [{ ...folderEntry('disk'), type: 'Local Disk' }] },
    { title: 'Devices with Removable Storage', entries: removableDrives },
  ]
  const activeSearch = sidebar === 'search' ? search : null
  const caption = activeSearch ? 'Search Results' : location.name
  useEffect(() => onCaptionChange(caption), [caption, onCaptionChange])
  const entries = activeSearch ? searchEntries(activeSearch)
    : isComputer ? computerGroups.flatMap((group) => group.entries)
    : (isDesktop ? desktopItems : [...folderEntries,
      ...documentEntries.filter((file) => file.parent === locationId),
      ...(locationId === 'recycle' ? trashEntries : []),
      ...(locationId === 'published-complaints' && !recycleBin.hidingComplaints ? complaintEntries : [])
    ]).filter(({ id }) => id !== restoring && !(recycleBin.hidingComplaints && id === 'published-complaints'))

  function searchEntries({ name, scope, category, media }: SearchCriteria) {
    function isWithin(parent: FolderId | null): boolean {
      return !scope || (parent !== null && (parent === scope || isWithin(folders[parent].parent)))
    }

    const candidates = [
      ...folderIds.filter((id) => isWithin(folders[id].parent) && (driveRevealed || !ancestors(id).slice(1).includes('disk'))).map(folderEntry),
      ...(scope === 'desktop' ? desktopItems.filter((item) => !item.movable && !item.folder) : []),
      ...documentEntries.filter((file) => isWithin(file.parent)),
    ]
    const query = name.trim().toLowerCase()
    return candidates.filter((entry) => {
      if (!entry.name.toLowerCase().includes(query)) return false
      if (category === 'all') return true
      if (category === 'documents') return !entry.folder && /\.(txt|pdf)$/i.test(entry.name)
      if (entry.folder) return false
      const types = [
        ['Pictures and photos', /\.(png|jpe?g|gif|webp)$/i],
        ['Music', /\.(mp3|wav|ogg)$/i],
        ['Video', /\.(mp4|webm|mov)$/i],
      ] as const
      return types.some(([label, extension]) => (!media.length || media.includes(label)) && extension.test(entry.name))
    })
  }

  const selected = entries.find((entry) => entry.id === selection)
  const modifiedAt = selected
    ? (selected.folder === 'disk' ? undefined : selected.modifiedAt)
    : (isProtectedDisk ? undefined : location.modifiedAt)
  const editable = sessionFolders.find((folder) => folder.id === (selected?.folder ?? selected?.id))
  const canRestore = Boolean(selected && isRecycleLocation && !activeSearch &&
    (selected.id === 'published-complaints' || selected.type === 'Published complaint' || selected.type.startsWith('Deleted ')))
  function restoreSelection() {
    if (!selected || !canRestore) return
    if (selected.type.startsWith('Deleted ')) recycleBin.restore(selected.id)
    else setRestoring(selected.id)
    setSelection(null)
  }

  const restoreLabel = selected ? 'Restore this item' : 'Restore all items'
  const canRunRestore = !recycleBin.hidingComplaints && (selected ? canRestore : isRecycleLocation)
  function runRestore() {
    if (!canRunRestore) return
    if (selected) restoreSelection()
    else recycleBin.restoreAll()
  }

  const canManageSelection = !isRecycleLocation && selected && selected.id !== 'recycle' && selected.id !== 'published-complaints' && selected.type !== 'Removable Drive' && selected.id !== 'disk'
  const itemKind = selected?.type === 'Shortcut' ? 'shortcut' : selected?.folder ? 'folder' : 'file'

  function deleteSelection() {
    if (!selected || !canManageSelection || itemDialog || emptyDrive) return
    setItemDialog({ deleteName: selected.name, isFolder: itemKind === 'folder', folder: (selected.folder === 'chelseaxp-system' ? selected.folder : editable?.id) ?? sessionFiles.find((file) => file.id === selected.id)?.id })
  }

  function renameSelection() {
    if (!selected || !canManageSelection) return
    if (editable) setEditing(editable.id)
    else setItemDialog({ deniedName: selected.name, operation: 'rename' })
  }

  function resetFolderState() {
    setAddress(null)
    setSelection(null)
    setEditing(null)
    setNameError('')
    setSearch(null)
  }

  function openLocation(id: FolderId) {
    if (!folders[id]) return
    if (id === 'birby') {
      setAccessDenied(true)
      return
    }
    resetFolderState()
    if (id === locationId) return
    history.push(ancestors(id))
  }

  function travel(index: number) {
    resetFolderState()
    history.select(index)
  }

  function folderTree(parent: FolderId | null, depth = 0): { id: FolderId; depth: number }[] {
    return folderIds.filter((id) => folders[id].parent === parent)
      .flatMap((id) => [{ id, depth }, ...(id === 'disk' && !driveRevealed ? [] : folderTree(id, depth + 1))])
  }

  function openEntry(entry: Entry) {
    if (entry.folder) openLocation(entry.folder)
    else if (entry.open) entry.open()
    else if (entry.id === 'credits') openCredits()
  }

  function createFolder() {
    if (!canCreate) return
    setSidebar('tasks')
    setSearch(null)
    const folder = addFolder(locationId)
    setSelection(folder.id)
    setEditing(folder.id)
    setNameError('')
  }

  function finishName(id: FolderId, name: string) {
    const error = renameFolder(id, name)
    setNameError(error ?? '')
    if (error) return false
    setEditing(null)
    return true
  }

  function toggleSidebar(next: typeof sidebar) {
    setSidebar(sidebar === next ? 'tasks' : next)
    setSearch(null)
    setSelection(null)
  }

  const menuActions: Record<string, { label: string; action: () => void; disabled?: boolean }[]> = {
    File: [
      { label: 'Open', action: () => { if (selected) openEntry(selected) }, disabled: !selected || selected.type.startsWith('Deleted ') },
      ...(isRecycleLocation ? [{ label: 'Empty the Recycle Bin', action: () => setConfirmEmpty(true), disabled: recycleBin.hidingComplaints }] : []),
      ...(isRecycleLocation ? [{ label: restoreLabel, action: runRestore, disabled: !canRunRestore }] : []),
      { label: 'Make a new folder', action: createFolder, disabled: !canCreate },
    ],
    Edit: [
      { label: 'Rename', action: renameSelection, disabled: !canManageSelection },
      { label: 'Clear selection', action: () => setSelection(null), disabled: !selected },
    ],
    View: views.map((option) => ({ label: option, action: () => setView(option), disabled: hiddenContents })),
    Favorites: [{ label: 'My Documents', action: () => openLocation('documents') }],
    Tools: [
      { label: 'Search', action: () => toggleSidebar('search') },
      { label: 'Folders', action: () => toggleSidebar('folders') },
    ],
    Help: [{ label: 'Credits', action: openCredits }],
  }

  function renderEntries(items: Entry[]) {
    const iconSize = view === 'List' || view === 'Details' ? 16 : isDesktop && view === 'Icons' ? 32 : 44
    return <ul className="explorer-items" data-view={view} data-desktop={isDesktop && !activeSearch}>
      {items.map((entry) => <li key={entry.id}>
        {editing === entry.id && entry.folder ? <form className="explorer-item explorer-rename" onSubmit={(event) => {
          event.preventDefault()
          finishName(entry.folder!, String(new FormData(event.currentTarget).get('name')))
        }}>
          <Icon icon={entry.icon} size={iconSize} />
          <input name="name" aria-label="Folder name" defaultValue={entry.name} maxLength={80}
            ref={renameInput}
            onBlur={(event) => {
              if (!finishName(entry.folder!, event.currentTarget.value)) setEditing(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { setEditing(null); setNameError(''); files.current?.focus() }
            }} />
          {view === 'Details' && <small>{entry.type}</small>}
        </form> : <button type="button" className="explorer-item" aria-pressed={selection === entry.id}
          {...(!isRecycleLocation && (sessionFolders.some((folder) => folder.id === (entry.folder ?? entry.id)) ||
            sessionFiles.some((file) => file.id === entry.id)) ? dragItem(entry.folder ?? entry.id) : {})}
          {...(entry.folder ? dropItem(entry.folder, move) : {})}
          onPointerDown={(event) => { lastPointer.current = event.pointerType }}
          onClick={(event) => {
            setSelection(entry.id)
            if (event.detail === 0 || lastPointer.current === 'touch') openEntry(entry)
          }}
          onDoubleClick={() => openEntry(entry)}>
          <Icon icon={entry.icon} size={iconSize} />
          <span className="explorer-item-label">{entry.name}</span>
          {view === 'Details' && <small>{entry.type}</small>}
        </button>}
      </li>)}
    </ul>
  }

  return (
    <div className="explorer xp-file-explorer" onKeyDown={(event) => {
      if (event.key !== 'Delete' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.nativeEvent.isComposing || !(event.target instanceof HTMLElement) ||
        event.target.isContentEditable || event.target.closest('input, textarea, select, dialog') ||
        !canManageSelection) return
      event.preventDefault()
      deleteSelection()
    }}>
      {accessDenied && <ExplorerDialog title="Birby" onClose={() => setAccessDenied(false)}>
        <div className="folder-delete-error"><Icon icon="critical" size={32} /> Access is denied.</div>
      </ExplorerDialog>}
      {confirmEmpty && <ExplorerDialog title="Confirm Empty Recycle Bin"
        onClose={() => setConfirmEmpty(false)} onConfirm={() => {
          recycleBin.empty()
          setSelection(null)
          setConfirmEmpty(false)
        }}>
        <p>Are you sure you want to empty the Recycle Bin?</p>
      </ExplorerDialog>}
      {readingComplaint && !recycleBin.hidingComplaints && <ExplorerDialog title={readingComplaint.subject} onClose={() => setReadingComplaint(null)}>
        <div className="published-complaint-message">{readingComplaint.message}</div>
      </ExplorerDialog>}
      {emptyDrive && <InsertDiskDialog drive={emptyDrive} onClose={() => setEmptyDrive(null)} />}
      {denied && <ExplorerItemDialog name={denied.deniedName} operation={denied.operation} onCancel={() => setItemDialog(null)} />}
      {deleteTarget && <ExplorerItemDialog name={deleteTarget.deleteName} isFolder={deleteTarget.isFolder}
        onCancel={() => setItemDialog(null)}
        onConfirm={() => {
          if (!deleteTarget.folder) {
            setItemDialog({ deniedName: deleteTarget.deleteName, operation: 'delete' })
            return
          }
          deleteFolder(deleteTarget.folder, Date.now())
          setItemDialog(null)
          setSelection(null)
          requestAnimationFrame(() => files.current?.focus({ preventScroll: true }))
        }} />}
      <ExplorerMenuBar label="Explorer menus" menus={menuActions} />
      <div className="explorer-toolbar" role="group" aria-label="Explorer navigation">
        <NavigationHistory back={back} forward={forward} onSelect={travel} />
        <button type="button" aria-label="Up" data-tooltip="Up one level" disabled={!location.parent}
          onClick={() => { if (location.parent) openLocation(location.parent) }}><Icon icon="up" size={22} /></button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
        <button type="button" aria-pressed={sidebar === 'search'} onClick={() => toggleSidebar('search')}>
          <Icon icon="explorer-search" size={22} /> Search
        </button>
        <button type="button" aria-pressed={sidebar === 'folders'} onClick={() => toggleSidebar('folders')}>
          <Icon icon="explorer-folders" size={22} /> Folders
        </button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
        <label className="explorer-view-picker" data-tooltip="View">
          <Icon icon="explorer-view" size={22} /><span aria-hidden="true">▾</span>
          <select aria-label="View" disabled={hiddenContents} value={view} onChange={(event) => setView(event.target.value as View)}>
            {views.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <ChromeOverflow kind="toolbar" commands={[
          { label: 'Forward', icon: 'forward', disabled: !forward.length, action: () => travel(forward[0].index) },
          { label: 'Up', icon: 'up', disabled: !location.parent, action: () => { if (location.parent) openLocation(location.parent) } },
          { label: 'Search', icon: 'explorer-search', action: () => toggleSidebar('search') },
          { label: 'Folders', icon: 'explorer-folders', action: () => toggleSidebar('folders') },
          { label: 'Views', icon: 'explorer-view', children: menuActions.View },
        ]} />
      </div>
      <form className="explorer-address-row" onSubmit={(event) => {
        event.preventDefault()
        openLocation(addressId)
      }}>
        <span>Address</span>
        <span className="explorer-address explorer-address--icon">
          <span className="explorer-address-parts">
            <Icon icon={folders[addressId].icon} />
            {addressParts.map((id, index) => (
              <span className="explorer-address-part" key={id}>
                {index > 0 && <span aria-hidden="true">›</span>}
                {id === addressId ? <span>{id === 'disk' ? folderPath(id) : folders[id].name}</span>
                  : <button type="button" onClick={() => openLocation(id)}>{folders[id].name}</button>}
              </span>
            ))}
          </span>
          <AddressPicker value={addressId} onChange={setAddress} entries={folderTree(null)
            .map(({ id, depth }) => ({ id, depth, name: folders[id].name, icon: folders[id].icon }))} />
        </span>
        <button className="explorer-go" type="submit"><Icon icon="go" size={18} /> Go</button>
      </form>
      <button type="button" className="mobile-explorer-tasks" aria-expanded={showMobileTasks && sidebar === 'tasks'}
        onClick={() => {
          setShowMobileTasks(sidebar !== 'tasks' || !showMobileTasks)
          setSidebar('tasks')
          setSearch(null)
        }}>Folder tasks</button>
      <div className="explorer-layout" data-mobile-tasks={showMobileTasks} data-sidebar={sidebar}>
        <div className="explorer-folders">
          {sidebar === 'search' ? <SearchCompanion
            folders={folderIds.map((id) => ({ id, name: folderPath(id) }))}
            current={locationId}
            onClose={() => toggleSidebar('search')}
            onReset={() => { setSearch(null); setSelection(null) }}
            onSearch={(criteria) => { setSearch(criteria); setSelection(null); files.current?.scrollTo(0, 0) }}
          /> : <TaskPane label="Explorer tasks">
            {sidebar === 'tasks' && <>
              {isComputer && <TaskSection title="System Tasks">
                <button type="button" onClick={openControlPanel}>
                  <Icon icon="control-panel" /> Change a setting
                </button>
              </TaskSection>}
              {isProtectedDisk && <TaskSection title="System Tasks" variant="system">
                <button type="button" onClick={() => { setDriveRevealed(!driveRevealed); resetFolderState() }}>
                  <Icon icon="explorer-folders" /> <span>{driveRevealed ? "Hide" : "Show"} the contents of<br />this drive</span>
                </button>
                <button type="button" disabled>
                  <Icon icon="control-panel" /> Add or remove programs
                </button>
                <button type="button" onClick={() => toggleSidebar('search')}>
                  <Icon icon="explorer-search" /> Search for files or folders
                </button>
              </TaskSection>}
              {isRecycleLocation && <TaskSection title="Recycle Bin Tasks">
                <button type="button" disabled={recycleBin.hidingComplaints} onClick={() => setConfirmEmpty(true)}>
                  <Icon icon="recycle-bin" /> Empty the Recycle Bin
                </button>
                <button type="button" disabled={!canRunRestore} onClick={runRestore}>
                  <Icon icon="recycle-restore-all" /> {restoreLabel}
                </button>
              </TaskSection>}
              {!isComputer && !isRecycleLocation && (canCreate || selected) && <TaskSection title="File and Folder Tasks">
                {selected ? <>
                  {!selected.type.startsWith('Deleted ') && <button type="button" onClick={() => openEntry(selected)}>
                    <Icon icon={selected.icon} /> {selected.type === 'Shortcut' ? 'Open shortcut' : selected.type === 'Removable Drive' || selected.id === 'disk' ? 'Open drive' : selected.folder ? 'Open this folder' : selected.type === 'Published complaint' ? 'Open complaint' : 'Open in Notepad'}
                  </button>}
                  {canManageSelection && <>
                    <button type="button" onClick={renameSelection}>
                      <Icon icon="rename" /> Rename this {itemKind}
                    </button>
                    <button type="button" onClick={deleteSelection}>
                      <Icon icon="delete" /> Delete this {itemKind}
                    </button>
                  </>}
                </> : <button type="button" onClick={createFolder}><Icon icon="new-folder" /> Make a new folder</button>}
              </TaskSection>}
              <TaskSection title="Other Places">
                {otherPlaces.map((id) => (
                  <button key={id} type="button" onClick={() => openLocation(id)}>
                    <Icon icon={folders[id].icon} />
                    <span className={folders[id].renamed ? 'task-pane-name' : undefined} title={folders[id].renamed ? folders[id].name : undefined}>{folders[id].name}</span>
                  </button>
                ))}
                {isComputer && <button type="button" onClick={openControlPanel}>
                  <Icon icon="control-panel" /> Control Panel
                </button>}
              </TaskSection>
              <TaskSection key={isProtectedDisk ? "disk-details" : "folder-details"} title="Details">
                <p className="task-pane-note"><strong className={(selected ? editable?.renamed : location.renamed) ? 'task-pane-name' : undefined}
                    title={(selected ? editable?.renamed : location.renamed) ? selected?.name ?? location.name : undefined}>
                    {selected?.name ?? location.name}
                  </strong><br />
                  {(selected?.type === 'Deleted folder' ? 'File Folder' : selected?.type === 'Deleted file' ? 'Text document' : selected?.type) ?? (isProtectedDisk ? 'Local Disk' : sessionFolders.some(({ id }) => id === locationId) ? 'File Folder' : 'System Folder')}
                  {(selected ? selected.folder === 'disk' : isProtectedDisk) && <>
                    <br />File System: NTFS
                    <br />Free Space: 40.2 GB
                    <br />Total Size: 49.9 GB
                  </>}
                  {modifiedAt !== undefined && <><br />
                    Date Modified: <time dateTime={new Date(modifiedAt).toISOString()}>
                      {modifiedDateFormat.format(modifiedAt)}, {modifiedTimeFormat.format(modifiedAt)}
                    </time>
                  </>}
                </p>
              </TaskSection>
            </>}
            {sidebar === 'folders' && <TaskSection title="Folders">
              {folderTree(null).map(({ id, depth }) => (
                <button key={id} type="button" aria-current={id === locationId ? 'location' : undefined}
                  onClick={() => openLocation(id)} title={folderPath(id)} style={{ paddingInlineStart: 4 + depth * 12 }}>
                  <Icon icon={folders[id].icon} />
                  <span className={folders[id].renamed ? 'task-pane-name' : undefined} title={folders[id].renamed ? folders[id].name : undefined}>{folders[id].name}</span>
                </button>
              ))}
            </TaskSection>}
          </TaskPane>}
        </div>
        <div className="explorer-file-pane" data-music={isMusic && !activeSearch} data-pictures={isPictures && !activeSearch}>
        <section className="explorer-files" data-protected={hiddenContents} ref={files} tabIndex={-1} aria-label={location.name}
          {...(canCreate && !activeSearch ? dropItem(locationId, move) : {})}
          onClick={(event) => {
            if (!(event.target as HTMLElement).closest('li')) {
              setSelection(null)
              setEditing(null)
              setNameError('')
            }
          }}>
          {activeSearch && <p className="explorer-empty" role="status">{entries.length} search results</p>}
          {hiddenContents ? (
            <div className="explorer-protected-disk">
              <h1>These files are hidden.</h1>
              <p>This folder contains files that keep your system working properly. You should not modify its contents.</p>
              {isProtectedDisk && <button type="button" onClick={() => { setDriveRevealed(true); resetFolderState() }}>Show the contents of this drive</button>}
            </div>
          ) : isComputer && !activeSearch ? computerGroups.map((group) => (
            <section className="explorer-computer-group" key={group.title} aria-label={group.title}>
              <h2>{group.title}</h2>
              {renderEntries(group.entries)}
            </section>
          )) : entries.length ? renderEntries(entries) : activeSearch ? <p className="explorer-empty">No matching files or folders.</p> : null}
          {locationId === 'published-complaints' && publishedError && <p role="alert">Couldn’t load published complaints. Reopen the folder to try again.</p>}
          {nameError && <p className="explorer-empty" role="status">{nameError}</p>}
        </section>
        </div>
      </div>
    </div>
  )
}
