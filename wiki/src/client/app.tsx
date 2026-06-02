import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  FolderPlus,
  GripVertical,
  Hash,
  Link2,
  List,
  ListTree,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Tags,
  ToggleRight,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import {
  type CSSProperties,
  type FormEvent,
  type MouseEvent,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  MarkdownEditor,
  type MarkdownMediaUploadResult,
} from '@moldable-ai/editor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  type AppCommand,
  Badge,
  Button,
  Calendar,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Markdown,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  popMoldableNavigation,
  pushMoldableNavigation,
  resetMoldableNavigation,
  sendToMoldable,
  useMoldableAppCommands,
  useMoldableCommands,
  useMoldableNavigationPop,
  useWorkspace,
} from '@moldable-ai/ui'
import type {
  WikiEntry,
  WikiFile,
  WikiGraphResponse,
  WikiHealthResponse,
  WikiNoteFont,
  WikiPropertiesResponse,
  WikiProperty,
  WikiPropertyDefinition,
  WikiPropertyType,
  WikiPropertyTypesResponse,
  WikiSearchResult,
  WikiTabsResponse,
  WikiTrashItem,
  WikiTreeResponse,
  WikiVault,
  WikiVaultSettings,
  WikiVaultsResponse,
} from '../shared/types'
import {
  mergeFrontmatterWithBody,
  splitMarkdownFrontmatter,
  stripFrontmatter,
} from './frontmatter'
import {
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type ViewMode = 'read' | 'edit'
type EntryKind = 'note' | 'folder'
type BootstrapTemplateId = 'knowledge' | 'project' | 'journal' | 'health'
type DisplayPropertyType = WikiPropertyType | 'url'

const noteFontOptions: Array<{
  value: WikiNoteFont
  label: string
  family: string
}> = [
  {
    value: 'system',
    label: 'System',
    family:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    value: 'georgia',
    label: 'Georgia',
    family: 'Georgia, "Times New Roman", serif',
  },
  {
    value: 'charter',
    label: 'Charter',
    family: 'Charter, "Bitstream Charter", "Sitka Text", Cambria, serif',
  },
  {
    value: 'serif',
    label: 'Serif',
    family: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    value: 'dyslexic',
    label: 'OpenDyslexic',
    family: '"OpenDyslexic", "Atkinson Hyperlegible", Verdana, sans-serif',
  },
]

function noteFontFamily(value: WikiNoteFont) {
  return (
    noteFontOptions.find((option) => option.value === value)?.family ??
    noteFontOptions[0].family
  )
}

function noteFontLabel(value: WikiNoteFont) {
  return (
    noteFontOptions.find((option) => option.value === value)?.label ??
    noteFontOptions[0].label
  )
}

function isExternalHref(href: string) {
  try {
    const url = new URL(href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

function openExternalHref(href: string) {
  if (window.parent !== window) {
    sendToMoldable({ type: 'moldable:open-url', url: href })
    return
  }

  window.open(href, '_blank', 'noopener,noreferrer')
}

type VaultCreatePayload = {
  name: string
  template?: BootstrapTemplateId
}
type VaultUpdatePayload = {
  id: string
  name: string
}
type InspectorTab = 'outline' | 'details' | 'properties'
type EditingEntry = {
  path: string
  kind: EntryKind
  initialName: string
}
type MovableEntry = {
  path: string
  kind: EntryKind
}
type TreeDropTarget = {
  folder: string
  id: string
}
type WikiDragData = {
  entry?: MovableEntry
  target?: TreeDropTarget
}
type WikiMediaUploadResponse = MarkdownMediaUploadResult & {
  name: string
  path: string
}
type MoldableFileDropMessage =
  | {
      type: 'moldable:file-drag-over'
      paths?: string[]
    }
  | {
      type: 'moldable:file-drag-leave'
    }
  | {
      type: 'moldable:file-drop'
      paths?: string[]
    }

const NAVIGATION_HISTORY_LIMIT = 100

const propertyTypeOptions: Array<{
  description: string
  label: string
  type: WikiPropertyType
}> = [
  { type: 'text', label: 'Text', description: 'Single line text or links' },
  { type: 'list', label: 'List', description: 'Comma-separated values' },
  { type: 'tags', label: 'Tags', description: 'Reusable tag chips' },
  { type: 'number', label: 'Number', description: 'Numeric values' },
  { type: 'checkbox', label: 'Toggle', description: 'On or off' },
  { type: 'date', label: 'Date', description: 'YYYY-MM-DD' },
  { type: 'datetime', label: 'Date & time', description: 'ISO date and time' },
]

const bootstrapTemplates: Array<{
  id: BootstrapTemplateId
  title: string
  description: string
  folders: string[]
}> = [
  {
    id: 'knowledge',
    title: 'Knowledge base',
    description: 'Notes, sources, topics, and a map of content.',
    folders: ['notes', 'sources', 'topics', 'maps'],
  },
  {
    id: 'project',
    title: 'Project wiki',
    description: 'Briefs, decisions, research, and outputs.',
    folders: ['briefs', 'decisions', 'research', 'outputs'],
  },
  {
    id: 'journal',
    title: 'Journal',
    description: 'Daily notes, people, places, and references.',
    folders: ['daily', 'people', 'places', 'references'],
  },
  {
    id: 'health',
    title: 'Health',
    description: 'Timeline, symptoms, appointments, records, and questions.',
    folders: ['timeline', 'symptoms', 'appointments', 'records', 'questions'],
  },
]

type BuiltInNoteTemplateId =
  | 'meeting'
  | 'research'
  | 'project-brief'
  | 'decision'
  | 'person'
  | 'media'

interface BuiltInNoteTemplate {
  id: BuiltInNoteTemplateId
  title: string
  description: string
  content: string
  preview: string[]
}

type TemplateDialogSelection =
  | { kind: 'builtin'; template: BuiltInNoteTemplate }
  | { kind: 'file'; path: string }

const builtInNoteTemplates: BuiltInNoteTemplate[] = [
  {
    id: 'meeting',
    title: 'Meeting notes',
    description: 'Agenda, decisions, action items, and follow-ups.',
    preview: ['Properties', 'Attendees', 'Decisions', 'Action items'],
    content: [
      '---',
      'category: Meetings',
      'date: {{date}}',
      'attendees: []',
      'tags: [meeting]',
      '---',
      '# {{title}}',
      '',
      '## Agenda',
      '',
      '- ',
      '',
      '## Notes',
      '',
      '- ',
      '',
      '## Decisions',
      '',
      '- ',
      '',
      '## Action items',
      '',
      '- [ ] ',
      '',
    ].join('\n'),
  },
  {
    id: 'research',
    title: 'Research note',
    description:
      'Source metadata, summary, claims, quotes, and open questions.',
    preview: ['Source', 'Summary', 'Key claims', 'Questions'],
    content: [
      '---',
      'category: Research',
      'source: ',
      'published: ',
      'tags: [research]',
      '---',
      '# {{title}}',
      '',
      '## Summary',
      '',
      '',
      '## Key claims',
      '',
      '- ',
      '',
      '## Evidence',
      '',
      '- ',
      '',
      '## Questions',
      '',
      '- ',
      '',
    ].join('\n'),
  },
  {
    id: 'project-brief',
    title: 'Project brief',
    description: 'Outcome, context, scope, milestones, risks, and next steps.',
    preview: ['Outcome', 'Scope', 'Milestones', 'Risks'],
    content: [
      '---',
      'category: Projects',
      'status: Active',
      'due: ',
      'tags: [project]',
      '---',
      '# {{title}}',
      '',
      '## Outcome',
      '',
      '',
      '## Context',
      '',
      '',
      '## Scope',
      '',
      '- In: ',
      '- Out: ',
      '',
      '## Milestones',
      '',
      '- ',
      '',
      '## Risks',
      '',
      '- ',
      '',
      '## Next steps',
      '',
      '- [ ] ',
      '',
    ].join('\n'),
  },
  {
    id: 'decision',
    title: 'Decision record',
    description: 'A durable record for options, tradeoffs, and the final call.',
    preview: ['Decision', 'Options', 'Tradeoffs', 'Review date'],
    content: [
      '---',
      'category: Decisions',
      'date: {{date}}',
      'status: Proposed',
      'tags: [decision]',
      '---',
      '# {{title}}',
      '',
      '## Decision',
      '',
      '',
      '## Context',
      '',
      '',
      '## Options',
      '',
      '- ',
      '',
      '## Tradeoffs',
      '',
      '- ',
      '',
      '## Review date',
      '',
      '',
    ].join('\n'),
  },
  {
    id: 'person',
    title: 'Person profile',
    description: 'Lightweight CRM-style context for people and relationships.',
    preview: ['Role', 'Last contact', 'Notes', 'Follow-ups'],
    content: [
      '---',
      'category: People',
      'role: ',
      'company: ',
      'last_contact: {{date}}',
      'tags: [people]',
      '---',
      '# {{title}}',
      '',
      '## Context',
      '',
      '',
      '## Notes',
      '',
      '- ',
      '',
      '## Follow-ups',
      '',
      '- [ ] ',
      '',
    ].join('\n'),
  },
  {
    id: 'media',
    title: 'Media log',
    description: 'Track books, films, podcasts, videos, and references.',
    preview: ['Creator', 'Rating', 'Status', 'Takeaways'],
    content: [
      '---',
      'category: Media',
      'creator: ',
      'rating: ',
      'status: To review',
      'tags: [media]',
      '---',
      '# {{title}}',
      '',
      '## Why it matters',
      '',
      '',
      '## Takeaways',
      '',
      '- ',
      '',
      '## Links',
      '',
      '- ',
      '',
    ].join('\n'),
  },
]

function apiJson<T>(
  fetchWithWorkspace: typeof fetch,
  url: string,
  init?: RequestInit,
) {
  return fetchWithWorkspace(url, init).then(async (response) => {
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      throw new Error(body?.error ?? `Request failed: ${response.status}`)
    }
    return (await response.json()) as T
  })
}

function firstNote(entry: WikiEntry): string | null {
  if (entry.kind === 'note') return entry.path
  for (const child of entry.children ?? []) {
    const found = firstNote(child)
    if (found) return found
  }
  return null
}

function flattenEntries(entry: WikiEntry): WikiEntry[] {
  return [
    entry,
    ...(entry.children ?? []).flatMap((child) => flattenEntries(child)),
  ]
}

function parentFolder(path: string) {
  const parts = path.split('/')
  parts.pop()
  return parts.join('/')
}

function entryName(path: string) {
  return path.split('/').filter(Boolean).pop() ?? path
}

function joinPath(folder: string, name: string) {
  return [folder, name].filter(Boolean).join('/')
}

function pathMatchesEntry(path: string, entryPath: string, kind: EntryKind) {
  if (kind === 'note') return path === entryPath
  return path === entryPath || path.startsWith(`${entryPath}/`)
}

function remapMovedPath(
  path: string,
  from: string,
  to: string,
  kind: EntryKind,
) {
  if (kind === 'note') return path === from ? to : path
  return pathMatchesEntry(path, from, kind)
    ? `${to}${path.slice(from.length)}`
    : path
}

function canMoveEntryToFolder(
  entry: MovableEntry | null,
  targetFolder: string,
) {
  if (!entry) return false
  const nextPath = joinPath(targetFolder, entryName(entry.path))
  if (nextPath === entry.path) return false
  if (entry.kind === 'folder') {
    return (
      targetFolder !== entry.path && !targetFolder.startsWith(`${entry.path}/`)
    )
  }
  return true
}

function wikiDragData(value: unknown): WikiDragData {
  return value && typeof value === 'object' ? (value as WikiDragData) : {}
}

function transformStyle(transform: { x: number; y: number } | null) {
  if (!transform) return undefined
  return {
    transform: `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`,
  }
}

function remapMovedEntry(
  entry: WikiEntry,
  from: string,
  to: string,
  kind: EntryKind,
): WikiEntry {
  const path = entry.path
  const moved = pathMatchesEntry(path, from, kind)
  const nextPath = moved ? remapMovedPath(path, from, to, kind) : path
  const nextChildren = entry.children?.map((child) =>
    remapMovedEntry(child, from, to, kind),
  )

  if (!moved && nextChildren === entry.children) return entry

  return {
    ...entry,
    path: nextPath,
    name:
      entry.kind === 'note'
        ? entryName(nextPath)
        : entryName(nextPath) || entry.name,
    title:
      entry.kind === 'note' && path === from
        ? titleFromPath(to)
        : entry.kind === 'folder' && moved
          ? entryName(nextPath) || entry.title
          : entry.title,
    children: nextChildren,
  }
}

function titleFromPath(path: string) {
  return path.split('/').pop()?.replace(/\.md$/, '') ?? path
}

function titleFromMarkdownContent(relativePath: string, content: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading || titleFromPath(relativePath)
}

function replaceMarkdownTitle(content: string, title: string) {
  if (/^#\s+.+$/m.test(content)) {
    return content.replace(/^#\s+.+$/m, `# ${title}`)
  }

  return [`# ${title}`, '', content.trimStart()].join('\n')
}

function breadcrumbParts(path: string | null, currentTitle?: string | null) {
  if (!path) return ['Wiki']
  const parts = path.split('/')
  const file = parts.pop()
  return [...parts, file ? currentTitle || titleFromPath(file) : 'Wiki']
}

function formatRelativeTime(value?: string) {
  if (!value) return ''
  const delta = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.round(delta / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function formatBytes(value?: number) {
  if (!value) return '0 B'
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB']
  let size = value / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function yamlValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/[:#[\]{}]/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return JSON.stringify(trimmed)
  }
  return trimmed
}

function splitListValue(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function propertyLines(key: string, value: string, type: WikiPropertyType) {
  const cleanKey = key.trim()
  if (!cleanKey) return []
  const cleanValue = value.trim()

  if ((type === 'tags' || cleanKey.toLowerCase() === 'tags') && cleanValue) {
    return [
      `${cleanKey}:`,
      ...splitTagValue(cleanValue).map((item) => `  - ${yamlValue(item)}`),
    ]
  }

  if (type === 'list' && cleanValue) {
    return [
      `${cleanKey}:`,
      ...splitListValue(cleanValue).map((item) => `  - ${yamlValue(item)}`),
    ]
  }

  if (type === 'checkbox') {
    const normalized = /^(true|yes|1|checked)$/i.test(cleanValue)
      ? 'true'
      : 'false'
    return [`${cleanKey}: ${normalized}`]
  }

  if (!cleanValue) return [`${cleanKey}:`]
  return [`${cleanKey}: ${yamlValue(cleanValue)}`]
}

function setFrontmatterProperty(
  content: string,
  key: string,
  value: string,
  type: WikiPropertyType = 'text',
  options: { removeWhenEmpty?: boolean } = { removeWhenEmpty: true },
) {
  const cleanKey = key.trim()
  if (!cleanKey) return content
  const nextLines =
    options.removeWhenEmpty && !value.trim()
      ? []
      : propertyLines(cleanKey, value, type)
  const lines = content.split('\n')

  if (lines[0] === '---') {
    const endIndex = lines.findIndex(
      (line, index) => index > 0 && line === '---',
    )
    if (endIndex > 0) {
      const existingIndex = lines.findIndex(
        (line, index) =>
          index > 0 &&
          index < endIndex &&
          line.toLowerCase().startsWith(`${cleanKey.toLowerCase()}:`),
      )
      if (existingIndex > 0) {
        let deleteCount = 1
        for (let index = existingIndex + 1; index < endIndex; index += 1) {
          const line = lines[index] ?? ''
          if (/^[A-Za-z0-9_-]+:\s*/.test(line)) break
          deleteCount += 1
        }
        if (nextLines.length > 0)
          lines.splice(existingIndex, deleteCount, ...nextLines)
        else lines.splice(existingIndex, deleteCount)
      } else if (nextLines.length > 0) {
        lines.splice(endIndex, 0, ...nextLines)
      }
      return lines.join('\n')
    }
  }

  return nextLines.length > 0
    ? ['---', ...nextLines, '---', '', content].join('\n')
    : content
}

function renameFrontmatterProperty(
  content: string,
  oldKey: string,
  newKey: string,
  value: string,
  type: WikiPropertyType,
) {
  const cleanOldKey = oldKey.trim()
  const cleanNewKey = newKey.trim()
  if (!cleanOldKey || !cleanNewKey || cleanOldKey === cleanNewKey)
    return content

  const withoutOld = setFrontmatterProperty(content, cleanOldKey, '', type)
  return setFrontmatterProperty(withoutOld, cleanNewKey, value, type, {
    removeWhenEmpty: false,
  })
}

function reorderFrontmatterProperties(content: string, orderedKeys: string[]) {
  const cleanKeys = orderedKeys.map((key) => key.trim()).filter(Boolean)
  if (cleanKeys.length < 2) return content

  const lines = content.split('\n')
  if (lines[0] !== '---') return content
  const endIndex = lines.findIndex((line, index) => index > 0 && line === '---')
  if (endIndex <= 1) return content

  const keyedBlocks: Array<{ key: string; lines: string[] }> = []
  const otherLines: string[] = []
  for (let index = 1; index < endIndex; ) {
    const line = lines[index] ?? ''
    const match = /^([A-Za-z0-9_-]+):\s*/.exec(line)
    if (!match?.[1]) {
      otherLines.push(line)
      index += 1
      continue
    }

    const block = [line]
    index += 1
    while (index < endIndex) {
      const nextLine = lines[index] ?? ''
      if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine)) break
      block.push(nextLine)
      index += 1
    }
    keyedBlocks.push({ key: match[1], lines: block })
  }

  const blockByKey = new Map(
    keyedBlocks.map((block) => [block.key.toLowerCase(), block]),
  )
  const orderedKeySet = new Set(cleanKeys.map((key) => key.toLowerCase()))
  const nextBlocks = [
    ...cleanKeys
      .map((key) => blockByKey.get(key.toLowerCase()))
      .filter((block): block is { key: string; lines: string[] } =>
        Boolean(block),
      ),
    ...keyedBlocks.filter(
      (block) => !orderedKeySet.has(block.key.toLowerCase()),
    ),
  ]
  const nextFrontmatter = [
    ...otherLines,
    ...nextBlocks.flatMap((block) => block.lines),
  ]

  return ['---', ...nextFrontmatter, ...lines.slice(endIndex)].join('\n')
}

function applyTemplateVariables(content: string, title: string) {
  const today = new Date().toISOString().slice(0, 10)
  return content.replaceAll('{{date}}', today).replaceAll('{{title}}', title)
}

function parseFrontmatterValue(value: string): string {
  const clean = value.trim().replace(/^['"]|['"]$/g, '')
  if (clean.startsWith('[') && clean.endsWith(']')) {
    return clean
      .slice(1, -1)
      .split(',')
      .map((item) => parseFrontmatterValue(item))
      .filter(Boolean)
      .join(', ')
  }
  return clean
}

function frontmatterPropertyEntries(lines: string[]) {
  const entries: Array<{ key: string; type: WikiPropertyType; value: string }> =
    []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!match?.[1]) continue

    const key = match[1]
    const rawValue = match[2] ?? ''
    if (rawValue.trim()) {
      const value = parseFrontmatterValue(rawValue)
      entries.push({ key, type: inferPropertyType(key, value), value })
      continue
    }

    const values: string[] = []
    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1] ?? ''
      if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine)) break
      const listMatch = /^\s*-\s*(.+)$/.exec(nextLine)
      if (listMatch?.[1]) values.push(parseFrontmatterValue(listMatch[1]))
      index += 1
    }

    const value = values.join(', ')
    entries.push({ key, type: inferPropertyType(key, value), value })
  }

  return entries
}

function insertTemplateContent(content: string, template: string) {
  const cleanContent = content.trimEnd()
  const cleanTemplate = template.trim()
  if (!cleanTemplate) return content
  const templateParts = splitMarkdownFrontmatter(cleanTemplate)
  const templateBody = templateParts.body.trim()
  let nextContent = cleanContent

  for (const property of frontmatterPropertyEntries(
    templateParts.frontmatter,
  )) {
    nextContent = setFrontmatterProperty(
      nextContent,
      property.key,
      property.value,
      property.type,
      { removeWhenEmpty: false },
    )
  }

  if (!templateBody) return nextContent ? `${nextContent}\n` : content
  if (!nextContent) return `${templateBody}\n`
  return `${nextContent}\n\n${templateBody}\n`
}

function parseYamlValue(value: string): string {
  const clean = value.trim().replace(/^['"]|['"]$/g, '')
  if (clean.startsWith('[') && clean.endsWith(']')) {
    return clean
      .slice(1, -1)
      .split(',')
      .map((item) => parseYamlValue(item))
      .filter(Boolean)
      .join(', ')
  }
  return clean
}

function inferPropertyType(key: string, value: string): WikiPropertyType {
  const lowerKey = key.toLowerCase()
  const cleanValue = value.trim()
  if (lowerKey === 'tags' || lowerKey === 'tag') return 'tags'
  if (lowerKey === 'aliases' || lowerKey === 'cssclasses') return 'list'
  if (cleanValue.includes(',')) return 'list'
  if (cleanValue === 'true' || cleanValue === 'false') return 'checkbox'
  if (/^-?\d+(\.\d+)?$/.test(cleanValue)) return 'number'
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(cleanValue)) return 'datetime'
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) return 'date'
  return 'text'
}

function parseDraftProperties(
  content: string,
  propertyTypes: Record<string, WikiPropertyType>,
) {
  const parts = splitMarkdownFrontmatter(content)
  if (parts.frontmatter.length === 0 && !parts.frontmatterBlock) return []

  const properties: WikiProperty[] = []
  const lines = parts.frontmatter
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!match) continue

    const key = match[1] ?? ''
    const rawValue = match[2] ?? ''
    if (!key) continue

    let value = parseYamlValue(rawValue)
    if (!rawValue.trim()) {
      const values: string[] = []
      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1] ?? ''
        if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine)) break
        const listMatch = /^\s*-\s*(.+)$/.exec(nextLine)
        if (listMatch?.[1]) values.push(parseYamlValue(listMatch[1]))
        index += 1
      }
      value = values.join(', ')
    }

    properties.push({
      key,
      type: propertyTypes[key] ?? inferPropertyType(key, value),
      value,
    })
  }

  return properties
}

