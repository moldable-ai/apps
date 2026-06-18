// Shared deck/slide data model. Used by both the Hono server (storage, render,
// publish bundle) and the React client (editor, preview, publish bridge).
//
// A deck is a list of slides plus a theme. Each slide stores the *inner* HTML of
// a fixed 1920x1080 stage section — exactly the "Frontend Slides" authoring
// model — so the AI chat can write rich, animation-ready HTML/CSS per slide and
// the same bytes render in-app and in the published artifact.

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
  /** Inner HTML of the <section class="slide">. Authored at 1920x1080. */
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

export interface PublishedInfo {
  url: string
  slug: string
  version: string
  publishedAt: string
}

export interface Deck {
  id: string
  title: string
  subtitle?: string
  /** Reading-first ("high") vs speaker-led ("low") density. Informational. */
  density: 'low' | 'high'
  /** Style library template this deck's theme came from (if any). */
  templateId?: string
  /** Reusable base prompt prepended to every generated image so the deck's
   * imagery stays coherent (medium · palette · mood). Edited in the Assets panel. */
  imageStyle?: string
  /** Which image-style preset (a template id) is active — its cover is the
   * image-to-image style source. Defaults to the deck's own templateId. */
  imagePresetId?: string
  theme: DeckTheme
  slides: Slide[]
  published?: PublishedInfo | null
  /** Set by the `deck.publish` RPC; the open client picks it up and publishes. */
  publishPending?: boolean
  publishError?: string | null
  createdAt: string
  updatedAt: string
}

export interface DeckSummary {
  id: string
  title: string
  subtitle?: string
  templateId?: string
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
