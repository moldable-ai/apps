import { NextRequest, NextResponse } from 'next/server'
import { getAppDataDir, safePath } from '@moldable-ai/storage'
import { readFile, stat } from 'fs/promises'
import { lookup } from 'mime-types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> },
) {
  const { id, path } = await params

  // Get workspace from query param (for direct asset URLs) or header
  const url = new URL(request.url)
  const workspaceId =
    url.searchParams.get('workspace') ||
    request.headers.get('x-moldable-workspace') ||
    undefined
  const dataDir = getAppDataDir(workspaceId)

  // Construct the file path within the project's public folder
  const filePath = safePath(dataDir, 'projects', id, 'public', ...path)

  try {
    // Check if file exists
    const stats = await stat(filePath)
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 404 })
    }

    // Read the file
    const fileBuffer = await readFile(filePath)

    // Determine content type
    const fileName = path[path.length - 1]
    const contentType = lookup(fileName) || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error serving public file:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
