import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const appId = process.env.MOLDABLE_APP_ID ?? 'todo'
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return NextResponse.json(
    {
      appId,
      port,
      ts: Date.now(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
