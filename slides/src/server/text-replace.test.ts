import { app } from './app'
import { createDeck, replaceDeckText } from './operations'
import { replaceExactText } from './text-replace'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalEnv = { ...process.env }

let tempHome = ''

beforeEach(async () => {
  tempHome = await mkdtemp(join(tmpdir(), 'slides-text-replace-'))
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

describe('replaceExactText', () => {
  it('replaces one unique exact match', () => {
    expect(
      replaceExactText({
        value: 'Hello, World!',
        oldString: 'World',
        newString: 'Slides',
      }),
    ).toEqual({ value: 'Hello, Slides!', replacements: 1 })
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

describe('replaceDeckText', () => {
  it('surgically edits slide body HTML without a field target', async () => {
    const deck = await createDeck('test', {
      title: 'Deck',
      slides: [{ name: 'Intro', bodyHtml: '<main><h1>Hello</h1></main>' }],
    })

    const result = await replaceDeckText('test', deck.id, {
      oldString: '<h1>Hello</h1>',
      newString: '<h1>Bonjour</h1>',
    })

    expect(result.replacements).toBe(1)
    expect(result.target).toEqual({
      kind: 'slide',
      field: 'bodyHtml',
      slideId: result.deck.slides[0]?.id,
    })
    expect(result.deck.slides[0]?.bodyHtml).toContain('<h1>Bonjour</h1>')
  })

  it('fails ambiguous broad edits unless replaceAll is true', async () => {
    const deck = await createDeck('test', {
      title: 'foo',
      theme: { fontLinks: [], css: '.foo { color: red; }' },
      slides: [{ name: 'Intro', bodyHtml: '<p>foo</p>' }],
    })

    await expect(
      replaceDeckText('test', deck.id, {
        oldString: 'foo',
        newString: 'bar',
      }),
    ).rejects.toMatchObject({
      code: 'old_string_not_unique',
    })
  })

  it('replaces all matches across slides when requested', async () => {
    const deck = await createDeck('test', {
      title: 'Deck',
      slides: [
        { name: 'One', bodyHtml: '<p>foo</p>' },
        { name: 'Two', bodyHtml: '<p>foo</p>' },
      ],
    })

    const result = await replaceDeckText('test', deck.id, {
      kind: 'slide',
      oldString: 'foo',
      newString: 'bar',
      replaceAll: true,
    })

    expect(result.replacements).toBe(2)
    expect(result.deck.slides.map((slide) => slide.bodyHtml)).toEqual([
      '<p>bar</p>',
      '<p>bar</p>',
    ])
  })
})

describe('text replace RPC', () => {
  it('exposes the broad deck text replacement method', async () => {
    const deck = await createDeck('test', {
      title: 'RPC Deck',
      slides: [{ name: 'Intro', bodyHtml: '<section>Alpha</section>' }],
    })

    const res = await app.fetch(
      new Request('http://slides.local/api/moldable/rpc?workspace=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'slides.text.replace',
          params: {
            id: deck.id,
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
        deck?: { slides?: { bodyHtml?: string }[] }
      }
    }

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result?.replacements).toBe(1)
    expect(body.result?.deck?.slides?.[0]?.bodyHtml).toContain('Omega')
  })
})
