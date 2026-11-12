import { useId, useRef, useState } from 'react'
import TaskPane, { TaskSection } from './TaskPane'

import { explorerPlaces, locationIds, locations, type LocationId } from './explorerLocations'

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

export default function DocumentExplorer({ initialFolder, openCredits, openControlPanel }: {
  initialFolder: LocationId
  openCredits: () => void
  openControlPanel: () => void
}) {
  const explorerId = useId()
  const [history, setHistory] = useState<{ entries: LocationId[]; index: number }>({
    entries: [initialFolder], index: 0,
  })
  const locationId = history.entries[history.index]
  const historyEntries = history.entries.map((id, index) => ({ id, index }))
  const [address, setAddress] = useState<LocationId | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const files = useRef<HTMLElement>(null)
  const location = locations[locationId]
  const children = locationIds.filter((id) => locations[id].parent === locationId)
  const otherPlaces = explorerPlaces.filter((id) => id !== locationId)
  const itemCount = children.length + (locationId === 'documents' ? 2 : 0)

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
          onClick={() => { if (location.parent) openLocation(location.parent) }}>
          <img src="/icons/up.png" alt="" width="22" height="22" />
        </button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
      </div>
      <form className="explorer-address-row" onSubmit={(event) => {
        event.preventDefault()
        openLocation(address ?? locationId)
      }}>
        <label htmlFor={`${explorerId}-address`}>Address</label>
        <span className="explorer-address">
          <select id={`${explorerId}-address`} value={address ?? locationId}
            onChange={(event) => setAddress(event.target.value as LocationId)}>
            {locationIds.map((id) => (
              <option key={id} value={id}>
                {id === 'notes' ? 'My Documents › ' : ''}{locations[id].name}
              </option>
            ))}
          </select>
        </span>
        <button className="explorer-go" type="submit">
          <img src="/icons/go.png" alt="" width="18" height="18" /> Go
        </button>
      </form>
      <div className="explorer-layout">
        <div className="explorer-folders">
          <TaskPane label="Explorer tasks">
            {locationId === 'documents' && (
              <TaskSection title="File and Folder Tasks">{null}</TaskSection>
            )}
            <TaskSection title="Other Places">
              {otherPlaces.map((id) => (
                <button key={id} type="button" onClick={() => openLocation(id)}>
                  <img src={`/icons/${locations[id].icon}.png`} alt="" width="16" height="16" /> {locations[id].name}
                </button>
              ))}
              <button type="button" onClick={openControlPanel}>
                <img src="/icons/control-panel.png" alt="" width="16" height="16" /> Control Panel
              </button>
            </TaskSection>
            <TaskSection title="Details">
              <p className="task-pane-note">
                <strong>{location.name}</strong><br />
                {itemCount === 0 ? 'Empty folder' : `${itemCount} items`}
              </p>
            </TaskSection>
          </TaskPane>
        </div>
        <section className="explorer-files" ref={files} aria-labelledby={`${explorerId}-heading`}>
          <h1 id={`${explorerId}-heading`} ref={heading} tabIndex={-1}>{location.name}</h1>
          {itemCount > 0 ? (
            <ul className="explorer-items">
              {children.map((id) => (
                <li key={id}>
                  <button className="explorer-item" onClick={() => openLocation(id)}>
                    <img src={`/icons/${locations[id].icon}.png`} alt="" width="32" height="32" />
                    <strong>{locations[id].name}</strong>
                  </button>
                </li>
              ))}
              {locationId === 'documents' && (
                <>
                  <li className="explorer-item explorer-item--pending">
                    <img src="/icons/document.png" alt="" width="32" height="32" />
                    <strong>Résumé.pdf</strong>
                    <small>Coming soon</small>
                  </li>
                  <li>
                    <button className="explorer-item" onClick={openCredits}>
                      <img src="/icons/document.png" alt="" width="32" height="32" />
                      <strong>Credits.txt</strong>
                    </button>
                  </li>
                </>
              )}
            </ul>
          ) : <p>{locationId === 'notes' ? 'No project notes published yet.' : 'This folder is empty.'}</p>}
        </section>
      </div>
    </div>
  )
}
