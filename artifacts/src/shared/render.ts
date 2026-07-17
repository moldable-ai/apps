// Deck -> self-contained HTML renderer.
//
// This is the single source of truth: the exact string returned here is what the
// in-app preview iframe loads AND what gets published as the artifact's
// index.html. "What you preview is what you publish."
//
// Output model (Frontend Slides fixed-stage spec): every slide is authored at
// 1920x1080 inside `.deck-stage`, and the whole stage is scaled uniformly to the
// viewport (letterbox/pillarbox, never reflow). Runtime behaviour (which slide
// is active, thumbnail mode, present mode) is driven entirely by URL params read
// by the controller, so the same bytes work as preview, thumbnail, and the
// public artifact.
import { RUNTIME_STATE_CLIENT_JS } from './runtime-state'
import type { Artifact, PageDoc, Slide, SlideTransition } from './types'

/** Mandatory fixed 16:9 stage base CSS — included verbatim in every deck. */
export const VIEWPORT_BASE_CSS = `
/* === FIXED 16:9 STAGE (mandatory base) === */
html, body {
  width: 100%; height: 100%; margin: 0;
  overflow: hidden;
  background: var(--stage-bg, #000);
}
.deck-viewport {
  position: fixed; inset: 0; overflow: hidden;
  background: var(--stage-bg, #000);
}
.deck-stage {
  position: absolute; left: 0; top: 0;
  width: 1920px; height: 1080px;
  overflow: hidden;
  transform-origin: 0 0;
  /* Composite the scaled stage as a clean, self-contained GPU layer so scrolling
     a container of scaled decks (e.g. the template-picker preview) translates the
     layer instead of re-rasterizing it — which otherwise leaves a faint hairline
     seam on near-black decks. Purely a compositing hint; no layout effect. */
  backface-visibility: hidden;
  background: var(--slide-bg, #fff);
  /* Hidden until the controller computes the fit transform, so mobile never
     flashes an unscaled 1920px stage before scaling. Revealed via .deck-ready
     (set in CONTROLLER_JS after the first fitStage); <noscript> + print restore it. */
  opacity: 0; transition: opacity 0.18s ease;
}
html.deck-ready .deck-stage { opacity: 1; }
.slide {
  position: absolute; inset: 0;
  width: 1920px; height: 1080px;
  overflow: hidden;
  display: block;
  visibility: hidden; opacity: 0; pointer-events: none;
  background: var(--slide-bg, #fff);
}
.slide.active, .slide.visible {
  visibility: visible; opacity: 1; pointer-events: auto; z-index: 1;
}
img, video, canvas, svg { max-width: 100%; max-height: 100%; }
@media print {
  html, body { width: 1920px; height: auto; overflow: visible; background: #fff; }
  .deck-viewport { position: static; overflow: visible; background: #fff; }
  .deck-stage { position: static; width: auto; height: auto; transform: none !important; background: none; opacity: 1 !important; }
  .slide {
    position: relative; display: block !important;
    visibility: visible !important; opacity: 1 !important; pointer-events: auto !important;
    width: 1920px; height: 1080px; break-after: page; page-break-after: always;
  }
  .slide:last-child { break-after: auto; page-break-after: auto; }
  .deck-chrome, .deck-notes { display: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.2s !important;
  }
}
`.trim()

/** Enter animations, reveal stagger, and deck chrome. Applies to every deck. */
export const DECK_BASE_CSS = `
/* === ENTER ANIMATIONS (per-slide data-transition) === */
.slide.visible { animation: deckFade 0.5s cubic-bezier(0.16,1,0.3,1) both; }
.slide[data-transition="slide"].visible { animation: deckSlideIn 0.55s cubic-bezier(0.16,1,0.3,1) both; }
.slide[data-transition="zoom"].visible { animation: deckZoomIn 0.55s cubic-bezier(0.16,1,0.3,1) both; }
.slide[data-transition="none"].visible { animation: none; }
@keyframes deckFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes deckSlideIn { from { opacity: 0; transform: translateX(56px); } to { opacity: 1; transform: none; } }
@keyframes deckZoomIn { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: none; } }

/* === REVEAL STAGGER ===
   Add class="reveal" to elements that should animate in once their slide is active. */
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1);
}
.slide.visible .reveal { opacity: 1; transform: translateY(0); }
.slide.visible .reveal:nth-child(1) { transition-delay: 0.10s; }
.slide.visible .reveal:nth-child(2) { transition-delay: 0.18s; }
.slide.visible .reveal:nth-child(3) { transition-delay: 0.26s; }
.slide.visible .reveal:nth-child(4) { transition-delay: 0.34s; }
.slide.visible .reveal:nth-child(5) { transition-delay: 0.42s; }
.slide.visible .reveal:nth-child(6) { transition-delay: 0.50s; }
.slide.visible .reveal:nth-child(7) { transition-delay: 0.58s; }
.slide.visible .reveal:nth-child(8) { transition-delay: 0.66s; }

/* === CLICK BUILDS ===
   data-build="N" reveals on the Nth advance before the deck moves on. */
[data-build] {
  opacity: 0 !important; transform: translateY(22px); pointer-events: none !important;
  transition: opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1);
}
[data-build].is-built { opacity: 1 !important; transform: none; pointer-events: auto !important; }
body.thumb [data-build] { opacity: 1 !important; transform: none; }
@media print {
  [data-build] { opacity: 1 !important; transform: none !important; }
  [data-deck-advance] { display: none !important; }
}

/* === DECK CHROME (progress + counter, outside the slide design) === */
.deck-chrome {
  position: fixed; left: 0; right: 0; bottom: 0;
  z-index: 1000; pointer-events: none;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.deck-progress {
  position: absolute; left: 0; bottom: 0; height: 3px;
  width: 0%; background: var(--accent, #ffffff);
  transition: width 0.35s cubic-bezier(0.16,1,0.3,1);
  opacity: 0.85;
}
/* Slide-independent: a neutral dark glass pill with white text reads on any
   deck (light or dark), so it never clashes with the slide's palette. */
.deck-counter {
  position: absolute; right: 18px; bottom: 14px;
  font-size: 13px; font-variant-numeric: tabular-nums; font-weight: 600;
  color: #fff; letter-spacing: 0.01em;
  background: rgba(15,18,26,0.55); padding: 4px 11px; border-radius: 999px;
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
}
body.thumb .deck-chrome { display: none; }

/* === SPEAKER NOTES OVERLAY (press S) === */
.deck-notes {
  position: fixed; left: 0; right: 0; bottom: 0;
  max-height: 38vh; overflow: auto; z-index: 1100;
  padding: 22px 28px;
  background: rgba(12,14,20,0.94); color: #f4f4f5;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 17px; line-height: 1.55;
  border-top: 1px solid rgba(255,255,255,0.12);
  transform: translateY(101%); transition: transform 0.3s ease;
}
.deck-notes.open { transform: translateY(0); }
.deck-notes-label {
  text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px;
  opacity: 0.5; margin-bottom: 8px;
}
body.thumb .deck-notes { display: none; }
`.trim()

