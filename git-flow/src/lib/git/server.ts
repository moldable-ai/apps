import {
  getAppDataDir,
  readJson,
  safePath,
  writeJson,
} from '@moldable-ai/storage'
import { execFile, spawn } from 'child_process'
import { createHash } from 'crypto'
import { existsSync, readdirSync } from 'fs'
import {
  appendFile,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
} from 'fs/promises'
import os from 'os'
import path from 'path'
import { simpleGit } from 'simple-git'
import { promisify } from 'util'
import { z } from 'zod'

const execFileAsync = promisify(execFile)

const RepoEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirty: z.boolean().optional(),
})

const GithubCommitSchema = z.object({
  sha: z.string(),
  author: z
    .object({
      avatar_url: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

const GithubUserSchema = z.object({
  login: z.string().optional(),
  email: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
})

const GithubPullRequestSchema = z.object({
  url: z.string().optional(),
  number: z.number().optional(),
  title: z.string().optional(),
  state: z.string().optional(),
  baseRefName: z.string().optional(),
  headRefName: z.string().optional(),
})

const PreferredCommitActionSchema = z.enum([
  'commit',
  'commit-and-push',
  'commit-and-open-pr',
])

const RepoPreferencesSchema = z.object({
  preferredCommitAction: PreferredCommitActionSchema.optional(),
})

const SettingsSchema = z.object({
  currentRepoPath: z.string().default(''),
  recentRepos: z.array(RepoEntrySchema).default([]),
  preferredEditorId: z.string().optional(),
  preferredCommitAction: PreferredCommitActionSchema.optional(),
  // Per-repo overrides keyed by absolute repo path. Falls back to the global
  // preferredCommitAction when a repo has no explicit preference.
  repoPreferences: z.record(z.string(), RepoPreferencesSchema).default({}),
})

type Settings = z.infer<typeof SettingsSchema>

const DEFAULT_SETTINGS: Settings = {
  currentRepoPath: '',
  recentRepos: [],
  preferredEditorId: undefined,
  preferredCommitAction: 'commit',
  repoPreferences: {},
}

function createDefaultSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    recentRepos: [...DEFAULT_SETTINGS.recentRepos],
    repoPreferences: {},
  }
}

const MAX_GIT_OUTPUT_CHARS = 16000
const MAX_UNTRACKED_DIFF_BYTES = 350000
const MAX_IMAGE_PREVIEW_BYTES = 25 * 1024 * 1024
const GITHUB_AVATAR_CACHE_TTL_MS = 5 * 60 * 1000
const IMAGE_MIME_TYPES: Record<string, string> = {
  '.apng': 'image/apng',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

const CODE_EDITOR_APP_NAMES = [
  'Cursor',
  'Finder',
  'Warp',
  'Xcode',
  'TextMate',
  'Visual Studio Code',
  'Visual Studio Code - Insiders',
  'Windsurf',
  'Zed',
  'Sublime Text',
  'Nova',
  'BBEdit',
  'MacVim',
  'VSCodium',
  'Code - OSS',
  'Android Studio',
  'IntelliJ IDEA',
  'WebStorm',
  'PyCharm',
  'GoLand',
  'RubyMine',
  'CLion',
  'PhpStorm',
  'Fleet',
] as const

const MOLDABLE_CODE_EDITOR_APP_ID = 'code-editor'
const MOLDABLE_CODE_EDITOR_EDITOR_ID = 'moldable-code-editor'
const SAFE_CHILD_ENV_KEYS = new Set([
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'PATH',
  'SHELL',
  'SSH_AUTH_SOCK',
  'TERM',
  'TMP',
  'TMPDIR',
  'USER',
])
const SAFE_CHILD_ENV_PREFIXES = ['GIT_', 'LC_'] as const

type DetectedEditor = {
  id: string
  name: string
  appName: string
  appPath: string
  kind: 'mac-app' | 'moldable-app'
  moldableAppId?: string
  icon?: string
  iconPath?: string
}

type WorkspaceAppConfig = {
  apps?: Array<{
    id?: string
    name?: string
    icon?: string
    icon_path?: string | null
    path?: string
  }>
}

type GithubRemote = {
  owner: string
  repo: string
}

export type ExistingPullRequest = {
  url: string
  number?: number
  title?: string
  state?: string
  baseBranch?: string
  headBranch?: string
}

export type PullRequestStatus = {
  canOpen: boolean
  reason?: string
  provider?: 'github'
  owner?: string
  repo?: string
  remoteName?: string
  baseBranch?: string
  headBranch?: string
  compareUrl?: string
  isPushed?: boolean
  branchCommitCount?: number
  existingPullRequest?: ExistingPullRequest
}

export type PullRequestContext = PullRequestStatus & {
  canOpen: true
  commits: Array<{
    hash: string
    message: string
    body?: string
  }>
  diffStat: string
  diff: string
}

export type PullRequestDraft = {
  title: string
  body: string
  url: string
  baseBranch: string
  headBranch: string
}

export type PreferredCommitAction =
  | 'commit'
  | 'commit-and-push'
  | 'commit-and-open-pr'

type RemoteRef = {
  remoteName: string
  branchName: string
}

type GithubUserProfile = {
  login?: string
  email?: string | null
  avatarUrl?: string | null
}

type HistoryOptions = {
  offset?: number
  limit?: number
}

const githubCommitAvatarCache = new Map<
  string,
  { expiresAt: number; avatarsByHash: Map<string, string> }
>()
let githubUserProfilePromise: Promise<GithubUserProfile | undefined> | undefined

function getSafeChildEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (
      typeof value === 'string' &&
      (SAFE_CHILD_ENV_KEYS.has(key) ||
        SAFE_CHILD_ENV_PREFIXES.some((prefix) => key.startsWith(prefix)))
    ) {
      env[key] = value
    }
  }
  return env
}

async function runProcess(args: string[], cwd?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      cwd,
      env: getSafeChildEnv(),
      stdio: 'ignore',
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${args[0]} exited with code ${code ?? 'unknown'}`))
    })
  })
}

const GIT_HOOK_ENV_OVERRIDES: Record<string, string> = {
  NEXT_TELEMETRY_DISABLED: '1',
  TURBO_DAEMON: 'false',
  TURBO_TELEMETRY_DISABLED: '1',
}

function isMoldableRuntimePath(entry: string) {
  return (
    entry.includes('/desktop/src-tauri/target/debug/node/bin') ||
    entry.includes('/Moldable.app/Contents/Resources/node/bin')
  )
}

function getGitHookPath() {
  const pathValue = process.env.PATH
  if (!pathValue) return undefined

  const entries = pathValue
    .split(path.delimiter)
    .filter((entry) => entry && !isMoldableRuntimePath(entry))

  return entries.length > 0 ? entries.join(path.delimiter) : undefined
}

function getGitHookEnv() {
  const env = getSafeChildEnv()

  return {
    ...env,
    ...GIT_HOOK_ENV_OVERRIDES,
    ...(getGitHookPath() ? { PATH: getGitHookPath() } : {}),
  }
}

function appendCappedOutput(current: string, chunk: string) {
  const next = current + chunk
  if (next.length <= MAX_GIT_OUTPUT_CHARS) return next
  return next.slice(-MAX_GIT_OUTPUT_CHARS)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kib = bytes / 1024
  if (kib < 1024) return `${kib.toFixed(1)} KiB`
  return `${(kib / 1024).toFixed(1)} MiB`
}

function formatGitFailure(args: string[], stdout: string, stderr: string) {
  const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n\n')
  const prefix = `git ${args.join(' ')} failed`
  return output ? `${prefix}\n\n${output}` : prefix
}

function isStalePathspecError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('pathspec') && message.includes('did not match any files')
  )
}

function getImageMimeType(filePath: string) {
  return IMAGE_MIME_TYPES[path.extname(filePath).toLowerCase()]
}

function isDeletedStatus(status?: string) {
  return status?.includes('D') === true || status === 'deleted'
}

function resolveRepoFilePath(repoPath: string, filePath: string) {
  if (path.isAbsolute(filePath)) {
    throw new Error('Image preview path must be relative to the repository.')
  }

  const resolvedRepoPath = path.resolve(repoPath)
  const resolvedFilePath = path.resolve(resolvedRepoPath, filePath)
  const relativePath = path.relative(resolvedRepoPath, resolvedFilePath)

  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    relativePath === ''
  ) {
    throw new Error('Image preview path is outside the repository.')
  }

  return resolvedFilePath
}

async function runGitBuffer(args: string[], cwd: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn('git', args, {
      cwd,
      env: getGitHookEnv() as NodeJS.ProcessEnv,
      windowsHide: true,
    })

    const chunks: Buffer[] = []
    let byteLength = 0
    let stderr = ''
    let settled = false

    child.stdin.end()

    child.stdout.on('data', (chunk: Buffer) => {
      if (settled) return
      byteLength += chunk.byteLength
      if (byteLength > MAX_IMAGE_PREVIEW_BYTES) {
        settled = true
        child.kill()
        reject(new Error('Image preview is too large.'))
        return
      }
      chunks.push(chunk)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr = appendCappedOutput(stderr, chunk.toString('utf8'))
    })

    child.on('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })
    child.on('close', (code, signal) => {
      if (settled) return
      settled = true
      if (code === 0) {
        resolve(Buffer.concat(chunks))
        return
      }

      reject(
        new Error(
          signal
            ? `git ${args.join(' ')} was terminated by ${signal}.`
            : formatGitFailure(args, '', stderr),
        ),
      )
    })
  })
}

function getGravatarAvatarUrl(email?: string) {
  const normalizedEmail = email?.trim().toLowerCase()
  if (!normalizedEmail) return undefined

  const hash = createHash('md5').update(normalizedEmail).digest('hex')
  return `https://www.gravatar.com/avatar/${hash}?s=48&d=404`
}

function getGithubNoReplyAvatarUrl(email?: string) {
  const normalizedEmail = email?.trim().toLowerCase()
  if (!normalizedEmail) return undefined

  const match = normalizedEmail.match(
    /^(?:\d+\+)?([a-z0-9-]+)@users\.noreply\.github\.com$/,
  )
  if (!match?.[1]) return undefined

  return `https://github.com/${match[1]}.png?size=48`
}

function parseGithubRemoteUrl(remoteUrl: string): GithubRemote | undefined {
  const trimmed = remoteUrl.trim()
  const patterns = [
    /^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/,
    /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/,
    /^ssh:\/\/git@github\.com\/([^/]+)\/(.+?)(?:\.git)?$/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match?.[1] && match[2]) {
      return {
        owner: match[1],
        repo: match[2],
      }
    }
  }

  return undefined
}

