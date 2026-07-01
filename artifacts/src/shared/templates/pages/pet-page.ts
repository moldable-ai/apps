import type { Template } from '../types'

// "Meet My Pet" — an irresistibly cute, pastel personal page about a dog named
// Biscuit. Cream + peach + sky palette, rounded EVERYTHING, friendly Baloo 2 /
// Nunito type, bouncy hover/scroll transitions. Photos (assets/pet-1..3.jpg)
// each sit on a playful gradient fallback so a missing image still looks
// intentional. Pure CSS/SVG — emoji do the heavy lifting for icons.

const CSS = `
:root {
  --cream: #fff7ec;       /* page base */
  --cream-2: #fffdf8;     /* cards */
  --peach: #ffb38a;       /* warm accent */
  --peach-soft: #ffe2cf;
  --coral: #ff8f6b;
  --sky: #8fd3ff;         /* cool accent */
  --sky-soft: #d7f0ff;
  --mint: #a8e6c7;
  --butter: #ffe08a;
  --grape: #c9a8ff;
  --ink: #4a3b33;         /* warm brown text */
  --mut: #9a8478;
  --paw: #7a5c49;
  --r-xl: 42px;
  --r-lg: 30px;
  --r-md: 22px;
  --r-pill: 999px;
  --display: 'Baloo 2', system-ui, sans-serif;
  --body: 'Nunito', system-ui, sans-serif;
  --page-font: var(--body);
  --shadow: 0 22px 48px -22px rgba(120,80,50,0.42);
  --shadow-sm: 0 12px 28px -16px rgba(120,80,50,0.40);
}
body {
  background:
    radial-gradient(900px 520px at 88% -8%, rgba(143,211,255,0.30), transparent 60%),
    radial-gradient(820px 520px at 6% 4%, rgba(255,179,138,0.28), transparent 58%),
    var(--cream);
  color: var(--ink);
  font-family: var(--body);
  font-weight: 600;
  overflow-x: hidden;
}
.wrap { max-width: 1080px; margin: 0 auto; padding: clamp(20px, 4vw, 40px) clamp(16px, 4vw, 32px) 60px; }
.num { font-variant-numeric: tabular-nums; }
h1, h2, h3 { font-family: var(--display); margin: 0; line-height: 1; }
a { color: inherit; }

/* floating background blobs */
.blob { position: fixed; border-radius: 50%; filter: blur(6px); opacity: 0.5; pointer-events: none; z-index: 0; }
.blob.b1 { width: 120px; height: 120px; top: 14%; left: 4%; background: var(--peach-soft); animation: drift 9s ease-in-out infinite; }
.blob.b2 { width: 90px; height: 90px; top: 62%; right: 6%; background: var(--sky-soft); animation: drift 11s ease-in-out infinite reverse; }
.blob.b3 { width: 70px; height: 70px; bottom: 8%; left: 12%; background: rgba(168,230,199,0.6); animation: drift 8s ease-in-out infinite 1s; }
@keyframes drift { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-26px) translateX(14px); } }
.wrap, .footer { position: relative; z-index: 1; }

/* ===== HERO ===== */
.hero { text-align: center; padding: clamp(14px, 3vw, 26px) 0 clamp(20px, 4vw, 36px); }
.hello {
  display: inline-flex; align-items: center; gap: 9px;
  margin-bottom: clamp(10px, 1.8vw, 16px);
  background: var(--cream-2); border: 2px solid var(--peach-soft);
  color: var(--coral); font-family: var(--display); font-weight: 700;
  font-size: clamp(13px, 1.6vw, 15px); letter-spacing: 0.02em;
  padding: 8px 18px; border-radius: var(--r-pill); box-shadow: var(--shadow-sm);
}
.hello .wag { display: inline-block; animation: wag 1.4s ease-in-out infinite; transform-origin: 75% 75%; }
@keyframes wag { 0%,100% { transform: rotate(-14deg); } 50% { transform: rotate(14deg); } }

.name {
  font-family: var(--display); font-weight: 800;
  font-size: clamp(66px, 15.5vw, 140px); line-height: 0.9;
  letter-spacing: -0.02em; margin: clamp(6px, 1.4vw, 12px) 0 8px;
  background: linear-gradient(165deg, var(--coral) 0%, var(--peach) 40%, var(--grape) 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 6px 0 rgba(255,255,255,0.55);
  position: relative; display: block;
}
.name .pop { -webkit-text-fill-color: initial; }
.tagline {
  font-family: var(--display); font-weight: 600;
  font-size: clamp(17px, 2.6vw, 24px); color: var(--ink);
}
.tagline .em { color: var(--coral); }

/* hero photo in a rounded, tilted frame with gradient fallback */
.portrait {
  position: relative; width: clamp(220px, 56vw, 360px); aspect-ratio: 1 / 1;
  margin: clamp(22px, 4vw, 34px) auto clamp(8px, 2vw, 16px);
  border-radius: var(--r-xl);
  background: linear-gradient(150deg, var(--sky) 0%, var(--peach) 55%, var(--butter) 100%);
  padding: 12px; box-shadow: var(--shadow);
  transform: rotate(-2.4deg);
  transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
.portrait:hover { transform: rotate(0deg) scale(1.015); }
.portrait .ph {
  width: 100%; height: 100%; border-radius: calc(var(--r-xl) - 12px);
  overflow: hidden; position: relative;
  background:
    radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,0.5), transparent 50%),
    linear-gradient(150deg, var(--peach) 0%, var(--coral) 55%, var(--grape) 100%);
  display: grid; place-items: center;
}
.portrait .ph img { width: 100%; height: 100%; object-fit: cover; display: block; position: relative; z-index: 1; }
.portrait .ph .ghost { position: absolute; inset: 0; display: grid; place-items: center; font-size: clamp(70px, 22vw, 140px); z-index: 0; }
.portrait .badge {
  position: absolute; bottom: -22px; right: -18px; z-index: 3;
  background: var(--cream-2); border: 3px solid var(--mint);
  border-radius: var(--r-pill); padding: 9px 16px;
  font-family: var(--display); font-weight: 700; font-size: clamp(13px, 1.7vw, 15px);
  color: var(--ink); box-shadow: var(--shadow-sm);
  white-space: nowrap;
  display: inline-flex; align-items: center; gap: 7px;
  animation: bob 3s ease-in-out infinite;
}
.float-emoji { position: absolute; font-size: clamp(26px, 5vw, 40px); pointer-events: none; }
.float-emoji.e1 { top: 4%; left: 8%; animation: bob 3.2s ease-in-out infinite; }
.float-emoji.e2 { top: 16%; right: 6%; animation: bob 2.7s ease-in-out infinite 0.4s; }
.float-emoji.e3 { bottom: 8%; left: 4%; animation: bob 3.6s ease-in-out infinite 0.8s; }
@keyframes bob { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-12px) rotate(4deg); } }

/* ===== shared card ===== */
.card {
  background: var(--cream-2); border: 2px solid #fff;
  border-radius: var(--r-lg); padding: clamp(22px, 3.4vw, 34px);
  box-shadow: var(--shadow); margin-top: clamp(22px, 4vw, 34px);
  position: relative; overflow: hidden;
}
.card::after { content: ''; position: absolute; inset: 0; border-radius: inherit; border: 2px solid rgba(255,255,255,0.7); pointer-events: none; }
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--display); font-weight: 700; color: var(--coral);
  font-size: clamp(13px, 1.7vw, 15px); letter-spacing: 0.04em; text-transform: uppercase;
}
.card h2 { font-size: clamp(28px, 5vw, 44px); font-weight: 800; margin: 10px 0 6px; letter-spacing: -0.01em; }
.lede { color: var(--mut); font-size: clamp(15px, 2vw, 18px); font-weight: 600; max-width: 56ch; line-height: 1.5; }

/* ===== about: stat chips ===== */
.chips { display: flex; flex-wrap: wrap; gap: 12px; margin-top: clamp(18px, 2.6vw, 24px); }
.chip {
  display: inline-flex; align-items: center; gap: 11px;
  background: var(--cream); border: 2px solid var(--peach-soft);
  border-radius: var(--r-pill); padding: 10px 18px 10px 12px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, background 0.3s;
}
.chip:hover { transform: translateY(-4px) rotate(-1.5deg); border-color: var(--coral); background: #fff; }
.chip .ic {
  width: 40px; height: 40px; flex: none; border-radius: var(--r-pill);
  display: grid; place-items: center; font-size: 21px;
  background: var(--sky-soft);
}
.chip:nth-child(2) .ic { background: var(--peach-soft); }
.chip:nth-child(3) .ic { background: rgba(168,230,199,0.5); }
.chip:nth-child(4) .ic { background: rgba(201,168,255,0.32); }
.chip .meta { display: flex; flex-direction: column; line-height: 1.15; }
.chip .meta .k { font-size: 11.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mut); }
.chip .meta .v { font-family: var(--display); font-weight: 700; font-size: 17px; color: var(--ink); }

/* ===== favorite things grid ===== */
.faves { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(12px, 1.8vw, 18px); margin-top: clamp(18px, 2.6vw, 24px); }
.fave {
  border-radius: var(--r-md); padding: clamp(18px, 2.6vw, 26px) 16px;
  text-align: center; border: 2px solid #fff;
  transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s;
  box-shadow: var(--shadow-sm);
}
.fave:hover { transform: translateY(-7px) scale(1.03); box-shadow: var(--shadow); }
.fave.f1 { background: linear-gradient(160deg, #fff, var(--sky-soft)); }
.fave.f2 { background: linear-gradient(160deg, #fff, var(--peach-soft)); }
.fave.f3 { background: linear-gradient(160deg, #fff, rgba(168,230,199,0.5)); }
.fave.f4 { background: linear-gradient(160deg, #fff, rgba(255,224,138,0.5)); }
.fave .big {
  font-size: clamp(38px, 7vw, 54px); line-height: 1; display: block;
  transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
}
.fave:hover .big { transform: scale(1.18) rotate(-8deg); }
.fave .t { font-family: var(--display); font-weight: 700; font-size: clamp(15px, 2vw, 18px); margin-top: 12px; }
.fave .d { color: var(--mut); font-size: 13px; font-weight: 600; margin-top: 3px; }

/* ===== gallery ===== */
.gallery { display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 1fr; gap: clamp(10px, 1.6vw, 16px); margin-top: clamp(18px, 2.6vw, 24px); }
.tile {
  position: relative; border-radius: var(--r-md); overflow: hidden;
  aspect-ratio: 1 / 1; box-shadow: var(--shadow-sm);
  transition: transform 0.45s cubic-bezier(0.34,1.56,0.64,1);
}
.tile:hover { transform: scale(1.04) rotate(1deg); z-index: 2; }
.tile.wide { grid-column: span 2; aspect-ratio: 2 / 1; }
.tile img { width: 100%; height: 100%; object-fit: cover; display: block; position: relative; z-index: 1; }
.tile .ghost { position: absolute; inset: 0; display: grid; place-items: center; font-size: clamp(40px, 9vw, 72px); z-index: 0; }
.tile.g1 { background: linear-gradient(150deg, var(--sky), var(--grape)); }
.tile.g2 { background: linear-gradient(150deg, var(--peach), var(--coral)); }
.tile.g3 { background: linear-gradient(150deg, var(--butter), var(--peach)); }
.tile.g4 { background: linear-gradient(150deg, var(--mint), var(--sky)); }
.tile .cap {
  position: absolute; left: 10px; bottom: 10px; z-index: 2;
  background: rgba(255,255,255,0.92); color: var(--ink);
  font-family: var(--display); font-weight: 700; font-size: 12.5px;
  padding: 5px 12px; border-radius: var(--r-pill); box-shadow: var(--shadow-sm);
}

/* ===== schedule timeline ===== */
.timeline { margin-top: clamp(18px, 2.6vw, 24px); position: relative; padding-left: 8px; }
.timeline::before { content: ''; position: absolute; left: 31px; top: 14px; bottom: 14px; width: 3px; border-radius: 3px;
  background: repeating-linear-gradient(180deg, var(--peach-soft) 0 9px, transparent 9px 18px); }
.tl-item { display: flex; align-items: center; gap: 18px; padding: 11px 0; position: relative; }
.tl-item .time {
  width: 50px; height: 50px; flex: none; border-radius: var(--r-pill);
  display: grid; place-items: center; font-size: 23px;
  background: var(--cream-2); border: 3px solid var(--sky-soft); box-shadow: var(--shadow-sm);
  position: relative; z-index: 1;
  transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
}
.tl-item:hover .time { transform: scale(1.12) rotate(-6deg); }
.tl-item:nth-child(even) .time { border-color: var(--peach-soft); }
.tl-item .body { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.tl-item .clock { font-family: var(--display); font-weight: 800; font-size: clamp(16px, 2.2vw, 20px); color: var(--coral); min-width: 78px; }
.tl-item .act { font-weight: 700; font-size: clamp(15px, 2vw, 18px); }
.tl-item .note { color: var(--mut); font-size: 13.5px; font-weight: 600; }

/* ===== footer ===== */
.footer {
  margin-top: clamp(34px, 6vw, 56px); text-align: center;
  padding: clamp(34px, 6vw, 54px) clamp(16px, 4vw, 32px) clamp(40px, 7vw, 64px);
  background:
    radial-gradient(700px 300px at 50% 120%, rgba(255,179,138,0.35), transparent 60%),
    linear-gradient(180deg, transparent, rgba(143,211,255,0.16));
  border-top: 2px dashed var(--peach-soft);
}
.tail { font-size: clamp(46px, 12vw, 80px); display: inline-block; transform-origin: 18% 80%; animation: tailwag 0.8s ease-in-out infinite; }
@keyframes tailwag { 0%,100% { transform: rotate(-16deg); } 50% { transform: rotate(16deg); } }
.footer h2 { font-size: clamp(28px, 6vw, 46px); font-weight: 800; margin: 8px 0 4px; }
.footer p { color: var(--mut); font-weight: 600; font-size: clamp(14px, 2vw, 16px); margin: 0 auto; max-width: 40ch; }
.socials { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; margin-top: clamp(18px, 3vw, 26px); }
.social {
  display: inline-flex; align-items: center; gap: 9px;
  background: var(--cream-2); border: 2px solid var(--peach-soft);
  border-radius: var(--r-pill); padding: 11px 20px;
  font-family: var(--display); font-weight: 700; font-size: 15px; color: var(--ink);
  text-decoration: none; box-shadow: var(--shadow-sm);
  transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), border-color 0.3s, background 0.3s;
}
.social:hover { transform: translateY(-4px); border-color: var(--coral); background: #fff; }
.social:focus-visible { outline: 3px solid var(--sky); outline-offset: 3px; }
.paws { margin-top: clamp(18px, 3vw, 24px); font-size: 16px; letter-spacing: 0.5em; color: var(--paw); opacity: 0.55; }

/* reveal motion (keys off renderer's .reveal.in) */
.reveal { transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.34,1.4,0.5,1); }

@media (max-width: 820px) {
  .faves { grid-template-columns: repeat(2, 1fr); }
  .gallery { grid-template-columns: repeat(2, 1fr); }
  .tile.wide { grid-column: span 2; aspect-ratio: 2 / 1; }
}
@media (max-width: 540px) {
  .chips { gap: 10px; }
  .chip { width: 100%; }
  .tl-item { gap: 12px; }
  .tl-item .body { gap: 4px 10px; }
  .tl-item .clock { min-width: 66px; }
  .tile.wide { grid-column: span 2; }
  .float-emoji.e3 { display: none; }
}
`.trim()

