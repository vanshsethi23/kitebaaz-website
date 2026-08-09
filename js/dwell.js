/* KITEBAAZ — dwell remap. Gaussian-density cumulative LUT, inverted, so the
   scroll slows at content beats and speeds between them. */
'use strict';

const REMAP_N = 2000;
const DWELL_WIDTH = 0.045;
const DWELL_PEAK = 3.2;

/* Returns { remap(raw) -> effective, forward(effective) -> raw } */
function buildDwell(centers, width = DWELL_WIDTH, peak = DWELL_PEAK) {
  // density: 1 + sum of Gaussians at each dwell centre
  const density = x => {
    let d = 1;
    for (const c of centers) {
      const t = (x - c) / width;
      d += peak * Math.exp(-0.5 * t * t);
    }
    return d;
  };

  // cumulative integral G on a grid, normalised to [0,1].
  // G rises fast near centres; effective = G^-1(raw) flattens there.
  const cum = new Float64Array(REMAP_N + 1);
  let acc = 0;
  for (let i = 1; i <= REMAP_N; i++) {
    const x = (i - 0.5) / REMAP_N;
    acc += density(x);
    cum[i] = acc;
  }
  for (let i = 0; i <= REMAP_N; i++) cum[i] /= acc;

  // invert into a lookup table: inv[j] = x such that G(x) = j/REMAP_N
  const inv = new Float64Array(REMAP_N + 1);
  let gi = 0;
  for (let j = 0; j <= REMAP_N; j++) {
    const target = j / REMAP_N;
    while (gi < REMAP_N && cum[gi + 1] < target) gi++;
    const lo = cum[gi], hi = cum[gi + 1];
    const frac = hi > lo ? (target - lo) / (hi - lo) : 0;
    inv[j] = (gi + frac) / REMAP_N;
  }

  return {
    remap(raw) {
      const r = Math.max(0, Math.min(1, raw));
      const f = r * REMAP_N;
      const j = Math.floor(f);
      if (j >= REMAP_N) return inv[REMAP_N];
      return inv[j] + (inv[j + 1] - inv[j]) * (f - j);
    },
    // forward: effective progress -> raw scroll fraction (for timeline scrollTo)
    forward(effective) {
      const e = Math.max(0, Math.min(1, effective));
      const f = e * REMAP_N;
      const i = Math.floor(f);
      if (i >= REMAP_N) return cum[REMAP_N];
      return cum[i] + (cum[i + 1] - cum[i]) * (f - i);
    }
  };
}

window.buildDwell = buildDwell;
