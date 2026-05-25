import { getAppDataDir } from '@moldable-ai/storage'
import { bundledInstrumentsDir, instrumentsDir } from './instrument-installer'
import path from 'node:path'

const distDir = path.join(process.cwd(), 'dist')

function safeJoin(base: string, requestedPath: string) {
  const filePath = path.join(base, requestedPath)
  const relative = path.relative(base, filePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid static path')
  }
  return filePath
}

export function resolveStaticFilePath(pathname: string) {
  const requestedPath = decodeURIComponent(pathname)

  if (requestedPath.startsWith('/instruments/')) {
    return safeJoin(
      bundledInstrumentsDir(),
      requestedPath.replace(/^\/instruments\//, ''),
    )
  }

  if (
    requestedPath.startsWith('/assets/') ||
    requestedPath === '/favicon.ico'
  ) {
    return path.join(distDir, requestedPath.replace(/^\//, ''))
  }

  return path.join(
    distDir,
    requestedPath === '/widget' ? 'widget.html' : 'index.html',
  )
}

export function resolveInstrumentFilePaths(
  pathname: string,
  workspaceId?: string,
) {
  const requestedPath = decodeURIComponent(pathname)
  if (!requestedPath.startsWith('/instruments/')) return []
  const relativePath = requestedPath.replace(/^\/instruments\//, '')

  return [
    safeJoin(instrumentsDir(getAppDataDir(workspaceId)), relativePath),
    safeJoin(bundledInstrumentsDir(), relativePath),
  ]
}
