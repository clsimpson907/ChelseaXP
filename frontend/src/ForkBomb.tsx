import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react'
import BlueScreen from './BlueScreen'
import WindowControls from './WindowControls'
import WindowTitleBar from './WindowTitleBar'
import meme from './forkbomb-meme.png'
import './forkbomb.css'

const titleAndBorderHeight = 34
type Popup = { id: number; slot: number; spawnAt: number; minimized?: boolean; maximized?: boolean }
type Game = { popups: Popup[]; nextId: number; outcome: 'playing' | 'won' | 'crashed' }
type SpawnDelays = { parent: number; child: number }
type Action =
  | { type: 'close' | 'minimize' | 'toggleMaximize' | 'restore'; id: number }
  | { type: 'tick'; now: number; capacity: number; delays: Map<number, SpawnDelays> }

function startGame(now: number, delay: number): Game {
  return { popups: [{ id: 0, slot: 0, spawnAt: now + delay }], nextId: 1, outcome: 'playing' }
}

function updateGame(game: Game, action: Action): Game {
  if (game.outcome !== 'playing') return game

  if (action.type === 'close') {
    const popups = game.popups.filter(({ id }) => id !== action.id)
    return { ...game, popups, outcome: popups.length ? 'playing' : 'won' }
  }

  if (action.type !== 'tick') {
    const popup = game.popups.find(({ id }) => id === action.id)
    if (!popup) return game
    const updated = {
      ...popup,
      minimized: action.type === 'minimize',
      maximized: action.type === 'toggleMaximize' ? !popup.maximized : popup.maximized,
    }
    return { ...game, popups: [...game.popups.filter(({ id }) => id !== action.id), updated] }
  }

  const { now, capacity, delays } = action
  const occupied = new Set(game.popups.map(({ slot }) => slot))
  const children: Popup[] = []
  const parents = game.popups.map((popup) => {
    const delay = delays.get(popup.id)
    if (popup.spawnAt > now || !delay) return popup
    const parent = { ...popup, spawnAt: now + delay.parent }
    if (occupied.size === capacity) return parent

    let slot = 0
    while (occupied.has(slot)) slot++
    occupied.add(slot)
    const id = game.nextId + children.length
    children.push({ id, slot, spawnAt: now + delay.child })
    return parent
  })

  if (game.popups.length === capacity) return { ...game, outcome: 'crashed' }
  return { ...game, popups: [...parents, ...children], nextId: game.nextId + children.length }
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function spawnDelay() {
  return randomBetween(850, 1150)
}

function unevenCuts(count: number) {
  return Array.from({ length: count + 1 }, (_, index) =>
    index === 0 || index === count ? index / count : (index + randomBetween(-0.24, 0.24)) / count)
}

function createPopups(width: number, height: number) {
  const popupWidth = Math.min(width, Math.max(190, width / 4))
  const popupHeight = titleAndBorderHeight + (popupWidth - 4) * 288 / 500
  const columns = Math.ceil(width / (popupWidth * 0.85))
  const rows = Math.ceil(height / Math.max(height / 8, popupHeight * 0.85))
  const rowCuts = unevenCuts(rows)
  const minWindowWidth = Math.min(1, 112 / width)

  const positions = Array.from({ length: rows }, (_, row) => {
    const columnCuts = unevenCuts(columns)

    return Array.from({ length: columns }, (_, column) => {
      const start = Math.max(0, columnCuts[column] - randomBetween(0.08, 0.42) / columns)
      const right = Math.min(1, columnCuts[column + 1] + randomBetween(0.08, 0.42) / columns)
      const left = Math.min(start, Math.max(0, right - minWindowWidth))
      const top = Math.max(0, rowCuts[row] - randomBetween(0.08, 0.46) / rows)
      const bottom = Math.min(1, rowCuts[row + 1] + randomBetween(0.08, 0.46) / rows)

      return {
        left: left * 100 + '%',
        top: top * 100 + '%',
        width: Math.max(minWindowWidth, right - left) * 100 + '%',
        height: (bottom - top) * 100 + '%',
      }
    })
  }).flat()

  for (let index = positions.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    const position = positions[index]
    positions[index] = positions[other]
    positions[other] = position
  }

  return positions
}

export default function ForkBomb({ onContinue }: { onContinue: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const focusTarget = useRef<string | null>(null)
  const [positions] = useState(() => createPopups(window.innerWidth, window.innerHeight))
  const [game, dispatch] = useReducer(updateGame, undefined, () => startGame(performance.now(), spawnDelay()))

  useEffect(() => {
    if (game.outcome !== 'playing') return
    const element = dialog.current
    element?.showModal()
    element?.querySelector<HTMLButtonElement>('.window-close')?.focus()
    return () => element?.close()
  }, [game.outcome])

  useEffect(() => {
    if (game.outcome !== 'playing') return
    const nextSpawn = Math.min(...game.popups.map(({ spawnAt }) => spawnAt))
    const timer = window.setTimeout(() => {
      dispatch({
        type: 'tick',
        now: performance.now(),
        capacity: positions.length,
        delays: new Map(game.popups.map(({ id }) => [id, { parent: spawnDelay(), child: spawnDelay() }])),
      })
    }, Math.max(0, Math.ceil(nextSpawn - performance.now())))
    return () => window.clearTimeout(timer)
  }, [game, positions.length])

  useEffect(() => {
    if (game.outcome === 'won') onContinue()
  }, [game.outcome, onContinue])

  useLayoutEffect(() => {
    if (!focusTarget.current) return
    dialog.current?.querySelector<HTMLButtonElement>(focusTarget.current)?.focus()
    focusTarget.current = null
  }, [game])

  if (game.outcome === 'won') return null

  if (game.outcome === 'crashed') return <BlueScreen
    message="ChelseaXP has stopped forkbomb.exe."
    explanation="It made more copies of itself than the desktop knew what to do with."
    code="FORKBOMB_EXE"
    onContinue={onContinue} />

  return (
    <dialog ref={dialog} className="forkbomb" aria-label="forkbomb.exe" aria-describedby="forkbomb-instructions"
      onCancel={(event) => {
        event.preventDefault()
        onContinue()
      }}>
      <p className="forkbomb-caption" id="forkbomb-instructions">Close all windows before they fill the desktop.</p>
      {game.popups.filter(({ minimized }) => !minimized).map(({ id, slot, maximized }) => (
        <div className="window-frame forkbomb-popup" data-popup={id} data-maximized={maximized || undefined}
          key={id} style={maximized ? undefined : positions[slot]}>
          <WindowTitleBar title="forkbomb.exe">
            <WindowControls title={`forkbomb.exe window ${id + 1}`} maximized={Boolean(maximized)}
              onMinimize={() => {
                focusTarget.current = `[data-restore-popup="${id}"]`
                dispatch({ type: 'minimize', id })
              }}
              onToggleMaximize={() => dispatch({ type: 'toggleMaximize', id })}
              onClose={() => {
                const next = game.popups.filter((popup) => popup.id !== id).at(-1)
                if (next) {
                  focusTarget.current = next.minimized
                    ? `[data-restore-popup="${next.id}"]`
                    : `[data-popup="${next.id}"] .window-close`
                }
                dispatch({ type: 'close', id })
              }} />
          </WindowTitleBar>
          <img src={meme} alt="I don’t know what I expected." width="500" height="288" />
        </div>
      ))}
      {game.popups.some(({ minimized }) => minimized) && (
        <div className="forkbomb-restore-strip" role="group" aria-label="Minimized pop-ups">
          {game.popups.filter(({ minimized }) => minimized).map(({ id }) => (
            <button type="button" className="task-button" data-restore-popup={id} key={id}
              aria-label={`Restore minimized forkbomb.exe window ${id + 1}`}
              onClick={() => {
                focusTarget.current = `[data-popup="${id}"] .window-close`
                dispatch({ type: 'restore', id })
              }}>
              <span>forkbomb.exe</span>
            </button>
          ))}
        </div>
      )}
    </dialog>
  )
}
