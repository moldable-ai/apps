import { NextResponse } from 'next/server'
import { getImageMimeType, isImageFile } from '@/lib/file-utils'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get('path')

  if (!filePath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 })
  }

  // Security: only allow image files
  if (!isImageFile(filePath)) {
    return NextResponse.json({ error: 'Not an image file' }, { status: 400 })
  }

  // Security: prevent path traversal attacks
  const normalizedPath = path.normalize(filePath)
  if (normalizedPath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  try {
    const buffer = await fs.readFile(normalizedPath)
    const mimeType = getImageMimeType(normalizedPath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
