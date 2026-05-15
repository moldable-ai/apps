import type { DownloadedModel, ModelAsset } from './types'

export function findFirstValue(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  for (const key of keys) {
    const candidate = record[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate
    if (typeof candidate === 'number') return String(candidate)
  }
  for (const candidate of Object.values(record)) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const nested = findFirstValue(item, keys)
        if (nested) return nested
      }
    } else if (candidate && typeof candidate === 'object') {
      const nested = findFirstValue(candidate, keys)
      if (nested) return nested
    }
  }
  return null
}

function inferExtensionFromUrl(url: string): ModelAsset['extension'] | null {
  if (/\.glb(?:[?#]|$)/i.test(url)) return 'glb'
  if (/\.gltf(?:[?#]|$)/i.test(url)) return 'gltf'
  if (/\.obj(?:[?#]|$)/i.test(url)) return 'obj'
  if (/\.mtl(?:[?#]|$)/i.test(url)) return 'mtl'
  if (/\.png(?:[?#]|$)/i.test(url)) return 'png'
  if (/\.jpe?g(?:[?#]|$)/i.test(url)) {
    return /\.jpeg(?:[?#]|$)/i.test(url) ? 'jpeg' : 'jpg'
  }
  return null
}

export function fileNameForAsset(
  prefix: string,
  extension: ModelAsset['extension'],
) {
  return `${prefix}.${extension === 'jpeg' ? 'jpg' : extension}`
}

export function findModelAssets(raw: unknown): {
  model: ModelAsset
  material?: ModelAsset
  texture?: ModelAsset
} | null {
  const candidates: Array<ModelAsset & { key: string; score: number }> = []

  function collect(value: unknown, key: string) {
    if (!value) return
    if (typeof value === 'string') {
      const extension = inferExtensionFromUrl(value)
      if (extension) {
        candidates.push({
          url: value,
          fileName:
            value.split('/').pop()?.split('?')[0] ??
            fileNameForAsset('asset', extension),
          extension,
          key,
          score:
            extension === 'glb'
              ? 0
              : extension === 'gltf'
                ? 1
                : extension === 'obj'
                  ? 2
                  : 9,
        })
      }
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item) => collect(item, key))
      return
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>
      const url = record.url
      const fileName = String(record.file_name ?? record.fileName ?? '')
      const extension =
        typeof url === 'string' ? inferExtensionFromUrl(fileName || url) : null
      if (typeof url === 'string' && extension) {
        candidates.push({
          url,
          fileName:
            fileName ||
            url.split('/').pop()?.split('?')[0] ||
            fileNameForAsset('asset', extension),
          extension,
          key,
          score:
            extension === 'glb'
              ? 0
              : extension === 'gltf'
                ? 1
                : extension === 'obj'
                  ? 2
                  : 9,
        })
      }
      for (const [childKey, childValue] of Object.entries(record)) {
        collect(childValue, childKey)
      }
    }
  }

  collect(raw, '')
  const model =
    candidates
      .filter((candidate) =>
        ['glb', 'gltf', 'obj'].includes(candidate.extension),
      )
      .sort((a, b) => a.score - b.score)[0] ?? null
  if (!model) return null

  const material =
    candidates.find(
      (candidate) =>
        candidate.extension === 'mtl' ||
        candidate.key.toLowerCase().includes('mtl'),
    ) ?? undefined
  const texture =
    candidates.find(
      (candidate) =>
        ['png', 'jpg', 'jpeg'].includes(candidate.extension) &&
        candidate.key.toLowerCase().includes('texture'),
    ) ?? undefined

  return { model, material, texture }
}

export async function downloadRemoteAsset(
  asset: ModelAsset,
  timeoutMs: number,
): Promise<Buffer> {
  const response = await fetch(asset.url, {
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) {
    throw new Error(`asset download failed with ${response.status}.`)
  }
  return Buffer.from(await response.arrayBuffer())
}

export async function downloadAssets(
  raw: unknown,
  timeoutMs: number,
  providerName: string,
): Promise<DownloadedModel> {
  const assets = findModelAssets(raw)
  if (!assets) {
    throw new Error(
      `${providerName} response did not include a supported model URL.`,
    )
  }

  return {
    model: {
      fileName: fileNameForAsset('model', assets.model.extension),
      buffer: await downloadRemoteAsset(assets.model, timeoutMs),
    },
    material: assets.material
      ? {
          fileName: fileNameForAsset('material', assets.material.extension),
          buffer: await downloadRemoteAsset(assets.material, timeoutMs),
        }
      : undefined,
    texture: assets.texture
      ? {
          fileName: fileNameForAsset('texture', assets.texture.extension),
          buffer: await downloadRemoteAsset(assets.texture, timeoutMs),
        }
      : undefined,
  }
}
