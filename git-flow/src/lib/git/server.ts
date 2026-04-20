import { getAppDataDir, readJson, writeJson } from '@moldable-ai/storage'
import { spawn } from 'child_process'
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
})

type Settings = z.infer<typeof SettingsSchema>

const DEFAULT_SETTINGS: Settings = {
  currentRepoPath: '/Users/rob/moldable',
  recentRepos: [{ name: 'moldable', path: '/Users/rob/moldable' }],
}

const MAX_GIT_OUTPUT_CHARS = 16000

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
