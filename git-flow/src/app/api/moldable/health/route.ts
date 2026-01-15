import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function GET() {
  const appId = process.env.MOLDABLE_APP_ID ?? 'git-flow'
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null

  return NextResponse.json(
    { appId, port, ts: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store',
        ...corsHeaders,
      },
    },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}
