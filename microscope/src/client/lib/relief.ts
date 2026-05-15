import * as THREE from 'three'

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be decoded.'))
    image.src = url
  })
}

export function createImageReliefGeometry(image: HTMLImageElement) {
  const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1)
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1)
  const aspect = sourceWidth / sourceHeight
  const specimenWidth = aspect >= 1 ? 4.2 : 4.2 * aspect
  const specimenHeight = aspect >= 1 ? 4.2 / aspect : 4.2
  const sampleScale = Math.min(1, 190 / Math.max(sourceWidth, sourceHeight))
  const sampleWidth = Math.max(24, Math.round(sourceWidth * sampleScale))
  const sampleHeight = Math.max(24, Math.round(sourceHeight * sampleScale))
  const canvas = createCanvas(sampleWidth, sampleHeight)
  const context = canvas.getContext('2d', { willReadFrequently: true })

  if (!context) {
    return new THREE.PlaneGeometry(specimenWidth, specimenHeight, 64, 64)
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight)

  const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight)
  const segmentsX = Math.max(44, Math.min(96, Math.round(sampleWidth / 3.1)))
  const segmentsY = Math.max(44, Math.min(96, Math.round(sampleHeight / 3.1)))
  const geometry = new THREE.PlaneGeometry(
    specimenWidth,
    specimenHeight,
    segmentsX,
    segmentsY,
  )
  const positions = geometry.attributes.position
  const uvs = geometry.attributes.uv

  function sampleAlpha(x: number, y: number) {
    const px = Math.max(0, Math.min(sampleWidth - 1, x))
    const py = Math.max(0, Math.min(sampleHeight - 1, y))
    return data[(py * sampleWidth + px) * 4 + 3] / 255
  }

  for (let index = 0; index < positions.count; index += 1) {
    const u = uvs.getX(index)
    const v = uvs.getY(index)
    const px = Math.max(
      0,
      Math.min(sampleWidth - 1, Math.round(u * (sampleWidth - 1))),
    )
    const py = Math.max(
      0,
      Math.min(sampleHeight - 1, Math.round((1 - v) * (sampleHeight - 1))),
    )
    const dataIndex = (py * sampleWidth + px) * 4
    const r = data[dataIndex]
    const g = data[dataIndex + 1]
    const b = data[dataIndex + 2]
    const rawAlpha = data[dataIndex + 3] / 255
    const alpha = rawAlpha < 0.12 ? 0 : clamp((rawAlpha - 0.12) / 0.88)
    const brightness = (r + g + b) / 765
    const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255
    const radial = clamp(1 - Math.hypot((u - 0.5) / 0.58, (v - 0.52) / 0.55))
    const neighborAlpha = Math.min(
      sampleAlpha(px - 2, py),
      sampleAlpha(px + 2, py),
      sampleAlpha(px, py - 2),
      sampleAlpha(px, py + 2),
    )
    const contour = clamp((alpha - neighborAlpha) * 2.4)
    const surfaceNoise =
      Math.sin(u * 24 + v * 13) * 0.018 + Math.sin(u * 47 - v * 29) * 0.012
    const depth =
      alpha <= 0
        ? -0.12
        : alpha *
            (0.08 +
              radial * 0.58 +
              saturation * 0.24 +
              (1 - Math.abs(brightness - 0.58)) * 0.1 +
              surfaceNoise) +
          contour * 0.2

    positions.setZ(index, depth)
  }

  geometry.computeVertexNormals()
  return geometry
}

export async function imageToDataUrl(url: string, maxEdge = 360) {
  const image = await loadImage(url)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const canvas = createCanvas(
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  )
  const context = canvas.getContext('2d')
  if (!context) return url
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}
