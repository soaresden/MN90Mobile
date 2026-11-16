/* ============================================================
   MN90 Mobile — Nitrox Confirmé : les assistants de calcul
   Les énoncés types du cours (MOD, best mix, PEA, %SNC, journée de
   deux plongées avec majoration, intervalle, durée max, OTU,
   gonflage, Mariotte) : à partir des valeurs, les lignes écrites
   comme sur la copie et le tableau par étape (A-Fond, B-Remontée…),
   avec le détail de chaque case. Une seule source pour l'onglet
   « Assistants » de la page Nitrox et pour Nitrox Calc (calc/).
   Calculs : nitrox/examen.js (tables MN90, NOAA, OTU du cours).
   ============================================================ */
(function () {
  'use strict';
  const E = () => window.NitroxExamen, M = () => window.MN90Lib;

  /* ---------- nombres ---------- */
  const n = (x, d = 3) => (x == null || !isFinite(x) ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('fr-FR', { maximumFractionDigits: d, useGrouping: false }));
  const pa = z => 1 + z / 10;
  const hm = min => `${Math.floor(min / 60)} h${min % 60 ? ' ' + String(min % 60).padStart(2, '0') : ''}`;

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
    return { rows, total, fin: lig(`${nom} = ${parts.map(x => n(x, 2)).join(' + ')}`, n(total, 2) + u) };
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
          rep: nx >= 100 ? 'O₂ pur' : `Best mix = Nitrox ${nx}`, x: 'Toujours vérifier : Pa × mélange doit retomber sous la PpO₂ max. Si on arrondit vers le haut, on la dépasse.' }; } },
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
        return { l: [{ tab: { head: TETE('snc'), rows: t.rows } }], fin: [t.fin], schema: [{ r }], rep: `%SNC = ${n(r.snc, 1)} % · ${verdict(r.snc)}`,
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
        return { l: [{ tab: { head: TETE('snc'), rows } }], schema: [{ r: r1 }, { r: r2, interval: v.is, coef: c.coef, avant: r1.snc, depart: reste, maj }], fin: [lig(`%SNC = ${n(reste, 2)} + ${n(r2.snc, 2)}`, `${n(tot, 2)} %`), lig(`OTU = ${n(r1.otu, 1)} + ${n(r2.otu, 1)}`, `${n(r1.otu + r2.otu, 0)} OTU`)], rep: `%SNC journée = ${n(tot, 1)} % · ${verdict(tot)}`,
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
        return { l: [{ tab: { head: TETE('otu'), rows: t.rows } }], fin: [t.fin], schema: [{ r, otu: true }], rep: `OTU = ${n(r.otu, 0)}`, x: 'OTU/min : 0,6 → 0,26 · 1,0 → 1 · 1,3 → 1,48 · 1,4 → 1,63 · 1,5 → 1,78 · 1,6 → 1,93 (colonne immédiatement supérieure). On additionne tout sur la journée (pas d’effet de l’intervalle). Limite : 850 le 1er jour, puis 700, 620, 525…' }; } },
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
        return { l: [...a.l, ...c.l], rep: `Meilleur : Nitrox ${Math.floor(best.pct + 1e-9)}${best === c ? ' (bloc vidé)' : ''}`, x: 'Mariotte : P = (P1 × V1 + P2 × V2) / (V1 + V2). Vider le bloc avant laisse plus de place à l’O₂ de la réserve.' };
      } },
  ];

  // L'ordre des énoncés dans Nitrox Calc
  const ORDRE = { mod: 'Q1', pea: 'Q2', best: 'Q3', tmax: 'Q4', portion: 'Q7', snc: 'Q7-8', inter: 'Q8', jour: 'Q8', otu: 'Q9', gonf: 'Q10', mariotte: 'Q11', pp: 'Cours' };
  const RANG = Object.keys(ORDRE);
  Q.sort((a, b) => RANG.indexOf(a.id) - RANG.indexOf(b.id));


  /* ---------- Journée plongée : de 1 à 4 plongées, %SNC et OTU dans le même tableau ---------- */
  const TETE2 = ['', 'Prof', 'Durée', 'Gaz', 'Pa', 'PpO₂', '%SNC/min', '%SNC', 'OTU/min', 'OTU', 'EqAir'];
  // Le tableau d'une plongée, %SNC et OTU côte à côte
  function lignesDuo(r, L, eq) {
    const paC = z => cel(n(pa(z)), `Pa = ${n(z)} / 10 + 1 (atm) = ${n(pa(z))} bar`);
    const ppC = (row, paV, f) => cel(n(row.pp), `PpO₂ = ${n(paV)} × ${n(f, 2)} = ${n(row.pp)} bar` + (row.c == null ? ' → sous 0,6 : rien' : ` → colonne ${n(row.c, 1)} (immédiatement supérieure)`));
    const sncM = row => cel(row.c == null ? '0' : n(row.snc, 2), row.c == null ? 'sous 0,6 b : 0' : `NOAA : colonne ${n(row.c, 1)} → ${n(row.snc, 2)} %/min`);
    const snc = row => cel(n(row.sncP, 2), `%SNC = ${n(row.snc, 2)} × ${n(row.d, 2)} = ${n(row.sncP, 2)} %`);
    const otuM = row => cel(row.c == null ? '0' : n(row.otu, 2), row.c == null ? 'sous 0,6 b : 0' : `OTU : colonne ${n(row.c, 1)} → ${n(row.otu, 2)} OTU/min`);
    const otu = row => cel(n(row.otuP, 1), `OTU = ${n(row.otu, 2)} × ${n(row.d, 2)} = ${n(row.otuP, 1)}`);
    const [fond, rem, ...reste] = r.rows, g = gazNom(r.fo2);
    const rows = [[`${L[0]}-Fond`, cel(n(r.prof)), cel(n(fond.d), 'durée de la plongée (descente comprise)'), cel(g), paC(r.prof), ppC(fond, r.pa, r.fo2), sncM(fond), snc(fond), otuM(fond), otu(fond), eq]];
    const premier = r.paliers[0]?.z ?? 0;
    rows.push([`${L[1]}-Remontée`, cel(`${n(r.prof)}→${premier}`), cel(n(rem.d, 2), `Durée = (${n(r.prof)} − ${premier}) / 15 = ${n(rem.d, 2)} min (15 m/min jusqu’au ${premier ? '1er palier' : 'surface'})`),
      cel(g), paC(r.prof), cel(n(rem.pp), 'même PpO₂ qu’au fond'), sncM(rem), snc(rem), otuM(rem), otu(rem), '']);
    if (r.paliers.length) {
      r.paliers.forEach((p, i) => {
        const row = reste[i], f = p.enO2 ? 1 : r.fo2;
        rows.push([`${L[2]}-Palier`, cel(`${p.z}`), cel(String(p.t), p.enO2 ? `Durée O₂ = ${p.tAir} × 2/3 = ${n(p.tAir * 2 / 3, 2)} → ${p.t} min (arrondi au-dessus${p.min5 ? ', 5 min minimum' : ''})` : `MN90 : ${p.tAir} min à ${p.z} m`),
          cel(gazNom(f)), paC(p.z), ppC(row, pa(p.z), f), sncM(row), snc(row), otuM(row), otu(row), '']);
      });
      const s = reste[r.paliers.length], z = r.paliers[r.paliers.length - 1].z, f = r.paliers[r.paliers.length - 1].enO2 ? 1 : r.fo2;
      rows.push([`${L[3]}-Remontée`, cel(`${z}→0`), cel(n(s.d, 2), `Durée = ${z} / 6 = ${n(s.d, 2)} min (6 m/min)`), cel(gazNom(f)), paC(z), cel(n(s.pp), 'PpO₂ du palier'), sncM(s), snc(s), otuM(s), otu(s), '']);
    } else {
      rows.push([`${L[2]}-Palier`, cel('—'), cel('0', 'pas de palier'), '', '', '', '', cel('0'), '', cel('0'), ''], [`${L[3]}-Remontée`, cel('—'), cel('0', `déjà comptée en ${L[1]}`), '', '', '', '', cel('0'), '', cel('0'), '']);
    }
    return rows;
  }

  /**
   * La journée : plongees = [{ prof, duree, o2 (%), palierO2 (0/1) }], intervalles[k] = minutes entre la plongée k et k+1.
   * Majoration MN90 des successives (Tableau I : GPS × intervalle, colonne inférieure ; Tableau II : azote, PEA du dessus),
   * %SNC divisé par le coefficient de l'intervalle, OTU additionnés, durée max de chaque plongée avec le %SNC qui reste.
   */
  function calcJournee(plongees, intervalles = []) {
    const lib = M(), ex = E(), lettres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const res = [], rows = [], schema = [];
    let cours = 0, otuTot = 0, gps = null, k = 0;
    for (let i = 0; i < plongees.length; i++) {
      const pl = plongees[i], fo2 = pl.o2 / 100;
      const e = { i, pl, fo2, maj: 0, majTxt: '', interval: i ? intervalles[i - 1] : null };
      if (i) {
        if (!gps || gps === '*') { e.err = `Après la plongée ${i}, GPS « * » : pas de plongée successive avant 12 h.`; res.push(e); break; }
        const pea = fo2 <= 0.21 + 1e-9 ? pl.prof : (pa(pl.prof) * (1 - fo2) / 0.8 - 1) * 10;
        if (e.interval < 15) e.majTxt = 'moins de 15 min : plongée consécutive (durées à additionner), non calculée ici';
        if (e.interval >= 15 && e.interval < 720) {
          let c = -1; lib.T1_COLS.forEach((col, j) => { if (col <= e.interval) c = j; });
          const n2 = c < (lib.TABLE_I[gps] || []).length ? lib.TABLE_I[gps][c] : null;
          if (n2 == null || n2 <= 0.81 + 1e-9) e.majTxt = `Tableau I : GPS ${gps} × ${hm(lib.T1_COLS[c])} → azote normal, pas de majoration`;
          else {
            const row = lib.TABLE_II.find(x => x[0] >= n2 - 1e-9) || lib.TABLE_II[lib.TABLE_II.length - 1];
            const di = lib.T2_DEPTHS.findIndex(d => d >= pea - 1e-9);
            if (di >= 0) {
              e.maj = row[1 + di];
              e.majTxt = `Tableau I : GPS ${gps} × ${hm(lib.T1_COLS[c])} (colonne inférieure) → azote ${n(n2, 2)} · Tableau II : ligne ${n(row[0], 2)} × colonne ${lib.T2_DEPTHS[di]} m → majoration ${e.maj} min · durée fictive ${pl.duree} + ${e.maj} = ${pl.duree + e.maj} min`;
            }
          }
        }
        e.coef = ex.coefIntervalle(e.interval);
        e.avant = cours;
        cours *= e.coef.coef;
      }
      e.depart = cours;
      e.r = ex.plongee({ prof: pl.prof, duree: pl.duree, fo2, o2: !!pl.palierO2 }, { fictive: pl.duree + e.maj });
      if (e.r.err) { e.err = `Plongée ${i + 1} : ${e.r.err}`; res.push(e); break; }
      // La durée max à la PpO₂ du fond, avec le %SNC qui reste au départ
      const fond = e.r.rows[0];
      if (fond.c != null && ex.NOAA[fond.c]) { e.dmaxNoaa = ex.NOAA[fond.c][1]; e.tmax = Math.max(0, (100 - e.depart) / 100 * e.dmaxNoaa); }
      if (i) {
        const L = lettres[k++];
        rows.push([`${L}-IntSurf`, '', cel(String(e.interval), hm(e.interval)), '', '', '', cel(n(e.coef.coef, 3), `${hm(e.interval)} → colonne ${hm(e.coef.col)} (immédiatement inférieure) → coefficient ${n(e.coef.coef, 3)}`),
          cel(n(e.depart, 2), `%SNC = ${n(e.avant, 2)} × ${n(e.coef.coef, 3)} = ${n(e.depart, 2)} % au départ de la plongée ${i + 1}`), '', cel(n(otuTot, 1), 'les OTU ne baissent pas pendant l’intervalle'), '']);
      }
      rows.push(...lignesDuo(e.r, lettres.slice(k, k + 4), eqAir(e.r, i ? { txt: e.majTxt, maj: e.maj, fictive: pl.duree + e.maj } : null)));
      k += 4;
      cours += e.r.snc; otuTot += e.r.otu;
      e.fin = cours; e.otuFin = otuTot;
      const tm = e.tmax != null ? cel(`max ${n(e.tmax, 0)} min`, `Durée max à ${n(fond.pp)} b (colonne ${n(fond.c, 1)}) : ${e.dmaxNoaa} min × (100 − ${n(e.depart, 1)}) % = ${n(e.tmax, 1)} min${pl.duree > e.tmax ? ` · ⚠ ${pl.duree} min prévues : trop long` : ''}`) : '';
      rows.push({ tot: true, c: [`Total P${i + 1}`, '', '', '', '', '', '', cel(n(e.r.snc, 2), `%SNC = ${e.r.rows.map(x => n(x.sncP, 2)).join(' + ')} = ${n(e.r.snc, 2)} %`), '', cel(n(e.r.otu, 1), `OTU = ${e.r.rows.map(x => n(x.otuP, 1)).join(' + ')} = ${n(e.r.otu, 1)}`), tm] });
      if (i) rows.push({ tot: true, c: ['Cumul', '', '', '', '', '', '', cel(n(cours, 2), `${n(e.depart, 2)} + ${n(e.r.snc, 2)} = ${n(cours, 2)} %`), '', cel(n(otuTot, 1), `OTU de la journée jusqu’ici : ${n(otuTot, 1)}`), ''] });
      gps = e.r.tab.gps;
      schema.push({ r: e.r, num: i + 1, interval: e.interval, coef: e.coef?.coef, avant: e.avant, depart: e.depart, maj: e.maj, tmax: e.tmax, duree: pl.duree });
      res.push(e);
    }
    const err = res.find(e => e.err)?.err;
    return { res, rows, schema, snc: cours, otu: otuTot, err,
      rep: `%SNC fin de journée = ${n(cours, 1)} % · ${verdict(cours)} · OTU ${n(otuTot, 0)} / 850`,
      alertes: res.flatMap(e => (e.r?.alertes || []).map(a => `Plongée ${e.i + 1} : ${a.replace(/<[^>]+>/g, '')}`)),
      depassements: res.filter(e => e.tmax != null && e.pl.duree > e.tmax).map(e => `Plongée ${e.i + 1} : ${e.pl.duree} min prévues, mais la durée max à cette PpO₂ avec ${n(e.depart, 1)} % de %SNC au départ est ${n(e.tmax, 0)} min.`) };
  }

  /* ---------- Le schéma de la plongée, avec les valeurs écrites dessus ---------- */
  function svgPlongee(r, num, maxProf, otu = false, extra = null) {
    const W = 400, top = extra ? 46 : 34, bas = extra ? 160 : 150, H = extra ? 228 : 215;
    const y = z => top + z / maxProf * (bas - top);
    const g = gazNom(r.fo2), [fond, rem, ...reste] = r.rows, val = x => (otu ? x.otuP : x.sncP), u = otu ? ' OTU' : ' %';
    const pal = r.paliers, x0 = 10, xD = 40, xF = pal.length ? 175 : 240, larg = 44;
    const xR = pal.length ? xF + 28 : 300;
    let pts = [[x0, top], [xD, y(r.prof)], [xF, y(r.prof)]], t = '';
    const lbl = (x, yy, s, cls = 'sch-lbl', a = 'middle') => `<text x="${x}" y="${yy}" class="${cls}" text-anchor="${a}">${s}</text>`;
    t += lbl(xD + 4, y(r.prof) - 22, `① Fond · ${n(r.prof, 1)} m · ${n(fond.d, 0)} min`, 'sch-lbl', 'start');
    t += lbl(xD + 4, y(r.prof) - 9, `${g} · PpO₂ ${n(fond.pp, 2)} → ${n(val(fond), 2)}${u}`, 'sch-val', 'start');
    let x = xR;
    pal.forEach((p, i) => {
      pts.push([x, y(p.z)], [x + larg, y(p.z)]);
      const row = reste[i];
      // Les paliers en liste, à droite sous la courbe : pas de chevauchement à 6 et 3 m
      t += `<text x="${W - 4}" y="${y(pal[0].z) + 20 + i * 30}" class="sch-lbl" text-anchor="end">③ ${p.z} m · ${p.t} min${p.enO2 ? ' à l’O₂' : ''}</text>`;
      t += `<text x="${W - 4}" y="${y(pal[0].z) + 34 + i * 30}" class="sch-val" text-anchor="end">PpO₂ ${n(row.pp, 2)} → ${n(val(row), 2)}${u}</text>`;
      x += larg + 10;
    });
    pts.push([x + (pal.length ? 4 : 0), top]);
    t += lbl(xF + 4, y(r.prof) + 15, `② ${n(rem.d, 2)} min · ${n(val(rem), 2)}${u}`, 'sch-lbl', 'start');
    if (pal.length) {
      const s = reste[pal.length];
      t += lbl(Math.min(x + 6, W - 4), top - 8, `④ ${n(s.d, 1)} min · ${n(val(s), 2)}${u}`, 'sch-lbl', 'end');
    }
    t += lbl(x0, top - 8, `Plongée ${num}`, 'sch-z', 'start');
    t += lbl(W / 2, H - 22, `PEA ${n(r.pea, 1)} m → table ${r.tab.d} m · ${hm(r.tab.t)} → ${pal.length ? pal.map(p => `${p.tAir} min à ${p.z} m`).join(' + ') : 'pas de palier'} · GPS ${r.tab.gps}`, 'sch-z');
    t += lbl(W / 2, H - 6, extra ? `Total : ${n(r.snc, 2)} % SNC · ${n(r.otu, 0)} OTU` : `Total plongée ${num} : ${n(otu ? r.otu : r.snc, 2)}${u}`, 'sch-tot');
    if (extra?.haut) t += lbl(W / 2, 12, extra.haut, extra.alerte ? 'sch-alerte' : 'sch-is');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma de la plongée ${num}"><line x1="0" y1="${top}" x2="${W}" y2="${top}" class="sch-surf"/>` +
      `<polyline points="${pts.map(q => q.join(',')).join(' ')}" class="sch-prof"/>${t}</svg>`;
  }
  function schemaJournee(sch) {
    const maxProf = Math.max(...sch.map(x => x.r.prof));
    return `<div class="asx-sch n${sch.length}">${sch.map(x => {
      const morceaux = [];
      if (x.interval != null) morceaux.push(`⏱ ${hm(x.interval)} : ${n(x.avant, 1)} × ${n(x.coef, 3)} = ${n(x.depart, 1)} %${x.maj ? ` · maj. +${x.maj} min` : ''}`);
      if (x.tmax != null) morceaux.push(`durée max ${n(x.tmax, 0)} min`);
      return svgPlongee(x.r, x.num, maxProf, false, { haut: morceaux.join(' · '), alerte: x.tmax != null && x.duree > x.tmax });
    }).join('')}</div>`;
  }
  function schemaHTML(liste) {
    const maxProf = Math.max(...liste.map(x => x.r.prof));
    return `<div class="sch as-sch">${liste.map((x, i) => (x.interval != null
      ? `<span class="sch-int">⏱ ${hm(x.interval)} · ${n(x.avant, 2)} × ${n(x.coef, 3)} = ${n(x.depart, 2)} %${x.maj ? ` · majoration +${x.maj} min` : ''}</span>` : '') +
      svgPlongee(x.r, i + 1, maxProf, x.otu)).join('')}</div>`;
  }

  /* ---------- L'écran « Assistants » de la page Nitrox ---------- */
  const GROUPES = [['🫧 Mélange', ['mod', 'pea', 'best', 'pp']], ['🧠 Oxygène', ['portion', 'snc', 'jour', 'inter', 'tmax', 'otu']], ['⛽ Gonflage', ['gonf', 'mariotte']]];
  const OUINON = [[0, 'Non'], [1, 'Oui']];
  const CHOIX = { po2: OUINON, x1: OUINON, x2: OUINON, pp: [[1.6, '1,6'], [1.5, '1,5'], [1.4, '1,4']] };
  const COURT = { p1: 'Profondeur (m)', p2: 'Profondeur (m)', prof: 'Profondeur (m)', d1: 'Temps (min)', d2: 'Temps (min)', duree: 'Temps (min)', o1: 'Nitrox (% O₂)', o2: 'Nitrox (% O₂)', x1: 'Palier O₂ pur ?', x2: 'Palier O₂ pur ?', po2: 'Palier O₂ pur ?', is: 'Intervalle surface (min)' };
  const libelle = (c, qid) => (['jour', 'snc', 'otu'].includes(qid) && COURT[c.id]) || c.q.replace(/ \?.*$/, '').replace(/\?$/, '');
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const CLE = 'mn90:assistants';

  function rendre(box) {
    let etat = {};
    try { etat = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch (e) { etat = {}; }
    const garder = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* stockage indisponible */ } };
    let q = Q.find(x => x.id === etat.q) || Q.find(x => x.id === 'jour');
    box.innerHTML = `<p class="small muted" style="margin-bottom:8px">Choisis un assistant, entre les valeurs de ton énoncé ou de ta plongée : le calcul s’écrit comme sur la copie. Dans un tableau, touche une case pour voir son calcul.</p>
      <div class="as-groupes">${GROUPES.map(([g, ids]) => `<div class="as-g"><span>${g}</span><div>${ids.map(id => { const x = Q.find(y => y.id === id); return x ? `<button type="button" class="ptab" data-q="${id}">${x.t}</button>` : ''; }).join('')}</div></div>`).join('')}</div>
      <div class="as-tete"></div><div class="as-form"></div>
      <label class="as-expl"><input type="checkbox"> 💡 Afficher les explications</label>
      <div class="as-res"></div><div class="as-detail" hidden></div>`;
    const tete = box.querySelector('.as-tete'), form = box.querySelector('.as-form'), res = box.querySelector('.as-res'), detail = box.querySelector('.as-detail'), expl = box.querySelector('.as-expl input');
    expl.checked = !!etat.expl;
    const valeurs = () => (etat[q.id] = etat[q.id] || Object.fromEntries(q.champs.map(c => [c.id, c.v])));

    const item = (x, i) => {
      if (x.h) return `<h4>${x.h}</h4>`;
      if (x.tab) {
        const cell = (c, j, k) => {
          if (c == null || c === '') return '<td></td>';
          if (typeof c === 'string') return `<td>${c}</td>`;
          return c.d ? `<td class="as-c" data-d="${esc(c.d)}">${c.v}</td>` : `<td>${c.v}</td>`;
        };
        return `<div class="tbl-wrap"><table class="tbl exo-tbl as-tab"><thead><tr>${x.tab.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
          x.tab.rows.map((r, j) => { const cs = r.tot ? r.c : r; return `<tr${r.tot ? ' class="tot"' : ''}>${cs.map((c, k) => cell(c, j, k)).join('')}</tr>`; }).join('') + '</tbody></table></div>';
      }
      if (x.txt != null) return `<div class="as-t">${x.txt}${expl.checked && x.c ? `<small>${x.c}</small>` : ''}</div>`;
      return `<div class="as-l"><span>${x.k}</span> <i>=</i> <b>${x.r}</b>${expl.checked && x.c ? `<small>${x.c}</small>` : ''}</div>`;
    };
    function calculer() {
      const v = valeurs();
      let r;
      try { r = q.calc(v); } catch (e) { r = { l: [{ txt: 'Calcul impossible avec ces valeurs : ' + e.message }], rep: '', x: '' }; }
      const aTableau = r.l.some(x => x.tab);
      res.innerHTML = (r.rep ? `<div class="exo-rep">${r.rep}</div>` : '') + (r.schema && !r.schema.some(x => x.r?.err) ? schemaHTML(r.schema) : '') + r.l.map(item).join('') +
        (aTableau && r.fin ? `<div class="as-fin">${r.fin.map(item).join('')}</div>` : '') +
        (expl.checked && r.x ? `<div class="exo-note">${r.x}</div>` : '');
      detail.hidden = true;
      etat.q = q.id;
      garder();
    }
    function montrer() {
      box.querySelectorAll('.as-groupes button').forEach(b => b.classList.toggle('on', b.dataset.q === q.id));
      tete.innerHTML = `<p class="exo-q">${q.t} · exemple : ${q.e}</p>`;
      const v = valeurs();
      const champ = c => (CHOIX[c.id]
        ? `<div class="field exam-champ">${libelle(c, q.id)}<div class="seg" data-c="${c.id}">${CHOIX[c.id].map(([val, lab]) => `<button type="button" data-v="${val}" class="${+v[c.id] === val ? 'on' : ''}">${lab}</button>`).join('')}</div></div>`
        : `<label class="field exam-champ"><span class="field-row">${libelle(c, q.id)}</span>
            <span class="exam-pas"><button type="button" data-m="${c.id}" aria-label="moins">−</button><input class="input" type="number" inputmode="decimal" data-c="${c.id}" value="${v[c.id]}"><button type="button" data-p="${c.id}" aria-label="plus">＋</button></span></label>`);
      // À plat, par plongée : profondeur, temps, Nitrox, palier O₂ ; l'intervalle entre les deux
      const ligne = (titreL, ids) => { const cs = ids.map(id => q.champs.find(c => c.id === id)).filter(Boolean); return cs.length ? `<div class="as-ligne"><span>${titreL}</span><div class="as-champs">${cs.map(champ).join('')}</div></div>` : ''; };
      const groupes = q.id === 'jour' ? [['Plongée 1', ['p1', 'd1', 'o1', 'x1']], ['Intervalle', ['is']], ['Plongée 2', ['p2', 'd2', 'o2', 'x2']]]
        : ['snc', 'otu'].includes(q.id) ? [['Plongée', ['prof', 'duree', 'o2', 'po2']]] : null;
      form.innerHTML = (groupes ? groupes.map(([t, ids]) => ligne(t, ids)).join('') : `<div class="exam-grid">${q.champs.map(champ).join('')}</div>`) +
        `<button type="button" class="btn btn-outline btn-sm as-reset">↺ Valeurs de l’exemple</button>`;
      calculer();
    }
    const pas = id => ({ is: 15, pi: 5, p1: 5, p2: 5, pf: 10, v2: 5 }[id] || 1);
    box.querySelector('.as-groupes').addEventListener('click', e => {
      const b = e.target.closest('button[data-q]');
      if (!b) return;
      q = Q.find(x => x.id === b.dataset.q);
      montrer();
    });
    form.addEventListener('input', e => {
      const i = e.target.closest('input[data-c]');
      if (!i || i.value === '' || isNaN(+i.value)) return;
      valeurs()[i.dataset.c] = +i.value;
      calculer();
    });
    form.addEventListener('click', e => {
      if (e.target.closest('.as-reset')) { delete etat[q.id]; return montrer(); }
      const s = e.target.closest('.seg[data-c] button');
      if (s) {
        valeurs()[s.parentElement.dataset.c] = +s.dataset.v;
        s.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === s));
        return calculer();
      }
      const b = e.target.closest('button[data-m],button[data-p]');
      if (!b) return;
      const id = b.dataset.m || b.dataset.p, i = form.querySelector(`input[data-c="${id}"]`);
      i.value = Math.max(0, Math.round(((+i.value || 0) + (b.dataset.m ? -pas(id) : pas(id))) * 100) / 100);
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expl.addEventListener('change', () => { etat.expl = expl.checked; calculer(); });
    res.addEventListener('click', e => {
      const td = e.target.closest('td.as-c');
      if (!td) return;
      res.querySelectorAll('td.sel').forEach(x => x.classList.remove('sel'));
      td.classList.add('sel');
      detail.textContent = td.dataset.d;
      detail.hidden = false;
    });
    montrer();
  }

  /* ---------- Les images : pressions partielles et profondeur max ---------- */
  const O2C = '#e5484d', N2C = '#3b8fd6';
  // Pressions partielles : PpO₂ et PpN₂ selon la profondeur, les limites, et la barre de Dalton à la profondeur choisie
  function svgPP(prof, f) {
    const W = 520, H = 300, g = 42, d = 360, top = 18, bas = 268, zMax = Math.max(60, Math.ceil((prof + 10) / 10) * 10), pMax = 7;
    const x = p => g + p / pMax * (d - g), y = z => top + z / zMax * (bas - top);
    let s = '';
    for (let z = 0; z <= zMax; z += 10) s += `<line x1="${g}" x2="${d}" y1="${y(z)}" y2="${y(z)}" class="viz-grille"/><text x="${g - 6}" y="${y(z) + 4}" class="viz-lbl" text-anchor="end">${z} m</text>`;
    for (let p = 0; p <= pMax; p++) s += `<text x="${x(p)}" y="${bas + 16}" class="viz-lbl" text-anchor="middle">${p}</text>`;
    s += `<text x="${(g + d) / 2}" y="${bas + 30}" class="viz-lbl" text-anchor="middle">pression partielle (bar)</text>`;
    const lim = (p, c, t, dash) => `<line x1="${x(p)}" x2="${x(p)}" y1="${top}" y2="${bas}" stroke="${c}" stroke-width="1.5" ${dash ? 'stroke-dasharray="5 4"' : ''}/><text x="${x(p) + 3}" y="${top + 10}" class="viz-lbl" fill="${c}">${t}</text>`;
    s += lim(1.6, O2C, 'O₂ 1,6', false) + lim(3.2, '#f59e0b', 'narcose 3,2', true) + lim(5.6, N2C, 'N₂ max 5,6', true);
    const ligne = (fx, c) => `<polyline fill="none" stroke="${c}" stroke-width="3" points="${Array.from({ length: zMax + 1 }, (_, z) => `${x(Math.min(pMax, (1 + z / 10) * fx))},${y(z)}`).join(' ')}"/>`;
    s += ligne(f, O2C) + ligne(1 - f, N2C);
    const P = 1 + prof / 10, po = P * f, pn = P * (1 - f);
    s += `<line x1="${g}" x2="${d}" y1="${y(prof)}" y2="${y(prof)}" stroke="var(--text)" stroke-dasharray="3 3"/>`;
    s += `<circle cx="${x(Math.min(pMax, po))}" cy="${y(prof)}" r="5" fill="${O2C}"/><circle cx="${x(Math.min(pMax, pn))}" cy="${y(prof)}" r="5" fill="${N2C}"/>`;
    s += `<text x="${x(Math.min(pMax, po)) + 7}" y="${y(prof) - 7}" class="viz-val" fill="${O2C}">${n(po, 2)}</text><text x="${x(Math.min(pMax, pn)) + 7}" y="${y(prof) - 7}" class="viz-val" fill="${N2C}">${n(pn, 2)}</text>`;
    // La barre de Dalton : la pression absolue, coupée en O₂ et N₂
    const bx = 400, bw = 70, hb = v => v / pMax * (bas - top);
    s += `<rect x="${bx}" y="${bas - hb(P)}" width="${bw}" height="${hb(pn)}" fill="${N2C}" rx="4"/><rect x="${bx}" y="${bas - hb(po)}" width="${bw}" height="${hb(po)}" fill="${O2C}" rx="4"/>`;
    s += `<text x="${bx + bw / 2}" y="${bas - hb(P) - 8}" class="viz-val" text-anchor="middle">Pa ${n(P, 2)} b</text>`;
    if (hb(pn) > 16) s += `<text x="${bx + bw / 2}" y="${bas - hb(po) - hb(pn) / 2 + 4}" class="viz-in" text-anchor="middle">N₂ ${n(pn, 2)}</text>`;
    if (hb(po) > 16) s += `<text x="${bx + bw / 2}" y="${bas - hb(po) / 2 + 4}" class="viz-in" text-anchor="middle">O₂ ${n(po, 2)}</text>`;
    s += `<text x="${bx + bw / 2}" y="${bas + 16}" class="viz-lbl" text-anchor="middle">à ${n(prof, 1)} m</text>`;
    return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pressions partielles selon la profondeur">${s}</svg>`;
  }
  // Profondeur max : la PpO₂ qui monte avec la profondeur, la limite, la MOD, la zone interdite
  function svgMOD(f, ppmax) {
    const mod = (ppmax / f - 1) * 10;
    const W = 520, H = 290, g = 42, d = W - 12, top = 28, bas = 248, zMax = Math.max(20, Math.min(100, Math.ceil((mod * 1.35 + 5) / 10) * 10)), pMax = Math.max(2.2, Math.ceil((1 + zMax / 10) * f * 10) / 10);
    const x = z => g + z / zMax * (d - g), y = p => bas - p / pMax * (bas - top);
    let s = '';
    for (let p = 0; p <= pMax + 1e-9; p += 0.4) s += `<line x1="${g}" x2="${d}" y1="${y(p)}" y2="${y(p)}" class="viz-grille"/><text x="${g - 6}" y="${y(p) + 4}" class="viz-lbl" text-anchor="end">${n(p, 1)}</text>`;
    const pasZ = zMax > 60 ? 20 : 10;
    for (let z = 0; z <= zMax; z += pasZ) s += `<text x="${x(z)}" y="${bas + 16}" class="viz-lbl" text-anchor="middle">${z} m</text>`;
    s += `<text x="${(g + d) / 2}" y="${bas + 32}" class="viz-lbl" text-anchor="middle">profondeur</text><text x="${g}" y="${top - 12}" class="viz-lbl" text-anchor="middle">PpO₂ (b)</text>`;
    s += `<rect x="${x(Math.min(mod, zMax))}" y="${top}" width="${Math.max(0, d - x(Math.min(mod, zMax)))}" height="${bas - top}" fill="${O2C}" opacity=".12"/>`;
    s += `<text x="${(x(Math.min(mod, zMax)) + d) / 2}" y="${top + 16}" class="viz-val" fill="${O2C}" text-anchor="middle">interdit</text>`;
    for (const [p, dash] of [[1.4, true], [1.5, true], [1.6, false]]) if (p <= pMax) s += `<line x1="${g}" x2="${d}" y1="${y(p)}" y2="${y(p)}" stroke="${O2C}" stroke-width="${p === ppmax ? 2 : 1}" ${dash ? 'stroke-dasharray="4 4"' : ''} opacity="${p === ppmax ? 1 : .5}"/>` + (p === ppmax ? `<text x="${g + 4}" y="${y(p) - 5}" class="viz-val" fill="${O2C}">limite ${n(p, 1)} b</text>` : '');
    s += `<polyline fill="none" stroke="var(--accent)" stroke-width="3" points="${Array.from({ length: 101 }, (_, i) => { const z = i / 100 * zMax; return `${x(z)},${y((1 + z / 10) * f)}`; }).join(' ')}"/>`;
    if (mod <= zMax) {
      s += `<line x1="${x(mod)}" x2="${x(mod)}" y1="${y(ppmax)}" y2="${bas}" stroke="var(--text)" stroke-dasharray="4 3"/><circle cx="${x(mod)}" cy="${y(ppmax)}" r="6" fill="var(--accent)" stroke="#fff" stroke-width="2"/>`;
      s += `<text x="${x(mod) - 8}" y="${y(ppmax) - 10}" class="viz-val" text-anchor="end">MOD ${n(mod, 1)} m</text>`;
    }
    s += `<text x="${x(zMax * 0.08)}" y="${y((1 + zMax * 0.08 / 10) * f) - 10}" class="viz-lbl" fill="var(--accent)">PpO₂ du ${f >= 0.995 ? 'O₂ pur' : f <= 0.21 ? 'air' : 'Nx' + Math.round(f * 100)}</text>`;
    return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profondeur max">${s}</svg>`;
  }

  // Best mix : la bouteille et son étiquette Nitrox remplie
  function svgBouteille(prof, duree) {
    const p = pa(prof), pp = duree > 45 ? 1.5 : 1.6, nx = Math.min(100, Math.floor(pp / p * 100 + 1e-9));
    const mod = (pp / (nx / 100) - 1) * 10, ppReel = p * nx / 100;
    const W = 520, H = 392, bx = 160, bw = 200, by = 58, bh = 322;
    const nom = nx >= 100 ? 'O₂ PUR' : nx <= 21 ? 'AIR' : 'NITROX';
    let s = '';
    // le corps du bloc, l'ogive verte (code couleur Nitrox), la robinetterie
    s += `<rect x="${bx + bw / 2 - 16}" y="6" width="32" height="26" rx="5" fill="#9aa4ab"/><rect x="${bx + bw / 2 - 40}" y="14" width="80" height="12" rx="6" fill="#7b858c"/>`;
    s += `<path d="M${bx} ${by + 40} Q${bx} ${by} ${bx + bw / 2} ${by - 4} Q${bx + bw} ${by} ${bx + bw} ${by + 40} L${bx + bw} ${by + bh - 18} Q${bx + bw} ${by + bh} ${bx + bw - 18} ${by + bh} L${bx + 18} ${by + bh} Q${bx} ${by + bh} ${bx} ${by + bh - 18} Z" fill="#f2d800" stroke="#a89600" stroke-width="2"/>`;
    s += `<path d="M${bx} ${by + 40} Q${bx} ${by} ${bx + bw / 2} ${by - 4} Q${bx + bw} ${by} ${bx + bw} ${by + 40} Z" fill="#1a9b3a"/>`;
    s += `<rect x="${bx + 12}" y="${by + 8}" width="14" height="${bh - 30}" rx="7" fill="#fff" opacity=".25"/>`;
    // l'étiquette
    const ex = bx + 16, ew = bw - 32, ey = by + 78;
    s += `<rect x="${ex}" y="${ey}" width="${ew}" height="176" rx="8" fill="#fff" stroke="#1a9b3a" stroke-width="3"/>`;
    s += `<rect x="${ex}" y="${ey}" width="${ew}" height="40" rx="8" fill="#1a9b3a"/><rect x="${ex}" y="${ey + 30}" width="${ew}" height="10" fill="#1a9b3a"/>`;
    s += `<text x="${ex + ew / 2}" y="${ey + 29}" class="et-titre" text-anchor="middle">${nom}</text>`;
    const ligne = (yy, lbl, val) => `<text x="${ex + 8}" y="${yy}" class="et-lbl">${lbl}</text><rect x="${ex + 72}" y="${yy - 22}" width="${ew - 80}" height="30" rx="4" fill="#fffbe0" stroke="#1a9b3a" stroke-width="1.5"/><text x="${ex + 72 + (ew - 80) / 2}" y="${yy}" class="et-val" text-anchor="middle">${val}</text>`;
    s += ligne(ey + 74, 'O₂ %', `${nx} %`);
    s += ligne(ey + 112, 'MOD', `${Math.floor(mod + 1e-9)} m`);
    s += ligne(ey + 150, `PpO₂ ${n(pp, 1)}`, `${n(ppReel, 2)} b`);
    s += `<text x="${ex + ew / 2}" y="${ey + 170}" class="et-pied" text-anchor="middle">pour ${n(prof, 1)} m${duree ? ` · ${duree} min` : ''}</text>`;
    // à côté : la profondeur prévue et la MOD
    s += `<text x="${bx - 14}" y="${by + 60}" class="viz-val" text-anchor="end">Pa à ${n(prof, 1)} m</text><text x="${bx - 14}" y="${by + 80}" class="viz-lbl" text-anchor="end">${n(p, 2)} bar</text>`;
    s += `<text x="${bx - 14}" y="${by + 130}" class="viz-val" text-anchor="end">%O₂ max</text><text x="${bx - 14}" y="${by + 150}" class="viz-lbl" text-anchor="end">${n(pp, 1)} / ${n(p, 2)} = ${n(pp / p, 3)}</text>`;
    s += `<text x="${bx - 14}" y="${by + 200}" class="viz-val" text-anchor="end">arrondi vers le bas</text><text x="${bx - 14}" y="${by + 220}" class="viz-lbl" text-anchor="end">→ ${nom === 'NITROX' ? 'Nx' + nx : nom}</text>`;
    s += `<text x="${bx + bw + 14}" y="${by + 80}" class="viz-val">PpO₂ max</text><text x="${bx + bw + 14}" y="${by + 100}" class="viz-lbl">${duree > 45 ? '1,5 b (plus de 45 min)' : '1,6 b'}</text>`;
    s += `<text x="${bx + bw + 14}" y="${by + 150}" class="viz-val">Vérification</text><text x="${bx + bw + 14}" y="${by + 170}" class="viz-lbl">${n(p, 2)} × ${n(nx / 100, 2)} = ${n(ppReel, 2)} ≤ ${n(pp, 1)} ✓</text>`;
    return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Le bloc et son étiquette Nitrox">${s}</svg>`;
  }

  /* ---------- Journée plongée : la frise (profil, %SNC, OTU) et les jauges, avec un curseur ---------- */
  const SNCC = '#e28343', OTUC = '#a855f7';
  // Les points de la journée, toutes les 0,25 min ; les intervalles sont resserrés (largeur fixe) mais étiquetés
  function modeleJournee(j) {
    const pts = [], marques = [];
    let vt = 0, snc = 0, otu = 0;
    j.res.forEach((e, i) => {
      if (!e.r || e.r.err) return;
      if (i && e.interval != null) {
        const L = 30, a = snc, b2 = e.depart;
        marques.push({ type: 'is', t0: vt, t1: vt + L, txt: hm(e.interval), coef: e.coef?.coef });
        for (let t = 0; t <= L; t += 0.5) pts.push({ vt: vt + t, z: 0, snc: a > 0 ? a * Math.pow(b2 / a || 0, t / L) : 0, otu, pp: 0, i, phase: `intervalle ${hm(e.interval)}`, calc: `%SNC = ${n(a, 2)} × ${n(e.coef?.coef, 3)} (coefficient ${hm(e.coef?.col ?? 0)}) = ${n(b2, 2)} % · les OTU ne baissent pas (${n(otu, 0)})${e.maj ? ` · majoration de la plongée ${i + 1} : +${e.maj} min` : ''}` });
        vt += L; snc = b2;
      }
      const r = e.r, [fond, rem, ...reste] = r.rows, prem = r.paliers[0]?.z ?? 0;
      marques.push({ type: 'p', t0: vt, i, txt: `P${i + 1} · ${gazNom(r.fo2)} · ${n(r.prof, 0)} m` });
      const phase = (d, zA, zB, row, nom, desc = 0) => {
        const t0 = vt;
        for (let t = 0; t <= d + 1e-9; t += Math.min(0.25, d || 0.25)) {
          const z = desc && t < desc ? zB * t / desc : zA + (zB - zA) * (desc ? 1 : t / (d || 1));
          pts.push({ vt: t0 + t, z, snc: snc + row.sncP * (d ? t / d : 1), otu: otu + row.otuP * (d ? t / d : 1), pp: row.pp, i, phase: nom,
            calc: `PpO₂ ${n(row.pp, 3)} b → ${row.c == null ? 'sous 0,6 : 0' : `colonne ${n(row.c, 1)}`} · %SNC = ${n(row.snc, 2)} × ${n(d, 2)} min = ${n(row.sncP, 2)} % · OTU = ${n(row.otu, 2)} × ${n(d, 2)} = ${n(row.otuP, 1)}` });
          if (!d) break;
        }
        vt = t0 + d; snc += row.sncP; otu += row.otuP;
      };
      phase(fond.d, r.prof, r.prof, fond, 'fond', Math.min(r.prof / 20, fond.d * 0.3));
      phase(rem.d, r.prof, prem, rem, 'remontée');
      r.paliers.forEach((p, k) => phase(reste[k].d, p.z, p.z, reste[k], `palier ${p.z} m${p.enO2 ? ' O₂' : ''}`));
      if (r.paliers.length) { const s = reste[r.paliers.length], z = r.paliers[r.paliers.length - 1].z; phase(s.d, z, 0, s, 'remontée surface'); }
    });
    return { pts, marques, fin: vt, snc, otu };
  }

  function dessinerFrise(box, j) {
    const M = modeleJournee(j);
    if (!M.pts.length) { box.innerHTML = ''; return; }
    const W = Math.max(320, box.clientWidth), H = Math.max(260, box.clientHeight);
    const gJ = W >= 560 ? 132 : 96, g = 40, d = W - gJ - 34, haut = 22, milieu = Math.round(H * 0.42), bas = H - 26;
    const x = t => g + t / M.fin * (d - g);
    const zMax = Math.max(10, ...M.pts.map(p => p.z));
    const yz = z => haut + 8 + z / zMax * (milieu - haut - 16);
    const sMax = Math.max(110, Math.ceil(Math.max(...M.pts.map(p => p.snc)) / 10) * 10 + 10);
    const oMax = Math.max(300, Math.ceil(Math.max(...M.pts.map(p => p.otu)) * 1.15 / 50) * 50);
    const b0 = milieu + 22;
    const ys = v => bas - v / sMax * (bas - b0), yo = v => bas - v / oMax * (bas - b0);
    let s = '';
    // intervalles et étiquettes des plongées
    for (const m of M.marques) {
      if (m.type === 'is') s += `<rect x="${x(m.t0)}" y="${haut}" width="${x(m.t1) - x(m.t0)}" height="${bas - haut}" class="fr-is"/><text x="${(x(m.t0) + x(m.t1)) / 2}" y="${haut + 4}" class="fr-lbl" text-anchor="middle">⏱ ${m.txt}</text>`;
      else s += `<text x="${x(m.t0) + 2}" y="${haut - 6}" class="fr-p">${m.txt}</text>`;
    }
    // profil
    s += `<line x1="${g}" x2="${d}" y1="${yz(0)}" y2="${yz(0)}" class="fr-surf"/>`;
    for (let z = 10; z <= zMax; z += zMax > 40 ? 20 : 10) s += `<text x="${g - 5}" y="${yz(z) + 4}" class="fr-lbl" text-anchor="end">${z} m</text><line x1="${g}" x2="${d}" y1="${yz(z)}" y2="${yz(z)}" class="fr-grille"/>`;
    const prof = M.pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.vt).toFixed(1)},${yz(p.z).toFixed(1)}`).join('');
    s += `<path d="${prof}L${x(M.fin)},${yz(0)}L${g},${yz(0)}Z" class="fr-aire"/><path d="${prof}" class="fr-prof"/>`;
    // %SNC et OTU, avec leurs limites
    for (const [v, c, t] of [[50, '#f59e0b', '50 %'], [90, '#f97316', '90 %'], [100, '#ef4444', '100 %']]) if (v <= sMax) s += `<line x1="${g}" x2="${d}" y1="${ys(v)}" y2="${ys(v)}" stroke="${c}" stroke-dasharray="5 4"/><text x="${g - 5}" y="${ys(v) + 4}" class="fr-lbl" fill="${c}" text-anchor="end">${t}</text>`;
    if (850 <= oMax) s += `<line x1="${g}" x2="${d}" y1="${yo(850)}" y2="${yo(850)}" stroke="${OTUC}" stroke-dasharray="2 4"/><text x="${d + 4}" y="${yo(850) + 4}" class="fr-lbl" fill="${OTUC}">850</text>`;
    s += `<text x="${d + 4}" y="${b0 + 4}" class="fr-lbl" fill="${OTUC}">${oMax}</text><text x="${d + 4}" y="${bas}" class="fr-lbl" fill="${OTUC}">0</text>`;
    s += `<line x1="${g}" x2="${d}" y1="${bas}" y2="${bas}" class="fr-grille"/>`;
    s += `<path d="${M.pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.vt).toFixed(1)},${ys(p.snc).toFixed(1)}`).join('')}" fill="none" stroke="${SNCC}" stroke-width="2.5"/>`;
    s += `<path d="${M.pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.vt).toFixed(1)},${yo(p.otu).toFixed(1)}`).join('')}" fill="none" stroke="${OTUC}" stroke-width="2" stroke-dasharray="6 3"/>`;
    s += `<text x="${g}" y="${b0 - 6}" class="fr-lbl"><tspan fill="${SNCC}" font-weight="800">━ %SNC</tspan><tspan dx="10" fill="${OTUC}" font-weight="800">┅ OTU</tspan></text>`;
    // les jauges
    const jx = W - gJ + 8, jw = gJ >= 120 ? 34 : 26, jy0 = haut + 20, jy1 = bas;
    const jauge = (xx, v, max, lims, c, titre, id) => {
      let t = `<text x="${xx + jw / 2}" y="${jy0 - 8}" class="fr-lbl" text-anchor="middle" font-weight="800">${titre}</text><rect x="${xx}" y="${jy0}" width="${jw}" height="${jy1 - jy0}" rx="6" class="fr-jauge"/>`;
      t += `<rect id="${id}" x="${xx}" y="${jy1}" width="${jw}" height="0" rx="6" fill="${c}"/>`;
      for (const [l, lc] of lims) { const yy = jy1 - Math.min(1, l / max) * (jy1 - jy0); t += `<line x1="${xx - 4}" x2="${xx + jw + 4}" y1="${yy}" y2="${yy}" stroke="${lc}" stroke-width="2"/><text x="${xx + jw + 6}" y="${yy + 4}" class="fr-lbl" fill="${lc}">${l}</text>`; }
      t += `<text id="${id}-v" x="${xx + jw / 2}" y="${jy1 + 16}" class="fr-val" text-anchor="middle"></text>`;
      return t;
    };
    const jMaxS = Math.max(110, sMax), jMaxO = Math.max(900, oMax);
    s += jauge(jx, 0, jMaxS, [[50, '#f59e0b'], [100, '#ef4444']], SNCC, '%SNC', 'fr-js') + jauge(jx + jw + (gJ >= 120 ? 34 : 22), 0, jMaxO, [[850, '#ef4444']], OTUC, 'OTU', 'fr-jo');
    s += `<line id="fr-cur" y1="${haut}" y2="${bas}" class="fr-cur"/>`;
    box.innerHTML = `<svg class="fr" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="La journée : profil, %SNC et OTU">${s}</svg><div class="fr-lecture"></div>`;
    const svg = box.querySelector('svg'), lect = box.querySelector('.fr-lecture');
    const remplir = (id, v, max) => { const r = svg.querySelector('#' + id), hh = Math.min(1, v / max) * (jy1 - jy0); r.setAttribute('y', jy1 - hh); r.setAttribute('height', hh); };
    const montrer = vt => {
      vt = Math.max(0, Math.min(M.fin, vt));
      let p = M.pts[0];
      for (const q of M.pts) { if (q.vt <= vt) p = q; else break; }
      const c = svg.querySelector('#fr-cur'); c.setAttribute('x1', x(vt)); c.setAttribute('x2', x(vt));
      remplir('fr-js', p.snc, jMaxS); remplir('fr-jo', p.otu, jMaxO);
      svg.querySelector('#fr-js-v').textContent = `${n(p.snc, 1)} %`; svg.querySelector('#fr-jo-v').textContent = n(p.otu, 0);
      lect.innerHTML = `<div><b>P${p.i + 1}</b> · ${p.phase}${p.z > 0 ? ` · <b>${n(p.z, 1)} m</b> · PpO₂ <b>${n(p.pp, 2)}</b>` : ''} · <span style="color:${SNCC}">%SNC <b>${n(p.snc, 1)} %</b></span> · <span style="color:${OTUC}">OTU <b>${n(p.otu, 0)}</b></span></div>${p.calc ? `<div class="fr-calc">${p.calc}</div>` : ''}`;
    };
    const versT = ev => { const r = svg.getBoundingClientRect(); return ((ev.clientX - r.left) / r.width * W - g) / (d - g) * M.fin; };
    svg.addEventListener('pointerdown', ev => { svg.setPointerCapture?.(ev.pointerId); montrer(versT(ev)); });
    svg.addEventListener('pointermove', ev => montrer(versT(ev)));
    montrer(M.fin);
  }

  /* ---------- Gonflage : les bouteilles (ce qu'on a, ce qu'on veut), source d'O₂ au choix ---------- */
  function bloc(x, y, w, h, couches, pMax, titre, sous) {
    // couches : du bas vers le haut, { v (bar), c (couleur), t (texte) }
    let s = `<rect x="${x + w / 2 - 10}" y="${y - 22}" width="20" height="16" rx="3" fill="#9aa4ab"/><rect x="${x + w / 2 - 26}" y="${y - 16}" width="52" height="8" rx="4" fill="#7b858c"/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2.6}" fill="var(--bg2)" stroke="var(--text3)" stroke-width="2"/>`;
    s += `<clipPath id="cl${x}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2.6}"/></clipPath><g clip-path="url(#cl${x})">`;
    let yy = y + h;
    for (const k of couches) {
      const hh = Math.max(0, k.v) / pMax * h;
      if (hh <= 0) continue;
      yy -= hh;
      s += `<rect x="${x}" y="${yy}" width="${w}" height="${hh}" fill="${k.c}"/>`;
      if (hh >= 16 && k.t) s += `<text x="${x + w / 2}" y="${yy + hh / 2 + 4}" class="bt-in" text-anchor="middle">${k.t}</text>`;
    }
    s += `</g><text x="${x + w / 2}" y="${y + h + 18}" class="viz-val" text-anchor="middle">${titre}</text><text x="${x + w / 2}" y="${y + h + 34}" class="viz-lbl" text-anchor="middle">${sous}</text>`;
    return s;
  }
  function svgGonflage(v, g, res) {
    const W = 560, H = 330, y = 40, h = 230, w = 92, pMax = Math.max(v.pf, 230, res ? v.p2 : 0) * 1.02;
    const C = { o2: '#e5484d', n2: '#3b8fd6', reste: '#7c8b93', air: '#5fb0ea' };
    const fi = v.fi / 100;
    let s = bloc(30, y, w, h, [{ v: v.pi * (1 - fi), c: C.n2, t: v.pi * (1 - fi) >= 8 ? `N₂ ${n(v.pi * (1 - fi), 1)}` : '' }, { v: v.pi * fi, c: C.o2, t: v.pi * fi >= 8 ? `O₂ ${n(v.pi * fi, 1)}` : '' }].reverse().reverse(),
      pMax, 'On a', `${v.pi} b de ${nxNom(v.fi)}`);
    s += `<text x="${30 + w / 2}" y="${y - 30}" class="viz-lbl" text-anchor="middle">bloc ${v.v1} L</text>`;
    const ok = g.o2 >= -1e-9 && g.dN >= -1e-9;
    s += bloc(W - 30 - w, y, w, h, ok ? [
      { v: v.pi, c: C.reste, t: v.pi >= 10 ? `reste ${v.pi}` : '' },
      { v: g.o2, c: C.o2, t: `O₂ pur ${n(g.o2, 1)}` },
      { v: g.air, c: C.air, t: `air ${n(g.air, 1)}` }] : [], pMax, 'On veut', `${v.pf} b de ${nxNom(v.ff)}`);
    s += `<text x="${W - 30 - w / 2}" y="${y - 30}" class="viz-lbl" text-anchor="middle">O₂ ${n(v.pf * v.ff / 100, 1)} · N₂ ${n(v.pf * (1 - v.ff / 100), 1)}</text>`;
    // les étapes, au milieu
    const mx = W / 2;
    if (ok) {
      s += `<text x="${mx}" y="${y + 50}" class="viz-val" text-anchor="middle" fill="${C.o2}">① O₂ pur</text><text x="${mx}" y="${y + 68}" class="viz-lbl" text-anchor="middle">${v.pi} → ${n(v.pi + g.o2, 1)} b (+${n(g.o2, 1)})</text>`;
      s += `<text x="${mx}" y="${y + 110}" class="viz-val" text-anchor="middle" fill="#2b7fc0">② Air</text><text x="${mx}" y="${y + 128}" class="viz-lbl" text-anchor="middle">${n(v.pi + g.o2, 1)} → ${v.pf} b (+${n(g.air, 1)})</text>`;
      s += `<text x="${mx}" y="${y + 146}" class="viz-lbl" text-anchor="middle">dont O₂ ${n(g.dN / 4, 1)} · N₂ ${n(g.dN, 1)}</text>`;
      s += `<path d="M${30 + w + 16} ${y + h / 2} H${W - 30 - w - 16}" stroke="var(--text3)" stroke-width="2" marker-end="url(#fl)"/>`;
    } else s += `<text x="${mx}" y="${y + 90}" class="viz-val" text-anchor="middle" fill="${C.o2}">Impossible tel quel</text><text x="${mx}" y="${y + 108}" class="viz-lbl" text-anchor="middle">trop ${g.dN < 0 ? 'd’azote' : 'd’O₂'} dans le bloc : vider d’abord</text>`;
    if (res) {
      const ok2 = res.peq >= v.pi + g.o2 - 1e-9;
      s += `<text x="${mx}" y="${y + 186}" class="viz-val" text-anchor="middle">Réserve ${v.v2} L à ${v.p2} b</text>`;
      s += `<text x="${mx}" y="${y + 204}" class="viz-lbl" text-anchor="middle">monte le bloc au plus à ${n(res.peq, 1)} b</text>`;
      s += `<text x="${mx}" y="${y + 222}" class="viz-val" text-anchor="middle" fill="${ok2 ? '#16a34a' : C.o2}">${ok2 ? `✓ suffit (elle finit à ${n(res.apres, 1)} b)` : '✗ ne suffit pas'}</text>`;
    }
    return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gonflage : ce qu'on a, ce qu'on veut"><defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--text3)"/></marker></defs>${s}</svg>`;
  }
  const nxNom = pct => (pct >= 100 ? 'O₂ pur' : pct <= 21 ? 'air' : 'Nx' + pct);

  /* ---------- Le mode « Assistant » de la page Nitrox : volet à gauche, valeurs, résultat à droite ---------- */
  const LISTE = [['pp', '🫧 Pressions partielles'], ['mod', '📏 Profondeur max'], ['pea', '🟰 Prof. équivalente air'], ['best', '🎯 Best mix'],
    ['journee', '🧠 Journée plongée'], ['gonf', '⛽ Gonflage']];
  const CLE_APP = 'mn90:assistant';
  const PLONGEE_DEF = [{ prof: 30, duree: 70, o2: 35, palierO2: 1 }, { prof: 25, duree: 40, o2: 45, palierO2: 0 }, { prof: 20, duree: 45, o2: 32, palierO2: 0 }, { prof: 15, duree: 50, o2: 32, palierO2: 0 }];

  function rendreApp(box, { niveau = '', onNiveau = null, onTable = null } = {}) {
    let etat = {};
    try { etat = JSON.parse(localStorage.getItem(CLE_APP) || '{}'); } catch (e) { etat = {}; }
    const garder = () => { try { localStorage.setItem(CLE_APP, JSON.stringify(etat)); } catch (e) { /* stockage indisponible */ } };
    etat.a = LISTE.some(([id]) => id === etat.a) ? etat.a : 'journee';
    etat.vue = etat.vue || 'courbe';
    box.innerHTML = `<div class="asx">
      <div class="asx-top">${niveau}</div>
      <div class="asx-corps">
        <nav class="asx-nav">${LISTE.map(([id, t]) => { const [ic, ...tx] = t.split(' '); return `<button type="button" data-a="${id}" title="${tx.join(' ')}"><span class="ic">${ic}</span><span class="tx">${tx.join(' ')}</span></button>`; }).join('')}</nav>
        <section class="asx-in"></section>
        <section class="asx-out"></section>
      </div></div>`;
    if (onNiveau) box.querySelector('.asx-top').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) onNiveau(b.dataset.v); });
    const nav = box.querySelector('.asx-nav'), zIn = box.querySelector('.asx-in'), zOut = box.querySelector('.asx-out');
    const detailHTML = '<div class="as-detail asx-detail" hidden></div>';

    // --- les assistants simples : les champs de l'énoncé type, le calcul en lignes ---
    const champsSimples = q => {
      const v = (etat[q.id] = etat[q.id] || Object.fromEntries(q.champs.map(c => [c.id, c.v])));
      zIn.innerHTML = `<h3>${LISTE.find(x => x[0] === q.id)[1]}</h3><p class="small muted">Exemple : ${q.e}</p><div class="asx-champs">${q.champs.map(c => CHOIX[c.id]
        ? `<div class="field exam-champ">${libelle(c, q.id)}<div class="seg" data-c="${c.id}">${CHOIX[c.id].map(([val, lab]) => `<button type="button" data-v="${val}" class="${+v[c.id] === val ? 'on' : ''}">${lab}</button>`).join('')}</div></div>`
        : `<label class="field exam-champ"><span class="field-row">${libelle(c, q.id)}</span><span class="exam-pas"><button type="button" data-m="${c.id}" aria-label="moins">−</button><input class="input" type="number" inputmode="decimal" data-c="${c.id}" value="${v[c.id]}"><button type="button" data-p="${c.id}" aria-label="plus">＋</button></span></label>`).join('')}</div>
        <button type="button" class="btn btn-outline btn-sm asx-reset">↺ Valeurs de l’exemple</button>`;
      const calculer = () => {
        let r;
        try { r = q.calc(v); } catch (e) { r = { l: [{ txt: 'Calcul impossible : ' + e.message }], rep: '', x: '' }; }
        const viz = q.id === 'pp' ? svgPP(+v.prof, v.o2 / 100) : q.id === 'mod' ? svgMOD(v.o2 / 100, +v.pp) : q.id === 'best' ? svgBouteille(+v.prof, +v.duree) : '';
        zOut.innerHTML = (r.rep ? `<div class="exo-rep">${r.rep}</div>` : '') + viz + `<div class="as-res">${r.l.map(x => (x.h ? `<h4>${x.h}</h4>`
          : x.txt != null ? `<div class="as-t">${x.txt}${x.c ? `<small>${x.c}</small>` : ''}</div>`
            : `<div class="as-l"><span>${x.k}</span> <i>=</i> <b>${x.r}</b>${x.c ? `<small>${x.c}</small>` : ''}</div>`)).join('')}</div>` +
          (q.id === 'pea' && onTable ? `<button type="button" class="btn btn-primary asx-table">📋 Générer la table Nitrox pour le Nx${v.o2}</button>` : '') +
          (r.x ? `<div class="exo-note">${r.x}</div>` : '');
        const bt = zOut.querySelector('.asx-table');
        if (bt) bt.onclick = () => onTable(+v.o2);
        garder();
      };
      zIn.oninput = e => { const i = e.target.closest('input[data-c]'); if (!i || i.value === '' || isNaN(+i.value)) return; v[i.dataset.c] = +i.value; calculer(); };
      zIn.onclick = e => {
        if (e.target.closest('.asx-reset')) { delete etat[q.id]; return montrer(); }
        const s = e.target.closest('.seg[data-c] button');
        if (s) { v[s.parentElement.dataset.c] = +s.dataset.v; s.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === s)); return calculer(); }
        const b = e.target.closest('button[data-m],button[data-p]');
        if (!b) return;
        const id = b.dataset.m || b.dataset.p, i = zIn.querySelector(`input[data-c="${id}"]`), pas = { pf: 10, pi: 5, p1: 5, p2: 5, v2: 5 }[id] || 1;
        i.value = Math.max(0, Math.round(((+i.value || 0) + (b.dataset.m ? -pas : pas)) * 100) / 100);
        i.dispatchEvent(new Event('input', { bubbles: true }));
      };
      calculer();
    };

    // --- Journée plongée : 1 à 4 plongées, la courbe ou le tableau à droite ---
    const journee = () => {
      const J = (etat.journee = etat.journee || { nb: 2, pl: PLONGEE_DEF.map(x => ({ ...x })), is: [150, 120, 120] });
      const ligneP = (p, i) => `<div class="asx-pl" data-i="${i}">
          <b>P${i + 1}</b>
          <input class="input" type="number" inputmode="decimal" data-k="prof" value="${p.prof}" aria-label="Profondeur plongée ${i + 1}">
          <input class="input" type="number" inputmode="numeric" data-k="duree" value="${p.duree}" aria-label="Temps plongée ${i + 1}">
          <input class="input" type="number" inputmode="numeric" data-k="o2" value="${p.o2}" aria-label="Nitrox plongée ${i + 1}">
          <div class="seg asx-o2" data-k="palierO2"><button type="button" data-v="0" class="${p.palierO2 ? '' : 'on'}">Non</button><button type="button" data-v="1" class="${p.palierO2 ? 'on' : ''}">Oui</button></div>
        </div>`;
      const ligneIs = i => `<div class="asx-is" data-is="${i}"><span>⏱ Intervalle surface</span><input class="input" type="number" inputmode="numeric" value="${J.is[i]}" aria-label="Intervalle avant la plongée ${i + 2}"><span>min <i>(${hm(J.is[i])})</i></span></div>`;
      zIn.innerHTML = `<h3>🧠 Journée plongée</h3>
        <div class="field">Nombre de plongées<div class="seg asx-nb">${[1, 2, 3, 4].map(k => `<button type="button" data-nb="${k}" class="${J.nb === k ? 'on' : ''}">${k}</button>`).join('')}</div></div>
        <div class="asx-tete"><span></span><span>Prof. (m)</span><span>Temps (min)</span><span>Nitrox (%)</span><span>Palier O₂ pur ?</span></div>
        ${J.pl.slice(0, J.nb).map((p, i) => (i ? ligneIs(i - 1) : '') + ligneP(p, i)).join('')}
        <button type="button" class="btn btn-outline btn-sm asx-reset">↺ Exemple du cours</button>`;
      const calculer = () => {
        const j = calcJournee(J.pl.slice(0, J.nb), J.is);
        const tab = `<div class="tbl-wrap asx-tab"><table class="tbl exo-tbl as-tab duo"><thead><tr>${TETE2.map((h, k) => `<th class="${k === 6 || k === 7 ? 'snc' : k === 8 || k === 9 ? 'otu' : ''}">${h}</th>`).join('')}</tr></thead><tbody>` +
          j.rows.map(r => { const cs = r.tot ? r.c : r; return `<tr${r.tot ? ' class="tot"' : ''}>${cs.map((c, k) => { const cls = k === 6 || k === 7 ? 'snc' : k === 8 || k === 9 ? 'otu' : ''; if (c == null || c === '') return `<td class="${cls}"></td>`; if (typeof c === 'string') return `<td class="${cls}">${c}</td>`; return c.d ? `<td class="${cls}">${c.v}<small class="asx-d">${c.d}</small></td>` : `<td class="${cls}">${c.v}</td>`; }).join('')}</tr>`; }).join('') + '</tbody></table></div>';
        zOut.innerHTML = `<div class="exo-rep">${j.err ? '⚠ ' + j.err : j.rep}</div>` +
          (j.depassements.length ? `<div class="exo-note warn">${j.depassements.join('<br>')}</div>` : '') +
          (j.alertes.length ? `<details class="asx-rq"><summary>⚠ ${j.alertes.length} remarque${j.alertes.length > 1 ? 's' : ''} sur la lecture de la table</summary>${[...new Set(j.alertes)].map(a => `<div>${a}</div>`).join('')}</details>` : '') +
          `<div class="seg asx-vue"><button type="button" data-vue="courbe" class="${etat.vue === 'courbe' ? 'on' : ''}">📈 Courbe</button><button type="button" data-vue="schema" class="${etat.vue === 'schema' ? 'on' : ''}">🧾 Schéma</button><button type="button" data-vue="tableau" class="${etat.vue === 'tableau' ? 'on' : ''}">📋 Tableau</button></div>` +
          `<div class="asx-vue-corps ${etat.vue}">${etat.vue === 'schema' && j.schema.length ? schemaJournee(j.schema) : etat.vue === 'tableau' ? tab : ''}</div>` + detailHTML;
        if (etat.vue === 'courbe' || !['schema', 'tableau'].includes(etat.vue)) {
          const boite = zOut.querySelector('.asx-vue-corps');
          boite.classList.add('courbe');
          requestAnimationFrame(() => dessinerFrise(boite, j));
          zOut._frise = () => dessinerFrise(boite, j);
        } else zOut._frise = null;
        garder();
      };
      zIn.oninput = e => {
        const i = e.target.closest('input');
        if (!i || i.value === '' || isNaN(+i.value)) return;
        const pl = i.closest('.asx-pl'), is = i.closest('.asx-is');
        if (pl) J.pl[+pl.dataset.i][i.dataset.k] = +i.value;
        if (is) { J.is[+is.dataset.is] = +i.value; is.querySelector('i').textContent = `(${hm(+i.value)})`; }
        calculer();
      };
      zIn.onclick = e => {
        if (e.target.closest('.asx-reset')) { delete etat.journee; return montrer(); }
        const nb = e.target.closest('button[data-nb]');
        if (nb) { J.nb = +nb.dataset.nb; return montrer(); }
        const o = e.target.closest('.asx-o2 button');
        if (o) { J.pl[+o.closest('.asx-pl').dataset.i].palierO2 = +o.dataset.v; o.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === o)); calculer(); }
      };
      calculer();
    };

    // --- Gonflage : ce qu'on a, ce qu'on veut, la source d'O₂ (bouteille ou réserve limitée) ---
    const gonflage = () => {
      const G = (etat.gonf2 = etat.gonf2 || { v1: 15, pi: 30, fi: 40, pf: 200, ff: 60, src: 'bouteille', v2: 50, p2: 100 });
      const champ = (id, lbl) => `<label class="field exam-champ"><span class="field-row">${lbl}</span><span class="exam-pas"><button type="button" data-m="${id}" aria-label="moins">−</button><input class="input" type="number" inputmode="decimal" data-c="${id}" value="${G[id]}"><button type="button" data-p="${id}" aria-label="plus">＋</button></span></label>`;
      zIn.innerHTML = `<h3>⛽ Gonflage</h3>
        <div class="asx-groupe"><b>Ce qu’on a</b><div class="asx-2">${champ('v1', 'Bloc (L)')}${champ('pi', 'Reste (b)')}${champ('fi', 'Reste : % O₂')}</div></div>
        <div class="asx-groupe"><b>Ce qu’on veut</b><div class="asx-2">${champ('pf', 'Pression finale (b)')}${champ('ff', 'Nitrox (% O₂)')}</div></div>
        <div class="asx-groupe"><b>Source d’O₂</b><div class="seg" data-src><button type="button" data-v="bouteille" class="${G.src === 'bouteille' ? 'on' : ''}">Bouteille d’O₂</button><button type="button" data-v="reserve" class="${G.src === 'reserve' ? 'on' : ''}">Réserve limitée</button></div>
          ${G.src === 'reserve' ? `<div class="asx-2">${champ('v2', 'Réserve (L)')}${champ('p2', 'Réserve (b)')}</div>` : '<p class="small muted">Assez de pression pour monter le bloc où il faut.</p>'}</div>
        <button type="button" class="btn btn-outline btn-sm asx-reset">↺ Exemple du cours</button>`;
      const calculer = () => {
        const q = Q.find(x => x.id === 'gonf'), r = q.calc(G);
        const fi = G.fi / 100, ff = G.ff / 100, dN = G.pf * (1 - ff) - G.pi * (1 - fi), dO = G.pf * ff - G.pi * fi, o2 = dO - dN / 4, air = dN / 0.8;
        const g = { dN, dO, o2, air };
        let res = null, plus = [];
        if (G.src === 'reserve') {
          const peq = (G.pi * G.v1 + G.p2 * G.v2) / (G.v1 + G.v2), apres = G.p2 - Math.max(0, o2) * G.v1 / G.v2;
          res = { peq, apres };
          plus.push({ h: 'Avec la réserve (Mariotte)' }, lig(`P équilibre = (${G.pi} × ${G.v1} + ${G.p2} × ${G.v2}) / (${G.v1} + ${G.v2})`, `${n(peq, 1)} bar`, 'le plus haut où la réserve peut monter le bloc'));
          if (peq >= G.pi + o2 - 1e-9) plus.push(lig(`Réserve après = ${G.p2} − ${n(o2, 1)} × ${G.v1} / ${G.v2}`, `${n(apres, 1)} bar`, `on s’arrête à ${n(G.pi + o2, 1)} b : elle suffit`));
          else {
            const m = Q.find(x => x.id === 'mariotte').calc({ v1: G.v1, p1: G.pi, f1: G.fi, v2: G.v2, p2: G.p2, pf: G.pf });
            plus.push({ txt: `Il faudrait monter à ${n(G.pi + o2, 1)} b : la réserve ne suffit pas pour du ${nxNom(G.ff)}. Le meilleur possible :` }, ...m.l);
            r.rep = `${r.rep} · ⚠ réserve insuffisante → ${m.rep}`;
          }
        }
        const ligneHTML = x => (x.h ? `<h4>${x.h}</h4>` : x.txt != null ? `<div class="as-t">${x.txt}${x.c ? `<small>${x.c}</small>` : ''}</div>` : `<div class="as-l"><span>${x.k}</span> <i>=</i> <b>${x.r}</b>${x.c ? `<small>${x.c}</small>` : ''}</div>`);
        zOut.innerHTML = `<div class="exo-rep">${r.rep}</div>` + svgGonflage(G, g, res) + `<div class="as-res asx-2col">${[...r.l, ...plus].map(ligneHTML).join('')}</div>` + (r.x ? `<div class="exo-note">${r.x}</div>` : '');
        garder();
      };
      zIn.oninput = e => { const i = e.target.closest('input[data-c]'); if (!i || i.value === '' || isNaN(+i.value)) return; G[i.dataset.c] = +i.value; calculer(); };
      zIn.onclick = e => {
        if (e.target.closest('.asx-reset')) { delete etat.gonf2; return montrer(); }
        const sb = e.target.closest('[data-src] button');
        if (sb) { G.src = sb.dataset.v; return montrer(); }
        const b2 = e.target.closest('button[data-m],button[data-p]');
        if (!b2) return;
        const id = b2.dataset.m || b2.dataset.p, i = zIn.querySelector(`input[data-c="${id}"]`), pas = { pf: 10, pi: 5, p2: 5, v2: 5 }[id] || 1;
        i.value = Math.max(0, Math.round(((+i.value || 0) + (b2.dataset.m ? -pas : pas)) * 100) / 100);
        i.dispatchEvent(new Event('input', { bubbles: true }));
      };
      calculer();
    };

    zOut.addEventListener('click', e => {
      const v = e.target.closest('.asx-vue button');
      if (v) { etat.vue = v.dataset.vue; garder(); return montrer(); }
      const td = e.target.closest('td.as-c');
      if (!td) return;
      zOut.querySelectorAll('td.sel').forEach(x => x.classList.remove('sel'));
      td.classList.add('sel');
      const d = zOut.querySelector('.asx-detail');
      d.textContent = td.dataset.d; d.hidden = false;
    });
    nav.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (!b) return; etat.a = b.dataset.a; garder(); montrer(); });
    let rt = null;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => zOut._frise && zOut.isConnected && zOut._frise(), 150); });
    function montrer() {
      nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.a === etat.a));
      box.querySelector('.asx').dataset.a = etat.a;
      if (etat.a === 'journee') journee(); else if (etat.a === 'gonf') gonflage(); else champsSimples(Q.find(x => x.id === etat.a));
    }
    montrer();
  }

  window.NitroxAssistants = { Q, ORDRE, n, hm, rendre, rendreApp, calcJournee };
})();
