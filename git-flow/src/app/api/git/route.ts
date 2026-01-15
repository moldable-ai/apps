import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import {
  addRepo,
  commitFiles,
  getCommitDiff,
  getDiff,
  getHistory,
  getRecentRepos,
  getStatus,
  pushCommits,
} from '@/lib/git/server'

export async function GET(req: NextRequest) {
  try {
    const workspaceId = getWorkspaceFromRequest(req)
    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get('file')
    const hash = searchParams.get('hash')
    const history = searchParams.get('history')

    // If requesting diff for a specific file
    if (filePath) {
      const diff = await getDiff(undefined, filePath, workspaceId)
      return NextResponse.json({ diff })
    }

    // If requesting a specific commit
    if (hash) {
      const diff = await getCommitDiff(hash, undefined, workspaceId)
      return NextResponse.json({ diff })
    }

    // If requesting log history
    if (history !== null) {
      const log = await getHistory(undefined, workspaceId)
      return NextResponse.json({ history: log })
    }

    // Otherwise return full status (without diff - we'll fetch per-file)
    const [status, repos] = await Promise.all([
      getStatus(undefined, workspaceId),
      getRecentRepos(workspaceId),
    ])

    return NextResponse.json({ ...status, recentRepos: repos })
  } catch (error) {
    console.error('Git API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch git status' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = getWorkspaceFromRequest(req)
    const body = await req.json()

    // Check if it's a commit action
    if (body.action === 'commit') {
      const { paths, summary, description } = body
      const result = await commitFiles(paths, summary, description, workspaceId)
      return NextResponse.json(result)
    }

    // Check if it's a push action
    if (body.action === 'push') {
      const result = await pushCommits(workspaceId)
      return NextResponse.json(result)
    }

    // Check if it's an undo action
    if (body.action === 'undo') {
      const { hash } = body
      const { simpleGit } = await import('simple-git')
      const { getAppDataDir, readJson } = await import('@moldable-ai/storage')
      const path = await import('path')

      const dataDir = getAppDataDir(workspaceId)
      const config = (await readJson(
        path.join(dataDir, 'settings.json'),
        {},
      )) as {
        currentRepoPath?: string
      }
      const g = simpleGit(config.currentRepoPath)

      // Basic validation: only allow undoing the most recent commit for safety
      // and checking if it matches the hash
      const log = await g.log({ maxCount: 1 })
      if (log.latest?.hash !== hash) {
        throw new Error('Can only undo the most recent commit.')
      }

      await g.reset(['--soft', 'HEAD~1'])
      return NextResponse.json({ success: true })
    }

    // Otherwise assume it's a repo change
    const { path } = body
    const status = await addRepo(path, workspaceId)
    const diff = await getDiff(path, undefined, workspaceId)
    return NextResponse.json({ ...status, diff })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Action failed',
      },
      { status: 400 },
    )
  }
}
