export const premadeModifiedAt = new Date(2005, 6, 30).getTime()

export const locations = {
  computer: { name: 'My Computer', parent: 'desktop', icon: 'my-computer' },
  documents: { name: 'My Documents', parent: 'computer', icon: 'my-documents' },
  pictures: { name: 'My Pictures', parent: 'documents', icon: 'my-pictures' },
  music: { name: 'My Music', parent: 'documents', icon: 'my-music' },
  disk: { name: 'Local Disk (C:)', parent: 'computer', icon: 'local-disk' },
  videos: { name: 'My Videos', parent: 'documents', icon: 'folder' },
  downloads: { name: 'Downloads', parent: 'documents', icon: 'folder' },
  notes: { name: 'Project Notes', parent: 'documents', icon: 'folder' },
  'documents-settings': { name: 'Documents and Settings', parent: 'disk', icon: 'folder' },
  'program-files': { name: 'Program Files', parent: 'disk', icon: 'folder' },
  'chelseaxp-system': { name: 'ChelseaXP', parent: 'disk', icon: 'folder' },
  chelsea: { name: 'Chelsea', parent: 'documents-settings', icon: 'folder' },
  birby: { name: 'Birby', parent: 'documents-settings', icon: 'folder' },
  cookies: { name: 'Cookies', parent: 'chelsea', icon: 'folder' },
  favorites: { name: 'Favorites', parent: 'chelsea', icon: 'help-favorites' },
  'start-menu': { name: 'Start Menu', parent: 'chelsea', icon: 'folder' },
  desktop: { name: 'Desktop', parent: null, icon: 'desktop' },
  recycle: { name: 'Recycle Bin', parent: 'desktop', icon: 'recycle-bin' },
  'published-complaints': { name: 'Complaints', parent: 'recycle', icon: 'folder' },
  network: { name: 'My Network Places', parent: 'desktop', icon: 'my-network-places' },
} as const

export type LocationId = keyof typeof locations
export type FolderId = LocationId | `folder-${string}`
export type SessionFolder = { id: FolderId; name: string; parent: FolderId; icon: string; modifiedAt: number; renamed?: boolean }
export const locationIds = Object.keys(locations) as LocationId[]
export const explorerPlaces = ['computer', 'documents', 'pictures', 'music', 'videos', 'downloads'] as const

export const movableLocations = ['documents', 'pictures', 'music', 'videos', 'downloads', 'notes'] as const
export const fixedLocationIds = locationIds.filter((id) => !movableLocations.some((movable) => movable === id))
export const fixedLocations: Partial<Record<LocationId, { name: string; parent: FolderId | null; icon: string }>> =
  Object.fromEntries(fixedLocationIds.map((id) => [id, locations[id]]))
