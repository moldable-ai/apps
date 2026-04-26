import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

type AivaultBody = string | Record<string, unknown> | unknown[]

type AivaultRequest = {
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: AivaultBody
}

export type AivaultSecretMeta = {
  name: string
  secretId?: string
  secret_id?: string
  revokedAtMs?: number | null
  revoked_at_ms?: number | null
}

const AIVAULT_ENV_KEYS = [
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
] as const

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
  const env: NodeJS.ProcessEnv = {}
  for (const key of AIVAULT_ENV_KEYS) {
    const value = process.env[key]
    if (value) env[key] = value
  }
  return env
}

function runAivault(args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn('aivault', args, {
      env: getAivaultEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout))
        return
      }

      const stderrText = Buffer.concat(stderr).toString('utf8').trim()
      const stdoutText = Buffer.concat(stdout).toString('utf8').trim()
      const message =
        stderrText ||
        `aivault ${args.slice(0, 2).join(' ')} exited with code ${code}`
      const error = new Error(message) as Error & {
        status?: number
        response?: { stdout?: string; stderr?: string; args?: string[] }
      }
      error.status = code ?? undefined
      error.response = { stdout: stdoutText, stderr: stderrText, args }
      reject(error)
    })
  })
}

export async function listWorkspaceSecrets(
  workspaceId: string,
): Promise<AivaultSecretMeta[]> {
  const output = await runAivault([
    'secrets',
    'list',
    '--verbose',
    '--scope',
    'workspace',
    ...aivaultContextArgs(workspaceId),
  ])
  return JSON.parse(output.toString('utf8')) as AivaultSecretMeta[]
}

export function secretId(meta: AivaultSecretMeta): string | null {
  return meta.secretId ?? meta.secret_id ?? null
}

function isActive(meta: AivaultSecretMeta) {
  return !(meta.revokedAtMs ?? meta.revoked_at_ms)
}

export async function findWorkspaceSecret(
  workspaceId: string,
  name: string,
): Promise<AivaultSecretMeta | null> {
  const secrets = await listWorkspaceSecrets(workspaceId)
  return (
    secrets.find((secret) => secret.name === name && isActive(secret)) ?? null
  )
}

export async function upsertWorkspaceSecret(
  workspaceId: string,
  name: string,
  value: string,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'moldable-gmail-token-'))
  const valueFile = join(dir, 'secret.json')

  try {
    await writeFile(valueFile, value, { mode: 0o600 })
    const existing = await findWorkspaceSecret(workspaceId, name)
    const existingId = existing ? secretId(existing) : null

    if (existingId) {
      await runAivault([
        'secrets',
        'rotate',
        '--id',
        existingId,
        '--value-file',
        valueFile,
      ])
      return
    }

    await runAivault([
      'secrets',
      'create',
      '--name',
      name,
      '--value-file',
      valueFile,
      '--scope',
      'workspace',
      ...aivaultContextArgs(workspaceId),
    ])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function deleteWorkspaceSecret(
  workspaceId: string,
  name: string,
): Promise<void> {
  const existing = await findWorkspaceSecret(workspaceId, name)
  const existingId = existing ? secretId(existing) : null
  if (!existingId) return
  await runAivault(['secrets', 'delete', '--id', existingId])
}

export async function invokeAivaultJson<T>(
  workspaceId: string,
  capability: string,
  request: AivaultRequest,
): Promise<T> {
  const args = ['json', capability, ...aivaultContextArgs(workspaceId)]
  if (request.method) args.push('--method', request.method)
  if (request.path) args.push('--path', request.path)
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    args.push('--header', `${name}=${value}`)
  }
  if (request.body !== undefined) {
    args.push(
      '--body',
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body),
    )
  }

  const output = await runAivault(args)
  const rawOutput = output.toString('utf8')
  let parsed: { response?: { json?: unknown; status?: number } }
  try {
    parsed = JSON.parse(rawOutput) as {
      response?: { json?: unknown; status?: number }
    }
  } catch (parseError) {
    const error = new Error(
      `aivault ${capability} returned non-JSON output`,
    ) as Error & {
      cause?: unknown
      response?: { stdout?: string; args?: string[]; request?: AivaultRequest }
    }
    error.cause = parseError
    error.response = { stdout: rawOutput, args, request }
    throw error
  }

  if (parsed.response?.status && parsed.response.status >= 400) {
    const body = parsed.response.json as
      | {
          error?: { message?: string; code?: number | string }
          message?: string
        }
      | undefined
    const message =
      body?.error?.message ??
      body?.message ??
      `${capability} returned HTTP ${parsed.response.status}`
    const error = new Error(message) as Error & {
      status?: number
      response?: { status?: number; json?: unknown }
      code?: number | string
    }
    error.status = parsed.response.status
    error.response = parsed.response
    error.code = body?.error?.code
    throw error
  }

  return (parsed.response?.json ?? parsed) as T
}

export async function invokeAivaultRaw(
  workspaceId: string,
  capability: string,
  request: AivaultRequest,
): Promise<Buffer> {
  const args = ['invoke', capability, ...aivaultContextArgs(workspaceId)]
  if (request.method) args.push('--method', request.method)
  if (request.path) args.push('--path', request.path)
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    args.push('--header', `${name}=${value}`)
  }
  if (request.body !== undefined) {
    args.push(
      '--body',
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body),
    )
  }

  return runAivault(args)
}
