import { rng } from './grid.js';

/**
 * Tilemap over the CC0 Overworld sheet (ArMM1998, 16px tiles, 40x36).
 *
 * Layers draw in insertion order, so the usual stack is:
 *   ground -> overlay (shores, path edges) -> objects -> canopy
 * Objects that should occlude the walking character go in a layer after him;
 * everything else goes before.
 *
 * Tile references are [col, row] into the sheet, which is why lab/tiles.html
 * prints coordinates in exactly that form.
 */

export const TILE = 16;

export class TileMap {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.layers = new Map();
  }

  layer(name) {
    if (!this.layers.has(name)) {
      this.layers.set(name, new Array(this.cols * this.rows).fill(null));
    }
    return this.layers.get(name);
  }

  set(name, c, r, tile) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return this;
    this.layer(name)[r * this.cols + c] = tile;
    return this;
  }

  get(name, c, r) {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return this.layer(name)[r * this.cols + c];
  }

  /**
   * Fills a rect. `tile` may be a single [c,r], or an array of them for
   * variation — in which case a seeded pick keeps the map identical across
   * loads. Random variation would make visual regressions impossible to spot.
   */
  fill(name, c, r, w, h, tile, seed = 1) {
    const pick = Array.isArray(tile[0]) ? tile : null;
    const rand = rng(seed);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const t = pick ? pick[Math.floor(rand() * pick.length)] : tile;
        this.set(name, c + i, r + j, t);
      }
    }
    return this;
  }

  /** Scatters a tile at a given density — tufts, flowers, pebbles. */
  scatter(name, c, r, w, h, tiles, count, seed = 2) {
    const rand = rng(seed);
    for (let n = 0; n < count; n++) {
      const x = c + Math.floor(rand() * w);
      const y = r + Math.floor(rand() * h);
      this.set(name, x, y, tiles[Math.floor(rand() * tiles.length)]);
    }
    return this;
  }

  /**
   * Stamps a rectangular block of the sheet — how multi-tile objects (a 5x5
   * house, a 2x3 shed) are placed without listing every tile by hand.
   */
  blit(name, c, r, srcC, srcR, w, h) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        this.set(name, c + i, r + j, [srcC + i, srcR + j]);
      }
    }
    return this;
  }

  /** Draws every layer, clipped to the camera window. */
  render(ctx, sheet, camX = 0, camY = 0, viewW = this.cols * TILE, viewH = this.rows * TILE) {
    const c0 = Math.max(0, Math.floor(camX / TILE));
    const r0 = Math.max(0, Math.floor(camY / TILE));
    const c1 = Math.min(this.cols, Math.ceil((camX + viewW) / TILE));
    const r1 = Math.min(this.rows, Math.ceil((camY + viewH) / TILE));

    for (const cells of this.layers.values()) {
      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          const t = cells[r * this.cols + c];
          if (!t) continue;
          ctx.drawImage(
            sheet,
            t[0] * TILE, t[1] * TILE, TILE, TILE,
            c * TILE - camX, r * TILE - camY, TILE, TILE
          );
        }
      }
    }
  }
}

/** Loads an image and resolves once it can actually be drawn. */
export function loadSheet(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error(`sheet failed: ${src}`));
    img.src = src;
  });
}

/**
 * Grades the tileset toward the site's palette without repainting the art.
 *
 * Applied as a CSS filter on the canvas rather than per-pixel: it is GPU work,
 * it is one string to tune, and critically it leaves the artist's shading and
 * dithering intact. Recolouring tile by tile would destroy the craft that made
 * this worth using over the generated sprites.
 */
export const GRADES = {
  none: 'none',
  muted: 'saturate(.62) brightness(.82) contrast(1.06) hue-rotate(-8deg) sepia(.12)',
  deep: 'saturate(.5) brightness(.68) contrast(1.12) hue-rotate(-12deg) sepia(.2)',
};
