import { ensureDir, getAppDataDir, safePath } from '@moldable-ai/storage'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute } from 'node:path'

const SIPS_PATH = '/usr/bin/sips'
const CONVERSION_TIMEOUT_MS = 30_000

const DIRECT_SOURCE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
])
const DIRECT_SOURCE_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp'])
const CONVERTIBLE_SOURCE_IMAGE_EXTENSIONS = new Set([
  'avif',
  'heic',
  'heif',
  'tif',
  'tiff',
  'gif',
  'bmp',
  'jp2',
  'j2k',
  'jpf',
  'jpx',
])
const CONVERTIBLE_SOURCE_IMAGE_TYPES = new Set([
  'image/avif',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/gif',
  'image/bmp',
  'image/jp2',
  'image/jpx',
])

export const SOURCE_IMAGE_SUPPORT_LABEL =
  'PNG, JPEG, WEBP, AVIF, HEIC, HEIF, TIFF, GIF, BMP, or JPEG 2000'

export class UnsupportedSourceImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedSourceImageError'
  }
}

type NormalizedSourceImage = {
  buffer: Buffer
  extension: string
  mimeType: string
  originalName: string
}

export function fileExtensionForName(name: string): string | null {
  const extension = extname(name).replace(/^\./, '').toLowerCase()
  return /^[a-z0-9]{1,8}$/.test(extension) ? extension : null
}

export function fileExtensionForMime(mimeType: string): string | null {
  switch (mimeType.toLowerCase()) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/avif':
      return 'avif'
    case 'image/gif':
      return 'gif'
    case 'image/tiff':
      return 'tiff'
    case 'image/bmp':
      return 'bmp'
    case 'image/heic':
      return 'heic'
    case 'image/heif':
      return 'heif'
    case 'image/jp2':
    case 'image/jpx':
      return 'jp2'
    case 'image/svg+xml':
      return 'svg'
    default:
      return null
  }
}

export function imageMimeTypeForName(name: string): string | null {
  switch (fileExtensionForName(name)) {
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    case 'gif':
      return 'image/gif'
    case 'tif':
    case 'tiff':
      return 'image/tiff'
    case 'bmp':
      return 'image/bmp'
    case 'heic':
      return 'image/heic'
    case 'heif':
      return 'image/heif'
    case 'jp2':
    case 'j2k':
    case 'jpf':
    case 'jpx':
      return 'image/jp2'
    case 'svg':
      return 'image/svg+xml'
    default:
      return null
  }
}

export function isDirectSourceImageMimeType(mimeType: string): boolean {
  return DIRECT_SOURCE_IMAGE_TYPES.has(mimeType.toLowerCase())
}

export function isDirectSourceImageName(name: string): boolean {
  const extension = fileExtensionForName(name)
  return Boolean(extension && DIRECT_SOURCE_IMAGE_EXTENSIONS.has(extension))
}

export function isSupportedSourceImageMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase()
  return (
    DIRECT_SOURCE_IMAGE_TYPES.has(normalized) ||
    CONVERTIBLE_SOURCE_IMAGE_TYPES.has(normalized)
  )
}

export function isSupportedSourceImageName(name: string): boolean {
  const extension = fileExtensionForName(name)
  return Boolean(
    extension &&
      (DIRECT_SOURCE_IMAGE_EXTENSIONS.has(extension) ||
        CONVERTIBLE_SOURCE_IMAGE_EXTENSIONS.has(extension)),
  )
}

export function supportedSourceImageError(
  name?: string,
): UnsupportedSourceImageError {
  const subject = name?.trim() || 'File'
  return new UnsupportedSourceImageError(
    `${subject} is not a supported source image. Redecorate supports ${SOURCE_IMAGE_SUPPORT_LABEL} source images.`,
  )
}

