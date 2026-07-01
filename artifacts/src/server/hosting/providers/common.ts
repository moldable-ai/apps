import type { HostingTargetStatus } from '../types'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export function slugifySiteName(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48)
  return slug || fallback
}

export function withQuery(
  path: string,
  params: Record<string, string | undefined>,
) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export async function poll<T>(
  fn: () => Promise<T>,
  done: (value: T) => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 90_000
  const intervalMs = options.intervalMs ?? 2_000
  const startedAt = Date.now()
  let latest = await fn()

  while (!done(latest) && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    latest = await fn()
  }

  return latest
}

export async function zipDirectory(sourceDir: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'moldable-artifacts-zip-'))
  const zipPath = join(tempDir, 'site.zip')

  try {
    await runCommand('zip', ['-qr', zipPath, '.'], sourceDir)
    return zipPath
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true })
    throw error
  }
}

export async function cleanupZip(zipPath: string): Promise<void> {
  await rm(dirname(zipPath), { recursive: true, force: true }).catch(() => {})
}

export function statusFromReadyState(
  value: string | undefined,
): HostingTargetStatus {
  if (value === 'READY' || value === 'ready') return 'ready'
  if (value === 'ERROR' || value === 'error') return 'error'
  return 'deploying'
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    const stderr: Buffer[] = []
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(
        new Error(
          Buffer.concat(stderr).toString('utf8').trim() ||
            `${cmd} exited with code ${code}`,
        ),
      )
    })
  })
}
