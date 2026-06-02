import {
  UnsupportedSourceImageError,
  isSupportedSourceImageMimeType,
  isSupportedSourceImageName,
  normalizeUploadedSourceImage,
  sourceImageMimeTypeForName,
} from './image-conversion'
import { describe, expect, it } from 'vitest'

describe('source image conversion support', () => {
  it('accepts direct and convertible source image names', () => {
    expect(isSupportedSourceImageName('image.png')).toBe(true)
    expect(isSupportedSourceImageName('image.jpeg')).toBe(true)
    expect(isSupportedSourceImageName('image.webp')).toBe(true)
    expect(isSupportedSourceImageName('image.avif')).toBe(true)
    expect(isSupportedSourceImageName('image.HEIC')).toBe(true)
    expect(isSupportedSourceImageName('image.tiff')).toBe(true)
    expect(isSupportedSourceImageName('image.jp2')).toBe(true)
  })

  it('rejects unsupported source image names', () => {
    expect(isSupportedSourceImageName('image.svg')).toBe(false)
    expect(isSupportedSourceImageName('image.pdf')).toBe(false)
    expect(isSupportedSourceImageName('image')).toBe(false)
  })

  it('accepts direct and convertible source image mime types', () => {
    expect(isSupportedSourceImageMimeType('image/png')).toBe(true)
    expect(isSupportedSourceImageMimeType('image/webp')).toBe(true)
    expect(isSupportedSourceImageMimeType('image/avif')).toBe(true)
    expect(isSupportedSourceImageMimeType('image/heic')).toBe(true)
    expect(isSupportedSourceImageMimeType('image/tiff')).toBe(true)
  })

  it('does not accept svg imports', () => {
    expect(isSupportedSourceImageMimeType('image/svg+xml')).toBe(false)
    expect(sourceImageMimeTypeForName('vector.svg')).toBeNull()
  })

  it('keeps direct PNG uploads unchanged', async () => {
    const buffer = Buffer.from('png-bytes')
    const normalized = await normalizeUploadedSourceImage({
      originalName: 'source.png',
      mimeType: 'image/png',
      buffer,
    })

    expect(normalized).toEqual({
      buffer,
      extension: 'png',
      mimeType: 'image/png',
      originalName: 'source.png',
    })
  })

  it('rejects unsupported uploads before conversion', async () => {
    await expect(
      normalizeUploadedSourceImage({
        originalName: 'source.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from('<svg />'),
      }),
    ).rejects.toBeInstanceOf(UnsupportedSourceImageError)
  })
})
