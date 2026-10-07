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
    // Sans mode imposé : autonomie si le niveau le permet, sinon encadré
    const forced = dive.mode === 'auto' || dive.mode === 'enc' ? dive.mode : null;
    const srcOf = by => (QUALS.some(q => q.id === by) ? `ta qualification ${by}` : `ton ${by}`);
    if (dive.depth > 60) {
      items.push({ code: '> 60 m', status: 'forbidden', text: 'Au-delà de 60 m : interdit à l’air comme au Nitrox (Code du sport).' });
    } else {
      const zone = dive.depth <= 12 ? 12 : dive.depth <= 20 ? 20 : dive.depth <= 40 ? 40 : 60;
      if (!r) {
        items.push({ code: 'PA' + zone, status: 'unknown', text: `${dive.depth} m demande PA${zone} en autonomie ou PE${zone} encadré. Renseigne ton profil pour vérifier.` });
      } else if (forced !== 'enc' && r.pa >= zone) {
        items.push({ code: 'PA' + zone, status: 'used', text: `Tu utilises ${srcOf(r.paBy)} : en autonomie jusqu’à ${zone} m.` });
        if (zone === 60) items.push({ code: 'PA60', status: 'info', text: 'Autonomie entre 40 et 60 m : réservée aux plongeurs majeurs, sur accord du directeur de plongée.' });
      } else if (forced !== 'auto' && r.pe >= zone) {
        const auto = r.pa ? `au-delà de ton autonomie (PA${r.pa})` : 'tu n’as pas d’autonomie';
        items.push({ code: 'PE' + zone, status: 'used', text: `Possible uniquement encadré : tu utilises ${srcOf(r.peBy)} (PE${zone}), ${auto}.` });
      } else {
        const lvl = levelOf(p);
        items.push({ code: 'PE' + zone, status: 'missing', text: `Hors de tes prérogatives : ${dive.depth} m demande PE${zone} (encadré) ou PA${zone} (autonome). ${lvl.label} : ${r.pe} m encadré${r.pa ? `, ${r.pa} m en autonomie` : ''}.` });
      }
    }
    if (dive.nitrox) {
      const needConf = dive.fo2 > 0.40 + 1e-9;
      const code = needConf ? 'Nitrox Confirmé' : 'Nitrox';
      const pct = Math.round(dive.fo2 * 100);
      const mix = pct >= 100 ? 'O₂ pur' : `Nx${pct}`;
      if (!r) items.push({ code, status: 'unknown', text: `${mix} : qualification ${code} requise.` });
      else if (needConf ? r.pnc : r.pn) items.push({ code, status: 'used', text: `Tu utilises ta qualification ${p.nitrox === 'PNC' ? 'Nitrox Confirmé' : 'Nitrox'} (${mix}).` });
      else items.push({ code, status: 'missing', text: needConf
        ? `${mix} : au-delà de 40 % d’O₂, réservé au Nitrox Confirmé.`
        : `${mix} : il te faut la qualification Nitrox.` });
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

  // Langue en tête du profil : c'est la première chose qu'on choisit au premier lancement
  function langRow() {
    const T = window.MN90Theme;
    if (!T || !T.LANGS) return '';
    return `<div class="pf-lang notranslate" role="group" aria-label="Langue · Language"><span aria-hidden="true">🌐</span>${T.LANGS.map(l => `<button type="button" class="pf-lang-btn${l.id === T.lang ? ' on' : ''}" data-lang="${l.id}" aria-pressed="${l.id === T.lang}">${l.label}</button>`).join('')}</div>`;
  }

  // Thème choisi dès le premier lancement, appliqué tout de suite
  function themeRow() {
    const T = window.MN90Theme;
    if (!T || !T.tiles) return '';
    const cur = T.THEMES.find(t => t.id === T.current()) || T.THEMES[0];
    return `<div class="pf-theme" role="group" aria-label="Thème"><span class="pf-theme-lbl">🎨 Thème · <b id="pf-th-name">${cur.label}</b></span><div class="th-grid th-mini">${T.tiles(cur.id)}</div></div>`;
  }

  function buildModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal-back';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="modal pf-modal" role="dialog" aria-modal="true" aria-labelledby="pf-title">
        <div class="pf-head"><h2 id="pf-title">🤿 Mon profil plongeur</h2>${langRow()}</div>
        <p class="pf-note muted">Gardé uniquement sur ${window.MN90Theme && window.MN90Theme.storedWhere ? window.MN90Theme.storedWhere() : 'cet appareil'} (rien n’est envoyé). Il sert à vérifier tes prérogatives et à calculer ton autonomie dans tous les outils.</p>
        ${themeRow()}
        <div class="pf-cols"><div>
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
        </div><div>
        <fieldset><legend>Mon matériel et ma consommation</legend><div class="pf-gear"><div class="gear-art" id="pf-gear"></div><div class="grid2">
          <label class="field">Bloc (L)<input class="input" type="number" inputmode="decimal" data-g="tank" min="3" max="40" step="1"></label>
          <label class="field">Pression bouteille de départ (bar)<input class="input" type="number" inputmode="numeric" data-g="press" min="50" max="300" step="10"></label>
          <label class="field">Conso surface (L/min)<input class="input" type="number" inputmode="numeric" data-g="sac" min="5" max="60" step="1"></label>
          <label class="field">Réserve (bar)<input class="input" type="number" inputmode="numeric" data-g="reserve" min="0" max="150" step="10"></label>
        </div></div><p class="muted small">Pas sûr de ta conso ? 20 L/min est la valeur utilisée en formation.</p></fieldset>
        </div></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" data-act="later">Plus tard</button>
          <button type="button" class="btn btn-primary" data-act="save">Enregistrer</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      if (e.target === modal) close();
      const th = e.target.closest('[data-theme-pick]');
      if (th && window.MN90Theme) {
        window.MN90Theme.apply(th.dataset.themePick);
        const t = window.MN90Theme.THEMES.find(x => x.id === th.dataset.themePick), nm = modal.querySelector('#pf-th-name');
        if (t && nm) nm.textContent = t.label;
        return;
      }
      const lg = e.target.closest('[data-lang]');
      if (lg && window.MN90Theme && lg.dataset.lang !== window.MN90Theme.lang) { window.MN90Theme.setLang(lg.dataset.lang); return; }
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'save') { save(readModal()); close(); }
      else close();
    });
    // Le dessin suit les valeurs en direct
    modal.addEventListener('input', e => { if (e.target.matches('[data-g]')) drawGear(); });
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

  function drawGear() {
    const box = modal && modal.querySelector('#pf-gear');
    if (!box) return;
    const g = {};
    modal.querySelectorAll('[data-g]').forEach(i => { g[i.dataset.g] = +i.value; });
    box.innerHTML = gearSvg(g, { o2: 21 });
    fitSvg(box);
  }

  function fillModal(p) {
    modal.querySelectorAll('input[name="pf-level"]').forEach(r => { r.checked = r.value === p.level; });
    modal.querySelectorAll('[data-pf="quals"] input').forEach(c => { c.checked = p.quals.includes(c.value); });
    modal.querySelectorAll('input[name="pf-nx"]').forEach(r => { r.checked = r.value === p.nitrox; });
    modal.querySelectorAll('[data-g]').forEach(i => { i.value = p.gear[i.dataset.g]; });
    syncQuals();
    drawGear();
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

  /* ---------- Dessin du matériel : plongeur et bouteille ----------
     opts = { o2: 21..100 }. La bouteille grossit avec la contenance, l'air monte avec
     la pression de départ (bulles), la réserve est en rouge pâle au fond, les traits de
     souffle au détendeur suivent la consommation. Composition comme dans le cours :
     O2 en vert en haut, azote en jaune en dessous, avec leurs pourcentages. */
  let gearUid = 0;
  function gearSvg(g, opts) {
    const o2 = Math.round((opts && opts.o2) || 21);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, +v || 0));
    const V = clamp(g.tank, 6, 24), P = clamp(g.press, 0, 300), R = clamp(g.reserve, 0, P), sac = clamp(g.sac, 5, 60);
    const id = 'gs' + (++gearUid);
    const O2C = '#43A047', N2C = '#F2E100', air = 'var(--text2)';
    const h = Math.round(44 + V * 3.3), w = Math.round(14 + V * 0.95);   // 15 L -> 94 x 28
    const right = 106, bx = right - w, top = 52, bottom = top + h, cx = bx + w / 2;
    const inner = h - 8;
    const fillH = P / 300 * inner, resH = R / 300 * inner;
    const nBreath = Math.max(1, Math.min(6, Math.round(sac / 7)));
    let s = `<svg viewBox="0 0 250 ${Math.max(200, bottom + 20)}" role="img" aria-label="Bouteille de ${V} litres à ${P} bars, réserve ${R} bars, consommation ${sac} litres par minute">`;
    s += `<defs><clipPath id="${id}"><rect x="${bx + 3}" y="${top + 4}" width="${w - 6}" height="${inner}" rx="${(w - 6) / 2}"/></clipPath></defs>`;
    // Plongeur (de profil, face à droite)
    s += `<path d="M110 118 L100 172 L90 180 L110 180 L118 128 M132 118 L142 172 L134 182 L156 182 L148 172 L140 120" style="fill:none;stroke:var(--text2)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<rect x="106" y="58" width="36" height="66" rx="12" style="fill:var(--surface2);stroke:var(--text2)" stroke-width="2.5"/>`;
    s += `<path d="M138 68 Q156 80 158 100" style="fill:none;stroke:var(--text2)" stroke-width="6" stroke-linecap="round"/>`;
    s += `<circle cx="128" cy="40" r="15" style="fill:var(--surface2);stroke:var(--text2)" stroke-width="2.5"/>`;
    s += `<rect x="131" y="31" width="14" height="10" rx="3" style="fill:var(--water1);stroke:var(--text2)" stroke-width="2"/>`;
    // Bouteille sur le dos : corps, air (pression), réserve, robinet
    s += `<rect x="${bx}" y="${top}" width="${w}" height="${h}" rx="${w / 2}" style="fill:var(--surface)"/>`;
    s += `<g clip-path="url(#${id})">`;
    const o2H = fillH * o2 / 100, n2H = fillH - o2H, gTop = bottom - 4 - fillH;
    s += `<rect x="${bx}" y="${gTop}" width="${w}" height="${o2H}" fill="${O2C}"/>`;
    s += `<rect x="${bx}" y="${gTop + o2H}" width="${w}" height="${n2H}" fill="${N2C}"/>`;
    s += `<rect x="${bx}" y="${bottom - 4 - resH}" width="${w}" height="${resH}" style="fill:var(--danger)" fill-opacity=".35"/>`;
    if (resH > 1) s += `<line x1="${bx}" x2="${right}" y1="${bottom - 4 - resH}" y2="${bottom - 4 - resH}" style="stroke:var(--danger)" stroke-width="1.5" stroke-dasharray="3 2"/>`;
    if (fillH > 14) {
      for (let i = 0; i < 4; i++) {
        const x = bx + 6 + (i * (w - 12)) / 3, y0 = bottom - 8, y1 = bottom - 4 - fillH + 4, d = 2 + i * 0.6;
        s += `<circle cx="${x.toFixed(1)}" cy="${y0}" r="${1.6 + (i % 2)}" fill="#fff" fill-opacity=".85"><animate attributeName="cy" values="${y0};${y1}" dur="${d}s" begin="${i * 0.5}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;0" dur="${d}s" begin="${i * 0.5}s" repeatCount="indefinite"/></circle>`;
      }
    }
    s += `</g>`;
    s += `<rect x="${bx}" y="${top}" width="${w}" height="${h}" rx="${w / 2}" fill="none" stroke="#1E6FD9" stroke-width="3"/>`;   // trait bleu autour du gaz
    // Pourcentages dans la bouteille (O2 en blanc sur vert, N2 en foncé sur jaune)
    const fs = Math.max(8, Math.min(11, w * 0.36));
    const f1 = Math.min(fs, o2H - 1), f2 = Math.min(fs, n2H - 1);   // le texte s'adapte à la place
    if (f1 >= 6.5) s += `<text x="${cx}" y="${gTop + o2H / 2 + f1 / 2.8}" text-anchor="middle" font-size="${f1.toFixed(1)}" font-weight="800" fill="#fff">${o2}%</text>`;
    if (f2 >= 6.5) s += `<text x="${cx}" y="${gTop + o2H + n2H / 2 + f2 / 2.8}" text-anchor="middle" font-size="${f2.toFixed(1)}" font-weight="800" fill="#3a3500">${100 - o2}%</text>`;
    s += `<rect x="${cx - 5}" y="${top - 9}" width="10" height="10" rx="2" style="fill:var(--text2)"/>`;
    // Flexible jusqu'au détendeur
    s += `<path d="M${cx} ${top - 7} C ${cx} 18, 150 14, 146 40" style="fill:none;stroke:var(--text2)" stroke-width="3"/>`;
    s += `<circle cx="146" cy="44" r="5" style="fill:var(--text2)"/>`;
    // Souffle : plus il y a de traits, plus le plongeur consomme
    for (let i = 0; i < nBreath; i++) {
      const a = -0.9 + i * (1.5 / Math.max(1, nBreath - 1 || 1));
      const x1 = 154 + Math.cos(a) * 8, y1 = 44 + Math.sin(a) * 8, x2 = 154 + Math.cos(a) * (18 + i % 2 * 5), y2 = 44 + Math.sin(a) * (18 + i % 2 * 5);
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" style="stroke:${air}" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    // Étiquettes avec traits de rappel
    const lab = (x, y, x2, y2, l1, l2, anchor, color) =>
      `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" style="stroke:var(--text2)" stroke-width="1"/>` +
      `<text x="${x2 + (anchor === 'end' ? -3 : 3)}" y="${y2 - 2}" text-anchor="${anchor}" font-size="10" style="fill:var(--text2)">${l1}</text>` +
      `<text x="${x2 + (anchor === 'end' ? -3 : 3)}" y="${y2 + 10}" text-anchor="${anchor}" font-size="11.5" font-weight="800" style="fill:${color || 'var(--text)'}">${l2}</text>`;
    s += lab(bx, top + 8, bx - 12, top + 8, 'Contenance', `${V} L`, 'end');
    const dY = Math.max(top + 34, Math.min(bottom - 4 - fillH + 3, bottom - 36));
    s += lab(bx + 2, Math.max(top + 6, bottom - 4 - fillH + 3), bx - 12, dY, 'Départ', `${P} b`, 'end', air);
    s += lab(bx + 2, bottom - 6, bx - 12, bottom - 4, 'Réserve', `${R} b`, 'end', 'var(--danger)');
    // Conso au-dessus du souffle, légende O₂ / N₂ sous les pieds (le dessin reste compact en largeur)
    s += `<text x="168" y="12" text-anchor="middle" font-size="10" style="fill:var(--text2)">Conso</text><text x="168" y="24" text-anchor="middle" font-size="11.5" font-weight="800" style="fill:var(--text)">${sac} L/min</text>`;
    const ly = Math.max(194, bottom + 14);
    s += `<rect x="${bx - 4}" y="${ly - 9}" width="10" height="10" fill="${O2C}"/><text x="${bx + 9}" y="${ly}" font-size="10" style="fill:var(--text2)">O₂ ${o2} %</text>`;
    s += `<rect x="${bx + 56}" y="${ly - 9}" width="10" height="10" fill="${N2C}"/><text x="${bx + 69}" y="${ly}" font-size="10" style="fill:var(--text2)">N₂ ${100 - o2} %</text>`;
    s += `</svg>`;
    return s;
  }

  // Recadre un dessin inséré dans la page au plus près de son contenu (le plongeur grandit)
  function fitSvg(box) {
    const svg = box && box.querySelector('svg');
    if (!svg || !svg.getBBox) return;
    try {
      const b = svg.getBBox();
      if (b.width > 0 && b.height > 0) svg.setAttribute('viewBox', `${(b.x - 3).toFixed(1)} ${(b.y - 3).toFixed(1)} ${(b.width + 6).toFixed(1)} ${(b.height + 6).toFixed(1)}`);
    } catch (e) { /* dessin non affiché : on garde le cadre d'origine */ }
  }

  window.MN90Profile = { LEVELS, QUALS, NITROX, get, save, onChange, rights, requirements, label, open, gearSvg, fitSvg };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
