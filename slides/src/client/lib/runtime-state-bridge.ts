import { type RefObject, useLayoutEffect } from 'react'
import {
  MAX_RUNTIME_STATE_BYTES,
  RUNTIME_STATE_PROTOCOL_VERSION,
  RUNTIME_STATE_REQUEST,
  RUNTIME_STATE_RESPONSE,
  type RuntimeStateRequest,
  type RuntimeStateResponse,
  isValidRuntimeStateNamespace,
} from '../../shared/runtime-state'

interface RuntimeStateBridgeOptions {
  frameRef: RefObject<HTMLIFrameElement | null>
  workspaceId?: string
  artifactId: string
  clientHeader: string
  enabled?: boolean
}

function isRuntimeStateRequest(value: unknown): value is RuntimeStateRequest {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<RuntimeStateRequest>
  return (
    request.type === RUNTIME_STATE_REQUEST &&
    request.version === RUNTIME_STATE_PROTOCOL_VERSION &&
    typeof request.requestId === 'string' &&
    request.requestId.length > 0 &&
    request.requestId.length <= 128 &&
    typeof request.namespace === 'string' &&
    isValidRuntimeStateNamespace(request.namespace) &&
    (request.operation === 'get' ||
      request.operation === 'set' ||
      request.operation === 'delete')
  )
}

async function responseError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    error?: unknown
  } | null
  return typeof body?.error === 'string'
    ? body.error
    : `Runtime state request failed (${response.status})`
}

async function runRequest(
  request: RuntimeStateRequest,
  workspaceId: string,
  artifactId: string,
  clientHeader: string,
): Promise<RuntimeStateResponse> {
  try {
    const url = `/api/runtime-state/${encodeURIComponent(workspaceId)}/${encodeURIComponent(artifactId)}/${encodeURIComponent(request.namespace)}`
    if (request.operation === 'get') {
      const response = await fetch(url)
      if (!response.ok) throw new Error(await responseError(response))
      const body = (await response.json()) as { value?: unknown }
      return {
        type: RUNTIME_STATE_RESPONSE,
        version: RUNTIME_STATE_PROTOCOL_VERSION,
        requestId: request.requestId,
        ok: true,
        value: body.value ?? null,
      }
    }

    const init: RequestInit = {
      method: request.operation === 'set' ? 'PUT' : 'DELETE',
      headers: { [clientHeader]: '1' },
    }
    if (request.operation === 'set') {
      const body = JSON.stringify({ value: request.value })
      if (new TextEncoder().encode(body).byteLength > MAX_RUNTIME_STATE_BYTES) {
        throw new Error('Runtime state exceeds the 512 KB limit')
      }
      init.headers = {
        ...init.headers,
        'Content-Type': 'application/json',
      }
      init.body = body
    }

    const response = await fetch(url, init)
    if (!response.ok) throw new Error(await responseError(response))
    return {
      type: RUNTIME_STATE_RESPONSE,
      version: RUNTIME_STATE_PROTOCOL_VERSION,
      requestId: request.requestId,
      ok: true,
      value: request.operation === 'set' ? request.value : null,
    }
  } catch (error) {
    return {
      type: RUNTIME_STATE_RESPONSE,
      version: RUNTIME_STATE_PROTOCOL_VERSION,
      requestId: request.requestId,
      ok: false,
      error:
        error instanceof Error ? error.message : 'Runtime state request failed',
    }
  }
}

/**
 * Owns durable state for an opaque-origin artifact iframe. Source-window
 * identity is the trust boundary because sandboxed iframe messages have a
 * deliberately opaque (`null`) origin.
 */
export function useRuntimeStateBridge({
  frameRef,
  workspaceId = 'default',
  artifactId,
  clientHeader,
  enabled = true,
}: RuntimeStateBridgeOptions): void {
  useLayoutEffect(() => {
    if (!enabled) return

    const handleMessage = (event: MessageEvent<unknown>) => {
      const frameWindow = frameRef.current?.contentWindow
      if (!frameWindow || event.source !== frameWindow) return
      if (!isRuntimeStateRequest(event.data)) return

      const request = event.data
      void runRequest(request, workspaceId, artifactId, clientHeader).then(
        (response) => frameWindow.postMessage(response, '*'),
      )
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [artifactId, clientHeader, enabled, frameRef, workspaceId])
}
