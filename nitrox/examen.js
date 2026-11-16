/* ============================================================
   MN90 Mobile — Nitrox Confirmé : calculs types, pour réviser
   Les questions types du cours (S. Plouzennec) : on tape les
   valeurs de l'énoncé, tout se calcule, avec les étapes écrites
   comme sur la copie (hypothèses du cours : air 80 / 20, tables
   MN90, PpO₂ 1,6 b, table NOAA, OTU).
   ============================================================ */
(function () {
  'use strict';
  const L = () => window.MN90Lib;

  /* ---------- outils ---------- */
  const f = (x, d = 2) => (x == null || !isFinite(x) ? '—' : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('fr-FR', { maximumFractionDigits: d }));
  const pa = z => 1 + z / 10;
  const hm = min => `${Math.floor(min / 60)} h${min % 60 ? ' ' + String(min % 60).padStart(2, '0') : ''}`;
  const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl exo-tbl"><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${(r.c || r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('') + `</tbody></table></div>`;
  const steps = arr => `<div class="steps">${arr.filter(Boolean).map(([t, s]) => `<div><em>${t}</em>${s}</div>`).join('')}</div>`;
  const note = (s, cls = '') => `<div class="exo-note ${cls}">${s}</div>`;
  const rep = s => `<div class="exo-rep">${s}</div>`;
  const nx = fo2 => (fo2 >= 0.995 ? 'O₂ pur' : Math.abs(fo2 - 0.2) < 0.011 || Math.abs(fo2 - 0.21) < 0.001 ? 'Air' : `Nx${Math.round(fo2 * 100)}`);

  /* ---------- tables du cours ---------- */
  // PpO₂ → %SNC par minute (NOAA) et durée max ; OTU par minute
  const NOAA = { 0.6: [0.14, 720], 0.7: [0.18, 570], 0.8: [0.22, 450], 0.9: [0.28, 360], 1.0: [0.33, 300], 1.1: [0.42, 240],
    1.2: [0.47, 210], 1.3: [0.56, 180], 1.4: [0.65, 150], 1.5: [0.83, 120], 1.6: [2.22, 45], 1.7: [10, 10], 1.8: [50, 2] };
  const OTU = { 0.6: 0.26, 0.7: 0.47, 0.8: 0.65, 0.9: 0.83, 1.0: 1.0, 1.1: 1.16, 1.2: 1.32, 1.3: 1.48, 1.4: 1.63, 1.5: 1.78, 1.6: 1.93, 1.7: 2.07, 1.8: 2.22 };
  // Coefficient de l'intervalle surface (%SNC divisé par 2 toutes les 90 min) : valeurs du cours, sinon calculées
  const COEF_COURS = { 30: 0.79, 60: 0.63, 90: 0.5, 120: 0.4, 150: 0.315, 180: 0.25, 210: 0.2, 240: 0.16, 300: 0.1, 360: 0.06 };
  function coefIntervalle(min) {
    const col = Math.floor(min / 30) * 30;            // colonne immédiatement inférieure : on compte moins de récupération
    if (col <= 0) return { col: 0, coef: 1 };
    return { col, coef: COEF_COURS[col] ?? Math.round(Math.pow(0.5, col / 90) * 1000) / 1000, calcule: !(col in COEF_COURS) };
  }
  // Colonne NOAA : immédiatement supérieure (1,44 → 1,5 ; 1,575 → 1,6 ; 0,585 → 0,6) ; sous 0,6 (0,5…) : rien
  function colonne(pp) {
    if (pp < 0.55 - 1e-9) return null;
    return Math.min(1.8, Math.max(0.6, Math.ceil(pp * 10 - 1e-6) / 10));
  }
  const lire = pp => { const c = colonne(pp); return c == null ? { c: null, snc: 0, otu: 0 } : { c, snc: NOAA[c.toFixed(1) * 1][0], otu: OTU[c.toFixed(1) * 1] }; };

  /* ---------- une plongée : table MN90 + tableau par phase ---------- */
  function plongee({ prof, duree, fo2, o2 }, opts = {}) {
    const air = fo2 <= 0.21 + 1e-9;
    const p = pa(prof), pp = p * fo2, pn = p - pp;
    const pea = air ? prof : (pn / 0.8 - 1) * 10;
    const res = { prof, duree, fo2, air, pa: p, pp, pn, pea, alertes: [] };
    if (pp > 1.6 + 1e-9) res.alertes.push(`PpO₂ ${f(pp)} b au fond : <b>au-delà de 1,6 b, interdit</b>. Il faut un Nitrox moins riche ou moins profond.`);
    const fictive = opts.fictive ?? duree;
    const tab = L().lookup(Math.max(pea, 0.1), fictive);
    res.tab = tab;
    if (tab.err) { res.err = tab.err; return res; }
    const paliers = Object.entries(tab.stops || {}).map(([z, t]) => ({ z: +z, t: +t })).filter(x => x.t > 0).sort((a, b) => b.z - a.z);
    const rows = [];
    const ligne = (phase, profTxt, dTxt, d, gaz, ppx, ref) => {
      const r = lire(ppx);
      rows.push({ phase, profTxt, dTxt, d, gaz, pa: ppx / (gaz === 'O₂ pur' ? 1 : fo2), pp: ppx, ref, ...r, sncP: d * r.snc, otuP: d * r.otu });
    };
    ligne('1. Fond', `${f(prof, 1)} m`, f(duree, 1), duree, nx(fo2), pp);
    const premier = paliers[0]?.z ?? 0;
    const dRem = (prof - premier) / 15;
    ligne('2. Remontée', `${f(prof, 1)} → ${premier} m`, `${f(prof - premier, 1)} / 15 = ${f(dRem)}`, dRem, nx(fo2), pp, 'celle du fond');
    // Paliers : à l'O₂ pur (6 m maxi) = 2/3 du temps à l'air, 5 min minimum
    let o2Tot = 0;
    const pl = paliers.map(x => {
      const enO2 = o2 && x.z <= 6;
      const t = enO2 ? Math.ceil(x.t * 2 / 3) : x.t;
      if (enO2) o2Tot += t;
      return { ...x, enO2, tAir: x.t, t };
    });
    if (o2 && o2Tot > 0 && o2Tot < 5) { const der = pl[pl.length - 1]; der.t += 5 - o2Tot; der.min5 = true; }
    for (const x of pl) {
      const fz = x.enO2 ? 1 : fo2;
      ligne('3. Palier', `${x.z} m`, x.enO2 ? `${x.tAir} × 2/3 → ${x.t}${x.min5 ? ' (5 min mini)' : ''}` : String(x.t), x.t, x.enO2 ? 'O₂ pur' : nx(fo2), pa(x.z) * fz);
    }
    if (pl.length) {
      const der = pl[pl.length - 1];
      ligne('4. Remontée surface', `${der.z} → 0 m`, `${der.z} / 6 = ${f(der.z / 6)}`, der.z / 6, der.enO2 ? 'O₂ pur' : nx(fo2), pa(der.z) * (der.enO2 ? 1 : fo2), 'celle du palier');
    }
    res.paliers = pl;
    res.rows = rows;
    res.snc = rows.reduce((s, r) => s + r.sncP, 0);
    res.otu = rows.reduce((s, r) => s + r.otuP, 0);
    return res;
  }

  function tableauPhases(res) {
    const rows = res.rows.map(r => [r.phase, r.profTxt, r.dTxt, r.gaz, f(r.pa, 2),
      r.ref ? `${r.ref} → ${r.c == null ? '—' : f(r.snc, 2)}` : `${f(r.pp, 3)} → <b>${r.c == null ? '< 0,6' : f(r.c, 1)}</b> → ${r.c == null ? '0' : f(r.snc, 2)}`,
      r.phase === '1. Fond' ? f(res.pn, 2) : '', `${f(r.sncP, 2)} %`, f(r.otuP, 1)]);
    rows.push({ c: ['Total', '', f(res.rows.reduce((s, r) => s + r.d, 0), 1) + ' min', '', '', '', '', `<b>${f(res.snc, 1)} %</b>`, `<b>${f(res.otu, 0)}</b>`], cls: 'tot' });
    return tbl(['Phase', 'Profondeur', 'Durée (min)', 'Gaz', 'Pa', 'PpO₂ → NOAA → %SNC/min', 'PpN₂', '%SNC', 'OTU'], rows);
  }

  function tableTxt(res, label = 'Durée') {
    const t = res.tab;
    const pal = res.paliers.length ? res.paliers.map(x => `<b>${x.tAir} min à ${x.z} m</b>`).join(' + ') : '<b>pas de palier</b>';
    return [res.air ? 'Table MN90' : 'PEA',
      (res.air ? `air : ${f(res.prof, 1)} m` : `PpN₂ ${f(res.pn, 3)} / 0,8 = ${f(res.pn / 0.8, 3)} b → ${f(res.pea, 1)} m`) +
      ` → ligne <b>${t.d} m</b>, ${label.toLowerCase()} ${f(res.duree, 0)} min → ligne <b>${hm(t.t)}</b> : ${pal}, DTR ${t.dtr} min, GPS <b>${t.gps}</b>`];
  }

  function verdictSnc(x) {
    if (x > 100) return `<b>${f(x, 1)} %</b> → au-delà de 100 % : <b>crise hyperoxique possible, pas possible !</b>`;
    if (x > 90) return `<b>${f(x, 1)} %</b> → au-delà de 90 % : intervalle surface air <b>≥ 2 h</b> avant la suivante`;
    if (x > 50) return `<b>${f(x, 1)} %</b> → au-delà de 50 % : intervalle surface air <b>≥ 45 min</b>`;
    return `<b>${f(x, 1)} %</b> → sous 50 %, OK (pas d'intervalle minimum)`;
  }

  /* ---------- les questions ---------- */
  const P = (id, label, v, opts = {}) => ({ id, label, v, ...opts });
  const PROF = (id = 'prof', v = 30, label = 'Profondeur (m)') => P(id, label, v, { step: 1, min: 0, max: 70 });
  const MIX = (id = 'o2', v = 40, label = 'Nitrox (% O₂)') => P(id, label, v, { step: 1, min: 20, max: 100 });
  const DUREE = (id = 'duree', v = 40, label = 'Durée (min)') => P(id, label, v, { step: 1, min: 1, max: 240 });
  const PALIER_O2 = (id = 'pO2', v = 1, label = 'Palier à l’O₂ pur') => P(id, label, v, { choix: [[0, 'Non'], [1, 'Oui']] });
  const PPMAX = (v = 1.6) => P('ppmax', 'PpO₂ max (b)', v, { choix: [[1.6, '1,6'], [1.5, '1,5'], [1.4, '1,4']] });

  const QUESTIONS = [
    { id: 'pp', t: '🫧 Pressions partielles', ex: 'PpO₂ et PpN₂ de l’air à 20 m', champs: [PROF('prof', 20), MIX('o2', 20, '% O₂ (air = 20)')],
      calc: v => {
        const p = pa(v.prof), o = v.o2 / 100, pp = p * o, pn = p - pp;
        return steps([['Pa', `1 + ${f(v.prof, 1)} / 10 = <b>${f(p, 2)} b</b>`], ['PpO₂', `${f(p, 2)} × ${f(o, 2)} = <b>${f(pp, 3)} b</b>`],
          ['PpN₂', `${f(p, 2)} − ${f(pp, 3)} = <b>${f(pn, 3)} b</b> (= ${f(p, 2)} × ${f(1 - o, 2)})`]]) +
          (pp > 1.6 + 1e-9 ? note(`PpO₂ > 1,6 b : <b>interdit</b>.`, 'warn') : '') +
          (pn > 3.2 + 1e-9 ? note(`PpN₂ > 3,2 b : seuil de la <b>narcose</b>${pn > 5.6 + 1e-9 ? ', et au-delà de la PpN₂ max de 5,6 b' : ''}.`, 'warn') : '');
      } },
    { id: 'mod', t: '📏 Profondeur max (MOD)', ex: 'Profondeur max d’un Nitrox 40, d’un Nitrox 80, limites de l’air', champs: [MIX('o2', 40), PPMAX()],
      calc: v => {
        const o = v.o2 / 100, pmax = v.ppmax / o, z = (pmax - 1) * 10, fn = 1 - o;
        const zc = Math.round((Math.round(pmax * 10) / 10 - 1) * 10);
        const out = steps([['Pa max', `PpO₂ max / %O₂ = ${f(v.ppmax, 1)} / ${f(o, 2)} = <b>${f(pmax, 3)} b</b>`],
          ['Profondeur', `(${f(pmax, 3)} − 1) × 10 = <b>${f(z, 1)} m</b>`],
          ['Narcose (PpN₂ 3,2 b)', `3,2 / ${f(fn, 2)} = ${f(3.2 / fn, 2)} b → <b>${f((3.2 / fn - 1) * 10, 1)} m</b>`],
          ['PpN₂ max (5,6 b)', `5,6 / ${f(fn, 2)} = ${f(5.6 / fn, 2)} b → <b>${f((5.6 / fn - 1) * 10, 1)} m</b>`]]);
        const usage = o >= 0.995 ? 'O₂ pur : <b>paliers à 6 m maxi</b> (et gonflage).' : z < 25 ? 'utilisation habituelle : <b>gaz de déco</b> (paliers, remontée).' : 'utilisation habituelle : <b>gaz fond</b>.';
        return out + rep(`MOD ${nx(o)} à ${f(v.ppmax, 1)} b : <b>${f(z, 1)} m</b> (sécurité : ${Math.floor(z + 1e-9)} m${zc !== Math.floor(z + 1e-9) ? ` ; le cours arrondit la Pa à ${f(Math.round(pmax * 10) / 10, 1)} b → ${zc} m` : ''}) · ${usage}`) +
          (o <= 0.21 ? note('À l’air, c’est l’<b>azote</b> qui fixe la limite (5,6 b atteint avant 1,6 b d’O₂).') : '');
      } },
    { id: 'best', t: '🎯 Best mix', ex: 'Best mix pour 1 h à 32 m, pour 45 m, déco à partir de 22 m', champs: [PROF('prof', 32), DUREE('duree', 60, 'Durée prévue (min, 0 = inconnue)')],
      calc: v => {
        const p = pa(v.prof);
        const choix = v.duree > 45 ? 1.5 : 1.6;
        const ligne = pp => { const exact = pp / p * 100, bas = Math.floor(exact + 1e-9), pr = Math.round(exact);
          return [`<b>${f(pp, 1)} b</b>`, `${f(pp, 1)} / ${f(p, 2)} = ${f(exact / 100, 3)}`, `<b>${bas >= 100 ? 'O₂ pur' : 'Nx' + bas}</b>`, `${f(p * bas / 100, 3)} b`, pr !== bas ? `Nx${pr} (PpO₂ ${f(p * pr / 100, 2)} b)` : '=']; };
        return steps([['Pa', `1 + ${f(v.prof, 1)} / 10 = <b>${f(p, 2)} b</b>`], ['Formule', '%O₂ = PpO₂ max / Pa, <b>arrondi vers le bas</b>'],
          ['Durée', v.duree > 45 ? `${v.duree} min > 45 min : à 1,6 b la NOAA ne donne que 45 min → on prend <b>1,5 b</b> (120 min)` : v.duree ? `${v.duree} min ≤ 45 min : <b>1,6 b</b> possible` : 'durée inconnue : <b>1,6 b</b> (le best mix ne dépend alors que de la profondeur)']]) +
          tbl(['PpO₂ max', 'Calcul', 'Best mix', 'PpO₂ réelle', 'Arrondi au plus près'], [1.6, 1.5, 1.4].map(pp => ({ c: ligne(pp), cls: pp === choix ? 'tot' : '' }))) +
          rep(`Best mix à ${f(v.prof, 1)} m${v.duree ? ` pour ${v.duree} min` : ''} : <b>${nx(Math.floor(choix / p * 100 + 1e-9) / 100)}</b> (PpO₂ ${f(choix, 1)} b)`);
      } },
    { id: 'pea', t: '🟰 Profondeur équivalente air', ex: 'PEA d’une plongée à 30 m au Nitrox 40', champs: [PROF('prof', 30), MIX('o2', 40), DUREE('duree', 0, 'Durée (min, 0 = sans table)')],
      calc: v => {
        const o = v.o2 / 100, p = pa(v.prof), pn = p * (1 - o), paAir = pn / 0.8, z = (paAir - 1) * 10;
        const t = L().lookup(Math.max(z, 0.1), Math.max(v.duree, 1));
        const out = steps([['Nitrox', `${f(100 - v.o2, 0)} % N₂ + ${v.o2} % O₂`], ['Pa', `${f(p, 2)} b`], ['PpN₂', `${f(p, 2)} × ${f(1 - o, 2)} = <b>${f(pn, 3)} b</b>`],
          ['Pa air équivalente', `PpN₂ / 0,8 = ${f(pn, 3)} / 0,8 = <b>${f(paAir, 3)} b</b>`], ['PEA', `(${f(paAir, 3)} − 1) × 10 = <b>${f(z, 1)} m</b> → ligne MN90 immédiatement supérieure : <b>${t.d ?? '—'} m</b>`],
          v.duree > 0 && !t.err ? ['Table', `${t.d} m, ${v.duree} min → ligne ${hm(t.t)} : ${Object.entries(t.stops).filter(([, m]) => m).map(([zz, m]) => `<b>${m} min à ${zz} m</b>`).join(' + ') || '<b>pas de palier</b>'}, DTR ${t.dtr} min, GPS <b>${t.gps}</b>`] : null,
          v.duree > 0 && t.err ? ['Table', t.err] : null]);
        return out + rep(`${nx(o)} à ${f(v.prof, 1)} m ≈ air à <b>${f(z, 1)} m</b> → table <b>${t.d ?? '—'} m</b>`) +
          note('La <b>DTR</b> de la table est fausse au Nitrox : on remonte de la profondeur <b>réelle</b>. Et la conso est celle de la profondeur réelle.');
      } },
    { id: 'snc', t: '🧠 %SNC d’une plongée', ex: '%SNC de 50 min à 15 m au Nx60 ; 50 min à 30 m Nx36 palier O₂', champs: [PROF('prof', 30), DUREE('duree', 50), MIX('o2', 36), PALIER_O2()],
      calc: v => {
        const r = plongee({ prof: v.prof, duree: v.duree, fo2: v.o2 / 100, o2: !!v.pO2 });
        if (r.err) return note(r.err, 'warn');
        return r.alertes.map(a => note(a, 'warn')).join('') + steps([['Pa', `${f(r.pa, 2)} b → PpO₂ ${f(r.pp, 3)} b, PpN₂ ${f(r.pn, 3)} b`], tableTxt(r),
          r.paliers.some(x => x.enO2) ? ['Palier O₂', '2/3 du temps à l’air (arrondi au-dessus), <b>5 min minimum</b>'] : null]) +
          tableauPhases(r) + rep(`%SNC de la plongée : ${verdictSnc(r.snc)} · OTU : <b>${f(r.otu, 0)}</b>`);
      } },
    { id: 'jour', t: '🔁 Journée : 2 plongées', ex: 'P1 70 min 30 m Nx35 palier O₂ + 2 h 30 + P2 40 min 25 m Nx45',
      champs: [PROF('p1', 30, 'P1 profondeur (m)'), DUREE('d1', 70, 'P1 durée (min)'), MIX('o1', 35, 'P1 Nitrox (% O₂)'), PALIER_O2('o2p1', 1, 'P1 palier O₂ pur'),
        P('is', 'Intervalle surface (min)', 150, { step: 15, min: 15, max: 720, hint: m => hm(m) }),
        PROF('p2', 25, 'P2 profondeur (m)'), DUREE('d2', 40, 'P2 durée (min)'), MIX('o2b', 45, 'P2 Nitrox (% O₂)'), PALIER_O2('o2p2', 0, 'P2 palier O₂ pur')],
      calc: v => {
        const r1 = plongee({ prof: v.p1, duree: v.d1, fo2: v.o1 / 100, o2: !!v.o2p1 });
        if (r1.err) return note('Plongée 1 : ' + r1.err, 'warn');
        let out = '<h4>① Plongée 1</h4>' + r1.alertes.map(a => note(a, 'warn')).join('') + steps([tableTxt(r1)]) + tableauPhases(r1);
        const ci = coefIntervalle(v.is), reste = r1.snc * ci.coef;
        out += `<h4>② Intervalle ${hm(v.is)}</h4>` + tbl(['%SNC plongée 1', `Coefficient ${hm(ci.col)}`, '%SNC au départ de la plongée 2'], [[`${f(r1.snc, 1)} %`, f(ci.coef, 3) + (ci.calcule ? ' (½ par 90 min)' : ''), `<b>${f(reste, 1)} %</b>`]]) +
          (ci.col !== v.is ? note(`Intervalle de ${hm(v.is)} : on lit la colonne <b>immédiatement inférieure</b> (${hm(ci.col)}), comme si on avait moins récupéré.`) : '') +
          (r1.snc > 90 && v.is < 120 ? note('%SNC de la plongée 1 > 90 % : il faudrait au moins 2 h d’intervalle.', 'warn') : r1.snc > 50 && v.is < 45 ? note('%SNC de la plongée 1 > 50 % : il faudrait au moins 45 min d’intervalle.', 'warn') : '');
        // Majoration (Tableau I puis II), à la PEA de la 2e plongée
        const fo2b = v.o2b / 100, p2 = pa(v.p2), pn2 = p2 * (1 - fo2b), pea2 = fo2b <= 0.21 + 1e-9 ? v.p2 : (pn2 / 0.8 - 1) * 10;
        const lib = L();
        let maj = 0, majTxt = [];
        const gps = r1.tab.gps;
        if (!gps || gps === '*') return out + note('Pas de GPS après la plongée 1 (« * ») : plongée successive interdite, attendre 12 h.', 'warn');
        if (v.is >= 720) majTxt.push(['Majoration', '12 h ou plus : plongée isolée, pas de majoration']);
        else {
          let k = -1; lib.T1_COLS.forEach((c, i) => { if (c <= v.is) k = i; });
          const n2 = k < (lib.TABLE_I[gps] || []).length ? lib.TABLE_I[gps][k] : null;
          if (n2 == null || n2 <= 0.81 + 1e-9) majTxt.push(['Tableau I', `GPS ${gps}, ${hm(lib.T1_COLS[k])} : azote revenu à la normale → <b>pas de majoration</b>`]);
          else {
            const row = lib.TABLE_II.find(x => x[0] >= n2 - 1e-9) || lib.TABLE_II[lib.TABLE_II.length - 1];
            const di = lib.T2_DEPTHS.findIndex(d => d >= pea2 - 1e-9);
            if (di < 0) return out + note('Profondeur hors Tableau II (au-delà de 60 m).', 'warn');
            maj = row[1 + di];
            majTxt.push(['Tableau I', `GPS <b>${gps}</b> × intervalle ${hm(lib.T1_COLS[k])} (colonne inférieure) → azote résiduel <b>${f(n2, 2)}</b>`],
              ['Tableau II', `ligne <b>${f(row[0], 2)}</b> (supérieure) × colonne <b>${lib.T2_DEPTHS[di]} m</b> → majoration <b>${maj} min</b>`]);
          }
        }
        const r2 = plongee({ prof: v.p2, duree: v.d2, fo2: fo2b, o2: !!v.o2p2 }, { fictive: v.d2 + maj });
        out += '<h4>③ Plongée 2</h4>' + steps([[fo2b <= 0.21 + 1e-9 ? 'Air' : 'PEA', fo2b <= 0.21 + 1e-9 ? `${f(v.p2, 1)} m` : `PpN₂ ${f(pn2, 3)} / 0,8 = ${f(pn2 / 0.8, 3)} b → <b>${f(pea2, 1)} m</b>`], ...majTxt,
          ['Durée fictive', `${v.d2} + ${maj} = <b>${v.d2 + maj} min</b>` + (r2.err ? '' : ` → ligne ${r2.tab.d} m, ${hm(r2.tab.t)} : ${r2.paliers.length ? r2.paliers.map(x => `<b>${x.tAir} min à ${x.z} m</b>`).join(' + ') : '<b>pas de palier</b>'} (DTR ${r2.tab.dtr}, GPS ${r2.tab.gps})`)]]);
        if (r2.err) return out + note('Plongée 2 : ' + r2.err, 'warn');
        out += r2.alertes.map(a => note(a, 'warn')).join('') + tableauPhases(r2);
        const total = reste + r2.snc;
        out += '<h4>④ Journée</h4>' + rep(`%SNC : ${f(reste, 1)} + ${f(r2.snc, 1)} = ${verdictSnc(total)}<br>OTU : ${f(r1.otu, 0)} + ${f(r2.otu, 0)} = <b>${f(r1.otu + r2.otu, 0)}</b> (limite 850 le 1<sup>er</sup> jour : ${r1.otu + r2.otu <= 850 ? 'OK' : '<b>dépassé</b>'})`);
        if (total > 100) {
          const gros = r2.rows[0];
          out += note(`<b>Solutions</b> : allonger l’intervalle surface, réduire la profondeur ou la durée de la 2<sup>e</sup>, ou un Nitrox moins riche pour la 2<sup>e</sup> (le gros morceau : le fond de P2 à ${f(gros.pp, 2)} b → ${f(gros.snc, 2)} %/min).`, 'warn');
        }
        return out + note('Les OTU ne diminuent pas pendant l’intervalle : on additionne tout sur la journée.');
      } },
    { id: 'tmax', t: '⏱ Durée max (%SNC)', ex: 'TP2 max d’une 2e plongée au Nx32 à 40 m avec 40 % déjà consommés', champs: [PROF('prof', 40), MIX('o2', 32), P('deja', '%SNC déjà présent', 40, { step: 1, min: 0, max: 100 })],
      calc: v => {
        const o = v.o2 / 100, pp = pa(v.prof) * o, r = lire(pp);
        if (pp > 1.6 + 1e-9) return note(`PpO₂ ${f(pp, 2)} b : <b>interdit</b> (> 1,6 b).`, 'warn');
        if (r.c == null) return rep('PpO₂ sous 0,6 b : pas de limite %SNC.');
        const restant = Math.max(0, 100 - v.deja), tmax = restant / 100 * NOAA[r.c][1], rem = Math.max(0, v.prof - 6) / 15;
        return steps([['PpO₂', `${f(pa(v.prof), 2)} × ${f(o, 2)} = ${f(pp, 3)} b → colonne <b>${f(r.c, 1)}</b> : ${NOAA[r.c][1]} min max (${f(r.snc, 2)} %/min)`],
          ['Reste', `100 − ${f(v.deja, 1)} = <b>${f(restant, 1)} %</b>`], ['Durée max', `${f(restant / 100, 2)} × ${NOAA[r.c][1]} = <b>${f(tmax, 1)} min</b> (remontée jusqu’à 6 m comprise)`],
          ['Dont remontée', `(${v.prof} − 6) / 15 = ${f(rem, 1)} min → fond ≈ <b>${f(tmax - rem, 1)} min</b>`]]) +
          rep(`Durée max : <b>${f(tmax, 1)} min</b>`) + note('Aux paliers à 6 et 3 m, la PpO₂ d’un Nitrox de fond tombe souvent sous 0,6 b : elle ne compte plus.');
      } },
    { id: 'inter', t: '🔄 %SNC après l’intervalle', ex: '%SNC de 43 % après 2 h de surface', champs: [P('snc', '%SNC à la sortie', 43, { step: 1, min: 0, max: 200 }), P('is', 'Intervalle (min)', 120, { step: 15, min: 0, max: 720, hint: m => hm(m) })],
      calc: v => {
        const c = coefIntervalle(v.is);
        return tbl(['Intervalle', ...Object.keys(COEF_COURS).map(k => hm(+k))], [['Coefficient', ...Object.values(COEF_COURS).map(x => f(x, 3))]]) +
          steps([['Colonne', `${hm(v.is)} → <b>${hm(c.col)}</b> (immédiatement inférieure) → coefficient <b>${f(c.coef, 3)}</b>`], ['Calcul', `${f(v.snc, 1)} × ${f(c.coef, 3)} = <b>${f(v.snc * c.coef, 1)} %</b>`]]) +
          rep(`%SNC restant : <b>${f(v.snc * c.coef, 1)} %</b> · intervalle minimum après ${f(v.snc, 0)} % : ${v.snc > 90 ? '<b>2 h</b>' : v.snc > 50 ? '<b>45 min</b>' : 'aucun'}`);
      } },
    { id: 'gonf', t: '⛽ Gonflage', ex: 'De 30 b de Nx40 à un Nx60 à 200 b', champs: [P('pi', 'Reste dans le bloc (b)', 30, { step: 5, min: 0, max: 300 }), MIX('fi', 40, 'Reste : % O₂ (air = 20)'), P('pf', 'Pression finale (b)', 200, { step: 10, min: 10, max: 300 }), MIX('ff', 60, 'Nitrox voulu (% O₂)')],
      calc: v => {
        const fi = v.fi / 100, ff = v.ff / 100;
        const n0 = v.pi * (1 - fi), n1 = v.pf * (1 - ff), o0 = v.pi * fi, o1 = v.pf * ff;
        const dN = n1 - n0, dO = o1 - o0, air = dN / 0.8, o2air = dN / 4, o2 = dO - o2air;
        if (dN < -1e-9 || o2 < -1e-9) return note(`Impossible tel quel : le bloc contient déjà trop ${dN < 0 ? 'd’azote' : 'd’O₂'}. Il faut <b>vider le bloc</b> (ou une partie) d’abord : mets « Reste » à 0.`, 'warn');
        return tbl(['Gaz (b)', 'On a', 'On veut', 'Ajout total', 'Air', 'O₂ pur'], [
          ['N₂', `${f(1 - fi, 2)} × ${v.pi} = ${f(n0, 2)}`, `${f(1 - ff, 2)} × ${v.pf} = ${f(n1, 2)}`, `${f(dN, 2)}`, `${f(dN, 2)}`, '0'],
          ['O₂', `${f(fi, 2)} × ${v.pi} = ${f(o0, 2)}`, `${f(ff, 2)} × ${v.pf} = ${f(o1, 2)}`, `${f(dO, 2)}`, `${f(dN, 2)} / 4 = ${f(o2air, 2)}`, `${f(dO, 2)} − ${f(o2air, 2)} = <b>${f(o2, 2)}</b>`],
          { c: ['Total', `${v.pi}`, `${v.pf}`, f(v.pf - v.pi, 2), `<b>${f(air, 2)}</b>`, `<b>${f(o2, 2)}</b>`], cls: 'tot' }]) +
          rep(`<b>O₂ pur jusqu’à ${f(v.pi + o2, 1)} b</b> (${v.pi} + ${f(o2, 1)}), <b>puis air jusqu’à ${v.pf} b</b>. La bouteille d’O₂ doit être au-dessus de ${f(v.pi + o2, 1)} b.`) +
          steps([['Ordre', '<b>O₂ pur d’abord</b> (lentement : 5 b/min, 3 b/min au-delà de 100 b), <b>puis air</b> au compresseur'],
            ['Ensuite', '24 h d’homogénéisation, analyse (préparateur puis utilisateur), étiquette (% O₂, MOD, date, initiales), registre']]);
      } },
    { id: 'mariotte', t: '⚗️ Réserve d’O₂ (Mariotte)', ex: 'Meilleur Nitrox : bloc 15 L à 30 b de Nx40, réserve O₂ 50 L à 100 b, air', champs: [P('v1', 'Bloc (L)', 15, { step: 1, min: 1, max: 50 }), P('p1', 'Bloc : pression (b)', 30, { step: 5, min: 0, max: 300 }), MIX('f1', 40, 'Bloc : % O₂'), P('v2', 'Réserve O₂ (L)', 50, { step: 5, min: 1, max: 200 }), P('p2', 'Réserve O₂ (b)', 100, { step: 5, min: 1, max: 300 }), P('pf', 'Pression finale (b)', 200, { step: 10, min: 10, max: 300 })],
      calc: v => {
        const meth = (p1, f1, titre) => {
          if (v.p2 <= p1) return `<h4>${titre}</h4>` + note('La réserve est à une pression inférieure au bloc : elle ne peut rien donner.', 'warn');
          const peq = Math.min((p1 * v.v1 + v.p2 * v.v2) / (v.v1 + v.v2), v.pf), ajout = peq - p1, air = v.pf - peq;
          const o2 = p1 * f1 + ajout + air * 0.2, pct = o2 / v.pf * 100;
          return { pct, html: `<h4>${titre}</h4>` + steps([['Équilibre', `(${p1} × ${v.v1} + ${v.p2} × ${v.v2}) / (${v.v1} + ${v.v2}) = <b>${f(peq, 1)} b</b> → O₂ ajouté : ${f(ajout, 1)} b`],
            ['Air', `${v.pf} − ${f(peq, 1)} = ${f(air, 1)} b d’air (${f(air * 0.8, 1)} de N₂, ${f(air * 0.2, 1)} d’O₂)`],
            ['% final', `O₂ = ${f(p1 * f1, 1)} + ${f(ajout, 1)} + ${f(air * 0.2, 1)} = ${f(o2, 1)} b → ${f(o2, 1)} / ${v.pf} = ${f(pct, 1)} % → <b>Nx${Math.floor(pct + 1e-9)}</b>`]]) };
        };
        const a = meth(v.p1, v.f1 / 100, '1<sup>re</sup> méthode : on branche le bloc tel quel'), b = meth(1, 0.2, '2<sup>de</sup> méthode : on vide d’abord le bloc (1 b d’air)');
        if (typeof a === 'string' || typeof b === 'string') return [a, b].map(x => (typeof x === 'string' ? x : x.html)).join('');
        const mieux = b.pct > a.pct ? b : a;
        return steps([['Mariotte', 'à l’équilibre : <b>P = (P1 × V1 + P2 × V2) / (V1 + V2)</b>']]) + a.html + b.html +
          rep(`Meilleur : <b>Nx${Math.floor(mieux.pct + 1e-9)}</b> (${f(mieux.pct, 1)} %)${mieux === b ? ' en vidant le bloc d’abord' : ' en gardant le reste du bloc'}.`);
      } },
    { id: 'otu', t: '🫁 OTU', ex: 'OTU d’une plongée (le détail par phase est dans « %SNC d’une plongée » et « Journée »)', champs: [PROF('prof', 30), DUREE('duree', 70), MIX('o2', 35), PALIER_O2()],
      calc: v => {
        const r = plongee({ prof: v.prof, duree: v.duree, fo2: v.o2 / 100, o2: !!v.pO2 });
        if (r.err) return note(r.err, 'warn');
        return tbl(['PpO₂ (b)', ...Object.keys(OTU).slice(0, 11).map(k => f(+k, 1))], [['OTU / min', ...Object.values(OTU).slice(0, 11).map(x => f(x, 2))]]) +
          steps([tableTxt(r)]) + tableauPhases(r) +
          rep(`OTU : <b>${f(r.otu, 0)}</b> (limite 850 le 1<sup>er</sup> jour, puis 700, 620, 525… ; 6 jours consécutifs maxi)`);
      } },
  ];

  /* ---------- l'écran ---------- */
  const CLE = 'mn90:examen';
  let etat = {};
  try { etat = JSON.parse(localStorage.getItem(CLE) || '{}'); } catch (e) { etat = {}; }
  const garder = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* stockage plein ou interdit */ } };

  function rendre(box) {
    let q = QUESTIONS.find(x => x.id === etat.q) || QUESTIONS[0];
    box.innerHTML = `<p class="small muted" style="margin-bottom:8px">Choisis le type de question, tape les valeurs de l’énoncé : tout se calcule, avec les étapes à recopier. Hypothèses du cours : air 80 / 20, tables MN90, NOAA, colonne immédiatement supérieure.</p>
      <div class="exam-types" role="tablist">${QUESTIONS.map(x => `<button type="button" class="ptab" data-q="${x.id}">${x.t}</button>`).join('')}</div>
      <div class="exam-q"></div><div class="exam-champs"></div><div class="exam-res"></div>`;
    const types = box.querySelector('.exam-types'), qEl = box.querySelector('.exam-q'), champs = box.querySelector('.exam-champs'), resEl = box.querySelector('.exam-res');
    const valeurs = () => (etat[q.id] = etat[q.id] || Object.fromEntries(q.champs.map(c => [c.id, c.v])));
    const calculer = () => {
      const v = valeurs();
      try { resEl.innerHTML = q.calc(v); } catch (e) { resEl.innerHTML = note('Calcul impossible avec ces valeurs : ' + e.message, 'warn'); }
      garder();
    };
    const montrer = () => {
      types.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.q === q.id));
      qEl.innerHTML = `<p class="exo-q">Exemple : ${q.ex}</p>`;
      const v = valeurs();
      champs.innerHTML = `<div class="exam-grid">${q.champs.map(c => c.choix
        ? `<div class="field exam-champ">${c.label}<div class="seg" data-c="${c.id}">${c.choix.map(([val, lab]) => `<button type="button" data-v="${val}" class="${+v[c.id] === val ? 'on' : ''}">${lab}</button>`).join('')}</div></div>`
        : `<label class="field exam-champ"><span class="field-row">${c.label}${c.hint ? ` <i class="exam-hint" data-h="${c.id}">${c.hint(+v[c.id])}</i>` : ''}</span>
            <span class="exam-pas"><button type="button" data-m="${c.id}" aria-label="moins">−</button><input class="input" type="number" inputmode="decimal" data-c="${c.id}" value="${v[c.id]}" step="${c.step}" min="${c.min}" max="${c.max}"><button type="button" data-p="${c.id}" aria-label="plus">＋</button></span></label>`).join('')}</div>`;
      calculer();
    };
    types.addEventListener('click', e => {
      const b = e.target.closest('button[data-q]');
      if (!b) return;
      q = QUESTIONS.find(x => x.id === b.dataset.q);
      etat.q = q.id;
      montrer();
      b.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    champs.addEventListener('input', e => {
      const i = e.target.closest('input[data-c]');
      if (!i || i.value === '' || isNaN(+i.value)) return;
      valeurs()[i.dataset.c] = +i.value;
      const c = q.champs.find(x => x.id === i.dataset.c), h = champs.querySelector(`[data-h="${i.dataset.c}"]`);
      if (h && c.hint) h.textContent = c.hint(+i.value);
      calculer();
    });
    champs.addEventListener('click', e => {
      const s = e.target.closest('.seg[data-c] button');
      if (s) {
        const id = s.parentElement.dataset.c;
        valeurs()[id] = +s.dataset.v;
        s.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === s));
        calculer();
        return;
      }
      const b = e.target.closest('button[data-m],button[data-p]');
      if (!b) return;
      const id = b.dataset.m || b.dataset.p, c = q.champs.find(x => x.id === id), i = champs.querySelector(`input[data-c="${id}"]`);
      const nv = Math.min(c.max, Math.max(c.min, Math.round(((+i.value || 0) + (b.dataset.m ? -c.step : c.step)) * 100) / 100));
      i.value = nv;
      i.dispatchEvent(new Event('input', { bubbles: true }));
    });
    montrer();
  }

  window.NitroxExamen = { rendre, plongee, coefIntervalle, colonne, lire, NOAA, OTU, COEF_COURS, QUESTIONS };
})();
