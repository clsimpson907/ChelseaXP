import ToolbarDropdown from './ToolbarDropdown'

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
      <button type="button" aria-label={label} data-tooltip={entries.length ? label + ' to ' + entries[0].name : undefined} disabled={!entries.length} onClick={() => onSelect(entries[0].index)}>
        <img src={'/icons/' + icon + '.png'} alt="" width="22" height="22" />
        {icon === 'back' && 'Back'}
      </button>
      <ToolbarDropdown label={label + ' history'}
        options={entries.map(({ name, index }) => ({ label: name, action: () => onSelect(index) }))} />
    </div>
  )))
}
