// Loads the build's WebP copies of rich images instead of their PNGs (tools/build/webp.mjs).
// Code keeps naming the .png ('assets/souls/medieval.png'); when the build made a smaller .webp of that
// file, the loader quietly fetches the .webp. In `npm run dev`, or in a browser without WebP, the list is
// empty and nothing changes. main.js imports this before any scene so every load call goes through it.
import WEBP from 'virtual:webp-manifest';

const supported = (() => {
  try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); } catch (e) { return false; }
})();

if (supported && WEBP.length) {
  const swap = new Set(WEBP);
  const proto = Phaser.Loader.LoaderPlugin.prototype, addFile = proto.addFile;
  proto.addFile = function (file) {
    for (const f of Array.isArray(file) ? file : [file]) {
      if (f && typeof f.url === 'string') {
        const rel = f.url.replace(/^\.?\//, '');
        if (swap.has(rel)) f.url = f.url.replace(/\.png$/i, '.webp');
      }
    }
    return addFile.call(this, file);
  };
}