function normalizeLinkedPath(value: string) {
  const clean = decodeURIComponent(value)
    .trim()
    .replace(/^wiki:(\/\/)?/, '')
    .replace(/^\/+/, '')
    .replace(/^\.\//, '')
    .split('#')[0]

  if (
    !clean ||
    clean.startsWith('http:') ||
    clean.startsWith('https:') ||
    clean.startsWith('mailto:')
  ) {
    return null
  }

  return clean.endsWith('.md') ? clean : `${clean}.md`
}

function resolveLinkedPath(
  value: string,
  currentPath: string | null,
  entries: WikiEntry[],
) {
  const normalized = normalizeLinkedPath(value)
  if (!normalized) return null

  const notePaths = entries
    .filter((entry) => entry.kind === 'note')
    .map((entry) => entry.path)
  const notePathSet = new Set(notePaths)

  if (notePathSet.has(normalized)) return normalized

  if (normalized.includes('/')) return normalized

  const currentFolder = currentPath ? parentFolder(currentPath) : ''
  if (currentFolder) {
    const siblingPath = `${currentFolder}/${normalized}`
    if (notePathSet.has(siblingPath)) return siblingPath
  }

  const basename = normalized
    .split('/')
    .pop()
    ?.replace(/\.md$/, '')
    .toLowerCase()
  const byBasename = notePaths.find(
    (path) =>
      path.split('/').pop()?.replace(/\.md$/, '').toLowerCase() === basename,
  )

  return byBasename ?? normalized
}

function notePathExists(path: string, entries: WikiEntry[]) {
  return entries.some((entry) => entry.kind === 'note' && entry.path === path)
}

function preprocessWikiLinks(markdown: string) {
  return markdown.replace(
    /(^|[^!])\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
    (_match, prefix: string, target: string, label?: string) => {
      const cleanTarget = target.trim()
      const cleanLabel = (label ?? cleanTarget).trim()
      return `${prefix}[${cleanLabel}](${encodeURI(cleanTarget)})`
    },
  )
}

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function mediaKindFromPath(
  value: string,
): 'image' | 'video' | 'audio' | 'file' {
  if (/\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(value)) return 'image'
  if (/\.(m4v|mov|mp4|webm)(\?.*)?$/i.test(value)) return 'video'
  if (/\.(aac|m4a|mp3|ogg|wav)(\?.*)?$/i.test(value)) return 'audio'
  return 'file'
}

function isSupportedMediaFile(file: File) {
  return (
    file.type.startsWith('image/') ||
    file.type.startsWith('video/') ||
    file.type.startsWith('audio/')
  )
}

function isSupportedMediaPath(value: string) {
  return mediaKindFromPath(value) !== 'file'
}

function hasFileDrag(event: ReactDragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function isRemoteOrInlineMedia(value: string) {
  return /^(blob:|data:|https?:|\/)/i.test(value)
}

function mediaUrlForPath(src: string, workspaceId: string, vaultId: string) {
  if (!src || isRemoteOrInlineMedia(src)) return src
  const params = new URLSearchParams({
    path: src,
    vault: vaultId,
    workspace: workspaceId,
  })
  return `/api/wiki/media?${params.toString()}`
}

function renderMediaHtml(
  src: string,
  alt: string,
  width: string | undefined,
  kind = mediaKindFromPath(src),
) {
  const safeSrc = escapeHtmlAttribute(src)
  const safeAlt = escapeHtmlAttribute(alt)
  const safeStyle = width
    ? ` style="width: ${Number.parseInt(width, 10)}px"`
    : ''

  if (kind === 'image') {
    return `<img class="wiki-rich-media wiki-rich-image" src="${safeSrc}" alt="${safeAlt}"${safeStyle} />`
  }
  if (kind === 'video') {
    return `<video class="wiki-rich-media wiki-rich-player wiki-rich-video" controls src="${safeSrc}"></video>`
  }
  if (kind === 'audio') {
    return `<audio class="wiki-rich-media wiki-rich-player wiki-rich-audio" controls src="${safeSrc}"></audio>`
  }
  return `[${alt}](${src})`
}

function markdownForUploadedMedia(media: MarkdownMediaUploadResult) {
  const kind = media.kind ?? mediaKindFromPath(media.src)
  const altText = media.altText ?? entryName(media.src)

  if (media.markdown) return media.markdown
  if (kind === 'image') return `![${altText}](${media.src})`
  if (kind === 'video') {
    return `<video controls src="${escapeHtmlAttribute(media.src)}"></video>`
  }
  if (kind === 'audio') {
    return `<audio controls src="${escapeHtmlAttribute(media.src)}"></audio>`
  }
  return `[${altText}](${media.src})`
}

function appendMarkdownBlock(current: string, markdown: string) {
  const trimmed = current.trimEnd()
  return `${trimmed}${trimmed ? '\n\n' : ''}${markdown}\n`
}

function preprocessRichWikiMarkdown(
  markdown: string,
  resolveMediaUrl: (src: string) => string,
) {
  const withObsidianEmbeds = markdown.replace(
    /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target: string, labelOrWidth?: string) => {
      const cleanTarget = target.trim()
      const kind = mediaKindFromPath(cleanTarget)
      if (kind === 'file') return _match
      const cleanLabelOrWidth = labelOrWidth?.trim()
      const width =
        cleanLabelOrWidth && /^\d+$/.test(cleanLabelOrWidth)
          ? cleanLabelOrWidth
          : undefined
      const alt = width
        ? entryName(cleanTarget)
        : cleanLabelOrWidth || entryName(cleanTarget)
      return renderMediaHtml(resolveMediaUrl(cleanTarget), alt, width, kind)
    },
  )

  const withMarkdownImages = withObsidianEmbeds.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s"[^"]*")?\)(?:\{width=(\d+)\})?/g,
    (_match, alt: string, src: string, width?: string) =>
      renderMediaHtml(
        resolveMediaUrl(src),
        alt || entryName(src),
        width,
        'image',
      ),
  )

  const withResolvedHtmlSources = withMarkdownImages.replace(
    /(<(?:video|audio|source)\b[^>]*\bsrc=")([^"]+)(")/gi,
    (_match, prefix: string, src: string, suffix: string) =>
      `${prefix}${escapeHtmlAttribute(resolveMediaUrl(src))}${suffix}`,
  )

  return preprocessWikiLinks(withResolvedHtmlSources)
}

