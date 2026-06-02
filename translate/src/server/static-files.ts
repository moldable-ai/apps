import path from 'node:path'

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
}

function decodePathname(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return null
  }
}

export function resolveStaticFilePath(
  distDir: string,
  pathname: string,
): string | null {
  const requestedPath = decodePathname(pathname)
  if (!requestedPath) return null

  const staticPath =
    requestedPath.startsWith('/assets/') ||
    requestedPath === '/favicon.ico' ||
    requestedPath === '/icon.png'
      ? requestedPath
      : '/index.html'

  const normalizedDistDir = path.resolve(distDir)
  const filePath = path.resolve(
    normalizedDistDir,
    staticPath.replace(/^\/+/, ''),
  )

  if (
    filePath !== normalizedDistDir &&
    !filePath.startsWith(`${normalizedDistDir}${path.sep}`)
  ) {
    return null
  }

  return filePath
}

export function getStaticContentType(filePath: string): string | undefined {
  return contentTypes[path.extname(filePath)]
}