function parseRemoteRef(value?: string | null): RemoteRef | undefined {
  const trimmed = value?.trim()
  if (!trimmed || !trimmed.includes('/')) return undefined

  const slashIndex = trimmed.indexOf('/')
  const remoteName = trimmed.slice(0, slashIndex)
  const branchName = trimmed.slice(slashIndex + 1)

  return remoteName && branchName ? { remoteName, branchName } : undefined
}

function encodeGithubCompareBranch(branch: string) {
  return encodeURIComponent(branch)
}

export function buildPullRequestUrl({
  owner,
  repo,
  baseBranch,
  headBranch,
  title,
  body,
}: {
  owner: string
  repo: string
  baseBranch: string
  headBranch: string
  title?: string
  body?: string
}) {
  const url = new URL(
    `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo,
    )}/compare/${encodeGithubCompareBranch(baseBranch)}...${encodeGithubCompareBranch(
      headBranch,
    )}`,
  )
  url.searchParams.set('expand', '1')
  if (title?.trim()) url.searchParams.set('title', title.trim())
  if (body?.trim()) url.searchParams.set('body', body.trim())
  return url.toString()
}

async function getGithubRemote(g: ReturnType<typeof simpleGit>) {
  const remoteUrl = await g
    .raw(['remote', 'get-url', 'origin'])
    .catch(() => undefined)
  return remoteUrl ? parseGithubRemoteUrl(remoteUrl) : undefined
}

async function getGithubRemoteForName(
  g: ReturnType<typeof simpleGit>,
  remoteName: string,
) {
  const remoteUrl = await g
    .raw(['remote', 'get-url', remoteName])
    .catch(() => undefined)
  return remoteUrl ? parseGithubRemoteUrl(remoteUrl) : undefined
}

async function getExistingPullRequest(
  repoPath: string | undefined,
  currentBranch: string,
): Promise<ExistingPullRequest | undefined> {
  if (!repoPath || !currentBranch || currentBranch === 'HEAD') return undefined

  return execFileAsync(
    'gh',
    [
      'pr',
      'view',
      currentBranch,
      '--json',
      'url,number,title,state,baseRefName,headRefName',
    ],
    {
      cwd: repoPath,
      encoding: 'utf8',
      timeout: 3000,
    },
  )
    .then(({ stdout }) => {
      const parsed = GithubPullRequestSchema.safeParse(JSON.parse(stdout))
      if (!parsed.success || !parsed.data.url) return undefined

      return {
        url: parsed.data.url,
        number: parsed.data.number,
        title: parsed.data.title,
        state: parsed.data.state,
        baseBranch: parsed.data.baseRefName,
        headBranch: parsed.data.headRefName,
      }
    })
    .catch(() => undefined)
}

async function getRemoteDefaultBranch(
  g: ReturnType<typeof simpleGit>,
  remoteName: string,
  branches: string[] = [],
) {
  const symbolicRef = await g
    .raw([
      'symbolic-ref',
      '--quiet',
      '--short',
      `refs/remotes/${remoteName}/HEAD`,
    ])
    .then((value) => value.trim())
    .catch(() => '')
  const symbolicBranch = parseRemoteRef(symbolicRef)?.branchName
  if (symbolicBranch) return symbolicBranch

  const remoteShow = await g
    .raw(['remote', 'show', '-n', remoteName])
    .then((value) => value.trim())
    .catch(() => '')
  const headBranch = remoteShow.match(/HEAD branch:\s*(.+)/)?.[1]?.trim()
  if (headBranch && headBranch !== '(unknown)') return headBranch

  if (branches.includes(`${remoteName}/main`) || branches.includes('main')) {
    return 'main'
  }
  if (
    branches.includes(`${remoteName}/master`) ||
    branches.includes('master')
  ) {
    return 'master'
  }

  return 'main'
}

async function refExists(g: ReturnType<typeof simpleGit>, ref: string) {
  return g
    .raw(['rev-parse', '--verify', '--quiet', ref])
    .then(() => true)
    .catch(() => false)
}

async function resolveCommitOid(g: ReturnType<typeof simpleGit>, hash: string) {
  const trimmed = hash.trim()
  if (!/^[0-9a-fA-F]{7,64}$/.test(trimmed)) {
    throw new Error('Commit hash must be a hexadecimal commit id.')
  }

  return g
    .raw(['rev-parse', '--verify', `${trimmed}^{commit}`])
    .then((value) => value.trim())
}

async function countRevisions(
  g: ReturnType<typeof simpleGit>,
  range: string,
): Promise<number> {
  return g
    .raw(['rev-list', '--count', range])
    .then((value) => Number.parseInt(value.trim(), 10))
    .then((value) => (Number.isFinite(value) ? value : 0))
    .catch(() => 0)
}