export function App() {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [backStack, setBackStack] = useState<string[]>([])
  const [forwardStack, setForwardStack] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [targetFolder, setTargetFolder] = useState('')
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [openPaths, setOpenPaths] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('read')
  const [searchOpen, setSearchOpen] = useState(false)
  const [creatingFolderParent, setCreatingFolderParent] = useState<
    string | null
  >(null)
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    path: string
    kind: EntryKind
  } | null>(null)
  const [draggedEntry, setDraggedEntry] = useState<MovableEntry | null>(null)
  const [dropTarget, setDropTarget] = useState<TreeDropTarget | null>(null)
  const [isDraggingMedia, setIsDraggingMedia] = useState(false)
  const [autoSelectedVaultId, setAutoSelectedVaultId] = useState<string | null>(
    null,
  )
  const [templateOpen, setTemplateOpen] = useState(false)
  const [linkPreview, setLinkPreview] = useState<{
    path: string
    x: number
    y: number
  } | null>(null)
  const dragDepthRef = useRef(0)
  const noteScrollRef = useRef<HTMLDivElement | null>(null)

  const vaultsQuery = useQuery({
    queryKey: ['wiki-vaults', workspaceId],
    queryFn: () =>
      apiJson<WikiVaultsResponse>(fetchWithWorkspace, '/api/wiki/vaults'),
  })

  const activeVaultId = vaultsQuery.data?.activeVaultId ?? 'default'
  const activeVault =
    vaultsQuery.data?.vaults.find((vault) => vault.id === activeVaultId) ?? null

  const treeQuery = useQuery({
    queryKey: ['wiki-tree', workspaceId, activeVaultId],
    enabled: Boolean(vaultsQuery.data),
    queryFn: () =>
      apiJson<WikiTreeResponse>(fetchWithWorkspace, '/api/wiki/tree'),
  })

  const selectedFileQuery = useQuery({
    queryKey: ['wiki-file', workspaceId, activeVaultId, selectedPath],
    enabled: Boolean(vaultsQuery.data && selectedPath),
    queryFn: () =>
      apiJson<WikiFile>(
        fetchWithWorkspace,
        `/api/wiki/file?path=${encodeURIComponent(selectedPath ?? '')}`,
      ),
  })

  const graphQuery = useQuery({
    queryKey: ['wiki-graph', workspaceId, activeVaultId, selectedPath],
    enabled: Boolean(vaultsQuery.data && selectedPath),
    queryFn: () =>
      apiJson<WikiGraphResponse>(
        fetchWithWorkspace,
        `/api/wiki/graph?path=${encodeURIComponent(selectedPath ?? '')}`,
      ),
  })

  const searchQuery = useQuery({
    queryKey: ['wiki-search', workspaceId, activeVaultId, query],
    enabled: Boolean(vaultsQuery.data && query.trim().length > 1),
    queryFn: () =>
      apiJson<WikiSearchResult[]>(
        fetchWithWorkspace,
        `/api/wiki/search?q=${encodeURIComponent(query)}`,
      ),
  })

  const healthQuery = useQuery({
    queryKey: ['wiki-health', workspaceId, activeVaultId],
    enabled: Boolean(vaultsQuery.data),
    queryFn: () =>
      apiJson<WikiHealthResponse>(fetchWithWorkspace, '/api/wiki/health'),
  })

  const trashQuery = useQuery({
    queryKey: ['wiki-trash', workspaceId, activeVaultId],
    enabled: Boolean(vaultsQuery.data),
    queryFn: () =>
      apiJson<WikiTrashItem[]>(fetchWithWorkspace, '/api/wiki/trash'),
  })

  const templatesQuery = useQuery({
    queryKey: ['wiki-templates', workspaceId, activeVaultId],
    enabled: Boolean(vaultsQuery.data && templateOpen),
    queryFn: () =>
      apiJson<WikiFile[]>(fetchWithWorkspace, '/api/wiki/templates'),
  })

  const propertyTypesQuery = useQuery({
    queryKey: ['wiki-property-types', workspaceId, activeVaultId],
    enabled: Boolean(vaultsQuery.data),
    queryFn: () =>
      apiJson<WikiPropertyTypesResponse>(
        fetchWithWorkspace,
        '/api/wiki/property-types',
      ),
  })

  const propertiesQuery = useQuery({
    queryKey: ['wiki-properties', workspaceId, activeVaultId],
    enabled: Boolean(vaultsQuery.data),
    queryFn: () =>
      apiJson<WikiPropertiesResponse>(
        fetchWithWorkspace,
        '/api/wiki/properties',
      ),
  })

  const vaultSettingsQuery = useQuery({
    queryKey: ['wiki-settings', workspaceId, activeVaultId],
    enabled: Boolean(vaultsQuery.data),
    queryFn: () =>
      apiJson<WikiVaultSettings>(fetchWithWorkspace, '/api/wiki/settings'),
  })

  useEffect(() => {
    if (
      !selectedPath &&
      treeQuery.data?.root &&
      autoSelectedVaultId !== activeVaultId
    ) {
      setSelectedPath(firstNote(treeQuery.data.root))
      setAutoSelectedVaultId(activeVaultId)
    }
  }, [activeVaultId, autoSelectedVaultId, selectedPath, treeQuery.data])

  useEffect(() => {
    if (selectedFileQuery.data) {
      setDraft(selectedFileQuery.data.content)
    }
  }, [selectedFileQuery.data])

  useEffect(() => {
    if (!selectedPath) return
    setOpenPaths((paths) =>
      paths.includes(selectedPath) ? paths : [...paths, selectedPath],
    )
  }, [selectedPath])

  const allEntries = useMemo(
    () => (treeQuery.data?.root ? flattenEntries(treeQuery.data.root) : []),
    [treeQuery.data],
  )
  const referenceOptions = useMemo(
    () =>
      allEntries
        .filter((entry) => entry.kind === 'note')
        .map((entry) => ({
          kind: 'note' as const,
          path: entry.path,
          title: entry.title,
        })),
    [allEntries],
  )
  const previewEntry = useMemo(
    () =>
      linkPreview
        ? allEntries.find(
            (entry) => entry.kind === 'note' && entry.path === linkPreview.path,
          )
        : null,
    [allEntries, linkPreview],
  )

  const isEmptyVault =
    Boolean(treeQuery.data) &&
    (treeQuery.data?.totals.notes ?? 0) === 0 &&
    (treeQuery.data?.totals.folders ?? 0) === 0

  const selectedFolder = useMemo(() => {
    if (targetFolder) return targetFolder
    if (!selectedPath) return ''
    return parentFolder(selectedPath)
  }, [selectedPath, targetFolder])

  const selectedDraftTitle = useMemo(
    () => (selectedPath ? titleFromMarkdownContent(selectedPath, draft) : null),
    [draft, selectedPath],
  )

  const draftProperties = useMemo(
    () =>
      parseDraftProperties(
        draft,
        propertiesQuery.data?.types ?? propertyTypesQuery.data?.types ?? {},
      ),
    [draft, propertiesQuery.data?.types, propertyTypesQuery.data?.types],
  )
  const showPropertiesInNotes =
    vaultSettingsQuery.data?.showPropertiesInNotes ?? true
  const noteFont = vaultSettingsQuery.data?.noteFont ?? 'system'
  const noteContentStyle = useMemo<CSSProperties>(
    () => ({ fontFamily: noteFontFamily(noteFont) }),
    [noteFont],
  )

  const entryTitleByPath = useMemo(() => {
    const titles = new Map<string, string>()
    for (const entry of allEntries) {
      if (entry.kind === 'note') titles.set(entry.path, entry.title)
    }
    if (selectedPath && selectedDraftTitle) {
      titles.set(selectedPath, selectedDraftTitle)
    }
    return titles
  }, [allEntries, selectedDraftTitle, selectedPath])

  const openTabState = useMemo<WikiTabsResponse>(() => {
    const paths = selectedPath
      ? openPaths.includes(selectedPath)
        ? openPaths
        : [...openPaths, selectedPath]
      : openPaths

    return {
      activePath: selectedPath,
      tabs: paths.map((path) => ({
        path,
        title: entryTitleByPath.get(path) ?? titleFromPath(path),
        isActive: path === selectedPath,
      })),
      updatedAt: null,
    }
  }, [entryTitleByPath, openPaths, selectedPath])

  useEffect(() => {
    if (!vaultsQuery.data) return

    void apiJson<WikiTabsResponse>(fetchWithWorkspace, '/api/wiki/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activePath: openTabState.activePath,
        tabs: openTabState.tabs,
      }),
    }).catch((error) => {
      console.error('Failed to sync wiki tab state:', error)
    })
  }, [fetchWithWorkspace, openTabState, vaultsQuery.data])

  const appCommands = useMemo<AppCommand[]>(() => {
    const vaultCommands = (vaultsQuery.data?.vaults ?? []).map((vault) => ({
      id: `wiki-switch-vault:${vault.id}`,
      label: vault.name,
      description:
        vault.id === activeVaultId ? 'Current vault' : 'Switch vault',
      icon: 'database',
      group: 'Vaults',
      action: {
        type: 'message' as const,
        command: 'wiki-switch-vault',
        payload: { id: vault.id },
      },
    }))

    const fileCommands = allEntries
      .filter((entry) => entry.kind === 'note')
      .map((entry) => ({
        id: `wiki-open-file:${entry.path}`,
        label: entryTitleByPath.get(entry.path) ?? entry.title,
        description: entry.path,
        icon: 'file-text',
        group: 'Files',
        action: {
          type: 'message' as const,
          command: 'wiki-open-file',
          payload: { path: entry.path },
        },
      }))

    return [
      {
        id: 'wiki-new-note',
        label: 'New Note',
        shortcut: 'n',
        icon: 'plus',
        group: 'Contents',
        action: { type: 'message', command: 'wiki-new-note', payload: null },
      },
      {
        id: 'wiki-new-folder',
        label: 'New Folder',
        icon: 'folder',
        group: 'Contents',
        action: { type: 'message', command: 'wiki-new-folder', payload: null },
      },
      {
        id: 'wiki-daily-note',
        label: 'Daily Note',
        icon: 'calendar',
        group: 'Contents',
        action: { type: 'message', command: 'wiki-daily-note', payload: null },
      },
      ...vaultCommands,
      ...fileCommands,
    ]
  }, [activeVaultId, allEntries, entryTitleByPath, vaultsQuery.data?.vaults])

  useMoldableAppCommands('wiki', appCommands)

  useEffect(() => {
    const tree = treeQuery.data?.root
    const activeFile = selectedFileQuery.data
    const totals = treeQuery.data?.totals
    const context = [
      'Wiki app context:',
      `Workspace: ${workspaceId ?? 'unknown'}`,
      `Active vault: ${activeVault?.name ?? activeVaultId}`,
      totals
        ? `Vault contains ${totals.notes} notes, ${totals.folders} folders, and about ${totals.words} words.`
        : '',
      activeFile
        ? `Active note: ${activeFile.path}\nTitle: ${activeFile.title}\nContent:\n${activeFile.content.slice(0, 6000)}`
        : '',
      openTabState.tabs.length > 0
        ? `Open tabs:\n${openTabState.tabs
            .map((tab) => `- ${tab.isActive ? '[active] ' : ''}${tab.path}`)
            .join('\n')}`
        : 'Open tabs: none',
      tree
        ? `Top-level folders: ${(tree.children ?? [])
            .filter((entry) => entry.kind === 'folder')
            .map((entry) => entry.path)
            .join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    sendToMoldable({ type: 'moldable:set-chat-instructions', text: context })
  }, [
    activeVault,
    activeVaultId,
    openTabState.tabs,
    selectedFileQuery.data,
    treeQuery.data,
    workspaceId,
  ])

  const invalidateWiki = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['wiki-tree', workspaceId] })
    void queryClient.invalidateQueries({
      queryKey: ['wiki-search', workspaceId],
    })
    void queryClient.invalidateQueries({
      queryKey: ['wiki-health', workspaceId],
    })
    void queryClient.invalidateQueries({
      queryKey: ['wiki-graph', workspaceId],
    })
    void queryClient.invalidateQueries({
      queryKey: ['wiki-trash', workspaceId],
    })
    void queryClient.invalidateQueries({
      queryKey: ['wiki-properties', workspaceId],
    })
  }, [queryClient, workspaceId])

  const resetVaultUi = useCallback(() => {
    resetMoldableNavigation()
    setSelectedPath(null)
    setBackStack([])
    setForwardStack([])
    setDraft('')
    setQuery('')
    setTargetFolder('')
    setOpenPaths([])
    setViewMode('read')
    setCreatingFolderParent(null)
    setEditingEntry(null)
    setDeleteTarget(null)
    setDraggedEntry(null)
    setDropTarget(null)
    setIsDraggingMedia(false)
    setAutoSelectedVaultId(null)
    setSearchOpen(false)
    setTemplateOpen(false)
    setLinkPreview(null)
    dragDepthRef.current = 0
  }, [])

  useEffect(() => {
    resetVaultUi()
  }, [resetVaultUi, workspaceId])

  useEffect(() => {
    function handleAppApiChanged(event: MessageEvent) {
      if (event.data?.type !== 'moldable:app-api-changed') return
      if (event.data?.targetAppId && event.data.targetAppId !== 'wiki') return
      if (event.data?.workspaceId && event.data.workspaceId !== workspaceId)
        return

      const method =
        typeof event.data.method === 'string' ? event.data.method : ''
      if (!method.startsWith('wiki.')) return

      if (
        method.startsWith('wiki.vaults.') ||
        method === 'wiki.settings.update'
      ) {
        void queryClient.invalidateQueries({
          queryKey: ['wiki-vaults', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['wiki-settings', workspaceId],
        })
      }

      if (method === 'wiki.vaults.switch' || method === 'wiki.vaults.delete') {
        resetVaultUi()
      }

      void queryClient.invalidateQueries({
        queryKey: ['wiki-file', workspaceId, activeVaultId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['wiki-templates', workspaceId, activeVaultId],
      })
      invalidateWiki()
    }

    window.addEventListener('message', handleAppApiChanged)
    return () => window.removeEventListener('message', handleAppApiChanged)
  }, [activeVaultId, invalidateWiki, queryClient, resetVaultUi, workspaceId])

  useEffect(() => {
    resetMoldableNavigation()
  }, [])

  const navigateToPath = useCallback(
    (path: string) => {
      if (path === selectedPath) return
      if (selectedPath) {
        setBackStack((stack) => {
          const nextStack =
            stack[stack.length - 1] === selectedPath
              ? stack
              : [...stack, selectedPath]
          return nextStack.slice(-NAVIGATION_HISTORY_LIMIT)
        })
        setForwardStack([])
        pushMoldableNavigation({
          id: `note:${path}`,
          title: entryTitleByPath.get(path) ?? titleFromPath(path),
        })
      }
      setSelectedPath(path)
    },
    [entryTitleByPath, selectedPath],
  )

  const navigateBack = useCallback(
    (sync: 'pop' | 'none' = 'pop') => {
      const previousPath = backStack[backStack.length - 1]
      if (!previousPath) return

      if (sync === 'pop') popMoldableNavigation()
      setBackStack((stack) => stack.slice(0, -1))
      if (selectedPath) {
        setForwardStack((stack) =>
          [selectedPath, ...stack].slice(0, NAVIGATION_HISTORY_LIMIT),
        )
      }
      setSelectedPath(previousPath)
    },
    [backStack, selectedPath],
  )

  const navigateForward = useCallback(() => {
    const nextPath = forwardStack[0]
    if (!nextPath) return

    setForwardStack((stack) => stack.slice(1))
    if (selectedPath) {
      setBackStack((stack) =>
        [...stack, selectedPath].slice(-NAVIGATION_HISTORY_LIMIT),
      )
    }
    setSelectedPath(nextPath)
  }, [forwardStack, selectedPath])

  useMoldableNavigationPop(() => {
    navigateBack('none')
  })

  const saveMutation = useMutation({
    mutationFn: (payload: { path: string; content: string }) =>
      apiJson<WikiFile>(fetchWithWorkspace, '/api/wiki/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (file) => {
      queryClient.setQueryData(
        ['wiki-file', workspaceId, activeVaultId, file.path],
        file,
      )
      invalidateWiki()
    },
  })

  const removeCachedFilesForEntry = useCallback(
    (entryPath: string, kind: EntryKind) => {
      if (kind === 'note') {
        queryClient.removeQueries({
          queryKey: ['wiki-file', workspaceId, activeVaultId, entryPath],
          exact: true,
        })
        return
      }

      queryClient.removeQueries({
        predicate: (query) => {
          const [scope, queryWorkspaceId, queryVaultId, queryPath] =
            query.queryKey
          return (
            scope === 'wiki-file' &&
            queryWorkspaceId === workspaceId &&
            queryVaultId === activeVaultId &&
            typeof queryPath === 'string' &&
            pathMatchesEntry(queryPath, entryPath, kind)
          )
        },
      })
    },
    [activeVaultId, queryClient, workspaceId],
  )

  const switchVaultMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson<WikiVaultsResponse>(
        fetchWithWorkspace,
        '/api/wiki/vaults/active',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        },
      ),
    onSuccess: (response) => {
      queryClient.setQueryData(['wiki-vaults', workspaceId], response)
      resetVaultUi()
      invalidateWiki()
    },
  })

  const createVaultMutation = useMutation({
    mutationFn: (payload: VaultCreatePayload) =>
      apiJson<WikiVaultsResponse>(fetchWithWorkspace, '/api/wiki/vaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(['wiki-vaults', workspaceId], response)
      resetVaultUi()
      invalidateWiki()
    },
  })

  const updateVaultMutation = useMutation({
    mutationFn: (payload: VaultUpdatePayload) =>
      apiJson<WikiVaultsResponse>(
        fetchWithWorkspace,
        `/api/wiki/vaults/${encodeURIComponent(payload.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: payload.name }),
        },
      ),
    onSuccess: (response) => {
      queryClient.setQueryData(['wiki-vaults', workspaceId], response)
      invalidateWiki()
    },
  })

  const deleteVaultMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson<WikiVaultsResponse>(
        fetchWithWorkspace,
        `/api/wiki/vaults/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      ),
    onSuccess: (response) => {
      queryClient.setQueryData(['wiki-vaults', workspaceId], response)
      resetVaultUi()
      invalidateWiki()
    },
  })

  const restoreTrashMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson<{ ok: true; item: WikiTrashItem }>(
        fetchWithWorkspace,
        `/api/wiki/trash/${encodeURIComponent(id)}/restore`,
        { method: 'POST' },
      ),
    onSuccess: ({ item }) => {
      invalidateWiki()
      navigateToPath(item.originalPath)
    },
  })

  const purgeTrashMutation = useMutation({
    mutationFn: (id: string) =>
      apiJson<{ ok: true; item: WikiTrashItem }>(
        fetchWithWorkspace,
        `/api/wiki/trash/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      invalidateWiki()
    },
  })

  const bootstrapVaultMutation = useMutation({
    mutationFn: (template: BootstrapTemplateId) =>
      apiJson<WikiTreeResponse>(fetchWithWorkspace, '/api/wiki/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(
        ['wiki-tree', workspaceId, activeVaultId],
        response,
      )
      const firstPath = firstNote(response.root)
      setSelectedPath(firstPath)
      setAutoSelectedVaultId(activeVaultId)
      if (firstPath) setOpenPaths([firstPath])
      invalidateWiki()
    },
  })

  const renamingSelectedNote =
    editingEntry?.kind === 'note' && editingEntry.path === selectedPath

  useEffect(() => {
    if (!selectedPath || !selectedFileQuery.data || renamingSelectedNote) return
    if (draft === selectedFileQuery.data.content) return

    const timeout = window.setTimeout(() => {
      saveMutation.mutate({ path: selectedPath, content: draft })
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [
    draft,
    renamingSelectedNote,
    saveMutation,
    selectedFileQuery.data,
    selectedPath,
  ])

  const createNoteMutation = useMutation({
    mutationFn: (payload: {
      title?: string
      folder?: string
      content?: string
      path?: string
    }) =>
      apiJson<WikiFile>(fetchWithWorkspace, '/api/wiki/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (file) => {
      queryClient.setQueryData(
        ['wiki-file', workspaceId, activeVaultId, file.path],
        file,
      )
      setDraft(file.content)
      navigateToPath(file.path)
      setViewMode('edit')
      setTargetFolder(parentFolder(file.path))
      invalidateWiki()
    },
  })

  const dailyNoteMutation = useMutation({
    mutationFn: () =>
      apiJson<WikiFile>(fetchWithWorkspace, '/api/wiki/daily', {
        method: 'POST',
      }),
    onSuccess: (file) => {
      queryClient.setQueryData(
        ['wiki-file', workspaceId, activeVaultId, file.path],
        file,
      )
      setDraft(file.content)
      navigateToPath(file.path)
      setViewMode('edit')
      invalidateWiki()
    },
  })

  const applyTemplateMutation = useMutation({
    mutationFn: (templatePath: string) =>
      apiJson<WikiFile>(fetchWithWorkspace, '/api/wiki/templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templatePath,
        }),
      }),
    onSuccess: (file) => {
      queryClient.setQueryData(
        ['wiki-file', workspaceId, activeVaultId, file.path],
        file,
      )
      setTemplateOpen(false)
      navigateToPath(file.path)
      setDraft(file.content)
      setViewMode('edit')
      invalidateWiki()
    },
  })

  const propertyTypeMutation = useMutation({
    mutationFn: (payload: {
      key: string
      oldKey?: string
      type: WikiPropertyType
    }) =>
      apiJson<WikiPropertyTypesResponse>(
        fetchWithWorkspace,
        '/api/wiki/property-types',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: (response) => {
      queryClient.setQueryData(
        ['wiki-property-types', workspaceId, activeVaultId],
        response,
      )
      queryClient.setQueryData<WikiPropertiesResponse>(
        ['wiki-properties', workspaceId, activeVaultId],
        (current) =>
          current
            ? {
                ...current,
                types: response.types,
                properties: current.properties.map((property) => ({
                  ...property,
                  type: response.types[property.key] ?? property.type,
                })),
              }
            : current,
      )
      void queryClient.invalidateQueries({
        queryKey: ['wiki-properties', workspaceId, activeVaultId],
      })
    },
  })

  const renamePropertyMutation = useMutation({
    mutationFn: (payload: { oldKey: string; newKey: string }) =>
      apiJson<WikiPropertiesResponse>(
        fetchWithWorkspace,
        '/api/wiki/properties/rename',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: (response) => {
      queryClient.setQueryData(
        ['wiki-properties', workspaceId, activeVaultId],
        response,
      )
      queryClient.setQueryData(
        ['wiki-property-types', workspaceId, activeVaultId],
        { types: response.types },
      )
      void queryClient.invalidateQueries({
        queryKey: ['wiki-file', workspaceId, activeVaultId],
      })
      invalidateWiki()
    },
  })

  const vaultSettingsMutation = useMutation({
    mutationFn: (payload: Partial<WikiVaultSettings>) =>
      apiJson<WikiVaultSettings>(fetchWithWorkspace, '/api/wiki/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(
        ['wiki-settings', workspaceId, activeVaultId],
        response,
      )
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: (payload: { path: string }) =>
      apiJson<{ path: string }>(fetchWithWorkspace, '/api/wiki/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (folder) => {
      setTargetFolder(folder.path)
      setCreatingFolderParent(null)
      invalidateWiki()
    },
  })

  const moveEntryMutation = useMutation({
    mutationFn: (payload: {
      from: string
      to: string
      kind: EntryKind
      content?: string
      contentPath?: string
    }) =>
      apiJson<{ ok: true; path: string }>(
        fetchWithWorkspace,
        '/api/wiki/move',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: ({ path }, payload) => {
      setEditingEntry(null)
      setDraggedEntry(null)
      setDropTarget(null)
      queryClient.removeQueries({
        queryKey: ['wiki-file', workspaceId, activeVaultId, payload.from],
        exact: true,
      })
      queryClient.setQueryData<WikiTreeResponse>(
        ['wiki-tree', workspaceId, activeVaultId],
        (tree) =>
          tree
            ? {
                ...tree,
                root: remapMovedEntry(
                  tree.root,
                  payload.from,
                  path,
                  payload.kind,
                ),
              }
            : tree,
      )
      setSelectedPath((current) => {
        if (!current) return current
        if (payload.kind === 'note')
          return current === payload.from ? path : current
        return current === payload.from ||
          current.startsWith(`${payload.from}/`)
          ? `${path}${current.slice(payload.from.length)}`
          : current
      })
      setOpenPaths((paths) =>
        paths.map((openPath) => {
          if (payload.kind === 'note')
            return openPath === payload.from ? path : openPath
          return openPath === payload.from ||
            openPath.startsWith(`${payload.from}/`)
            ? `${path}${openPath.slice(payload.from.length)}`
            : openPath
        }),
      )
      setBackStack((paths) =>
        paths.map((historyPath) =>
          remapMovedPath(historyPath, payload.from, path, payload.kind),
        ),
      )
      setForwardStack((paths) =>
        paths.map((historyPath) =>
          remapMovedPath(historyPath, payload.from, path, payload.kind),
        ),
      )
      setTargetFolder((folder) =>
        payload.kind === 'folder' &&
        (folder === payload.from || folder.startsWith(`${payload.from}/`))
          ? `${path}${folder.slice(payload.from.length)}`
          : folder,
      )
      invalidateWiki()
    },
    onError: () => {
      setEditingEntry(null)
      setDraggedEntry(null)
      setDropTarget(null)
    },
  })

  const deleteEntryMutation = useMutation({
    mutationFn: (payload: { path: string; kind: EntryKind }) =>
      apiJson<{ ok: true }>(
        fetchWithWorkspace,
        payload.kind === 'note'
          ? `/api/wiki/file?path=${encodeURIComponent(payload.path)}`
          : `/api/wiki/folder?path=${encodeURIComponent(payload.path)}`,
        { method: 'DELETE' },
      ),
    onSuccess: (_response, payload) => {
      setDeleteTarget(null)
      setEditingEntry(null)
      setSelectedPath((current) => {
        if (!current) return current
        if (payload.kind === 'note')
          return current === payload.path ? null : current
        return current === payload.path ||
          current.startsWith(`${payload.path}/`)
          ? null
          : current
      })
      removeCachedFilesForEntry(payload.path, payload.kind)
      setOpenPaths((paths) =>
        paths.filter(
          (openPath) => !pathMatchesEntry(openPath, payload.path, payload.kind),
        ),
      )
      setBackStack((paths) =>
        paths.filter(
          (path) => !pathMatchesEntry(path, payload.path, payload.kind),
        ),
      )
      setForwardStack((paths) =>
        paths.filter(
          (path) => !pathMatchesEntry(path, payload.path, payload.kind),
        ),
      )
      invalidateWiki()
    },
  })

  useMoldableCommands({
    'wiki-new-note': () => {
      createUntitledNote()
    },
    'wiki-new-folder': () => {
      startInlineFolderCreate()
    },
    'wiki-daily-note': () => {
      dailyNoteMutation.mutate()
    },
    'wiki-open-file': (payload) => {
      const path =
        typeof payload === 'object' && payload !== null && 'path' in payload
          ? (payload.path as unknown)
          : null
      if (typeof path === 'string') navigateToPath(path)
    },
    'wiki-switch-vault': (payload) => {
      const id =
        typeof payload === 'object' && payload !== null && 'id' in payload
          ? (payload.id as unknown)
          : null
      if (typeof id === 'string' && id !== activeVaultId) {
        switchVaultMutation.mutate(id)
      }
    },
  })

  function startInlineFolderCreate() {
    setSearchOpen(false)
    setQuery('')
    setCreatingFolderParent(selectedFolder)
    setEditingEntry(null)
  }

  function commitInlineFolderCreate(name: string) {
    const trimmed = name.trim()
    if (!trimmed) {
      setCreatingFolderParent(null)
      return
    }

    createFolderMutation.mutate({
      path: joinPath(creatingFolderParent ?? '', trimmed),
    })
  }

  function startRename(entry: WikiEntry) {
    if (!entry.path) return
    setCreatingFolderParent(null)
    setEditingEntry({
      path: entry.path,
      kind: entry.kind,
      initialName:
        entry.kind === 'note'
          ? titleFromPath(entry.path)
          : entryName(entry.path),
    })
  }

  function commitRename(value: string) {
    if (!editingEntry) return
    const trimmed = value.trim()
    if (!trimmed) {
      setEditingEntry(null)
      return
    }

    const parent = parentFolder(editingEntry.path)
    const to =
      editingEntry.kind === 'note'
        ? joinPath(parent, trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`)
        : joinPath(parent, trimmed)

    if (to === editingEntry.path) {
      setEditingEntry(null)
      return
    }

    const renamedNoteTitle =
      editingEntry.kind === 'note' ? titleFromPath(to) : null
    const renamedSelectedContent =
      editingEntry.kind === 'note' &&
      selectedPath === editingEntry.path &&
      renamedNoteTitle
        ? replaceMarkdownTitle(draft, renamedNoteTitle)
        : undefined

    if (renamedSelectedContent !== undefined) {
      setDraft(renamedSelectedContent)
    }

    const movedSelectedContent =
      editingEntry.kind === 'folder' &&
      selectedPath &&
      pathMatchesEntry(selectedPath, editingEntry.path, editingEntry.kind)
        ? draft
        : undefined
    const movedSelectedContentPath =
      renamedSelectedContent !== undefined
        ? editingEntry.path
        : movedSelectedContent !== undefined
          ? (selectedPath ?? undefined)
          : undefined

    moveEntryMutation.mutate({
      from: editingEntry.path,
      to,
      kind: editingEntry.kind,
      content: renamedSelectedContent ?? movedSelectedContent,
      contentPath: movedSelectedContentPath,
    })
  }

  function moveEntryToFolder(entry: MovableEntry, targetFolder: string) {
    if (!canMoveEntryToFolder(entry, targetFolder)) {
      setDropTarget(null)
      return
    }

    moveEntryMutation.mutate({
      from: entry.path,
      to: joinPath(targetFolder, entryName(entry.path)),
      kind: entry.kind,
      content:
        selectedPath && pathMatchesEntry(selectedPath, entry.path, entry.kind)
          ? draft
          : undefined,
      contentPath:
        selectedPath && pathMatchesEntry(selectedPath, entry.path, entry.kind)
          ? selectedPath
          : undefined,
    })
  }

  function createUntitledNote() {
    createNoteMutation.mutate({
      title: 'Untitled',
      folder: selectedFolder || undefined,
    })
  }

  function selectLinkedPath(value: string) {
    const path = resolveLinkedPath(value, selectedPath, allEntries)
    if (!path) return
    if (notePathExists(path, allEntries)) {
      navigateToPath(path)
      return
    }
    createNoteMutation.mutate({ path })
  }

  function handleMarkdownLinkClick(event: MouseEvent<HTMLElement>) {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const anchor = target.closest('a')
    const href = anchor?.getAttribute('href')
    if (!href) return

    if (isExternalHref(href)) {
      event.preventDefault()
      event.stopPropagation()
      openExternalHref(href)
      return
    }

    const linkedPath = resolveLinkedPath(href, selectedPath, allEntries)
    if (!linkedPath) return

    event.preventDefault()
    event.stopPropagation()
    if (notePathExists(linkedPath, allEntries)) {
      navigateToPath(linkedPath)
      return
    }
    createNoteMutation.mutate({ path: linkedPath })
  }

  function handleMarkdownLinkHover(event: MouseEvent<HTMLElement>) {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const anchor = target.closest('a')
    const href = anchor?.getAttribute('href')
    if (!anchor) return
    if (!href || isExternalHref(href)) return
    const linkedPath = resolveLinkedPath(href, selectedPath, allEntries)
    if (!linkedPath) return
    const rect = anchor.getBoundingClientRect()
    setLinkPreview({
      path: linkedPath,
      x: Math.min(rect.left, window.innerWidth - 320),
      y: rect.bottom + 8,
    })
  }

  function scrollToHeading(text: string) {
    setViewMode('read')
    window.setTimeout(() => {
      const root = noteScrollRef.current
      if (!root) return
      const heading = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].find(
        (element) => element.textContent?.trim() === text,
      )
      heading?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, 80)
  }

  function closeTab(path: string) {
    const index = openPaths.indexOf(path)
    const nextPaths = openPaths.filter((item) => item !== path)
    setOpenPaths(nextPaths)
    if (selectedPath === path) {
      setSelectedPath(nextPaths[Math.max(0, index - 1)] ?? nextPaths[0] ?? null)
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.altKey) return

      const key = event.key.toLowerCase()

      if (key === 'w' && selectedPath) {
        event.preventDefault()
        closeTab(selectedPath)
        return
      }

      if (key === '[') {
        event.preventDefault()
        navigateBack()
        return
      }

      if (key === ']') {
        event.preventDefault()
        navigateForward()
        return
      }

      if (key === 'n') {
        event.preventDefault()
        createUntitledNote()
        return
      }

      if (key === 'e' && selectedPath) {
        event.preventDefault()
        setViewMode((mode) => (mode === 'read' ? 'edit' : 'read'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  useEffect(() => {
    function handleHistoryKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey)
        return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        navigateBack()
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        navigateForward()
      }
    }

    window.addEventListener('keydown', handleHistoryKeyDown)
    return () => window.removeEventListener('keydown', handleHistoryKeyDown)
  })

  const searchResults = searchQuery.data ?? []
  const fileChanged = selectedFileQuery.data?.content !== draft
  const resolveMediaUrl = useCallback(
    (src: string) => mediaUrlForPath(src, workspaceId, activeVaultId),
    [activeVaultId, workspaceId],
  )
  const handleMediaUpload = useCallback(
    async (file: File): Promise<MarkdownMediaUploadResult> => {
      const body = new FormData()
      body.append('file', file)
      const response = await apiJson<WikiMediaUploadResponse>(
        fetchWithWorkspace,
        '/api/wiki/media',
        {
          method: 'POST',
          body,
        },
      )

      return {
        altText: response.altText ?? response.name,
        kind: response.kind,
        src: response.path,
      }
    },
    [fetchWithWorkspace],
  )
  const insertUploadedMedia = useCallback(
    (media: MarkdownMediaUploadResult[]) => {
      if (media.length === 0 || !selectedPath) return
      setDraft((current) =>
        appendMarkdownBlock(
          current,
          media.map((item) => markdownForUploadedMedia(item)).join('\n\n'),
        ),
      )
      setViewMode('edit')
    },
    [selectedPath],
  )
  const importMediaPaths = useCallback(
    async (paths: string[]) => {
      if (!selectedPath) return
      const mediaPaths = paths.filter(isSupportedMediaPath)
      if (mediaPaths.length === 0) return

      const response = await apiJson<WikiMediaUploadResponse[]>(
        fetchWithWorkspace,
        '/api/wiki/media-paths',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: mediaPaths }),
        },
      )
      insertUploadedMedia(response)
    },
    [fetchWithWorkspace, insertUploadedMedia, selectedPath],
  )
  const importDroppedFiles = useCallback(
    async (files: File[]) => {
      if (!selectedPath) return
      const mediaFiles = files.filter(isSupportedMediaFile)
      if (mediaFiles.length === 0) return
      const uploaded = await Promise.all(mediaFiles.map(handleMediaUpload))
      insertUploadedMedia(uploaded)
    },
    [handleMediaUpload, insertUploadedMedia, selectedPath],
  )

  useEffect(() => {
    function handleMessage(event: MessageEvent<MoldableFileDropMessage>) {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'moldable:file-drag-over') {
        if ((data.paths ?? []).some(isSupportedMediaPath)) {
          setIsDraggingMedia(true)
        }
        return
      }

      if (data.type === 'moldable:file-drag-leave') {
        dragDepthRef.current = 0
        setIsDraggingMedia(false)
        return
      }

      if (data.type !== 'moldable:file-drop') return

      dragDepthRef.current = 0
      setIsDraggingMedia(false)
      void importMediaPaths(data.paths ?? [])
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [importMediaPaths])

  const handleDragEnter = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    dragDepthRef.current += 1
    setIsDraggingMedia(true)
  }, [])

  const handleDragOver = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((event: ReactDragEvent<HTMLElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDraggingMedia(false)
  }, [])

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      if (event.defaultPrevented) return
      if (!hasFileDrag(event)) return
      event.preventDefault()
      dragDepthRef.current = 0
      setIsDraggingMedia(false)
      void importDroppedFiles(Array.from(event.dataTransfer.files))
    },
    [importDroppedFiles],
  )

  function addProperty(key: string, value: string, type: WikiPropertyType) {
    const existingDefinition = propertiesQuery.data?.properties.find(
      (property) => property.key.toLowerCase() === key.toLowerCase(),
    )
    const propertyType = existingDefinition?.type ?? type
    setDraft((content) =>
      setFrontmatterProperty(
        content,
        existingDefinition?.key ?? key,
        value,
        propertyType,
        {
          removeWhenEmpty: false,
        },
      ),
    )
    propertyTypeMutation.mutate({
      key: existingDefinition?.key ?? key,
      type: propertyType,
    })
  }

  function updatePropertyValue(
    key: string,
    value: string,
    type: WikiPropertyType,
  ) {
    setDraft((content) => setFrontmatterProperty(content, key, value, type))
  }

  function updatePropertyType(key: string, type: WikiPropertyType) {
    const property = draftProperties.find((item) => item.key === key)
    if (property) {
      setDraft((content) =>
        setFrontmatterProperty(content, key, property.value, type, {
          removeWhenEmpty: false,
        }),
      )
    }
    propertyTypeMutation.mutate({ key, type })
  }

  function renameProperty(
    oldKey: string,
    newKey: string,
    value: string,
    type: WikiPropertyType,
  ) {
    setDraft((content) =>
      renameFrontmatterProperty(content, oldKey, newKey, value, type),
    )
    renamePropertyMutation.mutate({ oldKey, newKey })
  }

  function reorderProperties(orderedKeys: string[]) {
    setDraft((content) => reorderFrontmatterProperties(content, orderedKeys))
  }

  return (
    <main
      className="bg-background text-foreground relative h-screen min-h-0 overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ResizablePanelGroup
        key={`${leftPanelOpen ? 'with-left' : 'without-left'}-${rightPanelOpen ? 'with-right' : 'without-right'}`}
        orientation="horizontal"
        className="h-full min-h-0"
      >
        {leftPanelOpen ? (
          <>
            <ResizablePanel
              defaultSize="300px"
              minSize="240px"
              maxSize="420px"
              groupResizeBehavior="preserve-pixel-size"
            >
              <WikiSidebar
                tree={treeQuery.data?.root ?? null}
                loading={treeQuery.isLoading}
                error={treeQuery.error}
                selectedPath={selectedPath}
                titleByPath={entryTitleByPath}
                query={query}
                searchOpen={searchOpen}
                searchResults={searchResults}
                searchLoading={searchQuery.isFetching}
                creatingFolderParent={creatingFolderParent}
                editingEntry={editingEntry}
                draggedEntry={draggedEntry}
                dropTarget={dropTarget}
                vaults={vaultsQuery.data?.vaults ?? []}
                activeVaultId={activeVaultId}
                activeVault={activeVault}
                showPropertiesInNotes={showPropertiesInNotes}
                noteFont={noteFont}
                onQueryChange={setQuery}
                onToggleSearch={() => {
                  setSearchOpen((open) => {
                    if (open) setQuery('')
                    return !open
                  })
                }}
                onSelectPath={navigateToPath}
                onStartNewEntry={createUntitledNote}
                onStartNewFolder={startInlineFolderCreate}
                onCancelInlineCreate={() => setCreatingFolderParent(null)}
                onCommitInlineCreate={commitInlineFolderCreate}
                onStartRename={startRename}
                onCancelRename={() => setEditingEntry(null)}
                onCommitRename={commitRename}
                onRequestDelete={(entry) => setDeleteTarget(entry)}
                onDragEntryStart={setDraggedEntry}
                onDragEntryEnd={() => {
                  setDraggedEntry(null)
                  setDropTarget(null)
                }}
                onDropTargetChange={setDropTarget}
                onMoveEntry={moveEntryToFolder}
                onRefresh={() => invalidateWiki()}
                onSwitchVault={(id) => switchVaultMutation.mutate(id)}
                onCreateVault={(payload) => createVaultMutation.mutate(payload)}
                onUpdateVault={(payload) => updateVaultMutation.mutate(payload)}
                onDeleteVault={(id) => deleteVaultMutation.mutate(id)}
                trashItems={trashQuery.data ?? []}
                trashLoading={trashQuery.isLoading}
                onRestoreTrashItem={(id) => restoreTrashMutation.mutate(id)}
                onPurgeTrashItem={(id) => purgeTrashMutation.mutate(id)}
                onShowPropertiesInNotesChange={(checked) =>
                  vaultSettingsMutation.mutate({
                    showPropertiesInNotes: checked,
                  })
                }
                onNoteFontChange={(font) => {
                  vaultSettingsMutation.mutate({ noteFont: font })
                }}
                vaultActionPending={
                  switchVaultMutation.isPending ||
                  createVaultMutation.isPending ||
                  updateVaultMutation.isPending ||
                  deleteVaultMutation.isPending ||
                  restoreTrashMutation.isPending ||
                  purgeTrashMutation.isPending
                }
              />
            </ResizablePanel>
            <ResizableHandle />
          </>
        ) : null}

        <ResizablePanel minSize="420px">
          <section className="flex h-full min-h-0 flex-col">
            <FileTabs
              paths={openPaths}
              activePath={selectedPath}
              titleByPath={entryTitleByPath}
              leftPanelOpen={leftPanelOpen}
              onToggleLeftPanel={() => setLeftPanelOpen((open) => !open)}
              rightPanelOpen={rightPanelOpen}
              onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
              onSelect={navigateToPath}
              onClose={closeTab}
              onNewNote={createUntitledNote}
            />
            <AppToolbar
              selectedPath={selectedPath}
              currentTitle={selectedDraftTitle}
              fileChanged={fileChanged}
              saving={saveMutation.isPending}
              canNavigateBack={backStack.length > 0}
              canNavigateForward={forwardStack.length > 0}
              onNavigateBack={navigateBack}
              onNavigateForward={navigateForward}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onOpenDaily={() => dailyNoteMutation.mutate()}
              onOpenTemplates={() => setTemplateOpen(true)}
            />

            <div className="min-h-0 flex-1 overflow-hidden">
              {selectedPath && selectedFileQuery.data ? (
                <div
                  className="h-full"
                  onClickCapture={handleMarkdownLinkClick}
                  onMouseOver={handleMarkdownLinkHover}
                  onMouseLeave={() => setLinkPreview(null)}
                >
                  {viewMode === 'edit' ? (
                    <div
                      ref={noteScrollRef}
                      className="wiki-hide-scrollbar h-full overflow-y-auto px-10 pb-[calc(var(--chat-safe-padding,0px)+2rem)] pt-8"
                    >
                      {showPropertiesInNotes ? (
                        <ObsidianPropertiesBlock
                          editable
                          propertyDefinitions={
                            propertiesQuery.data?.properties ?? []
                          }
                          properties={draftProperties}
                          onAddProperty={addProperty}
                          onPropertyChange={updatePropertyValue}
                          onPropertyRename={renameProperty}
                          onPropertyTypeChange={updatePropertyType}
                        />
                      ) : null}
                      <div style={noteContentStyle}>
                        <MarkdownEditor
                          key={selectedPath}
                          value={stripFrontmatter(draft)}
                          onChange={(body) =>
                            setDraft((content) =>
                              mergeFrontmatterWithBody(content, body),
                            )
                          }
                          placeholder="Write Markdown..."
                          className="wiki-markdown-editor !h-auto"
                          contentClassName={cn(
                            'mx-auto max-w-3xl bg-transparent px-0 !text-[15px] leading-7 !overflow-visible',
                            showPropertiesInNotes ? 'pt-2' : 'pt-0',
                          )}
                          minHeight="calc(100vh - 220px)"
                          maxHeight="none"
                          hideMarkdownHint
                          onMediaUpload={handleMediaUpload}
                          resolveMediaUrl={resolveMediaUrl}
                          referenceOptions={referenceOptions}
                          autoFocus
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={noteScrollRef}
                      className="wiki-hide-scrollbar h-full overflow-y-auto px-10 pb-[calc(var(--chat-safe-padding,0px)+2rem)] pt-8"
                    >
                      {showPropertiesInNotes ? (
                        <ObsidianPropertiesBlock
                          editable
                          propertyDefinitions={
                            propertiesQuery.data?.properties ?? []
                          }
                          properties={draftProperties}
                          onAddProperty={addProperty}
                          onPropertyChange={updatePropertyValue}
                          onPropertyRename={renameProperty}
                          onPropertyTypeChange={updatePropertyType}
                        />
                      ) : null}
                      <div
                        className="mx-auto max-w-3xl"
                        style={noteContentStyle}
                      >
                        <Markdown
                          markdown={preprocessRichWikiMarkdown(
                            stripFrontmatter(draft),
                            resolveMediaUrl,
                          )}
                          proseSize="base"
                          className="wiki-rich-markdown"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedFileQuery.isLoading ? (
                <QuietState
                  icon={<RefreshCw className="size-4 animate-spin" />}
                  title="Loading note"
                />
              ) : isEmptyVault ? (
                <EmptyVaultBootstrap
                  pending={
                    bootstrapVaultMutation.isPending ||
                    createNoteMutation.isPending
                  }
                  onStartBlank={createUntitledNote}
                  onBootstrap={(template) =>
                    bootstrapVaultMutation.mutate(template)
                  }
                />
              ) : (
                <QuietState
                  icon={<FileText className="size-4" />}
                  title="Select a note"
                />
              )}
            </div>
          </section>
        </ResizablePanel>

        {rightPanelOpen ? (
          <>
            <ResizableHandle />
            <ResizablePanel
              defaultSize="340px"
              minSize="280px"
              maxSize="520px"
              groupResizeBehavior="preserve-pixel-size"
            >
              <InspectorPanel
                file={
                  selectedFileQuery.data
                    ? {
                        ...selectedFileQuery.data,
                        content: draft,
                        properties: draftProperties,
                      }
                    : null
                }
                graph={graphQuery.data ?? null}
                health={healthQuery.data ?? null}
                healthLoading={healthQuery.isFetching}
                resolveMediaUrl={resolveMediaUrl}
                onSelectPath={navigateToPath}
                onLinkClick={selectLinkedPath}
                onAddProperty={addProperty}
                onPropertyChange={updatePropertyValue}
                onPropertyRename={renameProperty}
                onPropertyTypeChange={updatePropertyType}
                onPropertyReorder={reorderProperties}
                propertyDefinitions={propertiesQuery.data?.properties ?? []}
                onHeadingSelect={scrollToHeading}
                onDelete={() => {
                  if (selectedPath)
                    setDeleteTarget({ path: selectedPath, kind: 'note' })
                }}
              />
            </ResizablePanel>
          </>
        ) : null}
      </ResizablePanelGroup>
      {isDraggingMedia ? (
        <div className="bg-background/72 pointer-events-none absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="border-border/70 bg-background/90 text-muted-foreground rounded-lg border px-4 py-2 text-sm shadow-lg">
            Drop media into note
          </div>
        </div>
      ) : null}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.kind === 'folder' ? 'folder' : 'note'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This moves <span className="font-mono">{deleteTarget?.path}</span>
              {deleteTarget?.kind === 'folder'
                ? ' and everything inside it to trash.'
                : ' to trash.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={deleteEntryMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              disabled={deleteEntryMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteEntryMutation.mutate(deleteTarget)
              }}
            >
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TemplateDialog
        open={templateOpen}
        templates={templatesQuery.data ?? []}
        loading={templatesQuery.isLoading}
        pending={
          applyTemplateMutation.isPending || createNoteMutation.isPending
        }
        onOpenChange={setTemplateOpen}
        onApply={(selection) => {
          const template =
            selection.kind === 'file'
              ? templatesQuery.data?.find(
                  (item) => item.path === selection.path,
                )
              : null
          const templateContent =
            selection.kind === 'builtin'
              ? selection.template.content
              : template?.content
          const templateTitle =
            selection.kind === 'builtin'
              ? selection.template.title
              : template
                ? titleFromPath(template.path)
                : 'Untitled'

          if (!templateContent) return

          if (selectedPath) {
            setDraft((content) =>
              insertTemplateContent(
                content,
                applyTemplateVariables(
                  templateContent,
                  selectedDraftTitle ?? titleFromPath(selectedPath),
                ),
              ),
            )
            setTemplateOpen(false)
            setViewMode('edit')
            return
          }

          if (selection.kind === 'builtin') {
            setTemplateOpen(false)
            createNoteMutation.mutate({
              title: templateTitle,
              content: applyTemplateVariables(templateContent, templateTitle),
            })
            return
          }

          applyTemplateMutation.mutate(selection.path)
        }}
      />
      {linkPreview && previewEntry ? (
        <div
          className="border-border/80 bg-popover text-popover-foreground pointer-events-none fixed z-50 w-80 rounded-lg border p-3 shadow-2xl"
          style={{ left: linkPreview.x, top: linkPreview.y }}
        >
          <div className="truncate text-sm font-semibold">
            {previewEntry.title}
          </div>
          <div className="text-muted-foreground mt-1 truncate font-mono text-[11px]">
            {previewEntry.path}
          </div>
          <div className="text-muted-foreground mt-2 text-xs">
            {previewEntry.updatedAt
              ? `Updated ${formatRelativeTime(previewEntry.updatedAt)}`
              : 'Unresolved note'}
          </div>
        </div>
      ) : null}
    </main>
  )
}

function EmptyVaultBootstrap({
  pending,
  onStartBlank,
  onBootstrap,
}: {
  pending: boolean
  onStartBlank: () => void
  onBootstrap: (template: BootstrapTemplateId) => void
}) {
  return (
    <div className="wiki-hide-scrollbar flex h-full items-center overflow-y-auto px-8 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 max-w-xl">
          <div className="text-foreground text-xl font-semibold">
            Start this vault
          </div>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Keep it blank, or choose a lightweight starter shape.
          </p>
        </div>
        <div className="wiki-hide-scrollbar flex snap-x gap-3 overflow-x-auto pb-2">
          <TemplateChoice
            title="Blank vault"
            folders={[]}
            disabled={pending}
            className="min-h-44 w-64"
            onClick={onStartBlank}
          />

          {bootstrapTemplates.map((template) => (
            <TemplateChoice
              key={template.id}
              title={template.title}
              folders={template.folders}
              disabled={pending}
              className="min-h-44 w-64"
              onClick={() => onBootstrap(template.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function TemplateDialog({
  open,
  templates,
  loading,
  pending,
  onOpenChange,
  onApply,
}: {
  open: boolean
  templates: WikiFile[]
  loading: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onApply: (selection: TemplateDialogSelection) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
          <DialogDescription>
            Start from a built-in note shape or use markdown files from the
            vault templates folder.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-5 overflow-hidden">
          <TemplateCarousel title="Built-in templates">
            {builtInNoteTemplates.map((template) => (
              <TemplateChoice
                key={template.id}
                title={template.title}
                description={template.description}
                preview={template.preview}
                disabled={pending}
                className="min-h-48 w-56"
                onClick={() => onApply({ kind: 'builtin', template })}
              />
            ))}
          </TemplateCarousel>

          <div className="min-w-0">
            <div className="mb-2 flex h-6 items-center justify-between">
              <div className="text-muted-foreground text-xs font-semibold">
                Vault templates
              </div>
              <div className="text-muted-foreground/75 text-[11px]">
                {loading ? 'Loading' : `${templates.length} files`}
              </div>
            </div>

            {loading ? (
              <div className="border-border/70 bg-muted/15 flex h-36 items-center justify-center rounded-md border">
                <QuietState
                  icon={<RefreshCw className="size-4 animate-spin" />}
                  title="Loading templates"
                />
              </div>
            ) : templates.length === 0 ? (
              <div className="border-border/70 bg-muted/15 flex h-36 items-center justify-center rounded-md border px-6 text-center">
                <div>
                  <div className="text-sm font-medium">
                    No vault templates yet
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs leading-5">
                    Add markdown files under{' '}
                    <span className="font-mono">templates/</span> to show them
                    here.
                  </div>
                </div>
              </div>
            ) : (
              <TemplateCarousel title={null}>
                {templates.map((template) => (
                  <TemplateChoice
                    key={template.path}
                    title={template.title}
                    description={template.path}
                    preview={templatePreviewLines(template.content)}
                    disabled={pending}
                    className="min-h-48 w-56"
                    onClick={() =>
                      onApply({ kind: 'file', path: template.path })
                    }
                  />
                ))}
              </TemplateCarousel>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TemplateCarousel({
  title,
  children,
}: {
  title: string | null
  children: ReactNode
}) {
  return (
    <div className="min-w-0">
      {title ? (
        <div className="text-muted-foreground mb-2 text-xs font-semibold">
          {title}
        </div>
      ) : null}
      <div className="wiki-hide-scrollbar flex w-full min-w-0 snap-x gap-3 overflow-x-auto overscroll-x-contain pb-3">
        {children}
      </div>
    </div>
  )
}

function templatePreviewLines(content: string) {
  return stripFrontmatter(content)
    .split('\n')
    .map((line) =>
      line
        .replace(/^#+\s*/, '')
        .replace(/^[-*]\s*/, '')
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 4)
}

function propertyDisplayType(property: WikiProperty): DisplayPropertyType {
  const key = property.key.toLowerCase()
  const value = property.value.trim()

  if (key === 'tags' || key === 'tag') return 'tags'
  if (/^https?:\/\//i.test(value) || key === 'source' || key === 'url')
    return 'url'
  return property.type ?? inferPropertyType(property.key, property.value)
}

function propertyIconFor(type: DisplayPropertyType) {
  if (type === 'tags') return <Tags className="size-4" />
  if (type === 'date' || type === 'datetime')
    return <CalendarDays className="size-4" />
  if (type === 'number') return <Hash className="size-4" />
  if (type === 'url') return <Link2 className="size-4" />
  if (type === 'list') return <List className="size-4" />
  if (type === 'checkbox') return <ToggleRight className="size-4" />

  return <AlignLeft className="size-4" />
}

function propertyTypeLabel(type: WikiPropertyType) {
  return (
    propertyTypeOptions.find((option) => option.type === type)?.label ?? 'Text'
  )
}

function PropertyTypeMenuItems({
  currentType,
  disabled,
  onChange,
}: {
  currentType: WikiPropertyType
  disabled?: boolean
  onChange: (type: WikiPropertyType) => void
}) {
  return (
    <>
      {propertyTypeOptions.map((option) => (
        <DropdownMenuItem
          key={option.type}
          className="cursor-pointer items-start gap-2"
          disabled={disabled}
          onClick={() => onChange(option.type)}
        >
          <span className="text-muted-foreground flex size-5 shrink-0 items-start justify-center pt-0.5">
            {propertyIconFor(option.type)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-xs">{option.label}</span>
            <span className="text-muted-foreground truncate text-xs">
              {option.description}
            </span>
          </span>
          {currentType === option.type ? (
            <Check className="ml-auto mt-0.5 size-3.5 shrink-0" />
          ) : null}
        </DropdownMenuItem>
      ))}
    </>
  )
}

function ObsidianPropertiesBlock({
  editable,
  onAddProperty,
  propertyDefinitions,
  properties,
  onPropertyChange,
  onPropertyRename,
  onPropertyTypeChange,
  onPropertyReorder,
  reorderable = false,
}: {
  editable?: boolean
  onAddProperty: (key: string, value: string, type: WikiPropertyType) => void
  propertyDefinitions: WikiPropertyDefinition[]
  properties: WikiProperty[]
  onPropertyChange: (key: string, value: string, type: WikiPropertyType) => void
  onPropertyRename: (
    oldKey: string,
    newKey: string,
    value: string,
    type: WikiPropertyType,
  ) => void
  onPropertyTypeChange: (key: string, type: WikiPropertyType) => void
  onPropertyReorder?: (orderedKeys: string[]) => void
  reorderable?: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newType, setNewType] = useState<WikiPropertyType>('text')
  const [newKeyFocused, setNewKeyFocused] = useState(false)
  const usedPropertyKeys = new Set(
    properties.map((property) => property.key.toLowerCase()),
  )
  const suggestedProperties = propertyDefinitions
    .filter((definition) => !usedPropertyKeys.has(definition.key.toLowerCase()))
    .filter((definition) =>
      newKey.trim()
        ? definition.key.toLowerCase().includes(newKey.trim().toLowerCase())
        : true,
    )
    .slice(0, 6)
  const sortable = Boolean(
    reorderable && editable && onPropertyReorder && properties.length > 1,
  )
  const sortableSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 6 },
    }),
  )

  function commitNewProperty() {
    const key = newKey.trim()
    if (!key) return
    onAddProperty(key, newValue, newType)
    setNewKey('')
    setNewValue('')
    setNewType('text')
    setAdding(false)
  }

  function handlePropertyDragOver(event: DragOverEvent) {
    if (!sortable || !onPropertyReorder) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const propertyKeys = properties.map((property) => property.key)
    const oldIndex = propertyKeys.indexOf(String(active.id))
    const newIndex = propertyKeys.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
    onPropertyReorder(arrayMove(propertyKeys, oldIndex, newIndex))
  }

  const propertyRows = properties.map((property) =>
    sortable ? (
      <SortablePropertyRow
        key={property.key}
        editable={Boolean(editable)}
        property={property}
        onPropertyChange={onPropertyChange}
        onPropertyRename={onPropertyRename}
        onPropertyTypeChange={onPropertyTypeChange}
      />
    ) : (
      <PropertyRow
        key={property.key}
        editable={Boolean(editable)}
        property={property}
        onPropertyChange={onPropertyChange}
        onPropertyRename={onPropertyRename}
        onPropertyTypeChange={onPropertyTypeChange}
      />
    ),
  )

  return (
    <div className="wiki-properties-block border-border/70 mx-auto mb-6 max-w-3xl border-b pb-4">
      <div className="mb-2 flex h-8 items-center justify-between">
        <div className="text-foreground text-xs font-semibold">Properties</div>
        {editable ? (
          <button
            type="button"
            className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs"
            onClick={() => setAdding((open) => !open)}
          >
            <Plus className="size-3.5" />
            Add property
          </button>
        ) : null}
      </div>
      {properties.length === 0 && !adding ? (
        <div className="text-muted-foreground py-1 text-xs">No properties.</div>
      ) : null}
      <div className="space-y-0.5">
        {sortable ? (
          <DndContext
            sensors={sortableSensors}
            collisionDetection={closestCenter}
            onDragOver={handlePropertyDragOver}
          >
            {propertyRows}
          </DndContext>
        ) : (
          propertyRows
        )}
        {adding ? (
          <div className="bg-muted/20 grid min-h-8 grid-cols-[minmax(104px,140px)_minmax(0,1fr)_32px] items-start gap-1.5 rounded-md px-0.5 py-0.5">
            <div className="text-muted-foreground flex min-w-0 items-start gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground/75 hover:bg-muted hover:text-foreground flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md"
                    title={`Property type: ${propertyTypeLabel(newType)}`}
                  >
                    {propertyIconFor(newType)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel>Property type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <PropertyTypeMenuItems
                    currentType={newType}
                    onChange={(type) => {
                      setNewType(type)
                      if (type === 'checkbox' && !newValue.trim())
                        setNewValue('false')
                    }}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="relative min-w-0 flex-1">
                <Input
                  value={newKey}
                  placeholder={propertyTypeLabel(newType)}
                  className="h-7 border-transparent bg-transparent px-1 !text-xs font-medium shadow-none focus-visible:ring-1 dark:bg-transparent"
                  onChange={(event) => setNewKey(event.target.value)}
                  onFocus={() => setNewKeyFocused(true)}
                  onBlur={() =>
                    window.setTimeout(() => setNewKeyFocused(false), 120)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitNewProperty()
                    if (event.key === 'Escape') setAdding(false)
                  }}
                  autoFocus
                />
                {newKeyFocused && suggestedProperties.length > 0 ? (
                  <div className="border-border/80 bg-popover text-popover-foreground absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-md border p-1 shadow-lg">
                    {suggestedProperties.map((definition) => (
                      <button
                        key={definition.key}
                        type="button"
                        className="hover:bg-accent hover:text-accent-foreground flex h-9 w-full cursor-pointer items-center gap-2 rounded-sm px-2 text-left"
                        onMouseDown={(event) => {
                          event.preventDefault()
                          setNewKey(definition.key)
                          setNewType(definition.type)
                        }}
                      >
                        <span className="text-muted-foreground flex size-5 shrink-0 items-center justify-center">
                          {propertyIconFor(definition.type)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs">
                          {definition.key}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {definition.count}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="min-w-0">
              <PropertyValueEditor
                value={newValue}
                type={newType}
                onChange={setNewValue}
                onCommit={commitNewProperty}
                onCancel={() => setAdding(false)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0 cursor-pointer px-0"
              aria-label="Add property"
              title="Add property"
              onClick={commitNewProperty}
            >
              <Check className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function SortablePropertyRow({
  editable,
  property,
  onPropertyChange,
  onPropertyRename,
  onPropertyTypeChange,
}: {
  editable: boolean
  property: WikiProperty
  onPropertyChange: (key: string, value: string, type: WikiPropertyType) => void
  onPropertyRename: (
    oldKey: string,
    newKey: string,
    value: string,
    type: WikiPropertyType,
  ) => void
  onPropertyTypeChange: (key: string, type: WikiPropertyType) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({ id: property.key })
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: property.key,
  })
  const setRowRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDraggableRef(node)
      setDroppableRef(node)
    },
    [setDraggableRef, setDroppableRef],
  )
  const style = {
    transform: CSS.Transform.toString(
      transform && { ...transform, scaleX: 1, scaleY: 1 },
    ),
  }

  return (
    <PropertyRow
      editable={editable}
      property={property}
      rowRef={setRowRef}
      style={style}
      isDragging={isDragging}
      isDropTarget={isOver && !isDragging}
      dragHandle={
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground/70 hover:text-foreground flex h-7 w-6 cursor-grab touch-none items-center justify-center rounded-sm opacity-45 transition-opacity focus:opacity-100 active:cursor-grabbing group-hover:opacity-100"
          aria-label={`Reorder ${property.key}`}
          title={`Reorder ${property.key}`}
        >
          <GripVertical className="size-3.5" />
        </button>
      }
      onPropertyChange={onPropertyChange}
      onPropertyRename={onPropertyRename}
      onPropertyTypeChange={onPropertyTypeChange}
    />
  )
}

function PropertyRow({
  editable,
  property,
  dragHandle,
  rowRef,
  style,
  isDragging,
  isDropTarget,
  onPropertyChange,
  onPropertyRename,
  onPropertyTypeChange,
}: {
  editable: boolean
  property: WikiProperty
  dragHandle?: ReactNode
  rowRef?: (node: HTMLDivElement | null) => void
  style?: CSSProperties
  isDragging?: boolean
  isDropTarget?: boolean
  onPropertyChange: (key: string, value: string, type: WikiPropertyType) => void
  onPropertyRename: (
    oldKey: string,
    newKey: string,
    value: string,
    type: WikiPropertyType,
  ) => void
  onPropertyTypeChange: (key: string, type: WikiPropertyType) => void
}) {
  const displayType = propertyDisplayType(property)
  const editableType =
    property.key.toLowerCase() === 'tags'
      ? 'tags'
      : (property.type ?? inferPropertyType(property.key, property.value))

  return (
    <div
      ref={rowRef}
      style={style}
      className={cn(
        'hover:bg-muted/35 group grid min-h-7 items-start gap-1.5 rounded-md px-0.5 py-0.5',
        dragHandle
          ? 'grid-cols-[24px_minmax(94px,132px)_minmax(0,1fr)]'
          : 'grid-cols-[minmax(104px,140px)_minmax(0,1fr)]',
        isDragging && 'bg-muted relative z-50 opacity-40 shadow-md',
        isDropTarget && 'bg-muted/55 ring-border ring-1',
      )}
    >
      {dragHandle ? (
        <div className="flex h-7 items-center justify-center">{dragHandle}</div>
      ) : null}
      <div className="text-muted-foreground flex min-w-0 items-start gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground/75 hover:bg-muted hover:text-foreground flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md"
              title="Change property type"
            >
              {propertyIconFor(displayType)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Property type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <PropertyTypeMenuItems
              currentType={editableType}
              disabled={false}
              onChange={(type) => onPropertyTypeChange(property.key, type)}
            />
          </DropdownMenuContent>
        </DropdownMenu>
        <PropertyKeyInput
          editable={editable}
          property={property}
          type={editableType}
          onRename={onPropertyRename}
        />
      </div>
      <PropertyValueInput
        property={property}
        type={editableType}
        onCommit={(value) =>
          onPropertyChange(property.key, value, editableType)
        }
      />
    </div>
  )
}

function PropertyKeyInput({
  editable,
  property,
  type,
  onRename,
}: {
  editable: boolean
  property: WikiProperty
  type: WikiPropertyType
  onRename: (
    oldKey: string,
    newKey: string,
    value: string,
    type: WikiPropertyType,
  ) => void
}) {
  if (!editable) {
    return (
      <span className="flex h-7 items-center truncate !text-xs font-medium">
        {property.key}
      </span>
    )
  }

  return (
    <Input
      key={property.key}
      defaultValue={property.key}
      aria-label={`Rename ${property.key}`}
      className="h-7 min-w-0 border-transparent bg-transparent px-1 !text-xs font-medium shadow-none focus-visible:ring-1 dark:bg-transparent"
      onBlur={(event) => {
        const nextKey = event.currentTarget.value.trim()
        if (!nextKey || nextKey === property.key) {
          event.currentTarget.value = property.key
          return
        }
        onRename(property.key, nextKey, property.value, type)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          event.currentTarget.value = property.key
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function parsePropertyDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timeFromDateValue(value: string) {
  return /T(\d{2}:\d{2})/.exec(value.trim())?.[1] ?? '09:00'
}

function splitTagValue(value: string) {
  const seen = new Set<string>()
  return value
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function tagValueFromTags(tags: string[]) {
  return splitTagValue(tags.join(', ')).join(', ')
}

function listValueFromItems(items: string[]) {
  return splitListValue(items.join(', ')).join(', ')
}

function formatDateLabel(value: string, type: WikiPropertyType) {
  const date = parsePropertyDate(value)
  if (!date) return type === 'datetime' ? 'Pick date and time' : 'Pick date'
  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return type === 'datetime'
    ? `${dateLabel} ${timeFromDateValue(value)}`
    : dateLabel
}

function PropertyDatePicker({
  value,
  type,
  onChange,
}: {
  value: string
  type: WikiPropertyType
  onChange: (value: string) => void
}) {
  const selected = parsePropertyDate(value)
  const time = timeFromDateValue(value)

  function commitDate(date: Date | undefined, nextTime = time) {
    if (!date) return
    const dateValue = formatDateValue(date)
    onChange(type === 'datetime' ? `${dateValue}T${nextTime}` : dateValue)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-background/60 focus-visible:border-ring focus-visible:ring-ring/50 text-foreground flex h-7 w-full min-w-0 cursor-pointer items-center rounded-md border border-transparent bg-transparent px-1.5 text-left !text-xs shadow-none outline-none transition-[color,box-shadow] focus-visible:ring-[3px] dark:bg-transparent"
        >
          <span className="truncate">{formatDateLabel(value, type)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => commitDate(date)}
          className="rounded-md"
        />
        {type === 'datetime' ? (
          <div className="border-border/70 flex items-center gap-2 border-t p-3">
            <div className="text-muted-foreground w-12 text-xs">Time</div>
            <Input
              type="time"
              value={time}
              className="h-8 bg-transparent !text-xs dark:bg-transparent"
              onChange={(event) => {
                const date = selected ?? new Date()
                commitDate(date, event.currentTarget.value || '09:00')
              }}
            />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function PropertyValueInput({
  property,
  type,
  onCommit,
}: {
  property: WikiProperty
  type: WikiPropertyType
  onCommit: (value: string) => void
}) {
  if (type === 'checkbox') {
    const checked = /^(true|yes|1|checked)$/i.test(property.value)
    return (
      <div className="flex h-7 items-center px-1.5">
        <Switch
          checked={checked}
          size="sm"
          aria-label={`${property.key}: ${checked ? 'on' : 'off'}`}
          className="cursor-pointer"
          onCheckedChange={(nextChecked) =>
            onCommit(nextChecked === true ? 'true' : 'false')
          }
        />
      </div>
    )
  }

  if (type === 'date' || type === 'datetime') {
    return (
      <PropertyDatePicker
        value={property.value}
        type={type}
        onChange={onCommit}
      />
    )
  }

  if (type === 'tags') {
    return <PropertyTagsInput value={property.value} onChange={onCommit} />
  }

  if (type === 'list') {
    return <PropertyListInput value={property.value} onChange={onCommit} />
  }

  const inputType = type === 'number' ? 'number' : 'text'

  return (
    <Input
      key={`${property.key}:${property.value}:${type}`}
      type={inputType}
      defaultValue={property.value}
      aria-label={property.key}
      className="hover:bg-background/60 h-7 min-w-0 border-transparent bg-transparent px-1.5 !text-xs shadow-none focus-visible:ring-1 dark:bg-transparent"
      onBlur={(event) => {
        if (event.currentTarget.value !== property.value) {
          onCommit(event.currentTarget.value)
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          event.currentTarget.value = property.value
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function PropertyValueEditor({
  value,
  type,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string
  type: WikiPropertyType
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  if (type === 'checkbox') {
    const checked = /^(true|yes|1|checked)$/i.test(value)
    return (
      <div className="flex h-7 items-center rounded-md px-1.5">
        <Switch
          checked={checked}
          size="sm"
          aria-label={checked ? 'Enabled' : 'Disabled'}
          className="cursor-pointer"
          onCheckedChange={(nextChecked) =>
            onChange(nextChecked === true ? 'true' : 'false')
          }
        />
      </div>
    )
  }

  if (type === 'date' || type === 'datetime') {
    return <PropertyDatePicker value={value} type={type} onChange={onChange} />
  }

  if (type === 'tags') {
    return <PropertyTagsInput value={value} onChange={onChange} />
  }

  if (type === 'list') {
    return <PropertyListInput value={value} onChange={onChange} />
  }

  const inputType = type === 'number' ? 'number' : 'text'

  return (
    <Input
      value={value}
      type={inputType}
      placeholder="Value"
      className="h-7 border-transparent bg-transparent px-1.5 !text-xs shadow-none focus-visible:ring-1 dark:bg-transparent"
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onCommit()
        if (event.key === 'Escape') onCancel()
      }}
    />
  )
}

function PropertyTagsInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [draft, setDraft] = useState('')
  const tags = splitTagValue(value)

  function commitDraft(rawValue = draft) {
    const nextTags = splitTagValue(rawValue)
    if (nextTags.length === 0) return
    onChange(tagValueFromTags([...tags, ...nextTags]))
    setDraft('')
  }

  function removeTag(tag: string) {
    onChange(
      tagValueFromTags(
        tags.filter((item) => item.toLowerCase() !== tag.toLowerCase()),
      ),
    )
  }

  return (
    <div className="hover:bg-background/60 flex min-h-7 min-w-0 flex-wrap items-center gap-1 rounded-md border border-transparent bg-transparent px-0 py-0.5 text-xs dark:bg-transparent">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="group/tag border-border text-muted-foreground h-5 max-w-36 gap-1 bg-transparent px-2 !text-xs transition-[padding] duration-150 ease-out focus-within:pr-1.5 hover:pr-1.5 dark:bg-transparent"
        >
          <span className="truncate">{tag}</span>
          <button
            type="button"
            className="hover:text-foreground flex w-0 translate-x-1 cursor-pointer items-center overflow-hidden opacity-0 transition-[width,opacity,transform,color] duration-150 ease-out group-focus-within/tag:w-3 group-focus-within/tag:translate-x-0 group-focus-within/tag:opacity-100 group-hover/tag:w-3 group-hover/tag:translate-x-0 group-hover/tag:opacity-100 motion-reduce:transition-none"
            aria-label={`Remove ${tag}`}
            onClick={() => removeTag(tag)}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        placeholder={tags.length > 0 ? 'Add tag' : 'Tags'}
        className="h-6 min-w-24 flex-1 border-transparent bg-transparent px-2 !text-xs shadow-none focus-visible:ring-0 dark:bg-transparent"
        onChange={(event) => {
          const nextValue = event.currentTarget.value
          if (nextValue.includes(',')) {
            commitDraft(nextValue)
            return
          }
          setDraft(nextValue)
        }}
        onBlur={() => commitDraft()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitDraft()
          }
          if (event.key === 'Backspace' && !draft && tags.length > 0) {
            removeTag(tags[tags.length - 1] ?? '')
          }
        }}
      />
    </div>
  )
}

function PropertyListInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [draft, setDraft] = useState('')
  const items = splitListValue(value)

  function commitDraft(rawValue = draft) {
    const nextItems = splitListValue(rawValue)
    if (nextItems.length === 0) return
    onChange(listValueFromItems([...items, ...nextItems]))
    setDraft('')
  }

  function removeItem(item: string) {
    onChange(
      listValueFromItems(items.filter((valueItem) => valueItem !== item)),
    )
  }

  return (
    <div className="hover:bg-background/60 flex min-h-7 min-w-0 flex-wrap items-center gap-1 rounded-md border border-transparent bg-transparent px-0 py-0.5 text-xs dark:bg-transparent">
      {items.map((item) => (
        <Badge
          key={item}
          variant="secondary"
          className="group/list bg-muted/70 text-muted-foreground dark:bg-muted/50 h-5 max-w-40 gap-1 px-2 !text-xs transition-[padding] duration-150 ease-out focus-within:pr-1.5 hover:pr-1.5"
        >
          <span className="truncate">{item}</span>
          <button
            type="button"
            className="hover:text-foreground flex w-0 translate-x-1 cursor-pointer items-center overflow-hidden opacity-0 transition-[width,opacity,transform,color] duration-150 ease-out group-focus-within/list:w-3 group-focus-within/list:translate-x-0 group-focus-within/list:opacity-100 group-hover/list:w-3 group-hover/list:translate-x-0 group-hover/list:opacity-100 motion-reduce:transition-none"
            aria-label={`Remove ${item}`}
            onClick={() => removeItem(item)}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        placeholder={items.length > 0 ? 'Add item' : 'List items'}
        className="h-6 min-w-24 flex-1 border-transparent bg-transparent px-2 !text-xs shadow-none focus-visible:ring-0 dark:bg-transparent"
        onChange={(event) => {
          const nextValue = event.currentTarget.value
          if (nextValue.includes(',')) {
            commitDraft(nextValue)
            return
          }
          setDraft(nextValue)
        }}
        onBlur={() => commitDraft()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitDraft()
          }
          if (event.key === 'Backspace' && !draft && items.length > 0) {
            removeItem(items[items.length - 1] ?? '')
          }
        }}
      />
    </div>
  )
}

function FileTabs({
  paths,
  activePath,
  titleByPath,
  leftPanelOpen,
  onToggleLeftPanel,
  rightPanelOpen,
  onToggleRightPanel,
  onSelect,
  onClose,
  onNewNote,
}: {
  paths: string[]
  activePath: string | null
  titleByPath: Map<string, string>
  leftPanelOpen: boolean
  onToggleLeftPanel: () => void
  rightPanelOpen: boolean
  onToggleRightPanel: () => void
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onNewNote: () => void
}) {
  return (
    <div className="bg-background flex h-10 shrink-0 items-stretch">
      <TabBarIconButton
        label={leftPanelOpen ? 'Hide folders' : 'Show folders'}
        onClick={onToggleLeftPanel}
        className="border-r"
      >
        {leftPanelOpen ? <PanelLeftClose /> : <PanelLeft />}
      </TabBarIconButton>
      <div className="wiki-hide-scrollbar flex min-w-0 flex-1 overflow-x-auto">
        {paths.length === 0 ? (
          <div className="border-border/70 text-muted-foreground flex flex-1 items-center border-b px-4 text-sm">
            No open notes
          </div>
        ) : (
          <>
            {paths.map((path) => {
              const active = activePath === path
              return (
                <div
                  key={path}
                  className={cn(
                    'border-border/70 group flex min-w-44 max-w-64 items-center gap-2 border-r px-3 text-sm',
                    active
                      ? 'bg-background text-foreground'
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground border-b',
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 cursor-pointer truncate text-left"
                    title={path}
                    onClick={() => onSelect(path)}
                  >
                    {titleByPath.get(path) ?? titleFromPath(path)}
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm opacity-70"
                    aria-label={`Close ${path}`}
                    onClick={() => onClose(path)}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )
            })}
            <div className="border-border/70 min-w-6 flex-1 border-b" />
          </>
        )}
      </div>
      <button
        type="button"
        className="border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground flex w-10 shrink-0 cursor-pointer items-center justify-center border-b border-l"
        aria-label="New note"
        onClick={onNewNote}
      >
        <Plus className="size-4" />
      </button>
      <TabBarIconButton
        label={rightPanelOpen ? 'Hide details' : 'Show details'}
        onClick={onToggleRightPanel}
        className="border-l"
      >
        {rightPanelOpen ? <PanelRightClose /> : <PanelRight />}
      </TabBarIconButton>
    </div>
  )
}

function AppToolbar({
  selectedPath,
  currentTitle,
  fileChanged,
  saving,
  canNavigateBack,
  canNavigateForward,
  onNavigateBack,
  onNavigateForward,
  viewMode,
  onViewModeChange,
  onOpenDaily,
  onOpenTemplates,
}: {
  selectedPath: string | null
  currentTitle: string | null
  fileChanged: boolean
  saving: boolean
  canNavigateBack: boolean
  canNavigateForward: boolean
  onNavigateBack: () => void
  onNavigateForward: () => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onOpenDaily: () => void
  onOpenTemplates: () => void
}) {
  const parts = breadcrumbParts(selectedPath, currentTitle)

  return (
    <header className="bg-background relative flex h-11 shrink-0 items-center px-3">
      <div className="flex min-w-0 flex-1 items-center justify-start gap-1">
        <IconButton
          label="Back"
          onClick={onNavigateBack}
          disabled={!canNavigateBack}
        >
          <ArrowLeft />
        </IconButton>
        <IconButton
          label="Forward"
          onClick={onNavigateForward}
          disabled={!canNavigateForward}
        >
          <ArrowRight />
        </IconButton>
      </div>
      <nav
        className="absolute left-1/2 flex max-w-[min(44rem,calc(100%-18rem))] -translate-x-1/2 items-center gap-1.5 text-sm"
        aria-label="Current note"
      >
        {parts.map((part, index) => {
          const isLast = index === parts.length - 1
          return (
            <span
              key={`${part}-${index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 ? (
                <span className="text-muted-foreground/70 shrink-0">/</span>
              ) : null}
              <span
                className={cn(
                  'truncate',
                  isLast
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground',
                )}
              >
                {part}
              </span>
            </span>
          )
        })}
      </nav>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <div className="text-muted-foreground flex w-14 justify-end text-[11px]">
          {viewMode === 'edit'
            ? saving
              ? 'Saving'
              : fileChanged
                ? 'Edited'
                : ''
            : ''}
        </div>
        <IconButton label="Daily note" onClick={onOpenDaily}>
          <CalendarDays />
        </IconButton>
        <IconButton label="Templates" onClick={onOpenTemplates}>
          <FileText />
        </IconButton>
        <ViewModeButton mode={viewMode} onChange={onViewModeChange} />
      </div>
    </header>
  )
}

