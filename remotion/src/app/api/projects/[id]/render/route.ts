import { NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import {
  getExportsDir,
  getProjectDir,
  readProjectMetadata,
} from '@/lib/storage'
import { exec } from 'child_process'
import { mkdir } from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

// Force Node.js runtime for this route (needed for child_process)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

const execAsync = promisify(exec)

type RouteContext = {
  params: Promise<{ id: string }>
}

// POST /api/projects/[id]/render - Render project to MP4
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params
  const workspaceId = getWorkspaceFromRequest(request)

  const metadata = await readProjectMetadata(workspaceId, id)

  if (!metadata) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Create exports directory
  const exportsDir = getExportsDir(workspaceId)
  await mkdir(exportsDir, { recursive: true })

  // Output file path
  const timestamp = Date.now()
  const sanitizedName = metadata.name.replace(/[^a-zA-Z0-9-_]/g, '_')
  const outputFileName = `${sanitizedName}_${timestamp}.mp4`
  const outputPath = path.join(exportsDir, outputFileName)

  // Get the render script path and project directory
  const appRoot = process.cwd()
  const renderScript = path.join(appRoot, 'scripts', 'render.mjs')
  const projectDir = getProjectDir(workspaceId, id)

  try {
    // Run the render script - now passing the project directory instead of JSON file
    const { stdout, stderr } = await execAsync(
      `node "${renderScript}" "${projectDir}" "${outputPath}"`,
      {
        cwd: appRoot,
        timeout: 5 * 60 * 1000, // 5 minutes
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      },
    )

    console.log('Render stdout:', stdout)
    if (stderr) console.error('Render stderr:', stderr)

    return NextResponse.json({
      success: true,
      outputPath,
      fileName: outputFileName,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Render error:', errorMessage)
    return NextResponse.json(
      { error: 'Export failed', details: errorMessage },
      { status: 500 },
    )
  }
}