export async function normalizeUploadedSourceImage({
  workspaceId,
  originalName,
  mimeType,
  buffer,
}: {
  workspaceId?: string
  originalName: string
  mimeType: string
  buffer: Buffer
}): Promise<NormalizedSourceImage> {
  const resolvedMimeType = resolveSourceMimeType(originalName, mimeType)
  if (!resolvedMimeType) throw supportedSourceImageError(originalName)

  if (isDirectSourceImageMimeType(resolvedMimeType)) {
    return {
      buffer,
      extension:
        fileExtensionForMime(resolvedMimeType) ??
        fileExtensionForName(originalName) ??
        'img',
      mimeType: resolvedMimeType,
      originalName,
    }
  }

  const inputExtension =
    fileExtensionForMime(resolvedMimeType) ??
    fileExtensionForName(originalName) ??
    'img'
  const inputPath = await tempConversionPath(workspaceId, inputExtension)
  try {
    await writeFile(inputPath, buffer)
    return await normalizeLocalSourceImage({
      workspaceId,
      sourcePath: inputPath,
      originalName,
      cleanupInput: true,
    })
  } catch (error) {
    await rm(inputPath, { force: true })
    throw error
  }
}

export async function normalizeLocalSourceImage({
  workspaceId,
  sourcePath,
  originalName = basename(sourcePath),
  cleanupInput = false,
}: {
  workspaceId?: string
  sourcePath: string
  originalName?: string
  cleanupInput?: boolean
}): Promise<NormalizedSourceImage> {
  if (!isAbsolute(sourcePath)) {
    throw new Error('Dropped image path must be absolute.')
  }

  const resolvedMimeType = resolveSourceMimeType(originalName)
  if (!resolvedMimeType) throw supportedSourceImageError(originalName)

  if (isDirectSourceImageMimeType(resolvedMimeType)) {
    try {
      return {
        buffer: await readFile(sourcePath),
        extension:
          fileExtensionForMime(resolvedMimeType) ??
          fileExtensionForName(originalName) ??
          'img',
        mimeType: resolvedMimeType,
        originalName,
      }
    } finally {
      if (cleanupInput) await rm(sourcePath, { force: true })
    }
  }

  const outputPath = await tempConversionPath(workspaceId, 'png')
  try {
    await convertLocalImageToPng(sourcePath, outputPath)
    return {
      buffer: await readFile(outputPath),
      extension: 'png',
      mimeType: 'image/png',
      originalName,
    }
  } catch (error) {
    throw conversionError(originalName, error)
  } finally {
    await rm(outputPath, { force: true })
    if (cleanupInput) await rm(sourcePath, { force: true })
  }
}

function resolveSourceMimeType(name: string, mimeType?: string): string | null {
  const normalized = mimeType?.toLowerCase()
  if (normalized && isSupportedSourceImageMimeType(normalized)) {
    return normalized
  }
  const fromName = imageMimeTypeForName(name)
  return fromName && isSupportedSourceImageMimeType(fromName) ? fromName : null
}

async function tempConversionPath(
  workspaceId: string | undefined,
  extension: string,
): Promise<string> {
  const dir = safePath(getAppDataDir(workspaceId), 'tmp', 'image-conversions')
  await ensureDir(dir)
  return safePath(dir, `${randomUUID()}.${extension}`)
}

async function convertLocalImageToPng(
  sourcePath: string,
  outputPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(SIPS_PATH, [
      '-s',
      'format',
      'png',
      sourcePath,
      '--out',
      outputPath,
    ])
    let output = ''
    const timeout = windowlessSetTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('Image conversion timed out.'))
    }, CONVERSION_TIMEOUT_MS)

    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(output.trim() || `sips exited with ${code}`))
      }
    })
  })
}

function conversionError(
  name: string,
  error: unknown,
): UnsupportedSourceImageError {
  const detail = error instanceof Error ? error.message : String(error)
  return new UnsupportedSourceImageError(
    `Could not convert ${name || 'that image'} to PNG. Try ${SOURCE_IMAGE_SUPPORT_LABEL}. ${detail}`,
  )
}

function windowlessSetTimeout(
  callback: () => void,
  ms: number,
): ReturnType<typeof setTimeout> {
  return setTimeout(callback, ms)
}