function ViewModeButton({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const nextMode = mode === 'read' ? 'edit' : 'read'
  return (
    <IconButton
      label={nextMode === 'read' ? 'Read note' : 'Edit note'}
      onClick={() => onChange(nextMode)}
    >
      {nextMode === 'read' ? <BookOpen /> : <PencilLine />}
    </IconButton>
  )
}

function WikiSidebar({
  tree,
  loading,
  error,
  selectedPath,
  titleByPath,
  query,
  searchOpen,
  searchResults,
  searchLoading,
  creatingFolderParent,
  editingEntry,
  draggedEntry,
  dropTarget,
  vaults,
  activeVaultId,
  activeVault,
  showPropertiesInNotes,
  noteFont,
  onQueryChange,
  onToggleSearch,
  onSelectPath,
  onStartNewEntry,
  onStartNewFolder,
  onCancelInlineCreate,
  onCommitInlineCreate,
  onStartRename,
  onCancelRename,
  onCommitRename,
  onRequestDelete,
  onDragEntryStart,
  onDragEntryEnd,
  onDropTargetChange,
  onMoveEntry,
  onRefresh,
  onSwitchVault,
  onCreateVault,
  onUpdateVault,
  onDeleteVault,
  trashItems,
  trashLoading,
  onRestoreTrashItem,
  onPurgeTrashItem,
  onShowPropertiesInNotesChange,
  onNoteFontChange,
  vaultActionPending,
}: {
  tree: WikiEntry | null
  loading: boolean
  error: Error | null
  selectedPath: string | null
  titleByPath: Map<string, string>
  query: string
  searchOpen: boolean
  searchResults: WikiSearchResult[]
  searchLoading: boolean
  creatingFolderParent: string | null
  editingEntry: EditingEntry | null
  draggedEntry: MovableEntry | null
  dropTarget: TreeDropTarget | null
  vaults: WikiVault[]
  activeVaultId: string
  activeVault: WikiVault | null
  showPropertiesInNotes: boolean
  noteFont: WikiNoteFont
  onQueryChange: (value: string) => void
  onToggleSearch: () => void
  onSelectPath: (path: string) => void
  onStartNewEntry: () => void
  onStartNewFolder: () => void
  onCancelInlineCreate: () => void
  onCommitInlineCreate: (name: string) => void
  onStartRename: (entry: WikiEntry) => void
  onCancelRename: () => void
  onCommitRename: (value: string) => void
  onRequestDelete: (entry: { path: string; kind: EntryKind }) => void
  onDragEntryStart: (entry: MovableEntry) => void
  onDragEntryEnd: () => void
  onDropTargetChange: (target: TreeDropTarget | null) => void
  onMoveEntry: (entry: MovableEntry, targetFolder: string) => void
  onRefresh: () => void
  onSwitchVault: (id: string) => void
  onCreateVault: (payload: VaultCreatePayload) => void
  onUpdateVault: (payload: VaultUpdatePayload) => void
  onDeleteVault: (id: string) => void
  trashItems: WikiTrashItem[]
  trashLoading: boolean
  onRestoreTrashItem: (id: string) => void
  onPurgeTrashItem: (id: string) => void
  onShowPropertiesInNotesChange: (checked: boolean) => void
  onNoteFontChange: (font: WikiNoteFont) => void
  vaultActionPending: boolean
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor),
  )

  function dragEntryFromEvent(
    event: DragStartEvent | DragOverEvent | DragEndEvent | DragCancelEvent,
  ) {
    return wikiDragData(event.active.data.current).entry ?? null
  }

  function dropTargetFromEvent(event: DragOverEvent | DragEndEvent) {
    return event.over
      ? (wikiDragData(event.over.data.current).target ?? null)
      : null
  }

  function handleTreeDragStart(event: DragStartEvent) {
    const entry = dragEntryFromEvent(event)
    if (entry) onDragEntryStart(entry)
  }

  function handleTreeDragOver(event: DragOverEvent) {
    const entry = dragEntryFromEvent(event)
    const target = dropTargetFromEvent(event)
    onDropTargetChange(
      entry && target && canMoveEntryToFolder(entry, target.folder)
        ? target
        : null,
    )
  }

  function handleTreeDragEnd(event: DragEndEvent) {
    const entry = dragEntryFromEvent(event)
    const target = dropTargetFromEvent(event)

    if (entry && target && canMoveEntryToFolder(entry, target.folder)) {
      onMoveEntry(entry, target.folder)
    } else {
      onDropTargetChange(null)
      onDragEntryEnd()
    }
  }

  function handleTreeDragCancel() {
    onDropTargetChange(null)
    onDragEntryEnd()
  }

  return (
    <aside className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-border/70 flex h-10 shrink-0 items-center gap-1 border-b px-2.5">
        <div className="min-w-0 flex-1 select-none truncate text-sm font-semibold leading-4">
          {activeVault?.name ?? 'Wiki'}
        </div>
        <IconButton
          label={searchOpen ? 'Hide search' : 'Search wiki'}
          onClick={onToggleSearch}
        >
          <Search />
        </IconButton>
        <IconButton label="New note" onClick={onStartNewEntry}>
          <Plus />
        </IconButton>
        <IconButton label="New folder" onClick={onStartNewFolder}>
          <FolderPlus />
        </IconButton>
        <IconButton label="Refresh wiki" onClick={onRefresh}>
          <RefreshCw className={cn(loading && 'animate-spin')} />
        </IconButton>
      </div>

      {searchOpen ? (
        <div className="border-border/70 flex h-11 shrink-0 items-center border-b px-2.5">
          <div className="relative w-full">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-3.5" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search wiki"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
      ) : null}

      <div className="wiki-hide-scrollbar relative min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        {query.trim().length > 1 ? (
          <SearchResults
            loading={searchLoading}
            results={searchResults}
            onSelectPath={onSelectPath}
          />
        ) : error ? (
          <QuietState
            icon={<AlertTriangle className="size-4" />}
            title={error.message}
          />
        ) : tree ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleTreeDragStart}
            onDragOver={handleTreeDragOver}
            onDragEnd={handleTreeDragEnd}
            onDragCancel={handleTreeDragCancel}
          >
            <TreeView
              entry={tree}
              depth={0}
              selectedPath={selectedPath}
              titleByPath={titleByPath}
              draggedEntry={draggedEntry}
              dropTarget={dropTarget}
              onSelectPath={onSelectPath}
              creatingFolderParent={creatingFolderParent}
              editingEntry={editingEntry}
              onCancelInlineCreate={onCancelInlineCreate}
              onCommitInlineCreate={onCommitInlineCreate}
              onStartRename={onStartRename}
              onCancelRename={onCancelRename}
              onCommitRename={onCommitRename}
              onRequestDelete={onRequestDelete}
              isRoot
            />
          </DndContext>
        ) : (
          <QuietState
            icon={<RefreshCw className="size-4 animate-spin" />}
            title="Loading wiki"
          />
        )}
      </div>
      <VaultSwitcher
        vaults={vaults}
        activeVaultId={activeVaultId}
        activeVault={activeVault}
        showPropertiesInNotes={showPropertiesInNotes}
        noteFont={noteFont}
        actionPending={vaultActionPending}
        onSwitchVault={onSwitchVault}
        onCreateVault={onCreateVault}
        onUpdateVault={onUpdateVault}
        onDeleteVault={onDeleteVault}
        trashItems={trashItems}
        trashLoading={trashLoading}
        onRestoreTrashItem={onRestoreTrashItem}
        onPurgeTrashItem={onPurgeTrashItem}
        onShowPropertiesInNotesChange={onShowPropertiesInNotesChange}
        onNoteFontChange={onNoteFontChange}
      />
    </aside>
  )
}

