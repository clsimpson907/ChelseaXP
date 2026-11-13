export const locations = {
  computer: { name: 'My Computer', parent: null, icon: 'my-computer' },
  documents: { name: 'My Documents', parent: 'computer', icon: 'my-documents' },
  pictures: { name: 'My Pictures', parent: 'documents', icon: 'my-pictures' },
  music: { name: 'My Music', parent: 'documents', icon: 'my-music' },
  disk: { name: 'Local Disk (C:)', parent: 'computer', icon: 'local-disk' },
  videos: { name: 'My Videos', parent: 'documents', icon: 'folder' },
  downloads: { name: 'Downloads', parent: 'documents', icon: 'folder' },
  notes: { name: 'Project Notes', parent: 'documents', icon: 'folder' },
  desktop: { name: 'Desktop', parent: null, icon: 'desktop' },
  network: { name: 'My Network Places', parent: null, icon: 'my-network-places' },
} as const

export type LocationId = keyof typeof locations
export type FolderId = LocationId | `folder-${string}`
export type SessionFolder = { id: FolderId; name: string; parent: FolderId; icon: 'folder'; renamed?: boolean }
export const locationIds = Object.keys(locations) as LocationId[]
export const explorerPlaces = ['computer', 'documents', 'pictures', 'music', 'videos', 'downloads'] as const
