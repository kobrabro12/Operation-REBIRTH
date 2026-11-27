// THE LOADING SCREEN: runs before Phaser. Picks one of the screens (never the same twice in a row), fills in its
// backdrop, hero, name and colours, turns the tips, and runs its particles until BootScene fades it out.
// Art: tools/sprites/loading_screens.py -> assets/ui/loading/<id>_bg.png + <id>_hero.png. Styles: index.html.
(() => {
  // a: the main accent, b: the hero's offset shadow; hx / hh / hb = the hero's centre x, height and floor (% of the screen); fx = its particles
  const screens = [
    { id: 'roster', name: 'OPERATION REBIRTH', place: 'EVERY FIGHT IS A SECOND CHANCE', lore: 'Lacy, Soul Summoner and Mr Wake. Three who came back wrong - and came back fighting.', a: '#ffb24a', b: '#7a2aa8', fx: 'embers', hx: 64, px: 1.5, hb: 9 },
    { id: 'soul-summoner', name: 'SOUL SUMMONER', place: 'THE SKY SANCTUM', lore: 'He calls his fallen friends by name, and they answer in blue fire.', a: '#ffd86a', b: '#1a6a9a', fx: 'souls', hx: 68, px: 1.5, hb: 7 },
    { id: 'mr-wake', name: 'MR WAKE', place: 'GRAVEMOON BRIDGE', lore: 'Beneath the bridge the dark water has eyes. He taught them to blink.', a: '#c89aff', b: '#3a1060', fx: 'wisps', hx: 64, px: 1.5, hb: 9 },
    { id: 'hero-knight', name: 'LACY', place: 'THE LAST OATH', lore: 'The kingdom fell. The oath did not.', a: '#ff9a4a', b: '#5a0a1a', fx: 'embers', hx: 66, px: 1.5, hb: 6 },
    { id: 'nu', name: 'NU', place: 'THE MAIN STAGE', lore: 'Every fight becomes a show. Every show ends in an encore.', a: '#ff5ae0', b: '#1ad8ff', fx: 'confetti', hx: 66, px: 2, hb: 6 },
    { id: 'aero', name: 'AERO', place: 'AERO MEADOW', lore: 'A living world inside a forgotten desktop - and one goldfish who refuses to be closed.', a: '#5ae0ff', b: '#1a6ad0', fx: 'bubbles', hx: 66, px: 2, hb: 7 },
    { id: 'gnash', name: 'GNASH', place: 'AFTER HOURS', lore: 'He drags the axe so you hear him coming. It never helps.', a: '#c8ff3a', b: '#ff2a9a', fx: 'rain', hx: 66, px: 1, hb: 5 },
    { id: 'lumen', name: 'LUMEN', place: 'THE STARFALL', lore: 'The purple star broke over the Sanctum. The brightest piece of it woke up, picked up a staff, and started drawing the sky back together.', a: '#c89aff', b: '#2a0a6a', fx: 'stars', hx: 64, px: 2, hb: 6 },
    { id: 'vanta', name: 'VANTA', place: 'THE NEON DISTRICT', lore: 'Two blades, drawn backwards. By the time you hear them leave the sheath, the moon is already in two pieces.', a: '#3af0ff', b: '#ff2a9a', fx: 'neon', hx: 66, px: 2, hb: 6 },
    { id: 'kami', name: 'KAMI', place: 'THE ARCHIVE', lore: 'A page that fell out of the oldest book in the Archive, and folded itself into someone who could go and find out what was written on it.', a: '#ff5a4a', b: '#5a2a10', fx: 'paper', hx: 62, px: 2, hb: 6 },
    { id: 'vitrail', name: 'VITRAIL', place: 'THE SANCTUM CHAPEL', lore: 'Four hundred years a window. Nine hundred pieces on the chapel floor. One monk-shaped thing standing in the empty frame, with the rose still burning behind his head.', a: '#ffd860', b: '#3a1a6a', fx: 'glass', hx: 62, px: 2, hb: 8 },
    { id: 'hanz', name: 'HANZ & $@L', place: 'THE TRUE SHOPKEEPER', lore: 'Two halves of one man behind one counter. The shop is open. Nobody remembers coming in.', a: '#ff4a6a', b: '#d2d0cc', fx: 'glitch', hx: 66, px: 0.5, hb: 4 },
    // STORIES: a whole story in one picture (tools/sprites/loading_stories.py) - no hero layer, the title and the tale underneath
    { id: 'story-names', story: true, name: 'THEIR NAMES', place: 'A SOUL SUMMONER STORY', lore: 'Every night he walks the Sanctum graves and says their names out loud. Every night, one of them answers.', a: '#8ae8ff', b: '#1a3a6a', fx: 'souls' },
    { id: 'story-bridge', story: true, name: 'WHAT THE WATER KEEPS', place: 'A GRAVEMOON STORY', lore: 'Mr Wake has fished off Gravemoon Bridge for a hundred years and never caught a thing. Tonight, something down there is fishing back. AERO saw it first.', a: '#ffd23a', b: '#3a1060', fx: 'wisps' },
    { id: 'story-oath', story: true, name: 'THE LAST OATH', place: 'A LACY STORY', lore: 'Her kingdom burned in a single night. Its last knight swore to win it back one fight at a time. She has a very long list.', a: '#ff9a4a', b: '#5a0a1a', fx: 'embers' },
    { id: 'story-soundcheck', story: true, name: 'SOUNDCHECK, 6 AM', place: 'AN UNDERGROUND STORY', lore: 'The frontman is warmed up and ready to go. The roadies are... not. One is asleep on the amp. One has lost a fight with the cables.', a: '#ff5ae0', b: '#1ad8ff', fx: 'confetti' },
    { id: 'story-eater', story: true, name: 'THE STAR-EATER', place: 'THE LAST OBSERVATORY', lore: 'The night sky is going dark, one star at a time. At the edge of the world something enormous is hungry, and three small fighters have decided to stop it.', a: '#ffc84a', b: '#3a1a6a', fx: 'embers' },
    { id: 'story-closing', story: true, name: 'CLOSING TIME', place: 'A LOST STORY', lore: 'The little shop is open all night. Nobody remembers going in. Everybody remembers the shopkeeper - and he never forgets a customer.', a: '#ff4a8a', b: '#b8121c', fx: 'glitch' },
    { id: 'story-woke', story: true, name: 'WHAT THE STAR WOKE', place: 'A SKY SANCTUM STORY', lore: 'When the purple star broke, most of its pieces fell into the dark and went out. Four of them landed on something - a heart, a ghost, a page, a window - and woke it up.', a: '#c89aff', b: '#3a1a6a', fx: 'glass' },
    { id: 'story-dawn', story: true, name: 'SECOND LIFE', place: 'OPERATION REBIRTH', lore: 'Six who should have stayed down. One more sunrise. One more round.', a: '#ffd08a', b: '#6a1a5a', fx: 'embers' },
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
  root.style.setProperty('--hx', (S.hx || 64) + '%'); root.style.setProperty('--hb', (S.hb || 5) + '%');
  $('.ls-bg').src = 'assets/ui/loading/' + S.id + '_bg.png';
  const hero = $('.ls-hero');
  if (S.story) { root.classList.add('ls-story'); $('.ls-kicker').textContent = 'STORY'; $('.ls-bg').alt = S.name + '. ' + S.lore; }
  else {
    // the hero is sized in whole steps of the backdrop's own pixels (px = sprite pixels per backdrop pixel), so both
    // scale up together and the sprite never comes out lumpy or uneven
    hero.onload = () => root.style.setProperty('--hh', (hero.naturalHeight * (S.px || 1) / 180 * 100) + '%');
    hero.src = 'assets/ui/loading/' + S.id + '_hero.png'; hero.alt = S.name;
  }
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
    stars: { n: 60, make: () => ({ x: R() * W, y: -R() * 20, vx: 0.12, vy: 0.08 + R() * 0.2, c: R() < 0.6 ? '#e8d8ff' : '#c89aff', s: R() < 0.2 ? 2 : 1, tw: R() * 6 }) },
    neon: { n: 40, make: () => ({ x: R() * W * 1.3, y: -R() * H, vx: -2.2, vy: 2.2, c: R() < 0.5 ? '#3af0ff' : '#ff3aa8', len: 3 + Math.floor(R() * 6) }) },
    paper: { n: 22, make: () => ({ x: R() * W, y: -10 - R() * 20, vx: 0.15, vy: 0.25 + R() * 0.3, c: R() < 0.7 ? '#efe0c0' : '#ff5a4a', wob: R() * 6, spin: R() * 6 }) },
    glass: { n: 46, make: () => ({ x: R() * W, y: H + R() * 20, vx: 0, vy: -0.2 - R() * 0.35, c: ['#ff6a2a', '#7ae8ff', '#ffe04a', '#a04aff'][Math.floor(R() * 4)], s: R() < 0.35 ? 2 : 1, wob: R() * 6, tw: R() * 6 }) },
    glitch: { n: 18, make: () => ({ x: R() * W, y: R() * H, vx: 0, vy: 0, c: ['#ff2a3a', '#d2d0cc', '#2fd6c6', '#ff7ab8'][Math.floor(R() * 4)], w: 4 + R() * 30, h: 1 + R() * 3, life: 6 + R() * 24 }) },
  };
  const K = KIND[S.fx] || KIND.embers;
  for (let i = 0; i < K.n; i++) { const p = K.make(); if (S.fx !== 'glitch') { if (p.vy > 0) p.y = R() * H; else p.y -= R() * H; } P.push(p); }
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
      g.globalAlpha = S.fx === 'embers' ? 0.55 + 0.45 * Math.sin(f * 0.2 + i) : p.tw !== undefined ? 0.45 + 0.55 * Math.abs(Math.sin(f * 0.05 + p.tw)) : 0.85;
      g.fillStyle = p.c;
      if (p.r) { g.strokeStyle = p.c; g.lineWidth = 1; g.beginPath(); g.arc(Math.round(p.x), Math.round(p.y), p.r, 0, 7); g.stroke(); g.fillRect(Math.round(p.x - p.r * 0.5), Math.round(p.y - p.r * 0.5), 1, 1); }
      else if (S.fx === 'rain') { g.fillRect(Math.round(p.x), Math.round(p.y), 1, 4); }
      else if (S.fx === 'neon') { for (let k = 0; k < p.len; k++) g.fillRect(Math.round(p.x + k), Math.round(p.y - k), 1, 1); }
      else if (S.fx === 'paper') { const w = Math.round(Math.abs(Math.cos(f * 0.05 + p.spin)) * 3) + 1; g.fillRect(Math.round(p.x), Math.round(p.y), w, 4); }
      else if (S.fx === 'confetti') { const w = Math.abs(Math.cos(f * 0.1 + p.spin)) * 2 + 1; g.fillRect(Math.round(p.x), Math.round(p.y), Math.round(w), 2); }
      else g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  };
  if (!reduce) requestAnimationFrame(frame);
})();