function VaultSwitcher({
  vaults,
  activeVaultId,
  activeVault,
  showPropertiesInNotes,
  noteFont,
  actionPending,
  onSwitchVault,
  onCreateVault,
  onUpdateVault,
  onDeleteVault,
  trashItems,
  trashLoading,
  onRestoreTrashItem,
  onPurgeTrashItem,
  onShowPropertiesInNotesChange,
  onNoteFontChange,
}: {
  vaults: WikiVault[]
  activeVaultId: string
  activeVault: WikiVault | null
  showPropertiesInNotes: boolean
  noteFont: WikiNoteFont
  actionPending: boolean
  onSwitchVault: (id: string) => void
  onCreateVault: (payload: VaultCreatePayload) => void
  onUpdateVault: (payload: VaultUpdatePayload) => void
  onDeleteVault: (id: string) => void
  trashItems: WikiTrashItem[]
  trashLoading: boolean
  onRestoreTrashItem: (id: string) => void
  onPurgeTrashItem: (id: string) => void
  onShowPropertiesInNotesChange: (checked: boolean) => void
  onNoteFontChange: (font: WikiNoteFont) => void
}) {
  type VaultSettingsTab = 'general' | 'properties' | 'trash' | 'danger'

  const [name, setName] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<VaultSettingsTab>('general')
  const [settingsName, setSettingsName] = useState(activeVault?.name ?? 'Wiki')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [emptyTrashConfirmOpen, setEmptyTrashConfirmOpen] = useState(false)
  const [purgeTarget, setPurgeTarget] = useState<WikiTrashItem | null>(null)
  const [template, setTemplate] = useState<BootstrapTemplateId | 'blank'>(
    'blank',
  )
  const lastSubmittedSettingsNameRef = useRef(activeVault?.name ?? 'Wiki')
  const selectedTemplateTitle =
    template === 'blank'
      ? null
      : (bootstrapTemplates.find((item) => item.id === template)?.title ?? null)
  const vaultName = name.trim() || (selectedTemplateTitle ?? '')
  const currentVault = activeVault ?? {
    id: activeVaultId,
    name: 'Wiki',
    createdAt: '',
  }
  const normalizedSettingsName = settingsName.trim()
  const settingsNameChanged =
    normalizedSettingsName.length > 0 &&
    normalizedSettingsName !== currentVault.name

  useEffect(() => {
    if (settingsOpen) {
      setSettingsName(currentVault.name)
      lastSubmittedSettingsNameRef.current = currentVault.name
    }
  }, [currentVault.name, settingsOpen])

  useEffect(() => {
    if (
      !settingsOpen ||
      !settingsNameChanged ||
      normalizedSettingsName === lastSubmittedSettingsNameRef.current
    ) {
      return
    }

    const timeout = window.setTimeout(() => {
      lastSubmittedSettingsNameRef.current = normalizedSettingsName
      onUpdateVault({ id: currentVault.id, name: normalizedSettingsName })
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [
    currentVault.id,
    normalizedSettingsName,
    onUpdateVault,
    settingsNameChanged,
    settingsOpen,
  ])

  function submitVault(event: FormEvent) {
    event.preventDefault()
    if (!vaultName) return
    onCreateVault({
      name: vaultName,
      template: template === 'blank' ? undefined : template,
    })
    setName('')
    setTemplate('blank')
    setCreateOpen(false)
  }

  return (
    <div className="border-border/70 bg-background mt-auto flex h-14 shrink-0 items-center border-t px-2.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted/55 flex h-10 min-w-0 flex-1 cursor-pointer select-none items-center gap-2 rounded-md px-2 text-left transition-colors"
          >
            <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {activeVault?.name ?? 'Wiki'}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-64">
          <DropdownMenuLabel>Vaults</DropdownMenuLabel>
          {(vaults.length > 0
            ? vaults
            : [{ id: 'default', name: 'Wiki', createdAt: '' }]
          ).map((vault) => (
            <DropdownMenuItem
              key={vault.id}
              className="cursor-pointer"
              onClick={() => {
                if (vault.id !== activeVaultId) onSwitchVault(vault.id)
              }}
            >
              <Check
                className={cn(
                  'mr-2 size-4',
                  vault.id === activeVaultId ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className="min-w-0 flex-1 truncate">{vault.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onSelect={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            New vault
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <IconButton
        label="Vault settings"
        onClick={() => {
          setSettingsTab('general')
          setSettingsOpen(true)
        }}
      >
        <Settings />
      </IconButton>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="overflow-hidden sm:max-w-2xl">
          <form className="min-w-0 overflow-hidden" onSubmit={submitVault}>
            <DialogHeader>
              <DialogTitle>Create vault</DialogTitle>
              <DialogDescription>
                Start blank, or choose a starter template for the new vault.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <Input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={selectedTemplateTitle ?? 'Vault name'}
                className="h-9 text-sm"
              />
              <div className="flex w-full min-w-0 snap-x gap-3 overflow-x-scroll overscroll-x-contain pb-3">
                <TemplateChoice
                  selected={template === 'blank'}
                  title="Blank"
                  folders={[]}
                  className="w-52"
                  onClick={() => setTemplate('blank')}
                />
                {bootstrapTemplates.map((item) => (
                  <TemplateChoice
                    key={item.id}
                    selected={template === item.id}
                    title={item.title}
                    folders={item.folders}
                    className="w-52"
                    onClick={() => setTemplate(item.id)}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setCreateOpen(false)}
                disabled={actionPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={actionPending || !vaultName}
              >
                <Plus className="size-3.5" />
                Create vault
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="border-border/80 bg-background top-[calc(50%_-_var(--chat-safe-padding,0px)/2)] !flex h-[min(720px,calc(100dvh_-_var(--chat-safe-padding,0px)_-_2rem))] !w-[min(880px,calc(100vw_-_2rem))] !max-w-[min(880px,calc(100vw_-_2rem))] flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl sm:!max-w-[min(880px,calc(100vw_-_2rem))]">
          <DialogHeader className="border-border/80 border-b px-6 py-5">
            <DialogTitle className="font-serif text-2xl font-normal leading-none tracking-normal">
              Vault settings
            </DialogTitle>
            <DialogDescription className="sr-only">
              Rename or delete the current wiki vault.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1">
            <nav className="border-border/70 bg-muted/15 flex w-44 shrink-0 flex-col gap-1 border-r p-3">
              <VaultSettingsNavButton
                active={settingsTab === 'general'}
                icon={<PencilLine className="size-3.5" />}
                label="General"
                onClick={() => setSettingsTab('general')}
              />
              <VaultSettingsNavButton
                active={settingsTab === 'properties'}
                icon={<Tags className="size-3.5" />}
                label="Properties"
                onClick={() => setSettingsTab('properties')}
              />
              <VaultSettingsNavButton
                active={settingsTab === 'trash'}
                icon={<Trash2 className="size-3.5" />}
                label="Trash"
                onClick={() => setSettingsTab('trash')}
                trailing={
                  trashItems.length > 0 ? (
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[10px]"
                    >
                      {trashItems.length}
                    </Badge>
                  ) : null
                }
              />
              <div className="mt-auto">
                <VaultSettingsNavButton
                  active={settingsTab === 'danger'}
                  icon={<AlertTriangle className="size-3.5" />}
                  label="Danger"
                  onClick={() => setSettingsTab('danger')}
                />
              </div>
            </nav>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="wiki-hide-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
                {settingsTab === 'general' ? (
                  <div className="space-y-5">
                    <VaultSettingsPaneHeader
                      title="General"
                      description="Basic settings for the current vault."
                    />
                    <VaultSettingsSection title="Vault">
                      <VaultSettingsRow
                        icon={<PencilLine className="size-3.5" />}
                        title="Vault name"
                        description="Shown in the sidebar footer and command switcher."
                      >
                        <Input
                          value={settingsName}
                          onChange={(event) =>
                            setSettingsName(event.target.value)
                          }
                          className="h-9 w-64 text-sm"
                        />
                      </VaultSettingsRow>
                    </VaultSettingsSection>
                    <VaultSettingsSection title="Appearance">
                      <VaultSettingsRow
                        icon={<Type className="size-3.5" />}
                        title="Note font"
                        description="Used by the Markdown editor and reading view."
                      >
                        <Select
                          value={noteFont}
                          onValueChange={(value) =>
                            onNoteFontChange(value as WikiNoteFont)
                          }
                          disabled={actionPending}
                        >
                          <SelectTrigger
                            className="h-9 w-56 cursor-pointer"
                            style={{ fontFamily: noteFontFamily(noteFont) }}
                            aria-label="Note font"
                          >
                            <SelectValue
                              placeholder={noteFontLabel(noteFont)}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {noteFontOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                                className="cursor-pointer"
                                style={{ fontFamily: option.family }}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </VaultSettingsRow>
                    </VaultSettingsSection>
                  </div>
                ) : null}

                {settingsTab === 'properties' ? (
                  <div className="space-y-5">
                    <VaultSettingsPaneHeader
                      title="Properties"
                      description="Control where note properties are shown."
                    />
                    <VaultSettingsSection title="Display">
                      <VaultSettingsRow
                        icon={<Tags className="size-3.5" />}
                        title="Show properties in notes"
                        description="When off, properties stay editable from the right panel only."
                      >
                        <Switch
                          checked={showPropertiesInNotes}
                          onCheckedChange={onShowPropertiesInNotesChange}
                          className="cursor-pointer"
                        />
                      </VaultSettingsRow>
                    </VaultSettingsSection>
                  </div>
                ) : null}

                {settingsTab === 'trash' ? (
                  <div className="space-y-5">
                    <VaultSettingsPaneHeader
                      title="Trash"
                      description="Restore deleted notes and folders, or permanently remove them."
                    />
                    <VaultSettingsSection
                      title={`${trashItems.length} deleted ${trashItems.length === 1 ? 'item' : 'items'}`}
                      action={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-7 cursor-pointer px-2 text-xs"
                          disabled={
                            actionPending ||
                            trashLoading ||
                            trashItems.length === 0
                          }
                          onClick={() => setEmptyTrashConfirmOpen(true)}
                        >
                          Empty trash
                        </Button>
                      }
                    >
                      <div className="divide-border/60 divide-y">
                        {trashLoading ? (
                          <div className="text-muted-foreground flex min-h-14 items-center px-3 py-3 text-xs">
                            Loading deleted items
                          </div>
                        ) : trashItems.length === 0 ? (
                          <div className="text-muted-foreground flex min-h-14 items-center px-3 py-3 text-xs">
                            Trash is empty.
                          </div>
                        ) : (
                          trashItems.map((item) => (
                            <div
                              key={item.id}
                              className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2"
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="bg-muted/70 text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
                                  {item.kind === 'folder' ? (
                                    <FolderPlus className="size-3" />
                                  ) : (
                                    <FileText className="size-3" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-foreground truncate text-xs font-medium leading-4">
                                    {item.title}
                                  </div>
                                  <div className="text-muted-foreground truncate text-[11px] leading-4">
                                    {item.originalPath} ·{' '}
                                    {formatRelativeTime(item.deletedAt)} ·{' '}
                                    {formatBytes(item.size)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 cursor-pointer px-2 text-xs"
                                  disabled={actionPending}
                                  onClick={() => onRestoreTrashItem(item.id)}
                                >
                                  <RotateCcw className="size-3" />
                                  Restore
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive h-7 cursor-pointer px-2 text-xs"
                                  disabled={actionPending}
                                  onClick={() => setPurgeTarget(item)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </VaultSettingsSection>
                  </div>
                ) : null}

                {settingsTab === 'danger' ? (
                  <div className="space-y-5">
                    <VaultSettingsPaneHeader
                      title="Danger"
                      description="Destructive actions for this vault."
                    />
                    <Collapsible>
                      <VaultSettingsSection title="Delete vault">
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="hover:bg-muted/35 flex min-h-16 w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors"
                          >
                            <div className="bg-destructive/10 text-destructive mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
                              <Trash2 className="size-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-foreground truncate text-sm font-medium">
                                Delete vault
                              </div>
                              <div className="text-muted-foreground mt-1 max-w-md text-xs leading-snug opacity-75">
                                Permanently delete this vault and all notes
                                inside it.
                              </div>
                            </div>
                            <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-border/70 border-t px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-muted-foreground max-w-md text-xs leading-5">
                              This removes the vault directory from disk. This
                              cannot be undone.
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              className="cursor-pointer"
                              disabled={actionPending}
                              onClick={() => setDeleteConfirmOpen(true)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete vault
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </VaultSettingsSection>
                    </Collapsible>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {currentVault.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes this vault and all of its notes from
              disk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={actionPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              disabled={actionPending}
              onClick={() => {
                setDeleteConfirmOpen(false)
                setSettingsOpen(false)
                onDeleteVault(currentVault.id)
              }}
            >
              Delete vault
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(purgeTarget)}
        onOpenChange={(open) => {
          if (!open) setPurgeTarget(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete {purgeTarget?.title}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the item from trash and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={actionPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              disabled={actionPending}
              onClick={() => {
                if (purgeTarget) onPurgeTrashItem(purgeTarget.id)
                setPurgeTarget(null)
              }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={emptyTrashConfirmOpen}
        onOpenChange={setEmptyTrashConfirmOpen}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Empty trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {trashItems.length} deleted{' '}
              {trashItems.length === 1 ? 'item' : 'items'} and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={actionPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              disabled={actionPending || trashItems.length === 0}
              onClick={() => {
                for (const item of trashItems) onPurgeTrashItem(item.id)
                setEmptyTrashConfirmOpen(false)
              }}
            >
              Empty trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function VaultSettingsSection({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex min-h-7 items-center justify-between gap-3 px-2">
        <h2 className="text-muted-foreground text-xs font-semibold">{title}</h2>
        {action}
      </div>
      <div className="border-border/80 bg-card/65 dark:bg-card/45 overflow-hidden rounded-xl border">
        {children}
      </div>
    </section>
  )
}

function VaultSettingsNavButton({
  active,
  icon,
  label,
  trailing,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  trailing?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-9 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-sm transition-colors',
        active
          ? 'bg-muted text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground',
      )}
      onClick={onClick}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  )
}

function VaultSettingsPaneHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-foreground text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-xl text-xs leading-5">
        {description}
      </p>
    </div>
  )
}

function VaultSettingsRow({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-20 items-start gap-4 px-4 py-4">
      <div className="bg-muted/70 text-muted-foreground dark:bg-muted/50 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-foreground truncate text-sm font-medium">
          {title}
        </div>
        <div className="text-muted-foreground mt-1 max-w-md text-xs leading-snug opacity-75">
          {description}
        </div>
      </div>
      <div className="flex shrink-0 items-start">{children}</div>
    </div>
  )
}

function TemplateChoice({
  selected,
  title,
  description,
  folders,
  preview,
  disabled,
  className,
  onClick,
}: {
  selected?: boolean
  title: string
  description?: string
  folders?: string[]
  preview?: string[]
  disabled?: boolean
  className?: string
  onClick: () => void
}) {
  const visibleFolders = (folders ?? []).slice(0, 4)
  const visiblePreview = (preview ?? []).slice(0, 4)
  const showSelection = selected !== undefined
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
    onClick()
  }

  return (
    <button
      type="button"
      aria-label={title}
      aria-pressed={showSelection ? selected : undefined}
      disabled={disabled}
      className={cn(
        'border-border bg-card text-card-foreground hover:bg-muted/35 flex shrink-0 cursor-pointer snap-start flex-col rounded-md border p-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50',
        selected &&
          'border-ring bg-muted/35 shadow-[0_0_0_1px_hsl(var(--ring)/0.35)]',
        className,
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-semibold">{title}</span>
        {showSelection ? (
          <span
            className={cn(
              'border-muted-foreground/35 flex size-3.5 shrink-0 items-center justify-center rounded-full border',
              selected && 'border-ring bg-ring',
            )}
          >
            {selected ? <Check className="text-background size-2.5" /> : null}
          </span>
        ) : null}
      </div>
      {description ? (
        <div className="text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-4">
          {description}
        </div>
      ) : null}

      <div className="border-border/70 bg-background/70 mt-3 flex min-h-28 flex-1 flex-col overflow-hidden rounded-sm border">
        <div className="border-border/60 bg-muted/30 flex h-6 items-center gap-1.5 border-b px-2">
          <span className="bg-muted-foreground/35 size-1.5 rounded-full" />
          <span className="bg-muted-foreground/25 h-1.5 w-10 rounded-full" />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1.5 p-2">
          {visiblePreview.length > 0 ? (
            visiblePreview.map((line, index) => (
              <div
                key={`${line}:${index}`}
                className="text-muted-foreground flex h-5 items-center gap-1.5 text-[11px]"
                style={{ paddingLeft: index % 2 === 0 ? 0 : 10 }}
              >
                <FileText className="size-3 shrink-0 opacity-45" />
                <span className="truncate">{line}</span>
              </div>
            ))
          ) : visibleFolders.length > 0 ? (
            visibleFolders.map((folder, index) => (
              <div
                key={folder}
                className="text-muted-foreground flex h-5 items-center gap-1.5 text-[11px]"
                style={{ paddingLeft: index % 2 === 0 ? 0 : 10 }}
              >
                <span className="relative h-2.5 w-3 shrink-0 rounded-[2px] bg-current opacity-45 before:absolute before:-top-0.5 before:left-0 before:h-1 before:w-1.5 before:rounded-t-[2px] before:bg-current" />
                <span className="truncate">{folder}</span>
              </div>
            ))
          ) : (
            <div className="flex flex-col gap-2">
              <div className="border-border/80 bg-card/80 flex h-7 items-center gap-2 rounded-sm border px-2">
                <FileText className="text-muted-foreground size-3" />
                <span className="text-muted-foreground text-[11px]">
                  Untitled
                </span>
              </div>
              <div className="bg-muted/40 h-1.5 w-20 rounded-full" />
              <div className="bg-muted/30 h-1.5 w-14 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function TreeView({
  entry,
  depth,
  selectedPath,
  titleByPath,
  draggedEntry,
  dropTarget,
  onSelectPath,
  creatingFolderParent,
  editingEntry,
  onCancelInlineCreate,
  onCommitInlineCreate,
  onStartRename,
  onCancelRename,
  onCommitRename,
  onRequestDelete,
  isRoot = false,
}: {
  entry: WikiEntry
  depth: number
  selectedPath: string | null
  titleByPath: Map<string, string>
  draggedEntry: MovableEntry | null
  dropTarget: TreeDropTarget | null
  onSelectPath: (path: string) => void
  creatingFolderParent: string | null
  editingEntry: EditingEntry | null
  onCancelInlineCreate: () => void
  onCommitInlineCreate: (name: string) => void
  onStartRename: (entry: WikiEntry) => void
  onCancelRename: () => void
  onCommitRename: (value: string) => void
  onRequestDelete: (entry: { path: string; kind: EntryKind }) => void
  isRoot?: boolean
}) {
  const [open, setOpen] = useState(depth < 2)
  const hasInlineCreate =
    entry.kind === 'folder' && creatingFolderParent === entry.path
  const isEditing = editingEntry?.path === entry.path
  const entryDragData = { path: entry.path, kind: entry.kind }
  const rowTarget: TreeDropTarget =
    entry.kind === 'folder'
      ? { folder: entry.path, id: `folder:${entry.path}` }
      : { folder: parentFolder(entry.path), id: `entry:${entry.path}` }
  const contentsTarget: TreeDropTarget = {
    folder: entry.path,
    id: `contents:${entry.path}`,
  }
  const rootDrop = useDroppable({
    id: 'wiki-drop:root',
    data: { target: { folder: '', id: 'root' } satisfies TreeDropTarget },
    disabled: !isRoot,
  })
  const rowDrop = useDroppable({
    id: `wiki-drop:${entry.kind}:${entry.path || 'root'}`,
    data: { target: rowTarget },
    disabled: isRoot || isEditing,
  })
  const contentsDrop = useDroppable({
    id: `wiki-drop:contents:${entry.path || 'root'}`,
    data: { target: contentsTarget },
    disabled: entry.kind !== 'folder' || !open,
  })
  const draggable = useDraggable({
    id: `wiki-drag:${entry.kind}:${entry.path || 'root'}`,
    data: { entry: entryDragData },
    disabled: isRoot || isEditing,
  })
  const setDraggableNodeRef = draggable.setNodeRef
  const setRowDropNodeRef = rowDrop.setNodeRef
  const setRowNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDraggableNodeRef(node)
      setRowDropNodeRef(node)
    },
    [setDraggableNodeRef, setRowDropNodeRef],
  )

  useEffect(() => {
    if (hasInlineCreate) setOpen(true)
  }, [hasInlineCreate])

  if (isRoot) {
    return (
      <div
        ref={rootDrop.setNodeRef}
        className={cn(
          'min-h-full space-y-0 rounded-sm border border-transparent transition-colors',
          dropTarget?.id === 'root' && 'border-primary/35 bg-primary/10',
        )}
      >
        {hasInlineCreate ? (
          <InlineNameInput
            depth={0}
            placeholder="New folder"
            onCancel={onCancelInlineCreate}
            onCommit={onCommitInlineCreate}
          />
        ) : null}
        {(entry.children ?? []).map((child) => (
          <TreeView
            key={`${child.kind}:${child.path}`}
            entry={child}
            depth={0}
            selectedPath={selectedPath}
            titleByPath={titleByPath}
            draggedEntry={draggedEntry}
            dropTarget={dropTarget}
            onSelectPath={onSelectPath}
            creatingFolderParent={creatingFolderParent}
            editingEntry={editingEntry}
            onCancelInlineCreate={onCancelInlineCreate}
            onCommitInlineCreate={onCommitInlineCreate}
            onStartRename={onStartRename}
            onCancelRename={onCancelRename}
            onCommitRename={onCommitRename}
            onRequestDelete={onRequestDelete}
          />
        ))}
      </div>
    )
  }

  if (entry.kind === 'note') {
    const selected = selectedPath === entry.path

    if (isEditing) {
      return (
        <InlineNameInput
          initialValue={editingEntry.initialName}
          depth={depth}
          onCancel={onCancelRename}
          onCommit={onCommitRename}
        />
      )
    }

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            ref={setRowNodeRef}
            type="button"
            {...draggable.attributes}
            {...draggable.listeners}
            className={cn(
              'grid h-6 w-full min-w-0 cursor-pointer select-none grid-cols-[minmax(0,1fr)] items-center rounded-sm border border-transparent px-2 text-left text-[13px] transition-colors',
              draggedEntry?.path === entry.path && 'opacity-45',
              draggable.isDragging && 'bg-muted z-50 shadow-md',
              dropTarget?.id === `entry:${entry.path}` &&
                'border-primary/35 bg-primary/10 text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]',
              selected
                ? 'bg-muted/80 text-foreground'
                : 'text-muted-foreground hover:bg-muted/45 hover:text-foreground',
            )}
            onClick={() => onSelectPath(entry.path)}
            style={{
              paddingLeft: `${Math.max(0, depth) * 16 + 10}px`,
              ...transformStyle(draggable.transform),
            }}
          >
            <span className="truncate">
              {titleByPath.get(entry.path) ?? entry.title}
            </span>
          </button>
        </ContextMenuTrigger>
        <TreeContextMenu
          entry={entry}
          onStartRename={onStartRename}
          onRequestDelete={onRequestDelete}
        />
      </ContextMenu>
    )
  }

  const folderRow = isEditing ? (
    <InlineNameInput
      initialValue={editingEntry.initialName}
      depth={depth}
      onCancel={onCancelRename}
      onCommit={onCommitRename}
    />
  ) : (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={setRowNodeRef}
          type="button"
          {...draggable.attributes}
          {...draggable.listeners}
          className={cn(
            'text-muted-foreground hover:bg-muted/45 hover:text-foreground grid h-6 w-full min-w-0 cursor-pointer select-none grid-cols-[auto_minmax(0,1fr)] items-center gap-1 rounded-sm border border-transparent px-2 text-left text-[13px] transition-colors',
            draggedEntry?.path === entry.path && 'opacity-45',
            draggable.isDragging && 'bg-muted z-50 shadow-md',
            dropTarget?.id === `folder:${entry.path}` &&
              'border-primary/35 bg-primary/10 text-foreground shadow-[inset_3px_0_0_hsl(var(--primary))]',
          )}
          style={{
            paddingLeft: `${Math.max(0, depth) * 16 + 8}px`,
            ...transformStyle(draggable.transform),
          }}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? (
            <ChevronDown className="size-3 shrink-0" />
          ) : (
            <ChevronRight className="size-3 shrink-0" />
          )}
          <span className="truncate font-medium">{entry.title}</span>
        </button>
      </ContextMenuTrigger>
      <TreeContextMenu
        entry={entry}
        onStartRename={onStartRename}
        onRequestDelete={onRequestDelete}
      />
    </ContextMenu>
  )

  return (
    <div>
      {folderRow}
      {open ? (
        <div
          ref={contentsDrop.setNodeRef}
          className={cn(
            'min-h-2 space-y-0 rounded-sm border border-transparent transition-colors',
            depth > 0 && 'ml-[22px]',
            dropTarget?.id === `contents:${entry.path}` &&
              'border-primary/35 bg-primary/10',
          )}
        >
          {hasInlineCreate ? (
            <InlineNameInput
              depth={depth + 1}
              placeholder="New folder"
              onCancel={onCancelInlineCreate}
              onCommit={onCommitInlineCreate}
            />
          ) : null}
          {(entry.children ?? []).map((child) => (
            <TreeView
              key={`${child.kind}:${child.path}`}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              titleByPath={titleByPath}
              draggedEntry={draggedEntry}
              dropTarget={dropTarget}
              onSelectPath={onSelectPath}
              creatingFolderParent={creatingFolderParent}
              editingEntry={editingEntry}
              onCancelInlineCreate={onCancelInlineCreate}
              onCommitInlineCreate={onCommitInlineCreate}
              onStartRename={onStartRename}
              onCancelRename={onCancelRename}
              onCommitRename={onCommitRename}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function InlineNameInput({
  initialValue = '',
  depth,
  placeholder = 'Name',
  onCancel,
  onCommit,
}: {
  initialValue?: string
  depth: number
  placeholder?: string
  onCancel: () => void
  onCommit: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)
  const committedRef = useRef(false)

  function commit(nextValue: string) {
    if (committedRef.current) return
    committedRef.current = true
    onCommit(nextValue)
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    event.stopPropagation()

    if (event.key === 'Escape') {
      event.preventDefault()
      committedRef.current = true
      onCancel()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      commit(event.currentTarget.value)
    }
  }

  return (
    <div
      className="flex h-6 items-center"
      style={{ paddingLeft: `${Math.max(0, depth) * 16 + 10}px` }}
    >
      <Input
        autoFocus
        value={value}
        placeholder={placeholder}
        className="border-border/70 h-5 min-w-0 rounded-none px-1.5 text-[13px]"
        onChange={(event) => setValue(event.target.value)}
        onBlur={(event) => commit(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onFocus={(event) => event.currentTarget.select()}
      />
    </div>
  )
}

function TreeContextMenu({
  entry,
  onStartRename,
  onRequestDelete,
}: {
  entry: WikiEntry
  onStartRename: (entry: WikiEntry) => void
  onRequestDelete: (entry: { path: string; kind: EntryKind }) => void
}) {
  return (
    <ContextMenuContent className="w-44">
      <ContextMenuItem
        className="cursor-pointer"
        onSelect={() => onStartRename(entry)}
      >
        <PencilLine className="size-3.5" />
        Rename
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        variant="destructive"
        className="cursor-pointer"
        onSelect={() => onRequestDelete({ path: entry.path, kind: entry.kind })}
      >
        <Trash2 className="size-3.5" />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

function SearchResults({
  loading,
  results,
  onSelectPath,
}: {
  loading: boolean
  results: WikiSearchResult[]
  onSelectPath: (path: string) => void
}) {
  if (loading) {
    return (
      <QuietState
        icon={<RefreshCw className="size-4 animate-spin" />}
        title="Searching"
      />
    )
  }

  if (results.length === 0) {
    return (
      <QuietState icon={<Search className="size-4" />} title="No matches" />
    )
  }

  return (
    <div className="space-y-1.5">
      {results.map((result) => (
        <button
          key={result.path}
          type="button"
          className="border-border/60 bg-muted/25 hover:bg-muted/60 w-full min-w-0 cursor-pointer select-none rounded-md border px-2.5 py-2 text-left transition-colors"
          onClick={() => onSelectPath(result.path)}
        >
          <div className="truncate text-xs font-semibold">{result.title}</div>
          <div className="text-muted-foreground truncate font-mono text-[10px]">
            {result.path}
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px] uppercase">
            <Hash className="size-3" />
            Matched {result.matchField}
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-4">
            {result.snippet}
          </p>
        </button>
      ))}
    </div>
  )
}

function InspectorPanel({
  file,
  graph,
  health,
  healthLoading,
  resolveMediaUrl,
  onSelectPath,
  onLinkClick,
  onAddProperty,
  onPropertyChange,
  onPropertyRename,
  onPropertyTypeChange,
  onPropertyReorder,
  propertyDefinitions,
  onHeadingSelect,
  onDelete,
}: {
  file: WikiFile | null
  graph: WikiGraphResponse | null
  health: WikiHealthResponse | null
  healthLoading: boolean
  resolveMediaUrl: (src: string) => string
  onSelectPath: (path: string) => void
  onLinkClick: (path: string) => void
  onAddProperty: (key: string, value: string, type: WikiPropertyType) => void
  onPropertyChange: (key: string, value: string, type: WikiPropertyType) => void
  onPropertyRename: (
    oldKey: string,
    newKey: string,
    value: string,
    type: WikiPropertyType,
  ) => void
  onPropertyTypeChange: (key: string, type: WikiPropertyType) => void
  onPropertyReorder: (orderedKeys: string[]) => void
  propertyDefinitions: WikiPropertyDefinition[]
  onHeadingSelect: (text: string) => void
  onDelete: () => void
}) {
  const [tab, setTab] = useState<InspectorTab>('outline')
  const relatedIssues =
    file && health
      ? health.issues.filter((issue) => issue.path === file.path).slice(0, 5)
      : []
  const tabs: Array<{ id: InspectorTab; label: string; icon: ReactNode }> = [
    {
      id: 'outline',
      label: 'Outline',
      icon: <ListTree className="size-3.5" />,
    },
    {
      id: 'details',
      label: 'Details',
      icon: <FileText className="size-3.5" />,
    },
    { id: 'properties', label: 'Fields', icon: <Tags className="size-3.5" /> },
  ]

  return (
    <aside className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-border/70 flex h-10 shrink-0 items-center border-b px-2">
        <div className="grid w-full grid-cols-3 gap-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                'flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md text-[11px] transition-colors',
                tab === item.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
              onClick={() => setTab(item.id)}
            >
              {item.icon}
              <span className="hidden xl:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="border-border/70 flex h-11 shrink-0 items-center border-b px-3">
        <div className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
          {file ? formatRelativeTime(file.updatedAt) : 'No note selected'}
        </div>
      </div>

      <div className="wiki-hide-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto p-3 pb-[calc(var(--chat-safe-padding,0px)+1rem)]">
        {!file ? (
          <QuietState
            icon={<FileText className="size-4" />}
            title="No note selected"
          />
        ) : tab === 'outline' ? (
          <InspectorSection title="Headings">
            {file.headings.length > 0 ? (
              <div className="space-y-1">
                {file.headings.map((heading) => (
                  <button
                    key={`${heading.line}:${heading.text}`}
                    type="button"
                    className="hover:bg-muted/60 w-full cursor-pointer rounded-md px-2 py-1.5 text-left text-xs"
                    style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                    onClick={() => onHeadingSelect(heading.text)}
                  >
                    <span className="block truncate">{heading.text}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">No headings.</div>
            )}
          </InspectorSection>
        ) : tab === 'details' ? (
          <>
            <InspectorSection title="Note">
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <Metric label="Path" value={file.path} mono />
                <Metric label="Words" value={String(file.wordCount)} />
                <Metric label="Size" value={formatBytes(file.size)} />
                <Metric
                  label="Updated"
                  value={formatRelativeTime(file.updatedAt)}
                />
              </dl>
            </InspectorSection>

            <InspectorSection title="Preview">
              <div
                className="border-border/70 bg-muted/20 max-h-72 overflow-hidden rounded-md border p-3"
                onClickCapture={(event) => {
                  const target = event.target
                  if (!(target instanceof HTMLElement)) return
                  const anchor = target.closest('a')
                  const href = anchor?.getAttribute('href')
                  if (!href) return
                  if (isExternalHref(href)) {
                    event.preventDefault()
                    event.stopPropagation()
                    openExternalHref(href)
                    return
                  }
                  event.preventDefault()
                  event.stopPropagation()
                  onLinkClick(href)
                }}
              >
                <Markdown
                  markdown={preprocessRichWikiMarkdown(
                    file.content,
                    resolveMediaUrl,
                  )}
                  proseSize="xs"
                  className="wiki-rich-markdown wiki-hide-scrollbar max-h-64 overflow-y-auto"
                />
              </div>
            </InspectorSection>

            <InspectorSection title="Outbound">
              <LinkList
                label="Links"
                icon={<Link2 className="size-3" />}
                paths={graph?.outbound ?? []}
                onSelectPath={onSelectPath}
                onCreatePath={onLinkClick}
              />
            </InspectorSection>
            <InspectorSection title="Backlinks">
              <BacklinkList
                links={graph?.inbound ?? []}
                onSelectPath={onSelectPath}
              />
            </InspectorSection>
            <InspectorSection title="Unlinked mentions">
              <BacklinkList
                links={graph?.unlinked ?? []}
                onSelectPath={onSelectPath}
              />
            </InspectorSection>
            {(graph?.broken ?? []).length > 0 ? (
              <InspectorSection title="Broken links">
                <div className="space-y-1">
                  {graph?.broken.map((path) => (
                    <button
                      key={path}
                      type="button"
                      className="border-destructive/35 bg-destructive/10 text-destructive w-full cursor-pointer rounded-md border p-2 text-left font-mono text-[11px]"
                      onClick={() => onLinkClick(path)}
                    >
                      Create {path}
                    </button>
                  ))}
                </div>
              </InspectorSection>
            ) : null}

            <InspectorSection title="Health">
              {healthLoading ? (
                <div className="text-muted-foreground text-xs">Checking...</div>
              ) : relatedIssues.length > 0 ? (
                <div className="space-y-2">
                  {relatedIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="border-border/70 bg-muted/25 rounded-md border p-2"
                    >
                      <div className="text-xs font-medium">{issue.title}</div>
                      <div className="text-muted-foreground mt-1 text-[11px] leading-4">
                        {issue.detail}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-xs">
                  No issues for this note.
                </div>
              )}
            </InspectorSection>

            <Collapsible>
              <div className="border-border/70 bg-muted/10 rounded-md border">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground group flex h-9 w-full cursor-pointer items-center justify-between px-2.5 text-left text-xs font-semibold"
                  >
                    <span>Danger zone</span>
                    <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-border/70 border-t p-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-8 w-full cursor-pointer text-xs"
                      onClick={onDelete}
                    >
                      <Trash2 className="size-3.5" />
                      Delete Note
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </>
        ) : tab === 'properties' ? (
          <>
            <div className="[&_.wiki-properties-block]:mx-0 [&_.wiki-properties-block]:mb-0 [&_.wiki-properties-block]:max-w-none">
              <ObsidianPropertiesBlock
                editable
                propertyDefinitions={propertyDefinitions}
                properties={file.properties}
                onAddProperty={onAddProperty}
                onPropertyChange={onPropertyChange}
                onPropertyRename={onPropertyRename}
                onPropertyTypeChange={onPropertyTypeChange}
                onPropertyReorder={onPropertyReorder}
                reorderable
              />
            </div>
            <InspectorSection title="All properties">
              <VaultPropertyRegistry
                properties={propertyDefinitions}
                onPropertyTypeChange={onPropertyTypeChange}
              />
            </InspectorSection>
          </>
        ) : null}
      </div>
    </aside>
  )
}

function Metric({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="bg-muted/30 min-w-0 rounded-md p-2">
      <dt className="text-muted-foreground text-[10px] uppercase">{label}</dt>
      <dd className={cn('mt-1 truncate text-xs', mono && 'font-mono')}>
        {value}
      </dd>
    </div>
  )
}

function VaultPropertyRegistry({
  properties,
  onPropertyTypeChange,
}: {
  properties: WikiPropertyDefinition[]
  onPropertyTypeChange: (key: string, type: WikiPropertyType) => void
}) {
  if (properties.length === 0) {
    return (
      <div className="text-muted-foreground text-xs">
        No vault properties yet.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {properties.map((property) => (
        <div
          key={property.key}
          className="hover:bg-muted/35 grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-md px-1 py-0.5"
        >
          <div className="flex min-w-0 items-start gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/75 hover:bg-muted hover:text-foreground flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md"
                  title={`Property type: ${propertyTypeLabel(property.type)}`}
                >
                  {propertyIconFor(property.type)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel>Property type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <PropertyTypeMenuItems
                  currentType={property.type}
                  onChange={(type) => onPropertyTypeChange(property.key, type)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex min-h-6 min-w-0 items-center">
              <div className="truncate text-xs font-medium">{property.key}</div>
            </div>
          </div>
          <div className="text-muted-foreground shrink-0 pt-1 text-[11px]">
            {property.count}
          </div>
        </div>
      ))}
    </div>
  )
}

function LinkList({
  label,
  icon,
  paths,
  onSelectPath,
  onCreatePath,
}: {
  label: string
  icon: ReactNode
  paths: string[]
  onSelectPath: (path: string) => void
  onCreatePath?: (path: string) => void
}) {
  return (
    <div>
      <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase">
        {icon}
        {label}
      </div>
      {paths.length > 0 ? (
        <div className="space-y-1">
          {paths.map((path) => (
            <button
              key={path}
              type="button"
              className="bg-muted/25 hover:bg-muted/60 w-full min-w-0 cursor-pointer rounded-md px-2 py-1.5 text-left font-mono text-[11px]"
              onClick={() => onSelectPath(path)}
              onDoubleClick={() => onCreatePath?.(path)}
            >
              <span className="block truncate">{path}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground text-xs">None</div>
      )}
    </div>
  )
}

function BacklinkList({
  links,
  onSelectPath,
}: {
  links: NonNullable<WikiGraphResponse['inbound']>
  onSelectPath: (path: string) => void
}) {
  if (links.length === 0) {
    return <div className="text-muted-foreground text-xs">None</div>
  }

  return (
    <div className="space-y-2">
      {links.map((link) => (
        <button
          key={link.path}
          type="button"
          className="border-border/70 bg-muted/20 hover:bg-muted/60 w-full cursor-pointer rounded-md border p-2 text-left"
          onClick={() => onSelectPath(link.path)}
        >
          <div className="truncate text-xs font-medium">{link.title}</div>
          <div className="text-muted-foreground mt-0.5 truncate font-mono text-[10px]">
            {link.path}
          </div>
          {link.snippets[0] ? (
            <div className="text-muted-foreground mt-1 line-clamp-2 text-[11px] leading-4">
              {link.snippets[0]}
            </div>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function InspectorSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

function QuietState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="text-muted-foreground flex h-full min-h-36 flex-col items-center justify-center gap-2 p-6 text-center text-sm">
      <span className="bg-muted flex size-8 items-center justify-center rounded-md">
        {icon}
      </span>
      <span>{title}</span>
    </div>
  )
}

function TabBarIconButton({
  label,
  children,
  onClick,
  className,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground flex w-8 shrink-0 cursor-pointer select-none items-center justify-center border-b [&_svg]:size-4',
            className,
          )}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground size-8 cursor-pointer select-none disabled:cursor-default disabled:opacity-35"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}
