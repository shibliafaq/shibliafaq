/**
 * Pixel drawing helpers.
 *
 * Everything draws at 1:1 into a small canvas which is then scaled up by CSS
 * with `image-rendering: pixelated`. Drawing at final size instead would
 * resample the artwork and destroy the hard edges that make it pixel art.
 */

/**
 * Draws a character-grid sprite. Runs of the same slot in a row are emitted as
 * one fillRect — a 28-wide building is ~20 rects instead of ~500, which matters
 * once the map is redrawing every frame behind a moving camera.
 */
export function drawSprite(ctx, sprite, x, y, pal) {
  for (let r = 0; r < sprite.length; r++) {
    const row = sprite[r];
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      if (ch === '.') { c++; continue; }
      let run = 1;
      while (c + run < row.length && row[c + run] === ch) run++;
      const colour = pal[ch];
      if (colour) {
        ctx.fillStyle = colour;
        ctx.fillRect(x + c, y + r, run, 1);
      }
      c += run;
    }
  }
}

/** Fills a rect by repeating a tile, clipped to the region. */
export function fillTiles(ctx, tile, x, y, w, h, pal) {
  const tw = tile[0].length;
  const th = tile.length;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let ty = y; ty < y + h; ty += th) {
    for (let tx = x; tx < x + w; tx += tw) {
      drawSprite(ctx, tile, tx, ty, pal);
    }
  }
  ctx.restore();
}

/**
 * Creates a low-resolution canvas that presents at `scale` size. Returns the
 * context with smoothing off — without that, any drawImage of the buffer
 * blurs it back into a non-pixel image.
 */
export function makePixelCanvas(w, h, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;
  canvas.style.imageRendering = 'pixelated';
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}
