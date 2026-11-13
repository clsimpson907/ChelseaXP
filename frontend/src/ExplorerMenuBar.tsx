import { useState } from 'react'
import ChromeOverflow from './ChromeOverflow'

export type MenuAction = { label: string; action: () => void; disabled?: boolean }

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
          <button type="button" aria-expanded={openMenu === name}
            onClick={() => setOpenMenu(openMenu === name ? null : name)}>{name}</button>
          {openMenu === name && <div className="explorer-menu-options">
            {actions.map(({ label, action, disabled }) => (
              <button key={label} type="button" disabled={disabled}
                onClick={() => { action(); setOpenMenu(null) }}>{label}</button>
            ))}
          </div>}
        </div>
      ))}
      {/* File and Edit always fit. CSS selects which remaining menus move into overflow. */}
      <ChromeOverflow kind="menu" commands={entries.slice(2).map(([label, children]) => ({ label, children }))} />
    </div>
  )
}
