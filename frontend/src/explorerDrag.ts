import type { DragEvent } from 'react'
import type { FolderId } from './explorerLocations'

const itemType = 'application/x-chelseaxp-item'

export function dragItem(id: string) {
  return {
    draggable: true,
    onDragStart(event: DragEvent) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(itemType, id)
    },
  }
}

export function dropItem(destination: FolderId, move: (id: string, parent: FolderId, now: number) => void) {
  return {
    onDragOver(event: DragEvent) {
      if (!event.dataTransfer.types.includes(itemType)) return
      event.stopPropagation()
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    },
    onDrop(event: DragEvent) {
      const id = event.dataTransfer.getData(itemType)
      if (!id) return
      event.stopPropagation()
      event.preventDefault()
      move(id, destination, Date.now())
    },
  }
}
