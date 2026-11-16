import { useEffect, useId, useRef, type MouseEventHandler, type ReactNode } from 'react'
import { WindowCloseButton } from './WindowControls'

export default function ExplorerDialog({ title, children, onClose, onConfirm }: {
  title: string
  children: ReactNode
  onClose: () => void
  onConfirm?: MouseEventHandler<HTMLButtonElement>
}) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const confirmButton = useRef<HTMLButtonElement>(null)
  const dismissButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    const initialButton = confirmButton.current ?? dismissButton.current
    initialButton?.focus()
    return () => element?.close()
  }, [])

  return (
    <dialog ref={dialog} className="folder-delete-dialog" aria-labelledby={id + '-title'}
      aria-describedby={id + '-description'} onCancel={(event) => {
        event.preventDefault()
        onClose()
      }} onKeyDown={(event) => {
        if (!onConfirm || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
        event.preventDefault()
        const button = event.key === 'ArrowLeft' ? confirmButton : dismissButton
        button.current?.focus()
      }}>
      <header id={id + '-title'}>
        {title}
        <div className="window-controls">
          <WindowCloseButton label="Close dialog" onClose={onClose} />
        </div>
      </header>
      <div className="folder-delete-content">
        <div id={id + '-description'}>{children}</div>
        <div className="folder-delete-actions" data-denied={!onConfirm}>
          {onConfirm && <button type="button" onClick={onConfirm} ref={confirmButton}>Yes</button>}
          <button type="button" onClick={onClose} ref={dismissButton}>{onConfirm ? 'No' : 'OK'}</button>
        </div>
      </div>
    </dialog>
  )
}
