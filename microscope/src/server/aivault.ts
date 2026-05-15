import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

export type AivaultRequest = {
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  multipartFields?: Record<string, string>
  multipartFiles?: Record<string, string>
  timeoutMs?: number
}

function aivaultBinary(): string {
  const explicit = process.env.AIVAULT_BIN?.trim()
  if (explicit) return explicit

  const home = process.env.HOME?.trim()
  const candidates = home
    ? [`${home}/.cargo/bin/aivault`, `${home}/.local/bin/aivault`]
    : []
  return candidates.find((candidate) => existsSync(candidate)) ?? 'aivault'
}

function aivaultContextArgs(workspaceId?: string): string[] {
  const id = workspaceId?.trim()
  if (!id) return []

  const groupId =
    process.env.MOLDABLE_GROUP_ID?.trim() ||
    process.env.AIVAULT_GROUP_ID?.trim() ||
    id

  return ['--workspace-id', id, '--group-id', groupId]
}

function getAivaultEnv(): NodeJS.ProcessEnv {
  const allowed = [
    'AIVAULT_DIR',
    'AIVAULTD_SOCKET',
    'AIVAULTD_SHARED_SOCKET',
    'HOME',
    'LANG',
    'LC_ALL',
    'LC_CTYPE',
    'LOGNAME',
    'PATH',
    'SHELL',
    'TMP',
    'TMPDIR',
    'USER',
  ]
  const env: NodeJS.ProcessEnv = {}
  for (const key of allowed) {
    const value = process.env[key]
    if (value) env[key] = value
  }

  const home = env.HOME
  if (home) {
    env.PATH = [
      [`${home}/.cargo/bin`, `${home}/.local/bin`].join(':'),
      env.PATH,
    ]
      .filter(Boolean)
      .join(':')
  }
  return env
}

function runAivault(
  args: string[],
  options: { timeoutMs?: number } = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(aivaultBinary(), args, {
      env: getAivaultEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let timedOut = false
    let settled = false
    const timeout =
      options.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true
            child.kill('SIGTERM')
          }, options.timeoutMs)
        : null

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', (error) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      if (timeout) clearTimeout(timeout)

      if (timedOut) {
        reject(new Error(`aivault timed out after ${options.timeoutMs}ms`))
        return
      }
      if (code === 0) {
        resolve(Buffer.concat(stdout))
        return
      }

      const message = Buffer.concat(stderr).toString('utf8').trim()
      reject(
        new Error(
          message ||
            `aivault ${args.slice(0, 2).join(' ')} exited with code ${code}`,
        ),
      )
    })
  })
}

function addRequestArgs(args: string[], request: AivaultRequest): void {
  if (request.method) args.push('--method', request.method)
  if (request.path) args.push('--path', request.path)
  if (request.timeoutMs) args.push('--timeout-ms', String(request.timeoutMs))
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    args.push('--header', `${name}=${value}`)
  }
  if (request.body !== undefined) {
    args.push('--body', JSON.stringify(request.body))
  }
  for (const [name, value] of Object.entries(request.multipartFields ?? {})) {
    args.push('--multipart-field', `${name}=${value}`)
  }
  for (const [name, value] of Object.entries(request.multipartFiles ?? {})) {
    args.push('--multipart-file', `${name}=${value}`)
  }
}

export async function invokeAivaultJson<T>(
  workspaceId: string | undefined,
  capabilityId: string,
  request: AivaultRequest,
): Promise<T> {
  const args = ['json', ...aivaultContextArgs(workspaceId)]
  addRequestArgs(args, request)
  args.push(capabilityId)

  const output = await runAivault(args, { timeoutMs: request.timeoutMs })
  const parsed = JSON.parse(output.toString('utf8')) as {
    response?: { json?: unknown; status?: number }
    error?: { message?: string }
  }

  const status = parsed.response?.status
  const json = (parsed.response?.json ?? parsed) as
    | (T & { error?: { message?: string }; message?: string })
    | undefined

  if (status && status >= 400) {
    throw new Error(
      json?.error?.message ??
        json?.message ??
        `${capabilityId} request failed with ${status}`,
    )
  }
  if (!json) throw new Error(`${capabilityId} returned no JSON body`)
  return json as T
}

export async function invokeAivaultStream(
  workspaceId: string | undefined,
  capabilityId: string,
  request: AivaultRequest,
): Promise<Buffer> {
  const args = ['invoke', ...aivaultContextArgs(workspaceId)]
  addRequestArgs(args, request)
  args.push('--stream', capabilityId)
  return runAivault(args, { timeoutMs: request.timeoutMs })
}
