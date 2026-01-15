import { NextRequest, NextResponse } from 'next/server'
import { saveTokens } from '@/lib/calendar/google-auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  try {
    await saveTokens(code)

    // Success page that notifies opener window and closes
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Authentication Successful</title>
        </head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff;">
          <div style="text-align: center;">
            <h1 style="color: #4ade80;">✓ Authenticated!</h1>
            <p>Redirecting back to Calendar...</p>
            <script>
              // Notify opener window to refresh, then close or redirect
              if (window.opener) {
                window.opener.postMessage({ type: 'oauth-success' }, '*');
                setTimeout(() => window.close(), 1000);
              } else {
                // If no opener (direct navigation), redirect to app
                setTimeout(() => window.location.href = '/', 1000);
              }
            </script>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  } catch (error) {
    console.error('Auth error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to exchange code'
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Authentication Failed</title>
        </head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff;">
          <div style="text-align: center; max-width: 400px;">
            <h1 style="color: #f87171;">✗ Authentication Failed</h1>
            <p style="color: #a1a1aa;">${errorMessage}</p>
            <p style="margin-top: 20px;"><a href="/" style="color: #60a5fa;">Return to Calendar</a></p>
          </div>
        </body>
      </html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }
}
