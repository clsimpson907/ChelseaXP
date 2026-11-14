import { fixedLocations, type FolderId, type LocationId, type SessionFolder } from './explorerLocations'

export type SessionFile = { id: 'credits'; name: string; parent: FolderId; icon: 'document'; modifiedAt: number }
export type DeletedFolder = { root: SessionFolder | SessionFile; isFile: boolean; descendants: SessionFolder[]; files: SessionFile[]; ancestors: SessionFolder[] }
export type FolderState = { folders: SessionFolder[]; files: SessionFile[]; trash: DeletedFolder[]; locationDates: Partial<Record<LocationId, number>> }

export function touchFolderPath(state: FolderState, id: FolderId, modifiedAt: number): FolderState {
  const byId = new Map(state.folders.map((folder) => [folder.id, folder]))
  const changed = new Set<FolderId>()
  const locationDates = { ...state.locationDates }
  let parent: FolderId | null | undefined = id
  while (parent) {
    changed.add(parent)
    if (Object.hasOwn(fixedLocations, parent)) {
      const location = parent as LocationId
      locationDates[location] = modifiedAt
      parent = fixedLocations[location]!.parent
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

export function recycleFolder(state: FolderState, id: string, now: number): FolderState {
  const byId = new Map(state.folders.map((folder) => [folder.id, folder]))
  const file = state.files.find((item) => item.id === id)
  const root = file ?? byId.get(id as FolderId)
  if (!root) return state

  const ancestors: SessionFolder[] = []
  for (let parent = byId.get(root.parent); parent; parent = byId.get(parent.parent)) {
    ancestors.unshift(parent)
  }

  const removed = new Set<string>([id])
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
    files: state.files.filter((file) => file.id !== id && !removed.has(file.parent)),
    trash: [...state.trash, { root, isFile: Boolean(file), descendants, ancestors, files: state.files.filter((file) => removed.has(file.parent)) }],
  }, root.parent, now)
}

export function restoreFolder(state: FolderState, id: string, now: number): FolderState {
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
    return touchFolderPath({ ...state, folders: [...folders, ...missingDescendants], files: [...state.files, ...entry.files], trash: state.trash.filter((item) => item !== entry) }, recreated.id, now)
  }

  const siblings = [...Object.values(fixedLocations), ...folders, ...state.files].filter((folder) => folder.parent === parent)
  let name = entry.root.name
  for (let suffix = 2; siblings.some((folder) => folder.name.toLowerCase() === name.toLowerCase()); suffix += 1) {
    name = entry.root.name + ' (' + suffix + ')'
  }

  return touchFolderPath({
    ...state,
    folders: !entry.isFile ? [...folders, { ...(entry.root as SessionFolder), parent, name }, ...missingDescendants] : folders,
    files: entry.isFile ? [...state.files, { ...(entry.root as SessionFile), parent, name }] : [...state.files, ...entry.files],
    trash: state.trash.filter((item) => item !== entry),
  }, parent, now)
}

export function moveItem(state: FolderState, id: string, destination: FolderId, now: number): FolderState {
  const item = [...state.folders, ...state.files].find((entry) => entry.id === id)
  if (!item || item.parent === destination ||
      ['computer', 'disk', 'network', 'recycle', 'published-complaints', 'birby', 'chelseaxp-system'].includes(destination)) return state
  const target = Object.hasOwn(fixedLocations, destination) ? fixedLocations[destination as LocationId]
    : state.folders.find((folder) => folder.id === destination)
  if (!target) return state

  let parent: FolderId | null | undefined = destination
  while (parent) {
    if (parent === id) return state
    const location: (typeof fixedLocations)[LocationId] = Object.hasOwn(fixedLocations, parent) ? fixedLocations[parent as LocationId] : undefined
    parent = location ? location.parent : state.folders.find((folder) => folder.id === parent)?.parent
  }
  if ([...Object.values(fixedLocations), ...state.folders, ...state.files]
    .some((entry) => entry.parent === destination && entry.name.toLowerCase() === item.name.toLowerCase())) return state

  const moved = {
    ...state,
    folders: state.folders.map((folder) => folder.id === id ? { ...folder, parent: destination } : folder),
    files: state.files.map((file) => file.id === id ? { ...file, parent: destination } : file),
  }
  return touchFolderPath(touchFolderPath(moved, item.parent, now), destination, now)
}
