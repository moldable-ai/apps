import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Read at request time, not module load time
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY

  if (!DEEPGRAM_API_KEY) {
    return NextResponse.json(
      { error: 'DEEPGRAM_API_KEY not configured' },
      { status: 500 },
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const ttlSeconds = body.ttl_seconds || 600 // Default 10 minutes

    // Create a temporary API key using Deepgram's key management API
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`)
    }

    const { projects } = await response.json()
    if (!projects || projects.length === 0) {
      throw new Error('No Deepgram projects found')
    }

    const projectId = projects[0].project_id

    // Create a temporary key
    const keyResponse = await fetch(
      `https://api.deepgram.com/v1/projects/${projectId}/keys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: `Meetings app temporary key`,
          scopes: ['usage:write'],
          time_to_live_in_seconds: ttlSeconds,
        }),
      },
    )

    if (!keyResponse.ok) {
      const errorText = await keyResponse.text()
      throw new Error(`Failed to create temporary key: ${errorText}`)
    }

    const keyData = await keyResponse.json()

    return NextResponse.json({
      access_token: keyData.key,
      expires_in: ttlSeconds,
    })
  } catch (error) {
    console.error('Deepgram token error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Deepgram token' },
      { status: 500 },
    )
  }
}
