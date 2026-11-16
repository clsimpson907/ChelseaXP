type Props = {
  title: string
  maximized: boolean
  onMinimize: () => void
  onToggleMaximize: () => void
  onClose: () => void
}

export default function WindowControls({ title, maximized, onMinimize, onToggleMaximize, onClose }: Props) {
  return (
    <div className="window-controls">
      <button type="button" aria-label={`Minimize ${title}`} onClick={onMinimize}>
        <span className="window-glyph window-glyph--minimize" aria-hidden="true" />
      </button>
      <button type="button" className="window-maximize" aria-label={`${maximized ? 'Restore' : 'Maximize'} ${title}`} onClick={onToggleMaximize}>
        <span className="window-glyph" data-restore={maximized} aria-hidden="true" />
      </button>
      <button type="button" className="window-close" aria-label={`Close ${title}`} onClick={onClose}>
        <span className="window-glyph window-glyph--close" aria-hidden="true" />
      </button>
    </div>
  )
}
