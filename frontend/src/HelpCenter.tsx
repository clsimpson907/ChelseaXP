import NavigationHistory from './NavigationHistory'
import { Fragment, useEffect, useId, useRef, useState } from 'react'
import ChromeOverflow from './ChromeOverflow'
import guide from '../../docs/user-guide.md?raw'

// Facts from Cats Protection's guides to whiskers, ears, purring, and sleep,
// and Cornell Feline Health Center's guide to cat teeth.
const catFacts = [
  'Most cats have 12 whiskers on each cheek.',
  'Cats have whiskers above their eyes as well as beside their noses.',
  'Cats have whiskers on the backs of their front legs.',
  'A cat’s whiskers can pick up tiny movements in the air.',
  'Whiskers are made of keratin, the same protein found in hair and claws.',
  'A naturally shed whisker can grow back.',
  'Forward-pointing whiskers can be a sign that a cat is curious.',
  'Cats use their whiskers to feel out narrow spaces.',
  'The little fold along the edge of a cat’s ear is called Henry’s pocket.',
  'The tufts of fur inside a cat’s ears are called ear furnishings.',
  'Kittens can purr from birth.',
  'Kittens use purring to communicate with their mother.',
  'Cats can purr when they’re stressed as well as when they’re relaxed.',
  'A relaxed cat may return your slow blink.',
  'Cats go through REM sleep, just as people do.',
  'A sleeping cat may twitch its whiskers or paws during REM sleep.',
  'An adult cat has 30 permanent teeth.',
  'By about six months old, a kitten usually has its adult teeth.',
  'Our pet cats descend from the African wildcat.',
  'Cats that are comfortable with each other sometimes groom one another.',
]

const topics = guide.trim().split(/^## /m).slice(1).map((section) => {
  const [title, ...lines] = section.trim().split(/\r?\n/)
  return { title, body: lines.join('\n').trim() }
})

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>
    return <Fragment key={index}>{part}</Fragment>
  })
}

function GuideArticle({ body }: { body: string }) {
  return body.split(/\n\s*\n/).map((block, index) => {
    const lines = block.split('\n')
    if (block.startsWith('|')) {
      const rows = lines.map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
      return <dl key={index}>{rows.slice(2).map(([code, meaning]) => (
        <Fragment key={code}><dt>{inline(code)}</dt><dd>{inline(meaning)}</dd></Fragment>
      ))}</dl>
    }
    if (/^(- |\d+\. )/.test(block)) {
      const List = block.startsWith('- ') ? 'ul' : 'ol'
      return <List key={index}>{lines.map((line) => <li key={line}>{inline(line.replace(/^(- |\d+\. )/, ''))}</li>)}</List>
    }
    return <p key={index}>{inline(block)}</p>
  })
}

