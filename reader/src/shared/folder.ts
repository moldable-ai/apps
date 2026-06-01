export interface Folder {
  id: string
  name: string
  tone: string
  bookIds: string[]
  sortOrder?: number
  createdAt: string
  updatedAt: string
}

export interface FoldersResponse {
  folders: Folder[]
}

const FOLDER_TONES = [
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
]

export function toneFromSeed(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return FOLDER_TONES[Math.abs(hash) % FOLDER_TONES.length] ?? FOLDER_TONES[0]
}
