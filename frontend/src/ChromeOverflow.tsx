import { useId, useRef, useState } from 'react'
import { positionToolbarPopup } from './positionToolbarPopup'

export type OverflowCommand = {
  label: string
  action?: () => void
  checked?: boolean
  disabled?: boolean
  icon?: string
  children?: OverflowCommand[]
}

export default function ChromeOverflow({ kind, commands }: {
  kind: 'menu' | 'toolbar'
  commands: OverflowCommand[]
}) {
  const id = useId()
  const popup = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [submenu, setSubmenu] = useState<string | null>(null)
  const [left, setLeft] = useState(false)

  function close() {
    popup.current?.hidePopover()
    trigger.current?.focus()
  }

  return (
    <div className={`chrome-overflow ${kind}-overflow`}>
      <button className="overflow-trigger" ref={trigger} type="button" popoverTarget={id}
        aria-label={kind === 'menu' ? 'More menu commands' : 'More navigation controls'}
        data-tooltip={kind === 'toolbar' ? 'More navigation controls' : undefined}>»</button>
      <div className="xp-overflow-popup" id={id} popover="auto" ref={popup} data-left={left}
        onToggle={(event) => {
          if (event.newState === 'open' && trigger.current) {
            setLeft(positionToolbarPopup(event.currentTarget, trigger.current))
          }
          else setSubmenu(null)
        }}>
        {commands.map((command) => (
          <div className="xp-overflow-entry" key={command.label} data-menu={command.label}>
            <button type="button" disabled={command.disabled}
              aria-expanded={command.children ? submenu === command.label : undefined}
              onPointerEnter={() => setSubmenu(command.children ? command.label : null)}
              onClick={() => {
                if (command.children) setSubmenu(command.label)
                else { close(); command.action?.() }
              }}>
              {kind === 'toolbar' && <span className="xp-overflow-icon">
                {command.icon && <img src={'/icons/' + command.icon + '.png'} alt="" width="20" height="20" />}
              </span>}
              <span>{command.label}</span>
              {command.children && <span className="xp-overflow-arrow" aria-hidden="true">▸</span>}
            </button>
            {command.children && submenu === command.label && <div className="xp-overflow-submenu">
              {command.children.map((child) => (
                <button key={child.label} type="button" disabled={child.disabled}
                  role={child.checked === undefined ? undefined : 'menuitemradio'} aria-checked={child.checked} onClick={() => {
                  close()
                  child.action?.()
                }}>{child.checked !== undefined && <span className="toolbar-dropdown-dot" aria-hidden="true">{child.checked ? '●' : ''}</span>}{child.label}</button>
              ))}
            </div>}
          </div>
        ))}
      </div>
    </div>
  )
}
