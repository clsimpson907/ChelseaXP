import { useEffect, useId, useRef } from 'react'

export default function InsertDiskDialog({ drive, onClose }: { drive: string; onClose: () => void }) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const ok = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    ok.current?.focus()
    return () => element?.close()
  }, [])

  return (
    <dialog ref={dialog} className="folder-delete-dialog" aria-labelledby={id + '-title'}
      aria-describedby={id + '-message'} onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}>
      <header id={id + '-title'}>Insert Disk
        <button type="button" aria-label="Close dialog" onClick={onClose}>×</button>
      </header>
      <div className="folder-delete-content">
        <p id={id + '-message'}>Please insert a disk into drive {drive}.</p>
        <div className="folder-delete-actions" data-denied="true">
          <button type="button" ref={ok} onClick={onClose}>OK</button>
        </div>
      </div>
    </dialog>
  )
}

