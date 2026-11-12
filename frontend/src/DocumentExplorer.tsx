import { useRef, useState } from 'react'
import credits from './credits.txt?raw'

const locations = {
  documents: { name: 'My Documents', parent: null },
  notes: { name: 'Project Notes', parent: 'documents' },
  credits: { name: 'Credits.txt', parent: 'documents' },
} as const

type LocationId = keyof typeof locations

export default function DocumentExplorer() {
  const [locationId, setLocationId] = useState<LocationId>('documents')
  const heading = useRef<HTMLHeadingElement>(null)
  const files = useRef<HTMLElement>(null)
  const location = locations[locationId]

  function openLocation(id: LocationId) {
    setLocationId(id)
    files.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }

  return (
    <div className="explorer">
      <div className="explorer-toolbar">
        <button disabled={location.parent === null} onClick={() => openLocation('documents')}>↑ Up</button>
        <nav className="explorer-address" aria-label="Folder path">
          {location.parent ? (
            <>
              <button onClick={() => openLocation(location.parent)}>My Documents</button>
              <span aria-hidden="true">›</span>
              <span aria-current="location">{location.name}</span>
            </>
          ) : <span aria-current="location">{location.name}</span>}
        </nav>
      </div>
      <div className="explorer-layout">
        <nav className="explorer-folders" aria-label="Folders">
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