const HTML = `
<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>

<div class="wrap">

  <header class="hero">
    <span class="hello reveal" data-reveal="none"><span class="wag">🐾</span> Hello, hooman! My name is</span>

    <h1 class="name reveal" data-reveal="scale">Biscuit</h1>

    <p class="tagline reveal">Professional <span class="em">treat enthusiast</span> &amp; full-time good boy 🐾</p>

    <div class="portrait reveal" data-reveal="scale">
      <span class="float-emoji e1">🦴</span>
      <span class="float-emoji e2">✨</span>
      <span class="float-emoji e3">🐶</span>
      <div class="ph">
        <span class="ghost" aria-hidden="true">🐕</span>
        <img src="assets/pet-1.jpg" alt="Biscuit, a happy golden dog, smiling at the camera">
      </div>
      <span class="badge">⭐ 5-star napper</span>
    </div>
  </header>

  <section class="card reveal">
    <span class="eyebrow">🐶 About me</span>
    <h2>A little about this very good boy</h2>
    <p class="lede">I’m a sunshine-colored goofball who believes every walk is an adventure, every box is a bed, and every human is a friend I just haven’t sniffed yet.</p>
    <div class="chips">
      <span class="chip"><span class="ic">🐕</span><span class="meta"><span class="k">Breed</span><span class="v">Golden Retriever</span></span></span>
      <span class="chip"><span class="ic">🎂</span><span class="meta"><span class="k">Age</span><span class="v num">3 years</span></span></span>
      <span class="chip"><span class="ic">⚖️</span><span class="meta"><span class="k">Weight</span><span class="v num">31 kg</span></span></span>
      <span class="chip"><span class="ic">🧸</span><span class="meta"><span class="k">Favorite toy</span><span class="v">Mr. Squeaky</span></span></span>
    </div>
  </section>

  <section class="card reveal">
    <span class="eyebrow">💛 My favorite things</span>
    <h2>The very best things in life</h2>
    <div class="faves">
      <div class="fave f1"><span class="big">🚶</span><div class="t">Big walks</div><div class="d">Sniff everything</div></div>
      <div class="fave f2"><span class="big">😴</span><div class="t">Sunbeam naps</div><div class="d">14 hrs / day</div></div>
      <div class="fave f3"><span class="big">🍖</span><div class="t">Snack o’clock</div><div class="d">Always o’clock</div></div>
      <div class="fave f4"><span class="big">📬</span><div class="t">The mailman</div><div class="d">My nemesis</div></div>
    </div>
  </section>

  <section class="card reveal">
    <span class="eyebrow">📸 Photo album</span>
    <h2>Caught being adorable</h2>
    <div class="gallery">
      <div class="tile wide g1">
        <span class="ghost" aria-hidden="true">🐾</span>
        <img src="assets/pet-2.jpg" alt="Biscuit mid-zoomies in a sunny green park">
        <span class="cap">Zoomies o’clock</span>
      </div>
      <div class="tile g2">
        <span class="ghost" aria-hidden="true">🦴</span>
        <img src="assets/pet-3.jpg" alt="Biscuit curled up asleep with a favorite toy">
        <span class="cap">Tuckered out</span>
      </div>
      <div class="tile g3"><span class="ghost" aria-hidden="true">🥏</span><span class="cap">Frisbee champ</span></div>
      <div class="tile g4"><span class="ghost" aria-hidden="true">💦</span><span class="cap">Puddle hunter</span></div>
      <div class="tile g1"><span class="ghost" aria-hidden="true">😋</span><span class="cap">Treat o’clock</span></div>
    </div>
  </section>

  <section class="card reveal">
    <span class="eyebrow">⏰ A day in the life</span>
    <h2>Biscuit’s daily schedule</h2>
    <div class="timeline">
      <div class="tl-item"><span class="time">🌅</span><div class="body"><span class="clock num">6:30 am</span><span class="act">Wake the humans</span><span class="note">Gentle paw to the face, every single day</span></div></div>
      <div class="tl-item"><span class="time">🥣</span><div class="body"><span class="clock num">7:00 am</span><span class="act">Breakfast feast</span><span class="note">Inhaled in 9 seconds flat</span></div></div>
      <div class="tl-item"><span class="time">🌳</span><div class="body"><span class="clock num">9:00 am</span><span class="act">Morning patrol</span><span class="note">Sniff the whole neighborhood twice</span></div></div>
      <div class="tl-item"><span class="time">😴</span><div class="body"><span class="clock num">12:00 pm</span><span class="act">Sunbeam siesta</span><span class="note">Find the warmest square of floor</span></div></div>
      <div class="tl-item"><span class="time">🎾</span><div class="body"><span class="clock num">4:00 pm</span><span class="act">Fetch championship</span><span class="note">I always win (I keep the ball)</span></div></div>
      <div class="tl-item"><span class="time">🌙</span><div class="body"><span class="clock num">9:00 pm</span><span class="act">Belly-rub o’clock</span><span class="note">Then a long, contented sigh</span></div></div>
    </div>
  </section>

</div>

<footer class="footer reveal">
  <div class="tail" aria-hidden="true">🐕</div>
  <h2>Follow Biscuit!</h2>
  <p>For daily zoomies, treat reviews, and an unreasonable number of tennis balls.</p>
  <div class="socials">
    <a class="social" href="#" aria-label="Biscuit on Instagram">📸 @biscuit.thegoodboy</a>
    <a class="social" href="#" aria-label="Biscuit's adventure map">🗺️ Adventure log</a>
    <a class="social" href="#" aria-label="Send Biscuit a treat">🦴 Send a treat</a>
  </div>
  <div class="paws" aria-hidden="true">🐾 🐾 🐾 🐾 🐾</div>
</footer>
`.trim()

