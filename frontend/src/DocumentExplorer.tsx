import { useEffect, useId, useRef, useState } from 'react'
import ConfirmFolderDelete from './ConfirmFolderDelete'
import SearchCompanion, { type SearchCriteria } from './SearchCompanion'
import TaskPane, { TaskSection } from './TaskPane'
import { explorerPlaces, locationIds, locations, type FolderId, type SessionFolder } from './explorerLocations'

type Entry = { id: string; name: string; icon: string; type: string; folder?: FolderId }
const documentEntries: Entry[] = [
  { id: 'resume', name: 'Résumé.pdf', icon: 'document', type: 'PDF document' },
  { id: 'credits', name: 'Credits.txt', icon: 'document', type: 'Text document' },
]
const views = ['Tiles', 'Icons', 'List', 'Details'] as const
type View = (typeof views)[number]

function Icon({ icon, size = 16 }: { icon: string; size?: number }) {
  return <img src={'/icons/' + icon + '.png'} alt="" width={size} height={size} />
}

function HistoryDropdown({ label, entries, onSelect }: {
  label: string
  entries: { name: string; index: number }[]
  onSelect: (index: number) => void
}) {
  return (
    <span className="explorer-history" data-disabled={entries.length === 0}>
      <select aria-label={label} title={label} disabled={entries.length === 0} value=""
        onChange={(event) => { if (event.target.value) onSelect(Number(event.target.value)) }}>
        <option value="" disabled>{label}</option>
        {entries.map(({ name, index }) => <option key={index} value={index}>{name}</option>)}
      </select>
    </span>
  )
}

