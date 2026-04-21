import { Hono } from 'hono'
import { cors } from 'hono/cors'

export const app = new Hono()

app.use('/api/*', cors())

app.get('/api/moldable/health', (c) => {
  return c.json({
    appId: process.env.MOLDABLE_APP_ID ?? 'hello-moldables',
    status: 'ok',
  })
})

app.get('/api/example/stream', () => {
  const encoder = new TextEncoder()
  let count = 0

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        count += 1
        controller.enqueue(encoder.encode(`data: hello ${count}\n\n`))
        if (count >= 3) {
          clearInterval(interval)
          controller.close()
        }
      }, 250)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
})
