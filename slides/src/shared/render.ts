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
import type { Deck, Slide, SlideTransition } from './types'

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
  background: var(--slide-bg, #fff);
}
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
  .deck-stage { position: static; width: auto; height: auto; transform: none !important; background: none; }
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

  function clamp(i) { return Math.max(0, Math.min(i, slides.length - 1)); }

  function startIndex() {
    var fromHash = parseInt((window.location.hash || '').replace('#', ''), 10);
    if (!isNaN(fromHash)) return clamp(fromHash - 1);
    var fromParam = parseInt(params.get('active') || '', 10);
    if (!isNaN(fromParam)) return clamp(fromParam);
    return 0;
  }

  var current = startIndex();

  function fitStage() {
    var f = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var x = (window.innerWidth - 1920 * f) / 2;
    var y = (window.innerHeight - 1080 * f) / 2;
    stage.style.transform = 'translate(' + x + 'px, ' + y + 'px) scale(' + f + ')';
  }

  function renderNotes() {
    if (!notesEl || !notesBody) return;
    var note = slides[current].getAttribute('data-notes') || '';
    notesBody.textContent = note;
    notesEl.style.display = note ? '' : 'none';
  }

  function show(index) {
    current = clamp(index);
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
    if (progress) progress.style.width = ((current + 1) / slides.length * 100) + '%';
    if (counter) counter.textContent = (current + 1) + ' / ' + slides.length;
    if (!isThumb) {
      try { history.replaceState(null, '', '#' + (current + 1)); } catch (e) {}
      // Let an embedding editor (the Slides app) sync its rail selection.
      try { window.parent.postMessage({ type: 'deck:slide', index: current, total: slides.length }, '*'); } catch (e) {}
    }
    renderNotes();
  }

  function next() { if (current < slides.length - 1) show(current + 1); }
  function prev() { if (current > 0) show(current - 1); }

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
  window.addEventListener('resize', fitStage);
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
      fitStage();
      renderNotes();
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
    if (e.target && (e.target.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || ''))) return;
    if (handleShortcutKey(e.key)) e.preventDefault();
  });

  // Mouse wheel (debounced) navigation.
  var wheelLock = false;
  window.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) < 24) return;
    if (wheelLock) return;
    wheelLock = true;
    setTimeout(function () { wheelLock = false; }, 520);
    if (e.deltaY > 0) next(); else prev();
  }, { passive: true });

  // Touch swipe.
  var sx = 0, sy = 0;
  window.addEventListener('touchstart', function (e) {
    sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next(); else prev();
    }
  }, { passive: true });

  // Tap right/left thirds to navigate (touch only).
  window.addEventListener('click', function (e) {
    if (e.target && e.target.closest && e.target.closest('a,button,[contenteditable],input,textarea')) return;
    // ignore; click-nav can fight inline links, so left to keys/swipe
  });
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

export interface ComposeOptions {
  /** Which slide is marked active in the static HTML (avoids first-paint flash). */
  activeIndex?: number
}

/**
 * Compose a deck into a complete, self-contained HTML document. The result is
 * byte-identical for preview and publish; only URL params change behaviour.
 */
export function composeDeckHtml(
  deck: Deck,
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: https:; script-src 'nonce-${nonce}'; connect-src 'none'; style-src 'self' 'unsafe-inline' https:; img-src http: https: data: blob:; font-src data: https:; media-src http: https: data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'">
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
  </style>
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
</body>
</html>`
}
