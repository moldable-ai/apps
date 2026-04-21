import { getAppDataDir, readJson, writeJson } from '@moldable-ai/storage'
import { spawn } from 'child_process'
import {
  accessSync,
  constants,
  existsSync,
  readFileSync,
  readdirSync,
} from 'fs'
import { mkdir, stat } from 'fs/promises'
import os from 'os'
import path from 'path'
import { simpleGit } from 'simple-git'
import { z } from 'zod'

const RepoEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirty: z.boolean().optional(),
})

const SettingsSchema = z.object({
  currentRepoPath: z.string(),
  recentRepos: z.array(RepoEntrySchema),
  preferredEditorId: z.string().optional(),
})

type Settings = z.infer<typeof SettingsSchema>

const DEFAULT_SETTINGS: Settings = {
  currentRepoPath: '/Users/rob/moldable',
  recentRepos: [{ name: 'moldable', path: '/Users/rob/moldable' }],
  preferredEditorId: undefined,
}

const MAX_GIT_OUTPUT_CHARS = 16000

const CODE_EDITOR_APP_NAMES = [
  'Cursor',
  'Visual Studio Code',
  'Visual Studio Code - Insiders',
  'Windsurf',
  'Zed',
  'Sublime Text',
  'TextMate',
  'Nova',
  'BBEdit',
  'MacVim',
  'VSCodium',
  'Code - OSS',
  'Xcode',
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

type DetectedEditor = {
  id: string
  name: string
  appName: string
  appPath: string
  iconPath?: string
}

async function runProcess(args: string[], cwd?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      cwd,
      env: process.env,
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
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      env[key] = value
    }
  }

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
  const g = simpleGit(settings.currentRepoPath)
  try {
    const result = await g.push()
    return { success: true, result }
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
  const dirs = ['/Applications']
  const homeApplications = path.join(os.homedir(), 'Applications')

  if (existsSync(homeApplications)) {
    dirs.push(homeApplications)
  }

  return dirs
}

function resolveAppIconPath(appPath: string) {
  try {
    const resourcesDir = path.join(appPath, 'Contents', 'Resources')
    if (!existsSync(resourcesDir)) return undefined

    const appBaseName = path.basename(appPath, '.app')
    const candidates = [`${appBaseName}.icns`, 'AppIcon.icns', 'app.icns']

    for (const candidate of candidates) {
      const iconPath = path.join(resourcesDir, candidate)
      if (existsSync(iconPath)) return iconPath
    }

    const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist')
    if (!existsSync(infoPlistPath)) return undefined

    const plist = readFileSync(infoPlistPath, 'utf8')
    const iconNameMatch = plist.match(
      /<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/,
    )
    const rawIconName = iconNameMatch?.[1]?.trim()
    if (!rawIconName) return undefined

    const iconFileName = rawIconName.endsWith('.icns')
      ? rawIconName
      : `${rawIconName}.icns`
    const iconPath = path.join(resourcesDir, iconFileName)

    return existsSync(iconPath) ? iconPath : undefined
  } catch {
    return undefined
  }
}

export async function getEditorIconPngPath(
  editorId: string,
  workspaceId?: string,
) {
  const editor = getDetectedMacApps().find((item) => item.id === editorId)
  if (!editor?.iconPath) return undefined

  const iconsDir = path.join(getAppDataDir(workspaceId), 'editor-icons')
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
    await runProcess(
      ['sips', '-s', 'format', 'png', editor.iconPath, '--out', pngPath],
      path.dirname(editor.iconPath),
    )
  }

  return pngPath
}

function getDetectedMacApps() {
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
          iconPath: resolveAppIconPath(appPath),
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

export async function getDetectedEditors() {
  return getDetectedMacApps()
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

  const editors = await getDetectedEditors()
  const selectedEditor = editorId
    ? editors.find((editor) => editor.id === editorId)
    : editors[0]

  if (!selectedEditor) {
    throw new Error(
      'No supported external editor was detected on this machine.',
    )
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn('open', ['-a', selectedEditor.appPath, fullPath], {
      cwd: repoPath,
      env: process.env,
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
