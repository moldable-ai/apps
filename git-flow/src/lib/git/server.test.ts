import { commitAllFiles } from './server'
import { execFile } from 'child_process'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import { promisify } from 'util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const tempDirs: string[] = []

async function git(cwd: string, args: string[]) {
  return execFileAsync('git', args, { cwd })
}

async function createRepo() {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), 'git-flow-'))
  tempDirs.push(repoPath)

  await git(repoPath, ['init', '--template='])
  await git(repoPath, ['config', 'user.email', 'git-flow-test@example.com'])
  await git(repoPath, ['config', 'user.name', 'Git Flow Test'])
  await git(repoPath, ['config', 'commit.gpgsign', 'false'])

  await writeFile(path.join(repoPath, 'tracked.txt'), 'initial\n')
  await git(repoPath, ['add', 'tracked.txt'])
  await git(repoPath, ['commit', '-m', 'initial'])

  return repoPath
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true })),
  )
})

describe('commitAllFiles', () => {
  it('stages current changes without using stale generated pathspecs', async () => {
    const repoPath = await createRepo()

    await writeFile(path.join(repoPath, 'current.txt'), 'current\n')

    await commitAllFiles(
      ['src/components/ui/card.tsx'],
      'test: commit current changes',
      '',
      undefined,
      repoPath,
    )

    const { stdout } = await git(repoPath, [
      'show',
      '--name-only',
      '--format=',
      'HEAD',
    ])

    expect(stdout.trim().split(/\r?\n/)).toEqual(['current.txt'])
  })
})