export default function DocumentExplorer({
  initialFolder, openCredits, openControlPanel, sessionFolders, addFolder, renameFolder, deleteFolder,
}: {
  initialFolder: FolderId
  openCredits: () => void
  openControlPanel: () => void
  sessionFolders: SessionFolder[]
  addFolder: (parent: FolderId) => SessionFolder
  renameFolder: (id: FolderId, name: string) => string | undefined
  deleteFolder: (id: FolderId) => void
}) {
  const explorerId = useId()
  const [history, setHistory] = useState<{ entries: FolderId[][]; index: number }>({
    entries: [[initialFolder]], index: 0,
  })
  const [address, setAddress] = useState<FolderId | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ folder: FolderId } | { deniedName: string } | null>(null)
  const [selection, setSelection] = useState<string | null>(null)
  const [editing, setEditing] = useState<FolderId | null>(null)
  useEffect(() => {
    if (!editing) return
    renameInput.current?.focus()
    renameInput.current?.select()
  }, [editing])
  const [nameError, setNameError] = useState('')
  const [sidebar, setSidebar] = useState<'tasks' | 'folders' | 'search'>('tasks')
  const [search, setSearch] = useState<SearchCriteria | null>(null)
  const [view, setView] = useState<View>('Tiles')
  const [menu, setMenu] = useState<string | null>(null)
  const files = useRef<HTMLElement>(null)
  const lastPointer = useRef('')
  const renameInput = useRef<HTMLInputElement>(null)
  const folders: Record<FolderId, { name: string; parent: FolderId | null; icon: string }> = { ...locations, ...Object.fromEntries(sessionFolders.map((folder) => [folder.id, folder])) }
  const folderIds: FolderId[] = [...locationIds, ...sessionFolders.map((folder) => folder.id)]
  const locationId = history.entries[history.index].find((id) => folders[id]) ?? initialFolder
  useEffect(() => { files.current?.scrollTo(0, 0) }, [locationId])
  const location = folders[locationId]
  const addressId = address && folders[address] ? address : locationId
  const deleteTarget = pendingDelete && 'folder' in pendingDelete
    ? sessionFolders.find((folder) => folder.id === pendingDelete.folder) : undefined
  const deniedName = pendingDelete && 'deniedName' in pendingDelete ? pendingDelete.deniedName : undefined
  const historyEntries = history.entries.flatMap(([id], index) =>
    folders[id] ? [{ name: folders[id].name, index }] : [])
  const back = historyEntries.filter(({ index }) => index < history.index).reverse()
  const forward = historyEntries.filter(({ index }) => index > history.index)

  function ancestors(id: FolderId): FolderId[] {
    const parent = folders[id].parent
    return parent ? [id, ...ancestors(parent)] : [id]
  }
  const otherPlaces = locationId === 'documents' ? ['desktop', 'computer', 'network'] as const
    : explorerPlaces.filter((id) => id !== locationId)
  const canCreate = locationId !== 'computer' && locationId !== 'network'

  function folderEntry(id: FolderId): Entry {
    const folder = folders[id]
    return { id, name: folder.name, icon: folder.icon, type: 'File Folder', folder: id }
  }

  function folderPath(id: FolderId): string {
    const folder = folders[id]
    return folder.parent ? folderPath(folder.parent) + ' › ' + folder.name : folder.name
  }

  const folderEntries = (locationId === 'desktop' ? (['computer', 'documents', ...sessionFolders.filter((folder) => folder.parent === 'desktop').map((folder) => folder.id)] as const)
    : folderIds.filter((id) => folders[id].parent === locationId)).map(folderEntry)
  const activeSearch = sidebar === 'search' ? search : null
  const entries = activeSearch ? searchEntries(activeSearch)
    : [...folderEntries, ...(locationId === 'documents' ? documentEntries : [])]

  function searchEntries({ name, scope, category, media }: SearchCriteria) {
    function isWithin(parent: FolderId | null): boolean {
      return !scope || (parent !== null && (parent === scope || isWithin(folders[parent].parent)))
    }

    const candidates = [
      ...folderIds.filter((id) => isWithin(folders[id].parent)).map(folderEntry),
      ...(isWithin('documents') ? documentEntries : []),
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
  const editable = sessionFolders.find((folder) => folder.id === selected?.id)

  function resetFolderState() {
    setAddress(null)
    setSelection(null)
    setEditing(null)
    setNameError('')
    setSearch(null)
  }

  function openLocation(id: FolderId) {
    resetFolderState()
    if (id === locationId) return
    setHistory(({ entries, index }) => ({
      entries: [...entries.slice(0, index + 1), ancestors(id)], index: index + 1,
    }))
  }

  function travel(index: number) {
    resetFolderState()
    setHistory((current) => ({ ...current, index }))
  }

  function folderTree(parent: FolderId | null, depth = 0): { id: FolderId; depth: number }[] {
    return folderIds.filter((id) => folders[id].parent === parent)
      .flatMap((id) => [{ id, depth }, ...folderTree(id, depth + 1)])
  }

  function openEntry(entry: Entry) {
    if (entry.folder) openLocation(entry.folder)
    else if (entry.id === 'credits') openCredits()
  }

  function createFolder() {
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
      { label: 'Open', action: () => { if (selected) openEntry(selected) }, disabled: !selected || selected.id === 'resume' },
      { label: 'Make a new folder', action: createFolder, disabled: !canCreate },
    ],
    Edit: [
      { label: 'Rename', action: () => { if (editable) setEditing(editable.id) }, disabled: !editable },
      { label: 'Clear selection', action: () => setSelection(null), disabled: !selected },
    ],
    View: views.map((option) => ({ label: option, action: () => setView(option) })),
    Favorites: [{ label: 'My Documents', action: () => openLocation('documents') }],
    Tools: [
      { label: 'Search', action: () => toggleSidebar('search') },
      { label: 'Folders', action: () => toggleSidebar('folders') },
    ],
    Help: [{ label: 'Credits', action: openCredits }],
  }

  return (
    <div className="explorer xp-file-explorer" onKeyDown={(event) => {
      if (event.key === 'Escape') setMenu(null)
    }}>
      {deniedName && <ConfirmFolderDelete name={deniedName} onCancel={() => setPendingDelete(null)} />}
      {deleteTarget && <ConfirmFolderDelete name={deleteTarget.name}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          deleteFolder(deleteTarget.id)
          setPendingDelete(null)
          setSelection(null)
          requestAnimationFrame(() => files.current?.focus({ preventScroll: true }))
        }} />}
      <div className="explorer-menu-bar" aria-label="Explorer menus" onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMenu(null)
      }}>
        {Object.entries(menuActions).map(([label, actions]) => (
          <div className="explorer-menu" key={label}>
            <button type="button" aria-expanded={menu === label}
              onClick={() => setMenu(menu === label ? null : label)}>{label}</button>
            {menu === label && <div className="explorer-menu-options">
              {actions.map(({ label, action, disabled }) => (
                <button key={label} type="button" disabled={disabled}
                  onClick={() => { action(); setMenu(null) }}>{label}</button>
              ))}
            </div>}
          </div>
        ))}
      </div>
      <div className="explorer-toolbar" role="group" aria-label="Explorer navigation">
        <div className="explorer-history-group">
          <button type="button" aria-label="Back" disabled={!back.length} onClick={() => travel(back[0].index)}>
            <Icon icon="back" size={22} /> Back
          </button>
          <HistoryDropdown label="Back history" entries={back} onSelect={travel} />
        </div>
        <div className="explorer-history-group">
          <button type="button" aria-label="Forward" disabled={!forward.length}
            onClick={() => travel(forward[0].index)}><Icon icon="forward" size={22} /></button>
          <HistoryDropdown label="Forward history" entries={forward} onSelect={travel} />
        </div>
        <button type="button" aria-label="Up" title="Up one level" disabled={!location.parent}
          onClick={() => { if (location.parent) openLocation(location.parent) }}><Icon icon="up" size={22} /></button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
        <button type="button" aria-pressed={sidebar === 'search'} onClick={() => toggleSidebar('search')}>
          <Icon icon="explorer-search" size={22} /> Search
        </button>
        <button type="button" aria-pressed={sidebar === 'folders'} onClick={() => toggleSidebar('folders')}>
          <Icon icon="explorer-folders" size={22} /> Folders
        </button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
        <label className="explorer-view-picker">
          <Icon icon="explorer-view" size={22} /><span aria-hidden="true">▾</span>
          <select aria-label="View" value={view} onChange={(event) => setView(event.target.value as View)}>
            {views.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <form className="explorer-address-row" onSubmit={(event) => {
        event.preventDefault()
        openLocation(addressId)
      }}>
        <label htmlFor={explorerId + '-address'}>Address</label>
        <span className="explorer-address explorer-address--icon">
          <Icon icon={folders[addressId].icon} />
          <select id={explorerId + '-address'} value={addressId}
            onChange={(event) => setAddress(event.target.value as FolderId)}>
            {folderIds.map((id) => <option key={id} value={id}>{folderPath(id)}</option>)}
          </select>
        </span>
        <button className="explorer-go" type="submit"><Icon icon="go" size={18} /> Go</button>
      </form>
      <div className="explorer-layout" data-sidebar={sidebar}>
        <div className="explorer-folders">
          {sidebar === 'search' ? <SearchCompanion
            folders={folderIds.map((id) => ({ id, name: folderPath(id) }))}
            current={locationId}
            onClose={() => toggleSidebar('search')}
            onReset={() => { setSearch(null); setSelection(null) }}
            onSearch={(criteria) => { setSearch(criteria); setSelection(null); files.current?.scrollTo(0, 0) }}
          /> : <TaskPane label="Explorer tasks">
            {sidebar === 'tasks' && <>
              {(canCreate || selected) && <TaskSection title="File and Folder Tasks">
                {selected ? <>
                  {selected.id !== 'resume' && <button type="button" onClick={() => openEntry(selected)}>
                    <Icon icon={selected.icon} /> {selected.folder ? 'Open this folder' : 'Open in Notepad'}
                  </button>}
                  {editable && <button type="button" onClick={() => setEditing(editable.id)}>Rename this folder</button>}
                  <button type="button" onClick={() => setPendingDelete(editable
                    ? { folder: editable.id } : { deniedName: selected.name })}>
                    Delete this {selected.folder ? 'folder' : 'file'}
                  </button>
                  {selected.id === 'resume' && <p className="task-pane-note">Coming soon</p>}
                </> : <button type="button" onClick={createFolder}><Icon icon="new-folder" /> Make a new folder</button>}
              </TaskSection>}
              <TaskSection title="Other Places">
                {otherPlaces.map((id) => (
                  <button key={id} type="button" onClick={() => openLocation(id)}>
                    <Icon icon={folders[id].icon} /> {folders[id].name}
                  </button>
                ))}
                {locationId !== 'documents' && <button type="button" onClick={openControlPanel}>
                  <Icon icon="control-panel" /> Control Panel
                </button>}
              </TaskSection>
              <TaskSection title="Details" defaultExpanded={false}>
                <p className="task-pane-note"><strong>{selected?.name ?? location.name}</strong><br />
                  {selected?.type ?? (sessionFolders.some(({ id }) => id === locationId) ? 'File Folder' : 'System Folder')}
                </p>
              </TaskSection>
            </>}
            {sidebar === 'folders' && <TaskSection title="Folders">
              {folderTree(null).map(({ id, depth }) => (
                <button key={id} type="button" aria-current={id === locationId ? 'location' : undefined}
                  onClick={() => openLocation(id)} title={folderPath(id)} style={{ paddingInlineStart: 4 + depth * 12 }}>
                  <Icon icon={folders[id].icon} /> {folders[id].name}
                </button>
              ))}
            </TaskSection>}
          </TaskPane>}
        </div>
        <section className="explorer-files" ref={files} tabIndex={-1} aria-label={location.name}
          onClick={(event) => {
            if (!(event.target as HTMLElement).closest('li')) {
              setSelection(null)
              setEditing(null)
              setNameError('')
            }
          }}>
          {activeSearch && <p className="explorer-empty" role="status">{entries.length} search results</p>}
          {entries.length ? <ul className="explorer-items" data-view={view}>
            {entries.map((entry) => <li key={entry.id}>
              {editing === entry.id && entry.folder ? <form className="explorer-rename" onSubmit={(event) => {
                event.preventDefault()
                finishName(entry.folder!, String(new FormData(event.currentTarget).get('name')))
              }}>
                <Icon icon={entry.icon} size={40} />
                <input name="name" aria-label="Folder name" defaultValue={entry.name} maxLength={80}
                  ref={renameInput}
                  onBlur={(event) => {
                    if (!finishName(entry.folder!, event.currentTarget.value)) setEditing(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') { setEditing(null); setNameError(''); files.current?.focus() }
                  }} />
              </form> : <button type="button" className="explorer-item" aria-pressed={selection === entry.id}
                onPointerDown={(event) => { lastPointer.current = event.pointerType }}
                onClick={(event) => {
                  setSelection(entry.id)
                  if (event.detail === 0 || lastPointer.current === 'touch') openEntry(entry)
                }}
                onDoubleClick={() => openEntry(entry)}>
                <Icon icon={entry.icon} size={view === 'List' || view === 'Details' ? 16 : 44} />
                <span className="explorer-item-label">{entry.name}</span>
                {view === 'Details' ? <small>{entry.type}</small> : entry.id === 'resume' && <small>Coming soon</small>}
              </button>}
            </li>)}
          </ul> : <p className="explorer-empty">{activeSearch ? 'No matching files or folders.'
            : locationId === 'notes' ? 'No project notes published yet.' : 'This folder is empty.'}</p>}
          {nameError && <p className="explorer-empty" role="status">{nameError}</p>}
        </section>
      </div>
    </div>
  )
}