async function getPullRequestStatusForRepo(
  g: ReturnType<typeof simpleGit>,
  currentBranch: string,
  branches: string[] = [],
  repoPath?: string,
): Promise<PullRequestStatus> {
  if (
    !currentBranch ||
    currentBranch === 'HEAD' ||
    currentBranch === 'unknown'
  ) {
    return { canOpen: false, reason: 'No named branch is checked out.' }
  }

  const upstreamRef = await g
    .revparse(['--abbrev-ref', '--symbolic-full-name', '@{u}'])
    .then((value) => value.trim())
    .catch(() => '')
  const upstream = parseRemoteRef(upstreamRef)

  if (!upstream) {
    return {
      canOpen: false,
      reason: 'Push this branch and set an upstream before opening a PR.',
      isPushed: false,
    }
  }

  const remote = await getGithubRemoteForName(g, upstream.remoteName)
  if (!remote) {
    return {
      canOpen: false,
      reason: 'The upstream remote is not a GitHub repository.',
      remoteName: upstream.remoteName,
      headBranch: upstream.branchName,
      isPushed: false,
    }
  }

  const [baseBranch, existingPullRequest] = await Promise.all([
    getRemoteDefaultBranch(g, upstream.remoteName, branches),
    getExistingPullRequest(repoPath, currentBranch),
  ])
  const localAheadOfUpstream = await countRevisions(g, '@{u}..HEAD')
  const isPushed = localAheadOfUpstream === 0
  const remoteBaseRef = `refs/remotes/${upstream.remoteName}/${baseBranch}`
  const baseRef = (await refExists(g, remoteBaseRef))
    ? remoteBaseRef
    : `${upstream.remoteName}/${baseBranch}`
  const branchCommitCount = await countRevisions(g, `${baseRef}..HEAD`)
  const compareUrl = buildPullRequestUrl({
    owner: remote.owner,
    repo: remote.repo,
    baseBranch,
    headBranch: upstream.branchName,
  })

  const common = {
    provider: 'github' as const,
    owner: remote.owner,
    repo: remote.repo,
    remoteName: upstream.remoteName,
    baseBranch,
    headBranch: upstream.branchName,
    compareUrl,
    isPushed,
    branchCommitCount,
    existingPullRequest:
      existingPullRequest?.state === 'OPEN' ? existingPullRequest : undefined,
  }

  if (existingPullRequest?.state === 'OPEN') {
    return {
      ...common,
      baseBranch: existingPullRequest.baseBranch ?? baseBranch,
      headBranch: existingPullRequest.headBranch ?? upstream.branchName,
      canOpen: false,
      reason: 'A pull request is already open for this branch.',
    }
  }

  if (currentBranch === baseBranch || upstream.branchName === baseBranch) {
    return {
      ...common,
      canOpen: false,
      reason: 'The current branch is the base branch.',
    }
  }

  if (!isPushed) {
    return {
      ...common,
      canOpen: false,
      reason: 'Push local commits before opening a PR.',
    }
  }

  if (branchCommitCount <= 0) {
    return {
      ...common,
      canOpen: false,
      reason: `No branch commits found ahead of ${baseBranch}.`,
    }
  }

  return {
    ...common,
    canOpen: true,
  }
}

async function getGithubUserProfile() {
  githubUserProfilePromise ??= execFileAsync('gh', ['api', 'user'], {
    encoding: 'utf8',
    timeout: 2000,
  })
    .then(({ stdout }) => {
      const parsed = GithubUserSchema.safeParse(JSON.parse(stdout))
      if (!parsed.success) return undefined

      return {
        login: parsed.data.login,
        email: parsed.data.email,
        avatarUrl: parsed.data.avatar_url,
      } satisfies GithubUserProfile
    })
    .catch(() => undefined)

  return githubUserProfilePromise
}

function getGithubUserAvatarUrl(
  commit: { author_email?: string; author_name?: string },
  githubUser?: GithubUserProfile,
) {
  const avatarUrl = githubUser?.avatarUrl
  const normalizedCommitEmail = commit.author_email?.trim().toLowerCase()
  const normalizedGithubEmail = githubUser?.email?.trim().toLowerCase()

  if (!avatarUrl || !normalizedCommitEmail) return undefined

  if (
    normalizedGithubEmail &&
    normalizedCommitEmail === normalizedGithubEmail
  ) {
    return avatarUrl
  }

  const login = githubUser?.login?.trim().toLowerCase()
  if (
    login &&
    normalizedCommitEmail.endsWith('@users.noreply.github.com') &&
    normalizedCommitEmail.includes(login)
  ) {
    return avatarUrl
  }

  return undefined
}

async function getGithubCommitAvatars(
  g: ReturnType<typeof simpleGit>,
  branchName: string,
  offset: number,
  limit: number,
) {
  const remote = await getGithubRemote(g)
  if (!remote || !branchName) return new Map<string, string>()

  const githubPageSize = 100
  const startPage = Math.floor(offset / githubPageSize) + 1
  const endPage =
    Math.floor((offset + Math.max(limit - 1, 0)) / githubPageSize) + 1
  const cacheKey = `${remote.owner}/${remote.repo}:${branchName}:${startPage}:${endPage}`
  const cached = githubCommitAvatarCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.avatarsByHash
  }

  try {
    const avatarsByHash = new Map<string, string>()
    for (let page = startPage; page <= endPage; page += 1) {
      const url = new URL(
        `https://api.github.com/repos/${remote.owner}/${remote.repo}/commits`,
      )
      url.searchParams.set('sha', branchName)
      url.searchParams.set('per_page', String(githubPageSize))
      url.searchParams.set('page', String(page))

      const response = await fetch(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Moldable Git Flow',
        },
        signal: AbortSignal.timeout(2500),
      })

      if (!response.ok) continue

      const parsed = z
        .array(GithubCommitSchema)
        .safeParse(await response.json())
      if (!parsed.success) continue

      for (const commit of parsed.data) {
        if (commit.author?.avatar_url) {
          avatarsByHash.set(commit.sha, commit.author.avatar_url)
        }
      }
    }

    githubCommitAvatarCache.set(cacheKey, {
      expiresAt: Date.now() + GITHUB_AVATAR_CACHE_TTL_MS,
      avatarsByHash,
    })

    return avatarsByHash
  } catch {
    return new Map<string, string>()
  }
}

function getCommitAuthorAvatarUrl(
  commit: { hash?: string; author_email?: string; author_name?: string },
  githubAvatarsByHash: Map<string, string>,
  githubUser?: GithubUserProfile,
) {
  return (
    (commit.hash ? githubAvatarsByHash.get(commit.hash) : undefined) ??
    getGithubNoReplyAvatarUrl(commit.author_email) ??
    getGithubUserAvatarUrl(commit, githubUser) ??
    getGravatarAvatarUrl(commit.author_email)
  )
}

function resolveRepoPath(repoPath?: string, currentRepoPath?: string) {
  const pathToUse = repoPath || currentRepoPath || ''
  return pathToUse.trim() || null
}

function normalizeRepoPath(repoPath: string) {
  return path.resolve(repoPath.replace(/^~/, os.homedir()))
}

function requireRepoPath(repoPath?: string | null) {
  if (!repoPath) {
    throw new Error('No repository selected.')
  }

  return repoPath
}

function normalizeCommitPaths(paths: string[], repoPath: string) {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (const filePath of paths) {
    if (typeof filePath !== 'string') continue

    const trimmed = normalizeRepoRelativePath(repoPath, filePath)
    if (!trimmed || seen.has(trimmed)) continue

    seen.add(trimmed)
    normalized.push(trimmed)
  }

  return normalized
}

async function getCurrentChangedPathEntries(repoPath: string) {
  const status = await simpleGit(repoPath).status()
  const changedPaths = new Map<string, string[]>()

  for (const file of status.files) {
    if (!file.path) continue

    const normalizedPath = normalizeRepoRelativePath(repoPath, file.path)
    const relatedPaths = new Set([normalizedPath])

    const previousPath = (file as { from?: unknown }).from
    if (typeof previousPath === 'string' && previousPath) {
      relatedPaths.add(normalizeRepoRelativePath(repoPath, previousPath))
    }

    for (const relatedPath of relatedPaths) {
      changedPaths.set(relatedPath, Array.from(relatedPaths))
    }
  }

  return changedPaths
}

async function resolveCommitPaths(paths: string[], repoPath: string) {
  const requestedPaths = normalizeCommitPaths(paths, repoPath)
  if (requestedPaths.length === 0) {
    throw new Error('At least one selected file is required.')
  }

  const changedPaths = await getCurrentChangedPathEntries(repoPath)
  const activePaths = new Set<string>()

  for (const filePath of requestedPaths) {
    const relatedPaths = changedPaths.get(filePath)
    if (!relatedPaths) continue
    relatedPaths.forEach((relatedPath) => activePaths.add(relatedPath))
  }

  if (activePaths.size === 0) {
    throw new Error(
      'Selected files are no longer changed. Refresh the file list and choose files again.',
    )
  }

  const activeRequestedCount = requestedPaths.filter((filePath) =>
    changedPaths.has(filePath),
  ).length
  if (activeRequestedCount !== requestedPaths.length) {
    console.info(
      `[git-flow] Ignoring ${
        requestedPaths.length - activeRequestedCount
      } stale selected path(s) before commit`,
    )
  }

  return Array.from(activePaths)
}

