import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable/storage'
import { getOAuth2Client } from '@/lib/calendar/google-auth'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = getWorkspaceFromRequest(request)
    const auth = await getOAuth2Client(workspaceId)

    // Check if we actually have credentials/tokens
    if (
      !auth.credentials ||
      (!auth.credentials.access_token && !auth.credentials.refresh_token)
    ) {
      return NextResponse.json(
        { events: [], authenticated: false },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    const calendar = google.calendar({ version: 'v3', auth })

    // Default: use the specific range provided OR default to a 3-month window
    // IMPORTANT: Only use defaults if NOTHING is provided to avoid overlapping results in widgets
    const now = new Date()
    const defaultMin = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).toISOString()
    const defaultMax = new Date(
      now.getFullYear(),
      now.getMonth() + 2,
      0,
    ).toISOString()

    const queryMin = timeMin || defaultMin
    const queryMax = timeMax || defaultMax

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: queryMin,
      timeMax: queryMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    })

    const events =
      response.data.items?.map((event) => ({
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        isAllDay: !!event.start?.date,
        location: event.location,
        link: event.htmlLink,
        status: event.status,
        colorId: event.colorId,
      })) || []

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    // If we have no tokens, return an unauthorized status so the UI shows 'Connect'
    const errorMessage = error instanceof Error ? error.message : ''
    const errorCode = (error as { code?: number })?.code
    const errorStatus = (error as { status?: number })?.status
    if (
      errorMessage.includes('Missing') ||
      errorCode === 401 ||
      errorStatus === 401
    ) {
      return NextResponse.json(
        { events: [], authenticated: false },
        { status: 401 },
      )
    }
    // Return more detail in dev for debugging
    return NextResponse.json(
      {
        error: 'Failed to fetch events',
        detail: errorMessage,
        code: errorCode,
        status: errorStatus,
      },
      { status: 500 },
    )
  }
}
