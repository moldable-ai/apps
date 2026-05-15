import path from 'node:path'

const distDir = path.join(process.cwd(), 'dist')

export function resolveStaticFilePath(pathname: string) {
  const requestedPath = decodeURIComponent(pathname)

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
