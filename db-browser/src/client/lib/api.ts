type FetchWithWorkspace = (
  input: string,
  init?: RequestInit,
) => Promise<Response>

export async function apiJson<T>(
  fetchWithWorkspace: FetchWithWorkspace,
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchWithWorkspace(input, init)

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`

    try {
      const body = (await response.json()) as { error?: unknown }
      if (typeof body.error === 'string' && body.error.trim()) {
        message = body.error
      }
    } catch {
      // Ignore JSON parsing failures and fall back to the status message.
    }

    throw new Error(message)
  }

  return (await response.json()) as T
}