async function runGit(
  args: string[],
  cwd: string,
  timeoutMs: number | null = 120_000,
) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn('git', args, {
      cwd,
      env: getGitHookEnv() as NodeJS.ProcessEnv,
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''
    let settled = false
    const timeout =
      timeoutMs === null
        ? null
        : setTimeout(() => {
            if (settled) return
            settled = true
            child.kill('SIGTERM')
            reject(
              new Error(
                `git ${args.join(' ')} timed out after ${Math.round(
                  timeoutMs / 1000,
                )} seconds.`,
              ),
            )
          }, timeoutMs)

    child.stdin.end()

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = appendCappedOutput(stdout, chunk.toString('utf8'))
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr = appendCappedOutput(stderr, chunk.toString('utf8'))
    })

    child.on('error', (error) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code, signal) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      const message = signal
        ? `${formatGitFailure(args, stdout, stderr)}\n\nProcess was terminated by ${signal}.`
        : formatGitFailure(args, stdout, stderr)
      reject(new Error(message))
    })
  })
}

async function getSettings(workspaceId?: string): Promise<Settings> {
  const configPath = safePath(getAppDataDir(workspaceId), 'settings.json')
  try {
    const raw = await readJson(configPath, createDefaultSettings())
    return SettingsSchema.parse(raw)
  } catch {
    return createDefaultSettings()
  }
}

async function saveSettings(settings: Settings, workspaceId?: string) {
  const configPath = safePath(getAppDataDir(workspaceId), 'settings.json')
  await writeJson(configPath, settings)
}

function resolveRepoCommitAction(
  settings: Settings,
  repoPath: string,
): PreferredCommitAction {
  return (
    settings.repoPreferences?.[repoPath]?.preferredCommitAction ??
    settings.preferredCommitAction ??
    'commit'
  )
}

export async function getRepoPreferredCommitAction(
  repoPath: string,
  workspaceId?: string,
): Promise<PreferredCommitAction> {
  const settings = await getSettings(workspaceId)
  return resolveRepoCommitAction(settings, repoPath)
}

export async function resolveKnownRepoPath(
  repoPath: string | undefined,
  workspaceId?: string,
) {
  if (!repoPath) return undefined

  const settings = await getSettings(workspaceId)
  const normalizedPath = normalizeRepoPath(repoPath)
  const knownPaths = new Set(
    [settings.currentRepoPath, ...settings.recentRepos.map((repo) => repo.path)]
      .filter(Boolean)
      .map((knownPath) => normalizeRepoPath(knownPath)),
  )

  if (!knownPaths.has(normalizedPath)) {
    throw new Error('Repository must be opened in Git before using it here.')
  }

  return normalizedPath
}

export async function getRecentRepos(workspaceId?: string) {
  const settings = await getSettings(workspaceId)

  const repos = await Promise.all(
    settings.recentRepos.map(async (repo) => {
      const preferredCommitAction = resolveRepoCommitAction(settings, repo.path)
      try {
        const status = await simpleGit(repo.path).status()
        return {
          ...repo,
          isDirty: !status.isClean(),
          changedCount: status.files.length,
          branch: status.current ?? '',
          ahead: status.ahead ?? 0,
          preferredCommitAction,
        }
      } catch {
        return {
          ...repo,
          isDirty: false,
          changedCount: 0,
          branch: '',
          ahead: 0,
          preferredCommitAction,
        }
      }
    }),
  )

  return repos
}

export async function addRepo(repoPath: string, workspaceId?: string) {
  const settings = await getSettings(workspaceId)
  const normalizedPath = normalizeRepoPath(repoPath)

  // Verify it's a git repo
  try {
    const g = simpleGit(normalizedPath)
    const isRepo = await g.checkIsRepo()
    if (!isRepo) throw new Error('Not a git repository')
  } catch {
    throw new Error('Invalid path or not a git repository')
  }

  const name = path.basename(normalizedPath)
  const exists = settings.recentRepos.find((r) => r.path === normalizedPath)

  if (!exists) {
    settings.recentRepos.unshift({ name, path: normalizedPath })
  }

  settings.currentRepoPath = normalizedPath
  await saveSettings(settings, workspaceId)
  return await getStatus(normalizedPath, workspaceId)
}

export async function removeRepo(repoPath: string, workspaceId?: string) {
  const settings = await getSettings(workspaceId)
  const normalizedPath = normalizeRepoPath(repoPath)
  const repoIndex = settings.recentRepos.findIndex(
    (repo) => normalizeRepoPath(repo.path) === normalizedPath,
  )

  if (repoIndex === -1) {
    throw new Error('Repository is not tracked by Git.')
  }

  settings.recentRepos.splice(repoIndex, 1)
  delete settings.repoPreferences[normalizedPath]

  if (
    settings.currentRepoPath &&
    normalizeRepoPath(settings.currentRepoPath) === normalizedPath
  ) {
    settings.currentRepoPath = settings.recentRepos[0]?.path ?? ''
  }

  await saveSettings(settings, workspaceId)

  const [status, recentRepos] = await Promise.all([
    getStatus(settings.currentRepoPath, workspaceId),
    getRecentRepos(workspaceId),
  ])

  return { ...status, recentRepos, removedPath: normalizedPath }
}

export async function getStatus(repoPath?: string, workspaceId?: string) {
  const settings = await getSettings(workspaceId)
  const pathToUse = resolveRepoPath(repoPath, settings.currentRepoPath)

  if (!pathToUse) {
    return {
      currentBranch: '',
      branches: [],
      files: [],
      isClean: true,
      repoName: 'Select Repository',
      repoPath: '',
    }
  }

  const g = simpleGit(pathToUse)

  try {
    const status = await g.status()
    const branchView = await g.branch()
    const pullRequest = await getPullRequestStatusForRepo(
      g,
      branchView.current,
      branchView.all,
      pathToUse,
    )

    return {
      currentBranch: branchView.current,
      branches: branchView.all,
      files: status.files,
      isClean: status.isClean(),
      ahead: status.ahead,
      tracking: status.tracking,
      repoName: path.basename(pathToUse),
      repoPath: pathToUse,
      pullRequest,
    }
  } catch (error) {
    console.error('Git status error:', error)
    return {
      currentBranch: 'unknown',
      branches: [],
      files: [],
      isClean: true,
      repoName: 'Error Loading Repo',
      repoPath: pathToUse,
    }
  }
}

function parseBranchList(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function assertSafeBranchSelection(branchName: string) {
  const trimmed = branchName.trim()

  if (!trimmed || trimmed.startsWith('-')) {
    throw new Error('Invalid branch selection.')
  }

  if (trimmed.includes('HEAD ->') || trimmed.endsWith('/HEAD')) {
    throw new Error('Cannot switch to a symbolic HEAD reference.')
  }

  return trimmed
}

export async function checkoutBranch(
  branchName: string,
  workspaceId?: string,
  repoPath?: string,
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = requireRepoPath(
    resolveRepoPath(repoPath, settings.currentRepoPath),
  )
  const targetBranch = assertSafeBranchSelection(branchName)
  const currentBranch = (
    await runGit(['branch', '--show-current'], pathToUse, 10_000)
  ).stdout.trim()

  if (targetBranch === currentBranch) {
    return getStatus(pathToUse, workspaceId)
  }

  const [localBranches, remoteBranches] = await Promise.all([
    runGit(['branch', '--format=%(refname:short)'], pathToUse, 10_000).then(
      (result) => parseBranchList(result.stdout),
    ),
    runGit(
      ['branch', '--remotes', '--format=%(refname:short)'],
      pathToUse,
      10_000,
    ).then((result) => parseBranchList(result.stdout)),
  ])

  if (localBranches.includes(targetBranch)) {
    await runGit(['switch', targetBranch], pathToUse, 30_000)
    return getStatus(pathToUse, workspaceId)
  }

  const remoteTarget = targetBranch.startsWith('remotes/')
    ? targetBranch.slice('remotes/'.length)
    : targetBranch

  if (remoteBranches.includes(remoteTarget)) {
    const slashIndex = remoteTarget.indexOf('/')
    const localBranchName =
      slashIndex === -1 ? remoteTarget : remoteTarget.slice(slashIndex + 1)

    if (localBranches.includes(localBranchName)) {
      await runGit(['switch', localBranchName], pathToUse, 30_000)
    } else {
      await runGit(['switch', '--track', remoteTarget], pathToUse, 30_000)
    }

    return getStatus(pathToUse, workspaceId)
  }

  throw new Error('Branch was not found in the current repository.')
}

export async function getPullRequestContext(
  workspaceId?: string,
  repoPath?: string,
): Promise<PullRequestContext> {
  const settings = await getSettings(workspaceId)
  const pathToUse = requireRepoPath(
    resolveRepoPath(repoPath, settings.currentRepoPath),
  )
  const g = simpleGit(pathToUse)
  const branchView = await g.branch()
  const currentBranch = branchView.current
  const status = await getPullRequestStatusForRepo(
    g,
    currentBranch,
    branchView.all,
    pathToUse,
  )

  if (status.existingPullRequest?.url) {
    throw new Error('A pull request is already open for this branch.')
  }

  if (!status.canOpen) {
    throw new Error(
      status.reason ?? 'This branch is not ready for a pull request.',
    )
  }

  const baseRefName = `refs/remotes/${status.remoteName}/${status.baseBranch}`
  const baseRef = (await refExists(g, baseRefName))
    ? baseRefName
    : `${status.remoteName}/${status.baseBranch}`
  const range = `${baseRef}..HEAD`
  const diffRange = `${baseRef}...HEAD`
  const [logOutput, diffStat, diff] = await Promise.all([
    g.raw(['log', '--reverse', '--format=%H%x1f%s%x1f%b%x1e', range]),
    g.diff(['--stat', diffRange]).catch(() => ''),
    g.diff(['--find-renames', '--name-status', diffRange]).catch(() => ''),
  ])

  const commits = logOutput
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash = '', message = '', body = ''] = entry.split('\x1f')
      return {
        hash: hash.trim(),
        message: message.trim(),
        body: body.trim() || undefined,
      }
    })
    .filter((commit) => commit.hash && commit.message)

  return {
    ...status,
    canOpen: true,
    commits,
    diffStat: diffStat.trim(),
    diff: diff.trim(),
  }
}

