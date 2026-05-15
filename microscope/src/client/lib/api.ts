export async function parseJson<T>(response: Response, fallback: string) {
  const json = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null

  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json && json.error
        ? json.error
        : fallback
    throw new Error(message)
  }

  return json as T
}
