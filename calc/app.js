/* ============================================================
   Nitrox Calc — calculatrice de révision Nitrox Confirmé
   Un vrai clavier de calculatrice. En haut, le menu des énoncés
   types du cours : on choisit, l'appli demande les valeurs une à
   une (= pour valider), puis écrit les lignes à taper sur sa
   calculatrice, résultat par résultat. = encore : les explications.
   Calculs : ../nitrox/examen.js (tables MN90, NOAA, OTU du cours).
   ============================================================ */
(function () {
  'use strict';
  const E = () => window.NitroxExamen, M = () => window.MN90Lib;
  const $ = s => document.querySelector(s);

  const { Q, ORDRE, n, hm } = window.NitroxAssistants;


  /* ---------- l'évaluation d'une saisie (pas d'eval) ---------- */
  function evaluer(s) {
    const t = String(s).replace(/\s/g, '').replace(/,/g, '.');
    let i = 0;
    const voir = () => t[i];
    function facteur() {
      if (voir() === '−' || voir() === '-') { i++; return -facteur(); }
      if (voir() === '+') { i++; return facteur(); }
      let v;
      if (voir() === '(') { i++; v = expr(); if (voir() === ')') i++; }
      else {
        const m = /^\d*\.?\d+|^\d+\./.exec(t.slice(i));
        if (!m) throw new Error('saisie');
        v = parseFloat(m[0]); i += m[0].length;
      }
      while (voir() === '%') { i++; v /= 100; }
      return v;
    }
    function terme() {
      let v = facteur();
      while (voir() === '×' || voir() === '÷' || voir() === '*' || voir() === '/') {
        const o = t[i++]; const w = facteur();
        v = o === '×' || o === '*' ? v * w : v / w;
      }
      return v;
    }
    function expr() {
      let v = terme();
      while (voir() === '+' || voir() === '−' || voir() === '-') { const o = t[i++]; const w = terme(); v = o === '+' ? v + w : v - w; }
      return v;
    }
    const v = expr();
    if (i < t.length) throw new Error('saisie');
    return v;
  }


  /* ---------- l'état ---------- */
  const S = { q: null, i: 0, v: {}, saisie: '', fini: false, expl: false, ruban: [] };
  const ruban = $('#ruban'), affichage = $('#affichage'), invite = $('#invite'), liste = $('#liste');

  ruban.classList.add('plie');
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  // Déplier = tout voir, explications comprises ; replier = les 2 dernières lignes
  // Déplier = toutes les lignes de calcul (sans explications) ; replier = les 2 dernières
  const plier = oui => { ruban.classList.toggle('plie', oui); S.expl = false; S.detail = null; rendre(); };
  ruban.addEventListener('click', e => {
    const td = e.target.closest('td[data-d]');
    if (td) {
      S.detail = S.detail && S.detail.id === td.dataset.id ? null : { id: td.dataset.id, t: td.dataset.d, tab: td.closest('.r-tab').dataset.i };
      if (ruban.classList.contains('plie')) ruban.classList.remove('plie');
      S.expl = false;   // une case touchée : son calcul seulement
      return rendre();
    }
    if (e.target.closest('.r-tab') && !ruban.classList.contains('plie')) return;   // une case sans calcul : rien
    plier(!ruban.classList.contains('plie'));
  });
  function rendreRuban() {
    const plie = ruban.classList.contains('plie');
    if (plie && S.q) {
      const items = S.fini ? [...(S.fin || []), ...S.ruban.filter(x => 'rep' in x)] : S.ruban.filter(x => 'val' in x);
      const sauve = S.ruban; S.ruban = items;
      try { return rendreTout(); } finally { S.ruban = sauve; }
    }
    return rendreTout();
  }
  function rendreTout() {
    const html = [];
    let vals = [];
    const vider = () => { if (vals.length) html.push(`<div class="r-vals">${vals.join('')}</div>`); vals = []; };
    S.ruban.forEach((x, i) => {
      if ('val' in x) { vals.push(`<div class="r-v"><span>${x.q}</span><b>${x.val}</b></div>`); return; }
      vider();
      if (x.h) html.push(`<div class="r-h">${x.h}</div>`);
      else if (x.tab) {
        const cellule = (c, j, k) => {
          if (c == null || c === '') return '<td></td>';
          if (typeof c === 'string') return `<td>${c}</td>`;
          const id = `${i}-${j}-${k}`, on = S.detail && S.detail.id === id;
          return c.d ? `<td data-d="${esc(c.d)}" data-id="${id}" class="${on ? 'sel' : ''}">${c.v}</td>` : `<td>${c.v}</td>`;
        };
        html.push(`<div class="r-tab" data-i="${i}"><table><thead><tr>${x.tab.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
          x.tab.rows.map((r, j) => { const cs = r.tot ? r.c : r; return `<tr${r.tot ? ' class="tot"' : ''}>${cs.map((c, k) => cellule(c, j, k)).join('')}</tr>`; }).join('') + '</tbody></table></div>');
      }
      else if (x.txt != null) html.push(`<div class="r-t">${x.txt}${S.expl && x.c ? `<small>${x.c}</small>` : ''}</div>`);
      else if ('rep' in x) { if (x.rep) html.push(`<div class="r-rep">→ ${x.rep}</div>`); }
      else if ('x' in x) { if (S.expl && x.x.trim()) html.push(`<div class="r-x">${x.x}</div>`); }
      else html.push(`<div class="r-l"><span class="k">${x.k}</span><span class="eg">=</span><b>${x.r}</b>${S.expl && x.c ? `<small>${x.c}</small>` : ''}</div>`);
    });
    vider();
    ruban.innerHTML = html.join('');
    if (!S.detail) ruban.scrollTop = ruban.scrollHeight;
  }
  function rendre() {
    liste.querySelectorAll('button').forEach(b => b.classList.toggle('on', (b.dataset.q || '') === (S.q?.id || '')));
    if (S.q && !S.fini) {
      const c = S.q.champs[S.i];
      invite.textContent = `${c.q}  (${String(c.v).replace('.', ',')} si vide)`;
    } else if (S.detail) invite.textContent = S.detail.t;
    else invite.textContent = '';
    invite.classList.toggle('detail', !!S.detail);
    affichage.textContent = S.saisie || '0';
    affichage.classList.toggle('vide', !S.saisie);
    rendreRuban();
  }

  function choisir(id) {
    S.q = Q.find(x => x.id === id) || null;
    S.i = 0; S.v = {}; S.saisie = ''; S.fini = false; S.expl = false; S.detail = null; S.fin = [];
    ruban.classList.add('plie');
    S.ruban = [];
    rendre();
  }

  function egal() {
    if (S.q && !S.fini) {
      const c = S.q.champs[S.i];
      let val = c.v;
      if (S.saisie) { try { val = evaluer(S.saisie); } catch (e) { flash(); return; } }
      S.v[c.id] = val;
      S.ruban.push({ q: c.s || c.q.replace(/ \?.*$/, '').replace(/\?$/, ''), val: n(val) });
      S.saisie = ''; S.i++;
      if (S.i >= S.q.champs.length) {
        S.fini = true;
        let r;
        try { r = S.q.calc(S.v); } catch (e) { r = { l: [{ txt: 'Calcul impossible : ' + e.message }], rep: '', x: '' }; }
        S.ruban.push(...r.l, { rep: r.rep || '' }, { x: r.x || '' });
        S.fin = r.fin || r.l.filter(x => x.k != null).slice(-1);
      }
      return rendre();
    }
    if (S.saisie) {
      try {
        const v = evaluer(S.saisie);
        S.ruban.push({ k: S.saisie, r: n(v, 6) });
        S.saisie = n(v, 6);
      } catch (e) { flash(); }
      return rendre();
    }
    if (S.q && S.fini) {
      if (ruban.classList.contains('plie')) return plier(false);   // 2e = : tout le calcul
      if (!S.expl) { S.expl = true; S.detail = null; rendre(); }    // 3e = : les explications
    }
  }
  function flash() { affichage.classList.add('err'); setTimeout(() => affichage.classList.remove('err'), 350); }

  function touche(k) {
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) { /* pas de vibreur */ }
    if (k === '=') return egal();
    if (k === 'AC') {
      if (!ruban.classList.contains('plie')) return plier(true);   // 1er AC : on replie, les explications s'en vont
      if (S.q) choisir(S.q.id); else { S.saisie = ''; S.ruban = []; rendre(); }
      return;
    }
    if (k === '⌫') { if (!S.saisie && !ruban.classList.contains('plie')) return plier(true); S.saisie = S.saisie.slice(0, -1); return rendre(); }
    if (k === ',' && /[\d]*,[\d]*$/.test(S.saisie.split(/[+−×÷()]/).pop())) return;
    S.saisie += k;
    rendre();
  }

  /* ---------- le clavier ---------- */
  const TOUCHES = ['AC', '⌫', '(', ')', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '%', '0', ',', '+'];
  $('#clavier').innerHTML = TOUCHES.map(k => `<button type="button" class="t${/[\d,]/.test(k) ? '' : /AC|⌫|\(|\)|%/.test(k) ? ' fn' : ' op'}" data-k="${k}">${k}</button>`).join('') +
    '<button type="button" class="t egal" data-k="=">=</button>';
  $('#clavier').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) touche(b.dataset.k); });
  document.addEventListener('keydown', e => {
    const map = { Enter: '=', '=': '=', Backspace: '⌫', Escape: 'AC', '*': '×', '/': '÷', '-': '−', '+': '+', '.': ',', ',': ',', '(': '(', ')': ')', '%': '%' };
    const k = /^\d$/.test(e.key) ? e.key : map[e.key];
    if (k) { e.preventDefault(); touche(k); }
  });
  liste.innerHTML = `<button type="button" data-q="">Calculatrice simple<small>sans énoncé</small></button>` +
    Q.map(x => `<button type="button" data-q="${x.id}">${x.t}<small>${x.e}</small></button>`).join('');
  const vue = v => {
    document.querySelectorAll('header button[data-vue]').forEach(b => b.classList.toggle('on', b.dataset.vue === v));
    document.querySelectorAll('.vue').forEach(x => { x.hidden = x.dataset.vue !== v; });
  };
  document.querySelector('header').addEventListener('click', e => { const b = e.target.closest('button[data-vue]'); if (b) vue(b.dataset.vue); });
  liste.addEventListener('click', e => { const b = e.target.closest('button[data-q]'); if (!b) return; choisir(b.dataset.q); vue('calc'); });
  // Glisser vers la gauche : les énoncés ; vers la droite : la calculatrice
  let x0 = null, y0 = 0;
  document.addEventListener('touchstart', e => { if (e.target.closest('#clavier, .r-tab')) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) vue(dx < 0 ? 'enonces' : 'calc');
    x0 = null;
  }, { passive: true });

  window.NitroxCalc = { evaluer, Q, choisir, touche };
  choisir('');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('../sw.js').catch(() => {});
})();
