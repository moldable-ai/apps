// Publish a static artifact through the Moldable desktop host.
//
// We talk the host's `moldable:artifact-publish` postMessage protocol directly
// rather than importing `publishMoldableArtifact` from @moldable-ai/ui: the
// helper only exists in newer UI builds, but the app bundles its own UI copy.
// Speaking to the host directly works against any host that supports publishing,
// regardless of the bundled UI version. Files are referenced by absolute
// `sourcePath` on disk — the host reads, hashes, and uploads them.
import { isInMoldable } from './moldable-ui'

export interface ArtifactFile {
  /** Path inside the published artifact, e.g. "index.html" or "assets/x.png". */
  path: string
  contentType?: string
  /** Absolute path on disk that the host reads the bytes from. */
  sourcePath: string
}

export interface PublishArgs {
  kind?: string
  title?: string
  entrypoint?: string
  metadata?: Record<string, string>
  files: ArtifactFile[]
  timeoutMs?: number
}

export interface PublishResult {
  id: string
  slug: string
  url: string
  version: string
}

function requestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `artifact-publish-${crypto.randomUUID()}`
  }
  return `artifact-publish-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function publishArtifact(
  options: PublishArgs,
): Promise<PublishResult> {
  if (!isInMoldable()) {
    throw new Error('Artifact publishing is only available inside Moldable.')
  }

  return new Promise<PublishResult>((resolve, reject) => {
    const id = requestId()
    const timeoutMs = options.timeoutMs ?? 300_000
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      reject(new Error('Artifact publish timed out.'))
    }, timeoutMs)

    function onMessage(event: MessageEvent) {
      const data = event.data as {
        type?: string
        requestId?: string
        ok?: boolean
        result?: PublishResult
        error?: { message?: string }
      }
      if (data?.type !== 'moldable:artifact-publish-result') return
      if (data?.requestId !== id) return
      window.clearTimeout(timeout)
      window.removeEventListener('message', onMessage)
      if (data.ok && data.result) {
        resolve(data.result)
      } else {
        reject(new Error(data.error?.message || 'Artifact publish failed.'))
      }
    }

    window.addEventListener('message', onMessage)
    window.parent.postMessage(
      {
        type: 'moldable:artifact-publish',
        requestId: id,
        kind: options.kind,
        title: options.title,
        entrypoint: options.entrypoint,
        metadata: options.metadata ?? {},
        files: options.files.map((file) => ({
          path: file.path,
          contentType: file.contentType,
          sourcePath: file.sourcePath,
        })),
        requestAccess: true,
      },
      '*',
    )
  })
}
