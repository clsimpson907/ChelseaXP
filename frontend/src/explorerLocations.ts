export const locations = {
  computer: { name: 'My Computer', parent: null, icon: 'my-computer' },
  documents: { name: 'My Documents', parent: 'computer', icon: 'my-documents' },
  pictures: { name: 'My Pictures', parent: 'computer', icon: 'folder' },
  music: { name: 'My Music', parent: 'computer', icon: 'folder' },
  videos: { name: 'My Videos', parent: 'computer', icon: 'folder' },
  downloads: { name: 'Downloads', parent: 'computer', icon: 'folder' },
  notes: { name: 'Project Notes', parent: 'documents', icon: 'folder' },
} as const

export type LocationId = keyof typeof locations
export const locationIds = Object.keys(locations) as LocationId[]

export const explorerPlaces = locationIds.filter((id) => locations[id].parent !== 'documents')
