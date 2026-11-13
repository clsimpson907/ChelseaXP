import { useEffect, useId, useRef, type ReactNode } from 'react'

export default function ExplorerDialog({ title, children, onClose, onConfirm }: {
  title: string
  children: ReactNode
  onClose: () => void
  onConfirm?: () => void
}) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const dismissButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    // Enter should dismiss a confirmation by default, never delete the folder.
    dismissButton.current?.focus()
    return () => element?.close()
  }, [])

  return (
    <dialog ref={dialog} className="folder-delete-dialog" aria-labelledby={id + '-title'}
      aria-describedby={id + '-description'} onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}>
      <header id={id + '-title'}>
        {title}
        <button type="button" aria-label="Close dialog" onClick={onClose}>×</button>
      </header>
      <div className="folder-delete-content">
        <div id={id + '-description'}>{children}</div>
        <div className="folder-delete-actions" data-denied={!onConfirm}>
          {onConfirm && <button type="button" onClick={onConfirm}>Yes</button>}
          <button type="button" onClick={onClose} ref={dismissButton}>{onConfirm ? 'No' : 'OK'}</button>
        </div>
      </div>
    </dialog>
  )
}
