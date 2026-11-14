import { useEffect, useId, useRef } from 'react'

export default function BlueScreen({ message, explanation, code, onContinue }: {
  message: string
  explanation: string
  code: string
  onContinue: () => void
}) {
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog className="complaints-blue-screen" ref={dialog}
      aria-labelledby={id + '-title'} aria-describedby={id + '-message'}
      onClick={onContinue}
      onKeyDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onContinue()
      }}
      onCancel={(event) => {
        event.preventDefault()
        onContinue()
      }}>
      <div className="crash-content">
        <h1 id={id + '-title'}>ChelseaXP</h1>
        <p>{message}</p>
        <p id={id + '-message'}>{explanation}</p>
        <p>Error: CXP : {code}</p>
        <button type="button">Press any key or click to continue <span aria-hidden="true">_</span></button>
      </div>
    </dialog>
  )
}
