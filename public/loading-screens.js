// THE LOADING SCREEN: runs before Phaser. Picks one of the screens (never the same twice in a row), fills in its
// backdrop, hero, name and colours, turns the tips, and runs its particles until BootScene fades it out.
// Art: tools/sprites/loading_screens.py -> assets/ui/loading/<id>_bg.png + <id>_hero.png. Styles: index.html.
(() => {
  // a: the main accent, b: the hero's offset shadow; hx / hh / hb = the hero's centre x, height and floor (% of the screen); fx = its particles
  const screens = [
    { id: 'roster', name: 'OPERATION REBIRTH', place: 'EVERY FIGHT IS A SECOND CHANCE', lore: 'Lacy, Soul Summoner and Mr Wake. Three who came back wrong - and came back fighting.', a: '#ffb24a', b: '#7a2aa8', fx: 'embers', hx: 64, hh: 62, hb: 9 },
    { id: 'soul-summoner', name: 'SOUL SUMMONER', place: 'THE SKY SANCTUM', lore: 'He calls his fallen friends by name, and they answer in blue fire.', a: '#ffd86a', b: '#1a6a9a', fx: 'souls', hx: 68, hh: 62, hb: 7 },
    { id: 'mr-wake', name: 'MR WAKE', place: 'GRAVEMOON BRIDGE', lore: 'Beneath the bridge the dark water has eyes. He taught them to blink.', a: '#c89aff', b: '#3a1060', fx: 'wisps', hx: 64, hh: 58, hb: 9 },
    { id: 'hero-knight', name: 'LACY', place: 'THE LAST OATH', lore: 'The kingdom fell. The oath did not.', a: '#ff9a4a', b: '#5a0a1a', fx: 'embers', hx: 66, hh: 78, hb: 6 },
    { id: 'nu', name: 'NU', place: 'THE MAIN STAGE', lore: 'Every fight becomes a show. Every show ends in an encore.', a: '#ff5ae0', b: '#1ad8ff', fx: 'confetti', hx: 66, hh: 78, hb: 6 },
    { id: 'aero', name: 'AERO', place: 'AERO MEADOW', lore: 'A living world inside a forgotten desktop - and one goldfish who refuses to be closed.', a: '#5ae0ff', b: '#1a6ad0', fx: 'bubbles', hx: 66, hh: 74, hb: 7 },
    { id: 'gnash', name: 'GNASH', place: 'AFTER HOURS', lore: 'He drags the axe so you hear him coming. It never helps.', a: '#c8ff3a', b: '#ff2a9a', fx: 'rain', hx: 66, hh: 84, hb: 5 },
    { id: 'hanz', name: 'HANZ & $@L', place: 'THE TRUE SHOPKEEPER', lore: 'Two halves of one man behind one counter. The shop is open. Nobody remembers coming in.', a: '#ff4a6a', b: '#d2d0cc', fx: 'glitch', hx: 66, hh: 80, hb: 4 },
  ];
  const tips = [
    'Your LIMIT gauge fills as you take damage. When it\'s full, press O to unleash your Limit.',
    'Every fighter has a taunt: press 1 (or click a stick). Taunting mid-fight is a choice.',
    'Items drop mid-match. Not every Mystery Box wants to help you.',
    'Stages float in the sky - watch for each stage\'s hazard warning before it hits.',
    'Bosses have weak points. Hits there do more and earn a better grade.',
    'Beat a boss on HARD or NIGHTMARE to open its arena for VS.',
    'CLASSIC: six fights, a boss, and an ending for every fighter.',
    'The shopkeeper knows codes. Some of them open whole stages.',
    'Knockback grows with damage: the higher your %, the further you fly.',
    'Fast-fall by pressing down in the air - it gets you back to the fight sooner.',
    'They say the true shopkeeper doesn\'t like being poked. Some customers never stop.',
    'Grab your opponent and throw them off the edge - it doesn\'t care how big their shield is.',
  ];
  const root = document.getElementById('loading'); if (!root) return;
  let previous = -1;
  try { const saved = localStorage.getItem('rebirth.loading.previous'); if (saved !== null) previous = Number(saved); } catch {}
  const valid = Number.isInteger(previous) && previous >= 0 && previous < screens.length;
  const forced = (location.search.match(/[?&]loading=([\w-]+)/) || [])[1];
  let index = valid ? (previous + 1 + Math.floor(Math.random() * (screens.length - 1))) % screens.length : Math.floor(Math.random() * screens.length);
  if (forced && screens.some((s) => s.id === forced)) index = screens.findIndex((s) => s.id === forced);
  const S = screens[index];
  try { localStorage.setItem('rebirth.loading.previous', String(index)); } catch {}
  const $ = (q) => root.querySelector(q);
  root.dataset.screen = S.id; root.setAttribute('aria-label', 'Loading Operation REBIRTH - ' + S.name);
  root.style.setProperty('--a', S.a); root.style.setProperty('--b', S.b);
  root.style.setProperty('--hx', S.hx + '%'); root.style.setProperty('--hh', S.hh + '%'); root.style.setProperty('--hb', S.hb + '%');
  $('.ls-bg').src = 'assets/ui/loading/' + S.id + '_bg.png';
  const hero = $('.ls-hero'); hero.src = 'assets/ui/loading/' + S.id + '_hero.png'; hero.alt = S.name;
  $('.ls-name').textContent = S.name; $('.ls-place').textContent = S.place; $('.ls-lore').textContent = S.lore;

  // the tips turn every few seconds
  const tipEl = document.getElementById('ls-tip-text');
  let t = Math.floor(Math.random() * tips.length);
  const showTip = () => { tipEl.textContent = tips[t % tips.length]; t++; };
  showTip();
  const tipTimer = setInterval(() => { tipEl.classList.add('out'); setTimeout(() => { showTip(); tipEl.classList.remove('out'); }, 350); }, 4800);

  // the particles: drawn on a 320x180 canvas shown pixelated, so they're as chunky as the art
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cv = $('.ls-fx'), g = cv.getContext('2d');
  const W = 320, H = 180, P = [], R = Math.random;
  const KIND = {
    embers: { n: 60, make: () => ({ x: R() * W, y: H + R() * 20, vx: (R() - 0.5) * 0.3, vy: -0.4 - R() * 0.8, c: R() < 0.5 ? '#ffb24a' : '#ff6a2a', s: R() < 0.2 ? 2 : 1 }) },
    souls: { n: 40, make: () => ({ x: R() * W, y: H + R() * 20, vx: 0, vy: -0.3 - R() * 0.5, c: R() < 0.6 ? '#6ad8ff' : '#e8f8ff', s: R() < 0.3 ? 2 : 1, wob: R() * 6 }) },
    wisps: { n: 36, make: () => ({ x: R() * W, y: H + R() * 20, vx: 0.15, vy: -0.25 - R() * 0.35, c: R() < 0.5 ? '#b88aff' : '#e8d8ff', s: R() < 0.3 ? 2 : 1, wob: R() * 6 }) },
    confetti: { n: 70, make: () => ({ x: R() * W, y: -R() * H, vx: (R() - 0.5) * 0.6, vy: 0.4 + R() * 0.7, c: ['#ff5ae0', '#1ad8ff', '#ffe84a', '#ffffff'][Math.floor(R() * 4)], s: 2, spin: R() * 6 }) },
    bubbles: { n: 26, make: () => ({ x: R() * W, y: H + R() * 30, vx: 0, vy: -0.3 - R() * 0.4, c: '#ffffff', r: 2 + R() * 5, wob: R() * 6 }) },
    rain: { n: 90, make: () => ({ x: R() * W * 1.2, y: -R() * H, vx: -0.9, vy: 3.2 + R() * 1.5, c: R() < 0.5 ? '#ff4ab8' : '#3af0ff', s: 1 }) },
    glitch: { n: 18, make: () => ({ x: R() * W, y: R() * H, vx: 0, vy: 0, c: ['#ff2a3a', '#d2d0cc', '#2fd6c6', '#ff7ab8'][Math.floor(R() * 4)], w: 4 + R() * 30, h: 1 + R() * 3, life: 6 + R() * 24 }) },
  };
  const K = KIND[S.fx] || KIND.embers;
  for (let i = 0; i < K.n; i++) { const p = K.make(); if (S.fx !== 'glitch') p.y -= R() * H; P.push(p); }
  let f = 0;
  /** One frame of the particles (stops itself once BootScene removes the loading screen). */
  const frame = () => {
    if (!root.isConnected) { clearInterval(tipTimer); return; }
    f++; g.clearRect(0, 0, W, H);
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (S.fx === 'glitch') {
        if (--p.life <= 0) P[i] = K.make();
        if (f % 3) { g.globalAlpha = 0.55; g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h)); }
        continue;
      }
      p.x += p.vx + (p.wob !== undefined ? Math.sin(f * 0.03 + p.wob) * 0.25 : 0); p.y += p.vy;
      if (p.y < -10 || p.y > H + 10 || p.x < -20 || p.x > W + 20) { P[i] = K.make(); continue; }
      g.globalAlpha = S.fx === 'embers' ? 0.55 + 0.45 * Math.sin(f * 0.2 + i) : 0.85;
      g.fillStyle = p.c;
      if (p.r) { g.strokeStyle = p.c; g.lineWidth = 1; g.beginPath(); g.arc(Math.round(p.x), Math.round(p.y), p.r, 0, 7); g.stroke(); g.fillRect(Math.round(p.x - p.r * 0.5), Math.round(p.y - p.r * 0.5), 1, 1); }
      else if (S.fx === 'rain') { g.fillRect(Math.round(p.x), Math.round(p.y), 1, 4); }
      else if (S.fx === 'confetti') { const w = Math.abs(Math.cos(f * 0.1 + p.spin)) * 2 + 1; g.fillRect(Math.round(p.x), Math.round(p.y), Math.round(w), 2); }
      else g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  };
  if (!reduce) requestAnimationFrame(frame);
})();
