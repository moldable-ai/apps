'use client'

import {
  Database,
  File,
  FileCode,
  FileJson,
  FileText,
  FileType,
  Folder,
  FolderOpen,
  Globe,
  Image,
  Lock,
  Package,
  Settings,
} from 'lucide-react'
import { cn } from '@moldable-ai/ui'

interface FileIconProps {
  filename: string
  isDirectory?: boolean
  isOpen?: boolean
  className?: string
}

const EXTENSION_ICONS: Record<string, typeof File> = {
  // Code
  ts: FileCode,
  tsx: FileCode,
  js: FileCode,
  jsx: FileCode,
  mjs: FileCode,
  cjs: FileCode,
  py: FileCode,
  rs: FileCode,
  go: FileCode,
  rb: FileCode,
  php: FileCode,
  java: FileCode,
  c: FileCode,
  cpp: FileCode,
  h: FileCode,
  hpp: FileCode,
  cs: FileCode,
  swift: FileCode,
  kt: FileCode,

  // Data
  json: FileJson,
  yaml: FileJson,
  yml: FileJson,
  xml: FileJson,
  toml: FileJson,

  // Web
  html: Globe,
  htm: Globe,
  css: FileType,
  scss: FileType,
  sass: FileType,
  less: FileType,

  // Text
  md: FileText,
  mdx: FileText,
  txt: FileText,

  // Config
  env: Settings,
  gitignore: Settings,
  dockerignore: Settings,
  eslintrc: Settings,
  prettierrc: Settings,

  // Images
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  svg: Image,
  webp: Image,
  ico: Image,

  // Database
  sql: Database,
  sqlite: Database,
  db: Database,

  // Package
  lock: Lock,
}

const FILENAME_ICONS: Record<string, typeof File> = {
  'package.json': Package,
  'package-lock.json': Lock,
  'pnpm-lock.yaml': Lock,
  'yarn.lock': Lock,
  'tsconfig.json': Settings,
  'next.config.ts': Settings,
  'next.config.js': Settings,
  'next.config.mjs': Settings,
  'vite.config.ts': Settings,
  'tailwind.config.ts': Settings,
  'tailwind.config.js': Settings,
  '.env': Lock,
  '.env.local': Lock,
  '.gitignore': Settings,
  Dockerfile: Package,
  'docker-compose.yml': Package,
  'README.md': FileText,
}

export function FileIcon({
  filename,
  isDirectory = false,
  isOpen = false,
  className,
}: FileIconProps) {
  if (isDirectory) {
    const Icon = isOpen ? FolderOpen : Folder
    return <Icon className={cn('text-primary/70', className)} />
  }

  // Check filename first
  const filenameIcon = FILENAME_ICONS[filename.toLowerCase()]
  if (filenameIcon) {
    const Icon = filenameIcon
    return <Icon className={cn('text-muted-foreground', className)} />
  }

  // Then check extension
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const extIcon = EXTENSION_ICONS[ext]
  if (extIcon) {
    const Icon = extIcon
    return <Icon className={cn('text-muted-foreground', className)} />
  }

  // Default
  return <File className={cn('text-muted-foreground', className)} />
}