export function sanitizeBranchName(value: string) {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/^refs\/heads\//, '')
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/-+/g, '-')
    .replace(/(^[-/._]+)|([-/._]+$)/g, '')
    .slice(0, 80)

  return sanitized || 'changes'
}

export async function createBranchFromBaseIfNeeded(
  proposedBranchName: string,
  workspaceId?: string,
  repoPath?: string,
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = requireRepoPath(
    resolveRepoPath(repoPath, settings.currentRepoPath),
  )

  console.info('[git-flow] Commit & open PR: checking current branch')
  const currentBranch = (
    await runGit(['branch', '--show-current'], pathToUse, 10_000)
  ).stdout.trim()

  if (!currentBranch || currentBranch === 'HEAD') {
    throw new Error('Cannot create a PR while HEAD is detached.')
  }

  const upstream = await runGit(
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
    pathToUse,
    10_000,
  )
    .then((result) => parseRemoteRef(result.stdout.trim()))
    .catch(() => undefined)
  const branchList = await runGit(
    ['branch', '--list', '--format=%(refname:short)'],
    pathToUse,
    10_000,
  )
    .then((result) => result.stdout.split(/\r?\n/).map((line) => line.trim()))
    .catch(() => [] as string[])

  const baseBranch =
    currentBranch === 'main' || currentBranch === 'master'
      ? currentBranch
      : upstream?.branchName === 'main' || upstream?.branchName === 'master'
        ? upstream.branchName
        : branchList.includes('main')
          ? 'main'
          : branchList.includes('master')
            ? 'master'
            : undefined

  const existingPullRequest = await getExistingPullRequest(
    pathToUse,
    currentBranch,
  )

  if (existingPullRequest?.url) {
    return {
      created: false,
      branchName: currentBranch,
      baseBranch: existingPullRequest.baseBranch ?? baseBranch,
      existingPullRequest,
    }
  }

  if (!baseBranch || currentBranch !== baseBranch) {
    return {
      created: false,
      branchName: currentBranch,
      baseBranch,
    }
  }

  let branchName = sanitizeBranchName(proposedBranchName)
  if (!branchName.includes('/')) {
    branchName = `changes/${branchName}`
  }

  let candidate = branchName
  let suffix = 2
  while (
    await runGit(
      ['rev-parse', '--verify', '--quiet', candidate],
      pathToUse,
      5_000,
    )
      .then(() => true)
      .catch(() => false)
  ) {
    candidate = `${branchName}-${suffix}`
    suffix += 1
  }

  console.info(`[git-flow] Commit & open PR: creating branch ${candidate}`)
  await runGit(['checkout', '-b', candidate], pathToUse, 20_000)

  return {
    created: true,
    branchName: candidate,
    baseBranch,
  }
}

export function createPullRequestDraft({
  context,
  title,
  body,
}: {
  context: PullRequestContext
  title: string
  body: string
}): PullRequestDraft {
  if (
    !context.owner ||
    !context.repo ||
    !context.baseBranch ||
    !context.headBranch
  ) {
    throw new Error('Pull request target could not be resolved.')
  }

  const normalizedTitle =
    title.trim() || context.commits[0]?.message || 'Update branch'
  const normalizedBody = body.trim()
  return {
    title: normalizedTitle,
    body: normalizedBody,
    url: buildPullRequestUrl({
      owner: context.owner,
      repo: context.repo,
      baseBranch: context.baseBranch,
      headBranch: context.headBranch,
      title: normalizedTitle,
      body: normalizedBody,
    }),
    baseBranch: context.baseBranch,
    headBranch: context.headBranch,
  }
}

async function selectedPathsMatchHead(repoPath: string, paths: string[]) {
  try {
    await runGit(['diff', '--quiet', 'HEAD', '--', ...paths], repoPath, null)
    return true
  } catch {
    return false
  }
}

async function reconcileSelectedPathsIndex(repoPath: string, paths: string[]) {
  if (paths.length === 0) return

  // `git commit --only -- <paths>` protects unrelated staged changes, but Git
  // runs hooks against a temporary commit index. If a pre-commit hook formats
  // selected files and then the commit aborts as a no-op, the real index can be
  // restored to Git Flow's pre-hook `git add` state while the working tree has
  // the formatted content. Only reconcile when those paths now match HEAD so we
  // clear stale index-only noise without auto-staging fresh hook output.
  if (!(await selectedPathsMatchHead(repoPath, paths))) return

  try {
    await runGit(['add', '-A', '--', ...paths], repoPath, null)
  } catch (error) {
    console.warn(
      '[git-flow] Failed to reconcile selected paths after commit.',
      error,
    )
  }
}

function buildSelectedCommitArgs(
  summary: string,
  description: string,
  paths: string[],
) {
  const commitArgs = ['commit', '--only', '-m', summary]
  if (description) {
    commitArgs.push('-m', description)
  }
  commitArgs.push('--', ...paths)
  return commitArgs
}

async function stageAndCommitSelectedPaths(
  requestedPaths: string[],
  summary: string,
  description: string,
  repoPath: string,
) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const activePaths = await resolveCommitPaths(requestedPaths, repoPath)

    try {
      await runGit(['add', '--', ...activePaths], repoPath, null)
      try {
        await runGit(
          buildSelectedCommitArgs(summary, description, activePaths),
          repoPath,
          null,
        )
      } finally {
        await reconcileSelectedPathsIndex(repoPath, activePaths)
      }
      return
    } catch (error) {
      if (!isStalePathspecError(error) || attempt > 0) {
        throw error
      }

      console.info(
        '[git-flow] Refreshing selected paths after stale pathspec during commit.',
      )
    }
  }
}

export async function commitFiles(
  paths: string[],
  summary: string,
  description: string,
  workspaceId?: string,
  repoPath?: string,
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = requireRepoPath(
    resolveRepoPath(repoPath, settings.currentRepoPath),
  )

  try {
    await stageAndCommitSelectedPaths(paths, summary, description, pathToUse)
    const result = await runGit(['rev-parse', 'HEAD'], pathToUse)

    return { success: true, commit: result.stdout.trim() }
  } catch (err) {
    console.error('Git commit error:', err)
    // Return the specific error message (e.g. from pre-commit hooks)
    const message = err instanceof Error ? err.message : 'Git commit failed'
    throw new Error(message)
  }
}

