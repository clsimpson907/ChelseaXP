import { useId, useRef, useState } from 'react'
import AddressPicker from './AddressPicker'
import DialogFrame from './DialogFrame'
import ToolbarDropdown from './ToolbarDropdown'
import { useNavigation } from './useNavigation'

export type BrowseEntry = {
  id: string
  parent: string | null
  name: string
  icon: string
  kind: 'folder' | 'file' | 'program'
}

const views = ['List', 'Icons', 'Details'] as const

function BrowseIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  return <img src={icon.startsWith('/') ? icon : '/icons/' + icon + '.png'} alt="" width={size} height={size} />
}

export default function BrowseDialog({ entries, initialFolder, places, filters, onChoose, onClose, onHelp, createFolder }: {
  entries: BrowseEntry[]
  initialFolder: string
  places: { id: string; label?: string }[]
  filters: { label: string; matches: (entry: BrowseEntry) => boolean }[]
  onChoose: (entry: BrowseEntry) => void
  onClose: () => void
  onHelp?: () => void
  createFolder?: { allowed: (id: string) => boolean; create: (id: string) => string }
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const history = useNavigation(() => [initialFolder])
  const [filter, setFilter] = useState(0)
  const [view, setView] = useState<(typeof views)[number]>('List')
  const [selection, setSelection] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const folders = entries.filter(({ kind }) => kind === 'folder')
  const current = folders.find(({ id }) => id === history.current) ?? folders.find(({ id }) => id === initialFolder)
  const parent = folders.find(({ id }) => id === current?.parent)
  const back = history.destinations((id) => folders.find((folder) => folder.id === id)?.name).back[0]
  const items = entries.filter((entry) => entry.parent === current?.id &&
    (entry.kind === 'folder' || !filters[filter] || filters[filter].matches(entry)))
    .sort((left, right) => Number(right.kind === 'folder') - Number(left.kind === 'folder') || left.name.localeCompare(right.name))
  const selected = items.find(({ id }) => id === selection)

  function folderTree(parent: string | null, depth = 0): (BrowseEntry & { depth: number })[] {
    return folders.filter((entry) => entry.parent === parent)
      .flatMap((entry) => [{ ...entry, depth }, ...folderTree(entry.id, depth + 1)])
  }

  function clearSelection() {
    setSelection(null)
    setFileName('')
    setError('')
  }

  function navigate(folder: string) {
    if (folder === current?.id) return
    history.push(folder)
    clearSelection()
  }

  function activate(entry: BrowseEntry) {
    if (entry.kind === 'folder') navigate(entry.id)
    else onChoose(entry)
  }

  return (
    <DialogFrame title="Browse" className="browse-dialog" initialFocus={input} onClose={onClose} onHelp={onHelp}>
      <form className="browse-layout folder-delete-content" onSubmit={(event) => {
        event.preventDefault()
        const name = fileName.trim().toLocaleLowerCase()
        const item = selected ?? items.find(({ name: itemName }) => itemName.toLocaleLowerCase() === name)
        if (item) activate(item)
        else if (name) setError('That name was not found in this folder.')
      }}>
        <div className="browse-toolbar explorer-toolbar">
          <span>Look in:</span>
          {current && <div className="explorer-address explorer-address--icon">
            <span className="explorer-address-parts"><BrowseIcon icon={current.icon} />{current.name}</span>
            <AddressPicker label="Look in" entries={folderTree(null)} value={current.id} onChange={navigate} />
          </div>}
          <button type="button" aria-label="Back" data-tooltip="Back" disabled={!back} onClick={() => {
            if (!back) return
            history.select(back.index)
            clearSelection()
          }}><BrowseIcon icon="back" size={18} /></button>
          <button type="button" aria-label="Up one level" data-tooltip="Up one level" disabled={!parent}
            onClick={() => { if (parent) navigate(parent.id) }}><BrowseIcon icon="up" size={18} /></button>
          <button type="button" aria-label="Create new folder" data-tooltip="Create new folder"
            disabled={!current || !createFolder?.allowed(current.id)} onClick={() => {
              if (!current || !createFolder) return
              clearSelection()
              setSelection(createFolder.create(current.id))
            }}><BrowseIcon icon="new-folder" size={18} /></button>
          <ToolbarDropdown label="View" icon="/icons/explorer-view.png"
            options={views.map((option) => ({ label: option, checked: view === option, action: () => setView(option) }))} />
        </div>
        <nav className="browse-places" aria-label="Places">
          {places.map(({ id, label }) => {
            const folder = folders.find((entry) => entry.id === id)
            if (!folder) return null
            return <button key={id} type="button" aria-current={current?.id === id ? 'location' : undefined}
              onClick={() => navigate(id)}><BrowseIcon icon={folder.icon} size={28} />{label ?? folder.name}</button>
          })}
        </nav>
        <div className="browse-files" aria-label="Files and folders" data-view={view}>
          {view === 'Details' && <div className="browse-columns"><span>Name</span><span>Type</span></div>}
          <ul>
            {items.map((entry) => (
              <li key={entry.id}>
                <button type="button" aria-pressed={selection === entry.id}
                  onClick={(event) => {
                    if (event.detail === 0 || (entry.kind === 'folder' && (event.nativeEvent as PointerEvent).pointerType === 'touch')) {
                      activate(entry)
                      return
                    }
                    setSelection(entry.id)
                    setFileName(entry.kind === 'folder' ? '' : entry.name)
                    setError('')
                  }}
                  onDoubleClick={() => activate(entry)}>
                  <BrowseIcon icon={entry.icon} size={view === 'Icons' ? 28 : 16} />
                  <span>{entry.name}</span>
                  {view === 'Details' && <small>{entry.kind === 'folder' ? 'File Folder' : entry.kind === 'program' ? 'Application' : 'File'}</small>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="browse-fields">
          <label htmlFor={id + '-filename'}>File name:</label>
          <div className="browse-filename">
            <input id={id + '-filename'} ref={input} value={fileName} autoComplete="off"
              onChange={(event) => { setFileName(event.target.value); setSelection(null); setError('') }} />
            <ToolbarDropdown label="File names" options={items.filter(({ kind }) => kind !== 'folder')
              .map((entry) => ({ label: entry.name, action: () => {
                setFileName(entry.name)
                setSelection(entry.id)
                setError('')
                input.current?.focus()
              } }))} />
          </div>
          {filters.length > 0 && <>
            <label htmlFor={id + '-type'}>Files of type:</label>
            <select id={id + '-type'} value={filter} onChange={(event) => {
              setFilter(Number(event.target.value))
              clearSelection()
            }}>{filters.map(({ label }, index) => <option key={label} value={index}>{label}</option>)}</select>
          </>}
          {error && <p className="browse-error" role="alert">{error}</p>}
        </div>
        <div className="folder-delete-actions browse-actions">
          <button type="submit" disabled={!selected && !fileName.trim()}>Open</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </DialogFrame>
  )
}
