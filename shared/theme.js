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

  // Vignettes d'aperçu : chaque vignette porte data-theme, elle s'affiche donc avec les couleurs de son thème
  function tiles(cur) {
    return THEMES.map(t => `<button type="button" class="th-tile${t.id === cur ? ' on' : ''}" data-theme="${t.id}" data-theme-pick="${t.id}" aria-pressed="${t.id === cur}" title="${t.label}" aria-label="${t.label}">
        <span class="th-prev" aria-hidden="true"><i class="th-bar"></i><i class="th-card"><b></b><b></b></i><i class="th-dot"></i></span>
        <span class="th-name">${t.label}</span></button>`).join('');
  }
  const markTiles = id => document.querySelectorAll('[data-theme-pick]').forEach(b => { const on = b.dataset.themePick === id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });

  function apply(id, persist) {
    if (!THEMES.some(t => t.id === id)) id = DEFAULT;
    document.documentElement.setAttribute('data-theme', id);
    if (persist) { try { localStorage.setItem(KEY, id); } catch (e) { /* stockage indisponible */ } }
    markTiles(id);
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

  // Langue de l'interface : choisie dans le menu 🌐 ou la fenêtre profil, sinon celle du navigateur
  const LANGS = [
    { id: 'fr', label: 'Français', short: 'FR' },
    { id: 'en', label: 'English', short: 'EN' },
    { id: 'es', label: 'Español', short: 'ES' },
    { id: 'it', label: 'Italiano', short: 'IT' },
    { id: 'pt-BR', label: 'Português (Brasil)', short: 'BR' },
    { id: 'pl', label: 'Polski', short: 'PL' },
  ];
  const LANG_KEY = 'mn90-lang';
  function readLang() {
    let id = null;
    try { id = localStorage.getItem(LANG_KEY); } catch (e) { id = null; }
    if (LANGS.some(l => l.id === id)) return id;
    const nav = String(navigator.language || 'fr').toLowerCase();
    const hit = LANGS.find(l => nav === l.id.toLowerCase()) || LANGS.find(l => nav.startsWith(l.id.slice(0, 2)));
    return hit ? hit.id : 'fr';
  }
  // Changer de langue : on enregistre et on recharge la page (rien n'est perdu, tout est gardé dans le navigateur)
  function setLang(id) {
    if (!LANGS.some(l => l.id === id)) return;
    try { localStorage.setItem(LANG_KEY, id); } catch (e) { /* stockage indisponible */ }
    location.reload();
  }
  const LANG = readLang();
  const COLLECT = /[?&]i18n=collect\b/.test(location.search);
  document.documentElement.lang = LANG;
  document.documentElement.setAttribute('data-lang', LANG);
  if (COLLECT) document.documentElement.setAttribute('data-i18n-collect', '');
  try {
    const me = document.currentScript && document.currentScript.src;
    if (me && (LANG !== 'fr' || COLLECT)) {
      // Page masquée le temps de la traduction (2,5 s au plus, au cas où un fichier manque)
      if (LANG !== 'fr') {
        document.documentElement.classList.add('i18n-wait');
        setTimeout(() => document.documentElement.classList.remove('i18n-wait'), 2500);
      }
      const add = src => { const sc = document.createElement('script'); sc.src = new URL(src, me).href; sc.async = false; document.head.appendChild(sc); };
      add('i18n.js');
      if (LANG !== 'fr') add(`lang/${LANG}.js`);
    }
  } catch (e) { document.documentElement.classList.remove('i18n-wait'); }

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

  // Menu 🌐 placé à côté du 🎨 dans chaque barre du haut
  function langMenu() {
    document.querySelectorAll('.navbar .theme-picker:not(.lang-picker)').forEach(tp => {
      if (tp.parentElement.querySelector('.lang-picker')) return;
      const cur = LANGS.find(l => l.id === LANG) || LANGS[0];
      const box = document.createElement('div');
      box.className = 'theme-picker lang-picker';
      box.innerHTML = `<button type="button" class="lang-btn" aria-haspopup="true" aria-label="Langue · Language" title="Langue · Language"><span aria-hidden="true">🌐</span> ${cur.short}</button>
        <div class="lang-dropdown notranslate" role="menu">${LANGS.map(l => `<button type="button" class="theme-option${l.id === LANG ? ' active' : ''}" role="menuitemradio" aria-checked="${l.id === LANG}" data-lang="${l.id}"><b class="lang-code">${l.short}</b>${l.label}</button>`).join('')}</div>`;
      tp.parentElement.insertBefore(box, tp);
      const dd = box.querySelector('.lang-dropdown');
      box.querySelector('.lang-btn').addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.theme-dropdown.open').forEach(x => x.classList.remove('open'));
        dd.classList.toggle('open');
      });
      dd.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b && b.dataset.lang !== LANG) setLang(b.dataset.lang); else dd.classList.remove('open'); });
    });
  }

  function init() {
    langMenu();
    document.querySelectorAll('[data-device]').forEach(el => { el.textContent = storedWhere(); });
    document.querySelectorAll('.theme-dropdown').forEach(dd => {
      dd.setAttribute('role', 'menu');
      dd.innerHTML = `<div class="fz-row" role="group" aria-label="Taille du texte"><span>🔍 Texte</span>
          <button type="button" class="fz-btn" data-fz="-1" aria-label="Texte plus petit">A−</button><b></b>
          <button type="button" class="fz-btn" data-fz="1" aria-label="Texte plus grand">A+</button></div>
        <div class="th-grid">${tiles(read())}</div>
        <div class="th-foot"><button type="button" class="btn btn-primary btn-sm" data-th-ok>✓ Valider</button></div>`;
      // Les clics dans le menu ne le ferment pas : on essaie les thèmes, puis on valide
      dd.addEventListener('click', e => {
        e.stopPropagation();
        const fz = e.target.closest('[data-fz]');
        if (fz) {
          const i = FZ.indexOf(fzCur) + +fz.dataset.fz;
          if (i >= 0 && i < FZ.length) applyFz(FZ[i], true);
          return;
        }
        const tile = e.target.closest('[data-theme-pick]');
        if (tile) { apply(tile.dataset.themePick, true); return; }
        if (e.target.closest('[data-th-ok]')) dd.classList.remove('open');
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
    // Le menu des thèmes reste ouvert tant qu'on n'a pas validé (ou Échap) ; celui des langues se ferme au clic dehors
    document.addEventListener('click', () => {
      document.querySelectorAll('.lang-dropdown.open').forEach(dd => dd.classList.remove('open'));
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.querySelectorAll('.theme-dropdown.open, .lang-dropdown.open').forEach(dd => dd.classList.remove('open'));
    });
    apply(read(), false);
    applyFz(fzCur, false);
  }

  window.MN90Theme = { THEMES, apply: id => apply(id, true), current: read, device, storedWhere, LANGS, lang: LANG, setLang, tiles };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