export async function commitAllFiles(
  paths: string[],
  summary: string,
  description: string,
  workspaceId?: string,
  repoPath?: string,
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = requireRepoPath(
    resolveRepoPath(repoPath, settings.currentRepoPath),
  )

  try {
    const requestedPathCount = normalizeCommitPaths(paths, pathToUse).length
    if (requestedPathCount === 0) {
      throw new Error('At least one selected file is required.')
    }

    const currentStatus = await simpleGit(pathToUse).status()
    if (currentStatus.files.length === 0) {
      throw new Error('No current changes remain to commit.')
    }

    if (currentStatus.files.length !== requestedPathCount) {
      console.info(
        `[git-flow] All-changes commit refreshed from ${requestedPathCount} requested path(s) to ${currentStatus.files.length} current changed path(s).`,
      )
    }

    // Quick ship is explicitly an all-current-changes workflow. Use the normal
    // commit index instead of `git commit --only` so repo hooks that format and
    // `git add -u` tracked files can be swept into the same commit. Avoid a
    // pathspec here: commit generation may take long enough for files to be
    // renamed or deleted after the quick-ship snapshot was taken.
    await runGit(['add', '-A'], pathToUse, null)

    const commitArgs = ['commit', '-m', summary]
    if (description) {
      commitArgs.push('-m', description)
    }
    await runGit(commitArgs, pathToUse, null)
    const result = await runGit(['rev-parse', 'HEAD'], pathToUse)

    return { success: true, commit: result.stdout.trim() }
  } catch (err) {
    console.error('Git commit all error:', err)
    const message = err instanceof Error ? err.message : 'Git commit failed'
    throw new Error(message)
  }
}

export async function pushCommits(workspaceId?: string, repoPath?: string) {
  const settings = await getSettings(workspaceId)
  const pathToUse = requireRepoPath(
    resolveRepoPath(repoPath, settings.currentRepoPath),
  )
  const g = simpleGit(pathToUse)

  try {
    const currentBranch = (await g.revparse(['--abbrev-ref', 'HEAD'])).trim()

    if (!currentBranch || currentBranch === 'HEAD') {
      throw new Error('Cannot push while HEAD is detached.')
    }

    const upstream = await g
      .revparse(['--abbrev-ref', '--symbolic-full-name', '@{u}'])
      .then((value) => value.trim())
      .catch(() => null)

    if (upstream) {
      const result = await runGit(['push'], pathToUse)
      return { success: true, result, upstreamSet: false }
    }

    const remotes = await g.getRemotes(true)
    if (remotes.length === 0) {
      throw new Error(
        'No Git remotes are configured for this repository. Add a remote before pushing.',
      )
    }

    const preferredRemote =
      remotes.find((remote) => remote.name === 'origin') ?? remotes[0]

    const result = await runGit(
      ['push', '--set-upstream', preferredRemote.name, currentBranch],
      pathToUse,
    )

    return {
      success: true,
      result,
      upstreamSet: true,
      remote: preferredRemote.name,
      branch: currentBranch,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Git push failed'
    throw new Error(message)
  }
}

export async function undoUnpushedCommit(hash: string, workspaceId?: string) {
  const settings = await getSettings(workspaceId)
  const repoPath = requireRepoPath(
    resolveRepoPath(undefined, settings.currentRepoPath),
  )
  const g = simpleGit(repoPath)

  const log = await g.log({ maxCount: 1 })
  if (log.latest?.hash !== hash) {
    throw new Error('Can only undo the most recent commit.')
  }

  const upstream = await g.revparse(['--abbrev-ref', '@{u}']).catch(() => null)
  if (upstream) {
    const ahead = await g.log(['@{u}..HEAD'])
    const isUnpushed = ahead.all.some((commit) => commit.hash === hash)
    if (!isUnpushed) {
      throw new Error('Can only undo commits that have not been pushed.')
    }
  }

  await g.reset(['--soft', 'HEAD~1'])
  return { success: true }
}

export async function getHistory(
  repoPath?: string,
  workspaceId?: string,
  options: HistoryOptions = {},
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = resolveRepoPath(repoPath, settings.currentRepoPath)
  if (!pathToUse) return []
  const g = simpleGit(pathToUse)
  const offset = Math.max(0, options.offset ?? 0)
  const limit = Math.min(Math.max(1, options.limit ?? 50), 101)

  try {
    const [log, upstream, branchView] = await Promise.all([
      g.log([`--max-count=${limit}`, `--skip=${offset}`]),
      g.revparse(['--abbrev-ref', '@{u}']).catch(() => null),
      g.branch().catch(() => null),
    ])

    let unpushedHashes: string[] = []
    if (upstream) {
      // Get hashes that are in local but not in remote
      const ahead = await g.log(['@{u}..HEAD'])
      unpushedHashes = ahead.all.map((c) => c.hash)
    } else {
      // If no upstream, consider all commits as "unpushed" for visibility
      unpushedHashes = log.all.map((c) => c.hash)
    }

    const [githubAvatarsByHash, githubUser] = await Promise.all([
      getGithubCommitAvatars(g, branchView?.current ?? '', offset, limit),
      getGithubUserProfile(),
    ])

    return log.all.map((commit) => ({
      ...commit,
      avatarUrl: getCommitAuthorAvatarUrl(
        commit,
        githubAvatarsByHash,
        githubUser,
      ),
      isUnpushed: unpushedHashes.includes(commit.hash),
    }))
  } catch (error) {
    console.error('Git log error:', error)
    return []
  }
}

export async function getCommitDiff(
  hash: string,
  repoPath?: string,
  workspaceId?: string,
  filePath?: string,
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = resolveRepoPath(repoPath, settings.currentRepoPath)
  if (!pathToUse) return 'No repository selected.'
  const g = simpleGit(pathToUse)

  try {
    const commitHash = await resolveCommitOid(g, hash)
    if (filePath) {
      return await g.show([
        '--format=',
        '--no-ext-diff',
        '--find-renames',
        commitHash,
        '--',
        filePath,
      ])
    }

    // Show stats and the diff for the specific commit
    return await g.show([commitHash])
  } catch (error) {
    console.error('Git show error:', error)
    return 'Failed to load commit diff'
  }
}

export async function getCommitFiles(
  hash: string,
  repoPath?: string,
  workspaceId?: string,
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = resolveRepoPath(repoPath, settings.currentRepoPath)
  if (!pathToUse) return []
  const g = simpleGit(pathToUse)

  try {
    const commitHash = await resolveCommitOid(g, hash)
    const output = await g.raw([
      'diff-tree',
      '--no-commit-id',
      '--name-status',
      '-r',
      '-M',
      '--root',
      commitHash,
    ])

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [status, firstPath, secondPath] = line.split('\t')
        const isRename = status.startsWith('R') || status.startsWith('C')

        return {
          path: isRename && secondPath ? secondPath : firstPath,
          oldPath: isRename ? firstPath : undefined,
          status,
        }
      })
      .filter((file) => Boolean(file.path))
  } catch (error) {
    console.error('Git commit files error:', error)
    return []
  }
}

export async function getImagePreview(
  filePath: string,
  workspaceId?: string,
  options: { hash?: string; status?: string; repoPath?: string } = {},
) {
  const mimeType = getImageMimeType(filePath)
  if (!mimeType) {
    throw new Error('Unsupported image file type.')
  }

  const settings = await getSettings(workspaceId)
  const pathToUse = requireRepoPath(
    resolveRepoPath(options.repoPath, settings.currentRepoPath),
  )
  const gitPath = filePath.replace(/\\/g, '/')
  const g = simpleGit(pathToUse)

  if (options.hash) {
    const commitHash = await resolveCommitOid(g, options.hash)
    const treeish = isDeletedStatus(options.status)
      ? `${commitHash}^:${gitPath}`
      : `${commitHash}:${gitPath}`
    const buffer = await runGitBuffer(['show', treeish], pathToUse)
    return { buffer, mimeType }
  }

  const resolvedFilePath = resolveRepoFilePath(pathToUse, filePath)
  if (existsSync(resolvedFilePath) && !isDeletedStatus(options.status)) {
    const imageStat = await lstat(resolvedFilePath)
    if (!imageStat.isFile()) {
      throw new Error('Image preview is only available for regular files.')
    }
    if (imageStat.size > MAX_IMAGE_PREVIEW_BYTES) {
      throw new Error('Image preview is too large.')
    }
    return { buffer: await readFile(resolvedFilePath), mimeType }
  }

  const buffer = await runGitBuffer(['show', `HEAD:${gitPath}`], pathToUse)
  return { buffer, mimeType }
}

