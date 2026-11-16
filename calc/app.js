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

  /* ---------- nombres ---------- */
  const n = (x, d = 3) => (x == null || !isFinite(x) ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('fr-FR', { maximumFractionDigits: d, useGrouping: false }));
  const pa = z => 1 + z / 10;
  const hm = min => `${Math.floor(min / 60)} h${min % 60 ? ' ' + String(min % 60).padStart(2, '0') : ''}`;

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

  /* ---------- les lignes, écrites comme sur la copie : « Grandeur = calcul = résultat » ---------- */
  const lig = (k, r, c = '') => ({ k, r, c });
  const txt = (s, c = '') => ({ txt: s, c });
  const titre = s => ({ h: s });
  const b = x => `${n(x)} bar`;
  // PpO₂ → colonne NOAA (immédiatement supérieure) → %SNC/min ou OTU/min
  const noaa = (pp, r, quoi = 'snc') => (r.c == null ? `${b(pp)} (< 0,6 : rien)` : `${b(pp)} → ${n(r.c, 1)} → ${n(quoi === 'snc' ? r.snc : r.otu, 2)} ${quoi === 'snc' ? '%' : 'OTU'}/min`);
  const ligPa = z => lig(`Pa = ${n(z)} / 10 + 1 (atm)`, b(pa(z)), 'pression absolue');

  function lignesPEA(prof, fo2) {
    const out = [ligPa(prof)];
    if (fo2 <= 0.21 + 1e-9) { out.push(txt('Air : table MN90 à la profondeur réelle')); return { out, pea: prof }; }
    const pn = pa(prof) * (1 - fo2), paAir = pn / 0.8, pea = (paAir - 1) * 10;
    const ligne = M().lookup(Math.max(pea, 0.1), 1).d;
    out.push(lig(`PpN₂ = ${n(pa(prof))} × ${n(1 - fo2, 2)}`, b(pn), `Nitrox ${Math.round(fo2 * 100)} = ${Math.round((1 - fo2) * 100)} % de N₂`),
      lig(`Pa air = ${n(pn)} / 0,8`, `${b(paAir)} = ${b(paAir - 1)} + 1 bar (atm)`, 'la Pa de l’air qui donnerait la même PpN₂'),
      lig(`PEA = ${n(paAir - 1)} × 10`, `${n(pea, 2)} m → ligne ${ligne ?? '—'} m`, 'ligne MN90 immédiatement supérieure'));
    return { out, pea };
  }
  const palTxt = r => (r.paliers.length ? r.paliers.map(x => `${x.tAir} min à ${x.z} m`).join(' + ') : 'pas de palier');
  const tableTxt = (r, duree = r.duree) => txt(`MN90 ${r.tab.d} m · ${duree} min → ligne ${hm(r.tab.t)} : ${palTxt(r)} · GPS ${r.tab.gps}`, 'les chiffres sous 15/12/9/6/3 m sont les paliers ; après : DTR puis GPS');

  // Le tableau en 4 étapes d'une plongée (NitroxExamen.plongee)
  function lignesPhases(r, quoi = 'snc') {
    const out = [], parts = [];
    const taux = x => (quoi === 'snc' ? x.snc : x.otu), part = x => (quoi === 'snc' ? x.sncP : x.otuP);
    const nom = quoi === 'snc' ? '%SNC' : 'OTU', u = quoi === 'snc' ? ' %' : ' OTU';
    const [fond, rem, ...reste] = r.rows;
    out.push(titre('① Fond'), lig(`PpO₂ = ${n(r.pa)} × ${n(r.fo2, 2)}`, noaa(r.pp, fond, quoi), 'colonne NOAA immédiatement supérieure'),
      lig(`${nom} = ${n(taux(fond), 2)} × ${n(fond.d)}`, n(part(fond), 2) + u, 'durée MN90, descente comprise'));
    parts.push(part(fond));
    const premier = r.paliers[0]?.z ?? 0;
    out.push(titre('② Remontée'), lig(`Durée = (${n(r.prof)} − ${premier}) / 15`, `${n(rem.d, 2)} min`, `jusqu’au ${premier ? '1er palier' : 'surface'}, à 15 m/min`),
      lig(`${nom} = ${n(taux(rem), 2)} × ${n(rem.d, 2)}`, n(part(rem), 2) + u, 'même PpO₂ qu’au fond'));
    parts.push(part(rem));
    r.paliers.forEach((p, i) => {
      const row = reste[i];
      out.push(titre(`③ Palier ${p.z} m${p.enO2 ? ' à l’O₂ pur' : ''}`));
      if (p.enO2) out.push(lig(`Durée O₂ = ${p.tAir} × 2/3`, `${n(p.tAir * 2 / 3, 2)} → ${p.t} min`, `arrondi au-dessus${p.min5 ? ', 5 min minimum' : ''}`));
      out.push(lig(`PpO₂ = ${n(pa(p.z))} × ${p.enO2 ? '1' : n(r.fo2, 2)}`, noaa(row.pp, row, quoi)),
        lig(`${nom} = ${n(taux(row), 2)} × ${n(row.d)}`, n(part(row), 2) + u));
      parts.push(part(row));
    });
    if (r.paliers.length) {
      const s = reste[r.paliers.length], z = r.paliers[r.paliers.length - 1].z;
      out.push(titre('④ Remontée surface'), lig(`Durée = ${z} / 6`, `${n(s.d, 2)} min`, `${z} m à 6 m/min`), lig(`${nom} = ${n(taux(s), 2)} × ${n(s.d, 2)}`, n(part(s), 2) + u, 'PpO₂ du palier'));
      parts.push(part(s));
    } else out.push(txt('③ Palier = 0 · ④ Remontée surface = 0 (pas de palier)'));
    out.push(titre('Total'), lig(`${nom} = ${parts.map(x => n(x, 2)).join(' + ')}`, n(parts.reduce((a, c) => a + c, 0), 2) + u));
    return out;
  }

  /* ---------- le tableau de la copie : une ligne par étape, le détail au toucher d'une case ---------- */
  const cel = (v, d = '') => ({ v, d });
  const gazNom = f => (f >= 0.995 ? 'O₂' : f <= 0.21 + 1e-9 ? 'Air' : `N${Math.round(f * 100)}`);
  const TETE = quoi => ['', 'Prof', 'Durée', 'Gaz', 'Pa', 'PpO₂', 'NOAA', quoi === 'snc' ? '%' : 'OTU', 'EqAir'];

  // La case EqAir du fond : PEA, ligne MN90, paliers et GPS (et la majoration pour une 2e plongée)
  function eqAir(r, extra = null) {
    if (r.air) return cel(`${r.tab.d} m · ${r.tab.gps}`, `Air : table à la profondeur réelle → ligne ${r.tab.d} m, ${extra ? extra.fictive : r.duree} min → ${palTxt(r)} · GPS ${r.tab.gps}`);
    const paAir = r.pn / 0.8;
    let d = `(1 − ${n(r.fo2, 2)}) × ${n(r.pa)} = ${n(r.pn)} / 0,8 = ${n(paAir)} = ${n(paAir - 1)} + 1 (atm) → ${n(r.pea, 2)} m → ligne ${r.tab.d} m`;
    if (extra) d += ` · ${extra.txt}`;
    d += ` · ${extra ? extra.fictive : r.duree} min → ligne ${hm(r.tab.t)} : ${palTxt(r)} · GPS ${r.tab.gps}`;
    return cel(`${r.tab.d} m · ${r.tab.gps}${extra && extra.maj ? ` · +${extra.maj}` : ''}`, d);
  }

  function lignesTableau(r, L, quoi, eq) {
    const taux = x => (quoi === 'snc' ? x.snc : x.otu), part = x => (quoi === 'snc' ? x.sncP : x.otuP);
    const nom = quoi === 'snc' ? '%SNC' : 'OTU', u = quoi === 'snc' ? ' %' : ' OTU', parMin = quoi === 'snc' ? '%/min' : 'OTU/min';
    const paC = z => cel(n(pa(z)), `Pa = ${n(z)} / 10 + 1 (atm) = ${n(pa(z))} bar`);
    const ppC = (row, paV, f) => cel(n(row.pp), `PpO₂ = ${n(paV)} × ${n(f, 2)} = ${n(row.pp)} bar` + (row.c == null ? ' → sous 0,6 : rien' : ` → colonne NOAA ${n(row.c, 1)} (immédiatement supérieure)`));
    const noaaC = row => cel(row.c == null ? '0' : n(taux(row), 2), row.c == null ? 'sous 0,6 b : 0' : `PpO₂ ${n(row.pp)} → colonne ${n(row.c, 1)} → ${n(taux(row), 2)} ${parMin}`);
    const partC = row => cel(n(part(row), 2), `${nom} = ${n(taux(row), 2)} × ${n(row.d, 2)} = ${n(part(row), 2)}${u}`);
    const [fond, rem, ...reste] = r.rows;
    const g = gazNom(r.fo2);
    const rows = [[`${L[0]}-Fond`, cel(n(r.prof)), cel(n(fond.d), 'durée MN90 (descente comprise)'), cel(g), paC(r.prof), ppC(fond, r.pa, r.fo2), noaaC(fond), partC(fond), eq]];
    const premier = r.paliers[0]?.z ?? 0;
    rows.push([`${L[1]}-Remontée`, cel(`${n(r.prof)}→${premier}`), cel(n(rem.d, 2), `Durée = (${n(r.prof)} − ${premier}) / 15 = ${n(rem.d, 2)} min (15 m/min jusqu’au ${premier ? '1er palier' : 'surface'})`),
      cel(g), paC(r.prof), cel(n(rem.pp), 'même PpO₂ qu’au fond'), noaaC(rem), partC(rem), '']);
    const parts = [part(fond), part(rem)];
    if (r.paliers.length) {
      r.paliers.forEach((p, i) => {
        const row = reste[i], f = p.enO2 ? 1 : r.fo2;
        rows.push([`${L[2]}-Palier`, cel(`${p.z}`), cel(String(p.t), p.enO2 ? `Durée O₂ = ${p.tAir} × 2/3 = ${n(p.tAir * 2 / 3, 2)} → ${p.t} min (arrondi au-dessus${p.min5 ? ', 5 min minimum' : ''})` : `MN90 : ${p.tAir} min à ${p.z} m`),
          cel(gazNom(f)), paC(p.z), ppC(row, pa(p.z), f), noaaC(row), partC(row), '']);
        parts.push(part(row));
      });
      const s = reste[r.paliers.length], z = r.paliers[r.paliers.length - 1].z, f = r.paliers[r.paliers.length - 1].enO2 ? 1 : r.fo2;
      rows.push([`${L[3]}-Remontée`, cel(`${z}→0`), cel(n(s.d, 2), `Durée = ${z} / 6 = ${n(s.d, 2)} min (6 m/min)`), cel(gazNom(f)), paC(z), cel(n(s.pp), 'PpO₂ du palier'), noaaC(s), partC(s), '']);
      parts.push(part(s));
    } else {
      rows.push([`${L[2]}-Palier`, cel('—'), cel('0', 'pas de palier'), '', '', '', '', cel('0'), ''], [`${L[3]}-Remontée`, cel('—'), cel('0', 'déjà comptée en ' + L[1]), '', '', '', '', cel('0'), '']);
    }
    const total = parts.reduce((a, c) => a + c, 0);
    rows.push({ tot: true, c: [`Total`, '', '', '', '', '', '', cel(n(total, 2), `${nom} = ${parts.map(x => n(x, 2)).join(' + ')} = ${n(total, 2)}${u}`), ''] });
    return { rows, total };
  }

  const verdict = x => (x > 100 ? 'au-delà de 100 % : PAS POSSIBLE (crise hyperoxique possible)' : x > 90 ? 'au-delà de 90 % : intervalle ≥ 2 h' : x > 50 ? 'au-delà de 50 % : intervalle ≥ 45 min' : 'sous 50 % : OK');

  /* ---------- les énoncés ---------- */
  const C = (id, q, v, s = '') => ({ id, q, v, s });
  const Q = [
    { id: 'pp', t: 'Pressions partielles', e: 'PpO₂ et PpN₂ de l’air à 20 m', champs: [C('prof', 'Profondeur (m) ?', 20), C('o2', '% O₂ ? (air = 20)', 20)],
      calc: v => { const p = pa(v.prof), o = v.o2 / 100;
        return { l: [ligPa(v.prof), lig(`PpO₂ = ${n(p)} × ${n(o, 2)}`, b(p * o)), lig(`PpN₂ = ${n(p)} − ${n(p * o)}`, b(p * (1 - o)), `ou ${n(p)} × ${n(1 - o, 2)}`)],
          rep: `PpO₂ = ${b(p * o)} · PpN₂ = ${b(p * (1 - o))}`, x: 'Dalton : la pression totale est la somme des pressions partielles. Limites : PpO₂ 1,6 b, narcose dès 3,2 b de N₂, 5,6 b de N₂ maxi.' }; } },
    { id: 'mod', t: 'Profondeur max', e: 'Profondeur max d’un Nitrox 40 (ou 80, ou l’air)', champs: [C('o2', 'Nitrox : % O₂ ?', 40), C('pp', 'PpO₂ max ? (1,6)', 1.6)],
      calc: v => { const o = v.o2 / 100, pm = v.pp / o, z = (pm - 1) * 10, fn = 1 - o;
        return { l: [lig(`Pa max = ${n(v.pp, 1)} / ${n(o, 2)}`, `${b(pm)} = ${b(pm - 1)} (eau) + 1 bar (atm)`, 'Pa (pression absolue) = PpO₂ max / %O₂'),
          lig(`Prof. max = ${n(pm - 1)} × 10`, `${n(z, 1)} m`, '1 bar d’eau = 10 m')],
          rep: `MOD ${o >= 0.995 ? 'O₂ pur' : o <= 0.21 ? 'air' : 'Nx' + v.o2} = ${n(z, 1)} m`,
          x: `Arrondir vers la sécurité (35,7 → 35 m). ${z < 25 ? 'Un Nitrox aussi riche sert aux paliers (déco) ; l’O₂ pur : 6 m maxi.' : 'Gaz fond.'} Azote : narcose à 3,2 b → 3,2 / ${n(fn, 2)} = ${b(3.2 / fn)} → ${n((3.2 / fn - 1) * 10, 1)} m ; N₂ max 5,6 b → ${b(5.6 / fn)} → ${n((5.6 / fn - 1) * 10, 1)} m.` }; } },
    { id: 'best', t: 'Best mix', e: 'Best mix pour 45 m / pour 1 h à 32 m / déco à partir de 22 m', champs: [C('prof', 'Profondeur (m) ?', 45), C('duree', 'Durée (min) ? (0 = inconnue)', 0)],
      calc: v => { const p = pa(v.prof), pp = v.duree > 45 ? 1.5 : 1.6, x = pp / p, nx = Math.floor(x * 100 + 1e-9);
        return { l: [ligPa(v.prof), txt(v.duree > 45 ? `${v.duree} min > 45 min → PpO₂ 1,5 b (à 1,6 b, la NOAA ne donne que 45 min)` : 'PpO₂ max = 1,6 b'),
          lig(`%O₂ = ${n(pp, 1)} / ${n(p)}`, `${n(x)} → Nx${nx}`, 'arrondi VERS LE BAS'), lig(`PpO₂ = ${n(p)} × ${n(nx / 100, 2)}`, `${b(p * nx / 100)} ≤ ${n(pp, 1)} ✓`, 'vérification')],
          rep: nx >= 100 ? 'O₂ pur' : `Best mix = Nitrox ${nx}`, x: 'Toujours vérifier : Pa × mélange doit retomber sous la PpO₂ max. Si on arrondit vers le haut, on la dépasse. Le corrigé Q#3 donne Nx36 pour 1 h à 32 m (0,357 arrondi au plus près, 1,51 b).' }; } },
    { id: 'pea', t: 'Prof. équivalente air', e: 'PEA d’une plongée à 30 m au Nitrox 40', champs: [C('prof', 'Profondeur (m) ?', 30), C('o2', 'Nitrox : % O₂ ?', 40)],
      calc: v => { const { out, pea } = lignesPEA(v.prof, v.o2 / 100), t = M().lookup(Math.max(pea, 0.1), 1);
        return { l: out, rep: `PEA = ${n(pea, 1)} m → table ${t.d ?? '—'} m`, x: 'On lit la MN90 à la ligne immédiatement supérieure à la PEA. La DTR de la table est fausse : on remonte de la profondeur réelle (et on consomme à la profondeur réelle).' }; } },
    { id: 'portion', t: '%SNC d’une portion', e: '%SNC de 30 min à 20 m au Nitrox 50', champs: [C('prof', 'Profondeur (m) ?', 20), C('duree', 'Durée (min) ?', 30), C('o2', 'Nitrox : % O₂ ?', 50)],
      calc: v => { const p = pa(v.prof), pp = p * v.o2 / 100, r = E().lire(pp);
        return { l: [ligPa(v.prof), lig(`PpO₂ = ${n(p)} × ${n(v.o2 / 100, 2)}`, noaa(pp, r)), lig(`%SNC = ${n(r.snc, 2)} × ${n(v.duree)}`, `${n(r.snc * v.duree, 2)} %`)],
          rep: `%SNC = ${n(r.snc * v.duree, 1)} % · ${verdict(r.snc * v.duree)}`, x: pp > 1.6 + 1e-9 ? 'PpO₂ au-delà de 1,6 b : INTERDIT.' : 'Table NOAA : on prend la colonne immédiatement supérieure (1,44 → 1,5). Sous 0,6 b, rien ne compte.' }; } },
    { id: 'snc', t: '%SNC plongée (4 étapes)', e: '60 min à 25 m au Nitrox 40, palier à l’O₂ pur', champs: [C('duree', 'Durée (min) ?', 60, 'Durée'), C('prof', 'Profondeur (m) ?', 25, 'Prof'), C('o2', 'Nitrox : % O₂ ?', 40, 'N'), C('po2', 'Palier à l’O₂ pur ? 1 = oui, 0 = non', 1, 'O₂ ?')],
      calc: v => { const r = E().plongee({ prof: v.prof, duree: v.duree, fo2: v.o2 / 100, o2: !!v.po2 });
        if (r.err) return { l: [txt(r.err)], rep: 'hors table', x: '' };
        const t = lignesTableau(r, ['A', 'B', 'C', 'D'], 'snc', eqAir(r));
        return { l: [{ tab: { head: TETE('snc'), rows: t.rows } }], rep: `%SNC = ${n(r.snc, 1)} % · ${verdict(r.snc)}`,
          x: 'Fond : durée MN90 (descente comprise). Remontée : (fond − 1er palier) / 15. Palier à l’O₂ : 2/3 du temps à l’air, 5 min minimum. Remontée surface : 3 m à 6 m/min = 0,5 min. Sans palier : remontée = fond / 15, et 0 pour les deux dernières lignes.' + (r.alertes.length ? ' ⚠ ' + r.alertes.join(' ').replace(/<[^>]+>/g, '') : '') }; } },
    { id: 'inter', t: 'Intervalle surface', e: '%SNC de 43 % après 2 h de surface', champs: [C('snc', '%SNC à la sortie ?', 43), C('is', 'Intervalle (min) ? (2 h = 120)', 120)],
      calc: v => { const c = E().coefIntervalle(v.is);
        return { l: [txt(`${hm(v.is)} → colonne ${hm(c.col)} (immédiatement inférieure) → coefficient ${n(c.coef)}`), lig(`%SNC = ${n(v.snc)} × ${n(c.coef)}`, `${n(v.snc * c.coef, 2)} %`, 'au départ de la plongée suivante')],
          rep: `%SNC restant = ${n(v.snc * c.coef, 1)} %`, x: 'Le %SNC est divisé par 2 toutes les 90 min à l’air. Coefficients : 30 min 0,79 · 1 h 0,63 · 1 h 30 0,50 · 2 h 0,40 · 2 h 30 0,315 · 3 h 0,25 · 3 h 30 0,20 · 4 h 0,16. Les OTU, eux, ne baissent pas.' }; } },
    { id: 'jour', t: 'Journée 2 plongées', e: 'P1 70 min 30 m Nx35 palier O₂ · 2 h 30 · P2 40 min 25 m Nx45',
      champs: [C('d1', 'P1 : durée (min) ?', 70, 'P1'), C('p1', 'P1 : profondeur (m) ?', 30, 'Prof1'), C('o1', 'P1 : % O₂ ?', 35, 'N1'), C('x1', 'P1 : palier O₂ pur ? 1 / 0', 1, 'O₂ ?'),
        C('is', 'Intervalle surface (min) ? (2 h 30 = 150)', 150, 'IntSurf'),
        C('d2', 'P2 : durée (min) ?', 40, 'P2'), C('p2', 'P2 : profondeur (m) ?', 25, 'Prof2'), C('o2', 'P2 : % O₂ ?', 45, 'N2'), C('x2', 'P2 : palier O₂ pur ? 1 / 0', 0, 'O₂ ?')],
      calc: v => {
        const r1 = E().plongee({ prof: v.p1, duree: v.d1, fo2: v.o1 / 100, o2: !!v.x1 });
        if (r1.err) return { l: [txt('P1 : ' + r1.err)], rep: 'hors table', x: '' };
        const t1 = lignesTableau(r1, ['A', 'B', 'C', 'D'], 'snc', eqAir(r1));
        const c = E().coefIntervalle(v.is), reste = r1.snc * c.coef;
        const lib = M(), gps = r1.tab.gps;
        if (!gps || gps === '*') return { l: [{ tab: { head: TETE('snc'), rows: t1.rows } }, txt('GPS « * » : pas de plongée successive avant 12 h')], rep: 'P2 interdite', x: '' };
        const fo2b = v.o2 / 100, pnb = pa(v.p2) * (1 - fo2b), pea = fo2b <= 0.21 + 1e-9 ? v.p2 : (pnb / 0.8 - 1) * 10;
        let maj = 0, majTxt = '';
        if (v.is < 720) {
          let k = -1; lib.T1_COLS.forEach((col, i) => { if (col <= v.is) k = i; });
          const n2 = k < (lib.TABLE_I[gps] || []).length ? lib.TABLE_I[gps][k] : null;
          if (n2 == null || n2 <= 0.81 + 1e-9) majTxt = `Tableau I : GPS ${gps} × ${hm(lib.T1_COLS[k])} → azote normal, pas de majoration`;
          else {
            const row = lib.TABLE_II.find(x => x[0] >= n2 - 1e-9) || lib.TABLE_II[lib.TABLE_II.length - 1];
            const di = lib.T2_DEPTHS.findIndex(d => d >= pea - 1e-9);
            maj = row[1 + di];
            majTxt = `Tableau I : GPS ${gps} × ${hm(lib.T1_COLS[k])} (colonne inférieure) → azote ${n(n2, 2)} · Tableau II : ligne ${n(row[0], 2)} × colonne ${lib.T2_DEPTHS[di]} m → majoration ${maj} min · durée fictive ${v.d2} + ${maj} = ${v.d2 + maj} min`;
          }
        }
        const r2 = E().plongee({ prof: v.p2, duree: v.d2, fo2: fo2b, o2: !!v.x2 }, { fictive: v.d2 + maj });
        if (r2.err) return { l: [{ tab: { head: TETE('snc'), rows: t1.rows } }, txt('P2 : ' + r2.err)], rep: 'hors table', x: '' };
        const t2 = lignesTableau(r2, ['F', 'G', 'H', 'I'], 'snc', eqAir(r2, { txt: majTxt, maj, fictive: v.d2 + maj }));
        const tot = reste + r2.snc;
        const rows = [...t1.rows.map(x => (x.tot ? { tot: true, c: ['Total P1', ...x.c.slice(1)] } : x)),
          ['E-IntSurf', '', cel(String(v.is), hm(v.is)), '', '', '', cel(n(c.coef, 3), `${hm(v.is)} → colonne ${hm(c.col)} (immédiatement inférieure) → coefficient ${n(c.coef, 3)}`),
            cel(n(reste, 2), `%SNC = ${n(r1.snc, 2)} × ${n(c.coef, 3)} = ${n(reste, 2)} % au départ de P2`), ''],
          ...t2.rows.map(x => (x.tot ? { tot: true, c: ['Total P2', ...x.c.slice(1)] } : x)),
          { tot: true, c: ['Journée', '', '', '', '', '', '', cel(n(tot, 2), `%SNC = ${n(reste, 2)} + ${n(r2.snc, 2)} = ${n(tot, 2)} % → ${verdict(tot)}`), cel(`${n(r1.otu + r2.otu, 0)} OTU`, `OTU = ${n(r1.otu, 1)} + ${n(r2.otu, 1)} = ${n(r1.otu + r2.otu, 0)} (limite 850 le 1er jour ; pas d’effet de l’intervalle)`)] }];
        return { l: [{ tab: { head: TETE('snc'), rows } }], rep: `%SNC journée = ${n(tot, 1)} % · ${verdict(tot)}`,
          x: 'A à D : plongée 1 (fond, remontée / 15, palier à l’O₂ = 2/3 du temps, 5 min mini, remontée surface 0,5 min). E : %SNC × coefficient de l’intervalle. F à I : plongée 2, avec la majoration (Tableau I : GPS × intervalle, colonne inférieure ; Tableau II : azote et profondeur, du dessus). Journée : E + total P2.' +
            (tot > 100 ? ' Solutions : plus d’intervalle, P2 moins profonde ou plus courte, ou un Nitrox moins riche en P2.' : '') + [...r1.alertes, ...r2.alertes].map(a => ' ⚠ ' + a.replace(/<[^>]+>/g, '')).join('') };
      } },
    { id: 'tmax', t: 'Durée max (%SNC)', e: 'Durée max d’une 2e plongée au Nx32 à 40 m avec 40 % de %SNC restant', champs: [C('prof', 'Profondeur (m) ?', 40), C('o2', 'Nitrox : % O₂ ?', 32), C('deja', '%SNC déjà présent ?', 40)],
      calc: v => { const p = pa(v.prof), pp = p * v.o2 / 100, r = E().lire(pp);
        if (r.c == null) return { l: [lig(`PpO₂ = ${n(p)} × ${n(v.o2 / 100, 2)}`, `${b(pp)} (< 0,6)`)], rep: 'pas de limite %SNC', x: '' };
        const dmax = E().NOAA[r.c][1], t = (100 - v.deja) / 100 * dmax;
        return { l: [ligPa(v.prof), lig(`PpO₂ = ${n(p)} × ${n(v.o2 / 100, 2)}`, `${b(pp)} → ${n(r.c, 1)} → ${dmax} min maxi (NOAA)`),
          lig(`Reste = 100 − ${n(v.deja)}`, `${n(100 - v.deja)} %`), lig(`Durée max = ${n((100 - v.deja) / 100, 2)} × ${dmax}`, `${n(t, 1)} min`, 'remontée jusqu’à 6 m comprise'),
          lig(`Remontée = (${n(v.prof)} − 6) / 15`, `${n((v.prof - 6) / 15, 2)} min`)],
          rep: `Durée max = ${n(t, 1)} min`, x: 'Durée maxi NOAA : 1,6 b → 45 min, 1,5 b → 120 min, 1,4 b → 150 min. Trop court ? Prendre un Nitrox moins riche (best mix à 1,5 b).' }; } },
    { id: 'otu', t: 'OTU', e: 'OTU : 70 min à 28 m au Nitrox 40', champs: [C('duree', 'Durée (min) ?', 70, 'Durée'), C('prof', 'Profondeur (m) ?', 28, 'Prof'), C('o2', 'Nitrox : % O₂ ?', 40, 'N'), C('po2', 'Palier à l’O₂ pur ? 1 = oui, 0 = non', 0, 'O₂ ?')],
      calc: v => { const r = E().plongee({ prof: v.prof, duree: v.duree, fo2: v.o2 / 100, o2: !!v.po2 });
        if (r.err) return { l: [txt(r.err)], rep: 'hors table', x: '' };
        const t = lignesTableau(r, ['A', 'B', 'C', 'D'], 'otu', eqAir(r));
        return { l: [{ tab: { head: TETE('otu'), rows: t.rows } }], rep: `OTU = ${n(r.otu, 0)}`, x: 'OTU/min : 0,6 → 0,26 · 1,0 → 1 · 1,3 → 1,48 · 1,4 → 1,63 · 1,5 → 1,78 · 1,6 → 1,93 (colonne immédiatement supérieure). On additionne tout sur la journée (pas d’effet de l’intervalle). Limite : 850 le 1er jour, puis 700, 620, 525…' }; } },
    { id: 'gonf', t: 'Gonflage', e: 'De 30 b de Nitrox 40 à un Nitrox 60 à 200 b', champs: [C('pi', 'Reste dans le bloc (b) ?', 30), C('fi', 'Reste : % O₂ ? (air = 20)', 40), C('pf', 'Pression finale (b) ?', 200), C('ff', 'Nitrox voulu : % O₂ ?', 60)],
      calc: v => { const fi = v.fi / 100, ff = v.ff / 100, n0 = v.pi * (1 - fi), n1 = v.pf * (1 - ff), o0 = v.pi * fi, o1 = v.pf * ff, dN = n1 - n0, dO = o1 - o0, o2 = dO - dN / 4;
        const l = [titre('N₂'), lig(`On a = ${v.pi} × ${n(1 - fi, 2)}`, b(n0)), lig(`On veut = ${v.pf} × ${n(1 - ff, 2)}`, b(n1)), lig(`À ajouter = ${n(n1)} − ${n(n0)}`, b(dN), 'tout l’azote vient de l’air'),
          titre('O₂'), lig(`On a = ${v.pi} × ${n(fi, 2)}`, b(o0)), lig(`On veut = ${v.pf} × ${n(ff, 2)}`, b(o1)), lig(`À ajouter = ${n(o1)} − ${n(o0)}`, b(dO)),
          lig(`O₂ de l’air = ${n(dN)} / 4`, b(dN / 4), 'l’air apporte 1 part d’O₂ pour 4 de N₂'), lig(`O₂ pur = ${n(dO)} − ${n(dN / 4)}`, b(o2)),
          titre('Total'), lig(`Air = ${n(dN)} / 0,8`, b(dN / 0.8)), lig(`O₂ jusqu’à = ${v.pi} + ${n(o2)}`, b(v.pi + o2))];
        if (dN < -1e-9 || o2 < -1e-9) return { l, rep: 'impossible : vider le bloc d’abord (reste = 0)', x: '' };
        return { l, rep: `O₂ pur jusqu’à ${n(v.pi + o2, 1)} b, puis air jusqu’à ${v.pf} b`, x: 'O₂ pur d’abord (5 b/min, 3 b/min au-delà de 100 b), puis air au compresseur. La bouteille d’O₂ doit être au-dessus de la pression visée. Ensuite : 24 h d’homogénéisation, analyse, étiquette (% O₂, MOD, date, initiales), registre.' }; } },
    { id: 'mariotte', t: 'Réserve d’O₂ (Mariotte)', e: 'Bloc 15 L à 30 b de Nx40, réserve O₂ 50 L à 100 b, compresseur air, 200 b', champs: [C('v1', 'Bloc : volume (L) ?', 15), C('p1', 'Bloc : pression (b) ?', 30), C('f1', 'Bloc : % O₂ ?', 40), C('v2', 'Réserve O₂ : volume (L) ?', 50), C('p2', 'Réserve O₂ : pression (b) ?', 100), C('pf', 'Pression finale (b) ?', 200)],
      calc: v => {
        const m = (p1, f1, nom) => { const peq = Math.min((p1 * v.v1 + v.p2 * v.v2) / (v.v1 + v.v2), v.pf), aj = peq - p1, air = v.pf - peq, o2 = p1 * f1 + aj + air * 0.2;
          return { pct: o2 / v.pf * 100, l: [titre(nom), lig(`P équilibre = (${p1} × ${v.v1} + ${v.p2} × ${v.v2}) / (${v.v1} + ${v.v2})`, `${n(peq, 1)} bar`, 'Mariotte'), lig(`O₂ ajouté = ${n(peq, 1)} − ${p1}`, `${n(aj, 1)} bar`),
            lig(`Air = ${v.pf} − ${n(peq, 1)}`, `${n(air, 1)} bar`), lig(`O₂ total = ${n(p1 * f1, 2)} + ${n(aj, 1)} + ${n(air, 1)} × 0,2`, `${n(o2, 1)} bar`), lig(`%O₂ = ${n(o2, 1)} / ${v.pf}`, `${n(o2 / v.pf * 100, 1)} % → Nx${Math.floor(o2 / v.pf * 100 + 1e-9)}`)] }; };
        const a = m(v.p1, v.f1 / 100, '1) Bloc branché tel quel'), c = m(1, 0.2, '2) Bloc vidé d’abord (1 b d’air)'), best = c.pct > a.pct ? c : a;
        return { l: [...a.l, ...c.l], rep: `Meilleur : Nitrox ${Math.floor(best.pct + 1e-9)}${best === c ? ' (bloc vidé)' : ''}`, x: 'Mariotte : P = (P1 × V1 + P2 × V2) / (V1 + V2). Vider le bloc avant laisse plus de place à l’O₂ de la réserve. Le corrigé Q#11 arrondit les pressions et trouve Nx44 puis Nx51.' };
      } },
  ];

  // L'ordre du corrigé de révision (Q1 → Q11), les pressions partielles à la fin
  const ORDRE = { mod: 'Q1', pea: 'Q2', best: 'Q3', tmax: 'Q4', portion: 'Q7', snc: 'Q7-8', inter: 'Q8', jour: 'Q8', otu: 'Q9', gonf: 'Q10', mariotte: 'Q11', pp: 'Cours' };
  const RANG = Object.keys(ORDRE);
  Q.sort((a, b) => RANG.indexOf(a.id) - RANG.indexOf(b.id));

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
    S.i = 0; S.v = {}; S.saisie = ''; S.fini = false; S.expl = false; S.detail = null;
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
    Q.map(x => `<button type="button" data-q="${x.id}">${x.t}<small>${ORDRE[x.id]} · ${x.e}</small></button>`).join('');
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
