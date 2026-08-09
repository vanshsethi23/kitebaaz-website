/* KITEBAAZ — manifest-driven ambient audio. Never autoplays.
   Drop .mp3 files into assets/audio/ and list them in assets/audio/tracks.json.
   If the manifest is missing or empty, the audio button stays hidden. */
'use strict';

(function () {
  const btn = document.getElementById('audio-btn');
  const panel = document.getElementById('audio-panel');
  if (!btn || !panel) return;

  const STORE_KEY = 'kitebaaz.audio';
  let tracks = [];
  let currentId = null;
  let audioEl = null;
  let fadingOut = null;
  let volume = 0.5;

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (_) { return {}; }
  })();
  if (typeof saved.volume === 'number') volume = saved.volume;

  fetch('assets/audio/tracks.json')
    .then(r => { if (!r.ok) throw new Error('no manifest'); return r.json(); })
    .then(data => {
      tracks = (data.tracks || []).filter(t => t.id && t.file);
      if (!tracks.length) return; // keep button hidden
      btn.classList.add('is-available');
      buildPanel();
      if (new URLSearchParams(location.search).has('audio')) { // dev-only: preview panel open
        panel.classList.add('is-open');
      }
    })
    .catch(() => { /* manifest absent: button stays hidden */ });

  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ track: currentId, volume })); }
    catch (_) {}
  }

  function buildPanel() {
    panel.innerHTML = '';
    const offRow = row('Off', null);
    panel.appendChild(offRow);
    tracks.forEach(t => panel.appendChild(row(t.label, t.id)));

    const vol = document.createElement('div');
    vol.className = 'audio-volume';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0'; slider.max = '1'; slider.step = '0.05';
    slider.value = String(volume);
    slider.setAttribute('aria-label', 'Volume');
    slider.addEventListener('input', () => {
      volume = parseFloat(slider.value);
      if (audioEl) audioEl.volume = volume;
      persist();
    });
    vol.appendChild(slider);
    panel.appendChild(vol);
    syncRows();
  }

  function row(label, id) {
    const b = document.createElement('button');
    b.className = 'row';
    b.dataset.trackId = id || '';
    b.innerHTML = '<span class="r-dot" aria-hidden="true"></span><span>' + label + '</span>' +
      (id ? '<span class="eq-bars" aria-hidden="true"><span></span><span></span><span></span></span>' : '');
    b.addEventListener('click', () => select(id));
    return b;
  }

  function syncRows() {
    panel.querySelectorAll('.row').forEach(r => {
      r.classList.toggle('is-active', (r.dataset.trackId || null) === currentId);
    });
    btn.classList.toggle('is-playing', !!currentId && !!audioEl && !audioEl.paused);
  }

  function fadeOut(el, ms) {
    const start = el.volume, t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / ms);
      el.volume = start * (1 - k);
      if (k < 1) requestAnimationFrame(step);
      else { el.pause(); el.src = ''; }
    })(t0);
  }

  function select(id) {
    if (id === currentId) return;
    if (audioEl) { fadeOut(audioEl, currentId && id ? 600 : 400); audioEl = null; }
    currentId = id;
    if (id) {
      const t = tracks.find(x => x.id === id);
      audioEl = new Audio('assets/audio/' + t.file);
      audioEl.loop = true;
      audioEl.preload = 'none';
      audioEl.volume = 0;
      audioEl.play().then(() => {
        // crossfade in over 600ms
        const t0 = performance.now();
        (function step(ts) {
          if (!audioEl) return;
          const k = Math.min(1, (ts - t0) / 600);
          audioEl.volume = volume * k;
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      }).catch(() => { currentId = null; });
    }
    persist();
    syncRows();
  }

  /* Restore choice on return, but still require a click to resume playback:
     we only pre-select the row, we do not play. */
  if (saved.track) currentId = null; // remembered, surfaced in panel; playback needs a click

  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      panel.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  /* Pause when hidden, resume when visible if it was playing. */
  let pausedByVisibility = false;
  document.addEventListener('visibilitychange', () => {
    if (!audioEl) return;
    if (document.hidden && !audioEl.paused) {
      audioEl.pause();
      pausedByVisibility = true;
    } else if (!document.hidden && pausedByVisibility) {
      audioEl.play().catch(() => {});
      pausedByVisibility = false;
    }
    syncRows();
  });
})();
