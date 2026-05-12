interface MoldableAppCallOptions {
  scopes?: string[]
  timeoutMs?: number
  requestAccess?: boolean
}

interface MoldableAppCallResult<T> {
  type: 'moldable:app-call-result'
  requestId: string
  ok: boolean
  result?: T
  error?: {
    code?: string
    message?: string
    detail?: unknown
  }
}

function requestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `app-call-${crypto.randomUUID()}`
  }

  return `app-call-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function callMoldableApp<T>(
  targetAppId: string,
  method: string,
  params?: unknown,
  options: MoldableAppCallOptions = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (window.parent === window) {
      reject(new Error('App-to-app calls are only available inside Moldable.'))
      return
    }

    const id = requestId()
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', handleResponse)
      reject(new Error('App-to-app call timed out.'))
    }, options.timeoutMs ?? 30_000)

    function handleResponse(event: MessageEvent) {
      if (event.data?.type !== 'moldable:app-call-result') return
      if (event.data?.requestId !== id) return

      window.clearTimeout(timeout)
      window.removeEventListener('message', handleResponse)

      const response = event.data as MoldableAppCallResult<T>
      if (response.ok) {
        resolve(response.result as T)
        return
      }

      const error = new Error(
        response.error?.message ||
          response.error?.code ||
          'App-to-app call failed.',
      ) as Error & { code?: string }
      error.code = response.error?.code
      reject(error)
    }

    window.addEventListener('message', handleResponse)
    window.parent.postMessage(
      {
        type: 'moldable:app-call',
        requestId: id,
        targetAppId,
        method,
        params,
        scopes: options.scopes ?? [method],
        requestAccess: options.requestAccess ?? true,
      },
      '*',
    )
  })
}
