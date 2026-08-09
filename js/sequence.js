/* KITEBAAZ — FrameSequence: load, decode, draw. One instance per canvas section. */
'use strict';

class FrameSequence {
  constructor({ name, count, canvas, dir }) {
    this.name = name;
    this.count = count;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dir = dir; // 'desktop' | 'mobile'
    this.frames = new Array(count).fill(null);
    this.loadedCount = 0;
    this.lastDrawn = -1;
    this.onProgress = null; // (loaded, total) => void
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5); // 720p source: cap at 1.5
    this._sizeCanvas();
  }

  _url(i) {
    const n = String(i + 1).padStart(4, '0');
    return `assets/frames/${this.name}/${this.dir}/frame-${n}.webp`;
  }

  _sizeCanvas() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  }

  resize() {
    this._sizeCanvas();
    if (this.lastDrawn >= 0) {
      const i = this.lastDrawn;
      this.lastDrawn = -1;
      this.draw(i);
    }
  }

  async _load(i) {
    if (this.frames[i]) return this.frames[i];
    try {
      let img;
      if ('createImageBitmap' in window) {
        const res = await fetch(this._url(i));
        if (!res.ok) throw new Error(`404 frame ${i}`);
        img = await createImageBitmap(await res.blob());
      } else {
        img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = this._url(i);
        });
      }
      this.frames[i] = img;
      this.loadedCount++;
      if (this.onProgress) this.onProgress(this.loadedCount, this.count);
      return img;
    } catch (e) {
      return null;
    }
  }

  /* 12 evenly-spaced frames, so something draws immediately. */
  async loadCritical() {
    const n = 12;
    const idxs = [];
    for (let k = 0; k < n; k++) idxs.push(Math.round(k * (this.count - 1) / (n - 1)));
    await Promise.all(idxs.map(i => this._load(i)));
  }

  /* Everything else, batches of 8, resolves progressively. */
  async loadAll() {
    const pending = [];
    for (let i = 0; i < this.count; i++) if (!this.frames[i]) pending.push(i);
    for (let b = 0; b < pending.length; b += 8) {
      await Promise.all(pending.slice(b, b + 8).map(i => this._load(i)));
    }
  }

  /* Nearest-loaded fallback: never leave the canvas blank. */
  _nearest(i) {
    if (this.frames[i]) return i;
    for (let d = 1; d < this.count; d++) {
      if (i - d >= 0 && this.frames[i - d]) return i - d;
      if (i + d < this.count && this.frames[i + d]) return i + d;
    }
    return -1;
  }

  draw(index) {
    const i = this._nearest(Math.max(0, Math.min(this.count - 1, index)));
    if (i < 0 || i === this.lastDrawn) return;
    const img = this.frames[i];
    const cw = this.canvas.width, ch = this.canvas.height;
    const iw = img.width, ih = img.height;
    // cover-fit, centre the overflow
    const s = Math.max(cw / iw, ch / ih);
    const dw = iw * s, dh = ih * s;
    this.ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    this.lastDrawn = i;
  }
}

window.FrameSequence = FrameSequence;