const JS = `
// Tiny sprinkle of paw prints when you click anywhere — pure DOM, no libs.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('a')) return; // don't fight links
    var p = document.createElement('span');
    p.textContent = '🐾';
    p.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY +
      'px;transform:translate(-50%,-50%) scale(0.6) rotate(' + ((Math.random() * 60 - 30) | 0) +
      'deg);font-size:24px;pointer-events:none;z-index:9999;opacity:0.95;transition:transform 0.7s cubic-bezier(0.22,1,0.36,1),opacity 0.7s ease;';
    document.body.appendChild(p);
    requestAnimationFrame(function () {
      p.style.transform = 'translate(-50%,-50%) scale(1.1) translateY(-28px) rotate(' + ((Math.random() * 60 - 30) | 0) + 'deg)';
      p.style.opacity = '0';
    });
    setTimeout(function () { p.remove(); }, 760);
  }, { passive: true });
})();

// Hide a photo's emoji ghost only once its image truly loads, so a missing
// or broken image gracefully falls back to the playful gradient + emoji.
(function () {
  var imgs = Array.prototype.slice.call(document.querySelectorAll('.ph img, .tile img'));
  imgs.forEach(function (img) {
    function fail() { img.style.display = 'none'; }
    if (img.complete && img.naturalWidth === 0) fail();
    img.addEventListener('error', fail);
  });
})();
`.trim()

