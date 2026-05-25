import type { PianoInstrumentPack } from '../shared/audio'
import extractZip from 'extract-zip'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'

const installManifestName = '.piano-pack-install.json'

interface InstrumentInstallManifest {
  packId: string
  name: string
  sourceUrl: string
  downloadUrl: string
  archiveFile: string
  extracted: boolean
  installedAt: string
  bytes?: number
}

export function instrumentsDir(dataDir: string) {
  return path.join(dataDir, 'instruments')
}

export function bundledInstrumentsDir() {
  return path.join(process.cwd(), 'public', 'instruments')
}

export function packInstallDir(dataDir: string, packId: string) {
  if (!/^[a-z0-9-]+$/.test(packId)) {
    throw new Error('Invalid instrument pack id')
  }
  return path.join(instrumentsDir(dataDir), packId)
}

function packManifestPath(dataDir: string, packId: string) {
  return path.join(packInstallDir(dataDir, packId), installManifestName)
}

function archiveExtension(downloadUrl: string) {
  const pathname = new URL(downloadUrl).pathname.toLowerCase()
  if (pathname.endsWith('.zip')) return '.zip'
  if (pathname.endsWith('.tar.xz')) return '.tar.xz'
  if (pathname.endsWith('.tgz')) return '.tgz'
  return path.extname(pathname) || '.download'
}

async function readInstallManifest(dataDir: string, packId: string) {
  try {
    const text = await readFile(packManifestPath(dataDir, packId), 'utf8')
    return JSON.parse(text) as InstrumentInstallManifest
  } catch {
    return null
  }
}

async function extractTarXz(archivePath: string, destinationDir: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('tar', ['-xJf', archivePath, '-C', destinationDir], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            stderr.trim() || `tar exited with code ${code ?? 'unknown'}`,
          ),
        )
      }
    })
  })
}

export async function withInstrumentInstallState(
  pack: PianoInstrumentPack,
  dataDir: string,
) {
  const manifest = await readInstallManifest(dataDir, pack.id)
  if (!manifest) return pack
  if (pack.engine === 'sfz' && !manifest.extracted) {
    return {
      ...pack,
      download: {
        ...pack.download,
        note: `Archive downloaded from ${manifest.downloadUrl}, but it still needs extraction before playback.`,
      },
    } satisfies PianoInstrumentPack
  }

  return {
    ...pack,
    status: 'installed',
    installedPath: packInstallDir(dataDir, pack.id),
    download: {
      ...pack.download,
      enabled: false,
      note: `Installed locally from ${manifest.downloadUrl}.`,
    },
  } satisfies PianoInstrumentPack
}

export async function withInstrumentInstallStates(
  packs: PianoInstrumentPack[],
  dataDir: string,
) {
  return Promise.all(
    packs.map((pack) => withInstrumentInstallState(pack, dataDir)),
  )
}

export async function installInstrumentPack(
  pack: PianoInstrumentPack,
  dataDir: string,
) {
  if (
    !pack.download.enabled ||
    !pack.downloadUrl ||
    pack.download.strategy !== 'direct'
  ) {
    throw new Error(`${pack.name} is not available for direct in-app download`)
  }

  const existing = await readInstallManifest(dataDir, pack.id)
  if (existing?.extracted) {
    return withInstrumentInstallState(pack, dataDir)
  }

  const installDir = packInstallDir(dataDir, pack.id)
  const tempDir = `${installDir}.tmp`
  const extension = archiveExtension(pack.downloadUrl)
  const archiveFileName = `source${extension}`
  const archivePath = path.join(tempDir, archiveFileName)

  await rm(tempDir, { recursive: true, force: true })
  await mkdir(tempDir, { recursive: true })

  const response = await fetch(pack.downloadUrl, {
    headers: {
      'user-agent': 'Moldable Piano/0.1 instrument installer',
    },
  })
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download ${pack.name}: ${response.status} ${response.statusText}`,
    )
  }

  const bodyStream = Readable.fromWeb(
    response.body as unknown as NodeReadableStream<Uint8Array>,
  )
  await pipeline(bodyStream, createWriteStream(archivePath))

  let extracted = false
  if (extension === '.zip') {
    await extractZip(archivePath, { dir: tempDir })
    extracted = true
  } else if (extension === '.tar.xz') {
    await extractTarXz(archivePath, tempDir)
    extracted = true
  }

  const manifest: InstrumentInstallManifest = {
    packId: pack.id,
    name: pack.name,
    sourceUrl: pack.sourceUrl,
    downloadUrl: pack.downloadUrl,
    archiveFile: archiveFileName,
    extracted,
    installedAt: new Date().toISOString(),
    bytes: Number(response.headers.get('content-length')) || undefined,
  }

  await writeFile(
    path.join(tempDir, installManifestName),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  await rm(installDir, { recursive: true, force: true })
  await rename(tempDir, installDir)

  return withInstrumentInstallState(pack, dataDir)
}
