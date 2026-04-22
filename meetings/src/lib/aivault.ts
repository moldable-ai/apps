import { spawn } from 'node:child_process'

type AivaultBody = string | Record<string, unknown> | unknown[]

type AivaultRequest = {
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: AivaultBody
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

function getAivaultEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of AIVAULT_ENV_KEYS) {
    const value = process.env[key]
    if (value) env[key] = value
  }
  return env
}

function buildArgs(
  mode: 'invoke' | 'json',
  capability: string,
  request: AivaultRequest,
): string[] {
  const args = [mode, capability]
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
  return args
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

export async function invokeAivaultJson<T>(
  capability: string,
  request: AivaultRequest,
): Promise<T> {
  const output = await runAivault(buildArgs('json', capability, request))
  const parsed = JSON.parse(output.toString('utf8')) as {
    response?: { json?: unknown }
  }
  return (parsed.response?.json ?? parsed) as T
}

export async function invokeAivaultJsonWithStatus<T>(
  capability: string,
  request: AivaultRequest,
): Promise<{ json: T; status: number | null }> {
  const output = await runAivault(buildArgs('json', capability, request))
  const parsed = JSON.parse(output.toString('utf8')) as {
    response?: { json?: unknown; status?: number }
  }

  return {
    json: (parsed.response?.json ?? parsed) as T,
    status:
      typeof parsed.response?.status === 'number'
        ? parsed.response.status
        : null,
  }
}
