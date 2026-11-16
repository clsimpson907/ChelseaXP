type Props = {
  title: string
  maximized?: boolean
  onMinimize?: () => void
  onToggleMaximize?: () => void
  onClose: () => void
  onHelp?: () => void
  closeLabel?: string
}

export default function WindowControls({ title, maximized = false, onMinimize, onToggleMaximize, onClose, onHelp, closeLabel }: Props) {
  return (
    <div className="window-controls">
      {onMinimize && <button type="button" aria-label={`Minimize ${title}`} onClick={onMinimize}>
        <span className="window-glyph window-glyph--minimize" aria-hidden="true" />
      </button>}
      {onToggleMaximize && <button type="button" className="window-maximize" aria-label={`${maximized ? 'Restore' : 'Maximize'} ${title}`} onClick={onToggleMaximize}>
        <span className="window-glyph" data-restore={maximized} aria-hidden="true" />
      </button>}
      {onHelp && <button type="button" aria-label={`Help with ${title}`} onClick={onHelp}>?</button>}
      <WindowCloseButton label={closeLabel ?? `Close ${title}`} onClose={onClose} />
    </div>
  )
}

function WindowCloseButton({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <button type="button" className="window-close" aria-label={label} onClick={onClose}>
      <span className="window-glyph window-glyph--close" aria-hidden="true" />
    </button>
  )
}
