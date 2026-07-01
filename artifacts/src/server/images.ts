// AI image generation + editing for artifact assets, via the host image proxy
// (gpt-image). Generated images are saved as deck assets and referenced from
// artifact HTML/CSS with relative `assets/<file>` paths.
import { imageRequest } from './moldable'
import { OperationError } from './operations'
import { assetPath, templateAssetPath, writeAsset } from './store'
import { randomUUID } from 'node:crypto'

const MODEL = 'gpt-image-2'
// 10 min — matches the Images/Redecorate apps. Generation runs ~50s; the old
// 180s was fine for the proxy itself, but generation is now driven from the
// Assets panel (a direct client fetch), which sidesteps the host chat→RPC
// bridge timeout that was cutting chat-initiated generations short.
const TIMEOUT_MS = 600_000

export type ImageSize = 'landscape' | 'portrait' | 'square' | 'auto'

const SIZE_MAP: Record<ImageSize, string> = {
  landscape: '1536x1024',
  portrait: '1024x1536',
  square: '1024x1024',
  auto: 'auto',
}

function resolveSize(size?: string): string {
  if (size && size in SIZE_MAP) return SIZE_MAP[size as ImageSize]
  // allow an explicit WxH passthrough
  if (size && /^\d{3,4}x\d{3,4}$/.test(size)) return size
  return SIZE_MAP.landscape
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string }>
  error?: { message?: string }
}

async function callImages(
  workspaceId: string | undefined,
  request: Parameters<typeof imageRequest>[0],
): Promise<string> {
  const parsed = await imageRequest<OpenAIImageResponse>({
    workspaceId,
    ...request,
  })
  const status = parsed.response?.status
  const json = (parsed.response?.json ?? parsed) as OpenAIImageResponse
  if (status && status >= 400) {
    throw new OperationError(
      'image_failed',
      json?.error?.message ?? `Image request failed (${status})`,
      502,
    )
  }
  const b64 = json.data?.[0]?.b64_json
  if (!b64) {
    throw new OperationError(
      'image_failed',
      json?.error?.message ?? 'The image service returned no image.',
      502,
    )
  }
  return b64
}

function fileNameFor(requested?: string): string {
  if (requested) {
    const clean = requested.replace(/[^A-Za-z0-9._-]/g, '')
    if (clean) return clean.endsWith('.png') ? clean : `${clean}.png`
  }
  return `img-${randomUUID().slice(0, 8)}.png`
}

export interface GenerateImageInput {
  prompt: string
  size?: string
  fileName?: string
  /** A bundled style-preset preview filename — when set, generate via image-to-image
   * off that preview so the preset's medium/texture transfers from real pixels. */
  styleRef?: string
}

export interface ArtifactImageResult {
  path: string
  fileName: string
}

/** Generate an image from a prompt and save it as an artifact asset. */
export async function generateArtifactImage(
  workspaceId: string | undefined,
  artifactId: string,
  input: GenerateImageInput,
): Promise<ArtifactImageResult> {
  if (!input.prompt || !input.prompt.trim()) {
    throw new OperationError('missing_prompt', 'An image prompt is required.')
  }
  // With a style preset active, generate via image-to-image off a real template
  // image (the preset's reference) so its medium/palette/grain transfer from a
  // proven, hand-tuned style — instructing the model to keep only the STYLE,
  // not the reference's subject.
  const styleRefPath = input.styleRef ? templateAssetPath(input.styleRef) : null
  const b64 = styleRefPath
    ? await callImages(workspaceId, {
        method: 'POST',
        path: '/v1/images/edits',
        multipartFields: {
          model: MODEL,
          prompt: `Adopt the artistic style, medium, palette, lighting, and texture of the reference image, but depict a completely new subject (ignore the reference's subject and composition). ${input.prompt}`,
          size: resolveSize(input.size),
          output_format: 'png',
        },
        multipartFiles: { 'image[]': styleRefPath },
        timeoutMs: TIMEOUT_MS,
      })
    : await callImages(workspaceId, {
        method: 'POST',
        path: '/v1/images/generations',
        headers: { 'content-type': 'application/json' },
        body: {
          model: MODEL,
          prompt: input.prompt,
          n: 1,
          size: resolveSize(input.size),
          output_format: 'png',
        },
        timeoutMs: TIMEOUT_MS,
      })
  const fileName = fileNameFor(input.fileName)
  await writeAsset(
    workspaceId,
    artifactId,
    fileName,
    Buffer.from(b64, 'base64'),
  )
  return { path: `assets/${fileName}`, fileName }
}

export interface EditImageInput {
  /** Existing artifact asset to edit (filename or `assets/<file>`). */
  source: string
  prompt: string
  size?: string
  fileName?: string
}

/** Edit/tweak an existing artifact image and save the result as a new asset. */
export async function editArtifactImage(
  workspaceId: string | undefined,
  artifactId: string,
  input: EditImageInput,
): Promise<ArtifactImageResult> {
  if (!input.prompt || !input.prompt.trim()) {
    throw new OperationError('missing_prompt', 'An edit prompt is required.')
  }
  const sourceName = (input.source || '').replace(/^assets\//, '')
  const baseImagePath = assetPath(workspaceId, artifactId, sourceName)
  const b64 = await callImages(workspaceId, {
    method: 'POST',
    path: '/v1/images/edits',
    multipartFields: {
      model: MODEL,
      prompt: input.prompt,
      size: resolveSize(input.size),
      output_format: 'png',
    },
    multipartFiles: { 'image[]': baseImagePath },
    timeoutMs: TIMEOUT_MS,
  })
  const fileName = fileNameFor(input.fileName)
  await writeAsset(
    workspaceId,
    artifactId,
    fileName,
    Buffer.from(b64, 'base64'),
  )
  return { path: `assets/${fileName}`, fileName }
}
