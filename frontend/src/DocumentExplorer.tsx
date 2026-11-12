import { useRef, useState } from 'react'

const folders = {
  documents: { name: 'My Documents', parent: null },
  notes: { name: 'Project Notes', parent: 'documents' },
} as const

type FolderId = keyof typeof folders

export default function DocumentExplorer() {
  const [folderId, setFolderId] = useState<FolderId>('documents')
  const heading = useRef<HTMLHeadingElement>(null)
  const folder = folders[folderId]

  function openFolder(id: FolderId) {
    setFolderId(id)
    heading.current?.focus()
  }

  return (
    <div className="explorer">
      <div className="explorer-toolbar">
        <button disabled={folder.parent === null} onClick={() => openFolder('documents')}>↑ Up</button>
        <nav className="explorer-address" aria-label="Folder path">
          {folder.parent ? (
            <>
              <button onClick={() => openFolder(folder.parent)}>My Documents</button>
              <span aria-hidden="true">›</span>
              <span aria-current="location">{folder.name}</span>
            </>
          ) : <span aria-current="location">{folder.name}</span>}
        </nav>
      </div>
      <div className="explorer-layout">
        <nav className="explorer-folders" aria-label="Folders">
          <button aria-current={folderId === 'documents' ? 'location' : undefined} onClick={() => openFolder('documents')}>
            <span aria-hidden="true">📁</span> My Documents
          </button>
          <button aria-current={folderId === 'notes' ? 'location' : undefined} onClick={() => openFolder('notes')}>
            <span aria-hidden="true">📁</span> Project Notes
          </button>
        </nav>
        <section className="explorer-files" aria-labelledby="folder-heading">
          <h1 id="folder-heading" ref={heading} tabIndex={-1}>{folder.name}</h1>
          {folderId === 'documents' ? (
            <ul className="explorer-items">
              <li>
                <button className="explorer-item" onClick={() => openFolder('notes')}>
                  <span aria-hidden="true">📁</span>
                  <strong>Project Notes</strong>
                </button>
              </li>
              <li className="explorer-item explorer-item--pending">
                <span aria-hidden="true">📄</span>
                <strong>Résumé.pdf</strong>
                <small>Coming soon</small>
              </li>
            </ul>
          ) : <p>No project notes published yet.</p>}
        </section>
      </div>
    </div>
  )
}
