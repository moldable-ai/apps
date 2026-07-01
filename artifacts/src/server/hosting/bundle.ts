import { composeArtifactHtml } from '../../shared/render'
import type { Artifact } from '../../shared/types'
import { getArtifact, listAssets, stageAsset, stageIndexHtml } from '../store'
import { contentTypeFor } from './content-type'
import { HostingError } from './errors'
import type { PublishBundle, PublishBundleFile } from './types'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { dirname } from 'node:path'

const APP_ID = process.env.MOLDABLE_APP_ID ?? 'artifacts'

function firstImageAsset(files: string[]): string | undefined {
  return files.find((file) => /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file))
}

export function artifactPublishMetadata(
  artifact: Artifact,
  id: string,
  assetFiles: string[],
): Record<string, string> {
  const description = artifact.subtitle?.trim()
  const image = firstImageAsset(assetFiles)
  return {
    sourceAppId: APP_ID,
    artifactId: id,
    artifactKind: artifact.kind,
    slideCount: String(artifact.slides.length),
    seoTitle: artifact.title,
    ...(description ? { description, seoDescription: description } : {}),
    ...(image ? { seoImage: `assets/${image}` } : {}),
  }
}

export async function createPublishBundle(
  workspaceId: string | undefined,
  id: string,
): Promise<PublishBundle> {
  const artifact = await getArtifact(workspaceId, id)
  if (!artifact) {
    throw new HostingError('artifact_not_found', 'Artifact not found', 404)
  }

  const indexPath = await stageIndexHtml(
    workspaceId,
    id,
    composeArtifactHtml(artifact, { activeIndex: 0 }),
  )

  const assetFiles = await listAssets(workspaceId, id)
  const files: PublishBundleFile[] = [
    await fileInfo('index.html', 'text/html; charset=utf-8', indexPath),
  ]

  for (const file of assetFiles) {
    files.push(
      await fileInfo(
        `assets/${file}`,
        contentTypeFor(file),
        await stageAsset(workspaceId, id, file),
      ),
    )
  }

  return {
    artifactId: id,
    kind: artifact.kind,
    title: artifact.title,
    entrypoint: 'index.html',
    sourceDir: dirname(indexPath),
    metadata: artifactPublishMetadata(artifact, id, assetFiles),
    files,
  }
}

async function fileInfo(
  path: string,
  contentType: string,
  sourcePath: string,
): Promise<PublishBundleFile> {
  const stats = await stat(sourcePath)
  const bytes = await readFile(sourcePath)
  return {
    path,
    contentType,
    sourcePath,
    size: stats.size,
    sha1: createHash('sha1').update(bytes).digest('hex'),
  }
}
