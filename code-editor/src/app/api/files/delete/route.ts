import { NextResponse } from 'next/server'
import fs from 'fs/promises'

export async function POST(request: Request) {
  try {
    const { path: filePath } = await request.json()

    if (!filePath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    // Check if path exists
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get file stats to determine if it's a directory
    const stats = await fs.stat(filePath)

    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: true })
    } else {
      await fs.unlink(filePath)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
