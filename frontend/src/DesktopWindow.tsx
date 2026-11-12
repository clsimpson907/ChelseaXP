import { useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode, RefObject } from 'react'

type WindowBounds = { x: number; y: number; width: number; height: number }
const resizeEdges = ['n', 'e', 's', 'w', 'nw', 'ne', 'sw'] as const
type ResizeEdge = (typeof resizeEdges)[number] | 'se'
type Interaction = { kind: 'move' | ResizeEdge; pointer: number; x: number; y: number; bounds: WindowBounds }
type Props = {
  id: string
  title: string
  icon: string
  desktop: RefObject<HTMLElement | null>
  depth: number
  active: boolean
  hidden: boolean
  children: ReactNode
  onActivate: () => void
  onMinimize: () => void
  onClose: () => void
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(value, maximum))
}

export default function DesktopWindow({
  id, title, icon, desktop, depth, active, hidden, children, onActivate, onMinimize, onClose,
}: Props) {
  const panel = useRef<HTMLElement>(null)
  const interaction = useRef<Interaction | null>(null)
  const [bounds, setBounds] = useState<WindowBounds | null>(null)
  const [maximized, setMaximized] = useState(false)

  function measure(): WindowBounds | undefined {
    const workspace = desktop.current?.getBoundingClientRect()
    const current = panel.current?.getBoundingClientRect()
    if (!workspace || !current) return
    return { x: current.left - workspace.left, y: current.top - workspace.top, width: current.width, height: current.height }
  }

  function resize(start: WindowBounds, dx: number, dy: number, edge: ResizeEdge) {
    const workspace = desktop.current
    if (!workspace) return

    const fromLeft = edge.includes('w')
    const fromTop = edge.includes('n')
    const right = start.x + start.width
    const bottom = start.y + start.height
    const maxWidth = fromLeft ? right : workspace.clientWidth - start.x
    const maxHeight = fromTop ? bottom : workspace.clientHeight - start.y
    const width = fromLeft || edge.includes('e')
      ? clamp(start.width + (fromLeft ? -dx : dx), Math.min(360, maxWidth), maxWidth)
      : start.width
    const height = fromTop || edge.includes('s')
      ? clamp(start.height + (fromTop ? -dy : dy), Math.min(220, maxHeight), maxHeight)
      : start.height

    setBounds({
      x: fromLeft ? right - width : start.x,
      y: fromTop ? bottom - height : start.y,
      width,
      height,
    })
  }

  function begin(event: PointerEvent<HTMLElement>, kind: Interaction['kind']) {
    if (event.button !== 0 || (kind === 'move' && (event.target as HTMLElement).closest('button'))) return
    if (maximized || interaction.current || panel.current?.querySelector('.xp-progress')) return
    const start = measure()
    if (!start) return

    interaction.current = { kind, pointer: event.pointerId, x: event.clientX, y: event.clientY, bounds: start }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function update(event: PointerEvent<HTMLElement>) {
    const start = interaction.current
    const workspace = desktop.current
    if (!start || start.pointer !== event.pointerId || !workspace) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (start.kind !== 'move') {
      resize(start.bounds, dx, dy, start.kind)
    } else {
      setBounds({
        ...start.bounds,
        x: clamp(start.bounds.x + dx, 0, workspace.clientWidth - start.bounds.width),
        y: clamp(start.bounds.y + dy, 0, workspace.clientHeight - start.bounds.height),
      })
    }
  }

  function end(event: PointerEvent<HTMLElement>) {
    if (interaction.current?.pointer === event.pointerId) interaction.current = null
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 40 : 12
    const offsets = new Map([
      ['ArrowLeft', [-step, 0]], ['ArrowRight', [step, 0]],
      ['ArrowUp', [0, -step]], ['ArrowDown', [0, step]],
    ])
    const offset = offsets.get(event.key)
    const current = measure()
    if (!offset || !current) return
    event.preventDefault()
    resize(current, offset[0], offset[1], 'se')
  }

  return (
    <article
      id={`window-${id}`}
      className={`app-window${active ? '' : ' app-window--inactive'}${maximized ? ' app-window--maximized' : ''}`}
      data-window={id}
      aria-labelledby={`window-title-${id}`}
      ref={panel}
      tabIndex={-1}
      hidden={hidden}
      onPointerDown={onActivate}
      onFocus={onActivate}
      style={{
        zIndex: depth,
        ...(bounds && {
          left: `clamp(0px, ${bounds.x}px, calc(100% - min(${bounds.width}px, 100%)))`,
          top: `clamp(0px, ${bounds.y}px, calc(100% - min(${bounds.height}px, 100%)))`,
          width: `min(${bounds.width}px, 100%)`,
          height: `min(${bounds.height}px, 100%)`,
        }),
      }}
    >
      <div className="title-bar" onPointerDown={(event) => begin(event, 'move')}
        onPointerMove={update} onLostPointerCapture={end}>
        <span id={`window-title-${id}`}><img className="window-icon" src={icon} alt="" />{title}</span>
        <div className="window-controls">
          <button aria-label={`Minimize ${title}`} onClick={onMinimize}>−</button>
          <button className="window-maximize" aria-label={`${maximized ? 'Restore' : 'Maximize'} ${title}`}
            onClick={() => setMaximized(!maximized)}>{maximized ? '❐' : '□'}</button>
          <button aria-label={`Close ${title}`} onClick={onClose}>×</button>
        </div>
      </div>
      <div className={`window-body${id === 'about' ? ' window-body--profile' : id === 'documents' ? ' window-body--explorer' : ''}`}>
        {children}
      </div>
      {resizeEdges.map((edge) => (
        <div key={edge} className="window-resize-edge" data-edge={edge} aria-hidden="true"
          onPointerDown={(event) => begin(event, edge)} onPointerMove={update} onLostPointerCapture={end} />
      ))}
      <button
        type="button"
        className="window-resize"
        aria-label={`Resize ${title} using arrow keys`}
        title="Drag to resize, or use the arrow keys"
        onPointerDown={(event) => begin(event, 'se')}
        onPointerMove={update}
        onLostPointerCapture={end}
        onKeyDown={resizeWithKeyboard}
      />
    </article>
  )
}
