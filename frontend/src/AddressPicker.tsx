import { useId, useRef } from 'react'

export default function AddressPicker<Id extends string>({ entries, value, onChange }: {
  entries: { id: Id; name: string; icon: string; depth: number }[]
  value: Id
  onChange: (id: Id) => void
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)

  return <>
    <button ref={trigger} type="button" className="explorer-address-toggle" popoverTarget={id} aria-label="Address" />
    <div id={id} className="explorer-address-popup" popover="auto"
      onToggle={(event) => {
        if (event.newState !== 'open') return
        const popup = event.currentTarget
        const anchor = trigger.current?.getBoundingClientRect()
        if (!anchor) return
        popup.style.width = anchor.width + 2 + 'px'
        popup.style.left = anchor.left - 1 + 'px'
        const below = window.innerHeight - anchor.bottom
        const above = anchor.top
        const openAbove = popup.scrollHeight > below && above > below
        popup.style.maxHeight = Math.max(0, (openAbove ? above : below) - 2) + 'px'
        popup.style.top = (openAbove ? anchor.top - popup.offsetHeight : anchor.bottom + 1) + 'px'
        popup.querySelector<HTMLButtonElement>('[aria-current="true"]')?.focus()
      }}
      onKeyDown={(event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const buttons = Array.from(event.currentTarget.querySelectorAll('button'))
        const index = buttons.findIndex((button) => button === document.activeElement)
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : Math.max(0, Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))
        buttons[next]?.focus()
      }}>
      {entries.map(({ id: entryId, name, icon, depth }) => (
        <button key={entryId} type="button" aria-current={entryId === value ? 'true' : undefined}
          style={{ paddingInlineStart: 3 + depth * 12 }} onClick={(event) => {
            onChange(entryId)
            event.currentTarget.parentElement?.hidePopover()
            trigger.current?.focus()
          }}>
          <img src={'/icons/' + icon + '.png'} alt="" width="16" height="16" />
          <span>{name}</span>
        </button>
      ))}
    </div>
  </>
}
