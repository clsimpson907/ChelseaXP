import type { DragEvent } from 'react'
import type { FolderId } from './explorerLocations'
import { isItemMoveDestination, type getDragActions } from './recycleFolders'

const itemType = 'application/x-chelseaxp-item'

export function dragItem(id: string, { movable, recyclable, favoritable }: ReturnType<typeof getDragActions>) {
  if (!movable && !recyclable && !favoritable) return {}

  return {
    draggable: true,
    onDragStart(event: DragEvent) {
      const canMoveOrRecycle = movable || recyclable
      event.dataTransfer.effectAllowed = favoritable && canMoveOrRecycle ? 'copyMove' : canMoveOrRecycle ? 'move' : 'copy'
      if (movable) event.dataTransfer.setData(itemType + '-move', '')
      if (recyclable) event.dataTransfer.setData(itemType + '-recycle', '')
      if (favoritable) event.dataTransfer.setData(itemType + '-favorite', '')
      event.dataTransfer.setData(itemType, id)
    },
  }
}

export function dropItem(destination: FolderId, move: (id: string, parent: FolderId, now: number) => void) {
  const action = destination === 'favorites' ? 'favorite' : destination === 'recycle' ? 'recycle' : 'move'
  const validDestination = action !== 'move' || isItemMoveDestination(destination)
  const acceptedType = itemType + '-' + action
  return {
    onDragOver(event: DragEvent) {
      if (!event.dataTransfer.types.includes(itemType)) return
      event.stopPropagation()
      if (!validDestination || !event.dataTransfer.types.includes(acceptedType)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = action === 'favorite' ? 'copy' : 'move'
    },
    onDrop(event: DragEvent) {
      const id = event.dataTransfer.getData(itemType)
      if (!id) return
      event.stopPropagation()
      if (!validDestination || !event.dataTransfer.types.includes(acceptedType)) return
      event.preventDefault()
      move(id, destination, Date.now())
    },
  }
}