export const petPage: Template = {
  id: 'pet-page',
  kind: 'page',
  name: 'Meet My Pet',
  tagline: 'An adorable page all about a pet',
  categories: ['Personal'],
  audiences: ['personal', 'family', 'fun'],
  description:
    'An irresistibly cute, pastel personal page celebrating a pet — built here for Biscuit the golden retriever. A huge rounded name in a peach→grape gradient sits above a tilted hero photo with bouncing emoji, an "About me" card with fun-fact stat chips, a colorful "favorite things" grid, a photo album, and an emoji timeline of a day in the life, all on cream + peach + sky with rounded everything and springy hover/scroll motion. Swap the photos and copy to make it about your own best friend.',
  fonts: {
    display: 'Baloo 2',
    body: 'Nunito',
    links: [
      'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@600;700;800&display=swap',
    ],
  },
  stageBg: '#fff7ec',
  assets: ['pet-1.jpg', 'pet-2.jpg', 'pet-3.jpg'],
  notes:
    'Pure CSS/SVG + emoji — no chart or animation libraries. PALETTE knobs live in :root: --cream / --cream-2 (base + cards), the warm accents --peach / --coral / --butter, the cool accents --sky / --mint / --grape, and text --ink / --mut. Round-ness is controlled by --r-xl / --r-lg / --r-md / --r-pill — lower them for a less bubbly feel. Type is Baloo 2 (display) + Nunito (body); keep both for the friendly look. PHOTOS: the hero is assets/pet-1.jpg inside `.portrait .ph`, and the album uses assets/pet-2.jpg (the wide tile) and assets/pet-3.jpg; every photo container has a gradient + emoji `.ghost` fallback, and page.js hides a broken/missing img so the fallback shows — so it always looks intentional. To add a stat, copy a `.chip`; a favorite thing, copy a `.fave` (.f1–.f4 set the gradient); a timeline row, copy a `.tl-item` (first emoji is the icon). Click anywhere for a playful paw-print sprinkle (auto-disabled under prefers-reduced-motion). Rename the pet by editing the `.name` h1, the `.hello` line, and the footer.',
  samplePage: {
    fontLinks: [
      'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@600;700;800&display=swap',
    ],
    libs: [],
    css: CSS,
    html: HTML,
    js: JS,
    background: '#fff7ec',
  },
}