/**
 * Phone-portrait reflow — the "slides behave like a responsive web page" layer.
 *
 * On a narrow viewport the fixed 1920×1080 stage stops being scaled-to-fit (which
 * makes each slide a tiny letterboxed card) and instead becomes a full-width,
 * vertically-scrolling document: every slide is a section, columns collapse to one,
 * type/spacing tokens drop to a phone scale, and absolute layout primitives flow.
 *
 * Gated by BOTH a width media query AND `html.deck-can-flow` (added by the controller
 * only for the standalone artifact — never for thumbnails or the in-app editor canvas,
 * which must keep the true scaled stage). So desktop, tablet, and landscape phones are
 * completely untouched; only a phone in portrait viewing the published artifact reflows.
 *
 * Token overrides are set on `.slide` (specificity beats `:root` tokens regardless of
 * source order) so the shared component vocabulary re-scales automatically.
 */
export const RESPONSIVE_MOBILE_CSS = `
@media (max-width: 640px) {
  /* Hard width containment at every level. Without this, ONE over-wide child (a flex
     bar-chart or wide table that won't shrink below its content) stretches the whole
     document past the screen, and then EVERY slide renders in an over-wide canvas and
     clips at the right edge. max-width:100vw + overflow-x:hidden caps the document, and
     min-width:0 on descendants lets flex/grid items shrink below their intrinsic
     content width (the classic min-content overflow). This is the structural fix. */
  html.deck-can-flow, html.deck-can-flow body {
    height: auto; overflow-x: hidden; overflow-y: visible;
    max-width: 100vw; background: var(--slide-bg, #fff);
  }
  html.deck-can-flow .deck-viewport { position: static; overflow-x: hidden; height: auto; max-width: 100vw; }
  html.deck-can-flow .deck-stage {
    position: static; width: 100%; max-width: 100vw; height: auto; overflow-x: hidden;
    transform: none !important; opacity: 1 !important;
  }
  html.deck-can-flow .slide * { min-width: 0; }
  html.deck-can-flow .slide {
    position: relative; inset: auto;
    width: 100%; max-width: 100vw; height: auto; min-height: 0;
    display: block; overflow: hidden;
    visibility: visible !important; opacity: 1 !important; pointer-events: auto !important;
    animation: none !important;
  }
  html.deck-can-flow .slide + .slide { border-top: 1px solid var(--card-border, rgba(0,0,0,0.10)); }
  /* No per-slide active state in scroll mode — reveal everything. */
  html.deck-can-flow .reveal,
  html.deck-can-flow [data-build] { opacity: 1 !important; transform: none !important; pointer-events: auto !important; }
  html.deck-can-flow [data-deck-advance] { display: none !important; }
  /* Present-mode chrome is meaningless in a scrolling document. */
  html.deck-can-flow .deck-chrome, html.deck-can-flow .deck-notes { display: none !important; }

  /* Re-scale the token system for a ~390px canvas (cascades to every component). */
  html.deck-can-flow .slide {
    --pad-x: 26px; --pad-y: 46px;
    --display-size: min(42px, 11.5vw); --title-size: min(38px, 10vw); --headline-size: min(29px, 8vw); --subhead-size: 24px;
    --section-size: min(42px, 11.5vw); --lead-size: 19px; --body-size: 18px; --bullet-size: 18px;
    --fine-size: 15px; --kicker-size: 13px; --kicker-tracking: 0.18em;
    --metric-size: min(52px, 14vw); --stat-size: min(44px, 12vw); --quote-size: min(28px, 7.5vw);
    --card-title-size: 23px; --card-body-size: 16px; --table-size: 15px;
    --col-gap: 26px; --card-gap: 16px; --stack: 18px; --gap: 18px;
    --bars-height: 200px; --donut-size: 168px; --donut-label-size: 36px;
    --cols: 1; /* collapses any bespoke grid that reads repeat(var(--cols),1fr) */
  }

  /* Direct fluid font-size caps for the shared type classes. These override the
     font-size PROPERTY with !important, so they beat per-element inline token
     overrides (e.g. style="--display-size:148px") that the token block above cannot.
     min(px, vw) keeps them at the cap on a normal phone and shrinks them on small ones. */
  html.deck-can-flow .display { font-size: min(42px, 11.5vw) !important; line-height: 1.04 !important; }
  html.deck-can-flow .title { font-size: min(38px, 10vw) !important; line-height: 1.05 !important; }
  html.deck-can-flow .headline { font-size: min(30px, 8vw) !important; }
  html.deck-can-flow .subhead { font-size: min(25px, 6.6vw) !important; }
  html.deck-can-flow .section-title { font-size: min(44px, 12vw) !important; line-height: 1.02 !important; }
  html.deck-can-flow .lead { font-size: min(20px, 5.2vw) !important; }
  html.deck-can-flow .quote { font-size: min(29px, 7.8vw) !important; }
  html.deck-can-flow .metric { font-size: min(54px, 14.5vw) !important; }
  html.deck-can-flow .stat-num { font-size: min(46px, 12.5vw) !important; }
  html.deck-can-flow .donut-label { font-size: min(36px, 9vw) !important; }

  /* Un-absolute the layout primitives so content flows top-to-bottom. */
  html.deck-can-flow .pad,
  html.deck-can-flow .section,
  html.deck-can-flow .split,
  html.deck-can-flow .hero,
  html.deck-can-flow .full-bleed { position: relative; inset: auto; }
  html.deck-can-flow .pad { min-height: 0; justify-content: flex-start; padding: var(--pad-y) var(--pad-x); }
  html.deck-can-flow .pad.center, html.deck-can-flow .pad.end { justify-content: flex-start; }

  /* Collapse every multi-column layout to a single column. */
  html.deck-can-flow .two-col,
  html.deck-can-flow .cols-2,
  html.deck-can-flow .cols-3,
  html.deck-can-flow .cols-4,
  html.deck-can-flow .cards { grid-template-columns: 1fr !important; gap: var(--card-gap); }
  html.deck-can-flow .row { flex-wrap: wrap; }
  /* Collapse every BESPOKE grid too: nearly all custom card/photo/number grids are
     repeat(var(--cols,N),1fr) with --cols set inline — one rule flattens them all. */
  html.deck-can-flow [style*="--cols"] { grid-template-columns: 1fr !important; }

  /* Un-absolute every top-level slide block. Bespoke section dividers and hero
     blocks use position:absolute;inset:0 and would otherwise drop out of flow and
     collapse the slide to ~0 height (divider vanishes). This brings them back. */
  html.deck-can-flow .slide > * { position: relative; inset: auto; }
  /* Give un-absoluted dividers/short blocks real presence instead of a thin seam. */
  html.deck-can-flow .slide { min-height: 200px; }

  /* Long words anywhere in a slide wrap instead of clipping at the narrow width. */
  html.deck-can-flow .slide :is(p, h1, h2, h3, h4, li, blockquote, figcaption,
    .display, .title, .headline, .subhead, .lead, .body, .card-title, .card-body,
    .quote, .metric, .stat-num) { overflow-wrap: break-word; }

  /* Split / hero: stack text and media vertically. */
  html.deck-can-flow .split, html.deck-can-flow .hero {
    display: flex; flex-direction: column; gap: var(--stack); padding: var(--pad-y) var(--pad-x);
  }
  html.deck-can-flow .split.reverse .split-text, html.deck-can-flow .hero.reverse .hero-text { order: 0; }
  html.deck-can-flow .split .media, html.deck-can-flow .hero .media, html.deck-can-flow .hero .bleed {
    height: auto; width: 100%; aspect-ratio: 16 / 10; border-radius: var(--radius, 16px);
  }
  html.deck-can-flow .hero-text { padding: 0; }

  /* Full-bleed cover: a real hero with image behind bottom-anchored text.
     (Fixed px, not vh — vh depends on the live viewport and is unreliable.) */
  html.deck-can-flow .full-bleed { min-height: 560px; display: flex; }
  html.deck-can-flow .full-bleed > .bleed { position: absolute; inset: 0; height: 100%; }
  html.deck-can-flow .full-bleed > .scrim { position: absolute; inset: 0; }
  html.deck-can-flow .full-bleed > .pad { position: relative; width: 100%; min-height: 560px; justify-content: flex-end; }

  /* Section dividers get vertical breathing room. */
  html.deck-can-flow .section { min-height: 380px; justify-content: center; padding: 72px var(--pad-x); }

  /* Stat rows stack with hairline separators. */
  html.deck-can-flow .stats { flex-direction: column; }
  html.deck-can-flow .stat { padding: 16px 0 !important; }
  html.deck-can-flow .stat:first-child { padding-top: 0 !important; }
  html.deck-can-flow .stat + .stat { border-left: 0; border-top: 1px solid var(--card-border, rgba(0,0,0,0.12)); }

  /* Arrow-flow stacks; rotate the connector to point down. */
  html.deck-can-flow .flow { flex-direction: column; align-items: stretch; }
  html.deck-can-flow .flow-arrow { width: 100%; height: 38px; transform: rotate(90deg); }

  /* Timeline rows stack label over text. */
  html.deck-can-flow .tl-row { grid-template-columns: 1fr; gap: 6px; }

  /* The running footer flows at the end of each slide, and wraps (brand + section
     label) instead of pushing the right-hand label off the screen edge. */
  html.deck-can-flow .runner { position: relative !important; left: auto; right: auto; bottom: auto; margin-top: 30px; flex-wrap: wrap; gap: 6px 14px; }
  html.deck-can-flow .runner-label { white-space: normal; overflow-wrap: anywhere; }

  /* Long words in big type wrap (at the word, no ugly mid-word hyphenation) rather
     than clip at phone width. */
  html.deck-can-flow .display, html.deck-can-flow .title, html.deck-can-flow .headline,
  html.deck-can-flow .subhead, html.deck-can-flow .section-title, html.deck-can-flow .quote,
  html.deck-can-flow .lead, html.deck-can-flow .metric, html.deck-can-flow .stat-num {
    overflow-wrap: break-word;
  }
  /* .lead/.body are capped at ~26-34ch for desktop measure; let them use full width. */
  html.deck-can-flow .lead, html.deck-can-flow .body { max-width: 100%; }

  /* Wide multi-column tables become a horizontally-scrollable block so NO column or
     header label is ever clipped/lost. Keeping the table's native layout (we do NOT
     force thead/tbody to width:100%, which would squish + truncate) plus nowrap cells
     means a too-wide table scrolls sideways; a table that fits just fills the width. */
  html.deck-can-flow .table {
    display: block; max-width: 100%;
    overflow-x: auto; -webkit-overflow-scrolling: touch;
  }
  html.deck-can-flow .table th, html.deck-can-flow .table td { white-space: nowrap; padding: 11px 12px; }
  html.deck-can-flow .table th { font-size: 12px; letter-spacing: 0.04em; }

  /* CSS bar charts shrink to fit the width (tiny gaps, no min bar width, small labels)
     so the last bar + its value never run off the right edge. */
  html.deck-can-flow .bars { gap: 8px !important; --bar-gap: 8px !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box; overflow: visible; }
  html.deck-can-flow .bars .bar { min-width: 0 !important; flex: 1 1 0 !important; }
  html.deck-can-flow .bar-fill::before { font-size: 15px !important; }
  html.deck-can-flow .bar-label { font-size: 13px !important; }

  /* Hard guarantee: headings wrap (break a word as a last resort) and nothing forces
     the page wider than the screen; stray overflow is clipped at the slide edge. */
  html.deck-can-flow .display, html.deck-can-flow .title, html.deck-can-flow .headline,
  html.deck-can-flow .section-title, html.deck-can-flow .subhead, html.deck-can-flow .quote {
    max-width: calc(100vw - 44px) !important;
    white-space: normal !important; overflow-wrap: break-word !important; text-wrap: wrap !important;
  }
  html.deck-can-flow .pad > *, html.deck-can-flow .split > *, html.deck-can-flow .hero > * { max-width: 100%; }
  html.deck-can-flow .media { width: 100%; }
  html.deck-can-flow .slide { overflow-x: hidden; }
}
`.trim()

