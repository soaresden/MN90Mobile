/* ============================================================
   MN90 Mobile — Gestionnaire de thème partagé
   À charger dans <head> SANS defer : le thème est posé avant l'affichage.
   Clé localStorage "mn90-theme". Événement "mn90:theme" à chaque changement.
   ============================================================ */
(function () {
  'use strict';

  const THEMES = [
    { id: 'submarine-light', label: '☀️ Sous-marin clair', dot: '#0077a8' },
    { id: 'dark',            label: '🌑 Nuit',             dot: '#22d3ee' },
    { id: 'deep-ocean',      label: '🌊 Grands fonds',     dot: '#2dd4bf' },
    { id: 'sunset',          label: '🌅 Coucher de soleil', dot: '#c2410c' },
    { id: 'military',        label: '🎖️ Militaire',        dot: '#a3c940' },
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

  function init() {
    document.querySelectorAll('.theme-dropdown').forEach(dd => {
      dd.setAttribute('role', 'menu');
      dd.innerHTML = THEMES.map(t =>
        `<button type="button" class="theme-option" role="menuitemradio" data-theme="${t.id}">
           <span class="theme-dot" style="background:${t.dot}"></span>${t.label}
         </button>`).join('');
      dd.addEventListener('click', e => {
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
  }

  window.MN90Theme = { THEMES, apply: id => apply(id, true), current: read };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
