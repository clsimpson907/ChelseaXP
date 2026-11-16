import { useEffect, useId, useRef, type KeyboardEventHandler, type ReactNode, type RefObject } from 'react'
import WindowControls from './WindowControls'
import WindowTitleBar from './WindowTitleBar'

export default function DialogFrame({ title, descriptionId, initialFocus, onClose, onKeyDown, onHelp, className, children }: {
  title: string
  className?: string
  descriptionId?: string
  initialFocus?: RefObject<HTMLElement | null>
  onClose: () => void
  onKeyDown?: KeyboardEventHandler<HTMLDialogElement>
  onHelp?: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    initialFocus?.current?.focus({ preventScroll: true })
    return () => element?.close()
  }, [initialFocus])

  return (
    <dialog ref={dialog} className={`window-frame modal-window${className ? ' ' + className : ''}`} aria-labelledby={titleId}
      aria-describedby={descriptionId} onKeyDown={onKeyDown} onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}>
      <WindowTitleBar title={title} titleId={titleId}>
        <WindowControls title={title} closeLabel="Close dialog" onHelp={onHelp} onClose={onClose} />
      </WindowTitleBar>
      {children}
    </dialog>
  )
}
