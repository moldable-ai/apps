// Shared artifact data model. Used by both the Hono server (storage, render,
// publish bundle) and the React client (editor, preview, publish bridge).
//
// An artifact is ONE of two kinds:
//   - 'deck' — a slide deck: a list of slides + a theme. Each slide stores the
//     *inner* HTML of a fixed 1920×1080 stage section (the "Frontend Slides"
//     authoring model), letterboxed/scaled to fit and navigated like a deck.
//   - 'page' — a single, self-contained scrolling web page: free-form
//     HTML/CSS/JS that the author fully controls (dashboards, landing pages,
//     specs, games, 3D scenes, data stories). No fixed stage — it's a real
//     responsive document.
//
// Both kinds publish the same way (a static Moldable Artifact: index.html +
// assets/) and are edited entirely from chat via RPC.

export type ArtifactKind = 'page' | 'deck'

export type SlideTransition = 'fade' | 'slide' | 'zoom' | 'none'

export const SLIDE_TRANSITIONS: SlideTransition[] = [
  'fade',
  'slide',
  'zoom',
  'none',
]

export interface Slide {
  id: string
  /** Short outline label shown in the rail (e.g. "Title", "Problem"). */
  name: string
  /** Inner HTML of the <section class="slide">. Authored at 1920×1080. */
  bodyHtml: string
  /** Extra classes for the slide section, e.g. "title-slide". */
  slideClass?: string
  /** Enter animation when the slide becomes active. */
  transition?: SlideTransition
  /** Speaker notes (shown in present mode, not in the slide itself). */
  notes?: string
}

export interface DeckTheme {
  /** Stylesheet <link> hrefs (Fontshare / Google Fonts). Never system fonts. */
  fontLinks: string[]
  /**
   * Deck-wide CSS: `:root` custom properties, `.reveal`-style helpers, and any
   * per-slide layout classes. The mandatory fixed-stage base CSS and the deck
   * controller are injected automatically — do not include them here.
   */
  css: string
  /** Letterbox color shown around the 16:9 stage. Defaults to slide bg. */
  stageBg?: string
}

/**
 * A full-page artifact's document. Rendered as a normal, scrolling,
 * fully-responsive web page — the author owns the entire design.
 */
export interface PageDoc {
  /** Stylesheet <link> hrefs (Fontshare / Google Fonts). */
  fontLinks: string[]
  /** Optional external <script> srcs (https only) — e.g. a pinned three.js CDN. */
  libs: string[]
  /** All page CSS (authored for a real scrolling document, NOT the 1920 stage). */
  css: string
  /** Full <body> inner HTML. */
  html: string
  /** Page JavaScript — runs after the DOM is parsed. */
  js: string
  /** Page background color (also used as the editor canvas backdrop). */
  background?: string
}

export function emptyPage(): PageDoc {
  return {
    fontLinks: [],
    libs: [],
    css: '',
    html: '',
    js: '',
    background: '#0b0b0f',
  }
}

export interface PublishedInfo {
  url: string
  slug: string
  version: string
  publishedAt: string
}

export interface Artifact {
  id: string
  title: string
  subtitle?: string
  /** Which artifact kind: a slide deck or a single full page. */
  kind: ArtifactKind
  /** Reading-first ("high") vs speaker-led ("low") density (decks). Informational. */
  density: 'low' | 'high'
  /** Style library template this artifact came from (if any). */
  templateId?: string
  /** Reusable base prompt prepended to every generated image so the artifact's
   * imagery stays coherent (medium · palette · mood). Edited in the Assets panel. */
  imageStyle?: string
  /** Which image-style preset (a template id) is active — its cover is the
   * image-to-image style source. Defaults to the artifact's own templateId. */
  imagePresetId?: string
  /** Deck-mode theme + slides (present for kind === 'deck'; slides is [] for pages). */
  theme: DeckTheme
  slides: Slide[]
  /** Page-mode document (present for kind === 'page'). */
  page?: PageDoc
  published?: PublishedInfo | null
  /** Set by the `publish` RPC; the open client picks it up and publishes. */
  publishPending?: boolean
  publishError?: string | null
  createdAt: string
  updatedAt: string
}

export interface ArtifactSummary {
  id: string
  title: string
  subtitle?: string
  kind: ArtifactKind
  templateId?: string
  /** Slide count (decks) — 0 for pages. */
  slideCount: number
  published: boolean
  publishedUrl?: string | null
  publishPending: boolean
  updatedAt: string
  createdAt: string
}

export function emptyTheme(): DeckTheme {
  return { fontLinks: [], css: '', stageBg: undefined }
}
