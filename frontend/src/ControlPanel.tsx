import { useNavigation } from './useNavigation'
import AddressPicker from './AddressPicker'
import ComplaintReview from './ComplaintReview'
import { useEffect, useId, useRef, useState } from 'react'
import { explorerPlaces, locations, type LocationId } from './explorerLocations'
import ChromeOverflow from './ChromeOverflow'
import ExplorerMenuBar from './ExplorerMenuBar'
import NavigationHistory from './NavigationHistory'
import TaskPane, { TaskSection } from './TaskPane'

const department = { id: 'complaints', label: 'Complaints Department', icon: '/icons/event-viewer.png' } as const
type Location = { kind: 'home' } | { kind: 'item'; id: typeof department.id }

export default function ControlPanel({ initialPage, openHelp, openFolder, onCaptionChange, active }: {
  active: boolean
  onCaptionChange: (caption: string) => void
  initialPage?: 'complaints'
  openHelp: () => void
  openFolder: (id: LocationId) => void
}) {
  const [view, setView] = useState<'category' | 'classic'>('category')
  const history = useNavigation<Location>(() => initialPage
    ? [{ kind: 'home' }, { kind: 'item', id: 'complaints' }] : [{ kind: 'home' }])
  const [pendingAddress, setAddress] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showFolders, setShowFolders] = useState(false)
  const location = history.current
  const headingId = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const content = useRef<HTMLElement>(null)

  const navigation = {
    ...history.destinations((entry) => entry.kind === 'home' ? 'Control Panel' : department.label),
    onSelect: travel,
  }
  const item = location.kind === 'item' ? department : undefined
  const caption = searchOpen ? 'Search Control Panel' : item?.label ?? 'Control Panel'
  useEffect(() => onCaptionChange(caption), [caption, onCaptionChange])
  const address = pendingAddress ?? (location.kind === 'home' ? 'home' : location.id)
  const categoryHome = location.kind === 'home' && view === 'category' && !searchOpen
  const classicHome = location.kind === 'home' && view === 'classic' && !searchOpen
  const switchLabel = view === 'category' ? 'Switch to Classic View' : 'Switch to Category View'
  const matchesSearch = department.label.toLowerCase().includes(query.trim().toLowerCase())

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
    history.push(next)
    resetContent()
  }

  function switchView() {
    setView((current) => current === 'category' ? 'classic' : 'category')
    history.reset({ kind: 'home' })
    resetContent()
  }

  function travel(index: number) {
    history.select(index)
    resetContent()
  }

  function up() {
    navigate({ kind: 'home' })
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
      <ExplorerMenuBar label="Control Panel menus" menus={item ? { File: menus.File, Edit: menus.Edit, Help: menus.Help } : menus} />
      <div className="explorer-toolbar control-panel-toolbar" role="group" aria-label="Control Panel navigation">
        <NavigationHistory {...navigation} />
        <button type="button" aria-label="Up" data-tooltip="Up one level" disabled={location.kind === 'home'} onClick={up}>
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
        <label className="explorer-view-picker" data-tooltip="Control Panel view">
          <img src="/icons/explorer-view.png" alt="" width="22" height="22" />
          <span aria-hidden="true">▾</span>
          <select aria-label="Control Panel view" value={view} onChange={switchView}>
            <option value="category">Category View</option>
            <option value="classic">Classic View</option>
          </select>
        </label>
        <ChromeOverflow kind="toolbar" commands={[
          { label: 'Forward', icon: 'forward', disabled: !navigation.forward.length, action: () => travel(navigation.forward[0].index) },
          { label: 'Up', icon: 'up', disabled: location.kind === 'home', action: up },
          { label: 'Search', icon: 'explorer-search', action: toggleSearch },
          { label: 'Folders', icon: 'explorer-folders', action: () => setShowFolders(!showFolders) },
          { label: 'Views', icon: 'explorer-view', children: menus.View },
        ]} />
      </div>
      <form className="explorer-address-row" onSubmit={(event) => {
        event.preventDefault()
        navigate(address === 'home' ? { kind: 'home' } : { kind: 'item', id: department.id })
      }}>
        <span>Address</span>
        <span className="explorer-address explorer-address--icon">
          <span className="explorer-address-parts">
            <img src="/icons/control-panel.png" alt="" width="16" height="16" />
            <span className="explorer-address-part">
              {address === 'home' ? <span>Control Panel</span> : <>
                <button type="button" onClick={() => navigate({ kind: 'home' })}>Control Panel</button>
                <span aria-hidden="true">›</span>
                <span>{department.label}</span>
              </>}
            </span>
          </span>
          <AddressPicker value={address} onChange={setAddress} entries={[
            { id: 'home', name: 'Control Panel', icon: 'control-panel', depth: 0 },
            { id: department.id, name: department.label, icon: 'event-viewer', depth: 1 },
          ]} />
        </span>
        <button className="explorer-go" type="submit"><img src="/icons/go.png" alt="" width="18" height="18" /> Go</button>
      </form>
      <div className={item ? "control-panel-layout control-panel-layout--department" : "control-panel-layout"}>
        {!item && <TaskPane label="Control Panel tasks">
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
        </TaskPane>}
        <section className={`control-panel-content${categoryHome ? ' control-panel-content--categories' : classicHome ? ' control-panel-content--classic' : ''}`}
          ref={content} aria-labelledby={headingId}>
          <h1 id={headingId} ref={heading} tabIndex={-1} className={classicHome ? "control-panel-hidden-heading" : undefined}>
            {searchOpen ? 'Search Control Panel' : item?.label ?? (categoryHome ? 'Pick a category' : 'Control Panel')}
          </h1>
          {searchOpen && <label className="explorer-search-field">Find a Control Panel item
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>}
          {(searchOpen ? matchesSearch : !item) && (
            <ul className={categoryHome ? "control-panel-categories" : "control-panel-items"}>
              <li>
                <button type="button" onClick={() => navigate({ kind: 'item', id: department.id })}>
                  <img src={department.icon} alt="" width="40" height="40" /> <span>{department.label}</span>
                </button>
              </li>
            </ul>
          )}
          {searchOpen && !matchesSearch && <p>No matching Control Panel items.</p>}
          {!searchOpen && item?.id === 'complaints' && (
            <div className="complaints-department">
              <ComplaintReview active={active} help={menus.Help} navigation={navigation} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
