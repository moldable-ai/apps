import { NextResponse } from 'next/server'
import { MAX_SEARCH_RESULTS } from '@/lib/constants'
import fg from 'fast-glob'
import fs from 'fs/promises'
import path from 'path'

async function getGitignorePatterns(root: string): Promise<string[]> {
  const gitignorePath = path.join(root, '.gitignore')

  try {
    const content = await fs.readFile(gitignorePath, 'utf-8')
    // Convert gitignore patterns to glob patterns
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((pattern) => {
        // Handle negation (we'll skip these for simplicity)
        if (pattern.startsWith('!')) return null
        // Handle directory patterns
        if (pattern.endsWith('/')) return `**/${pattern}**`
        // Handle patterns that should match anywhere
        if (!pattern.startsWith('/') && !pattern.includes('/')) {
          return `**/${pattern}`
        }
        // Handle rooted patterns
        if (pattern.startsWith('/')) return pattern.slice(1)
        return `**/${pattern}`
      })
      .filter((p): p is string => p !== null)
  } catch {
    // No .gitignore, use sensible defaults
    return ['**/node_modules/**', '**/.git/**']
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const root = searchParams.get('root')

  if (!root) {
    return NextResponse.json(
      { error: 'Root path is required' },
      { status: 400 },
    )
  }

  try {
    const ignorePatterns = await getGitignorePatterns(root)
    // Always ignore .DS_Store
    ignorePatterns.push('**/.DS_Store')

    const files = await fg('**/*', {
      cwd: root,
      ignore: ignorePatterns,
      onlyFiles: true,
      absolute: true,
      followSymbolicLinks: false,
    })

    const results = files.slice(0, MAX_SEARCH_RESULTS).map((filePath) => ({
      path: filePath,
      name: filePath.split('/').pop() ?? '',
      relativePath: filePath.replace(root, '').replace(/^\//, ''),
    }))

    return NextResponse.json({ files: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
