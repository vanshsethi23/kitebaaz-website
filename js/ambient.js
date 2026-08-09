/* KITEBAAZ — ambient particles, custom cursor, scroll hint */
'use strict';

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Particles: dust and distant kites ---------- */
  const canvas = document.getElementById('particles');
  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d');
    let W, H, parts;
    function size() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    size();
    window.addEventListener('resize', size);
    parts = Array.from({ length: 36 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 0.3 + Math.random() * 1.5,
      vy: 0.06 + Math.random() * 0.22,
      vx: (Math.random() - 0.5) * 0.08,
      a: 0.05 + Math.random() * 0.25
    }));
    window.__drawParticles = function () {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.y -= p.vy;
        p.x += p.vx;
        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4;
        if (p.x > W + 4) p.x = -4;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = '#F4EFE6';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
  } else {
    window.__drawParticles = null;
  }

  /* ---------- Custom cursor (pointer: fine only) ---------- */
  const fine = window.matchMedia('(pointer: fine)').matches;
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (fine && !reduced && dot && ring) {
    let mx = -100, my = -100, rx = -100, ry = -100;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('mouseover', e => {
      const hot = e.target.closest('a, button, input, [role="button"]');
      ring.classList.toggle('is-hover', !!hot);
    }, { passive: true });
    window.__drawCursor = function () {
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    };
  } else {
    if (dot) dot.style.display = 'none';
    if (ring) ring.style.display = 'none';
    window.__drawCursor = null;
  }

  /* ---------- Scroll hint: appears after 2.5s idle, gone forever on first scroll ---------- */
  const hint = document.getElementById('scroll-hint');
  if (hint && !reduced) {
    let killed = false;
    const timer = setTimeout(() => { if (!killed) hint.classList.add('is-shown'); }, 2500);
    window.addEventListener('scroll', function onFirst() {
      killed = true;
      clearTimeout(timer);
      hint.classList.add('is-gone');
      window.removeEventListener('scroll', onFirst);
    }, { passive: true, once: true });
  }
})();
