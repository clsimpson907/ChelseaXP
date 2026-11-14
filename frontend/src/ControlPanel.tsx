import { useEffect, useRef, useState } from 'react'
import { explorerPlaces, locations, type LocationId } from './explorerLocations'
import ChromeOverflow from './ChromeOverflow'
import ExplorerMenuBar from './ExplorerMenuBar'
import NavigationHistory from './NavigationHistory'
import TaskPane, { TaskSection } from './TaskPane'

const categories = [
  {
    id: 'feedback', label: 'Help and Support', icon: '/icons/help-and-support.png',
    items: [
      { id: 'complaints', label: 'Complaints Department', icon: '/icons/event-viewer.png' },
    ],
  },
] as const

type Location = { kind: 'home' } | { kind: 'category'; id: string } | { kind: 'item'; id: string }

export default function ControlPanel({ initialPage, openHelp, openFolder }: {
  initialPage?: 'complaints'
  openHelp: () => void
  openFolder: (id: LocationId) => void
}) {
  const [view, setView] = useState<'category' | 'classic'>('category')
  const [history, setHistory] = useState<{ entries: Location[]; index: number }>({
    entries: initialPage ? [{ kind: 'home' }, { kind: 'category', id: 'feedback' },
      { kind: 'item', id: 'complaints' }] : [{ kind: 'home' }],
    index: initialPage ? 2 : 0,
  })
  const [pendingAddress, setAddress] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showFolders, setShowFolders] = useState(false)
  const location = history.entries[history.index]
  const heading = useRef<HTMLHeadingElement>(null)
  const content = useRef<HTMLElement>(null)

  const category = location.kind === 'category'
    ? categories.find((entry) => entry.id === location.id)
    : undefined
  const items = categories.flatMap((entry) => entry.items)
  const navigationEntries = history.entries.map((entry, index) => ({
    index,
    name: entry.kind === 'home' ? 'Control Panel'
      : (entry.kind === 'category' ? categories : items).find(({ id }) => id === entry.id)?.label ?? entry.id,
  }))
  const item = location.kind === 'item' ? items.find((entry) => entry.id === location.id) : undefined
  const address = pendingAddress ?? (location.kind === 'home' ? 'home' : location.id)
  const categoryHome = location.kind === 'home' && view === 'category' && !searchOpen
  const classicHome = location.kind === 'home' && view === 'classic' && !searchOpen
  const switchLabel = view === 'category' ? 'Switch to Classic View' : 'Switch to Category View'
  const visibleItems = searchOpen
    ? items.filter(({ label }) => label.toLowerCase().includes(query.trim().toLowerCase()))
    : category?.items ?? items

  function resetContent() {
    setAddress(null)
    setSearchOpen(false)
    setQuery('')
  }

  useEffect(() => {
    content.current?.scrollTo(0, 0)
    if (location.kind !== 'home') heading.current?.focus({ preventScroll: true })
  }, [location])

  function navigate(next: Location) {
    setHistory(({ entries, index }) => ({
      entries: [...entries.slice(0, index + 1), next], index: index + 1,
    }))
    resetContent()
  }

  function switchView() {
    setView((current) => current === 'category' ? 'classic' : 'category')
    setHistory({ entries: [{ kind: 'home' }], index: 0 })
    resetContent()
  }

  function travel(index: number) {
    setHistory((current) => ({ ...current, index }))
    resetContent()
  }

  function up() {
    navigate(item ? { kind: 'category', id: 'feedback' } : { kind: 'home' })
  }

  function toggleSearch() {
    setSearchOpen(!searchOpen)
    setQuery('')
  }

  const menus = {
    File: [{ label: 'Control Panel Home', action: () => navigate({ kind: 'home' }) }],
    Edit: [{ label: 'Search', action: toggleSearch }],
    View: [{ label: switchLabel, action: switchView }],
    Favorites: [{ label: 'My Documents', action: () => openFolder('documents') }],
    Tools: [{ label: 'Folders', action: () => setShowFolders(!showFolders) }],
    Help: [{ label: 'Help and Support Center', action: openHelp }],
  }

  return (
    <div className="explorer control-panel">
      <ExplorerMenuBar label="Control Panel menus" menus={menus} />
      <div className="explorer-toolbar control-panel-toolbar" role="group" aria-label="Control Panel navigation">
        <NavigationHistory
          back={navigationEntries.slice(0, history.index).reverse()}
          forward={navigationEntries.slice(history.index + 1)}
          onSelect={travel}
        />
        <button type="button" aria-label="Up" disabled={location.kind === 'home'} onClick={up}>
          <img src="/icons/up.png" alt="" width="22" height="22" />
        </button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
        <button type="button" aria-pressed={searchOpen} onClick={toggleSearch}>
          <img src="/icons/explorer-search.png" alt="" width="22" height="22" /> Search
        </button>
        <button type="button" aria-pressed={showFolders} onClick={() => setShowFolders(!showFolders)}>
          <img src="/icons/explorer-folders.png" alt="" width="22" height="22" /> Folders
        </button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
        <label className="explorer-view-picker">
          <img src="/icons/explorer-view.png" alt="" width="22" height="22" />
          <span aria-hidden="true">▾</span>
          <select aria-label="Control Panel view" value={view} onChange={switchView}>
            <option value="category">Category View</option>
            <option value="classic">Classic View</option>
          </select>
        </label>
        <ChromeOverflow kind="toolbar" commands={[
          { label: 'Forward', icon: 'forward', disabled: history.index === history.entries.length - 1, action: () => travel(history.index + 1) },
          { label: 'Up', icon: 'up', disabled: location.kind === 'home', action: up },
          { label: 'Search', icon: 'explorer-search', action: toggleSearch },
          { label: 'Folders', icon: 'explorer-folders', action: () => setShowFolders(!showFolders) },
          { label: 'Views', icon: 'explorer-view', children: menus.View },
        ]} />
      </div>
      <form className="explorer-address-row" onSubmit={(event) => {
        event.preventDefault()
        navigate(address === 'home' ? { kind: 'home' } : address === 'feedback'
          ? { kind: 'category', id: address } : { kind: 'item', id: address })
      }}>
        <span>Address</span>
        <span className="explorer-address explorer-address--icon">
          <span className="explorer-address-parts">
            <img src="/icons/control-panel.png" alt="" width="16" height="16" />
            <span className="explorer-address-part">
              {address === 'home' ? <span>Control Panel</span> : <>
                <button type="button" onClick={() => navigate({ kind: 'home' })}>Control Panel</button>
                <span aria-hidden="true">›</span>
                <span>{address === 'feedback' ? 'Help and Support' : 'Complaints Department'}</span>
              </>}
            </span>
          </span>
          <select aria-label="Address" value={address} onChange={(event) => setAddress(event.target.value)}>
            <option value="home">Control Panel</option>
            <option value="feedback">Control Panel › Help and Support</option>
            <option value="complaints">Control Panel › Complaints Department</option>
          </select>
        </span>
        <button className="explorer-go" type="submit"><img src="/icons/go.png" alt="" width="18" height="18" /> Go</button>
      </form>
      <div className="control-panel-layout">
        <TaskPane label="Control Panel tasks">
          {!showFolders && <>
            <TaskSection title="Control Panel" icon="/icons/control-panel.png">
            <button onClick={switchView}>
              <img src="/icons/control-panel.png" alt="" width="16" height="16" /> {switchLabel}
            </button>
            </TaskSection>
            <TaskSection title="See Also">
              <button type="button" onClick={openHelp}>
                <img src="/icons/help-and-support.png" alt="" width="16" height="16" /> Help and Support
              </button>
            </TaskSection>
            </>}
          {showFolders && <TaskSection title="Folders">
            {explorerPlaces.map((id) => (
              <button key={id} type="button" onClick={() => openFolder(id)}>
                <img src={`/icons/${locations[id].icon}.png`} alt="" width="16" height="16" /> {locations[id].name}
              </button>
            ))}
          </TaskSection>}
        </TaskPane>
        <section className={`control-panel-content${categoryHome ? ' control-panel-content--categories' : classicHome ? ' control-panel-content--classic' : ''}`}
          ref={content} aria-labelledby="control-panel-heading">
          <h1 id="control-panel-heading" ref={heading} tabIndex={-1} className={classicHome ? "control-panel-hidden-heading" : undefined}>
            {searchOpen ? 'Search Control Panel' : item?.label ?? category?.label ?? (categoryHome ? 'Pick a category' : 'Control Panel')}
          </h1>
          {searchOpen && <label className="explorer-search-field">Find a Control Panel item
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>}
          {categoryHome && (
            <ul className="control-panel-categories">
              {categories.map(({ id, label, icon }) => (
                <li key={id}>
                  <button onClick={() => navigate({ kind: 'category', id })}>
                    <img src={icon} alt="" width="40" height="40" /> {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(searchOpen || (!item && !categoryHome)) && (
            <ul className="control-panel-items">
              {visibleItems.map(({ id, label, icon }) => (
                <li key={id}>
                  <button onClick={() => navigate({ kind: 'item', id })}>
                    <img src={icon} alt="" width="42" height="42" /> {label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchOpen && !visibleItems.length && <p>No matching Control Panel items.</p>}
          {!searchOpen && item?.id === 'complaints' && (
            <div className="complaints-department">
              <p>Private complaint review will be available here for authorized reviewers.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
