import { composeDeckHtml } from './render'
import { createWelcomeDeck } from './sample'
import type { Deck } from './types'
import { describe, expect, it } from 'vitest'

function baseDeck(slides: Deck['slides']): Deck {
  const now = new Date().toISOString()
  return {
    id: 'd1',
    title: 'Test Deck',
    subtitle: '',
    density: 'low',
    theme: {
      fontLinks: ['https://fonts.example/x.css'],
      css: '.x{}',
      stageBg: '#111',
    },
    slides,
    published: null,
    publishPending: false,
    publishError: null,
    createdAt: now,
    updatedAt: now,
  }
}

describe('composeDeckHtml', () => {
  it('produces a self-contained document with the fixed stage and controller', () => {
    const html = composeDeckHtml(baseDeck([]))
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('Content-Security-Policy')
    expect(html).toContain("connect-src 'none'")
    expect(html).toContain('img-src http: https: data: blob:')
    expect(html).toContain('media-src http: https: data: blob:')
    expect(html).toContain('<script nonce="')
    expect(html).toContain('class="deck-stage"')
    expect(html).toContain('deckFade') // base animations injected
    expect(html).toContain('fitStage') // controller injected
    expect(html).toContain('focusDeck') // published decks focus for keyboard nav
    expect(html).toContain('https://fonts.example/x.css') // font link
    expect(html).toContain('--stage-bg: #111') // stage background
  })

  it('renders slide bodyHtml verbatim and marks the active slide', () => {
    const html = composeDeckHtml(
      baseDeck([
        {
          id: 's1',
          name: 'One',
          bodyHtml: '<h1>Hello</h1>',
          transition: 'zoom',
        },
        { id: 's2', name: 'Two', bodyHtml: '<h1>World</h1>' },
      ]),
      { activeIndex: 1 },
    )
    expect(html).toContain('<h1>Hello</h1>')
    expect(html).toContain('<h1>World</h1>')
    expect(html).toContain('data-slide-id="s1"')
    expect(html).toContain('data-slide-id="s2"')
    expect(html).toContain('data-transition="zoom"')
    // exactly one slide is active on load
    expect(html.match(/active visible/g)?.length).toBe(1)
  })

  it('drops non-https font links and unsafe slide classes', () => {
    const deck = baseDeck([
      {
        id: 's1',
        name: 'x',
        bodyHtml: '',
        slideClass: 'title-slide "><script>',
      },
    ])
    deck.theme.fontLinks = ['http://insecure', 'javascript:alert(1)']
    const html = composeDeckHtml(deck)
    expect(html).not.toContain('insecure')
    expect(html).not.toContain('javascript:alert')
    expect(html).toContain('class="slide title-slide')
    expect(html).not.toContain('<script>alert')
  })

  it('renders the seeded welcome deck without throwing', () => {
    const deck = createWelcomeDeck('w1', new Date().toISOString())
    const html = composeDeckHtml(deck)
    expect(html).toContain('Decks that feel')
    expect(deck.slides.length).toBeGreaterThan(0)
  })
})
