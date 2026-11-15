/* ============================================================
   MN90 Mobile — Nitrox Confirmé : exercices commentés
   Les exercices de révision du cours Nitrox Confirmé (corrigé de
   S. Plouzennec), repris pas à pas : schéma de la plongée, tableau
   par phase (fond, remontée, palier, remontée surface), et les
   explications des passages qui coincent (« / 15 », « + 0,5 »,
   ligne immédiatement supérieure, majoration…).
   Hypothèses du cours : tables du cours, air = 80 % N₂ / 20 % O₂,
   PpO₂ de base 1,6 b.
   ============================================================ */
(function () {
  'use strict';

  const f = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('fr-FR', { maximumFractionDigits: d });

  /* ---------- Schéma d'une journée de plongée (SVG) ----------
     plongees : [{ prof, fond: 'texte', palier: { prof, texte } | null }], is : textes des intervalles */
  function schema(plongees, is = []) {
    const W = 320, H = 150, top = 24, bas = 122;
    const maxP = Math.max(...plongees.map(p => p.prof));
    const svgs = plongees.map((p, i) => {
      const y = z => top + z / maxP * (bas - top);
      const yF = y(p.prof), pal = p.palier;
      const xs = { d: 44, f: 190, r: pal ? 232 : 250, p: 284, s: 302 };
      const pts = pal
        ? [[10, top], [xs.d, yF], [xs.f, yF], [xs.r, y(pal.prof)], [xs.p, y(pal.prof)], [xs.s, top]]
        : [[10, top], [xs.d, yF], [xs.f, yF], [xs.r, top]];
      let g = `<line x1="0" y1="${top}" x2="${W}" y2="${top}" class="sch-surf"/>`;
      g += `<polyline points="${pts.map(q => q.join(',')).join(' ')}" class="sch-prof"/>`;
      g += `<text x="2" y="${top - 8}" class="sch-z">${plongees.length > 1 ? `Plongée ${i + 1}` : 'Surface'}</text>`;
      g += `<text x="${xs.d - 6}" y="${yF + 4}" class="sch-z" text-anchor="end">${p.prof} m</text>`;
      g += `<text x="${(xs.d + xs.f) / 2}" y="${yF - 7}" class="sch-lbl" text-anchor="middle">① fond · ${p.fond}</text>`;
      g += `<text x="${(xs.f + xs.r) / 2 + 8}" y="${(yF + (pal ? y(pal.prof) : top)) / 2 + 4}" class="sch-lbl">② / 15</text>`;
      if (pal) {
        g += `<text x="${W - 2}" y="${y(pal.prof) + 18}" class="sch-lbl" text-anchor="end">③ ${pal.prof} m · ${pal.texte}</text>`;
        g += `<text x="${xs.s + 3}" y="${top + 12}" class="sch-lbl">④</text>`;
      }
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schéma de la plongée ${i + 1}">${g}</svg>`;
    });
    return `<div class="sch">${svgs.map((s, i) => s + (i < svgs.length - 1 ? `<span class="sch-int">⏱ ${is[i] || 'intervalle'}</span>` : '')).join('')}</div>`;
  }

  /* ---------- Tableau par phase ---------- */
  const COLS = ['Phase', 'Profondeur', 'Durée (min)', 'Gaz', 'Pa', 'PpO₂ → NOAA → %SNC/min', 'PpN₂', '%SNC'];
  function phases(rows, total) {
    return `<div class="tbl-wrap"><table class="tbl exo-tbl"><thead><tr>${COLS.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>` +
      rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') +
      (total ? `<tr class="tot"><td colspan="7">${total[0]}</td><td>${total[1]}</td></tr>` : '') + `</tbody></table></div>`;
  }
  const tbl = (head, rows) => `<div class="tbl-wrap"><table class="tbl exo-tbl"><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${(r.c || r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('') + `</tbody></table></div>`;
  const steps = arr => `<div class="steps">${arr.map(([t, s]) => `<div><em>${t}</em>${s}</div>`).join('')}</div>`;
  const note = (s, cls = '') => `<div class="exo-note ${cls}">${s}</div>`;
  const rep = s => `<div class="exo-rep">${s}</div>`;

  /* ---------- La méthode (à relire avant les exercices) ---------- */
  const NOAA = [[0.6, 720, 0.14], [0.7, 570, 0.18], [0.8, 450, 0.22], [0.9, 360, 0.28], [1.0, 300, 0.33], [1.1, 240, 0.42],
    [1.2, 210, 0.47], [1.3, 180, 0.56], [1.4, 150, 0.65], [1.5, 120, 0.83], [1.6, 45, 2.22]];
  const COEF = [['0 h 30', 0.79], ['1 h', 0.63], ['1 h 30', 0.50], ['2 h', 0.40], ['2 h 30', 0.315], ['3 h', 0.25], ['3 h 30', 0.20], ['4 h', 0.16], ['5 h', 0.10], ['6 h', 0.06]];
  const OTU = [[0.5, 0], [0.6, 0.26], [0.7, 0.47], [0.8, 0.65], [0.9, 0.83], [1.0, 1.0], [1.1, 1.16], [1.2, 1.32], [1.3, 1.48], [1.4, 1.63], [1.5, 1.78], [1.6, 1.93]];

  const METHODE = `
    ${steps([
      ['Hypothèses', 'tables du cours · air = <b>80 % N₂ / 20 % O₂</b> · PpO₂ de base <b>1,6 b</b>.'],
      ['Pressions', '<b>Pa = 1 + prof / 10</b> · <b>PpO₂ = Pa × %O₂</b> · <b>PpN₂ = Pa − PpO₂</b> (pas besoin de repartir de la profondeur).'],
      ['MOD', 'Pa max = PpO₂ max / %O₂, puis profondeur = (Pa − 1) × 10.'],
      ['Best mix', '%O₂ max = PpO₂ max / Pa (1,6 b ; <b>1,5 b si la plongée dure plus de 45 min</b>).'],
      ['PEA', 'Pa air = <b>PpN₂ / 0,8</b> → profondeur air → ligne MN90 <b>immédiatement supérieure</b>. La DTR de la table est fausse (on remonte de la profondeur réelle).'],
    ])}
    <h4>%SNC en 4 étapes</h4>
    ${steps([
      ['① Plongée 1', 'tableau par phase : <b>fond</b> (durée MN90, descente comprise) · <b>remontée</b> (fond − 1<sup>er</sup> palier) <b>/ 15</b> (vitesse 15 m/min, PpO₂ du fond) · <b>palier</b> · <b>remontée surface</b> (+ 0,5 min : 3 m à 6 m/min). Sans palier : remontée = fond / 15, et palier = 0.'],
      ['② Intervalle', '%SNC × coefficient de l’intervalle (le %SNC est divisé par 2 toutes les 90 min à l’air).'],
      ['③ Plongée 2', 'même tableau ; palier : PEA puis <b>majoration</b> (voir plus bas).'],
      ['④ Journée', '② + ③. <b>&lt; 50 %</b> OK · <b>&gt; 50 %</b> : intervalle air ≥ 45 min · <b>&gt; 90 %</b> : ≥ 120 min · <b>&gt; 100 %</b> : crise hyperoxique possible, pas possible.'],
    ])}
    <h4>Table NOAA (lire la colonne immédiatement supérieure à sa PpO₂)</h4>
    ${tbl(['PpO₂ (b)', ...NOAA.map(r => f(r[0]))], [['%SNC / min', ...NOAA.map(r => f(r[2], 2))], ['Durée max', ...NOAA.map(r => r[1])]])}
    <p class="hint">Sous 0,6 b : rien ne compte. Au-delà de 1,6 b : interdit.</p>
    <h4>Coefficient de l’intervalle surface (air)</h4>
    ${tbl(['Intervalle', ...COEF.map(r => r[0])], [['Coefficient', ...COEF.map(r => f(r[1], 3))]])}
    <h4>OTU (poumons)</h4>
    ${tbl(['PpO₂ (b)', ...OTU.map(r => f(r[0]))], [['OTU / min', ...OTU.map(r => f(r[1], 2))]])}
    <p class="hint">Limite : 850 OTU le 1<sup>er</sup> jour, puis de moins en moins par jour (700, 620, 525…). Consigne FFESSM : pas plus de 6 jours consécutifs.</p>
    <h4>Plongée successive : la majoration (MN90)</h4>
    ${steps([
      ['1', 'Profondeur air de la 2<sup>e</sup> plongée (PEA).'],
      ['2', '<b>Tableau I</b> : ligne du GPS de la 1<sup>re</sup> plongée × colonne de l’intervalle <b>immédiatement inférieure</b> → azote résiduel (en bar).'],
      ['3', '<b>Tableau II</b> : ligne d’azote <b>immédiatement supérieure</b> × colonne de profondeur <b>immédiatement supérieure</b> → majoration (en min).'],
      ['4', 'Durée fictive = durée réelle + majoration → ligne MN90 au-dessus → palier(s) et nouveau GPS.'],
    ])}
    ${note('<b>Lire une ligne MN90</b> : les chiffres sous 15 / 12 / 9 / 6 / 3 m sont les <b>paliers</b>. Les deux dernières colonnes sont la <b>DTR</b> (durée totale de remontée) et le <b>GPS</b>. Exemple : « 1 h 10 · · 1 · I » à 15 m = <b>pas de palier</b>, DTR 1 min, GPS I.')}
    ${note('<b>Sens des arrondis</b> : toujours vers la sécurité. Intervalle : colonne du <b>dessous</b> (comme si on avait moins récupéré) ; azote, profondeur, durée, PpO₂ : ligne du <b>dessus</b>.')}
    <h4>Gonflage par pression partielle</h4>
    ${tbl(['Gaz', 'On a', 'On veut', 'Ajout total', 'Air', 'O₂ pur'], [
      ['N₂', 'Pi × %N₂', 'Pf × %N₂', 'ΔN₂', 'ΔN₂ (l’air apporte tout l’azote)', '0'],
      ['O₂', 'Pi × %O₂', 'Pf × %O₂', 'ΔO₂', 'ΔN₂ / 4', 'ΔO₂ − ΔN₂ / 4'],
      { c: ['Total', 'Pi', 'Pf', 'Pf − Pi', 'ΔN₂ / 0,8', 'O₂ pur'], cls: 'tot' },
    ])}
    ${steps([['Ordre', '<b>O₂ pur d’abord</b> (5 b/min, 3 b/min au-delà de 100 b), <b>puis air</b> au compresseur jusqu’à Pf.'],
      ['Ensuite', '24 h d’homogénéisation, analyse (préparateur puis utilisateur), étiquette (% O₂, MOD, date, initiales), registre du club.']])}`;

  /* ---------- Les exercices des diapos du cours (repris de mes notes) ---------- */
  const COURS = [
    { n: 'Cours #1', t: 'PpO₂ et PpN₂ de l’air à 20 m', tags: ['Pressions'],
      q: 'Calculer la PpO₂ et la PpN₂ de l’air (80 / 20) à 20 m.',
      r: steps([['Pa', '20 m → 1 + 2 = <b>3 b</b>'], ['PpN₂', '3 × 0,8 = <b>2,4 b</b>'], ['PpO₂', '3 × 0,2 = <b>0,6 b</b>'],
        ['Vérification', '2,4 + 0,6 = 3 b = Pa (Dalton : la somme des pressions partielles fait la pression totale)']]) },
    { n: 'Cours #2', t: 'Profondeurs limites à l’air (narcose, N₂ max, O₂ max)', tags: ['Pressions', 'MOD'],
      q: 'À l’air, à quelle profondeur atteint-on la PpN₂ de narcose (3,2 b), la PpN₂ max (5,6 b) et la PpO₂ max (1,6 b) ?',
      r: tbl(['Limite', 'Calcul', 'Pa', 'Profondeur'], [
        ['Narcose N₂ (3,2 b)', '3,2 / 0,8', '4 b', '<b>30 m</b>'],
        ['PpN₂ max (5,6 b)', '5,6 / 0,79 (diapo) · 5,6 / 0,8 (hyp. 80/20)', '7,1 b · 7 b', '<b>61 m</b> · 60 m'],
        ['PpO₂ max (1,6 b)', '1,6 / 0,21 (diapo) · 1,6 / 0,2 (hyp. 80/20)', '7,62 b · 8 b', '<b>66 m</b> · 70 m'],
      ]) + rep('C’est l’<b>azote</b> qui fixe la profondeur limite de la plongée à l’AIR (61 m avant 66 m).') +
        note('La diapo du cours utilise 79 / 21 pour ce calcul. Avec l’hypothèse des exercices (80 / 20), on trouve 60 m et 70 m : précise l’hypothèse sur ta copie.') },
    { n: 'Cours #3', t: 'Profondeur max d’un Nitrox 35 et d’un Nitrox 60', tags: ['MOD'],
      q: 'Calculer la profondeur max d’un NITROX 35, puis d’un NITROX 60 (PpO₂ 1,6 b).',
      r: steps([['Nitrox 35', '1,6 / 0,35 = 4,57 b → (4,57 − 1) × 10 = <b>35,7 m</b>'], ['Nitrox 60', '1,6 / 0,6 = 2,67 b → <b>16,7 m</b>']]) +
        note('Le cours arrondit à 4,6 b → <b>36 m</b> et 2,7 b → <b>17 m</b>. Côté sécurité, on garderait plutôt 35 m et 16 m. Écris la valeur exacte (35,7 m · 16,7 m) puis ton arrondi : on ne te reprochera jamais d’être prudent.') },
    { n: 'Cours #4', t: 'Best mix pour 45 m, et pour une déco à partir de 22 m', tags: ['Best mix'],
      q: 'Best mix pour une plongée à 45 m (durée inconnue) ? Idem pour une déco optimale à partir de 22 m ?',
      r: steps([['Formule', 'PpO₂ = Pa × %O₂ donc <b>%O₂ = PpO₂ / Pa</b>'], ['45 m', 'Pa = 5,5 b → 1,6 / 5,5 = 0,29 → <b>Nitrox 29</b>'],
        ['Déco à partir de 22 m', 'Pa = 3,2 b → 1,6 / 3,2 = 0,50 → <b>Nitrox 50</b>'], ['Déco optimale à 9 m', 'Pa = 1,9 b → 1,6 / 1,9 = 0,84 → <b>Nitrox 84</b>']]) +
        note('Best mix : on arrondit le % d’O₂ <b>vers le bas</b> (0,29 → Nitrox 29, jamais 30), sinon on dépasse 1,6 b.') },
    { n: 'Cours #5', t: 'Profondeur équivalente air : 30 m au Nitrox 40', tags: ['PEA'],
      q: 'Calculer la profondeur équivalente AIR d’une plongée à 30 m au NITROX 40. Des deux plongées 10 min à 30 m à l’AIR / 40 min à 20 m au Nitrox 40, laquelle est la plus saturante ?',
      r: steps([['Nitrox 40', '60 % N₂ + 40 % O₂'], ['Pa', '30 m → 4 b'], ['PpN₂', '4 × 0,6 = <b>2,4 b</b>'],
        ['Pa air équivalente', 'PpN₂ / %N₂ air = 2,4 / 0,8 = <b>3 b</b> → <b>20 m</b>']]) +
        rep('Le Nitrox 40 à 30 m sature comme l’air à <b>20 m</b>. Mais attention à la <b>conso</b> et à la <b>DTR</b> : on est bien à 30 m.') +
        note('10 min à 30 m à l’air ou 40 min à 20 m au Nitrox 40 : on compare dans la MN90 (20 m air-équivalent au Nitrox, 30 m à l’air). Le Nitrox <b>ne fait pas</b> une plongée sans risque : il faut surtout faire moins de temps au fond. Palier à l’O₂ pur : à 6 m maximum, stabilité impérative.') },
    { n: 'Cours #6', t: '%SNC : 30 min à 20 m au Nitrox 50, puis 40 min à 30 m au Nitrox 40', tags: ['%SNC'],
      q: 'Calculer le %SNC sur une portion de 30 min à 20 m au NITROX 50, puis sur 40 min à 30 m au NITROX 40.',
      r: phases([['Fond', '20 m', '30', 'Nx50', '3,0', '1,5 → <b>1,5</b> → 0,83', '1,5', '<b>24,9 %</b>'],
        ['Fond', '30 m', '40', 'Nx40', '4,0', '1,6 → <b>1,6</b> → 2,22', '2,4', '<b>88,8 %</b>']]) +
        note('<b>Paul Bert</b> (cerveau, convulsions) : immédiat au-delà de 1,6 b → mesuré par le <b>%SNC</b>. <b>Lorrain-Smith</b> (poumons, brûlure) : exposition longue dès 0,5 b → mesuré par les <b>OTU</b>. À 1,6 b, la durée max n’est que de 45 min : c’est pour ça qu’un best mix « 1,6 b » remet en cause la durée, et qu’on descend à 1,5 b pour une longue plongée.') },
    { n: 'Cours #7', t: 'Journée type : 60 min à 25 m Nx40 (palier O₂) + 2 h + 30 min à 20 m Nx40', tags: ['%SNC', 'Majoration', 'Palier O₂'],
      q: '1re plongée de 60 min à 25 m au NITROX 40, palier O₂ pur. 2de plongée de 30 min à 20 m au NITROX 40 après 2 h d’intervalle AIR surface. Calculer le %SNC de la journée.',
      r: schema([{ prof: 25, fond: '60 min', palier: { prof: 3, texte: 'O₂ 5 min' } }, { prof: 20, fond: '30 min', palier: null }], ['2 h']) +
        '<h4>① Plongée 1</h4>' +
        phases([
          ['1. Fond', '25 m', '60', 'Nx40', '3,5', '1,4 → <b>1,4</b> → 0,65', '2,1', '39 %'],
          ['2. Remontée', '25 → 3 m', '22 / 15 = 1,47', 'Nx40', '3,5', 'celle du fond → 0,65', '', '0,95 %'],
          ['3. Palier', '3 m', '5', 'O₂ pur', '1,3', '1,3 → <b>1,3</b> → 0,56', '', '2,8 %'],
          ['4. Remontée surface', '3 → 0 m', '3 / 6 = 0,5', 'O₂ pur', '1,3', 'celle du palier → 0,56', '', '0,28 %'],
        ], ['Total plongée 1', '<b>≈ 43 %</b>']) +
        steps([['Palier', 'PEA : 2,1 / 0,8 = 2,6 b → 16 m → ligne <b>18 m</b> de la MN90 → 60 min : <b>5 min à 3 m</b>, GPS <b>J</b>'],
          ['À l’O₂', '2/3 de 5 min = 3,3 min, mais <b>5 min minimum</b> à l’O₂ → 5 min (« non réductible »)']]) +
        '<h4>② Intervalle 2 h</h4>' + tbl(['%SNC plongée 1', 'Coefficient 2 h', '%SNC au départ de la plongée 2'], [['43 %', '0,40', '<b>17 %</b>']]) +
        '<h4>③ Plongée 2</h4>' +
        phases([
          ['1. Fond', '20 m', '30', 'Nx40', '3,0', '1,2 → <b>1,2</b> → 0,47', '1,8', '14 %'],
          ['2. Remontée', '20 → 0 m', '20 / 15 = 1,33', 'Nx40', '3,0', 'celle du fond → 0,47', '', '0,6 %'],
          ['3. Palier', '—', '0', '', '', '', '', '0'],
          ['4. Remontée surface', '—', '0', '', '', '', '', '0'],
        ], ['Total plongée 2', '<b>14,7 %</b>']) +
        steps([['PEA', 'PpN₂ = 3 − 1,2 = 1,8 b → 1,8 / 0,8 = 2,25 b → 12,5 m → <b>15 m</b>'],
          ['Majoration', 'GPS J + 2 h → Tableau I : <b>1,02</b> → Tableau II ligne <b>1,03</b>, colonne 15 m → <b>37 min</b>'],
          ['Durée fictive', '30 + 37 = 67 min → ligne <b>1 h 10</b> à 15 m : colonne 3 m vide → <b>pas de palier</b> (le « 1 » est la DTR, le « I » le GPS)']]) +
        '<h4>④ Journée</h4>' + rep('17,2 + 14,7 = <b>≈ 32 %</b> → sous 50 %, OK.') },
  ];

  /* ---------- Les exercices du corrigé ---------- */
  const EXOS = [
    { n: 'Q#1-1', t: 'MOD d’un Nitrox 40 et son utilisation', tags: ['MOD'],
      q: 'Calculer la profondeur max pour un NITROX 40 et donner son utilisation habituelle.',
      r: steps([['%O₂', '0,4'], ['Pa max', '1,6 / 0,4 = <b>4,0 b</b>'], ['Profondeur max', '(4 − 1) × 10 = <b>30 m</b>']]) +
        rep('<b>30 m</b> · utilisation : mélange <b>fond ou intermédiaire</b>.') },
    { n: 'Q#1-2', t: 'Idem pour un Nitrox 80', tags: ['MOD'],
      q: 'Idem pour un NITROX 80.',
      r: steps([['%O₂', '0,8'], ['Pa max', '1,6 / 0,8 = <b>2,0 b</b>'], ['Profondeur max', '<b>10 m</b>']]) +
        rep('<b>10 m</b> · utilisation : mélange <b>de déco</b>.') },
    { n: 'Q#2', t: 'Profondeur équivalente air', tags: ['PEA'],
      q: 'Calculer la profondeur équivalente AIR d’une plongée à 30 m au NITROX 40.',
      r: steps([['Pa', '30 m → <b>4 b</b> ; vérification PpO₂ = 4 × 0,4 = 1,6 b'], ['PpN₂', '4 × 0,6 = <b>2,4 b</b> (ou 4 − 1,6)'],
        ['Pa air', '2,4 / 0,8 = <b>3 b</b> → <b>20 m</b>']]) +
        rep('<b>20 m</b> dans la MN90.') + note('⚠️ <b>La DTR de la table est fausse</b> : on remonte bien de 30 m et non de 20 m (sauf téléportation…).', 'warn') },
    { n: 'Q#3', t: 'Best mix pour 1 h à 32 m, puis pour une plongée plus courte', tags: ['Best mix', '%SNC'],
      q: 'Q#3-1 : calculer le « best mix » pour une plongée d’une heure à 32 m. Q#3-2 : idem si on réduit la durée de la plongée.',
      r: steps([['Pa', '32 m → <b>4,2 b</b>'],
        ['Pourquoi pas 1,6 b ?', 'à 1,6 b la table NOAA autorise <b>45 min</b> seulement (2,22 %/min). Pour 1 h, on se limite à <b>1,5 b</b> (120 min, 0,83 %/min).'],
        ['Q#3-1', '%O₂ max = 1,5 / 4,2 = 0,36 → <b>Nitrox 36</b> (PpO₂ réelle 4,2 × 0,36 = 1,51 b)'],
        ['Q#3-2', 'si durée ≤ 45 min : 1,6 / 4,2 = 0,38 → <b>Nitrox 38</b>']]) +
        note('En formation Nitrox simple, la réponse aurait été « idem » : le best mix ne dépend que de la profondeur. En Nitrox Confirmé, la <b>durée</b> compte aussi, à cause du %SNC.') },
    { n: 'Q#4', t: 'Best mix pour 2 plongées successives à 40 m, 2 h d’intervalle', tags: ['Best mix', '%SNC', 'Majoration'],
      q: 'Q#4-1 : « best mix » pour 2 plongées successives à 40 m, avec un intervalle surface de 2 h ? Q#4-2 : qualification minimale du plongeur ?',
      r: schema([{ prof: 40, fond: '45 min max', palier: { prof: 3, texte: 'paliers' } }, { prof: 40, fond: '?', palier: { prof: 3, texte: 'paliers' } }], ['2 h']) +
        '<h4>Plongée 1</h4>' + steps([['Best mix', 'Pa = 5 b → 1,6 / 5 = 0,32 → <b>Nitrox 32</b>'],
          ['Durée max', 'à 1,6 b : <b>45 min</b>, remontée jusqu’à 6 m comprise. Aux paliers de 6 et 3 m, la PpO₂ tombe sous 0,6 b : elle ne compte plus dans le %SNC.'],
          ['PEA', 'PpN₂ = 5 × 0,68 = 3,4 b → 3,4 / 0,8 = 4,25 b → 33 m → <b>35 m</b> dans la MN90 → 45 min : <b>GPS M</b>'],
          ['Durée au fond', '45 − (40 − 6) / 15 = <b>43 min</b>']]) +
        '<h4>Plongée 2 (Nitrox 32 à 40 m, PEA 35 m)</h4>' + steps([
          ['Majoration', 'GPS M, 2 h → azote résiduel <b>1,09</b> → ligne <b>1,11</b> du Tableau II, colonne 35 m → <b>20 min</b>'],
          ['%SNC', 'après 2 h : 100 × 0,40 = <b>40 %</b> déjà « consommés » → il reste 60 %'],
          ['Durée max', 'TP2 max = 60 % × 45 min = <b>27 min</b> (remontée jusqu’au palier de 6 m comprise)'],
          ['Durée MN90', 'majoration + TP2 max − remontée = 20 + 27 − (40 − 6) / 15 = <b>45 min</b>']]) +
        note('<b>Si 27 min, c’est trop court</b> : best mix sur 1,5 b → 1,5 / 5 = 0,30 → <b>Nitrox 30</b>. PEA = 0,7 × 5 / 0,8 = 4,4 b → 34 m (35 m dans la MN90). TP2 max = 60 % × 120 = <b>72 min</b> (remontée jusqu’à 6 m comprise), auxquelles on rajoutera les 20 min de majoration.') +
        rep('Q#4-2 : PE40 + Plongeur Nitrox selon le Code du sport, mais <b>Plongeur Nitrox Confirmé</b> pour faire ces calculs.') },
    { n: 'Q#5', t: 'Nitrox 40 pour 25 min à 35 m ?', tags: ['MOD'],
      q: 'Utilisation d’un NITROX 40 pour une plongée de 25 min à 35 m. Conseils ?',
      r: steps([['Pa', '35 m → 4,5 b'], ['PpO₂', '4,5 × 0,4 = <b>1,8 b</b> → NO WAY !!']]) +
        rep('Prendre un Nitrox plus faible ou réduire la profondeur max… et réviser son cours Nitrox !') },
    { n: 'Q#6', t: 'Ce qui détermine la majoration d’une 2ᵉ plongée au Nitrox', tags: ['Majoration'],
      q: 'Quels sont les paramètres déterminant la majoration d’une 2ᵉ plongée au NITROX ?',
      r: steps([['1', 'le <b>GPS</b> de la 1<sup>re</sup> plongée'], ['2', 'l’<b>intervalle surface AIR</b> (avec correction si on respire de l’O₂ pendant l’intervalle)'],
        ['3', 'la <b>profondeur prévue</b> pour la 2<sup>e</sup> plongée au vu de la MN90']]) +
        rep('La profondeur à prendre pour la majoration est la <b>profondeur équivalente air</b> de la 2<sup>e</sup> plongée, pas la profondeur réelle.') },
    { n: 'Q#7', t: '%SNC de 50 min à 15 m au Nitrox 60', tags: ['%SNC'],
      q: 'Calcul du %SNC sur une portion de plongée de 50 min à 15 m au NITROX 60. Intervalle surface minimum ?',
      r: phases([['Fond', '15 m', '50', 'Nx60', '2,5', '1,5 → <b>1,5</b> → 0,83', '1,0', '<b>42 %</b>']]) +
        rep('<b>42 %</b> · intervalle surface minimum : <b>aucun</b>, on est sous 50 %.') },
    { n: 'Q#8', t: '%SNC d’une journée : 70 min à 30 m Nx35 + 40 min à 25 m Nx45', tags: ['%SNC', 'Majoration', 'Palier O₂'],
      q: 'Plongée 1 de 70 min à 30 m au Nx35, palier O₂. Plongée 2 de 40 min à 25 m au Nx45 après un intervalle de 2 h 30. Calculer le %SNC. Quelle solution suggérez-vous ?',
      r: schema([{ prof: 30, fond: '70 min', palier: { prof: 3, texte: 'O₂ 20 min' } }, { prof: 25, fond: '40 min', palier: { prof: 3, texte: '2 min' } }], ['2 h 30']) +
        '<h4>① Plongée 1 (Nitrox 35)</h4>' +
        phases([
          ['1. Fond', '30 m', '70', 'Nx35', '4,0', '1,4 → <b>1,4</b> → 0,65', '2,6', '45,5 %'],
          ['2. Remontée', '30 → 3 m', '27 / 15 = 1,8', 'Nx35', '4,0', 'celle du fond → 0,65', '', '1,2 %'],
          ['3. Palier', '3 m', '20', 'O₂ pur', '1,3', '1,3 → <b>1,3</b> → 0,56', '', '11,2 %'],
          ['4. Remontée surface', '3 → 0 m', '0,5', 'O₂ pur', '1,3', 'celle du palier → 0,56', '', '0,3 %'],
        ], ['Total plongée 1 (corrigé : 45,5 + 1,2 + 0,56 × (20 + 0,5))', '<b>58,2 %</b>']) +
        steps([['Palier', 'PEA : 2,6 / 0,8 = 3,25 b → 22,5 m → le corrigé lit la ligne <b>22 m</b> → 70 min : <b>29 min à 3 m</b>, GPS <b>L</b>'],
          ['À l’O₂', '29 × 2/3 = 19,3 → <b>20 min</b> à 3 m (5 min minimum)']]) +
        note('Remarque : 3,25 b donne 22,5 m. Strictement, la ligne immédiatement supérieure serait 25 m. Le corrigé arrondit à 3,2 b et prend 22 m.', 'warn') +
        '<h4>② Intervalle 2 h 30</h4>' + tbl(['%SNC plongée 1', 'Coefficient 2 h 30', '%SNC au départ de la plongée 2'], [['58,2 %', '0,315', '<b>18,4 %</b>']]) +
        '<h4>③ Plongée 2 (Nitrox 45)</h4>' +
        phases([
          ['1. Fond', '25 m', '40', 'Nx45', '3,5', '1,575 → <b>1,6</b> → 2,22', '1,93', '88,8 %'],
          ['2. Remontée', '25 → 3 m', '22 / 15 = 1,47', 'Nx45', '3,5', 'celle du fond → 2,22', '', '3,25 %'],
          ['3. Palier', '3 m', '2', 'Nx45', '1,3', '0,585 → <b>0,6</b> → 0,14', '', '0,28 %'],
          ['4. Remontée surface', '3 → 0 m', '0,5', 'Nx45', '1,3', 'celle du palier → 0,14', '', '0,07 %'],
        ], ['Total plongée 2', '<b>92,4 %</b>']) +
        steps([['PEA', '1,93 / 0,8 = 2,4 b → 14 m → colonne et ligne <b>15 m</b>'],
          ['Majoration', 'GPS L, 2 h 30 → Tableau I : <b>1,02</b> → Tableau II ligne <b>1,03</b>, colonne 15 m → <b>37 min</b>'],
          ['Durée fictive', '40 + 37 = 77 min → ligne <b>1 h 20</b> à 15 m → <b>2 min à 3 m</b>']]) +
        '<h4>④ Journée</h4>' + rep('18,4 + 88,8 + 3,25 + 0,35 = <b>111 %</b> → <b>pas possible !</b>') +
        note('<b>Conseils</b> : augmenter l’intervalle surface, réduire la profondeur de la 2<sup>e</sup> plongée ou le % du Nitrox de la 2<sup>e</sup> plongée. Le gros morceau, c’est le fond de la plongée 2 à 1,6 b (2,22 %/min).') },
    { n: 'Q#9', t: 'OTU de la même journée', tags: ['OTU'],
      q: 'Plongée 1 de 70 min à 30 m au Nx35, palier O₂ pur. 2ᵉ plongée de 40 min à 25 m au Nitrox 45 après 2 h 30 d’intervalle air surface. Calculer les OTU. Conclusion ?',
      r: tbl(['Plongée', 'Portion', 'PpO₂ → ligne', 'OTU / min', 'Durée', 'OTU'], [
        ['1', 'fond + remontée au palier', '1,4 → 1,4', '1,63', '70 + 27/15 = 71,8', '117'],
        ['1', 'palier O₂ + remontée surface', '1,3 → 1,3', '1,48', '20 + 0,5', '30,3'],
        { c: ['', '<b>Plongée 1</b>', '', '', '', '<b>148</b>'], cls: 'tot' },
        ['2', 'fond + remontée au palier', '1,575 → 1,6', '1,93', '40 + 22/15 = 41,5', '80'],
        ['2', 'palier + remontée surface', '0,585 → 0,6', '0,26', '2 + 0,5', '0,65'],
        { c: ['', '<b>Plongée 2</b>', '', '', '', '<b>≈ 80</b>'], cls: 'tot' },
      ]) + rep('Journée : 148 + 80 = <b>≈ 228 OTU, très en dessous de 850</b> (1<sup>er</sup> jour) → pas de problème de ce côté.') +
        note('Les OTU ne sont <b>pas</b> divisés par l’intervalle surface (contrairement au %SNC) : on additionne tout sur la journée. Le corrigé écrit 79 pour la plongée 2 ; le calcul donne 80, ça ne change rien.') },
    { n: 'Q#10', t: 'Gonflage : de 30 b de Nitrox 40 à un Nitrox 60 à 200 b', tags: ['Gonflage'],
      q: 'À partir d’un bloc de 15 L contenant 30 bar de NITROX 40, vous voulez un bloc NITROX 60 gonflé à 200 b ; détaillez la procédure de gonflage.',
      r: tbl(['Gaz (b)', 'On a', 'On veut', 'Ajout total', 'Air', 'O₂ pur'], [
        ['N₂', '0,6 × 30 = 18', '0,4 × 200 = 80', '80 − 18 = 62', '62', '0'],
        ['O₂', '0,4 × 30 = 12', '0,6 × 200 = 120', '120 − 12 = 108', '62 / 4 = 15,5', '108 − 15,5 = <b>92,5</b>'],
        { c: ['Total', '30', '200', '170', '77,5', '<b>92,5</b>'], cls: 'tot' },
      ]) + rep('<b>O₂ pur jusqu’à 122,5 b</b> (30 + 92,5), <b>puis gonflage à l’air jusqu’à 200 b</b>.') +
        note('Astuce : l’air apporte <b>tout</b> l’azote manquant (62 b) et, au passage, un quart de cette valeur en O₂ (15,5 b). Le reste de l’O₂ vient de la bouteille d’O₂ pur.') },
    { n: 'Q#11', t: 'Spécial rigolade : le meilleur Nitrox avec une réserve d’O₂ de 50 L à 100 b', tags: ['Gonflage', 'Mariotte'],
      q: 'Vous disposez d’un bloc de 15 L contenant 30 bar de NITROX 40, d’une réserve O₂ de 50 L à 100 bar et d’un compresseur classique AIR : déterminez le meilleur NITROX possible dans un bloc gonflé à 200 b ; détaillez la procédure.',
      r: steps([['Mariotte', 'à l’équilibre : <b>P = (P1 × V1 + P2 × V2) / (V1 + V2)</b>']]) +
        '<h4>1<sup>re</sup> méthode : on branche le bloc tel quel</h4>' +
        steps([['Équilibre', '(30 × 15 + 100 × 50) / 65 = <b>84 b</b> → on a ajouté 84 − 30 = 54 b d’O₂'], ['Air', '200 − 84 = 116 b d’air (93 de N₂, 23 d’O₂)'],
          ['% final', 'O₂ = 12 + 54 + 23 = 89 b → 89 / 200 = <b>Nitrox 44</b>']]) + note('« Peut mieux faire » 😐') +
        '<h4>2<sup>de</sup> méthode : on vide d’abord le bloc</h4>' +
        steps([['Équilibre', '(1 × 15 + 100 × 50) / 65 = <b>77 b</b> → on a ajouté 77 − 1 = 76 b d’O₂'], ['Air', '200 − 77 = 123 b d’air (98 de N₂, 25 d’O₂)'],
          ['% final', 'O₂ = 0,2 + 76 + 25 = 101,2 b → 101,2 / 200 = <b>Nitrox 51</b> 🏆']]) +
        note('Le reste du bloc est de l’<b>air</b> à 1 b : 0,2 b d’O₂ (le tableau du corrigé écrit « 0,42 × 1 », c’est 0,2 × 1).') },
  ];

  /* ---------- À toi (avec la correction cachée) ---------- */
  const ATOI = [
    { n: 'À toi #1', t: 'Gonflage : 12 L à 40 b de Nitrox 32 → Nitrox 50 à 200 b', tags: ['Gonflage'],
      q: 'Un bloc de 12 L contient 40 b de Nitrox 32. Tu veux un Nitrox 50 à 200 b. Remplis le tableau, donne la procédure et la pression minimale de la bouteille d’O₂.',
      r: tbl(['Gaz (b)', 'On a', 'On veut', 'Ajout total', 'Air', 'O₂ pur'], [
        ['N₂', '0,68 × 40 = 27,2', '0,5 × 200 = 100', '72,8', '72,8', '0'],
        ['O₂', '0,32 × 40 = 12,8', '0,5 × 200 = 100', '87,2', '72,8 / 4 = 18,2', '87,2 − 18,2 = <b>69</b>'],
        { c: ['Total', '40', '200', '160', '91', '<b>69</b>'], cls: 'tot' },
      ]) + rep('<b>O₂ pur jusqu’à 109 b</b> (40 + 69), puis <b>air jusqu’à 200 b</b>. La bouteille d’O₂ doit être <b>au-dessus de 109 b</b> pour pouvoir transférer jusque-là.') },
    { n: 'À toi #2', t: '%SNC : 50 min à 30 m au Nitrox 36, palier O₂', tags: ['%SNC', 'Palier O₂'],
      q: '50 min à 30 m au Nitrox 36, palier à l’O₂ pur. La MN90 donne 9 min de palier à 3 m. Calcule le %SNC de la plongée.',
      r: schema([{ prof: 30, fond: '50 min', palier: { prof: 3, texte: 'O₂ 6 min' } }]) +
        phases([
          ['1. Fond', '30 m', '50', 'Nx36', '4,0', '1,44 → <b>1,5</b> → 0,83', '2,56', '41,5 %'],
          ['2. Remontée', '30 → 3 m', '27 / 15 = 1,8', 'Nx36', '4,0', 'celle du fond → 0,83', '', '1,5 %'],
          ['3. Palier', '3 m', '9 × 2/3 = 6', 'O₂ pur', '1,3', '1,3 → <b>1,3</b> → 0,56', '', '3,4 %'],
          ['4. Remontée surface', '3 → 0 m', '0,5', 'O₂ pur', '1,3', 'celle du palier → 0,56', '', '0,3 %'],
        ], ['Total', '<b>≈ 46,6 %</b>']) +
        note('Piège : 1,44 b n’existe pas dans la table → on prend la colonne <b>au-dessus</b>, 1,5 b (0,83 %/min), pas 1,4 b.') + rep('<b>≈ 47 %</b> : sous 50 %, pas d’intervalle minimum imposé.') },
  ];

  const carte = (e, ouvert = false) => `<details class="exo"${ouvert ? ' open' : ''}><summary><b>${e.n}</b> ${e.t} ${e.tags.map(t => `<span class="exo-tag">${t}</span>`).join('')}</summary>
    <div class="exo-body"><p class="exo-q">${e.q}</p>
      <details class="exo-cor"><summary>👀 Voir la correction commentée</summary>${e.r}</details></div></details>`;

  function rendre(box) {
    box.innerHTML = `
      <p class="small muted" style="margin-bottom:8px">Révisions théoriques du cours Nitrox Confirmé (corrigé de S. Plouzennec). Pour chaque exercice : énoncé, puis correction commentée avec schéma et tableau par phase (fond, remontée, palier, remontée surface). Hypothèses : tables du cours, air 80 / 20, PpO₂ 1,6 b.</p>
      <details class="exo exo-methode"><summary>📐 <b>La méthode</b> : formules, tables NOAA / OTU / coefficients, majoration, gonflage</summary><div class="exo-body">${METHODE}</div></details>
      <h3 style="margin-top:12px">📖 Les exercices du cours</h3>
      ${COURS.map(e => carte(e)).join('')}
      <h3 style="margin-top:12px">📝 Le corrigé de révision, exercice par exercice</h3>
      ${EXOS.map(e => carte(e)).join('')}
      <h3 style="margin-top:12px">🧠 À toi</h3>
      ${ATOI.map(e => carte(e)).join('')}`;
  }

  window.NitroxExercices = { rendre };
})();
