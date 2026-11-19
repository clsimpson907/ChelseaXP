import { useId, useRef, type RefObject } from 'react'

import { positionToolbarPopup } from './positionToolbarPopup'

type Option = { label: string; action: () => void; checked?: boolean; disabled?: boolean }

export default function ToolbarDropdown({ label, icon, options, fieldAnchor, disabled = false }: {
  label: string
  icon?: string
  options: Option[]
  fieldAnchor?: RefObject<HTMLElement | null>
  disabled?: boolean
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)

  return (
    <div className={icon ? 'explorer-view-picker' : 'explorer-history'}>
      <button ref={trigger} type="button" aria-label={label} aria-haspopup="menu"
        data-tooltip={fieldAnchor ? undefined : label} popoverTarget={id} disabled={disabled || options.length === 0}>
        {icon && <img src={icon} alt="" width="22" height="22" />}
        <span className="toolbar-dropdown-arrow" aria-hidden="true" />
      </button>
      <div id={id} className={`xp-overflow-popup toolbar-dropdown-menu${fieldAnchor ? ' field-dropdown-menu' : ''}`} popover="auto"
        role="menu" aria-label={label}
        onToggle={(event) => {
          if (event.newState !== 'open' || !trigger.current) return
          const menu = event.currentTarget
          const anchor = fieldAnchor?.current
          if (anchor) menu.style.width = anchor.getBoundingClientRect().width + 'px'
          positionToolbarPopup(menu, anchor ?? trigger.current)
          const initial = menu.querySelector<HTMLButtonElement>('[aria-checked="true"]') ??
            menu.querySelector<HTMLButtonElement>('button')
          initial?.focus({ preventScroll: true })
        }}
        onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
          event.preventDefault()
          const buttons = Array.from(event.currentTarget.querySelectorAll('button'))
          const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
          const last = buttons.length - 1
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? last
            : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
          buttons[next]?.focus()
        }}>
        {options.map(({ label: option, checked, action, disabled }, index) => (
          <button key={index} type="button" role={checked === undefined ? 'menuitem' : 'menuitemradio'}
            aria-checked={checked} disabled={disabled} tabIndex={-1} onClick={(event) => {
              event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()
              trigger.current?.focus({ preventScroll: true })
              action()
            }}>
            {checked !== undefined && <span className="toolbar-dropdown-dot" aria-hidden="true">{checked ? '●' : ''}</span>}
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
