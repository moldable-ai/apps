import { getTemplate } from '../shared/templates'
import { createDeck } from './operations'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }
let tempHome = ''

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'slides-operations-'))
  process.env = {
    ...originalEnv,
    MOLDABLE_HOME: tempHome,
    MOLDABLE_APP_ID: 'slides',
    MOLDABLE_WORKSPACE_ID: 'test',
  }
})

afterEach(async () => {
  process.env = originalEnv
  await rm(tempHome, { recursive: true, force: true })
})

describe('createDeck', () => {
  it('defaults a new deck created from a template to the template title', async () => {
    const template = getTemplate('clean-minimal')
    expect(template).toBeDefined()

    const deck = await createDeck('test', { templateId: 'clean-minimal' })

    expect(deck.title).toBe(template?.name)
    expect(deck.title).not.toMatch(/^Untitled/i)
  })

  it('preserves an explicit title when creating from a template', async () => {
    const deck = await createDeck('test', {
      templateId: 'clean-minimal',
      title: 'Custom deck title',
    })

    expect(deck.title).toBe('Custom deck title')
  })

  it('clones the interactive runtime from a template', async () => {
    const template = getTemplate('data-dashboard')
    const deck = await createDeck('test', { templateId: 'data-dashboard' })

    expect(template?.runtime?.js).toContain('data-scenario-lab')
    expect(deck.runtime).toEqual(template?.runtime)
    expect(deck.runtime).not.toBe(template?.runtime)
    expect(deck.runtime?.libs).not.toBe(template?.runtime?.libs)
  })
})
