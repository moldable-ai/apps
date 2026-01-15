import { getAppDataDir, readJson, writeJson } from '@moldable/storage'
import os from 'os'
import path from 'path'
import { simpleGit } from 'simple-git'
import { z } from 'zod'

const RepoEntrySchema = z.object({
  name: z.string(),
  path: z.string(),
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
  return settings.recentRepos
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
  const g = simpleGit(settings.currentRepoPath)

  try {
    // 1. Stage only the selected files
    await g.add(paths)

    // 2. Commit with summary and description
    const message = description ? `${summary}\n\n${description}` : summary
    const result = await g.commit(message)

    return { success: true, commit: result.commit }
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
