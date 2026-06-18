import type { Slide } from '../../types'
import type { Template } from '../types'

const s = (slide: Slide): Slide => slide
const IMG = 'assets/sample.jpg'

const BOOK_IMG = 'assets/book-cover.jpg'
const BOOK_FIG = 'assets/book-fig.jpg'
const BOOK_SCENE = 'assets/book-scene.jpg'

export const literary: Template = {
  id: 'literary',
  categories: ['Education', 'Creative'],
  name: 'Literary',
  tagline: 'Warm, bookish academic report',
  audiences: ['book report', 'humanities', 'essay', 'academic'],
  description:
    'A warm paper-toned deck with an elegant Playfair Display serif, terracotta accents, chapter dividers, pull-quotes and watercolour imagery. A complete book report you adapt to your title.',
  fonts: {
    display: 'Playfair Display',
    body: 'Hanken Grotesk',
    links: [
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap',
    ],
  },
  tokens: {
    '--bg': '#faf6ef',
    '--text': '#2a211b',
    '--muted': '#7a6a5c',
    '--accent': '#c0633a',
    '--accent-2': '#a8743f',
    '--display': "'Playfair Display', serif",
    '--body': "'Hanken Grotesk', sans-serif",
    '--display-weight': '600',
    '--title-size': '128px',
    '--headline-size': '80px',
    '--quote-size': '90px',
    '--lead-size': '36px',
    '--card-bg': '#fffdf8',
    '--card-border': '#ece2d2',
    '--card-shadow': '0 14px 40px -24px rgba(120,80,50,0.18)',
    '--radius': '10px',
    '--media-radius': '10px',
    '--bullet-color': '#c0633a',
    '--track': '#ece2d2',
    '--donut-hole': '#faf6ef',
    '--media-shadow': '0 50px 100px -40px rgba(120,80,50,0.3)',
  },
  stageBg: '#f1ebe0',
  assets: ['book-cover.jpg', 'book-fig.jpg', 'book-scene.jpg'],
  decoration: `.kicker { color: var(--accent); }
.metric, .stat-num { color: var(--accent); }
.quote::before { color: var(--accent); }
.chapter { position: absolute; inset: 0; padding: var(--pad-y, 110px) var(--pad-x, 130px); display: flex; flex-direction: column; justify-content: center; gap: 14px; }
.chapter-num { font-family: var(--display); font-style: italic; font-weight: 500; font-size: 46px; color: var(--accent); letter-spacing: 0.02em; }
.chapter-title { font-family: var(--display); font-weight: 600; font-size: 150px; line-height: 0.98; letter-spacing: -0.01em; color: var(--text); }
.chapter-rule { width: 120px; height: 2px; background: var(--accent); margin-top: 12px; }
.facts { display: flex; flex-direction: column; }
.fact { display: flex; gap: 30px; align-items: baseline; padding: 20px 0; border-top: 1px solid var(--card-border); }
.fact:last-child { border-bottom: 1px solid var(--card-border); }
.fact-k { flex: 0 0 230px; font-family: var(--body); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 21px; color: var(--accent); }
.fact-v { font-family: var(--display); font-weight: 500; font-size: 38px; color: var(--text); }
.prose { font-family: var(--body); font-size: 34px; line-height: 1.5; color: var(--text); max-width: 30ch; }
.prose.dropcap::first-letter { float: left; font-family: var(--display); font-weight: 700; font-size: 150px; line-height: 0.72; color: var(--accent); margin: 10px 22px -6px 0; }
.rating { font-family: var(--display); font-size: 76px; color: var(--accent); letter-spacing: 10px; }
.note { border-left: 4px solid var(--accent); background: rgba(192,99,58,0.08); padding: 30px 38px; border-radius: 0 12px 12px 0; }
.note-k { font-family: var(--body); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; font-size: 20px; color: var(--accent); margin-bottom: 10px; }`,
  notes:
    'Warm, elegant, literary. Playfair Display serif (use <em> for italic accents) on cream, terracotta accent, watercolour imagery (book-cover on the cover/split, book-fig for "meet the book", book-scene for setting). Chapter dividers (.chapter/.chapter-num roman numerals/.chapter-title/.chapter-rule). Use .facts factsheet, .prose.dropcap for set-the-scene narrative, big .quote pull-quotes, .cards for characters/themes, .steps for plot, .rating + .note for the verdict. Cozy and considered.',
  sampleSlides: [
    s({
      id: 'lt-cover',
      name: 'Cover',
      slideClass: 'title-slide',
      transition: 'fade',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">A Book Report · by Maya R.</div>
    <h1 class="title reveal">The Night Gardener</h1>
    <p class="lead reveal">A study of courage, loss, and the stories we tell.</p>
  </div>
  <figure class="media reveal"><img src="${BOOK_IMG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'lt-contents',
      name: 'Contents',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">In this report</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:8px">What we'll explore.</h2>
  <ol class="steps reveal">
    <li class="step"><span><b>The Story</b> — setting, characters, and plot.</span></li>
    <li class="step"><span><b>The Meaning</b> — themes, symbols, and big questions.</span></li>
    <li class="step"><span><b>The Craft</b> — the author's style and lasting impact.</span></li>
    <li class="step"><span><b>The Verdict</b> — my honest recommendation.</span></li>
  </ol>
</div>`,
    }),
    s({
      id: 'lt-meet',
      name: 'Meet the book',
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">Meet the book</div>
    <div class="facts reveal" style="margin-top:6px">
      <div class="fact"><div class="fact-k">Author</div><div class="fact-v">J. Auxier</div></div>
      <div class="fact"><div class="fact-k">Genre</div><div class="fact-v">Literary fiction</div></div>
      <div class="fact"><div class="fact-k">Setting</div><div class="fact-v">A coastal town, one autumn</div></div>
      <div class="fact"><div class="fact-k">Pages</div><div class="fact-v">352</div></div>
    </div>
  </div>
  <figure class="media reveal"><img src="${BOOK_FIG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'lt-ch1',
      name: 'Chapter · The Story',
      transition: 'fade',
      bodyHtml: `<div class="chapter">
  <div class="chapter-num reveal">Chapter I</div>
  <div class="chapter-title reveal">The Story</div>
  <div class="chapter-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'lt-setting',
      name: 'Setting the scene',
      transition: 'slide',
      bodyHtml: `<div class="split reverse">
  <div class="split-text">
    <div class="kicker reveal">Setting the scene</div>
    <p class="prose dropcap reveal">The town of Hollow's End is fading — shops shuttered, families leaving — when a stranger arrives and a long-dead garden begins, impossibly, to bloom.</p>
  </div>
  <figure class="media reveal"><img src="${BOOK_SCENE}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'lt-characters',
      name: 'Main characters',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Main characters</div>
  <div class="cards reveal" style="--cols:3;margin-top:14px">
    <div class="card"><div class="card-title">Mara</div><div class="card-body">A wary teenager who learns to hope without naïveté.</div></div>
    <div class="card"><div class="card-title">The Gardener</div><div class="card-body">A quiet stranger whose kindness reshapes the town.</div></div>
    <div class="card"><div class="card-title">Tomas</div><div class="card-body">Mara's younger brother, holding the family together.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'lt-plot',
      name: 'Plot overview',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Plot overview</div>
  <ol class="steps reveal" style="margin-top:10px">
    <li class="step"><span>A stranger arrives, and the dead garden begins to bloom.</span></li>
    <li class="step"><span>The town's relief curdles into suspicion and fear.</span></li>
    <li class="step"><span>Mara must choose between safety and the truth.</span></li>
    <li class="step"><span>What's lost can't return — but something new takes root.</span></li>
  </ol>
</div>`,
    }),
    s({
      id: 'lt-conflict',
      name: 'Conflict',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Conflict &amp; challenges</div>
  <h2 class="headline reveal" style="margin-top:6px;margin-bottom:16px">Two kinds of trouble.</h2>
  <div class="cols-2 reveal" style="gap:28px">
    <div class="card"><div class="note-k">External</div><div class="card-title" style="font-size:38px">A town turning on itself.</div><div class="card-body">Fear spreads faster than the blight, and neighbours become accusers.</div></div>
    <div class="card"><div class="note-k">Internal</div><div class="card-title" style="font-size:38px">Mara's fear of hoping.</div><div class="card-body">To act, she must risk the disappointment she's been guarding against.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'lt-ch2',
      name: 'Chapter · The Meaning',
      transition: 'fade',
      bodyHtml: `<div class="chapter">
  <div class="chapter-num reveal">Chapter II</div>
  <div class="chapter-title reveal">The Meaning</div>
  <div class="chapter-rule reveal"></div>
</div>`,
    }),
    s({
      id: 'lt-themes',
      name: 'Themes',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Themes &amp; messages</div>
  <div class="cards reveal" style="--cols:3;margin-top:14px">
    <div class="card"><div class="card-title">Care as courage</div><div class="card-body">Tending something is its own quiet bravery.</div></div>
    <div class="card"><div class="card-title">Fear of change</div><div class="card-body">How communities turn on what they don't understand.</div></div>
    <div class="card"><div class="card-title">Stories we tell</div><div class="card-body">The thin line between comfort and self-deception.</div></div>
  </div>
</div>`,
    }),
    s({
      id: 'lt-quote',
      name: 'Pull quote',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <blockquote class="quote reveal">"Hope, she learned, is a thing you <em>do</em> — not a thing you feel."</blockquote>
  <div class="cite reveal"><span class="cite-dot"></span><span class="cite-name">The Night Gardener</span><span class="cite-role">· ch. 11</span></div>
</div>`,
    }),
    s({
      id: 'lt-symbols',
      name: 'Symbolism',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">Symbolism &amp; motifs</div>
  <h2 class="headline reveal" style="margin-top:6px">Reading between the lines.</h2>
  <ul class="bullets reveal" style="margin-top:8px">
    <li class="bullet"><span><b>The garden</b> — growth that demands tending, and a price.</span></li>
    <li class="bullet"><span><b>The recurring storm</b> — the change the town can't hold back.</span></li>
    <li class="bullet"><span><b>Lantern light</b> — small, deliberate acts of hope in the dark.</span></li>
  </ul>
</div>`,
    }),
    s({
      id: 'lt-style',
      name: "Author's style",
      transition: 'slide',
      bodyHtml: `<div class="split">
  <div class="split-text">
    <div class="kicker reveal">The craft</div>
    <h2 class="headline reveal">Author's style &amp; impact.</h2>
    <ul class="bullets reveal" style="--gap:18px;margin-top:4px">
      <li class="bullet"><span>Spare, image-rich prose that trusts the reader.</span></li>
      <li class="bullet"><span>Folktale rhythm — repetition that builds dread and warmth.</span></li>
      <li class="bullet"><span>A quiet ending that lingers far longer than its length.</span></li>
    </ul>
  </div>
  <figure class="media reveal"><img src="${BOOK_FIG}" alt=""></figure>
</div>`,
    }),
    s({
      id: 'lt-verdict',
      name: 'Verdict',
      transition: 'slide',
      bodyHtml: `<div class="pad">
  <div class="kicker reveal">The verdict</div>
  <div class="rating reveal" style="margin-top:8px">★★★★☆</div>
  <div class="note reveal" style="margin-top:24px;max-width:34ch">
    <div class="note-k">In a sentence</div>
    <p class="body" style="max-width:none">A small book that asks a large question — and trusts you to answer it.</p>
  </div>
</div>`,
    }),
    s({
      id: 'lt-recommend',
      name: 'Recommendation',
      transition: 'fade',
      bodyHtml: `<div class="pad center">
  <div class="kicker reveal">Would I recommend it?</div>
  <h2 class="display reveal" style="--display-size:120px">Yes — to anyone<br/>who's ever been <em>afraid to hope.</em></h2>
</div>`,
    }),
  ],
}

// ── 13. Seminar (lecture / course) ────────────────────────────────────────
