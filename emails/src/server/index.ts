import { app } from './app'
import { resolveStaticFilePath } from './static'
import fs from 'node:fs/promises'
import {
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from 'node:http'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import {
  type HmrOptions,
  type ViteDevServer,
  createServer as createViteServer,
} from 'vite'

const host = process.env.MOLDABLE_HOST ?? '127.0.0.1'
const port = Number(process.env.MOLDABLE_PORT ?? process.env.PORT ?? 3000)
const isProduction = process.env.NODE_ENV === 'production'
const root = process.cwd()

function createHmrOptions(server: HttpServer): HmrOptions {
  const appUrl = process.env.MOLDABLE_APP_URL
  if (!appUrl) return { server }

  try {
    const url = new URL(appUrl)
    const isHttps = url.protocol === 'https:'

    return {
      server,
      protocol: isHttps ? 'wss' : 'ws',
      host: url.hostname,
      clientPort: url.port ? Number(url.port) : isHttps ? 443 : 80,
    }
  } catch {
    return { server }
  }
}

function requestUrl(req: IncomingMessage) {
  return new URL(
    req.url ?? '/',
    `http://${req.headers.host ?? `${host}:${port}`}`,
  )
}

function toWebRequest(req: IncomingMessage) {
  const url = requestUrl(req)
  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry)
    } else if (value !== undefined) {
      headers.set(key, value)
    }
  }

  const method = req.method ?? 'GET'
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers,
  }

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = Readable.toWeb(req) as ReadableStream
    init.duplex = 'half'
  }

  return new Request(url, init)
}

function writeWebResponse(response: Response, res: ServerResponse) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  if (!response.body) {
    res.end()
    return
  }

  Readable.fromWeb(
    response.body as Parameters<typeof Readable.fromWeb>[0],
  ).pipe(res)
}

async function serveStatic(req: IncomingMessage, res: ServerResponse) {
  const url = requestUrl(req)
  const filePath = resolveStaticFilePath(url.pathname)

  try {
    const content = await fs.readFile(filePath)
    res.statusCode = 200
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
    }
    res.end(content)
  } catch {
    res.statusCode = 404
    res.end('Not found')
  }
}

async function createDevServer(server: HttpServer) {
  if (isProduction) return null

  return createViteServer({
    root,
    appType: 'mpa',
    server: {
      middlewareMode: true,
      host,
      hmr: createHmrOptions(server),
    },
  })
}

async function handleClientRequest(
  vite: ViteDevServer | null,
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (!vite) {
    await serveStatic(req, res)
    return
  }

  const originalUrl = req.url
  const url = requestUrl(req)
  if (url.pathname === '/widget') {
    req.url = `/widget.html${url.search}`
  }

  vite.middlewares(req, res, () => {
    req.url = originalUrl
    res.statusCode = 404
    res.end('Not found')
  })
}

async function main() {
  let vite: ViteDevServer | null = null

  const server = createServer(async (req, res) => {
    try {
      const url = requestUrl(req)
      if (url.pathname.startsWith('/api/')) {
        const response = await app.fetch(toWebRequest(req))
        writeWebResponse(response, res)
        return
      }

      await handleClientRequest(vite, req, res)
    } catch (error) {
      console.error(error)
      res.statusCode = 500
      res.end(error instanceof Error ? error.message : 'Internal server error')
    }
  })

  vite = await createDevServer(server)

  server.listen(port, host, () => {
    console.log(`Mail ready at http://${host}:${port}`)
  })
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main()
}
