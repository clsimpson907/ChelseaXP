import { useState } from 'react'
import ChromeOverflow from './ChromeOverflow'

export type MenuAction = { label: string; action: () => void; disabled?: boolean; checked?: boolean }

export default function ExplorerMenuBar({ label, menus }: {
  label: string
  menus: Record<string, MenuAction[]>
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const entries = Object.entries(menus)

  return (
    <div className="explorer-menu-bar" aria-label={label}
      onKeyDown={(event) => { if (event.key === 'Escape') setOpenMenu(null) }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null)
      }}>
      {entries.map(([name, actions]) => (
        <div className="explorer-menu" key={name} data-menu={name}>
          <button type="button" disabled={!actions.length} aria-expanded={openMenu === name}
            onClick={() => setOpenMenu(openMenu === name ? null : name)}>{name}</button>
          {openMenu === name && <div className="explorer-menu-options">
            {actions.map(({ label, action, disabled, checked }) => (
              <button key={label} type="button" disabled={disabled}
                role={checked === undefined ? undefined : 'menuitemradio'} aria-checked={checked}
                onClick={() => { action(); setOpenMenu(null) }}>{checked !== undefined && <span className="toolbar-dropdown-dot" aria-hidden="true">{checked ? '●' : ''}</span>}{label}</button>
            ))}
          </div>}
        </div>
      ))}
      {/* File and Edit always fit. CSS selects which remaining menus move into overflow. */}
      <ChromeOverflow kind="menu" commands={entries.slice(2).map(([label, children]) => ({ label, children, disabled: !children.length }))} />
    </div>
  )
}
