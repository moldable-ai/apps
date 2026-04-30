import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type AivaultSecretMeta = {
  name: string
  secretId?: string
  secret_id?: string
  revokedAtMs?: number | null
  revoked_at_ms?: number | null
}

export type AivaultCredentialMeta = {
  id: string
  provider: string
  workspaceId?: string | null
  workspace_id?: string | null
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
    process.env.AIVAULT_GROUP_ID?.trim()

  return groupId
    ? ['--workspace-id', id, '--group-id', groupId]
    : ['--workspace-id', id]
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

async function runAivaultJson<T>(args: string[]): Promise<T> {
  const output = await runAivault(args)
  return JSON.parse(output.toString('utf8')) as T
}

export async function listWorkspaceSecrets(
  workspaceId: string,
): Promise<AivaultSecretMeta[]> {
  return runAivaultJson<AivaultSecretMeta[]>([
    'secrets',
    'list',
    '--verbose',
    '--scope',
    'workspace',
    ...aivaultContextArgs(workspaceId),
  ])
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
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'moldable-db-browser-secret-'))
  const valueFile = join(dir, 'secret.txt')

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
      return existingId
    }

    const created = await runAivaultJson<{
      secretId?: string
      secret_id?: string
    }>([
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
    const createdId = created.secretId ?? created.secret_id
    if (!createdId) {
      throw new Error('aivault did not return a created secret id')
    }
    return createdId
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

export async function listCredentials(): Promise<AivaultCredentialMeta[]> {
  const output = await runAivaultJson<
    AivaultCredentialMeta[] | { credentials?: AivaultCredentialMeta[] }
  >(['credential', 'list', '--verbose'])

  return Array.isArray(output) ? output : (output.credentials ?? [])
}

export async function deleteCredential(id: string): Promise<void> {
  await runAivault(['credential', 'delete', id])
}

export async function deleteCredentialIfExists(id: string): Promise<void> {
  const credentials = await listCredentials()
  if (!credentials.some((credential) => credential.id === id)) return
  await deleteCredential(id)
}

export async function upsertPostgresCredential({
  workspaceId,
  credentialId,
  secretName,
  connectionUrl,
  host,
  port,
}: {
  workspaceId: string
  credentialId: string
  secretName: string
  connectionUrl: string
  host: string
  port: number
}): Promise<void> {
  const secretIdValue = await upsertWorkspaceSecret(
    workspaceId,
    secretName,
    JSON.stringify({ url: connectionUrl }),
  )

  await deleteCredentialIfExists(credentialId)
  await runAivault([
    'credential',
    'create',
    credentialId,
    '--provider',
    'postgres',
    '--secret-ref',
    `vault:secret:${secretIdValue}`,
    '--auth',
    'header',
    '--header-name',
    'x-aivault-postgres',
    '--value-template',
    '{{secret}}',
    ...aivaultContextArgs(workspaceId),
    '--host',
    `${host}:${port}`,
  ])
}

export async function invokePostgresCapability<T>(
  workspaceId: string,
  credentialId: string,
  capability: string,
  body: Record<string, unknown>,
): Promise<T> {
  const payload = await runAivaultJson<{
    response?: { json?: { result?: T } }
  }>([
    'json',
    capability,
    '--credential',
    credentialId,
    ...aivaultContextArgs(workspaceId),
    '--method',
    'POST',
    '--path',
    '/',
    '--body',
    JSON.stringify(body),
  ])

  const result = payload.response?.json?.result
  if (result === undefined) {
    throw new Error(`aivault ${capability} response did not include a result`)
  }
  return result
}
