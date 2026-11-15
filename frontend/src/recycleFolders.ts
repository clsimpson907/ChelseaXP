import { fixedLocations, type FolderId, type LocationId, type SessionFolder } from './explorerLocations'

export type SessionFile = { id: 'credits' | 'about' | 'linkedin'; name: string; parent: FolderId; icon: string; type: string; modifiedAt: number }
export type DeletedFolder = { root: SessionFolder | SessionFile | FavoriteShortcut; isFile: boolean; descendants: SessionFolder[]; files: SessionFile[]; ancestors: SessionFolder[] }
export const deleteConfirmationIcon = '/icons/delete-confirmation.png'

export type FavoriteTarget = { id: string; name: string; icon: string; folder?: FolderId }
type FavoriteShortcut = {
  id: string; name: string; icon: string; parent: 'favorites'; shortcut: true; target: FavoriteTarget
}

export function favoriteShortcutId(targetId: string) {
  return 'favorite-' + targetId
}

export type ExplorerFavorites = {
  items: (FavoriteTarget & { broken?: boolean })[]
  open: (target: ExplorerFavorites['items'][number], openFolder: (id: FolderId) => void) => void
  copy: (id: string) => void
  clipboardReady: boolean
  paste: (now: number) => void
}
export type FolderState = { favorites: FavoriteTarget[]; folders: SessionFolder[]; files: SessionFile[]; trash: DeletedFolder[]; locationDates: Partial<Record<LocationId, number>> }

export function getFavoriteTarget(state: FolderState, id: string): FavoriteTarget | undefined {
  const file = state.files.find((item) => item.id === id)
  if (file) return { id, name: file.name, icon: file.icon }
  const folder = state.folders.find((item) => item.id === id)
  const fixed = Object.hasOwn(fixedLocations, id) ? fixedLocations[id as LocationId] : undefined
  if (folder) return { id, name: folder.name, icon: folder.icon, folder: folder.id }
  if (fixed && !['favorites', 'birby', 'chelseaxp-system'].includes(id)) {
    return { id, name: fixed.name, icon: fixed.icon, folder: id as LocationId }
  }
}

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
  const favorite = state.favorites.find((item) => favoriteShortcutId(item.id) === id)
  if (favorite) {
    const liveTarget = getFavoriteTarget(state, favorite.id)
    const target = liveTarget ?? favorite
    const root: FavoriteShortcut = {
      id, target, name: target.name, icon: liveTarget?.icon ?? deleteConfirmationIcon,
      parent: 'favorites', shortcut: true,
    }
    return touchFolderPath({
      ...state, favorites: state.favorites.filter((item) => item.id !== favorite.id),
      trash: [...state.trash.filter((item) => item.root.id !== id), { root, isFile: false, descendants: [], files: [], ancestors: [] }],
    }, 'favorites', now)
  }
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

  const files = state.files.filter((file) => file.id !== id && !removed.has(file.parent))
  const favorites = state.favorites.map((favorite) => getFavoriteTarget(state, favorite.id) ?? favorite)
  const brokeFavorite = favorites.some(({ id: targetId }) => removed.has(targetId) ||
    state.files.some((file) => file.id === targetId && removed.has(file.parent)))
  const recycled = touchFolderPath({
    ...state,
    folders: state.folders.filter((folder) => !removed.has(folder.id)),
    files,
    favorites,
    trash: [...state.trash, { root, isFile: Boolean(file), descendants, ancestors, files: state.files.filter((file) => removed.has(file.parent)) }],
  }, root.parent, now)
  return brokeFavorite ? touchFolderPath(recycled, 'favorites', now) : recycled
}

export function restoreFolder(state: FolderState, id: string, now: number): FolderState {
  const entry = state.trash.find(({ root }) => root.id === id)
  if (!entry) return state
  if ('shortcut' in entry.root) {
    const target = entry.root.target
    const favorites = state.favorites.some((favorite) => favorite.id === target.id) ? state.favorites : [...state.favorites, target]
    return touchFolderPath({
      ...state, favorites, trash: state.trash.filter((item) => item !== entry),
    }, 'favorites', now)
  }

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

export function favoriteTargetId(state: FolderState, id: string) {
  return state.favorites.find((item) => favoriteShortcutId(item.id) === id)?.id ?? id
}

export function getDragActions(state: FolderState, id: string) {
  const movable = state.folders.some((item) => item.id === id) || state.files.some((item) => item.id === id)
  const recyclable = movable || state.favorites.some((item) => favoriteShortcutId(item.id) === id)
  return { movable, recyclable, favoritable: Boolean(getFavoriteTarget(state, favoriteTargetId(state, id))) }
}

export function isItemMoveDestination(id: FolderId) {
  return !['computer', 'disk', 'network', 'recycle', 'favorites', 'published-complaints', 'birby', 'chelseaxp-system'].includes(id)
}

export function moveItem(state: FolderState, id: string, destination: FolderId, now: number): FolderState {
  const item = [...state.folders, ...state.files].find((entry) => entry.id === id)
  if (!item || item.parent === destination ||
      !isItemMoveDestination(destination)) return state
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
