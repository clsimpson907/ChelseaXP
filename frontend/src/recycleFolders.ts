import { locations, type FolderId, type LocationId, type SessionFolder } from './explorerLocations'

export type DeletedFolder = { root: SessionFolder; descendants: SessionFolder[]; ancestors: SessionFolder[] }
export type FolderState = { folders: SessionFolder[]; trash: DeletedFolder[]; locationDates: Partial<Record<LocationId, number>> }

export function touchFolderPath(state: FolderState, id: FolderId, modifiedAt: number): FolderState {
  const byId = new Map(state.folders.map((folder) => [folder.id, folder]))
  const changed = new Set<FolderId>()
  const locationDates = { ...state.locationDates }
  let parent: FolderId | null | undefined = id
  while (parent) {
    changed.add(parent)
    if (Object.hasOwn(locations, parent)) {
      const location = parent as LocationId
      locationDates[location] = modifiedAt
      parent = locations[location].parent
    } else {
      parent = byId.get(parent)?.parent
    }
  }
  return {
    ...state,
    locationDates,
    folders: state.folders.map((folder) => changed.has(folder.id) ? { ...folder, modifiedAt } : folder),
  }
}

export function recycleFolder(state: FolderState, id: FolderId, now: number): FolderState {
  const byId = new Map(state.folders.map((folder) => [folder.id, folder]))
  const root = byId.get(id)
  if (!root) return state

  const ancestors: SessionFolder[] = []
  for (let parent = byId.get(root.parent); parent; parent = byId.get(parent.parent)) {
    ancestors.unshift(parent)
  }

  const removed = new Set<FolderId>([id])
  const descendants: SessionFolder[] = []
  const queue = [root]
  for (const folder of queue) {
    for (const child of state.folders.filter((item) => item.parent === folder.id)) {
      removed.add(child.id)
      descendants.push(child)
      queue.push(child)
    }
  }

  return touchFolderPath({
    ...state,
    folders: state.folders.filter((folder) => !removed.has(folder.id)),
    trash: [...state.trash, { root, descendants, ancestors }],
  }, root.parent, now)
}

export function restoreFolder(state: FolderState, id: FolderId, now: number): FolderState {
  const entry = state.trash.find(({ root }) => root.id === id)
  if (!entry) return state

  const folders = [...state.folders]
  let parent = entry.ancestors[0]?.parent ?? entry.root.parent
  for (const ancestor of entry.ancestors) {
    const existing = folders.find((folder) => folder.id === ancestor.id) ??
      folders.find((folder) => folder.parent === parent && folder.name.toLowerCase() === ancestor.name.toLowerCase())
    if (existing) {
      parent = existing.id
      continue
    }

    folders.push({ ...ancestor, parent, modifiedAt: now })
    parent = ancestor.id
  }

  const missingDescendants = entry.descendants.filter(({ id: childId }) => !folders.some((folder) => folder.id === childId))
  const recreated = folders.find((folder) => folder.id === id)
  if (recreated) {
    return touchFolderPath({ ...state, folders: [...folders, ...missingDescendants], trash: state.trash.filter((item) => item !== entry) }, id, now)
  }

  const siblings = [...Object.values(locations), ...folders].filter((folder) => folder.parent === parent)
  let name = entry.root.name
  for (let suffix = 2; siblings.some((folder) => folder.name.toLowerCase() === name.toLowerCase()); suffix += 1) {
    name = entry.root.name + ' (' + suffix + ')'
  }

  return touchFolderPath({
    ...state,
    folders: [...folders, { ...entry.root, parent, name }, ...missingDescendants],
    trash: state.trash.filter((item) => item !== entry),
  }, parent, now)
}
