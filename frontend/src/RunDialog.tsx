import { useId, useRef, useState } from 'react'
import DialogFrame from './DialogFrame'
import BrowseDialog, { type BrowseEntry } from './BrowseDialog'
import ToolbarDropdown from './ToolbarDropdown'

import { normalizeRunEntry, type RunTarget } from './runEntries'
import { canCreateFolder, type FolderId } from './explorerLocations'

export default function RunDialog({ targets, recent, recentDocuments, onRun, onClose, onHelp, onCreateFolder }: {
  targets: RunTarget[]
  recent: string[]
  recentDocuments: string[]
  onRun: (target: RunTarget, entry: string) => void
  onClose: () => void
  onHelp: () => void
  onCreateFolder?: (parent: FolderId) => string
}) {
  const id = useId()
  const fieldAnchor = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [entry, setEntry] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [error, setError] = useState('')

  function choose(value: string) {
    setEntry(value)
    setError('')
  }

  const browseTargets = browsing && onCreateFolder ? targets.filter((target) => target.path) : []
  const browseEntries: BrowseEntry[] = browseTargets.map(({ name, path, icon, parent, location, kind }) => ({
    id: location ?? path ?? name, parent: parent ?? null, name, icon,
    kind,
  }))
  const recentFolder = 'recent-run-documents'
  const recentDocumentEntries = recentDocuments.flatMap((command) => {
    const normalized = normalizeRunEntry(command)
    const target = browseEntries.find(({ id, name, kind }) => kind === 'file' &&
      (normalizeRunEntry(id) === normalized || normalizeRunEntry(name) === normalized))
    return target ? [{ ...target, parent: recentFolder }] : []
  }).filter(({ id }, index, all) => all.findIndex((entry) => entry.id === id) === index)

  return (
    <DialogFrame title="Run" descriptionId={id} initialFocus={input} onClose={onClose} onHelp={onHelp}>
      <form className="folder-delete-content run-dialog" onSubmit={(event) => {
        event.preventDefault()
        const command = normalizeRunEntry(entry)
        if (!command) return
        const exactPaths = targets.filter(({ path }) => path && normalizeRunEntry(path) === command)
        const matches = exactPaths.length ? exactPaths : targets.filter(({ name, path }) =>
          normalizeRunEntry(name) === command || (path && normalizeRunEntry(path).endsWith('\\' + command)))
        if (matches.length !== 1) {
          setError(matches.length
            ? onCreateFolder ? 'More than one item has that name. Use Browse to choose one.' : 'More than one program has that name. Enter its full path.'
            : onCreateFolder ? 'ChelseaXP could not find that program, folder, or document.' : 'ChelseaXP could not find that program.')
          input.current?.focus({ preventScroll: true })
          return
        }
        onRun(matches[0], entry.trim())
      }}>
        <div className="folder-delete-error">
          <img src="/icons/run.png" alt="" width="32" height="32" />
          <p id={id}>Type the name of a {onCreateFolder ? 'program, folder, or document' : 'program'}, and ChelseaXP will open it for you.</p>
        </div>
        <div className="run-input-row">
          <label htmlFor={id + '-open'}>Open:</label>
          <div className="run-open-field" ref={fieldAnchor}>
          <input id={id + '-open'} ref={input} value={entry} onChange={(event) => choose(event.target.value)} autoComplete="off" />
          <ToolbarDropdown label="Recent entries" fieldAnchor={fieldAnchor} options={recent.map((value) => ({ label: value, action: () => {
            choose(value)
            input.current?.focus({ preventScroll: true })
          } }))} />
          </div>
        </div>
        {error && <p className="run-error" role="alert">{error}</p>}
        <div className="folder-delete-actions">
          <button type="submit" disabled={!entry.trim()}>OK</button>
          <button type="button" onClick={onClose}>Cancel</button>
          {onCreateFolder && <button type="button" onClick={() => setBrowsing(true)}>Browse…</button>}
        </div>
      </form>
      {browsing && onCreateFolder && <BrowseDialog
        entries={[{ id: recentFolder, parent: null, name: 'My Recent Documents', icon: 'recent-documents', kind: 'folder' },
          ...browseEntries, ...recentDocumentEntries]}
        initialFolder={browseEntries.some(({ id }) => id === 'documents') ? 'documents' : 'desktop'}
        places={[{ id: recentFolder }, { id: 'desktop' }, { id: 'documents' }, { id: 'computer' }, { id: 'network', label: 'My Network' }]}
        filters={[{ label: 'Programs', matches: ({ kind }) => kind === 'program' }, { label: 'All files', matches: () => true }]}
        createFolder={{
          allowed: (id) => id !== recentFolder && canCreateFolder(id as FolderId, id === 'disk'),
          create: (id) => onCreateFolder(id as FolderId),
        }}
        onClose={() => setBrowsing(false)} onHelp={onHelp}
        onChoose={({ id }) => {
          choose(id)
          setBrowsing(false)
          requestAnimationFrame(() => input.current?.focus({ preventScroll: true }))
        }} />}
    </DialogFrame>
  )
}
