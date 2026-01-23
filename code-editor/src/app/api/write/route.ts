import { NextResponse } from 'next/server'
import fs from 'fs/promises'

export async function POST(request: Request) {
  try {
    const { path: filePath, content } = await request.json()

    if (!filePath) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    await fs.writeFile(filePath, content, 'utf-8')
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
