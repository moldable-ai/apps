import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import ignore, { type Ignore } from 'ignore'
import path from 'path'

// Cache gitignore instances per project root
const gitignoreCache = new Map<string, { ig: Ignore; mtime: number }>()

async function getGitignore(projectRoot: string): Promise<Ignore | null> {
  const gitignorePath = path.join(projectRoot, '.gitignore')

  try {
    const stat = await fs.stat(gitignorePath)
    const mtime = stat.mtimeMs

    // Check cache
    const cached = gitignoreCache.get(projectRoot)
    if (cached && cached.mtime === mtime) {
      return cached.ig
    }

    // Parse gitignore
    const content = await fs.readFile(gitignorePath, 'utf-8')
    const ig = ignore().add(content)

    // Cache it
    gitignoreCache.set(projectRoot, { ig, mtime })
    return ig
  } catch {
    // No .gitignore file
    return null
  }
}

function findProjectRoot(dirPath: string): string {
  // Walk up to find .git or .gitignore, or use the path itself
  let current = dirPath
  const root = path.parse(current).root

  while (current !== root) {
    // This is a simple heuristic - in practice the project root
    // is passed from the client, but for subdirectories we need to find it
    if (current.includes('node_modules')) {
      current = path.dirname(current)
      continue
    }
    return current.split('/node_modules')[0].split('/.')[0] || current
  }
  return dirPath
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dirPath = searchParams.get('path')
  const projectRoot = searchParams.get('root') || dirPath

  if (!dirPath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 })
  }

  try {
    const root = projectRoot || findProjectRoot(dirPath)
    const gitignore = await getGitignore(root)

    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const files = entries
      .filter((entry) => entry.name !== '.DS_Store')
      .map((entry) => {
        const fullPath = path.join(dirPath, entry.name)
        const relativePath = path.relative(root, fullPath)
        // For directories, append / for gitignore matching
        const matchPath = entry.isDirectory()
          ? `${relativePath}/`
          : relativePath

        const isIgnored = gitignore?.ignores(matchPath) ?? false

        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          isDimmed: isIgnored,
        }
      })
      .sort((a, b) => {
        // Directories first, then dotfiles, then alphabetical
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        // Within each group: dotfiles first, then alphabetical
        const aDot = a.name.startsWith('.')
        const bDot = b.name.startsWith('.')
        if (aDot !== bDot) return aDot ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    return NextResponse.json({ files })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
