function HistoryDropdown({ label, entries, onSelect }: {
  label: string
  entries: { name: string; index: number }[]
  onSelect: (index: number) => void
}) {
  return (
    <span className="explorer-history" data-disabled={entries.length === 0}>
      <select aria-label={label} title={label} disabled={entries.length === 0} value=""
        onChange={(event) => { if (event.target.value) onSelect(Number(event.target.value)) }}>
        <option value="" disabled>{label}</option>
        {entries.map(({ name, index }) => <option key={index} value={index}>{name}</option>)}
      </select>
    </span>
  )
}

type HistoryEntry = { name: string; index: number }

export default function NavigationHistory({ back, forward, onSelect }: {
  back: HistoryEntry[]
  forward: HistoryEntry[]
  onSelect: (index: number) => void
}) {
  return ([
    { label: 'Back', icon: 'back', entries: back },
    { label: 'Forward', icon: 'forward', entries: forward },
  ].map(({ label, icon, entries }) => (
    <div className="explorer-history-group" key={icon}>
      <button type="button" aria-label={label} disabled={!entries.length} onClick={() => onSelect(entries[0].index)}>
        <img src={'/icons/' + icon + '.png'} alt="" width="22" height="22" />
        {icon === 'back' && 'Back'}
      </button>
      <HistoryDropdown label={label + ' history'} entries={entries} onSelect={onSelect} />
    </div>
  )))
}
