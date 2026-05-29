import {
  getAppDataDir,
  getWorkspaceFromRequest,
  readJson,
} from '@moldable-ai/storage'
import {
  addFileToGitignore,
  addRepo,
  commitFiles,
  createBranchFromBaseIfNeeded,
  createPullRequestDraft,
  discardChanges,
  getCommitDiff,
  getCommitFiles,
  getDetectedEditors,
  getDiff,
  getDiffForFiles,
  getEditorIconPngPath,
  getHistory,
  getImagePreview,
  getPullRequestContext,
  getRecentRepos,
  getStatus,
  openFileInEditor,
  pushCommits,
  sanitizeBranchName,
  setPreferredCommitAction,
  setPreferredEditor,
  undoUnpushedCommit,
} from '../lib/git/server'
import { generateAppJson } from '../lib/llm/generate-json.server'
import { readFile, stat } from 'fs/promises'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import path from 'path'

const MAX_COMMIT_DIFF_CHARS = 60000
const MAX_REVIEW_DIFF_CHARS = 120000
const MAX_PR_DIFF_CHARS = 100000
const MAX_UI_DIFF_CHARS = 350000
const DEFAULT_HISTORY_LIMIT = 50
const MAX_HISTORY_LIMIT = 100

function createUiDiffResponse(diff: string) {
  if (diff.length <= MAX_UI_DIFF_CHARS) {
    return { diff, truncated: false, originalLength: diff.length }
  }

  return {
    diff: `${diff.slice(
      0,
      MAX_UI_DIFF_CHARS,
    )}\n\n[Diff preview truncated by Git Flow after ${MAX_UI_DIFF_CHARS.toLocaleString()} characters.]`,
    truncated: true,
    originalLength: diff.length,
  }
}

function truncateDiff(diff: string, maxChars = MAX_COMMIT_DIFF_CHARS) {
  if (diff.length <= maxChars) return diff

  return `${diff.slice(0, maxChars)}\n\n[Diff truncated by Git Flow after ${maxChars} characters.]`
}

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

type CommitMessageJson = {
  summary?: unknown
  description?: unknown
}

type CodeReviewJson = {
  summary?: unknown
  findings?: unknown
}

type PullRequestJson = {
  title?: unknown
  body?: unknown
}

type BranchNameJson = {
  branchName?: unknown
}

type GitPostBody = {
  action?: string
  paths?: string[]
  summary?: string
  description?: string
  hash?: string
  path?: string
  editorId?: string
  preferredCommitAction?: 'commit' | 'commit-and-push' | 'commit-and-open-pr'
}

type GitEditorsResponse = {
  editors: Awaited<ReturnType<typeof getDetectedEditors>>
  preferredEditorId?: string
  preferredCommitAction?: 'commit' | 'commit-and-push' | 'commit-and-open-pr'
}

type RpcRequest = {
  method?: unknown
  params?: unknown
}

type RpcParams = Record<string, unknown>
type RpcStatus = 400 | 404 | 500

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

const branchNameSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['branchName'],
  properties: {
    branchName: {
      type: 'string',
      description:
        'Short git branch name in kebab-case, optionally with a type prefix like feat/, fix/, chore/.',
    },
  },
}

const pullRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'body'],
  properties: {
    title: {
      type: 'string',
      description: 'Concise GitHub pull request title, <= 80 chars.',
    },
    body: {
      type: 'string',
      description:
        'Markdown pull request body with summary, key changes, and testing notes.',
    },
  },
}

export const app = new Hono()

app.use('/api/*', cors())

function getRpcWorkspaceId(request: Request): string | undefined {
  return (
    request.headers.get('x-moldable-workspace-id') ??
    getWorkspaceFromRequest(request)
  )
}

function asParams(value: unknown): RpcParams {
  return value && typeof value === 'object' ? (value as RpcParams) : {}
}

function stringParam(params: RpcParams, key: string): string | undefined {
  const value = params[key]
  return typeof value === 'string' ? value : undefined
}

