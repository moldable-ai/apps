import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
} from '@moldable-ai/storage'
import {
  addRepo,
  commitFiles,
  getCommitDiff,
  getDetectedEditors,
  getDiff,
  getDiffForFiles,
  getEditorIconPngPath,
  getHistory,
  getRecentRepos,
  getStatus,
  openFileInEditor,
  pushCommits,
  setPreferredCommitAction,
  setPreferredEditor,
  undoUnpushedCommit,
} from '../lib/git/server'
import { generateAppJson } from '../lib/llm/generate-json.server'
import { readFile } from 'fs/promises'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import path from 'path'

const MAX_COMMIT_DIFF_CHARS = 60000
const MAX_REVIEW_DIFF_CHARS = 120000

function truncateDiff(diff: string, maxChars = MAX_COMMIT_DIFF_CHARS) {
  if (diff.length <= maxChars) return diff

  return `${diff.slice(0, maxChars)}\n\n[Diff truncated by Git Flow after ${maxChars} characters.]`
}

type CommitMessageJson = {
  summary?: unknown
  description?: unknown
}

type CodeReviewJson = {
  summary?: unknown
  findings?: unknown
}

type GitPostBody = {
  action?: string
  paths?: string[]
  summary?: string
  description?: string
  hash?: string
  path?: string
  editorId?: string
  preferredCommitAction?: 'commit' | 'commit-and-push'
}

type GitEditorsResponse = {
  editors: Awaited<ReturnType<typeof getDetectedEditors>>
  preferredEditorId?: string
  preferredCommitAction?: 'commit' | 'commit-and-push'
}

const commitMessageSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'description'],
  properties: {
    summary: {
      type: 'string',
      description: 'Conventional Commit summary, <= 72 chars.',
    },
    description: {
      type: 'string',
      description: 'Optional commit body. Use an empty string if not needed.',
    },
  },
}

const codeReviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'findings'],
  properties: {
    summary: {
      type: 'string',
      description: 'One sentence overall assessment.',
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'file', 'title', 'details', 'suggestion'],
        properties: {
          severity: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
          },
          file: {
            type: 'string',
            description: 'Path from the reviewed diff.',
          },
          title: {
            type: 'string',
            description: 'Short issue title.',
          },
          details: {
            type: 'string',
            description: 'Why this is a problem and when it happens.',
          },
          suggestion: {
            type: 'string',
            description: 'Specific fix.',
          },
        },
      },
    },
  },
}

export const app = new Hono()

app.use('/api/*', cors())

app.get('/api/moldable/commands', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const repos = await getRecentRepos(workspaceId)

  return c.json({
    commands: repos.map((repo) => ({
      id: `switch-repository:${encodeURIComponent(repo.path)}`,
      label: repo.name,
      description: repo.path,
      icon: 'folder-git',
      status: repo.isDirty ? 'modified' : undefined,
      group: 'Repositories',
      action: {
        type: 'message',
        command: 'switch-repository',
        payload: { repoPath: repo.path },
      },
    })),
  })
})

async function generateCommitMessage(paths: string[], workspaceId?: string) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('At least one selected file is required.')
  }

  const [status, diff] = await Promise.all([
    getStatus(undefined, workspaceId),
    getDiffForFiles(paths, workspaceId),
  ])

  if (!diff.trim()) {
    throw new Error('No selected file diff found to summarize.')
  }

  const prompt = `Repository: ${status.repoName}
Branch: ${status.currentBranch}
Selected files:
${paths.map((filePath) => `- ${filePath}`).join('\n')}

Diff:
${truncateDiff(diff)}`

  const generated = await generateAppJson<CommitMessageJson>({
    workspaceId,
    purpose: 'git.commit-message',
    schema: commitMessageSchema,
    schemaName: 'commit_message',
    schemaDescription: 'A Conventional Commit summary and optional body.',
    maxOutputTokens: 700,
    system: `You write concise Conventional Commit messages.

Summary rules:
- Use exactly one of these types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- Include a short lowercase scope when it is obvious, for example "feat(git): generate commit messages".
- Use "feat" for user-visible features and "fix" for bug fixes.
- Use imperative mood after the colon.
- Do not end the summary with a period.
- Use an empty string for description if a commit body is not needed.

Use only the selected changed files and diff provided by the user.`,
    prompt,
  })
  const summary =
    typeof generated?.summary === 'string' ? generated.summary.trim() : ''
  const description =
    typeof generated?.description === 'string'
      ? generated.description.trim()
      : ''

  if (!summary) {
    throw new Error('AI response did not include a commit summary.')
  }

  return { summary, description }
}

