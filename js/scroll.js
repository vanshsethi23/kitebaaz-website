/* KITEBAAZ — master scroll engine. One rAF loop for the whole page. */
'use strict';

(function () {
  /* The कटा beat. Frame 66 of 120 (1-based): the manjha visibly severs and the
     left kite begins free fall. Verified on the contact sheet. */
  const CUT_FRAME = 66;                       // 1-based extracted frame
  const CUT_INDEX = CUT_FRAME - 1;            // 0-based
  const CUT_PROGRESS = CUT_INDEX / (120 - 1); // ≈ 0.546

  const LERP = 0.085;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const conn = navigator.connection || {};
  const slow = conn.saveData || conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g';
  const staticFrames = reduced || slow;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const dir = isMobile ? 'mobile' : 'desktop';

  if (reduced) document.documentElement.classList.add('reduced');

  const vhEl = () => window.innerHeight;

  /* ---------- Section registry ---------- */
  const DWELLS = {
    hero: [0.08, 0.34, CUT_PROGRESS, 0.86],
    history: [0.06, 0.17, 0.29, 0.41, 0.53, 0.65, 0.77, 0.91],
    origin: [0.12, 0.45, 0.82]
  };
  const STATIC_FRAME = { hero: 0, history: 59, origin: 39 };

  const sections = [];
  document.querySelectorAll('.seq-section').forEach(el => {
    const name = el.dataset.seq;
    const canvas = el.querySelector('.seq-canvas');
    const seq = new FrameSequence({ name, count: +el.dataset.count, canvas, dir });
    const loadbar = el.querySelector('.seq-loadbar');
    seq.onProgress = (l, t) => {
      if (loadbar) {
        loadbar.style.transform = `scaleX(${l / t})`;
        if (l >= t) loadbar.classList.add('is-done');
      }
    };
    sections.push({
      el, name, seq,
      dwell: buildDwell(DWELLS[name]),
      overlays: Array.from(el.querySelectorAll('.seq-overlay')).map(o => ({
        el: o,
        showAt: parseFloat(o.dataset.showAt),
        hideAt: parseFloat(o.dataset.hideAt),
        visible: false
      })),
      top: 0, height: 0,
      current: STATIC_FRAME[name], target: STATIC_FRAME[name],
      loading: false
    });
  });

  const heroSection = sections.find(s => s.name === 'hero');
  const historySection = sections.find(s => s.name === 'history');

  /* ---------- Letter split ---------- */
  /* Letters get the stagger, words stay unbreakable so lines never split mid-word. */
  document.querySelectorAll('[data-split]').forEach(node => {
    const text = node.textContent;
    node.textContent = '';
    node.setAttribute('aria-label', text);
    let i = 0;
    text.split(' ').forEach((word, w) => {
      if (w > 0) node.appendChild(document.createTextNode(' '));
      const wrap = document.createElement('span');
      wrap.className = 'split-word';
      wrap.setAttribute('aria-hidden', 'true');
      for (const ch of word) {
        const s = document.createElement('span');
        s.textContent = ch;
        s.style.setProperty('--i', i++);
        wrap.appendChild(s);
      }
      node.appendChild(wrap);
    });
  });

  /* ---------- Layout cache (read layout only here and on resize) ---------- */
  const staticEls = {
    matters: document.getElementById('matters'),
    founderBeats: document.querySelector('.founder-beats'),
    footer: document.getElementById('site-footer')
  };
  const cache = { doc: 0 };
  function measure() {
    for (const s of sections) {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + window.scrollY;
      s.height = r.height;
      s.seq.resize();
    }
    for (const k of ['matters', 'founderBeats', 'footer']) {
      const el = staticEls[k];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      cache[k] = { top: r.top + window.scrollY, height: r.height };
    }
    cache.doc = document.documentElement.scrollHeight;
  }

  /* Re-measure whenever the viewport actually changes (also catches the page
     having loaded in a zero-size or hidden viewport, and mobile URL-bar collapse). */
  let lastVw = -1, lastVh = -1;
  function maybeMeasure() {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (vw !== lastVw || vh !== lastVh) {
      lastVw = vw; lastVh = vh;
      if (vw > 0 && vh > 0) measure();
    }
  }

  /* ---------- Loader ---------- */
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loader-fill');
  const loaderPct = document.getElementById('loader-pct');

  /* ---------- The वो काटा! moment ---------- */
  const cutOverlay = document.getElementById('cut-overlay');
  const cutFlash = document.getElementById('cut-flash');
  const heroSticky = document.getElementById('hero-sticky');
  let cutArmed = true;

  function fireCut() {
    if (reduced) return;
    cutFlash.classList.remove('is-firing');
    heroSticky.classList.remove('is-shaking');
    void cutFlash.offsetWidth; // restart animations
    cutFlash.classList.add('is-firing');
    heroSticky.classList.add('is-shaking');
    setTimeout(() => heroSticky.classList.remove('is-shaking'), 300);
  }

  /* ---------- Why-words sequenced reveal ---------- */
  const whyWords = document.getElementById('why-words');
  const whySpans = whyWords ? Array.from(whyWords.children) : [];
  let whyTimers = [];
  function startWhyWords() {
    whyWords.classList.add('is-live');
    whySpans.forEach((sp, i) => {
      sp.style.transitionDelay = `${i * 400}ms`;
      whyTimers.push(setTimeout(() => {
        whySpans.forEach(x => x.classList.remove('is-current'));
        sp.classList.add('is-current');
      }, i * 400 + 300));
    });
  }
  function resetWhyWords() {
    whyWords.classList.remove('is-live');
    whyTimers.forEach(clearTimeout);
    whyTimers = [];
    whySpans.forEach(x => { x.classList.remove('is-current'); x.style.transitionDelay = '0ms'; });
  }

  /* ---------- Overlay toggling ---------- */
  function updateOverlays(s, p) {
    for (const o of s.overlays) {
      const within = p >= o.showAt && p <= o.hideAt;
      if (o.el === cutOverlay) {
        if (within && !o.visible) {
          o.el.classList.remove('is-drifting');
          o.el.classList.add('is-visible');
          o.visible = true;
          if (cutArmed) { fireCut(); cutArmed = false; }
        } else if (!within && o.visible) {
          o.el.classList.remove('is-visible');
          if (p > o.hideAt) o.el.classList.add('is-drifting'); // drifts up as the kite falls
          else o.el.classList.remove('is-drifting');
          o.visible = false;
        }
        if (p < o.showAt - 0.08) cutArmed = true; // re-arm when scrolled well above
        continue;
      }
      if (within && !o.visible) {
        o.el.classList.add('is-visible');
        o.visible = true;
        if (o.el.contains(whyWords)) startWhyWords();
      } else if (!within && o.visible) {
        o.el.classList.remove('is-visible');
        o.visible = false;
        if (o.el.contains(whyWords)) resetWhyWords();
      }
    }
  }

  /* ---------- Timeline ---------- */
  const timeline = document.getElementById('timeline');
  const nodes = timeline ? Array.from(timeline.querySelectorAll('.timeline__node')) : [];
  const nodeCenters = nodes.map(n => parseFloat(n.dataset.center));

  function updateTimeline(p) {
    let active = -1;
    for (let i = 0; i < nodeCenters.length; i++) {
      if (p >= nodeCenters[i] - 0.02) active = i;
    }
    nodes.forEach((n, i) => {
      n.classList.toggle('is-active', i === active);
      if (i < nodes.length - 1) {
        const span = nodeCenters[i + 1] - nodeCenters[i];
        const fill = Math.max(0, Math.min(1, (p - nodeCenters[i]) / span));
        n.style.setProperty('--fill', fill.toFixed(3));
      }
    });
  }

  function scrollToNode(i) {
    const s = historySection;
    const raw = s.dwell.forward(nodeCenters[i]);
    const y = s.top + raw * (s.height - vhEl());
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  nodes.forEach((n, i) => n.addEventListener('click', () => scrollToNode(i)));
  if (timeline) {
    timeline.addEventListener('keydown', e => {
      const i = nodes.indexOf(document.activeElement);
      if (i < 0) return;
      let next = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(nodes.length - 1, i + 1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, i - 1);
      if (next >= 0 && next !== i) {
        e.preventDefault();
        nodes[next].focus();
        scrollToNode(next);
      }
    });
  }

  /* ---------- Why It Matters phrases ---------- */
  const matterPhrases = Array.from(document.querySelectorAll('[data-matter]'));
  const MATTER_AT = [0.12, 0.34, 0.56, 0.78];
  function updateMatters(scrollY, vh) {
    const c = cache.matters;
    if (!c || reduced || c.height - vh < 1) return;
    const p = Math.max(0, Math.min(1, (scrollY - c.top) / (c.height - vh)));
    let current = -1;
    matterPhrases.forEach((el, i) => {
      const on = p >= MATTER_AT[i];
      el.classList.toggle('is-visible', on);
      if (on) current = i;
    });
    matterPhrases.forEach((el, i) => el.classList.toggle('is-current', i === current));
  }

  /* ---------- Founder rail ---------- */
  const founderRail = document.getElementById('founder-rail');
  function updateFounderRail(scrollY, vh) {
    const c = cache.founderBeats;
    if (!c || !founderRail) return;
    const p = Math.max(0, Math.min(1, (scrollY + vh * 0.75 - c.top) / c.height));
    founderRail.style.setProperty('--fill', p.toFixed(3));
  }

  /* ---------- Footer: the kite disappears ---------- */
  const footerKite = document.getElementById('footer-kite');
  const footerStringPath = document.getElementById('footer-string-path');
  function updateFooter(scrollY, vh) {
    const c = cache.footer;
    if (!c || !footerKite) return;
    const p = Math.max(0, Math.min(1, (scrollY + vh - c.top) / c.height));
    if (reduced) {
      footerKite.style.opacity = String(1 - 0.7 * p);
      return;
    }
    const y = -180 * p;
    const sc = 1 - 0.94 * p;
    const op = 1 - p;
    footerKite.style.transform = `translateY(${y}px) scale(${Math.max(0.06, sc)})`;
    footerKite.style.opacity = String(Math.max(0, op));
    // string: draws downward, then goes slack
    const len = 180 * Math.min(1, p * 2.2);
    const slack = Math.max(0, (p - 0.55) / 0.45) * 34;
    footerStringPath.setAttribute('d', `M 0 0 Q ${slack} ${len * 0.6} ${slack * 0.4} ${len}`);
  }

  /* ---------- Reveal-on-scroll (static sections) ---------- */
  const revealIO = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (en.isIntersecting) {
        en.target.classList.add('is-visible');
        revealIO.unobserve(en.target);
      }
    }
  }, { threshold: 0.25 });
  document.querySelectorAll('[data-reveal]').forEach(el => revealIO.observe(el));

  /* ---------- Lazy sequence loading ---------- */
  function startLoad(s, critical) {
    if (s.loading) return;
    s.loading = true;
    if (staticFrames) {
      s.seq._load(STATIC_FRAME[s.name]).then(() => s.seq.draw(STATIC_FRAME[s.name]));
      return;
    }
    s.seq.loadCritical().then(() => s.seq.loadAll());
  }

  const lazyIO = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (en.isIntersecting) {
        const s = sections.find(x => x.el === en.target);
        if (s) startLoad(s);
        lazyIO.unobserve(en.target);
      }
    }
  }, { rootMargin: '150% 0px' });
  sections.filter(s => s.name !== 'hero').forEach(s => lazyIO.observe(s.el));

  /* ---------- Watermark, grain, nav progress ---------- */
  const watermark = document.getElementById('watermark');
  const grain = document.getElementById('grain');
  const progressFill = document.getElementById('scroll-progress-fill');

  /* ---------- Master loop ---------- */
  const navUpdate = () => { if (window.__navFrame) window.__navFrame(); };

  function frame() {
    maybeMeasure();
    const scrollY = window.scrollY;
    const vh = vhEl();

    const pv = window.__kb && window.__kb.preview;
    for (const s of sections) {
      const dist = scrollY + vh - s.top;           // how far viewport bottom is past section top
      const isPv = pv && pv.name === s.name;
      const within = isPv || (dist > -vh * 1.2 && scrollY < s.top + s.height + vh * 1.2);
      if (!within) continue;
      const denom = s.height - vh;
      const raw = denom > 1
        ? Math.max(0, Math.min(1, (scrollY - s.top) / denom))
        : (scrollY >= s.top ? 1 : 0);
      const p = isPv ? pv.p : (staticFrames ? raw : s.dwell.remap(raw));
      if (!staticFrames) {
        s.target = p * (s.seq.count - 1);
        if (pv && pv.name === s.name) s.current = s.target;
        else s.current += (s.target - s.current) * LERP;
        if (Math.abs(s.target - s.current) < 0.02) s.current = s.target;
        s.seq.draw(Math.round(s.current));
      }
      if (!staticFrames) {
        updateOverlays(s, p);
        if (s === historySection) updateTimeline(p);
      }
    }

    // watermark dims past the hero
    if (heroSection) {
      watermark.classList.toggle('is-dim', scrollY > heroSection.height - vh * 0.5);
    }
    // heavier grain while inside the History register
    if (historySection) {
      const inH = scrollY > historySection.top - vh * 0.5 &&
                  scrollY < historySection.top + historySection.height - vh * 0.5;
      grain.classList.toggle('is-heritage', inH);
    }

    updateMatters(scrollY, vh);
    updateFounderRail(scrollY, vh);
    updateFooter(scrollY, vh);

    progressFill.style.transform = `scaleX(${(scrollY / (cache.doc - vh)).toFixed(4)})`;

    if (window.__drawParticles) window.__drawParticles();
    if (window.__drawCursor) window.__drawCursor();

    requestAnimationFrame(frame);
  }

  /* ---------- Init ---------- */
  function init() {
    measure();

    if (staticFrames) {
      startLoad(heroSection);
      loader.classList.add('is-done');
      requestAnimationFrame(frame);
      return;
    }

    const hero = heroSection.seq;
    let shown = false;
    hero.onProgressBase = hero.onProgress;
    hero.onProgress = (l, t) => {
      if (hero.onProgressBase) hero.onProgressBase(l, t);
      const pct = Math.round(l / t * 100);
      loaderFill.style.width = pct + '%';
      loaderPct.textContent = pct + '%';
    };
    heroSection.loading = true;
    hero.loadCritical().then(() => {
      hero.draw(0);
      loader.classList.add('is-done');
      loader.addEventListener('transitionend', () => loader.remove(), { once: true });
      shown = true;
      hero.loadAll();
    });
    // safety: never trap the user behind the loader
    setTimeout(() => { if (!shown) loader.classList.add('is-done'); }, 6000);

    requestAnimationFrame(frame);
  }

  window.__kb = {
    sections, staticFrames, reduced, CUT_PROGRESS, cache,
    preview: null,
    load: name => startLoad(sections.find(s => s.name === name))
  };

  /* Dev-only preview hooks for screenshot verification:
     ?pv=<seq>:<p> pins a canvas section and drives its progress directly;
     ?y=<px> jumps the page to a scroll offset after load. */
  function devPreview() {
    const q = new URLSearchParams(location.search);
    const pv = q.get('pv');
    if (pv) {
      const [n, pp] = pv.split(':');
      const sec = sections.find(x => x.name === n);
      if (sec) {
        window.__kb.preview = { name: n, p: parseFloat(pp) || 0 };
        startLoad(sec);
        const st = sec.el.querySelector('.seq-sticky');
        st.style.position = 'fixed'; st.style.inset = '0'; st.style.zIndex = '60';
      }
    }
    if (q.has('marks')) {
      document.fonts.ready.then(() => setTimeout(() => {
        const t = {};
        ['about', 'founder', 'matters', 'marketplace', 'stories', 'rooftop', 'site-footer']
          .forEach(id => { t[id] = Math.round(document.getElementById(id).getBoundingClientRect().top + scrollY); });
        t.doc = document.documentElement.scrollHeight;
        const b = document.querySelector('.rooftop-form button').getBoundingClientRect();
        t.subBtn = [Math.round(b.left), Math.round(b.right), innerWidth];
        document.title = JSON.stringify(t);
      }, 600));
    }
    if (q.has('menu')) {
      loader.classList.add('is-done');
      document.getElementById('menu-overlay').classList.add('is-open');
    }
    const y = q.get('y'), sec = q.get('sec');
    if (y || sec) {
      loader.classList.add('is-done');
      document.querySelectorAll('[data-reveal], .founder-beat, .matters-phrase')
        .forEach(el => el.classList.add('is-visible'));
      document.querySelector('.matters-phrase:last-of-type').classList.add('is-current');
      cache.matters = null;
      document.getElementById('founder-rail').style.setProperty('--fill', '0.8');
      const apply = () => {
        document.body.style.transform = '';
        void document.body.offsetHeight;
        let off = parseFloat(y) || 0;
        if (sec) {
          const [id, d] = sec.split(':');
          const el = document.getElementById(id);
          if (el) off = el.getBoundingClientRect().top + window.scrollY + (parseFloat(d) || 0);
        }
        document.body.style.transform = `translateY(-${off}px)`;
      };
      document.fonts.ready.then(() => setTimeout(apply, 300));
      setTimeout(apply, 2500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); devPreview(); });
  } else {
    init(); devPreview();
  }
})();