async function getRegularRepoFileForRead(
  repoPath: string,
  relativeFilePath: string,
) {
  const normalizedPath = normalizeRepoRelativePath(repoPath, relativeFilePath)
  const repoRoot = path.resolve(repoPath)
  const fullPath = path.join(repoRoot, normalizedPath)
  const fileStat = await lstat(fullPath)

  if (!fileStat.isFile()) {
    throw new Error('Preview is only available for regular files.')
  }

  const [realRepoRoot, realFilePath] = await Promise.all([
    realpath(repoRoot),
    realpath(fullPath),
  ])

  if (
    realFilePath !== realRepoRoot &&
    !realFilePath.startsWith(realRepoRoot + path.sep)
  ) {
    throw new Error('File must be inside the current repository.')
  }

  return { fullPath, fileStat, normalizedPath }
}

export async function getDiff(
  repoPath?: string,
  filePath?: string,
  workspaceId?: string,
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = resolveRepoPath(repoPath, settings.currentRepoPath)
  if (!pathToUse) return ''
  const g = simpleGit(pathToUse)

  // If a specific file is requested, get diff for that file only
  // Include both staged and unstaged changes
  if (filePath) {
    const [staged, unstaged, untracked] = await Promise.all([
      g.diff(['--cached', '--', filePath]),
      g.diff(['--', filePath]),
      g.raw(['ls-files', '--others', '--exclude-standard', '--', filePath]),
    ])

    let untrackedDiff = ''
    if (untracked.trim()) {
      // For untracked files, generate a synthetic diff. Avoid reading very large
      // files into memory just to render a preview in the UI.
      try {
        const { fullPath, fileStat, normalizedPath } =
          await getRegularRepoFileForRead(pathToUse, filePath)
        if (existsSync(fullPath)) {
          if (fileStat.size > MAX_UNTRACKED_DIFF_BYTES) {
            untrackedDiff = `--- /dev/null\n+++ b/${normalizedPath}\n@@ -0,0 +1 @@\n+[Untracked file is ${formatBytes(
              fileStat.size,
            )}. Preview skipped to keep Git Flow responsive. Open the file in your editor for full contents.]`
          } else {
            const fileContent = await readFile(fullPath, 'utf8')
            const lines = fileContent.split('\n')
            untrackedDiff = lines.map((line: string) => `+${line}`).join('\n')
            untrackedDiff = `--- /dev/null\n+++ b/${normalizedPath}\n@@ -0,0 +1,${lines.length} @@\n${untrackedDiff}`
          }
        }
      } catch (e) {
        console.error('Error reading untracked file:', e)
      }
    }

    // Combine staged, unstaged, and untracked diffs
    return [staged, unstaged, untrackedDiff].filter(Boolean).join('\n')
  }

  // Otherwise return full diff (staged + unstaged)
  const [staged, unstaged] = await Promise.all([g.diff(['--cached']), g.diff()])
  return [staged, unstaged].filter(Boolean).join('\n')
}

export async function getDiffForFiles(
  paths: string[],
  workspaceId?: string,
  repoPath?: string,
) {
  const uniquePaths = Array.from(new Set(paths)).filter(Boolean)
  const diffs = await Promise.all(
    uniquePaths.map(async (filePath) => {
      const diff = await getDiff(repoPath, filePath, workspaceId)
      return diff ? `diff --moldable-selected-file ${filePath}\n${diff}` : ''
    }),
  )

  return diffs.filter(Boolean).join('\n\n')
}

function normalizeRepoRelativePath(repoPath: string, relativeFilePath: string) {
  if (!relativeFilePath.trim() || path.isAbsolute(relativeFilePath)) {
    throw new Error('File must be inside the current repository.')
  }

  const repoRoot = path.resolve(repoPath)
  const fullPath = path.resolve(repoRoot, relativeFilePath)

  if (!fullPath.startsWith(repoRoot + path.sep) && fullPath !== repoRoot) {
    throw new Error('File must be inside the current repository.')
  }

  const normalizedPath = path.relative(repoRoot, fullPath)
  if (!normalizedPath || normalizedPath.startsWith('..')) {
    throw new Error('File must be inside the current repository.')
  }

  return normalizedPath.split(path.sep).join('/')
}

function uniqueRepoRelativePaths(repoPath: string, paths: string[]) {
  return Array.from(
    new Set(
      paths
        .filter((filePath) => typeof filePath === 'string')
        .map((filePath) => normalizeRepoRelativePath(repoPath, filePath)),
    ),
  )
}

function escapeGitignorePath(relativeFilePath: string) {
  return relativeFilePath
    .split('/')
    .map((segment) => segment.replace(/[\\[\]*?]/g, '\\$&'))
    .join('/')
}

export async function discardChanges(paths: string[], workspaceId?: string) {
  const settings = await getSettings(workspaceId)
  const repoPath = requireRepoPath(
    resolveRepoPath(undefined, settings.currentRepoPath),
  )
  const pathsToDiscard = await resolveCommitPaths(
    uniqueRepoRelativePaths(repoPath, paths),
    repoPath,
  )

  if (pathsToDiscard.length === 0) {
    throw new Error('At least one file is required.')
  }

  for (const filePath of pathsToDiscard) {
    let restoredFromHead = false
    let restoreError: unknown

    try {
      await runGit(
        ['restore', '--source=HEAD', '--staged', '--worktree', '--', filePath],
        repoPath,
      )
      restoredFromHead = true
    } catch (error) {
      restoreError = error
      await runGit(['restore', '--staged', '--', filePath], repoPath).catch(
        () => undefined,
      )
    }

    try {
      await runGit(['clean', '-fd', '--', filePath], repoPath)
    } catch (cleanError) {
      if (!restoredFromHead) {
        throw restoreError instanceof Error ? restoreError : cleanError
      }
    }
  }

  return { ok: true, paths: pathsToDiscard }
}

export async function addFileToGitignore(
  relativeFilePath: string,
  workspaceId?: string,
) {
  const settings = await getSettings(workspaceId)
  const repoPath = requireRepoPath(
    resolveRepoPath(undefined, settings.currentRepoPath),
  )
  const normalizedPath = normalizeRepoRelativePath(repoPath, relativeFilePath)
  const gitignorePath = path.join(repoPath, '.gitignore')
  const pattern = `/${escapeGitignorePath(normalizedPath)}`
  const existing = await readFile(gitignorePath, 'utf8').catch(() => '')
  const existingLines = existing.split(/\r?\n/)

  if (existingLines.includes(pattern)) {
    return { ok: true, path: normalizedPath, alreadyIgnored: true }
  }

  const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''
  await appendFile(gitignorePath, `${prefix}${pattern}\n`, 'utf8')

  return { ok: true, path: normalizedPath, alreadyIgnored: false }
}

