#!/usr/bin/env node
/**
 * Standalone render script for Remotion compositions
 * Called by the API route to avoid bundler conflicts with Next.js
 *
 * Usage: node scripts/render.mjs <projectDir> <outputPath>
 *
 * Project directory structure:
 *   projectDir/
 *   ├── project.json        # Metadata (width, height, fps, durationInFrames, etc.)
 *   └── Composition.tsx     # Root composition code
 */
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const [projectDir, outputPath] = process.argv.slice(2)

  if (!projectDir || !outputPath) {
    console.error('Usage: node render.mjs <projectDir> <outputPath>')
    process.exit(1)
  }

  // Read project metadata
  const metadataPath = path.join(projectDir, 'project.json')
  const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'))
  const { width, height, fps, durationInFrames, name } = metadata

  // Read composition code
  const compositionPath = path.join(projectDir, 'Composition.tsx')
  const compositionCode = await readFile(compositionPath, 'utf-8')

  // Create temp directory for bundling
  const tempDir = path.join(
    path.dirname(outputPath),
    '.render-temp',
    Date.now().toString(),
  )
  await mkdir(tempDir, { recursive: true })

  try {
    // Strip imports from user code - we'll provide them
    const userCode = compositionCode
      .split('\n')
      .filter((line) => !line.trim().startsWith('import '))
      .join('\n')

    // Write the composition code to a file with proper Remotion structure
    const entryCode = `
import React from 'react';
import { registerRoot, Composition, AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Img, Audio } from 'remotion';

${userCode}

export const RemotionRoot = () => {
  return (
    <Composition
      id="Main"
      component={MyComposition}
      durationInFrames={${durationInFrames}}
      fps={${fps}}
      width={${width}}
      height={${height}}
    />
  );
};

registerRoot(RemotionRoot);
`

    const indexPath = path.join(tempDir, 'index.tsx')
    await writeFile(indexPath, entryCode)

    // Create tsconfig for the temp project
    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: false,
        esModuleInterop: true,
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
      },
      include: ['*.tsx'],
    }
    await writeFile(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2),
    )

    console.log(`Bundling composition for "${name}"...`)

    // Bundle the composition
    const bundleLocation = await bundle({
      entryPoint: indexPath,
      onProgress: (progress) => {
        if (progress === 1) {
          console.log('Bundling complete')
        }
      },
    })

    console.log('Selecting composition...')

    // Select the composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'Main',
    })

    console.log(
      `Rendering ${durationInFrames} frames at ${fps}fps (${width}x${height})...`,
    )

    // Render the video
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      onProgress: ({ progress }) => {
        const percent = Math.round(progress * 100)
        process.stdout.write(`\rRendering: ${percent}%`)
      },
    })

    console.log('\nRender complete!')

    // Clean up
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    await rm(bundleLocation, { recursive: true, force: true }).catch(() => {})

    // Output the path for the API to read
    console.log(`OUTPUT_PATH:${outputPath}`)
    process.exit(0)
  } catch (error) {
    console.error('Render failed:', error.message)
    // Clean up on error
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    process.exit(1)
  }
}

main()
