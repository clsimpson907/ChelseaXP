export type PublicCopy = { subject: string; message: string }

let publishedCopies: Partial<Record<number, PublicCopy>> = {}
const listeners = new Set<() => void>()

export function subscribeToPublishedCopies(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getPublishedCopies() {
  return publishedCopies
}

export function publishCopy(id: number, copy: PublicCopy) {
  if (publishedCopies[id]) return
  publishedCopies = { ...publishedCopies, [id]: copy }
  listeners.forEach((listener) => listener())
}