async function reviewCode(paths: string[], workspaceId?: string) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('At least one selected file is required.')
  }

  const [status, diff] = await Promise.all([
    getStatus(undefined, workspaceId),
    getDiffForFiles(paths, workspaceId),
  ])

  if (!diff.trim()) {
    throw new Error('No selected file diff found to review.')
  }

  const prompt = `Repository: ${status.repoName}
Branch: ${status.currentBranch}
Selected files:
${paths.map((filePath) => `- ${filePath}`).join('\n')}

Diff:
${truncateDiff(diff, MAX_REVIEW_DIFF_CHARS)}`

  const review = await generateAppJson<CodeReviewJson>({
    workspaceId,
    purpose: 'git.code-review',
    schema: codeReviewSchema,
    schemaName: 'code_review',
    schemaDescription:
      'An actionable code review of selected changes, with findings.',
    maxOutputTokens: 1800,
    system: `You are a senior code reviewer.

Review only the selected changed files and diff provided by the user. Focus on concrete correctness, security, data loss, race conditions, type safety, regressions, and missing tests. Do not comment on style unless it creates a real maintenance or correctness risk.

If there are no actionable issues, return an empty findings array.`,
    prompt,
  })
  const summary =
    typeof review?.summary === 'string' ? review.summary.trim() : ''
  const findings = Array.isArray(review?.findings) ? review.findings : []

  return {
    summary: summary || 'Review complete.',
    findings,
  }
}

app.get('/api/moldable/health', (c) => {
  const portRaw = process.env.MOLDABLE_PORT
  const port = portRaw ? Number(portRaw) : null
  const url = process.env.MOLDABLE_APP_URL ?? process.env.PORTLESS_URL ?? null

  return c.json(
    {
      appId: process.env.MOLDABLE_APP_ID ?? 'git-flow',
      port,
      url,
      ts: Date.now(),
    },
    200,
    {
      'Cache-Control': 'no-store',
    },
  )
})

app.get('/api/git', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const filePath = c.req.query('file')
    const hash = c.req.query('hash')
    const history = c.req.query('history')
    const editors = c.req.query('editors')
    const editorIcon = c.req.query('editorIcon')

    if (editorIcon) {
      const pngPath = await getEditorIconPngPath(editorIcon, workspaceId)

      if (!pngPath) {
        return c.json({ error: 'Editor icon not found' }, 404)
      }

      const iconBuffer = await readFile(pngPath)
      return new Response(iconBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    if (editors !== undefined) {
      const detectedEditors = await getDetectedEditors(workspaceId)
      const settings = (await readJson<{
        preferredEditorId?: string
        preferredCommitAction?: 'commit' | 'commit-and-push'
      }>(path.join(getAppDataDir(workspaceId), 'settings.json'), {}).catch(
        () => ({}),
      )) as {
        preferredEditorId?: string
        preferredCommitAction?: 'commit' | 'commit-and-push'
      }

      return c.json({
        editors: detectedEditors,
        preferredEditorId:
          typeof settings?.preferredEditorId === 'string'
            ? settings.preferredEditorId
            : undefined,
        preferredCommitAction:
          settings?.preferredCommitAction === 'commit-and-push'
            ? 'commit-and-push'
            : 'commit',
      } satisfies GitEditorsResponse)
    }

    if (filePath) {
      const diff = await getDiff(undefined, filePath, workspaceId)
      return c.json({ diff })
    }

    if (hash) {
      const diff = await getCommitDiff(hash, undefined, workspaceId)
      return c.json({ diff })
    }

    if (history !== undefined) {
      const log = await getHistory(undefined, workspaceId)
      return c.json({ history: log })
    }

    const [status, repos] = await Promise.all([
      getStatus(undefined, workspaceId),
      getRecentRepos(workspaceId),
    ])

    return c.json({ ...status, recentRepos: repos })
  } catch (error) {
    console.error('Git API error:', error)
    return c.json({ error: 'Failed to fetch git status' }, 500)
  }
})

app.post('/api/git', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const body = await c.req.json<GitPostBody>()

    if (body.action === 'commit') {
      const result = await commitFiles(
        body.paths ?? [],
        body.summary ?? '',
        body.description ?? '',
        workspaceId,
      )
      return c.json(result)
    }

    if (body.action === 'generateCommitMessage') {
      const result = await generateCommitMessage(body.paths ?? [], workspaceId)
      return c.json(result)
    }

    if (body.action === 'reviewCode') {
      const result = await reviewCode(body.paths ?? [], workspaceId)
      return c.json(result)
    }

    if (body.action === 'push') {
      const result = await pushCommits(workspaceId)
      return c.json(result)
    }

    if (body.action === 'undo') {
      const result = await undoUnpushedCommit(body.hash ?? '', workspaceId)
      return c.json(result)
    }

    if (body.action === 'openInEditor') {
      const result = await openFileInEditor(
        body.path ?? '',
        body.editorId,
        workspaceId,
      )
      return c.json(result)
    }

    if (body.action === 'setPreferredEditor') {
      const result = await setPreferredEditor(body.editorId ?? '', workspaceId)
      return c.json(result)
    }

    if (body.action === 'setPreferredCommitAction') {
      const result = await setPreferredCommitAction(
        body.preferredCommitAction === 'commit-and-push'
          ? 'commit-and-push'
          : 'commit',
        workspaceId,
      )
      return c.json(result)
    }

    const status = await addRepo(body.path ?? '', workspaceId)
    const [diff, repos] = await Promise.all([
      getDiff(body.path, undefined, workspaceId),
      getRecentRepos(workspaceId),
    ])
    return c.json({ ...status, diff, recentRepos: repos })
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Action failed',
      },
      400,
    )
  }
})
