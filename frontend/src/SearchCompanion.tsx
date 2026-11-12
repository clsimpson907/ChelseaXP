import { useState } from 'react'
import type { FolderId } from './explorerLocations'

const categories = {
  media: 'Pictures, music, or video',
  documents: 'Documents',
  all: 'All files and folders',
} as const

export type SearchCriteria = {
  category: keyof typeof categories
  name: string
  scope: FolderId | ''
  media: string[]
}

export default function SearchCompanion({ folders, current, onSearch, onReset, onClose }: {
  folders: { id: FolderId; name: string }[]
  current: FolderId
  onSearch: (criteria: SearchCriteria) => void
  onReset: () => void
  onClose: () => void
}) {
  const [category, setCategory] = useState<SearchCriteria['category'] | null>(null)

  return (
    <aside className="search-companion" aria-label="Search Companion">
      <header>Search Companion <button type="button" aria-label="Close Search Companion" onClick={onClose}>×</button></header>
      <div className="search-companion-body">
        <div className="search-companion-bubble">
          {category ? (
            <form onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              onSearch({
                category,
                name: String(data.get('name') ?? ''),
                scope: String(data.get('scope') ?? '') as SearchCriteria['scope'],
                media: data.getAll('media').map(String),
              })
            }}>
              <strong>{category === 'media' ? 'Search by file type or name.' : 'Search by any of the criteria below.'}</strong>
              {category === 'media' && <fieldset>
                <legend>File type</legend>
                {['Pictures and photos', 'Music', 'Video'].map((label) => (
                  <label key={label}><input type="checkbox" name="media" value={label} /> {label}</label>
                ))}
              </fieldset>}
              <label className="explorer-search-field">
                {category === 'documents' ? 'All or part of the document name:' : 'All or part of the file name:'}
                <input type="search" name="name" />
              </label>
              <label className="explorer-search-field">Look in:
                <select name="scope" defaultValue={category === 'all' ? current : ''}>
                  <option value="">All locations</option>
                  {folders.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <div className="search-companion-buttons">
                <button type="button" onClick={() => { setCategory(null); onReset() }}>Back</button>
                <button type="submit">Search</button>
              </div>
            </form>
          ) : <>
            <strong>What do you want to search for?</strong>
            {Object.entries(categories).map(([id, label]) => (
              <button className="search-companion-choice" type="button" key={id}
                onClick={() => setCategory(id as SearchCriteria['category'])}>
                <img src="/icons/go.png" alt="" width="14" height="14" /> {label}
              </button>
            ))}
          </>}
        </div>
        <div className="search-companion-birby" data-pose={category ?? 'welcome'} role="img" aria-label="Birby" />
      </div>
    </aside>
  )
}

