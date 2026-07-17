import { composeArtifactHtml, composeDeckHtml, composePageHtml } from './render'
import { createWelcomeArtifact } from './sample'
import type { Artifact } from './types'
import { describe, expect, it } from 'vitest'

function baseDeck(slides: Artifact['slides']): Artifact {
  const now = new Date().toISOString()
  return {
    id: 'd1',
    title: 'Test Deck',
    subtitle: '',
    kind: 'deck',
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

function basePage(): Artifact {
  const now = new Date().toISOString()
  return {
    id: 'p1',
    title: 'Test Page',
    subtitle: 'A subtitle',
    kind: 'page',
    density: 'low',
    theme: { fontLinks: [], css: '', stageBg: '#0b0b0f' },
    slides: [],
    page: {
      fontLinks: ['https://fonts.example/p.css'],
      libs: ['https://cdn.example/three.min.js'],
      css: '.hero{color:red}',
      html: '<main class="hero">Hi</main>',
      js: 'console.log("ready")',
      background: '#101018',
    },
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
    expect(html).toContain('<script nonce="')
    expect(html).toContain('class="deck-stage"')
    expect(html).toContain('deckFade')
    expect(html).toContain('fitStage')
    expect(html).toContain('window.moldableState')
    expect(html).toContain('https://fonts.example/x.css')
    expect(html).toContain('--stage-bg: #111')
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
    expect(html).toContain('data-transition="zoom"')
    expect(html.match(/active visible/g)?.length).toBe(1)
  })

  it('includes the mobile/responsive scaling safeguards', () => {
    const html = composeDeckHtml(baseDeck([]))
    expect(html).toContain('viewport-fit=cover')
    expect(html).toContain('html.deck-ready .deck-stage')
    expect(html).toContain(
      '<noscript><style>.deck-stage{opacity:1}</style></noscript>',
    )
    expect(html).toContain('visualViewport')
    expect(html).toContain('(pointer: coarse)')
    expect(html).toContain('html.deck-can-flow [data-build]')
  })

  it('includes an optional authored runtime with scoped CSP permissions', () => {
    const artifact = baseDeck([
      {
        id: 's1',
        name: 'Interactive',
        bodyHtml:
          '<button data-deck-interactive>Recalculate</button><p data-build="1">Result</p>',
      },
    ])
    artifact.runtime = {
      libs: ['https://cdn.example/widget.js', 'http://insecure.example/no.js'],
      js: 'document.body.dataset.runtime = "ready"',
      connectOrigins: ['https://api.example'],
      frameOrigins: ['https://tour.example'],
    }
    const html = composeDeckHtml(artifact)
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
})

describe('composePageHtml', () => {
  it('produces a scrolling page document with the author HTML/CSS/JS', () => {
    const html = composePageHtml(basePage())
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('<main class="hero">Hi</main>')
    expect(html).toContain('.hero{color:red}')
    expect(html).toContain('console.log("ready")')
    expect(html).toContain('window.moldableState')
    expect(html.indexOf('window.moldableState')).toBeLessThan(
      html.indexOf('console.log("ready")'),
    )
    expect(html).toContain('https://fonts.example/p.css') // font link
    expect(html).toContain('https://cdn.example/three.min.js') // lib script
    expect(html).toContain('--page-bg: #101018') // background var
    expect(html).toContain('A subtitle') // description meta
  })

  it('uses a permissive CSP that allows inline scripts + https CDN libs', () => {
    const html = composePageHtml(basePage())
    expect(html).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
    )
    expect(html).toContain('.reveal') // scroll-reveal base provided
    expect(html).toContain('IntersectionObserver') // reveal controller
  })

  it('dispatches by kind', () => {
    expect(composeArtifactHtml(basePage())).toContain(
      '<main class="hero">Hi</main>',
    )
    expect(composeArtifactHtml(baseDeck([]))).toContain('class="deck-stage"')
  })
})

describe('welcome artifact', () => {
  it('renders the seeded welcome page without throwing', () => {
    const artifact = createWelcomeArtifact('w1', new Date().toISOString())
    expect(artifact.kind).toBe('page')
    const html = composeArtifactHtml(artifact)
    expect(html).toContain('worth publishing')
  })
})
