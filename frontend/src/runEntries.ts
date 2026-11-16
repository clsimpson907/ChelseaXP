import type { FolderId } from './explorerLocations'

export type RunTarget = { name: string; kind: 'program' | 'folder' | 'file'; path?: string; location?: FolderId; parent?: FolderId | null; icon: string; open: () => void }

export function normalizeRunEntry(value: string) {
  return value.trim().replace(/^"(.*)"$/, '$1').replace(/[/\\]+/g, '\\').replace(/\\$/, '').toLowerCase()
}

export function rememberRunEntry(recent: string[], command: string) {
  return [command, ...recent.filter((value) => normalizeRunEntry(value) !== normalizeRunEntry(command))].slice(0, 8)
}
