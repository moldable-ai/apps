// Thin JSON helpers over fetchWithWorkspace from useWorkspace().

export type Fetcher = (path: string, init?: RequestInit) => Promise<Response>

export async function getJson<T>(fetcher: Fetcher, path: string): Promise<T> {
  const res = await fetcher(path)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return (await res.json()) as T
}

export async function sendJson<T>(
  fetcher: Fetcher,
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetcher(path, {
    method,
    headers:
      body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(
      (detail && typeof detail.error === 'string' && detail.error) ||
        `Request failed: ${res.status}`,
    )
  }
  return (await res.json()) as T
}
