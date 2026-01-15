#!/usr/bin/env node
/**
 * Run TypeScript type checking on all apps in the repo.
 * Runs `tsc --noEmit` in each app directory that has a tsconfig.json.
 */
import { execSync } from 'child_process'
import { existsSync, readdirSync, statSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Directories to ignore
const IGNORE_DIRS = ['node_modules', '.git', 'scripts', '.next', '.turbo']

function findApps(dir) {
  const apps = []
  const entries = readdirSync(dir)

  for (const entry of entries) {
    if (IGNORE_DIRS.includes(entry)) continue

    const entryPath = join(dir, entry)
    const stat = statSync(entryPath)

    if (stat.isDirectory()) {
      const tsconfigPath = join(entryPath, 'tsconfig.json')
      const nodeModulesPath = join(entryPath, 'node_modules')
      // Only include apps that have tsconfig.json AND node_modules installed
      if (existsSync(tsconfigPath) && existsSync(nodeModulesPath)) {
        apps.push({ name: entry, path: entryPath })
      }
    }
  }

  return apps
}

function main() {
  const apps = findApps(ROOT)

  if (apps.length === 0) {
    console.log('No apps with node_modules found (skipping type check).')
    console.log(
      'Install dependencies in an app to enable type checking: cd <app> && pnpm install',
    )
    process.exit(0)
  }

  console.log(`🔍 Type checking ${apps.length} app(s)...\n`)

  let failed = 0

  for (const app of apps) {
    process.stdout.write(`  ${app.name}... `)

    try {
      execSync('npx tsc --noEmit', {
        cwd: app.path,
        stdio: 'pipe',
        encoding: 'utf-8',
      })
      console.log('✓')
    } catch (error) {
      console.log('✗')
      console.error(`\n${error.stdout || ''}${error.stderr || ''}\n`)
      failed++
    }
  }

  console.log('')

  if (failed > 0) {
    console.log(`❌ ${failed} app(s) failed type checking`)
    process.exit(1)
  } else {
    console.log(`✅ All ${apps.length} app(s) passed type checking`)
  }
}

main()
