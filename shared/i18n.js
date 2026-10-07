/* ============================================================
   MN90 Mobile — Traduction de l'interface
   Le site est écrit en français. Ce moteur traduit le texte affiché
   (y compris celui que les calculs génèrent à la volée) à l'aide d'un
   dictionnaire par langue : shared/lang/<code>.js appelle MN90I18n.add({...}).

   Les nombres sont remplacés par {0}, {1}… dans les clés : une seule
   entrée couvre « 30 m », « 45 m »… Ce qui n'est pas traduit reste en français.
   Mode collecte (?i18n=collect) : liste les textes rencontrés sans traduction,
   via MN90I18n.missing().
   ============================================================ */
(function () {
  'use strict';

  const root = document.documentElement;
  const LANG = root.getAttribute('data-lang') || 'fr';
  const COLLECT = root.hasAttribute('data-i18n-collect');
  const DOT = LANG === 'en';                         // décimales avec un point en anglais
  const D = Object.create(null);
  const miss = new Map();                            // clé → nombre de rencontres (mode collecte)
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const NUM = /\d+(?:[.,]\d+)?/g;
  const LETTER = /[A-Za-zÀ-ÖØ-öø-ÿŒœ]/;
  const done = new WeakMap();                        // nœud texte → [génération, dernier texte posé]
  let started = false, gen = 0;

  const fmtNum = n => (DOT ? String(n).replace(/(\d),(\d)/g, '$1.$2') : n);

  // Texte français → texte traduit (ou null si rien à faire)
  function tr(s) {
    if (!s) return null;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    const core = m[2];
    if (!core) return null;
    if (!LETTER.test(core)) return DOT && /\d,\d/.test(core) ? m[1] + fmtNum(core) + m[3] : null;
    const nums = [];
    const key = core.replace(/\s+/g, ' ').replace(NUM, x => { nums.push(x); return '{' + (nums.length - 1) + '}'; });
    const v = D[key];
    if (v === undefined) {
      if (COLLECT) miss.set(key, (miss.get(key) || 0) + 1);
      return null;
    }
    return m[1] + v.replace(/\{(\d+)\}/g, (_, i) => (nums[+i] !== undefined ? fmtNum(nums[+i]) : '')) + m[3];
  }

  function skipEl(el) {
    for (let e = el; e && e !== root; e = e.parentElement) {
      if (SKIP.has(e.tagName) || e.classList.contains('notranslate') || e.hasAttribute('data-no-i18n')) return true;
    }
    return false;
  }

  function doText(node) {
    const was = done.get(node);
    if (was && was[0] === gen && was[1] === node.data) return;
    const p = node.parentElement;
    if (!p || skipEl(p)) return;
    const out = tr(node.data);
    if (out !== null && out !== node.data) node.data = out;
    done.set(node, [gen, node.data]);
  }

  function doAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const k = 'i18n' + a;
      if (el[k] === v && el.i18nGen === gen) continue;
      const out = tr(v);
      if (out !== null && out !== v) el.setAttribute(a, out);
      el[k] = el.getAttribute(a);
    }
    el.i18nGen = gen;
  }

  function walk(node) {
    if (node.nodeType === 3) { doText(node); return; }
    if (node.nodeType !== 1 || SKIP.has(node.tagName)) return;
    if (node.classList && node.classList.contains('notranslate')) return;
    doAttrs(node);
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: n => (n.nodeType === 1 && (SKIP.has(n.tagName) || n.classList.contains('notranslate')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n = w.nextNode();
    while (n) { if (n.nodeType === 3) doText(n); else doAttrs(n); n = w.nextNode(); }
  }

  function start() {
    if (started) return;
    started = true;
    const go = () => {
      walk(document.head.querySelector('title') || document.head);
      walk(document.body);
      new MutationObserver(list => {
        for (const r of list) {
          if (r.type === 'characterData') doText(r.target);
          else if (r.type === 'attributes') doAttrs(r.target);
          else r.addedNodes.forEach(walk);
        }
      }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      root.classList.remove('i18n-wait');
    };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go, { once: true });
  }

  window.MN90I18n = {
    lang: LANG,
    // Un dictionnaire arrive : si la page est déjà parcourue, on la retraduit entièrement
    add(dict) {
      Object.assign(D, dict);
      miss.clear();
      gen++;
      if (started && document.body) { walk(document.head.querySelector('title') || document.head); walk(document.body); }
      start();
    },
    t: s => tr(s) ?? s,                               // pour un texte isolé (alert, confirm…)
    missing: () => [...miss.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]),
    start,
  };
  if (COLLECT) start();
})();