/**
 * Deck controller. Plain browser JS as a string (no inner template literals so
 * the outer template stays clean). Reads `?thumb`, `?active`, `?present` and the
 * URL hash. Handles stage scaling, keyboard/wheel/touch nav, reveal animations,
 * speaker notes, and fullscreen.
 */
export const CONTROLLER_JS = `
(function () {
  var stage = document.getElementById('deckStage');
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var progress = document.getElementById('deckProgress');
  var counter = document.getElementById('deckCounter');
  var notesEl = document.getElementById('deckNotes');
  var notesBody = document.getElementById('deckNotesBody');
  if (!stage || slides.length === 0) return;

  var params = new URLSearchParams(window.location.search);
  var isThumb = params.has('thumb');
  if (isThumb) document.body.classList.add('thumb');
  var isEdit = params.has('edit'); // only the in-app editor canvas passes this

  // Phone-portrait artifacts reflow into a scrolling document (see RESPONSIVE_MOBILE_CSS).
  // Never for thumbnails or the editor canvas, which must keep the true scaled stage.
  var canFlow = !isThumb && !isEdit;
  var flowMQ = (canFlow && window.matchMedia) ? window.matchMedia('(max-width: 640px)') : null;
  function flowing() { return !!(flowMQ && flowMQ.matches); }
  if (canFlow) document.documentElement.classList.add('deck-can-flow');

  function clamp(i) { return Math.max(0, Math.min(i, slides.length - 1)); }

  function startIndex() {
    var fromHash = parseInt((window.location.hash || '').replace('#', ''), 10);
    if (!isNaN(fromHash)) return clamp(fromHash - 1);
    var fromParam = parseInt(params.get('active') || '', 10);
    if (!isNaN(fromParam)) return clamp(fromParam);
    return 0;
  }

  var current = startIndex();
  var buildState = {};

  function viewportSize() {
    // visualViewport tracks the true visible box on mobile Safari as the URL bar
    // shows/hides; innerWidth/innerHeight are the desktop + fallback path.
    var vv = window.visualViewport;
    return {
      w: (vv && vv.width) || window.innerWidth || document.documentElement.clientWidth,
      h: (vv && vv.height) || window.innerHeight || document.documentElement.clientHeight,
    };
  }

  function fitStage() {
    document.documentElement.classList.add('deck-ready');
    if (flowing()) {
      // Reflow mode: CSS lays slides out as a scrolling document; no stage transform.
      stage.style.transform = '';
      return;
    }
    var vp = viewportSize();
    var f = Math.min(vp.w / 1920, vp.h / 1080);
    var x = (vp.w - 1920 * f) / 2;
    var y = (vp.h - 1080 * f) / 2;
    stage.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + f + ')';
  }

  // Re-fit on viewport change; when crossing OUT of reflow mode (e.g. rotate to
  // landscape) restore the single active slide that scroll mode left all-visible.
  function relayout() {
    fitStage();
    if (!flowing()) show(current);
  }

  function renderNotes() {
    if (!notesEl || !notesBody) return;
    var note = slides[current].getAttribute('data-notes') || '';
    notesBody.textContent = note;
    notesEl.style.display = note ? '' : 'none';
  }

  function buildElements(index) {
    return Array.prototype.slice.call(slides[index].querySelectorAll('[data-build]'));
  }

  function maxBuild(index) {
    return buildElements(index).reduce(function (max, el) {
      var step = parseInt(el.getAttribute('data-build') || '1', 10);
      return Math.max(max, isNaN(step) ? 1 : step);
    }, 0);
  }

  function renderBuilds(index) {
    var step = isThumb ? Number.MAX_SAFE_INTEGER : (buildState[index] || 0);
    buildElements(index).forEach(function (el) {
      var at = parseInt(el.getAttribute('data-build') || '1', 10);
      var shown = step >= (isNaN(at) ? 1 : at);
      el.classList.toggle('is-built', shown);
      el.setAttribute('aria-hidden', shown ? 'false' : 'true');
    });
  }

  function emitSlideChange() {
    try {
      document.dispatchEvent(new CustomEvent('deck:slidechange', {
        detail: { index: current, slideId: slides[current].getAttribute('data-slide-id') || '', build: buildState[current] || 0 }
      }));
    } catch (e) {}
  }

  function show(index, requestedBuild) {
    current = clamp(index);
    if (typeof requestedBuild === 'number') buildState[current] = requestedBuild;
    if (typeof buildState[current] !== 'number') buildState[current] = 0;
    for (var i = 0; i < slides.length; i++) {
      var on = i === current;
      // Re-trigger the enter animation by toggling the class off then on.
      slides[i].classList.toggle('active', on);
      if (on) {
        slides[i].classList.remove('visible');
        // force reflow so the animation restarts
        void slides[i].offsetWidth;
        slides[i].classList.add('visible');
      } else {
        slides[i].classList.remove('visible');
      }
    }
    renderBuilds(current);
    if (progress) progress.style.width = ((current + 1) / slides.length * 100) + '%';
    if (counter) counter.textContent = (current + 1) + ' / ' + slides.length;
    if (!isThumb) {
      try { history.replaceState(null, '', '#' + (current + 1)); } catch (e) {}
      // Let an embedding editor (the Slides app) sync its rail selection.
      try { window.parent.postMessage({ type: 'deck:slide', index: current, total: slides.length }, '*'); } catch (e) {}
    }
    renderNotes();
    emitSlideChange();
  }

  function next() {
    var max = maxBuild(current);
    if ((buildState[current] || 0) < max) {
      buildState[current] = (buildState[current] || 0) + 1;
      renderBuilds(current); emitSlideChange(); return;
    }
    if (current < slides.length - 1) show(current + 1, 0);
  }
  function prev() {
    if ((buildState[current] || 0) > 0) {
      buildState[current] -= 1;
      renderBuilds(current); emitSlideChange(); return;
    }
    if (current > 0) show(current - 1, maxBuild(current - 1));
  }

  function toggleNotes() {
    if (!notesEl) return;
    notesEl.classList.toggle('open');
  }

  function requestHostFullscreen(fullscreen) {
    try {
      if (!window.top || window.top === window) return;
      window.top.postMessage({
        type: 'moldable:set-window-fullscreen',
        requestId: 'deck-fullscreen-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        fullscreen: fullscreen
      }, '*');
    } catch (e) {}
  }

  function toggleFullscreen() {
    var el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        try {
          var request = el.requestFullscreen();
          if (request && request.catch) request.catch(function () { requestHostFullscreen(true); });
          return;
        } catch (e) {}
      }
      requestHostFullscreen(true);
    } else if (document.exitFullscreen) {
      try {
        var exit = document.exitFullscreen();
        if (exit && exit.catch) exit.catch(function () { requestHostFullscreen(false); });
      } catch (e) {
        requestHostFullscreen(false);
      }
    }
  }

  function focusDeck() {
    if (isThumb) return;
    try { window.focus(); } catch (e) {}
    try {
      if (!stage.hasAttribute('tabindex')) stage.setAttribute('tabindex', '-1');
      if (document.activeElement !== stage && stage.focus) {
        stage.focus({ preventScroll: true });
      }
    } catch (e) {}
  }

  fitStage();
  window.addEventListener('resize', relayout);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', relayout);
    window.visualViewport.addEventListener('scroll', fitStage);
  }
  window.addEventListener('orientationchange', function () {
    relayout();
    // iOS reports stale viewport dimensions immediately after a rotate — re-fit.
    setTimeout(relayout, 120);
    setTimeout(relayout, 350);
  });
  // Crossing the phone-width breakpoint switches between scaled-stage and reflow.
  if (flowMQ && flowMQ.addEventListener) flowMQ.addEventListener('change', relayout);
  show(current);

  if (isThumb) return; // thumbnails are static, no interaction

  focusDeck();
  window.addEventListener('load', focusDeck);
  window.addEventListener('pageshow', focusDeck);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) focusDeck();
  });

  // Editor embedding: jump to a slide when the host rail asks.
  function cleanClassName(value) {
    if (typeof value !== 'string') return '';
    return value.split(/\\s+/).filter(function (part) {
      return /^[a-zA-Z0-9_-]+$/.test(part);
    }).join(' ');
  }

  function handleShortcutKey(key) {
    switch (key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ':
      case 'j': case 'l': next(); return true;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
      case 'k': case 'h': prev(); return true;
      case 'Home': show(0); return true;
      case 'End': show(slides.length - 1); return true;
      case 'f': case 'F': toggleFullscreen(); return true;
      case 's': case 'S': toggleNotes(); return true;
      default:
        if (/^[0-9]$/.test(key)) {
          var n = parseInt(key, 10);
          if (n >= 1 && n <= slides.length) { show(n - 1); return true; }
        }
        return false;
    }
  }

  function ownsInteraction(target) {
    return !!(target && target.closest && target.closest(
      'a,button,input,textarea,select,[contenteditable],[data-deck-interactive]'
    ));
  }

  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d && d.type === 'deck:goto' && typeof d.index === 'number') show(d.index);
    if (d && d.type === 'deck:key' && typeof d.key === 'string') handleShortcutKey(d.key);
    if (isEdit && d && d.type === 'deck:update-slide' && typeof d.slideId === 'string') {
      var slide = null;
      for (var i = 0; i < slides.length; i++) {
        if (slides[i].getAttribute('data-slide-id') === d.slideId) {
          slide = slides[i];
          break;
        }
      }
      if (!slide) return;

      var wasActive = slide.classList.contains('active');
      var wasVisible = slide.classList.contains('visible');
      var extraClass = cleanClassName(d.slideClass);
      slide.className = ('slide ' + extraClass).trim();
      slide.classList.toggle('active', wasActive);
      slide.classList.toggle('visible', wasVisible);
      slide.setAttribute('data-slide-id', d.slideId);
      slide.setAttribute('data-transition', typeof d.transition === 'string' ? d.transition : 'fade');
      if (typeof d.notes === 'string' && d.notes) slide.setAttribute('data-notes', d.notes);
      else slide.removeAttribute('data-notes');
      if (typeof d.bodyHtml === 'string') slide.innerHTML = d.bodyHtml;
      slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
      renderBuilds(current);
      fitStage();
      renderNotes();
      try { document.dispatchEvent(new CustomEvent('deck:slidepatch', { detail: { slideId: d.slideId } })); } catch (e) {}
    }
  });

  // Editor only: clicking an image tells the host (to open Assets and swap it).
  if (isEdit) {
    function imageFromClick(e) {
      var img = e.target && e.target.closest && e.target.closest('img');
      if (img) return img;
      if (!document.elementsFromPoint) return null;
      var stack = document.elementsFromPoint(e.clientX, e.clientY);
      for (var i = 0; i < stack.length; i++) {
        var el = stack[i];
        if (!el || !el.tagName) continue;
        if (String(el.tagName).toUpperCase() === 'IMG') return el;
        var nested = null;
        if (el.querySelectorAll) {
          var imgs = el.querySelectorAll('img');
          nested = imgs && imgs.length ? imgs[imgs.length - 1] : null;
        }
        if (nested) return nested;
      }
      return null;
    }

    document.addEventListener('click', function (e) {
      var img = imageFromClick(e);
      if (!img) return;
      e.preventDefault(); e.stopPropagation();
      try {
        window.parent.postMessage({
          type: 'deck:image-click',
          src: img.getAttribute('src') || '',
          slideIndex: current,
        }, '*');
      } catch (err) {}
    }, true);
  }

  document.addEventListener('keydown', function (e) {
    if (flowing()) return; // let arrows/space scroll the document natively
    if (ownsInteraction(e.target)) return;
    if (handleShortcutKey(e.key)) e.preventDefault();
  });

  // Authored, explicit desktop advance control (useful for build reveals). This
  // keeps the rest of the slide click-safe for charts, links, inputs, and embeds.
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest && e.target.closest('[data-deck-advance]');
    if (!trigger || flowing()) return;
    e.preventDefault();
    next();
  });

  // Mouse wheel (debounced) navigation.
  var wheelLock = false;
  window.addEventListener('wheel', function (e) {
    if (flowing()) return; // native scroll in reflow mode
    if (ownsInteraction(e.target)) return;
    if (Math.abs(e.deltaY) < 24) return;
    if (wheelLock) return;
    wheelLock = true;
    setTimeout(function () { wheelLock = false; }, 520);
    if (e.deltaY > 0) next(); else prev();
  }, { passive: true });

  // Touch swipe.
  var sx = 0, sy = 0, touchOwned = false;
  window.addEventListener('touchstart', function (e) {
    touchOwned = ownsInteraction(e.target);
    sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (flowing()) return; // native vertical scroll in reflow mode
    if (touchOwned) return;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  // Tap left/right thirds to navigate. Touch (coarse-pointer) devices only, so it
  // never fights desktop clicks or inline links. A real swipe moves the finger and
  // is handled by touchend above; a stationary tap falls through to this click.
  var coarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  if (coarsePointer) {
    window.addEventListener('click', function (e) {
      if (flowing()) return; // taps don't navigate in a scrolling document
      if (ownsInteraction(e.target)) return;
      if (e.clientX < viewportSize().w * 0.33) prev(); else next();
    });
  }
})();
`.trim()

