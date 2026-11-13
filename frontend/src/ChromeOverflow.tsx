import { useId, useRef, useState } from 'react'

export type OverflowCommand = {
  label: string
  action?: () => void
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

  function position() {
    const panel = popup.current
    const button = trigger.current
    if (!panel || !button || !panel.matches(':popover-open')) return
    const anchor = button.getBoundingClientRect()
    const width = panel.offsetWidth
    const height = panel.offsetHeight
    const x = anchor.left + width <= window.innerWidth - 4 ? anchor.left : anchor.right - width
    panel.style.left = Math.max(4, x) + 'px'
    panel.style.top = Math.max(4, Math.min(anchor.bottom, window.innerHeight - height - 4)) + 'px'
    setLeft(x + width * 2 > window.innerWidth - 4)
  }

  return (
    <div className={`chrome-overflow ${kind}-overflow`}>
      <button className="overflow-trigger" ref={trigger} type="button" popoverTarget={id}
        aria-label={kind === 'menu' ? 'More menu commands' : 'More navigation controls'}>»</button>
      <div className="xp-overflow-popup" id={id} popover="auto" ref={popup} data-left={left}
        onToggle={(event) => {
          if (event.newState === 'open') position()
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
                <button key={child.label} type="button" disabled={child.disabled} onClick={() => {
                  close()
                  child.action?.()
                }}>{child.label}</button>
              ))}
            </div>}
          </div>
        ))}
      </div>
    </div>
  )
}
