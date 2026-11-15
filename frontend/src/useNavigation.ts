import { useState } from 'react'

export function useNavigation<T>(initial: () => T[]) {
  const [history, setHistory] = useState(() => {
    const entries = initial()
    return { entries, index: entries.length - 1 }
  })

  function push(entry: T) {
    setHistory(({ entries, index }) => ({
      entries: [...entries.slice(0, index + 1), entry], index: index + 1,
    }))
  }

  function select(index: number) {
    setHistory((current) => index >= 0 && index < current.entries.length ? { ...current, index } : current)
  }

  function reset(entry: T) {
    setHistory({ entries: [entry], index: 0 })
  }

  function destinations(nameOf: (entry: T) => string | undefined) {
    const entries = history.entries.flatMap((entry, index) => {
      const name = nameOf(entry)
      return name === undefined ? [] : [{ name, index }]
    })
    return {
      back: entries.filter(({ index }) => index < history.index).reverse(),
      forward: entries.filter(({ index }) => index > history.index),
    }
  }

  return { entries: history.entries, current: history.entries[history.index], push, select, reset, destinations }
}
