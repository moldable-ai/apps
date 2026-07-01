export function contentTypeFor(file: string): string {
  const ext = file.toLowerCase().split('.').pop() ?? ''
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'avif':
      return 'image/avif'
    case 'css':
      return 'text/css; charset=utf-8'
    case 'js':
      return 'text/javascript; charset=utf-8'
    case 'json':
      return 'application/json; charset=utf-8'
    case 'woff2':
      return 'font/woff2'
    case 'woff':
      return 'font/woff'
    case 'html':
      return 'text/html; charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}
