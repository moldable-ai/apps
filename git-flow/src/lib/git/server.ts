import { getAppDataDir, readJson, writeJson } from '@moldable-ai/storage'
import { execFile, spawn } from 'child_process'
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

const SettingsSchema = z.object({
  currentRepoPath: z.string(),
  recentRepos: z.array(RepoEntrySchema),
  preferredEditorId: z.string().optional(),
  preferredCommitAction: z.enum(['commit', 'commit-and-push']).optional(),
})

type Settings = z.infer<typeof SettingsSchema>

const DEFAULT_SETTINGS: Settings = {
  currentRepoPath: '/Users/rob/moldable',
  recentRepos: [{ name: 'moldable', path: '/Users/rob/moldable' }],
  preferredEditorId: undefined,
  preferredCommitAction: 'commit',
}

const MAX_GIT_OUTPUT_CHARS = 16000

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
  const pathToUse = repoPath || settings.currentRepoPath
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

  try {
    // 1. Stage only the selected files
    await runGit(['add', '--', ...paths], settings.currentRepoPath)

    // 2. Commit with summary and description
    const commitArgs = ['commit', '-m', summary]
    if (description) {
      commitArgs.push('-m', description)
    }
    await runGit(commitArgs, settings.currentRepoPath)
    const result = await runGit(['rev-parse', 'HEAD'], settings.currentRepoPath)

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
  const repoPath = settings.currentRepoPath
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
  const g = simpleGit(settings.currentRepoPath)

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

export async function getHistory(repoPath?: string, workspaceId?: string) {
  const settings = await getSettings(workspaceId)
  const pathToUse = repoPath || settings.currentRepoPath
  const g = simpleGit(pathToUse)

  try {
    const [log, status] = await Promise.all([
      g.log({ maxCount: 50 }),
      g.revparse(['--abbrev-ref', '@{u}']).catch(() => null),
    ])

    let unpushedHashes: string[] = []
    if (status) {
      // Get hashes that are in local but not in remote
      const ahead = await g.log(['@{u}..HEAD'])
      unpushedHashes = ahead.all.map((c) => c.hash)
    } else {
      // If no upstream, consider all commits as "unpushed" for visibility
      unpushedHashes = log.all.map((c) => c.hash)
    }

    return log.all.map((commit) => ({
      ...commit,
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
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = repoPath || settings.currentRepoPath
  const g = simpleGit(pathToUse)

  try {
    // Show stats and the diff for the specific commit
    return await g.show([hash])
  } catch (error) {
    console.error('Git show error:', error)
    return 'Failed to load commit diff'
  }
}

export async function getDiff(
  repoPath?: string,
  filePath?: string,
  workspaceId?: string,
) {
  const settings = await getSettings(workspaceId)
  const pathToUse = repoPath || settings.currentRepoPath
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
  const repoPath = settings.currentRepoPath
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
  const repoPath = settings.currentRepoPath
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
  const repoPath = settings.currentRepoPath
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
