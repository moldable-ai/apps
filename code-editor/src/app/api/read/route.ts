import { NextResponse } from 'next/server'
import fs from 'fs/promises'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get('path')

  if (!filePath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 })
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return NextResponse.json({ content })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
