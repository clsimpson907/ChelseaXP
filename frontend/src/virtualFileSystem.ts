import { fixedLocationIds, locations, premadeModifiedAt, type FolderId } from './explorerLocations'
import type { FolderState, SessionFile } from './recycleFolders'

export type VirtualEntry = {
  id: string
  name: string
  icon: string
  parent: FolderId | null
  type: string
  modifiedAt?: number
  folder?: FolderId
  file?: SessionFile['id']
  movable?: boolean
  path: string
}
type VirtualFolder = { name: string; icon: string; parent: FolderId | null; modifiedAt?: number; renamed?: boolean }

export function createVirtualFileSystem(state: FolderState) {
  const folders: Record<FolderId, VirtualFolder> = Object.fromEntries([
    ...fixedLocationIds.map((id) => [id, { ...locations[id], modifiedAt: state.locationDates[id] ?? premadeModifiedAt }]),
    ...state.folders.map((folder) => [folder.id, folder]),
  ])
  const folderIds = Object.keys(folders) as FolderId[]

  function pathTo(id: FolderId): string {
    if (id === 'disk') return 'C:'
    const folder = folders[id]
    return folder.parent ? pathTo(folder.parent) + '\\' + folder.name : folder.name
  }

  const folderEntries: VirtualEntry[] = folderIds.map((id) => ({
    ...folders[id], id, folder: id, path: pathTo(id),
    type: id === 'recycle' ? 'System Folder' : 'File Folder',
    movable: state.folders.some((folder) => folder.id === id),
  }))
  const fileEntries: VirtualEntry[] = state.files.map((file) => ({
    ...file, file: file.id, movable: true, path: pathTo(file.parent) + '\\' + file.name,
  }))
  const entries = [...folderEntries, ...fileEntries]

  // Desktop exposes its shortcuts and session items. My Computer and Network remain
  // navigable shell locations without becoming desktop shortcuts.
  const desktop = [
    ...fileEntries.filter(({ parent, id }) => parent === 'desktop' && id !== 'credits'),
    ...folderEntries.filter(({ id }) => id === 'recycle'),
    ...fileEntries.filter(({ parent, id }) => parent === 'desktop' && id === 'credits'),
    ...folderEntries.filter(({ parent, movable }) => parent === 'desktop' && movable),
  ]
  const desktopIds = new Set(desktop.map(({ id }) => id))

  function children(parent: FolderId): VirtualEntry[] {
    if (parent === 'desktop') return desktop
    const items = entries.filter((entry) => entry.parent === parent)
    if (parent !== 'chelsea') return items
    const aliases: VirtualEntry[] = [
      { ...folderEntries.find(({ id }) => id === 'desktop')!, id: 'profile-desktop', parent, icon: 'folder' },
    ]
    if (folders.documents && folders.documents.parent !== parent) {
      aliases.push({ ...folderEntries.find(({ id }) => id === 'documents')!, id: 'profile-documents', parent, icon: 'folder' })
    }
    return [...items, ...aliases].sort((a, b) => a.name.localeCompare(b.name))
  }

  function listedParent(entry: VirtualEntry): FolderId | null {
    return entry.parent === 'desktop' && !desktopIds.has(entry.id) ? null : entry.parent
  }

  return { folders, folderIds, entries, fileEntries, desktop, children, pathTo, listedParent }
}

export type VirtualFileSystem = ReturnType<typeof createVirtualFileSystem>
