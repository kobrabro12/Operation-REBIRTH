// Runs Sprite Fusion pixel VFX (src/fx/sf*.js, MIT) in a match: each effect draws into two pixel buffers (`color`, and
// `light` added on top), which go onto canvas textures drawn in the world at 1 game pixel = 1 effect pixel - so they
// sit on the same pixel grid as the fighters. `sfSpawn(match, fx, region)` starts one; MatchScene steps them every
// tick (`sfStep`) and clears them when the match ends (`sfClear`). `sfActor(fighter)` lets an effect read a fighter's
// feet and the pixels of its current frame (the blink bursts the real sprite into pixels).
let serial = 0;

/** Starts effect `fx` (made by e.g. movement()) inside the world box region = { x, y, w, h }; depth over / under the
 *  fighters. Returns the running entry (has `.fx`). */
export function sfSpawn(match, fx, region, depth = 6) {
  if (!match || !match.textures) return null;
  const w = Math.max(8, Math.ceil(region.w)), h = Math.max(8, Math.ceil(region.h)), x = Math.floor(region.x), y = Math.floor(region.y);
  const key = 'sfvfx_' + (serial++), keyL = key + '_l';
  const tc = match.textures.createCanvas(key, w, h), tl = match.textures.createCanvas(keyL, w, h);
  tc.setFilter(1); tl.setFilter(1);                                   // (nearest: crisp pixels)
  const img = match.add.image(x, y, key).setOrigin(0).setDepth(depth);
  const imgL = match.add.image(x, y, keyL).setOrigin(0).setDepth(depth + 0.01).setBlendMode('ADD');
  if (match.addWorld) match.addWorld(img, imgL);
  const color = new Uint32Array(w * h), light = new Uint32Array(w * h);
  const e = { fx, key, keyL, tc, tl, img, imgL, frame: { w, h, ox: x, oy: y, color, light }, idC: new ImageData(new Uint8ClampedArray(color.buffer), w, h), idL: new ImageData(new Uint8ClampedArray(light.buffer), w, h) };
  (match.sfFx = match.sfFx || []).push(e);
  sfDraw(e);
  return e;
}

/** Draws one effect's buffers onto its textures. */
function sfDraw(e) {
  e.frame.color.fill(0); e.frame.light.fill(0);
  e.fx.draw(e.frame);
  e.tc.context.putImageData(e.idC, 0, 0); e.tc.refresh();
  e.tl.context.putImageData(e.idL, 0, 0); e.tl.refresh();
}

/** Steps every running effect by one game tick (1/60 s) and drops the finished ones. */
export function sfStep(match) {
  const L = match.sfFx; if (!L || !L.length) return;
  for (const e of L) {
    try { e.fx.update(1 / 60); sfDraw(e); } catch (err) { e.dead = true; }   // (an effect must never break a match)
    if (e.dead || e.fx.done()) sfKill(match, e);
  }
  match.sfFx = L.filter((e) => !e.gone);
}

/** Removes one effect and its textures. */
function sfKill(match, e) {
  if (e.gone) return; e.gone = true;
  e.img.destroy(); e.imgL.destroy();
  if (match.textures.exists(e.key)) match.textures.remove(e.key);
  if (match.textures.exists(e.keyL)) match.textures.remove(e.keyL);
}

/** Clears every effect (match over / restarted). */
export function sfClear(match) { for (const e of match.sfFx || []) sfKill(match, e); match.sfFx = []; }

/** An `actor` for an effect: the fighter's feet, and the pixels of its current frame on the world's pixel grid. */
export function sfActor(f) {
  return {
    feet: () => [f.x, f.y],
    silhouette: () => {
      const s = f.sprite; if (!s || !s.visible || !s.frame) return null;
      const fr = s.frame, img = fr.source && fr.source.image; if (!img) return null;
      const sx = Math.abs(s.scaleX) || 1, sy = Math.abs(s.scaleY) || 1;
      const rw = fr.realWidth || fr.cutWidth, rh = fr.realHeight || fr.cutHeight;
      const W = Math.max(1, Math.round(rw * sx)), H = Math.max(1, Math.round(rh * sy));
      const cv = sfActor.cv || (sfActor.cv = document.createElement('canvas'));
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = false;
      ctx.save(); if (s.flipX) { ctx.translate(W, 0); ctx.scale(-1, 1); }
      try { ctx.drawImage(img, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, (fr.x || 0) * sx, (fr.y || 0) * sy, fr.cutWidth * sx, fr.cutHeight * sy); } catch (err) { ctx.restore(); return null; }
      ctx.restore();
      const data = new Uint32Array(ctx.getImageData(0, 0, W, H).data.buffer);
      return { x: Math.round(s.x - s.originX * W), y: Math.round(s.y - s.originY * H), w: W, h: H, data };
    },
  };
}
