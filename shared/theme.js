/* ============================================================
   MN90 Mobile — Gestionnaire de thème partagé
   À charger dans <head> SANS defer : le thème est posé avant l'affichage.
   Clé localStorage "mn90-theme". Événement "mn90:theme" à chaque changement.
   ============================================================ */
(function () {
  'use strict';

  const THEMES = [
    { id: 'submarine-light', label: '☀️ Sous-marin clair',   dot: '#006a96' },
    { id: 'dark',            label: '🌑 Nuit',                dot: '#22d3ee' },
    { id: 'deep-ocean',      label: '🌊 Grands fonds',        dot: '#2dd4bf' },
    { id: 'sunset',          label: '🌅 Coucher de soleil',   dot: '#b23c0e' },
    { id: 'octobre-rose',    label: '🎗️ Octobre rose',        dot: '#db2777' },
    { id: 'ouistreham',      label: '⛵ Ouistreham',          dot: '#1D4E89' },
    { id: 'tortue',          label: '🐢 Tortue',              dot: '#2f6b3a' },
    { id: 'hippocampe',      label: '🐉 Hippocampe',          dot: '#f5b83d' },
    { id: 'crevette',        label: '🦐 Crevette',            dot: '#e8603c' },
    { id: 'nudibranche',     label: '🐌 Nudibranche',         dot: '#c084fc' },
    { id: 'poisson-globe',   label: '🐡 Poisson-globe',       dot: '#a07a18' },
    { id: 'poisson-clown',   label: '🐠 Poisson-clown',       dot: '#ea580c' },
    { id: 'axolotl',         label: '🦎 Axolotl',             dot: '#c026d3' },
    { id: 'abysses',         label: '🦑 Créature des abysses', dot: '#5eead4' },
    { id: 'lochness',        label: '🦕 Loch Ness',           dot: '#9fd18b' },
  ];
  const DEFAULT = 'submarine-light';
  const KEY = 'mn90-theme';

  function read() {
    let id = null;
    try { id = localStorage.getItem(KEY); } catch (e) { id = null; }
    return THEMES.some(t => t.id === id) ? id : DEFAULT;
  }

  function apply(id, persist) {
    if (!THEMES.some(t => t.id === id)) id = DEFAULT;
    document.documentElement.setAttribute('data-theme', id);
    if (persist) { try { localStorage.setItem(KEY, id); } catch (e) { /* stockage indisponible */ } }
    document.querySelectorAll('.theme-option').forEach(el => {
      const on = el.dataset.theme === id;
      el.classList.toggle('active', on);
      el.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('mn90:theme', { detail: id }));
  }

  // Pose immédiate (avant le rendu de la page)
  document.documentElement.setAttribute('data-theme', read());

  // Taille du texte (boutons A− / A+ du menu 🎨) : agit sur les tailles en rem, pas sur la mise en page
  const FZ = [0.9, 1, 1.12, 1.25, 1.4];
  const FZ_KEY = 'mn90-textsize';
  function readFz() {
    let v = 1;
    try { v = parseFloat(localStorage.getItem(FZ_KEY)) || 1; } catch (e) { v = 1; }
    return FZ.includes(v) ? v : 1;
  }
  let fzCur = 1;
  function applyFz(v, persist) {
    fzCur = v;
    document.documentElement.style.setProperty('--fz', String(v));
    if (persist) { try { localStorage.setItem(FZ_KEY, String(v)); } catch (e) { /* stockage indisponible */ } }
    document.querySelectorAll('.fz-row').forEach(r => {
      r.querySelector('b').textContent = Math.round(v * 100) + ' %';
      r.querySelector('[data-fz="-1"]').disabled = v <= FZ[0];
      r.querySelector('[data-fz="1"]').disabled = v >= FZ[FZ.length - 1];
    });
    if (persist) window.dispatchEvent(new Event('resize'));   // graphiques et barre du haut se recalent
  }
  applyFz(readFz(), false);

  // Appli installable et hors ligne (PWA) : manifeste + service worker, depuis la racine du site
  try {
    const me = document.currentScript && document.currentScript.src;
    if (me) {
      const root = new URL('../', me);
      if (!document.querySelector('link[rel="manifest"]')) {
        const l = document.createElement('link'); l.rel = 'manifest'; l.href = new URL('manifest.webmanifest', root).href;
        document.head.appendChild(l);
        const m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#006a96';
        document.head.appendChild(m);
        const fi = document.createElement('link'); fi.rel = 'icon'; fi.type = 'image/svg+xml'; fi.href = new URL('icons/logo.svg', root).href;
        document.head.appendChild(fi);
        const a = document.createElement('link'); a.rel = 'apple-touch-icon'; a.href = new URL('icons/apple-touch-icon.png', root).href;
        document.head.appendChild(a);
      }
      if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        window.addEventListener('load', () => { navigator.serviceWorker.register(new URL('sw.js', root).href).catch(() => {}); });
      }
    }
  } catch (e) { /* pas de PWA : le site marche quand même */ }

  // Type d'appareil, pour parler juste : « ce téléphone », « cette tablette », « cet ordinateur »
  function device() {
    const ua = navigator.userAgent || '';
    const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;          // iPad récent
    if (/iPad|Tablet/i.test(ua) || touchMac || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'cette tablette';
    if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'ce téléphone';
    return 'cet ordinateur';
  }
  // Les données (profil, briefing, thème) restent dans le navigateur utilisé
  const storedWhere = () => `${device()}, dans ce navigateur`;

  function init() {
    document.querySelectorAll('[data-device]').forEach(el => { el.textContent = storedWhere(); });
    document.querySelectorAll('.theme-dropdown').forEach(dd => {
      dd.setAttribute('role', 'menu');
      dd.innerHTML = `<div class="fz-row" role="group" aria-label="Taille du texte"><span>🔍 Texte</span>
          <button type="button" class="fz-btn" data-fz="-1" aria-label="Texte plus petit">A−</button><b></b>
          <button type="button" class="fz-btn" data-fz="1" aria-label="Texte plus grand">A+</button></div>` + THEMES.map(t =>
        `<button type="button" class="theme-option" role="menuitemradio" data-theme="${t.id}">
           <span class="theme-dot" style="background:${t.dot}"></span>${t.label}
         </button>`).join('');
      dd.addEventListener('click', e => {
        const fz = e.target.closest('[data-fz]');
        if (fz) {
          e.stopPropagation();                       // le menu reste ouvert pour enchaîner les clics
          const i = FZ.indexOf(fzCur) + +fz.dataset.fz;
          if (i >= 0 && i < FZ.length) applyFz(FZ[i], true);
          return;
        }
        const opt = e.target.closest('.theme-option');
        if (!opt) return;
        apply(opt.dataset.theme, true);
        dd.classList.remove('open');
      });
    });
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.setAttribute('aria-haspopup', 'true');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const dd = btn.parentElement && btn.parentElement.querySelector('.theme-dropdown');
        if (dd) dd.classList.toggle('open');
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.theme-dropdown.open').forEach(dd => dd.classList.remove('open'));
    });
    apply(read(), false);
    applyFz(fzCur, false);
  }

  window.MN90Theme = { THEMES, apply: id => apply(id, true), current: read, device, storedWhere };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
