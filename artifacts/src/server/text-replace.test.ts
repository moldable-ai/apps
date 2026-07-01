import { app } from './app'
import { createArtifact, replaceArtifactText } from './operations'
import { replaceExactText } from './text-replace'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }

let tempHome = ''

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'artifacts-text-replace-'))
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

describe('replaceExactText', () => {
  it('replaces one unique exact match', () => {
    expect(
      replaceExactText({
        value: 'Hello, World!',
        oldString: 'World',
        newString: 'Artifacts',
      }),
    ).toEqual({ value: 'Hello, Artifacts!', replacements: 1 })
  })

  it('requires replaceAll for repeated matches', () => {
    expect(() =>
      replaceExactText({
        value: 'foo bar foo',
        oldString: 'foo',
        newString: 'baz',
      }),
    ).toThrow('oldString found 2 times')
  })
})

describe('replaceArtifactText', () => {
  it('surgically edits a page without a field target', async () => {
    const artifact = await createArtifact('test', {
      kind: 'page',
      title: 'Page',
      page: {
        html: '<main><h1>Hello</h1></main>',
        css: 'h1 { color: teal; }',
      },
    })

    const result = await replaceArtifactText('test', artifact.id, {
      oldString: '<h1>Hello</h1>',
      newString: '<h1>Bonjour</h1>',
    })

    expect(result.replacements).toBe(1)
    expect(result.target).toEqual({ kind: 'page', field: 'html' })
    expect(result.artifact.page?.html).toContain('<h1>Bonjour</h1>')
  })

  it('surgically edits a page field', async () => {
    const artifact = await createArtifact('test', {
      kind: 'page',
      title: 'Page',
      page: { html: '<main><h1>Hello</h1></main>' },
    })

    const result = await replaceArtifactText('test', artifact.id, {
      target: { kind: 'page', field: 'html' },
      oldString: '<h1>Hello</h1>',
      newString: '<h1>Bonjour</h1>',
    })

    expect(result.replacements).toBe(1)
    expect(result.artifact.page?.html).toContain('<h1>Bonjour</h1>')
  })

  it('fails ambiguous broad edits unless replaceAll is true', async () => {
    const artifact = await createArtifact('test', {
      kind: 'page',
      title: 'Page',
      page: { html: '<p>foo</p>', css: '.foo { color: red; }' },
    })

    await expect(
      replaceArtifactText('test', artifact.id, {
        oldString: 'foo',
        newString: 'bar',
      }),
    ).rejects.toMatchObject({
      code: 'old_string_not_unique',
    })
  })

  it('replaces all matches across slides when requested', async () => {
    const artifact = await createArtifact('test', {
      kind: 'deck',
      title: 'Deck',
      slides: [
        { name: 'One', bodyHtml: '<p>foo</p>' },
        { name: 'Two', bodyHtml: '<p>foo</p>' },
      ],
    })

    const result = await replaceArtifactText('test', artifact.id, {
      kind: 'slide',
      oldString: 'foo',
      newString: 'bar',
      replaceAll: true,
    })

    expect(result.replacements).toBe(2)
    expect(result.artifact.slides.map((slide) => slide.bodyHtml)).toEqual([
      '<p>bar</p>',
      '<p>bar</p>',
    ])
  })
})

describe('text replace RPC', () => {
  it('exposes the page text replacement method', async () => {
    const artifact = await createArtifact('test', {
      kind: 'page',
      title: 'RPC Page',
      page: { html: '<section>Alpha</section>' },
    })

    const res = await app.fetch(
      new Request('http://artifacts.local/api/moldable/rpc?workspace=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'artifacts.page.text.replace',
          params: {
            id: artifact.id,
            oldString: 'Alpha',
            newString: 'Omega',
          },
        }),
      }),
    )

    const body = (await res.json()) as {
      ok: boolean
      result?: {
        replacements?: number
        artifact?: { page?: { html?: string } }
      }
    }

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result?.replacements).toBe(1)
    expect(body.result?.artifact?.page?.html).toContain('Omega')
  })
})
