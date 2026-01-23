import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const { oldPath, newName } = await request.json()

    if (!oldPath || !newName) {
      return NextResponse.json(
        { error: 'oldPath and newName are required' },
        { status: 400 },
      )
    }

    // Validate newName doesn't contain path separators
    if (newName.includes('/') || newName.includes('\\')) {
      return NextResponse.json(
        { error: 'New name cannot contain path separators' },
        { status: 400 },
      )
    }

    const dir = path.dirname(oldPath)
    const newPath = path.join(dir, newName)

    // Check if old path exists
    try {
      await fs.access(oldPath)
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check if new path already exists
    try {
      await fs.access(newPath)
      return NextResponse.json(
        { error: 'A file with that name already exists' },
        { status: 409 },
      )
    } catch {
      // Good - new path doesn't exist
    }

    await fs.rename(oldPath, newPath)

    return NextResponse.json({ success: true, newPath })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
