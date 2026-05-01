import { getAppDataDir, readJson, writeJson } from '@moldable-ai/storage'
import { execFile, spawn } from 'child_process'
import { createHash } from 'crypto'
import { accessSync, constants, existsSync, readdirSync } from 'fs'
import {
  appendFile,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
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

const SettingsSchema = z.object({
  currentRepoPath: z.string().default(''),
  recentRepos: z.array(RepoEntrySchema).default([]),
  preferredEditorId: z.string().optional(),
  preferredCommitAction: z.enum(['commit', 'commit-and-push']).optional(),
})

type Settings = z.infer<typeof SettingsSchema>

const DEFAULT_SETTINGS: Settings = {
  currentRepoPath: '',
  recentRepos: [],
  preferredEditorId: undefined,
  preferredCommitAction: 'commit',
}

const MAX_GIT_OUTPUT_CHARS = 16000
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

function formatGitFailure(args: string[], stdout: string, stderr: string) {
  const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n\n')
  const prefix = `git ${args.join(' ')} failed`
  return output ? `${prefix}\n\n${output}` : prefix
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

    child.stdin.end()

    child.stdout.on('data', (chunk: Buffer) => {
      byteLength += chunk.byteLength
      if (byteLength > MAX_IMAGE_PREVIEW_BYTES) {
        child.kill()
        reject(new Error('Image preview is too large.'))
        return
      }
      chunks.push(chunk)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr = appendCappedOutput(stderr, chunk.toString('utf8'))
    })

    child.on('error', reject)
    child.on('close', (code, signal) => {
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

async function getGithubRemote(g: ReturnType<typeof simpleGit>) {
  const remoteUrl = await g
    .raw(['remote', 'get-url', 'origin'])
    .catch(() => undefined)
  return remoteUrl ? parseGithubRemoteUrl(remoteUrl) : undefined
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

function requireRepoPath(repoPath?: string | null) {
  if (!repoPath) {
    throw new Error('No repository selected.')
  }

  return repoPath
}

async function runGit(args: string[], cwd: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn('git', args, {
      cwd,
      env: getGitHookEnv() as NodeJS.ProcessEnv,
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    child.stdin.end()

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = appendCappedOutput(stdout, chunk.toString('utf8'))
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr = appendCappedOutput(stderr, chunk.toString('utf8'))
    })

    child.on('error', reject)
    child.on('close', (code, signal) => {
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
  const dataDir = getAppDataDir(workspaceId)
  const configPath = path.join(dataDir, 'settings.json')
  try {
    const raw = await readJson(configPath, DEFAULT_SETTINGS)
    return SettingsSchema.parse(raw)
  } catch {
    return DEFAULT_SETTINGS
  }
}

async function saveSettings(settings: Settings, workspaceId?: string) {
  const dataDir = getAppDataDir(workspaceId)
  const configPath = path.join(dataDir, 'settings.json')
  await writeJson(configPath, settings)
}

export async function getRecentRepos(workspaceId?: string) {
  const settings = await getSettings(workspaceId)

  const repos = await Promise.all(
    settings.recentRepos.map(async (repo) => {
      try {
        const status = await simpleGit(repo.path).status()
        return {
          ...repo,
          isDirty: !status.isClean(),
        }
      } catch {
        return {
          ...repo,
          isDirty: false,
        }
      }
    }),
  )

  return repos
}

export async function addRepo(repoPath: string, workspaceId?: string) {
  const settings = await getSettings(workspaceId)
  const normalizedPath = path.resolve(repoPath.replace(/^~/, os.homedir()))

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

    return {
      currentBranch: branchView.current,
      branches: branchView.all,
      files: status.files,
      isClean: status.isClean(),
      repoName: path.basename(pathToUse),
      repoPath: pathToUse,
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

export async function commitFiles(
  paths: string[],
  summary: string,
  description: string,
  workspaceId?: string,
) {
  const settings = await getSettings(workspaceId)
  const repoPath = requireRepoPath(
    resolveRepoPath(undefined, settings.currentRepoPath),
  )

  try {
    // 1. Stage only the selected files
    await runGit(['add', '--', ...paths], repoPath)

    // 2. Commit with summary and description
    const commitArgs = ['commit', '-m', summary]
    if (description) {
      commitArgs.push('-m', description)
    }
    await runGit(commitArgs, repoPath)
    const result = await runGit(['rev-parse', 'HEAD'], repoPath)

    return { success: true, commit: result.stdout.trim() }
  } catch (err) {
    console.error('Git commit error:', err)
    // Return the specific error message (e.g. from pre-commit hooks)
    const message = err instanceof Error ? err.message : 'Git commit failed'
    throw new Error(message)
  }
}

export async function pushCommits(workspaceId?: string) {
  const settings = await getSettings(workspaceId)
  const repoPath = requireRepoPath(
    resolveRepoPath(undefined, settings.currentRepoPath),
  )
  const g = simpleGit(repoPath)

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
      const result = await g.push()
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
      repoPath,
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
    if (filePath) {
      return await g.show([
        '--format=',
        '--no-ext-diff',
        '--find-renames',
        hash,
        '--',
        filePath,
      ])
    }

    // Show stats and the diff for the specific commit
    return await g.show([hash])
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
    const output = await g.raw([
      'diff-tree',
      '--no-commit-id',
      '--name-status',
      '-r',
      '-M',
      '--root',
      hash,
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

  if (options.hash) {
    const treeish = isDeletedStatus(options.status)
      ? `${options.hash}^:${gitPath}`
      : `${options.hash}:${gitPath}`
    const buffer = await runGitBuffer(['show', treeish], pathToUse)
    return { buffer, mimeType }
  }

  const resolvedFilePath = resolveRepoFilePath(pathToUse, filePath)
  if (existsSync(resolvedFilePath) && !isDeletedStatus(options.status)) {
    const imageStat = await stat(resolvedFilePath)
    if (imageStat.size > MAX_IMAGE_PREVIEW_BYTES) {
      throw new Error('Image preview is too large.')
    }
    return { buffer: await readFile(resolvedFilePath), mimeType }
  }

  const buffer = await runGitBuffer(['show', `HEAD:${gitPath}`], pathToUse)
  return { buffer, mimeType }
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
      // For untracked files, we generate a synthetic diff
      try {
        const fs = await import('fs')
        const fullPath = path.join(pathToUse, filePath)
        if (fs.existsSync(fullPath)) {
          const fileContent = fs.readFileSync(fullPath, 'utf8')
          const lines = fileContent.split('\n')
          untrackedDiff = lines.map((line: string) => `+${line}`).join('\n')
          untrackedDiff = `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n${untrackedDiff}`
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

export async function getDiffForFiles(paths: string[], workspaceId?: string) {
  const uniquePaths = Array.from(new Set(paths)).filter(Boolean)
  const diffs = await Promise.all(
    uniquePaths.map(async (filePath) => {
      const diff = await getDiff(undefined, filePath, workspaceId)
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
  const pathsToDiscard = uniqueRepoRelativePaths(repoPath, paths)

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

function isExecutableFile(filePath: string) {
  try {
    accessSync(filePath, constants.X_OK)
    return true
  } catch {
    return false
  }
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

  const iconsDir = path.join(getAppDataDir(workspaceId), 'editor-icons-v2')
  await mkdir(iconsDir, { recursive: true })

  const pngPath = path.join(iconsDir, `${editor.id}.png`)

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
  preferredCommitAction: 'commit' | 'commit-and-push',
  workspaceId?: string,
) {
  const settings = await getSettings(workspaceId)
  settings.preferredCommitAction = preferredCommitAction
  await saveSettings(settings, workspaceId)
  return { ok: true, preferredCommitAction }
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