export default function HelpCenter({ openComplaints, openDepartment, initialTopic, onCaptionChange }: {
  onCaptionChange: (caption: string) => void
  initialTopic?: string
  openComplaints: () => void
  openDepartment: () => void
}) {
  const [history, setHistory] = useState<{ entries: string[]; index: number }>(initialTopic ? { entries: ['', initialTopic], index: 1 } : { entries: [''], index: 0 })
  const [catFact] = useState(() => catFacts[Math.floor(Math.random() * catFacts.length)])
  const [search, setSearch] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selection, setSelection] = useState('')
  const searchId = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const page = history.entries[history.index]
  const topic = topics.find(({ title }) => title === page)
  const query = page.startsWith('?') ? page.slice(1) : ''
  const matches = query ? topics.filter(({ title, body }) => (title + ' ' + body).toLowerCase().includes(query.toLowerCase())) : topics

  function focusPage() {
    requestAnimationFrame(() => heading.current?.focus())
  }

  function navigate(next: string) {
    if (next === page) return
    setSelection('')
    setKeyword('')
    setHistory(({ entries, index }) => ({ entries: [...entries.slice(0, index + 1), next], index: index + 1 }))
    focusPage()
  }

  function travel(index: number) {
    setSelection('')
    setKeyword('')
    setHistory((current) => ({ ...current, index }))
    focusPage()
  }

  const [favorites, setFavorites] = useState<string[]>([])
  const showFavorites = page === 'favorites'
  const showIndex = page === 'index'
  const showHistory = page === 'history'
  const showSupport = page === 'support'
  const sectionTitle = showIndex ? 'Index' : showFavorites ? 'Favorites' : showHistory ? 'History' : 'Support'
  const caption = topic?.title ?? (query ? 'Search results' : page ? sectionTitle : 'Help and Support Center')
  useEffect(() => onCaptionChange(caption), [caption, onCaptionChange])
  const sectionTopics = showIndex
    ? topics.map(({ title }) => title).filter((title) => title.toLowerCase().includes(keyword.trim().toLowerCase())).sort()
    : showFavorites ? favorites
      : [...new Set(history.entries.filter((entry) => topics.some(({ title }) => title === entry)))].reverse()
  const selectedTopic = sectionTopics.includes(selection) ? selection : ''

  const navigationEntries = history.entries.map((entry, index) => ({
    index,
    name: entry.startsWith('?') ? 'Search results for ' + entry.slice(1)
      : ({ '': 'Home', index: 'Index', favorites: 'Favorites', history: 'History', support: 'Support' } as Record<string, string>)[entry] ?? entry,
  }))
  const groups = ['desktop', 'new-folder', 'control-panel', 'mail']
  const topicIcons: Record<string, string> = {
    'Using the desktop': 'desktop',
    'Using a phone': 'user-accounts',
    'Finding files and folders': 'explorer-search',
    'Making a mess in Explorer': 'new-folder',
    'Using Control Panel': 'control-panel',
    'Getting help': 'help-and-support',
    'Sending a complaint': 'mail',
    'About, contact, and credits': 'document',
  }

  function topicButton(title: string) {
    return (
      <button type="button" onClick={() => navigate(title)}>
        <img className="help-topic-row-icon" src={'/icons/' + (topicIcons[title] ?? 'document') + '.png'} alt="" width="24" height="24" />
        {title}
      </button>
    )
  }

  return (
    <div className="help-center">
      <nav className="explorer-toolbar help-main-toolbar" aria-label="Help and Support navigation">
        <NavigationHistory
          back={navigationEntries.slice(0, history.index).reverse()}
          forward={navigationEntries.slice(history.index + 1)}
          onSelect={travel}
        />
        <button type="button" onClick={() => navigate('')} aria-label="Home" data-tooltip="Home"><img width="22" height="22" src="/icons/help-home.png" alt="" /></button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
        <button type="button" onClick={() => navigate('index')}><img width="22" height="22" src="/icons/help-index.png" alt="" /> Index</button>
        <button type="button" onClick={() => navigate('favorites')}><img width="22" height="22" src="/icons/help-favorites.png" alt="" /> Favorites</button>
        <button type="button" onClick={() => navigate('history')}><img width="22" height="22" src="/icons/help-history.png" alt="" /> History</button>
        <span className="explorer-toolbar-divider" aria-hidden="true" />
        <button type="button" onClick={() => navigate('support')}><img width="22" height="22" src="/icons/help-support.png" alt="" /> Support</button>
        <ChromeOverflow kind="toolbar" commands={[
          { label: 'Favorites', icon: 'help-favorites', action: () => navigate('favorites') },
          { label: 'History', icon: 'help-history', action: () => navigate('history') },
          { label: 'Support', icon: 'help-support', action: () => navigate('support') },
        ]} />
      </nav>
      <header className="help-banner">
        <form onSubmit={(event) => {
          event.preventDefault()
          if (search.trim()) navigate('?' + search.trim())
        }}>
          <label htmlFor={searchId}>Search</label>
          <input id={searchId} type="search" required value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="submit" aria-label="Search" data-tooltip="Search"><img src="/icons/go.png" alt="" width="24" height="24" /></button>
        </form>
        <div className="help-brand">
          <p><img src="/icons/help-and-support.png" alt="" width="24" height="24" /> Help and Support Center</p>
          <small>ChelseaXP User’s Guide</small>
        </div>
      </header>
      {topic ? (
        <div className="help-reading">
          <aside className="help-contents" aria-label="Guide contents">
            <section>
              <h2>ChelseaXP User’s Guide</h2>
              <ul>{topics.map(({ title }) => (
                <li key={title}>
                  <button type="button" aria-current={title === topic.title ? 'page' : undefined} onClick={() => navigate(title)}>{title}</button>
                </li>
              ))}</ul>
            </section>
            <section className="help-see-also">
              <h2>See Also</h2>
              <ul>
                <li><button type="button" onClick={() => navigate('index')}>Guide index</button></li>
                <li><button type="button" onClick={() => navigate('support')}>Help and support</button></li>
              </ul>
            </section>
          </aside>
          <div className="help-reading-pane">
            <div className="help-toolbar help-article-toolbar" role="group" aria-label="Article actions">
              <button type="button" aria-pressed={favorites.includes(topic.title)} onClick={() => setFavorites((current) =>
                current.includes(topic.title) ? current.filter((title) => title !== topic.title) : [...current, topic.title]
              )}><img width="22" height="22" src="/icons/help-favorites.png" alt="" /> {favorites.includes(topic.title) ? 'Remove from Favorites' : 'Add to Favorites'}</button>
            </div>
            <article className="help-article">
              <h1 ref={heading} tabIndex={-1}>{topic.title}</h1>
              <GuideArticle body={topic.body} />
            </article>
          </div>
        </div>
      ) : showIndex || showFavorites || showHistory || showSupport ? (
        <div className={showFavorites || showHistory ? "help-reading help-directory help-saved-topics" : "help-reading help-directory"}>
          <aside className="help-contents" aria-label={sectionTitle}>
            <section>
              <h2>{sectionTitle}</h2>
              {showSupport ? (
                <ul>
                  <li><button type="button" onClick={openComplaints}>Submit a complaint</button></li>
                </ul>
              ) : (
                <form className="help-directory-form" onSubmit={(event) => {
                  event.preventDefault()
                  if (selectedTopic) navigate(selectedTopic)
                }}>
                  {showIndex && <label>Type in the keyword to find:
                    <input value={keyword} onChange={(event) => {
                      setKeyword(event.target.value)
                      setSelection('')
                    }} />
                  </label>}
                  <select aria-label={sectionTitle + ' topics'} size={8} value={selectedTopic}
                    onChange={(event) => setSelection(event.target.value)}
                    onDoubleClick={() => { if (selectedTopic) navigate(selectedTopic) }}>
                    {sectionTopics.map((title) => <option key={title} value={title}>{title}</option>)}
                  </select>
                  <div className="help-directory-actions">
                    {showFavorites && <button type="button" disabled={!selectedTopic} onClick={() => {
                      setFavorites((current) => current.filter((title) => title !== selectedTopic))
                      setSelection('')
                    }}>Remove</button>}
                    <button type="submit" disabled={!selectedTopic}>Display</button>
                  </div>
                </form>
              )}
            </section>
            {showSupport && <section className="help-see-also">
              <h2>See Also</h2>
              <ul><li><button type="button" onClick={openDepartment}>Complaints Department</button></li></ul>
            </section>}
          </aside>
          <div className="help-reading-pane">
            <article className="help-article">
              <h1 ref={heading} tabIndex={-1}>{showSupport ? 'Welcome to Support' : sectionTitle}</h1>
              <p>{showIndex ? 'Find a guide topic by keyword or select one from the Index.'
                : showFavorites ? 'Find guide topics you added to Favorites.'
                  : showHistory ? 'Open a guide topic you’ve read before.'
                    : 'Choose Submit a complaint to send me a private message.'}</p>
            </article>
          </div>
        </div>
      ) : (
        <div className="help-home">
          <section>
            <h1 ref={heading} tabIndex={-1}>{query ? 'Search results' : 'Pick a Help topic'}</h1>
            {page === '' ? groups.map((group, index) => (
              <div className="help-topic-group" key={index}>
                <img src={"/icons/" + group + ".png"} alt="" width="40" height="40" />
                <ul>{topics.slice(index * 2, index === groups.length - 1 ? undefined : index * 2 + 2).map(({ title }) => <li key={title}>{topicButton(title)}</li>)}</ul>
              </div>
            )) : matches.length ? (
              <ul>{matches.map(({ title }) => <li key={title}>{topicButton(title)}</li>)}</ul>
            ) : <p>No guide topics matched your search.</p>}
          </section>
          <section className="help-assistance">
            <h2>Ask for assistance</h2>
            <ul className="help-tasks">
              <li><button type="button" onClick={openComplaints}><img src="/icons/go.png" alt="" /> Submit a complaint</button></li>
            </ul>
            <h2>Pick a task</h2>
            <ul className="help-tasks">
              <li><button type="button" onClick={openDepartment}><img src="/icons/go.png" alt="" /> Complaints Department</button></li>
            </ul>
            <h2>Did you know?</h2>
            <p>{catFact}</p>
          </section>
        </div>
      )}
    </div>
  )
}
