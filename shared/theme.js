/* ── MN90Mobile — Gestionnaire de thème partagé ── */
(function () {
  const THEMES = [
    { id: 'dark',             label: '🌑 Nuit',         dot: '#00e8ff' },
    { id: 'deep-ocean',       label: '🌊 Grands fonds', dot: '#20b2aa' },
    { id: 'submarine-light',  label: '☀️ Surface',      dot: '#0077a8' },
    { id: 'sunset',           label: '🌅 Coucher',      dot: '#e76f51' },
    { id: 'military',         label: '🎖️ Militaire',    dot: '#90ba28' },
  ];
  const DEFAULT = 'dark';
  const KEY = 'mn90-theme';

  function apply(id) {
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem(KEY, id);
    document.querySelectorAll('.theme-option').forEach(el => {
      el.classList.toggle('active', el.dataset.theme === id);
    });
  }

  function init() {
    const saved = localStorage.getItem(KEY) || DEFAULT;
    apply(saved);

    // Remplir les dropdowns si présents
    document.querySelectorAll('.theme-dropdown').forEach(dd => {
      dd.innerHTML = THEMES.map(t =>
        `<div class="theme-option" data-theme="${t.id}">
           <span class="theme-dot" style="background:${t.dot}"></span>${t.label}
         </div>`
      ).join('');
      dd.querySelectorAll('.theme-option').forEach(opt => {
        opt.addEventListener('click', () => {
          apply(opt.dataset.theme);
          dd.classList.remove('open');
        });
      });
    });

    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const dd = btn.nextElementSibling;
        if (dd) dd.classList.toggle('open');
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.theme-dropdown').forEach(dd => dd.classList.remove('open'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