function stringArrayParam(params: RpcParams, key: string): string[] {
  const value = params[key]
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function numberParam(params: RpcParams, key: string): number | undefined {
  const value = params[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function rpcError(code: string, message: string, status: RpcStatus = 400) {
  return {
    body: {
      ok: false,
      error: { code, message },
    },
    status,
  }
}

app.get('/api/moldable/commands', async (c) => {
  const workspaceId = getWorkspaceFromRequest(c.req.raw)
  const repos = await getRecentRepos(workspaceId)

  return c.json({
    commands: repos.map((repo) => ({
      id: `switch-repository:${encodeURIComponent(repo.path)}`,
      label: repo.name,
      description: repo.path,
      icon: 'folder',
      indicator: repo.isDirty
        ? {
            type: 'dot',
            label: 'Has uncommitted changes',
            color: 'var(--primary)',
          }
        : undefined,
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms.`)),
        timeoutMs,
      )
    }),
  ])
}

function createFallbackPullRequestBody(
  context: Awaited<ReturnType<typeof getPullRequestContext>>,
) {
  const commitList = context.commits
    .map((commit) => `- ${commit.message} (${commit.hash.slice(0, 7)})`)
    .join('\n')

  return [
    '## Summary',
    commitList || '- Updates this branch.',
    '',
    '## Changes',
    context.diffStat
      ? `\`\`\`text\n${context.diffStat}\n\`\`\``
      : '- See diff.',
    '',
    '## Testing',
    '- Commit hooks run automatically before commits.',
    '- CI will run automatically when the pull request is opened.',
  ].join('\n')
}

async function generateBranchName(input: {
  summary: string
  description?: string
  workspaceId?: string
}) {
  const fallback = sanitizeBranchName(input.summary || 'changes')
  const prefixedFallback = fallback.includes('/')
    ? fallback
    : `changes/${fallback}`
  const prompt = `Commit summary: ${input.summary}

Commit description:
${input.description || '(none)'}`

  try {
    const generated = await withTimeout(
      generateAppJson<BranchNameJson>({
        workspaceId: input.workspaceId,
        purpose: 'git.branch-name',
        schema: branchNameSchema,
        schemaName: 'branch_name',
        schemaDescription: 'A concise git branch name for a pull request.',
        maxOutputTokens: 100,
        timeoutMs: 4_000,
        system: `Generate a concise git branch name.

Rules:
- Use lowercase kebab-case.
- Prefer a prefix such as feat/, fix/, chore/, refactor/, docs/, test/, build/, or ci/.
- No spaces, punctuation other than / and -.
- Maximum 50 characters.
- Do not include ticket numbers unless present in the input.`,
        prompt,
      }),
      4_500,
      'Branch name generation',
    )
    const branchName =
      typeof generated?.branchName === 'string'
        ? sanitizeBranchName(generated.branchName)
        : prefixedFallback

    return branchName || prefixedFallback
  } catch (error) {
    console.warn('Falling back to deterministic branch name:', error)
    return prefixedFallback
  }
}

async function commitAndOpenPullRequest(input: {
  paths: string[]
  summary: string
  description: string
  workspaceId?: string
}) {
  console.info('[git-flow] Commit & open PR: starting')
  const branchName = await generateBranchName({
    summary: input.summary,
    description: input.description,
    workspaceId: input.workspaceId,
  })
  console.info(`[git-flow] Commit & open PR: branch candidate ${branchName}`)
  const branch = await createBranchFromBaseIfNeeded(
    branchName,
    input.workspaceId,
  )
  console.info(
    `[git-flow] Commit & open PR: branch ready ${branch.branchName}${
      branch.created ? ' (created)' : ''
    }`,
  )

  const commit = await commitFiles(
    input.paths,
    input.summary,
    input.description,
    input.workspaceId,
  )
  console.info(`[git-flow] Commit & open PR: committed ${commit.commit}`)
  await pushCommits(input.workspaceId)
  console.info('[git-flow] Commit & open PR: pushed')

  if (branch.existingPullRequest?.url) {
    return {
      commit,
      draft: {
        title: branch.existingPullRequest.title ?? 'Pull request',
        body: '',
        url: branch.existingPullRequest.url,
        baseBranch:
          branch.existingPullRequest.baseBranch ?? branch.baseBranch ?? '',
        headBranch: branch.existingPullRequest.headBranch ?? branch.branchName,
      },
      branch,
      existing: true,
    }
  }

  const draft = await generatePullRequestDraft(input.workspaceId)
  console.info('[git-flow] Commit & open PR: draft ready')

  return {
    commit,
    draft,
    branch,
    existing: false,
  }
}

async function generatePullRequestDraft(workspaceId?: string) {
  const context = await getPullRequestContext(workspaceId)
  const prompt = `Repository: ${context.owner}/${context.repo}
Base branch: ${context.baseBranch}
Head branch: ${context.headBranch}

Commits:
${context.commits
  .map((commit) => {
    const body = commit.body ? `\n${commit.body}` : ''
    return `- ${commit.hash.slice(0, 12)} ${commit.message}${body}`
  })
  .join('\n')}

Diff stat:
${context.diffStat || '(none)'}

Diff:
${truncateDiff(context.diff, MAX_PR_DIFF_CHARS)}`

  try {
    const generated = await withTimeout(
      generateAppJson<PullRequestJson>({
        workspaceId,
        purpose: 'git.pull-request',
        schema: pullRequestSchema,
        schemaName: 'pull_request',
        schemaDescription: 'A GitHub pull request title and markdown body.',
        maxOutputTokens: 1800,
        timeoutMs: 18_000,
        system: `You write clear, review-ready GitHub pull request descriptions.

Rules:
- Title: concise, imperative or noun phrase, <= 80 chars.
- Body: Markdown with these headings exactly: ## Summary, ## Changes, ## Testing.
- Summary should explain user-visible intent in 1-3 bullets.
- Changes should group the most important implementation changes.
- Testing should not say "Not run" or "Not run (not requested)".
- Testing should mention that commit hooks run automatically before commits and CI runs automatically on pull requests.
- If specific test files, commands, or CI config are evident in the diff, mention them as additional context without inventing results.
- Do not invent issue numbers, reviewers, deployment notes, screenshots, or manual test results that are not present.`,
        prompt,
      }),
      20_000,
      'Pull request generation',
    )
    const title =
      typeof generated?.title === 'string' ? generated.title.trim() : ''
    const body =
      typeof generated?.body === 'string' ? generated.body.trim() : ''

    return createPullRequestDraft({
      context,
      title,
      body: body || createFallbackPullRequestBody(context),
    })
  } catch (error) {
    console.warn('Falling back to deterministic PR details:', error)
    return createPullRequestDraft({
      context,
      title: context.commits[0]?.message ?? `Merge ${context.headBranch}`,
      body: createFallbackPullRequestBody(context),
    })
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

// Most-recent edit time across a repo's changed files. Lets the resume rail
// sort by genuine recency. Bounded to one repo and best-effort.
async function getLastTouchedAt(
  repoPath: string,
  workspaceId?: string,
): Promise<string | undefined> {
  try {
    const status = await getStatus(repoPath, workspaceId)
    const mtimes = await Promise.all(
      status.files.slice(0, 50).map(async (file) => {
        try {
          const abs = path.join(repoPath, file.path)
          return (await stat(abs)).mtimeMs
        } catch {
          return 0
        }
      }),
    )
    const latest = Math.max(0, ...mtimes)
    return latest > 0 ? new Date(latest).toISOString() : undefined
  } catch {
    return undefined
  }
}

app.get('/api/moldable/today', async (c) => {
  const items: unknown[] = []
  let resume: unknown = null

  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const repos = await getRecentRepos(workspaceId)

    const label = (name: string, branch: string) =>
      branch ? `${name} · ${branch}` : name
    const changes = (n: number) =>
      `${n} uncommitted change${n === 1 ? '' : 's'}`

    // Repos with uncommitted work — the real "pick up where you left off",
    // not whichever repo happens to be selected. Most-recent first.
    const dirty = repos.filter((r) => r.isDirty && r.changedCount > 0)

    if (dirty.length > 0) {
      const [top, ...rest] = dirty
      resume = {
        title: label(top.name, top.branch),
        subtitle: changes(top.changedCount),
        icon: '🌳',
        deepLink: top.path,
        lastTouchedAt: await getLastTouchedAt(top.path, workspaceId),
      }

      // Collapse any other dirty repos into ONE summary nudge that just opens
      // Git — one card, not a list of recent-item dumps.
      if (rest.length > 0) {
        const totalChanges = rest.reduce((sum, r) => sum + r.changedCount, 0)
        items.push({
          id: 'git:dirty:others',
          kind: 'resume',
          surface: 'nudge',
          title:
            rest.length === 1
              ? label(rest[0].name, rest[0].branch)
              : `${rest.length} more repos with uncommitted work`,
          subtitle:
            rest.length === 1
              ? changes(rest[0].changedCount)
              : `${totalChanges} uncommitted change${totalChanges === 1 ? '' : 's'} across them`,
          icon: '🌳',
          priority: 60,
          actions: [
            {
              type: 'open-app',
              label: 'Open Git',
              ...(rest.length === 1 ? { deepLink: rest[0].path } : {}),
            },
          ],
        })
      }
    }

    // THRESHOLD: a repo with commits not yet pushed.
    const unpushed = repos.find((r) => r.ahead >= 1)
    if (unpushed) {
      items.push({
        id: 'git:unpushed',
        kind: 'threshold',
        surface: 'nudge',
        title:
          unpushed.ahead === 1
            ? `1 unpushed commit on ${unpushed.branch}`
            : `${unpushed.ahead} unpushed commits on ${unpushed.branch}`,
        subtitle: `${unpushed.name} · not yet pushed to remote`,
        icon: '⬆️',
        priority: 75,
        actions: [{ type: 'open-app', label: 'Push', deepLink: unpushed.path }],
      })
    }
  } catch (error) {
    console.error('Git today endpoint failed:', error)
    return c.json({
      items: [],
      resume: null,
      generatedAt: new Date().toISOString(),
    })
  }

  return c.json({ items, resume, generatedAt: new Date().toISOString() })
})

app.get('/api/git', async (c) => {
  try {
    const workspaceId = getWorkspaceFromRequest(c.req.raw)
    const filePath = c.req.query('file')
    const hash = c.req.query('hash')
    const files = c.req.query('files')
    const history = c.req.query('history')
    const image = c.req.query('image')
    const editors = c.req.query('editors')
    const editorIcon = c.req.query('editorIcon')
    const fileStatus = c.req.query('status')
    const offset = parseBoundedInteger(
      c.req.query('offset'),
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    )
    const limit = parseBoundedInteger(
      c.req.query('limit'),
      DEFAULT_HISTORY_LIMIT,
      1,
      MAX_HISTORY_LIMIT,
    )

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
        preferredCommitAction?:
          | 'commit'
          | 'commit-and-push'
          | 'commit-and-open-pr'
      }>(path.join(getAppDataDir(workspaceId), 'settings.json'), {}).catch(
        () => ({}),
      )) as {
        preferredEditorId?: string
        preferredCommitAction?:
          | 'commit'
          | 'commit-and-push'
          | 'commit-and-open-pr'
      }

      return c.json({
        editors: detectedEditors,
        preferredEditorId:
          typeof settings?.preferredEditorId === 'string'
            ? settings.preferredEditorId
            : undefined,
        preferredCommitAction:
          settings?.preferredCommitAction === 'commit-and-open-pr'
            ? 'commit-and-open-pr'
            : settings?.preferredCommitAction === 'commit-and-push'
              ? 'commit-and-push'
              : 'commit',
      } satisfies GitEditorsResponse)
    }

    if (image !== undefined && filePath) {
      const preview = await getImagePreview(filePath, workspaceId, {
        hash,
        status: fileStatus,
      })
      const body = preview.buffer.buffer.slice(
        preview.buffer.byteOffset,
        preview.buffer.byteOffset + preview.buffer.byteLength,
      ) as ArrayBuffer

      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': preview.mimeType,
          'Cache-Control': hash
            ? 'public, max-age=31536000, immutable'
            : 'no-store',
        },
      })
    }

    if (hash) {
      if (files !== undefined) {
        const commitFiles = await getCommitFiles(hash, undefined, workspaceId)
        return c.json({ files: commitFiles })
      }

      const diff = await getCommitDiff(hash, undefined, workspaceId, filePath)
      return c.json(createUiDiffResponse(diff))
    }

    if (filePath) {
      const diff = await getDiff(undefined, filePath, workspaceId)
      return c.json(createUiDiffResponse(diff))
    }

    if (history !== undefined) {
      const log = await getHistory(undefined, workspaceId, {
        offset,
        limit: limit + 1,
      })
      const hasMore = log.length > limit
      return c.json({
        history: log.slice(0, limit),
        hasMore,
        nextOffset: hasMore ? offset + limit : undefined,
      })
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

    if (body.action === 'openPullRequest') {
      const result = await generatePullRequestDraft(workspaceId)
      return c.json(result)
    }

    if (body.action === 'commitAndOpenPullRequest') {
      const result = await commitAndOpenPullRequest({
        paths: body.paths ?? [],
        summary: body.summary ?? '',
        description: body.description ?? '',
        workspaceId,
      })
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

    if (body.action === 'discardChanges') {
      const result = await discardChanges(body.paths ?? [], workspaceId)
      return c.json(result)
    }

    if (body.action === 'addToGitignore') {
      const result = await addFileToGitignore(body.path ?? '', workspaceId)
      return c.json(result)
    }

    if (body.action === 'setPreferredEditor') {
      const result = await setPreferredEditor(body.editorId ?? '', workspaceId)
      return c.json(result)
    }

    if (body.action === 'setPreferredCommitAction') {
      const result = await setPreferredCommitAction(
        body.preferredCommitAction === 'commit-and-open-pr'
          ? 'commit-and-open-pr'
          : body.preferredCommitAction === 'commit-and-push'
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

app.post('/api/moldable/rpc', async (c) => {
  const workspaceId = getRpcWorkspaceId(c.req.raw)

  try {
    const body = (await c.req.json()) as RpcRequest
    const method = typeof body.method === 'string' ? body.method : ''
    const params = asParams(body.params)
    const repoPath = stringParam(params, 'repoPath')

    if (!method) {
      const error = rpcError('invalid_request', 'method is required')
      return c.json(error.body, error.status)
    }

    if (method === 'git.status') {
      const [status, repos] = await Promise.all([
        getStatus(repoPath, workspaceId),
        getRecentRepos(workspaceId),
      ])
      return c.json({ ok: true, result: { ...status, recentRepos: repos } })
    }

    if (method === 'git.repos.list') {
      return c.json({ ok: true, result: await getRecentRepos(workspaceId) })
    }

    if (method === 'git.repo.set') {
      const path = stringParam(params, 'path')
      if (!path) {
        const error = rpcError('invalid_params', 'path is required')
        return c.json(error.body, error.status)
      }
      const status = await addRepo(path, workspaceId)
      return c.json({ ok: true, result: status })
    }

    if (method === 'git.diff') {
      const filePath = stringParam(params, 'filePath')
      const maxChars = numberParam(params, 'maxChars') ?? MAX_REVIEW_DIFF_CHARS
      const diff = await getDiff(repoPath, filePath, workspaceId)
      return c.json({
        ok: true,
        result: {
          diff: truncateDiff(diff, maxChars),
          truncated: diff.length > maxChars,
        },
      })
    }

    if (method === 'git.commitDiff') {
      const hash = stringParam(params, 'hash')
      if (!hash) {
        const error = rpcError('invalid_params', 'hash is required')
        return c.json(error.body, error.status)
      }
      const maxChars = numberParam(params, 'maxChars') ?? MAX_REVIEW_DIFF_CHARS
      const diff = await getCommitDiff(hash, repoPath, workspaceId)
      return c.json({
        ok: true,
        result: {
          diff: truncateDiff(diff, maxChars),
          truncated: diff.length > maxChars,
        },
      })
    }

    if (method === 'git.history') {
      const limit = Math.min(
        Math.max(numberParam(params, 'limit') ?? DEFAULT_HISTORY_LIMIT, 1),
        MAX_HISTORY_LIMIT,
      )
      const offset = Math.max(numberParam(params, 'offset') ?? 0, 0)
      const history = await getHistory(repoPath, workspaceId, { offset, limit })
      return c.json({ ok: true, result: history })
    }

    if (method === 'git.generateCommitMessage') {
      const result = await generateCommitMessage(
        stringArrayParam(params, 'paths'),
        workspaceId,
      )
      return c.json({ ok: true, result })
    }

    if (method === 'git.reviewCode') {
      const result = await reviewCode(
        stringArrayParam(params, 'paths'),
        workspaceId,
      )
      return c.json({ ok: true, result })
    }

    if (method === 'git.editors.list') {
      const editors = await getDetectedEditors(workspaceId)
      return c.json({ ok: true, result: editors })
    }

    return c.json(
      {
        ok: false,
        error: {
          code: 'method_not_found',
          message: `Git does not expose ${method}.`,
        },
      },
      404,
    )
  } catch (error) {
    console.error('Git RPC failed:', error)
    return c.json(
      {
        ok: false,
        error: {
          code: 'git_rpc_failed',
          message:
            error instanceof Error
              ? error.message
              : 'Git could not complete the request.',
        },
      },
      500,
    )
  }
})
