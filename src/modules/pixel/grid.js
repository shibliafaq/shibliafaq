/**
 * A mutable character grid, and the drawing primitives the sprite generators
 * are built from.
 *
 * Hand-authoring detail at ref-5 resolution means 60+ rows of 70+ characters
 * per building, which is slow to write and nearly impossible to proofread. The
 * generators in build.js compose sprites from these primitives instead, so the
 * repetitive texture (shingle courses, plank lines, window grids) is produced
 * rather than typed, and only the silhouette and feature placement are authored.
 *
 * Output is the same character-grid format sprites.js uses, so everything
 * downstream — palettes, renderer — is unchanged.
 */

export class Grid {
  constructor(w, h, fill = '.') {
    this.w = w;
    this.h = h;
    this.cells = new Array(w * h).fill(fill);
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  get(x, y) { return this.inside(x, y) ? this.cells[y * this.w + x] : '.'; }

  set(x, y, ch) {
    if (this.inside(x, y)) this.cells[y * this.w + x] = ch;
    return this;
  }

  /** Writes only where the target is currently transparent. */
  setUnder(x, y, ch) {
    if (this.inside(x, y) && this.get(x, y) === '.') this.cells[y * this.w + x] = ch;
    return this;
  }

  rect(x, y, w, h, ch) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch);
    return this;
  }

  hLine(x, y, w, ch) { return this.rect(x, y, w, 1, ch); }
  vLine(x, y, h, ch) { return this.rect(x, y, 1, h, ch); }

  /** Filled trapezoid — the shape every 3/4 roof slope is made of. */
  trapezoid(cx, y, topW, botW, h, ch) {
    for (let j = 0; j < h; j++) {
      const t = h === 1 ? 0 : j / (h - 1);
      const w = Math.round(topW + (botW - topW) * t);
      const x = Math.round(cx - w / 2);
      this.rect(x, y + j, w, 1, ch);
    }
    return this;
  }

  ellipse(cx, cy, rx, ry, ch) {
    for (let j = -ry; j <= ry; j++) {
      for (let i = -rx; i <= rx; i++) {
        if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1) this.set(cx + i, cy + j, ch);
      }
    }
    return this;
  }

  /**
   * Wraps every opaque region in a 1px keyline — the hard outline the
   * references never break. Done last, so it traces whatever shape resulted
   * rather than needing to be drawn by hand around each feature.
   */
  outline(ch = 'o') {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== '.') continue;
        if (this.get(x - 1, y) !== '.' || this.get(x + 1, y) !== '.' ||
            this.get(x, y - 1) !== '.' || this.get(x, y + 1) !== '.') {
          add.push([x, y]);
        }
      }
    }
    for (const [x, y] of add) this.set(x, y, ch);
    return this;
  }

  /** Flat cast shadow, offset toward bottom-right (light is top-left). */
  shadow(dx, dy, ch = 'z') {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) === '.') continue;
        const nx = x + dx;
        const ny = y + dy;
        if (this.get(nx, ny) === '.') add.push([nx, ny]);
      }
    }
    for (const [x, y] of add) this.setUnder(x, y, ch);
    return this;
  }

  toSprite() {
    const rows = [];
    for (let y = 0; y < this.h; y++) {
      rows.push(this.cells.slice(y * this.w, y * this.w + this.w).join(''));
    }
    return rows;
  }
}

/**
 * Deterministic value noise. Math.random would give a different map on every
 * load, which makes visual regressions impossible to spot — the same seed must
 * always produce the same village.
 */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
