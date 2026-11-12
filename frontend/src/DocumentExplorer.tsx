import { useRef, useState } from 'react'
import credits from './credits.txt?raw'

const locations = {
  documents: { name: 'My Documents', parent: null },
  notes: { name: 'Project Notes', parent: 'documents' },
  credits: { name: 'Credits.txt', parent: 'documents' },
} as const

type LocationId = keyof typeof locations

function HistoryDropdown({ label, entries, onSelect }: {
  label: string
  entries: { id: LocationId; index: number }[]
  onSelect: (index: number) => void
}) {
  return (
    <span className="explorer-history" data-disabled={entries.length === 0}>
      <select aria-label={label} title={label} disabled={entries.length === 0} value=""
        onChange={(event) => {
          if (event.target.value) onSelect(Number(event.target.value))
        }}>
        <option value="" disabled>{label}</option>
        {entries.map(({ id, index }) => (
          <option key={index} value={index}>{locations[id].name}</option>
        ))}
      </select>
    </span>
  )
}

export default function DocumentExplorer() {
  const [history, setHistory] = useState<{ entries: LocationId[]; index: number }>({
    entries: ['documents'], index: 0,
  })
  const locationId = history.entries[history.index]
  const historyEntries = history.entries.map((id, index) => ({ id, index }))
  const [address, setAddress] = useState<LocationId | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const files = useRef<HTMLElement>(null)
  const location = locations[locationId]

  function focusFiles() {
    files.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }

  function openLocation(id: LocationId) {
    setAddress(null)
    if (id === locationId) return
    setHistory(({ entries, index }) => ({
      entries: [...entries.slice(0, index + 1), id],
      index: index + 1,
    }))
    focusFiles()
  }

  function travel(index: number) {
    setAddress(null)
    setHistory((current) => ({ ...current, index }))
    focusFiles()
  }

  return (
    <div className="explorer">
      <div className="explorer-toolbar" role="group" aria-label="Explorer navigation">
        <div className="explorer-history-group">
          <button type="button" aria-label="Back" title="Back" disabled={history.index === 0}
            onClick={() => travel(history.index - 1)}>
            <img src="/icons/back.png" alt="" width="22" height="22" /> Back
          </button>
          <HistoryDropdown label="Back history" entries={historyEntries.slice(0, history.index).reverse()} onSelect={travel} />
        </div>
        <div className="explorer-history-group">
          <button type="button" aria-label="Forward" title="Forward" disabled={history.index >= history.entries.length - 1}
            onClick={() => travel(history.index + 1)}>
            <img src="/icons/forward.png" alt="" width="22" height="22" />
          </button>
          <HistoryDropdown label="Forward history" entries={historyEntries.slice(history.index + 1)} onSelect={travel} />
        </div>
        <button type="button" aria-label="Up" title="Up one level" disabled={location.parent === null}
          onClick={() => openLocation('documents')}>
          <img src="/icons/up.png" alt="" width="22" height="22" />
        </button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
      </div>
      <form className="explorer-address-row" onSubmit={(event) => {
        event.preventDefault()
        openLocation(address ?? locationId)
      }}>
        <label htmlFor="explorer-address">Address</label>
        <span className="explorer-address">
          <select id="explorer-address" value={address ?? locationId}
            onChange={(event) => setAddress(event.target.value as LocationId)}>
            <option value="documents">My Documents</option>
            <option value="notes">My Documents › Project Notes</option>
            <option value="credits">My Documents › Credits.txt</option>
          </select>
        </span>
        <button className="explorer-go" type="submit">
          <img src="/icons/go.png" alt="" width="18" height="18" /> Go
        </button>
      </form>
      <div className="explorer-layout">
        <nav className="window-sidebar explorer-folders" aria-label="Folders">
          <h2>Folders</h2>
          <button aria-current={locationId === 'documents' ? 'location' : undefined} onClick={() => openLocation('documents')}>
            <img src="/icons/my-documents.png" alt="" width="32" height="32" /> My Documents
          </button>
          <button aria-current={locationId === 'notes' ? 'location' : undefined} onClick={() => openLocation('notes')}>
            <img src="/icons/folder.png" alt="" width="32" height="32" /> Project Notes
          </button>
        </nav>
        <section className="explorer-files" ref={files} aria-labelledby="folder-heading">
          <h1 id="folder-heading" ref={heading} tabIndex={-1}>{location.name}</h1>
          {locationId === 'documents' ? (
            <ul className="explorer-items">
              <li>
                <button className="explorer-item" onClick={() => openLocation('notes')}>
                  <img src="/icons/folder.png" alt="" width="32" height="32" />
                  <strong>Project Notes</strong>
                </button>
              </li>
              <li className="explorer-item explorer-item--pending">
                <img src="/icons/document.png" alt="" width="32" height="32" />
                <strong>Résumé.pdf</strong>
                <small>Coming soon</small>
              </li>
              <li>
                <button className="explorer-item" onClick={() => openLocation('credits')}>
                  <img src="/icons/document.png" alt="" width="32" height="32" />
                  <strong>Credits.txt</strong>
                </button>
              </li>
            </ul>
          ) : locationId === 'credits' ? (
            <pre className="explorer-text-file">{credits}</pre>
          ) : <p>No project notes published yet.</p>}
        </section>
      </div>
    </div>
  )
}
