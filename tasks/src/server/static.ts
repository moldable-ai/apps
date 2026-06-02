import path from 'node:path'

const distDir = path.join(process.cwd(), 'dist')

function safeDistPath(...parts: string[]) {
  const filePath = path.resolve(distDir, ...parts)
  const relative = path.relative(distDir, filePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return path.join(distDir, 'index.html')
  }
  return filePath
}

export function resolveStaticFilePath(pathname: string) {
  const requestedPath = decodeURIComponent(pathname)

  if (
    requestedPath.startsWith('/assets/') ||
    requestedPath === '/favicon.ico'
  ) {
    return safeDistPath(requestedPath.replace(/^\//, ''))
  }

  return safeDistPath('index.html')
}