function slugifyAppName(appName: string) {
  return appName
    .toLowerCase()
    .replace(/\.app$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getMacApplicationsDirs() {
  const candidates = [
    '/Applications',
    '/System/Applications',
    '/System/Applications/Utilities',
    '/System/Library/CoreServices',
    path.join(os.homedir(), 'Applications'),
  ]

  return Array.from(new Set(candidates)).filter((dir) => existsSync(dir))
}

function getMoldableHome() {
  return process.env.MOLDABLE_HOME ?? path.join(os.homedir(), '.moldable')
}

async function getDetectedMoldableCodeEditor(workspaceId?: string) {
  const targetWorkspace =
    workspaceId ?? process.env.MOLDABLE_WORKSPACE_ID ?? 'personal'
  const configPath = path.join(
    getMoldableHome(),
    'workspaces',
    targetWorkspace,
    'config.json',
  )

  const config = await readJson<WorkspaceAppConfig>(configPath, {
    apps: [],
  }).catch(() => ({ apps: [] }))

  const app = config.apps?.find(
    (item) => item.id === MOLDABLE_CODE_EDITOR_APP_ID,
  )
  if (!app) return null

  const iconPath =
    app.icon_path ??
    (app.path ? path.join(app.path, 'public', 'icon.png') : undefined)

  return {
    id: MOLDABLE_CODE_EDITOR_EDITOR_ID,
    name: app.name ?? 'Code',
    appName: app.name ?? 'Code',
    appPath: `moldable:${MOLDABLE_CODE_EDITOR_APP_ID}`,
    kind: 'moldable-app' as const,
    moldableAppId: MOLDABLE_CODE_EDITOR_APP_ID,
    icon: app.icon,
    iconPath: iconPath && existsSync(iconPath) ? iconPath : undefined,
  } satisfies DetectedEditor
}

async function readPlistValue(plistPath: string, key: string) {
  try {
    const { stdout } = await execFileAsync(
      '/usr/bin/plutil',
      ['-extract', key, 'raw', '-o', '-', plistPath],
      { encoding: 'utf8', timeout: 2000 },
    )
    const value = stdout.trim()
    return value || undefined
  } catch {
    return undefined
  }
}

function addIconCandidates(
  candidates: string[],
  resourcesDir: string,
  iconName?: string,
) {
  if (!iconName) return

  candidates.push(
    path.join(
      resourcesDir,
      iconName.toLowerCase().endsWith('.icns') ? iconName : `${iconName}.icns`,
    ),
  )
  candidates.push(path.join(resourcesDir, iconName))
}

async function resolveAppIconPath(appPath: string) {
  try {
    const resourcesDir = path.join(appPath, 'Contents', 'Resources')
    if (!existsSync(resourcesDir)) return undefined

    const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist')
    const appBaseName = path.basename(appPath, '.app')
    const candidates: string[] = []

    if (existsSync(infoPlistPath)) {
      addIconCandidates(
        candidates,
        resourcesDir,
        await readPlistValue(infoPlistPath, 'CFBundleIconFile'),
      )
      addIconCandidates(
        candidates,
        resourcesDir,
        await readPlistValue(infoPlistPath, 'CFBundleIconName'),
      )
    }

    candidates.push(
      path.join(resourcesDir, 'AppIcon.icns'),
      path.join(resourcesDir, `${appBaseName}.icns`),
      path.join(resourcesDir, 'app.icns'),
    )

    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate
    }

    return undefined
  } catch {
    return undefined
  }
}

async function renderIconPng(iconPath: string, pngPath: string) {
  if (iconPath.toLowerCase().endsWith('.icns')) {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'git-flow-app-icon-'))

    try {
      await runProcess(
        ['/usr/bin/qlmanage', '-t', '-s', '64', '-o', tempDir, iconPath],
        path.dirname(iconPath),
      )

      const expectedPng = path.join(tempDir, `${path.basename(iconPath)}.png`)
      const renderedPng = existsSync(expectedPng)
        ? expectedPng
        : path.join(
            tempDir,
            readdirSync(tempDir).find((entry) => entry.endsWith('.png')) ?? '',
          )

      if (!existsSync(renderedPng)) {
        throw new Error('qlmanage did not render an app icon')
      }

      await copyFile(renderedPng, pngPath)
      return
    } catch {
      await runProcess(
        ['/usr/bin/sips', '-s', 'format', 'png', iconPath, '--out', pngPath],
        path.dirname(iconPath),
      )
      return
    } finally {
      await rm(tempDir, { force: true, recursive: true })
    }
  }

  await runProcess(
    ['/usr/bin/sips', '-s', 'format', 'png', iconPath, '--out', pngPath],
    path.dirname(iconPath),
  )
}

export async function getEditorIconPngPath(
  editorId: string,
  workspaceId?: string,
) {
  const editor = (await getDetectedEditors(workspaceId)).find(
    (item) => item.id === editorId,
  )
  if (!editor?.iconPath) return undefined

  if (editor.kind === 'moldable-app') {
    return editor.iconPath
  }

  const iconsDir = safePath(getAppDataDir(workspaceId), 'editor-icons-v2')
  await mkdir(iconsDir, { recursive: true })

  const pngPath = safePath(iconsDir, `${editor.id}.png`)

  const [sourceStat, pngStat] = await Promise.all([
    stat(editor.iconPath).catch(() => null),
    stat(pngPath).catch(() => null),
  ])

  const needsRefresh =
    !pngStat ||
    !sourceStat ||
    pngStat.mtimeMs < sourceStat.mtimeMs ||
    pngStat.size === 0

  if (needsRefresh) {
    await renderIconPng(editor.iconPath, pngPath)
  }

  return pngPath
}

async function getDetectedMacApps() {
  const apps = new Map<string, DetectedEditor>()
  const allowedNames = new Set<string>(CODE_EDITOR_APP_NAMES)

  for (const appsDir of getMacApplicationsDirs()) {
    if (!existsSync(appsDir)) continue

    for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.endsWith('.app')) continue

      const appName = entry.name.replace(/\.app$/i, '')
      if (!allowedNames.has(appName)) continue

      const appPath = path.join(appsDir, entry.name)
      const id = slugifyAppName(appName)

      if (!apps.has(id)) {
        apps.set(id, {
          id,
          name: appName,
          appName,
          appPath,
          kind: 'mac-app',
          iconPath: await resolveAppIconPath(appPath),
        })
      }
    }
  }

  return Array.from(apps.values()).sort((left, right) => {
    const leftPriority = CODE_EDITOR_APP_NAMES.indexOf(
      left.name as (typeof CODE_EDITOR_APP_NAMES)[number],
    )
    const rightPriority = CODE_EDITOR_APP_NAMES.indexOf(
      right.name as (typeof CODE_EDITOR_APP_NAMES)[number],
    )

    if (leftPriority !== -1 || rightPriority !== -1) {
      if (leftPriority === -1) return 1
      if (rightPriority === -1) return -1
      return leftPriority - rightPriority
    }

    return left.name.localeCompare(right.name)
  })
}

export async function getDetectedEditors(workspaceId?: string) {
  const [macApps, moldableCodeEditor] = await Promise.all([
    getDetectedMacApps(),
    getDetectedMoldableCodeEditor(workspaceId),
  ])

  if (!moldableCodeEditor) return macApps

  const cursorIndex = macApps.findIndex((editor) => editor.id === 'cursor')
  if (cursorIndex === -1) return [...macApps, moldableCodeEditor]

  return [
    ...macApps.slice(0, cursorIndex + 1),
    moldableCodeEditor,
    ...macApps.slice(cursorIndex + 1),
  ]
}

export async function setPreferredEditor(
  editorId: string,
  workspaceId?: string,
) {
  const settings = await getSettings(workspaceId)
  settings.preferredEditorId = editorId
  await saveSettings(settings, workspaceId)
  return { ok: true, preferredEditorId: editorId }
}

export async function setPreferredCommitAction(
  preferredCommitAction: PreferredCommitAction,
  workspaceId?: string,
  repoPath?: string,
) {
  const settings = await getSettings(workspaceId)

  if (repoPath) {
    const existing = settings.repoPreferences[repoPath] ?? {}
    settings.repoPreferences = {
      ...settings.repoPreferences,
      [repoPath]: { ...existing, preferredCommitAction },
    }
  } else {
    settings.preferredCommitAction = preferredCommitAction
  }

  await saveSettings(settings, workspaceId)
  return { ok: true, preferredCommitAction, repoPath: repoPath ?? null }
}

export async function openFileInEditor(
  relativeFilePath: string,
  editorId?: string,
  workspaceId?: string,
) {
  const settings = await getSettings(workspaceId)
  const repoPath = requireRepoPath(
    resolveRepoPath(undefined, settings.currentRepoPath),
  )
  const fullPath = path.resolve(repoPath, relativeFilePath)

  if (
    !fullPath.startsWith(path.resolve(repoPath) + path.sep) &&
    fullPath !== path.resolve(repoPath)
  ) {
    throw new Error('File must be inside the current repository.')
  }

  const editors = await getDetectedEditors(workspaceId)
  const selectedEditor = editorId
    ? editors.find((editor) => editor.id === editorId)
    : editors[0]

  if (!selectedEditor) {
    throw new Error(
      'No supported external editor was detected on this machine.',
    )
  }

  if (selectedEditor.kind === 'moldable-app') {
    throw new Error('Moldable app editors must be opened from the desktop.')
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn('open', ['-a', selectedEditor.appPath, fullPath], {
      cwd: repoPath,
      env: getSafeChildEnv(),
      detached: true,
      stdio: 'ignore',
    })

    child.on('error', reject)
    child.unref()
    resolve()
  })

  return {
    ok: true,
    editor: selectedEditor,
    path: fullPath,
  }
}
