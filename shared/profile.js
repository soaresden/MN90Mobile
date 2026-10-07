/* ============================================================
   MN90 Mobile — Profil plongeur partagé (brevets, qualifications, matériel)
   Gardé dans le téléphone (localStorage "mn90-profile").
   Expose un seul objet global : window.MN90Profile
   Prérogatives : Code du sport, annexes III-16 b (air) et III-17 c (Nitrox).
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'mn90-profile';

  // Profondeurs max : encadré (PE) / autonome (PA)
  const LEVELS = [
    { id: 'N1', label: 'Niveau 1', short: 'N1', pe: 20, pa: 0 },
    { id: 'N2', label: 'Niveau 2', short: 'N2', pe: 40, pa: 20 },
    { id: 'N3', label: 'Niveau 3', short: 'N3', pe: 60, pa: 60 },
    { id: 'N4', label: 'Niveau 4 / Guide de palanquée', short: 'N4', pe: 60, pa: 60 },
    { id: 'MF', label: 'Moniteur (E3 / E4)', short: 'Moniteur', pe: 60, pa: 60 },
  ];
  const QUALS = [
    { id: 'PA12', label: 'PA12 · autonome 12 m', pa: 12 },
    { id: 'PE40', label: 'PE40 · encadré 40 m', pe: 40 },
    { id: 'PA40', label: 'PA40 · autonome 40 m', pa: 40 },
    { id: 'PE60', label: 'PE60 · encadré 60 m', pe: 60 },
  ];
  const NITROX = [
    { id: '', label: 'Aucune' },
    { id: 'PN', label: 'Nitrox', short: 'Nitrox' },
    { id: 'PNC', label: 'Nitrox Confirmé', short: 'Nx Conf' },
  ];
  const DEFAULT = {
    v: 1, level: '', quals: [], nitrox: '',
    gear: { tank: 15, press: 200, sac: 20, reserve: 50 },
  };

  const listeners = [];
  let current = null;

  function sanitize(p) {
    const out = JSON.parse(JSON.stringify(DEFAULT));
    if (!p || typeof p !== 'object') return out;
    if (LEVELS.some(l => l.id === p.level)) out.level = p.level;
    if (Array.isArray(p.quals)) out.quals = p.quals.filter(q => QUALS.some(x => x.id === q));
    if (NITROX.some(n => n.id === p.nitrox)) out.nitrox = p.nitrox;
    const g = p.gear || {};
    const num = (v, def, min, max) => (Number.isFinite(+v) && +v >= min && +v <= max ? +v : def);
    out.gear = {
      tank: num(g.tank, DEFAULT.gear.tank, 3, 40),
      press: num(g.press, DEFAULT.gear.press, 50, 300),
      sac: num(g.sac, DEFAULT.gear.sac, 5, 60),
      reserve: num(g.reserve, DEFAULT.gear.reserve, 0, 150),
    };
    out.saved = !!p.saved;
    return out;
  }

  function get() {
    if (current) return current;
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    current = sanitize(raw);
    return current;
  }

  function save(p) {
    current = sanitize(Object.assign({}, p, { saved: true }));
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch (e) { /* stockage indisponible */ }
    listeners.forEach(fn => { try { fn(current); } catch (e) { console.error(e); } });
    renderChips();
    return current;
  }

  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }

  const levelOf = p => LEVELS.find(l => l.id === p.level) || null;

  // Profondeurs max autorisées selon le niveau et les qualifications
  function rights(p) {
    const lvl = levelOf(p);
    if (!lvl) return null;
    let pe = lvl.pe, pa = lvl.pa, peBy = lvl.short, paBy = lvl.short;
    p.quals.forEach(id => {
      const q = QUALS.find(x => x.id === id);
      if (q && q.pe && q.pe > pe) { pe = q.pe; peBy = q.id; }
      if (q && q.pa && q.pa > pa) { pa = q.pa; paBy = q.id; }
    });
    return { pe, pa, peBy, paBy, pn: p.nitrox === 'PN' || p.nitrox === 'PNC', pnc: p.nitrox === 'PNC' };
  }

  /* Qualifications requises pour une plongée.
     dive = { depth, mode: 'enc' | 'auto', nitrox: bool, fo2 }
     Chaque item : { code, text, status: 'used' (jaune) | 'missing' (rouge) | 'forbidden' | 'unknown' } */
  function requirements(dive, p) {
    p = p || get();
    const r = rights(p);
    const items = [];
    const auto = dive.mode === 'auto';
    if (dive.depth > 60) {
      items.push({ code: '> 60 m', status: 'forbidden', text: 'Au-delà de 60 m : interdit à l’air comme au Nitrox (Code du sport).' });
    } else {
      const zone = dive.depth <= 12 ? 12 : dive.depth <= 20 ? 20 : dive.depth <= 40 ? 40 : 60;
      const code = (auto ? 'PA' : 'PE') + zone;
      const word = auto ? 'en autonomie' : 'encadré';
      if (!r) {
        items.push({ code, status: 'unknown', text: `${code} : ${dive.depth} m ${word}. Renseigne ton profil pour vérifier.` });
      } else {
        const max = auto ? r.pa : r.pe;
        if (max >= zone) {
          const by = auto ? r.paBy : r.peBy;
          const src = QUALS.some(q => q.id === by) ? `ta qualification ${by}` : `ton ${by}`;
          items.push({ code, status: 'used', text: `Tu utilises ${src} : ${word} jusqu’à ${zone} m.` });
        } else {
          const lvl = levelOf(p);
          const lim = max ? `${max} m max ${word}` : `pas d’autonomie (sauf qualification PA12)`;
          items.push({ code, status: 'missing', text: `Hors de tes prérogatives : ${dive.depth} m ${word} demande ${code}. ${lvl.label} : ${lim}.` });
        }
        if (auto && zone === 60 && max >= 60) {
          items.push({ code: 'PA60', status: 'info', text: 'Autonomie entre 40 et 60 m : réservée aux plongeurs majeurs, sur accord du directeur de plongée.' });
        }
      }
    }
    if (dive.nitrox) {
      const needConf = dive.fo2 > 0.40 + 1e-9;
      const code = needConf ? 'Nitrox Confirmé' : 'Nitrox';
      const pct = Math.round(dive.fo2 * 100);
      if (!r) items.push({ code, status: 'unknown', text: `Nx${pct} : qualification ${code} requise.` });
      else if (needConf ? r.pnc : r.pn) items.push({ code, status: 'used', text: `Tu utilises ta qualification ${p.nitrox === 'PNC' ? 'Nitrox Confirmé' : 'Nitrox'} (Nx${pct}).` });
      else items.push({ code, status: 'missing', text: needConf
        ? `Nx${pct} : au-delà de 40 % d’O₂, réservé au Nitrox Confirmé.`
        : `Nx${pct} : il te faut la qualification Nitrox.` });
    }
    return items;
  }

  function label(p) {
    p = p || get();
    const lvl = levelOf(p);
    if (!lvl) return 'Mon profil';
    const nx = NITROX.find(n => n.id === p.nitrox);
    return lvl.short + (nx && nx.short ? ' · ' + nx.short : '');
  }

  /* ---------- Fenêtre de saisie ---------- */
  let modal = null;

  function buildModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal-back';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pf-title">
        <h2 id="pf-title">🤿 Mon profil plongeur</h2>
        <p class="muted">Gardé uniquement dans ce téléphone. Il sert à vérifier tes prérogatives et à calculer ton autonomie dans tous les outils.</p>
        <fieldset><legend>Mon niveau</legend><div class="pills" data-pf="level">
          <label class="pill"><input type="radio" name="pf-level" value=""><span>Pas encore</span></label>
          ${LEVELS.map(l => `<label class="pill"><input type="radio" name="pf-level" value="${l.id}"><span>${l.short}</span></label>`).join('')}
        </div></fieldset>
        <fieldset><legend>Mes qualifications en plus</legend><div class="pills" data-pf="quals">
          ${QUALS.map(q => `<label class="pill"><input type="checkbox" value="${q.id}"><span>${q.label}</span></label>`).join('')}
        </div></fieldset>
        <fieldset><legend>Nitrox</legend><div class="pills" data-pf="nitrox">
          ${NITROX.map(n => `<label class="pill"><input type="radio" name="pf-nx" value="${n.id}"><span>${n.label}</span></label>`).join('')}
        </div></fieldset>
        <fieldset><legend>Mon matériel et ma consommation</legend><div class="grid2">
          <label class="field">Bloc (L)<input class="input" type="number" inputmode="decimal" data-g="tank" min="3" max="40" step="1"></label>
          <label class="field">Pression (bar)<input class="input" type="number" inputmode="numeric" data-g="press" min="50" max="300" step="10"></label>
          <label class="field">Conso surface (L/min)<input class="input" type="number" inputmode="numeric" data-g="sac" min="5" max="60" step="1"></label>
          <label class="field">Réserve (bar)<input class="input" type="number" inputmode="numeric" data-g="reserve" min="0" max="150" step="10"></label>
        </div><p class="muted small">Pas sûr de ta conso ? 20 L/min est la valeur utilisée en formation.</p></fieldset>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-act="later">Plus tard</button>
          <button type="button" class="btn btn-primary" data-act="save">Enregistrer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      if (e.target === modal) close();
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'save') { save(readModal()); close(); }
      else close();
    });
    modal.addEventListener('change', e => {
      // Nitrox Confirmé implique Nitrox : rien à cocher en plus, mais on garde la cohérence N1 + PA40 etc.
      if (e.target.name === 'pf-level') syncQuals();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && !modal.hidden) close(); });
    return modal;
  }

  // Les qualifications déjà incluses dans le niveau sont grisées
  function syncQuals() {
    const lvl = LEVELS.find(l => l.id === (modal.querySelector('input[name="pf-level"]:checked') || {}).value);
    modal.querySelectorAll('[data-pf="quals"] input').forEach(cb => {
      const q = QUALS.find(x => x.id === cb.value);
      const included = lvl && ((q.pe && lvl.pe >= q.pe) || (q.pa && lvl.pa >= q.pa));
      cb.disabled = !!included;
      cb.closest('.pill').title = included ? `Déjà inclus dans ton ${lvl.short}` : '';
      if (included) cb.checked = false;
    });
  }

  function fillModal(p) {
    modal.querySelectorAll('input[name="pf-level"]').forEach(r => { r.checked = r.value === p.level; });
    modal.querySelectorAll('[data-pf="quals"] input').forEach(c => { c.checked = p.quals.includes(c.value); });
    modal.querySelectorAll('input[name="pf-nx"]').forEach(r => { r.checked = r.value === p.nitrox; });
    modal.querySelectorAll('[data-g]').forEach(i => { i.value = p.gear[i.dataset.g]; });
    syncQuals();
  }

  function readModal() {
    const p = JSON.parse(JSON.stringify(get()));
    p.level = (modal.querySelector('input[name="pf-level"]:checked') || {}).value || '';
    p.quals = [...modal.querySelectorAll('[data-pf="quals"] input:checked')].map(c => c.value);
    p.nitrox = (modal.querySelector('input[name="pf-nx"]:checked') || {}).value || '';
    modal.querySelectorAll('[data-g]').forEach(i => { p.gear[i.dataset.g] = +i.value; });
    return p;
  }

  let lastFocus = null;
  function open() {
    buildModal();
    fillModal(get());
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('modal-open');
    const first = modal.querySelector('input:checked') || modal.querySelector('input');
    if (first) first.focus();
  }
  function close() {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.classList.remove('modal-open');
    if (!get().saved) save(get()); // "Plus tard" : on ne redemande pas à chaque ouverture
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function renderChips() {
    document.querySelectorAll('.profile-chip').forEach(btn => {
      btn.textContent = '🤿 ' + label();
      btn.title = 'Modifier mon profil plongeur';
    });
  }

  function init() {
    document.querySelectorAll('.profile-chip').forEach(btn => btn.addEventListener('click', open));
    renderChips();
    // À l'ouverture d'un outil, on demande le profil s'il n'a jamais été renseigné
    if (document.body && document.body.hasAttribute('data-ask-profile') && !get().saved) open();
  }

  window.MN90Profile = { LEVELS, QUALS, NITROX, get, save, onChange, rights, requirements, label, open };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
