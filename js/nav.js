/* KITEBAAZ — bottom nav, menu overlay, subscribe form, stories embeds */
'use strict';

(function () {
  /* ---------- Menu overlay ---------- */
  const menuBtn = document.getElementById('menu-btn');
  const overlay = document.getElementById('menu-overlay');
  const closeBtn = document.getElementById('menu-close');
  let lastFocus = null;

  function openMenu() {
    lastFocus = document.activeElement;
    overlay.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    closeBtn.focus();
    document.addEventListener('keydown', trapKeys);
  }
  function closeMenu() {
    overlay.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', trapKeys);
    if (lastFocus) lastFocus.focus();
  }
  function trapKeys(e) {
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key !== 'Tab') return;
    const focusables = overlay.querySelectorAll('a, button');
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  menuBtn.addEventListener('click', () => overlay.classList.contains('is-open') ? closeMenu() : openMenu());
  closeBtn.addEventListener('click', closeMenu);
  overlay.querySelectorAll('nav a[href^="#"]').forEach(a => a.addEventListener('click', closeMenu));

  /* ---------- Notify me → subscribe field ---------- */
  const notify = document.getElementById('notify-cta');
  const emailInput = document.getElementById('rooftop-email');
  if (notify && emailInput) {
    notify.addEventListener('click', () => {
      setTimeout(() => emailInput.focus({ preventScroll: true }), 700);
    });
  }

  /* ---------- Subscribe form ---------- */
  const form = document.getElementById('rooftop-form');
  const errEl = document.getElementById('rooftop-error');
  const okEl = document.getElementById('rooftop-success');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      errEl.classList.remove('is-shown');
      okEl.classList.remove('is-shown');
      const email = emailInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        errEl.textContent = 'That address doesn’t look right. Check it and try again.';
        errEl.classList.add('is-shown');
        emailInput.focus();
        return;
      }
      const endpoint = form.dataset.endpoint;
      if (endpoint) {
        // Form-encoded keeps this a "simple" request (no CORS preflight),
        // which is what Google Apps Script web apps require.
        const btn = form.querySelector('button');
        btn.disabled = true;
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            body: new URLSearchParams({ email })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.ok === false) throw new Error(data.error || 'bad status');
        } catch (_) {
          errEl.textContent = 'Something went wrong on our side. Try again in a minute.';
          errEl.classList.add('is-shown');
          return;
        } finally {
          btn.disabled = false;
        }
      } else {
        // No endpoint configured yet: open a mail draft instead.
        window.location.href = 'mailto:kitebaaz.in@gmail.com?subject=' +
          encodeURIComponent('Join the rooftop') + '&body=' + encodeURIComponent(email);
      }
      okEl.textContent = 'You’re on the rooftop. Watch the sky.'; // aria-live announcement
      openSubDialog();
      form.reset();
    });
  }

  /* ---------- Subscribe confirmation dialog ---------- */
  const subDialog = document.getElementById('sub-dialog');
  const subDone = document.getElementById('sub-dialog-done');
  let subLastFocus = null;

  function openSubDialog() {
    if (!subDialog) return;
    subLastFocus = document.activeElement;
    subDialog.hidden = false;
    requestAnimationFrame(() => subDialog.classList.add('is-open'));
    subDone.focus();
    document.addEventListener('keydown', subDialogKeys);
  }
  function closeSubDialog() {
    subDialog.classList.remove('is-open');
    document.removeEventListener('keydown', subDialogKeys);
    setTimeout(() => { subDialog.hidden = true; }, 320);
    okEl.classList.remove('is-shown');
    okEl.textContent = '';
    if (subLastFocus) subLastFocus.focus();
  }
  function subDialogKeys(e) {
    if (e.key === 'Escape') { closeSubDialog(); return; }
    if (e.key === 'Tab') {
      // small dialog: keep focus inside it
      const focusables = subDialog.querySelectorAll('button');
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  if (subDialog) {
    subDone.addEventListener('click', closeSubDialog);
    subDialog.querySelectorAll('[data-dialog-close]').forEach(el =>
      el.addEventListener('click', closeSubDialog));
  }

  /* ---------- Stories: swap in youtube-nocookie iframes on demand ---------- */
  document.querySelectorAll('.story-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.ytId;
      if (!id) return; // placeholder until real IDs are dropped in
      if (card.querySelector('iframe')) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.title = card.getAttribute('aria-label') || 'KITEBAAZ film';
      card.appendChild(iframe);
    });
  });
})();
