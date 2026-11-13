import { useEffect, useId, useRef } from 'react'

export default function ExplorerItemDialog({ name, onCancel, onConfirm, operation = 'delete' }: {
  name: string
  onCancel: () => void
  onConfirm?: () => void
  operation?: 'rename' | 'delete'
}) {
  const id = useId()
  const denied = !onConfirm
  const errorTitle = operation === 'rename' ? 'Error Renaming File or Folder' : 'Error Deleting File or Folder'
  const dialog = useRef<HTMLDialogElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    cancelButton.current?.focus()
    return () => element?.close()
  }, [])

  return (
    <dialog ref={dialog} className="folder-delete-dialog" aria-labelledby={id + '-title'}
      aria-describedby={id + '-description'} onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}>
      <header id={id + '-title'}>
        {denied ? errorTitle : 'Confirm Folder Delete'}
        <button type="button" aria-label="Close dialog" onClick={onCancel}>×</button>
      </header>
      <div className="folder-delete-content">
        {denied ? (
          <div className="folder-delete-error" id={id + '-description'}>
            <img src="/icons/critical.png" alt="" width="32" height="32" />
            <p>Cannot {operation} {name}: Access is denied.</p>
          </div>
        ) : <p id={id + '-description'}>Are you sure you want to delete the folder “{name}” and all its contents?</p>}
        <div className="folder-delete-actions" data-denied={denied}>
          {onConfirm && <button type="button" onClick={onConfirm}>Yes</button>}
          <button type="button" onClick={onCancel} ref={cancelButton}>{denied ? 'OK' : 'No'}</button>
        </div>
      </div>
    </dialog>
  )
}