const ALLOWED_TRANSITIONS: SlideTransition[] = ['fade', 'slide', 'zoom', 'none']

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;')
}

function sanitizeClassList(value: string | undefined): string {
  if (!value) return ''
  // Allow only safe class-token characters.
  return value
    .split(/\s+/)
    .filter((token) => /^[A-Za-z0-9_-]+$/.test(token))
    .join(' ')
}

function slideTransition(slide: Slide): SlideTransition {
  return slide.transition && ALLOWED_TRANSITIONS.includes(slide.transition)
    ? slide.transition
    : 'fade'
}

function renderSlide(slide: Slide, active: boolean): string {
  const extra = sanitizeClassList(slide.slideClass)
  const cls = ['slide', extra, active ? 'active visible' : '']
    .filter(Boolean)
    .join(' ')
  const notes = slide.notes ? ` data-notes="${escapeAttr(slide.notes)}"` : ''
  return `<section class="${cls}" data-slide-id="${escapeAttr(slide.id)}" data-transition="${slideTransition(slide)}"${notes}>
${slide.bodyHtml}
</section>`
}

function createNonce(): string {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

function httpsOrigins(values: string[] | undefined): string[] {
  const origins = new Set<string>()
  for (const value of values ?? []) {
    try {
      const url = new URL(value)
      if (url.protocol === 'https:') origins.add(url.origin)
    } catch {
      // Ignore malformed capability declarations.
    }
  }
  return [...origins]
}

function inlineScript(value: string | undefined): string {
  return (value ?? '').replace(/<\/script/gi, '<\\/script')
}

export interface ComposeOptions {
  /** Which slide is marked active in the static HTML (avoids first-paint flash). */
  activeIndex?: number
}

/**
 * Compose a deck into a complete, self-contained HTML document. The result is
 * byte-identical for preview and publish; only URL params change behaviour.
 */
export function composeDeckHtml(
  deck: Artifact,
  options: ComposeOptions = {},
): string {
  const nonce = createNonce()
  const activeIndex = Math.max(
    0,
    Math.min(options.activeIndex ?? 0, Math.max(0, deck.slides.length - 1)),
  )

  const fontLinks = (deck.theme.fontLinks ?? [])
    .filter((href) => typeof href === 'string' && /^https:\/\//.test(href))
    .map((href) => `  <link rel="stylesheet" href="${escapeAttr(href)}">`)
    .join('\n')

  const runtimeLibs = (deck.runtime?.libs ?? [])
    .filter((src) => typeof src === 'string' && /^https:\/\//.test(src))
    .map(
      (src) => `  <script nonce="${nonce}" src="${escapeAttr(src)}"></script>`,
    )
    .join('\n')
  const connectSrc = httpsOrigins(deck.runtime?.connectOrigins)
  const frameSrc = httpsOrigins(deck.runtime?.frameOrigins)
  const connectPolicy = deck.runtime
    ? ["'self'", ...connectSrc].join(' ')
    : "'none'"
  // Preserve legacy HTTPS embeds for static decks. Runtime decks declare their
  // iframe capability explicitly, so an empty list means no frames.
  const framePolicy = deck.runtime
    ? frameSrc.length
      ? `'self' ${frameSrc.join(' ')}`
      : "'none'"
    : 'https:'

  const stageBgRule = deck.theme.stageBg
    ? `:root { --stage-bg: ${escapeHtml(deck.theme.stageBg)}; }`
    : ''

  const slidesHtml = deck.slides.length
    ? deck.slides
        .map((slide, i) => renderSlide(slide, i === activeIndex))
        .join('\n')
    : `<section class="slide active visible"><div style="display:flex;height:100%;align-items:center;justify-content:center;font-family:ui-sans-serif,system-ui,sans-serif;color:#475569;font-size:34px;">This deck has no slides yet.</div></section>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: https:; script-src 'nonce-${nonce}'; connect-src ${connectPolicy}; frame-src ${framePolicy}; style-src 'self' 'unsafe-inline' https:; img-src http: https: data: blob:; font-src data: https:; media-src http: https: data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>${escapeHtml(deck.title || 'Presentation')}</title>
${fontLinks}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    ${stageBgRule}
    /* ===== MANDATORY FIXED-STAGE BASE ===== */
${VIEWPORT_BASE_CSS}
    /* ===== DECK BASE (animations, chrome, notes) ===== */
${DECK_BASE_CSS}
    /* ===== DECK THEME ===== */
${deck.theme.css ?? ''}
    /* ===== RESPONSIVE (phone-portrait artifact reflow) — must come last to win ===== */
${RESPONSIVE_MOBILE_CSS}
  </style>
  <noscript><style>.deck-stage{opacity:1}</style></noscript>
</head>
<body>
  <div class="deck-viewport">
    <main class="deck-stage" id="deckStage">
${slidesHtml}
    </main>
  </div>
  <div class="deck-chrome" aria-hidden="true">
    <div class="deck-progress" id="deckProgress"></div>
    <div class="deck-counter" id="deckCounter"></div>
  </div>
  <aside class="deck-notes" id="deckNotes" style="display:none">
    <div class="deck-notes-label">Speaker notes — press S to toggle</div>
    <div id="deckNotesBody"></div>
  </aside>
  <script nonce="${nonce}">
${CONTROLLER_JS}
  </script>
  <script nonce="${nonce}">
${RUNTIME_STATE_CLIENT_JS}
  </script>
${runtimeLibs}
  <script nonce="${nonce}">
${inlineScript(deck.runtime?.js)}
  </script>
</body>
</html>`
}

// ============================================================================
// PAGE ARTIFACTS — a single self-contained, scrolling, responsive web page.
//
// Unlike a deck (a fixed 1920×1080 stage scaled to fit), a page is a real
// document the author fully controls: free-form HTML/CSS/JS that can scroll,
// animate on scroll, run a game loop, or render a 3D scene. The renderer adds
// only a tiny, opt-in convenience layer (a reset, a scroll-reveal helper, and a
// scroll-progress variable) — everything else is the page's own design.
// ============================================================================

/** Minimal base layer for page artifacts. The page's own CSS comes after and
 * wins, so these are just sensible defaults + the opt-in `.reveal` mechanism. */
export const BASE_PAGE_CSS = `
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
html, body { margin: 0; padding: 0; }
body {
  min-height: 100%;
  background: var(--page-bg, #0b0b0f);
  color: #e7e7ea;
  font-family: var(--page-font, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif);
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
}
img, svg, video, canvas { max-width: 100%; }
img, video { height: auto; }
a { color: inherit; text-decoration: none; }
::selection { background: rgba(120,130,255,0.30); }

/* Scroll-reveal: add class="reveal" (optionally data-reveal="left|right|scale|none")
   to fade content in as it enters the viewport. The controller adds .in. */
.reveal {
  opacity: 0; transform: translateY(30px);
  transition: opacity 0.85s cubic-bezier(0.16,1,0.3,1), transform 0.85s cubic-bezier(0.16,1,0.3,1);
  will-change: opacity, transform;
}
.reveal.in { opacity: 1; transform: none; }
.reveal[data-reveal="left"] { transform: translateX(-38px); }
.reveal[data-reveal="right"] { transform: translateX(38px); }
.reveal[data-reveal="scale"] { transform: scale(0.93); }
.reveal[data-reveal="none"] { transform: none; }
.reveal.in[data-reveal] { transform: none; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
`.trim()

/** Page controller: scroll-reveal via IntersectionObserver + a global scroll
 * progress variable (`--scroll` 0→1, `--scroll-y` px) for scroll-driven effects. */
export const PAGE_CONTROLLER_JS = `
(function () {
  var docEl = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal, [data-reveal]'));
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }
  function onScroll() {
    var max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    var y = window.scrollY || window.pageYOffset || 0;
    docEl.style.setProperty('--scroll-y', y + 'px');
    docEl.style.setProperty('--scroll', Math.min(1, Math.max(0, y / max)).toFixed(4));
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
`.trim()

/** Content-Security-Policy for page artifacts. Deliberately permissive so
 * creative pages can load a pinned CDN library (three.js, etc.), run inline
 * scripts and a game loop, and use inline styles — the preview iframe is
 * sandboxed to an opaque origin, so the page still can't reach app APIs. */
const PAGE_CSP = [
  "default-src 'self' data: blob: https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
  "style-src 'self' 'unsafe-inline' https:",
  'img-src * data: blob:',
  'font-src data: https:',
  'connect-src https: data: blob:',
  'media-src * data: blob:',
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ')

/**
 * Compose a page artifact into a complete, self-contained HTML document.
 * Byte-identical for preview and publish.
 */
export function composePageHtml(
  artifact: Artifact,
  _options: ComposeOptions = {},
): string {
  const page: PageDoc = artifact.page ?? {
    fontLinks: [],
    libs: [],
    css: '',
    html: '',
    js: '',
  }

  const fontLinks = (page.fontLinks ?? [])
    .filter((href) => typeof href === 'string' && /^https:\/\//.test(href))
    .map((href) => `  <link rel="stylesheet" href="${escapeAttr(href)}">`)
    .join('\n')

  const libs = (page.libs ?? [])
    .filter((src) => typeof src === 'string' && /^https:\/\//.test(src))
    .map((src) => `  <script src="${escapeAttr(src)}"></script>`)
    .join('\n')

  const bgRule = page.background
    ? `:root { --page-bg: ${escapeHtml(page.background)}; }`
    : ''

  const description = artifact.subtitle?.trim()
  const descMeta = description
    ? `  <meta name="description" content="${escapeAttr(description)}">\n`
    : ''

  const bodyHtml = page.html?.trim()
    ? page.html
    : `<main style="min-height:100vh;display:grid;place-items:center;font-family:ui-sans-serif,system-ui,sans-serif;color:#9aa3b2;"><p>This page is empty. Ask the assistant to build it.</p></main>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="color-scheme" content="dark light">
  <meta http-equiv="Content-Security-Policy" content="${PAGE_CSP}">
  <title>${escapeHtml(artifact.title || 'Artifact')}</title>
${descMeta}${fontLinks}
  <style>
    /* ===== PAGE BASE (reset, reveal, reduced-motion) ===== */
${bgRule ? `    ${bgRule}\n` : ''}${BASE_PAGE_CSS}
    /* ===== PAGE STYLES (author-owned) ===== */
${page.css ?? ''}
  </style>
</head>
<body>
${bodyHtml}
${libs}
  <script>
${RUNTIME_STATE_CLIENT_JS}
  </script>
  <script>
${PAGE_CONTROLLER_JS}
  </script>
  <script>
${page.js ?? ''}
  </script>
</body>
</html>`
}

/** Render any artifact (deck or page) into a self-contained HTML document. */
export function composeArtifactHtml(
  artifact: Artifact,
  options: ComposeOptions = {},
): string {
  return artifact.kind === 'page'
    ? composePageHtml(artifact, options)
    : composeDeckHtml(artifact, options)
}
