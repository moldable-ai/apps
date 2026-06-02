import path from 'node:path'

const distDir = path.join(process.cwd(), 'dist')
const notFoundFile = path.join(distDir, '__not_found__')

function decodePathname(pathname: string) {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

function resolveDistFile(...segments: string[]) {
  const filePath = path.resolve(distDir, ...segments)
  const relativePath = path.relative(distDir, filePath)

  if (
    relativePath === '' ||
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath)
  ) {
    return notFoundFile
  }

  return filePath
}

export function resolveStaticFilePath(pathname: string) {
  const requestedPath = decodePathname(pathname)

  if (requestedPath.startsWith('/assets/')) {
    const assetPath = path.posix.normalize(requestedPath.replace(/^\//, ''))
    if (!assetPath.startsWith('assets/')) return notFoundFile

    return resolveDistFile(assetPath)
  }

  if (requestedPath === '/favicon.ico') {
    return resolveDistFile('favicon.ico')
  }

  return resolveDistFile('index.html')
}
