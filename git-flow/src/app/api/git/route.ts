import { NextRequest, NextResponse } from 'next/server'
import { getWorkspaceFromRequest } from '@moldable-ai/storage'
import {
  addRepo,
  commitFiles,
  getCommitDiff,
  getDiff,
  getDiffForFiles,
  getHistory,
  getRecentRepos,
  getStatus,
  pushCommits,
  undoUnpushedCommit,
} from '@/lib/git/server'
import { generateAppJson } from '@/lib/llm/generate-json.server'

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

    if (body.action === 'generateCommitMessage') {
      const result = await generateCommitMessage(body.paths, workspaceId)
      return NextResponse.json(result)
    }

    if (body.action === 'reviewCode') {
      const result = await reviewCode(body.paths, workspaceId)
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
      const result = await undoUnpushedCommit(hash, workspaceId)
      return NextResponse.json(result)
    }

    // Otherwise assume it's a repo change
    const { path } = body
    const status = await addRepo(path, workspaceId)
    const [diff, repos] = await Promise.all([
      getDiff(path, undefined, workspaceId),
      getRecentRepos(workspaceId),
    ])
    return NextResponse.json({ ...status, diff, recentRepos: repos })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Action failed',
      },
      { status: 400 },
    )
  }
}
