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
    expect(html).toContain('window.moldableState') // durable runtime state API
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

  it('includes the mobile/responsive scaling safeguards', () => {
    const html = composeDeckHtml(baseDeck([]))
    // Notch-aware viewport so the themed letterbox extends under safe areas.
    expect(html).toContain('viewport-fit=cover')
    // Flash-free reveal: stage hidden until the controller computes the fit.
    expect(html).toContain('html.deck-ready .deck-stage')
    expect(html).toContain("classList.add('deck-ready')")
    // No-JS / print safety net so the stage is never permanently hidden.
    expect(html).toContain(
      '<noscript><style>.deck-stage{opacity:1}</style></noscript>',
    )
    // iOS Safari robustness: track the true visible box + re-fit on rotate.
    expect(html).toContain('visualViewport')
    expect(html).toContain('orientationchange')
    expect(html).toContain('html.deck-can-flow [data-build]')
    // Touch tap-to-advance is gated to coarse pointers only.
    expect(html).toContain('(pointer: coarse)')
  })

  it('includes an optional authored runtime with scoped CSP permissions', () => {
    const deck = baseDeck([
      {
        id: 's1',
        name: 'Interactive',
        bodyHtml:
          '<button data-deck-interactive>Recalculate</button><p data-build="1">Result</p>',
      },
    ])
    deck.runtime = {
      libs: ['https://cdn.example/widget.js', 'http://insecure.example/no.js'],
      js: 'document.body.dataset.runtime = "ready"',
      connectOrigins: ['https://api.example'],
      frameOrigins: ['https://tour.example'],
    }
    const html = composeDeckHtml(deck)
    expect(html).toContain('https://cdn.example/widget.js')
    expect(html).not.toContain('http://insecure.example/no.js')
    expect(html).toContain("connect-src 'self' https://api.example")
    expect(html).toContain("frame-src 'self' https://tour.example")
    expect(html).toContain('document.body.dataset.runtime = "ready"')
    expect(html.indexOf('window.moldableState')).toBeLessThan(
      html.indexOf('document.body.dataset.runtime = "ready"'),
    )
    expect(html).toContain('[data-build]')
    expect(html).toContain('deck:slidechange')
    expect(html).toContain('data-deck-interactive')
    expect(html).toContain('[data-deck-advance]')
  })

  it('renders the seeded welcome deck without throwing', () => {
    const deck = createWelcomeDeck('w1', new Date().toISOString())
    const html = composeDeckHtml(deck)
    expect(html).toContain('Decks that feel')
    expect(deck.slides.length).toBeGreaterThan(0)
  })
})
