import path from 'node:path'

const distDir = path.join(process.cwd(), 'dist')
const distAssetsDir = path.join(distDir, 'assets')
const notFoundPath = path.join(distDir, '__not_found__')

function containedPath(baseDir: string, requestedPath: string) {
  if (requestedPath.includes('\0') || requestedPath.includes('\\')) {
    return notFoundPath
  }

  const resolvedPath = path.resolve(baseDir, requestedPath)
  const relativePath = path.relative(baseDir, resolvedPath)
  if (
    relativePath === '' ||
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath)
  ) {
    return notFoundPath
  }

  return resolvedPath
}

export function resolveStaticFilePath(pathname: string) {
  let requestedPath: string
  try {
    requestedPath = decodeURIComponent(pathname)
  } catch {
    return notFoundPath
  }

  if (requestedPath.startsWith('/assets/')) {
    return containedPath(distAssetsDir, requestedPath.slice('/assets/'.length))
  }

  if (requestedPath === '/favicon.ico') {
    return path.join(distDir, 'favicon.ico')
  }

  return path.join(distDir, 'index.html')
}
