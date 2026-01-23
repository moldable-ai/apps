const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // TypeScript / JavaScript
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',

  // Data formats
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  toml: 'ini',

  // Markdown
  md: 'markdown',
  mdx: 'markdown',

  // Shell
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',

  // Other languages
  py: 'python',
  rs: 'rust',
  go: 'go',
  rb: 'ruby',
  php: 'php',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  swift: 'swift',
  kt: 'kotlin',

  // Config
  env: 'ini',
  gitignore: 'ini',
  dockerignore: 'ini',
  eslintrc: 'json',
  prettierrc: 'json',

  // SQL
  sql: 'sql',

  // GraphQL
  graphql: 'graphql',
  gql: 'graphql',
}

export function getLanguageFromPath(path: string): string {
  const filename = path.split('/').pop() ?? ''
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  // Handle dotfiles
  if (filename.startsWith('.') && !filename.includes('.', 1)) {
    const name = filename.slice(1).toLowerCase()
    if (name === 'gitignore' || name === 'dockerignore') return 'ini'
    if (name === 'env') return 'ini'
    return 'plaintext'
  }

  return EXTENSION_TO_LANGUAGE[ext] ?? 'plaintext'
}

export function getFileExtension(path: string): string {
  const filename = path.split('/').pop() ?? ''
  if (filename.startsWith('.') && !filename.includes('.', 1)) {
    return filename // Return the whole dotfile name
  }
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function getFileName(path: string): string {
  return path.split('/').pop() ?? ''
}

export function getRelativePath(path: string, rootPath: string): string {
  return path.replace(rootPath, '').replace(/^\//, '')
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'ico',
  'bmp',
  'avif',
])

export function isImageFile(path: string): boolean {
  const ext = getFileExtension(path).toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
}

export function getImageMimeType(path: string): string {
  const ext = getFileExtension(path).toLowerCase()
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    avif: 'image/avif',
  }
  return mimeTypes[ext] ?? 'application/octet-stream'
}
