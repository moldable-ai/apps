import { getTemplate } from '../shared/templates'
import { createArtifact } from './operations'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }
let tempHome = ''

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'artifacts-operations-'))
  process.env = {
    ...originalEnv,
    MOLDABLE_HOME: tempHome,
    MOLDABLE_APP_ID: 'artifacts',
    MOLDABLE_WORKSPACE_ID: 'test',
  }
})

afterEach(async () => {
  process.env = originalEnv
  await rm(tempHome, { recursive: true, force: true })
})

describe('createArtifact', () => {
  it('defaults a new artifact created from a template to the template title', async () => {
    const template = getTemplate('landing-page')
    expect(template).toBeDefined()

    const artifact = await createArtifact('test', {
      templateId: 'landing-page',
    })

    expect(artifact.title).toBe(template?.name)
    expect(artifact.title).not.toMatch(/^Untitled/i)
  })

  it('preserves an explicit title when creating from a template', async () => {
    const artifact = await createArtifact('test', {
      templateId: 'landing-page',
      title: 'Custom launch page',
    })

    expect(artifact.title).toBe('Custom launch page')
  })
})
