import path from 'node:path'

const distDir = path.resolve(process.cwd(), 'dist')

function isInsideDist(filePath: string) {
  const relativePath = path.relative(distDir, filePath)
  return (
    relativePath === '' ||
    (Boolean(relativePath) &&
      !relativePath.startsWith('..') &&
      !path.isAbsolute(relativePath))
  )
}

export function resolveStaticFilePath(pathname: string) {
  const requestedPath = decodeURIComponent(pathname)

  if (
    requestedPath.startsWith('/assets/') ||
    requestedPath === '/favicon.ico'
  ) {
    const resolvedPath = path.resolve(
      distDir,
      requestedPath.replace(/^\/+/, ''),
    )
    if (!isInsideDist(resolvedPath)) {
      throw new Error('Invalid static asset path')
    }
    return resolvedPath
  }

  return path.resolve(distDir, 'index.html')
}
