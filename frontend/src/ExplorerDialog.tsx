import { useId, useRef, type MouseEventHandler, type ReactNode } from 'react'
import DialogFrame from './DialogFrame'

export default function ExplorerDialog({ title, children, onClose, onConfirm }: {
  title: string
  children: ReactNode
  onClose: () => void
  onConfirm?: MouseEventHandler<HTMLButtonElement>
}) {
  const id = useId()
  const confirmButton = useRef<HTMLButtonElement>(null)
  const dismissButton = useRef<HTMLButtonElement>(null)

  return (
    <DialogFrame title={title} descriptionId={id + '-description'}
      initialFocus={onConfirm ? confirmButton : dismissButton} onClose={onClose} onKeyDown={(event) => {
        if (!onConfirm || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
        event.preventDefault()
        const button = event.key === 'ArrowLeft' ? confirmButton : dismissButton
        button.current?.focus()
      }}>
      <div className="folder-delete-content">
        <div id={id + '-description'}>{children}</div>
        <div className="folder-delete-actions" data-denied={!onConfirm}>
          {onConfirm && <button type="button" onClick={onConfirm} ref={confirmButton}>Yes</button>}
          <button type="button" onClick={onClose} ref={dismissButton}>{onConfirm ? 'No' : 'OK'}</button>
        </div>
      </div>
    </DialogFrame>
  )
}
