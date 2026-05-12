export type WikiEntryKind = 'folder' | 'note'

export interface WikiEntry {
  kind: WikiEntryKind
  name: string
  path: string
  title: string
  children?: WikiEntry[]
  updatedAt?: string
  size?: number
  wordCount?: number
}

export interface WikiTreeResponse {
  root: WikiEntry
  totals: {
    notes: number
    folders: number
    words: number
  }
}

export interface WikiVault {
  id: string
  name: string
  createdAt: string
}

export interface WikiVaultsResponse {
  activeVaultId: string
  vaults: WikiVault[]
}

export interface WikiTrashItem {
  id: string
  kind: WikiEntryKind
  originalPath: string
  trashPath: string
  title: string
  deletedAt: string
  size?: number
}

export interface WikiFile {
  path: string
  title: string
  content: string
  updatedAt: string
  size: number
  wordCount: number
  headings: WikiHeading[]
  properties: WikiProperty[]
}

export interface WikiSearchResult {
  path: string
  title: string
  folder: string
  snippet: string
  updatedAt: string
  matchField: 'title' | 'path' | 'content' | 'property' | 'tag'
}

export interface WikiHeading {
  id: string
  level: number
  text: string
  line: number
}

export interface WikiProperty {
  key: string
  value: string
  type?: WikiPropertyType
}

export type WikiPropertyType =
  | 'text'
  | 'list'
  | 'tags'
  | 'number'
  | 'checkbox'
  | 'date'
  | 'datetime'

export interface WikiPropertyTypesResponse {
  types: Record<string, WikiPropertyType>
}

export interface WikiPropertyDefinition {
  key: string
  type: WikiPropertyType
  count: number
}

export interface WikiPropertiesResponse {
  properties: WikiPropertyDefinition[]
  types: Record<string, WikiPropertyType>
}

export type WikiNoteFont =
  | 'system'
  | 'georgia'
  | 'charter'
  | 'serif'
  | 'dyslexic'

export interface WikiVaultSettings {
  showPropertiesInNotes: boolean
  noteFont: WikiNoteFont
}

export interface WikiTab {
  path: string
  title: string
  isActive: boolean
}

export interface WikiTabsResponse {
  activePath: string | null
  tabs: WikiTab[]
  updatedAt: string | null
}

export interface WikiBacklink {
  path: string
  title: string
  snippets: string[]
}

export interface WikiGraphResponse {
  outbound: string[]
  inbound: WikiBacklink[]
  unlinked: WikiBacklink[]
  broken: string[]
}

export interface WikiHealthIssue {
  id: string
  severity: 'info' | 'warning'
  title: string
  detail: string
  path?: string
}

export interface WikiHealthResponse {
  issues: WikiHealthIssue[]
  checkedAt: string
}

export interface WikiSummaryResponse {
  recent: WikiEntry[]
  totals: WikiTreeResponse['totals']
  health: WikiHealthResponse
}
