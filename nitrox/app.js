/* ============================================================
   MN90 Mobile — Outil Nitrox (MOD, best mix, PEA, toxicité O2)
   Dépend de : shared/mn90.js, shared/profile.js, shared/glossary.js
   ============================================================ */
(function () {
  'use strict';

  const NEEDED = ['ntabs', 'vDepth2', 'lvlSeg', 'decoO2', 'vDeco', 'decoOut', 'o2Depth', 'o2Time', 'vOd', 'vOt', 'o2Out', 'gPf', 'gFo2', 'gPi', 'gFi', 'gonfOut', 'o2', 'vO2', 'ppSeg', 'modBig', 'modTrio', 'reqMix', 'modSteps', 'modPlot',
    'depth', 'vDepth', 'ppHint', 'bestTrio', 'mixTbl', 'sncPlot', 'minutes', 'vMin', 'sncSteps', 'genBtn', 'printBtn', 'genOut'];

  function init() {
    const L = window.MN90Lib, P = window.MN90Profile;
    if (!L || !P) { console.error('[nitrox] bibliothèques partagées manquantes'); return; }
    const el = {};
    const missing = NEEDED.filter(id => !(el[id] = document.getElementById(id)));
    if (missing.length) { console.error('[nitrox] éléments manquants :', missing); return; }
    const { fmt } = L;
    const S = { conf: P.get().nitrox === 'PNC' };
    // Cours Nitrox simple : PpO₂ max 1,6 b (1,4 b = réglage d'ordinateur recommandé par DAN)
    S.pmax = S.conf ? 1.4 : 1.6;
    const pps = () => (S.conf ? [1.4, 1.5, 1.6] : [1.4, 1.6]);

    function render() {
      el.lvlSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', (b.dataset.v === 'conf') === S.conf));
      el.o2.max = S.conf ? 100 : 40;
      document.querySelectorAll('.conf-only').forEach(b => { b.hidden = !S.conf; });
      document.querySelectorAll('.simple-only').forEach(b => { b.hidden = S.conf; });
      el.ppHint.textContent = S.conf ? '1,4 recommandé (DAN) · 1,5 pour limiter le %SNC · 1,6 = limite absolue' : '1,6 b = limite du cours · 1,4 b = réglage d’ordinateur recommandé (DAN)';
      const onTab = el.ntabs.querySelector('.ptab.on');
      if (!S.conf && onTab && onTab.classList.contains('conf-only')) el.ntabs.querySelector('[data-pane="mix"]').click();
      if (S.conf) { renderDecoGas(); renderO2Stops(); renderGonf(); }
      const conf = P.get().nitrox === 'PNC';
      const pct = +el.o2.value, fo2 = pct / 100, depth = +el.depth.value;
      el.vO2.textContent = pct;
      el.genBtn.textContent = `Générer la table de plongée pour ${pct >= 100 ? 'l’O₂ pur' : pct === 21 ? 'l’air' : 'ce Nx' + pct}`;
      el.vDepth.textContent = depth;
      el.vDepth2.textContent = depth;
      el.vMin.textContent = el.minutes.value;
      el.ppSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.pmax));

      // ----- MOD -----
      const mod = L.mod(fo2, S.pmax);
      el.modBig.textContent = `${fmt(mod, 1)} m`;
      el.modTrio.innerHTML = pps().map(p => `<div class="${p === S.pmax ? 'on' : ''}"><b>${fmt(L.mod(fo2, p), 1)} m</b><span>à ${fmt(p, 1)} b</span></div>`).join('');
      const reqs = pct > 21 ? P.requirements({ depth: 0, mode: 'enc', nitrox: true, fo2 }).filter(x => /Nitrox/.test(x.code)) : [];
      const icon = { used: '🟡', missing: '⛔', unknown: '❔' };
      el.reqMix.innerHTML = reqs.map(x => `<div class="req ${x.status}"><span>${icon[x.status] || 'ℹ️'}</span><span><b>${x.code}</b> · ${x.text}</span></div>`).join('');
      const pa = S.pmax / fo2;
      el.modSteps.innerHTML = [
        ['Pression max', `PpO₂ max / %O₂ = ${fmt(S.pmax, 1)} / ${fmt(fo2, 2)} = ${fmt(pa, 3)} b`],
        ['Profondeur', `(${fmt(pa, 3)} − 1) × 10 = ${fmt((pa - 1) * 10, 2)} m → <b>${fmt(mod, 1)} m</b> (arrondi vers le bas : jamais au-delà)`],
        ['Sur le bloc', `étiquette : % d’O₂ analysé par le préparateur puis par l’utilisateur (date, nom), pression et <b>profondeur maxi</b>.`],
        ...(pct > 21 && depth <= mod + 1e-9 ? peaSteps(depth, fo2, pct) : []),
      ].map(([t, x]) => `<div><em>${t}</em>${x}</div>`).join('');
      el.modPlot.innerHTML = modChart(fo2, S.conf || pct > 40);

      // ----- Best mix et mélanges à cette profondeur -----
      el.bestTrio.innerHTML = pps().map(p => {
        const b = L.bestMix(depth, p);
        return `<div class="${p === S.pmax ? 'on' : ''}"><b>${b >= 100 ? 'O₂ pur' : b <= 21 ? 'Air' : 'Nx' + b}</b><span>à ${fmt(p, 1)} b</span></div>`;
      }).join('');
      const list = [21, 28, 30, 32, 34, 36, 40];
      if (!list.includes(pct)) list.push(pct);
      list.sort((a, b) => a - b);
      el.mixTbl.innerHTML = `<thead><tr><th>Mélange</th><th>PpO₂</th><th>MOD</th><th>PEA → table</th><th></th></tr></thead><tbody>` +
        list.map(n => {
          const f = n / 100, pp = L.ppo2At(depth, f), m = L.mod(f, S.pmax);
          const okDepth = pp <= S.pmax + 1e-9;
          const peaD = n === 21 ? depth : L.pea(depth, f);
          const tab = L.lookup(Math.max(peaD, 0.1), 1);
          const needConf = n > 40;
          const status = !okDepth ? `<span class="bad-cell">⛔</span>` : needConf && !conf ? `<span class="bad-cell" title="Réservé au Nitrox Confirmé">Conf</span>` : `<span class="ok-cell">✓</span>`;
          return `<tr class="${n === pct ? 'cur' : ''}"><td>${n === 21 ? 'Air' : 'Nx' + n}</td><td>${fmt(pp, 2)}</td><td>${fmt(m, 1)} m</td><td>${n === 21 ? '—' : `${fmt(peaD, 1)} → ${tab.d ?? '—'} m`}</td><td>${status}</td></tr>`;
        }).join('') + '</tbody>';

      // ----- Toxicité -----
      const pp = L.ppo2At(depth, fo2), min = +el.minutes.value;
      if (!S.conf) { el.sncPlot.innerHTML = ppChart(fo2, depth); el.sncSteps.innerHTML = toxSimple(pct, fo2, depth, pp); return; }
      const lim = L.noaaLimit(pp);
      const snc = pp < 0.6 ? 0 : min / lim * 100;
      el.sncPlot.innerHTML = sncChart(pp, min, snc);
      const otu = pp > 0.5 ? min * Math.pow((pp - 0.5) / 0.5, 0.83) : 0;
      const row = L.NOAA.find(x => x[0] >= pp - 1e-9);
      el.sncSteps.innerHTML = [
        ['PpO₂', `Nx${pct} à ${depth} m : ${fmt(L.pabs(depth), 1)} × ${fmt(fo2, 2)} = <b>${fmt(pp, 2)} b</b>${pp > S.pmax + 1e-9 ? ` <b style="color:var(--danger)">au-delà de ${fmt(S.pmax, 1)} b : interdit</b>` : ''}`],
        ['Table NOAA', pp < 0.6 ? 'sous 0,6 b : le compteur %SNC ne bouge pas.' : `ligne ${row ? fmt(row[0], 1) : '> 1,8'} b → durée max ${lim} min.`],
        ['%SNC', `${min} / ${lim} × 100 = <b style="color:${snc > 80 ? 'var(--danger)' : snc > 50 ? 'var(--warn)' : 'var(--ok)'}">${fmt(snc, 0)} %</b> de la jauge cerveau.`],
        ['OTU', `${fmt(otu, 0)} OTU sur les 850 d’une journée (jauge poumons).`],
      ].map(([t, x]) => `<div><em>${t}</em>${x}</div>`).join('');
    }

    // Profondeur équivalente air, méthode du cours (même PpN₂)
    function peaSteps(depth, fo2, pct) {
      const pa = L.pabs(depth), ppn2 = pa * (1 - fo2), paAir = ppn2 / 0.8, z = (paAir - 1) * 10;
      const line = L.DEPTHS.find(x => x >= Math.max(z, 0.1) - 1e-9);
      return [
        ['PpN₂', `Nx${pct} à ${depth} m : ${fmt(pa, 1)} × ${fmt(1 - fo2, 2)} = <b>${fmt(ppn2, 2)} b</b>`],
        ['Pa air équivalente', `${fmt(ppn2, 2)} / 0,8 = ${fmt(paAir, 2)} b, soit <b>${fmt(z, 1)} m</b> à l’air`],
        ['Table MN90', `on lit la ligne <b>${line ?? '—'} m</b> (immédiatement supérieure). Attention : la DTR de la table est fausse, on remonte de la profondeur réelle.`],
      ];
    }

    // Tableau du cours : PpO₂ par profondeur pour l'air et les Nitrox usuels
    const PP_MIX = [[21, 'Air', 'var(--text2)'], [32, 'Nx32', 'var(--c1)'], [36, 'Nx36', 'var(--c2)'], [40, 'Nx40', 'var(--c3)']];
    const withCur = pct => (PP_MIX.some(m => m[0] === pct) ? PP_MIX : [...PP_MIX, [pct, 'Nx' + pct, 'var(--accent)']].sort((a, b) => a[0] - b[0]));
    function toxSimple(pct, fo2, depth, pp) {
      const mixes = withCur(pct);
      const rows = [];
      for (let z = 0; z <= 65; z += 5) rows.push(`<tr class="${Math.abs(z - depth) < 2.5 ? 'cur' : ''}"><td><b>${z} m</b></td><td>${fmt(L.pabs(z), 1)}</td>${mixes.map(m => { const v = L.ppo2At(z, m[0] / 100); return `<td class="${v > 1.6 + 1e-9 ? 'bad' : ''}">${fmt(v, 2)}</td>`; }).join('')}</tr>`);
      const bad = pp > 1.6 + 1e-9;
      return `<div><em>PpO₂</em>Nx${pct} à ${depth} m : ${fmt(L.pabs(depth), 1)} × ${fmt(fo2, 2)} = <b style="color:${bad ? 'var(--danger)' : 'var(--ok)'}">${fmt(pp, 2)} b</b>${bad ? ' : <b style="color:var(--danger)">au-delà de 1,6 b, zone interdite</b>' : ' : sous la limite de 1,6 b'}.</div>
        <div><em>⚡ Effet Paul Bert</em>exposition <b>immédiate</b> à une PpO₂ &gt; 1,6 b. Touche le <b>système nerveux central</b> : crise convulsive (type épilepsie), parfois sans signe avant-coureur. C’est la limite principale du Nitrox.</div>
        <div><em>Signes avant-coureurs</em>cœur qui s’accélère, nausées, vertiges, crampes du visage, troubles de la vue ou bourdonnements, euphorie.</div>
        <div><em>Conduite à tenir</em>attendre au moins la fin de la phase tonique, garder le détendeur en bouche, remonter la victime (la soustraire au toxique), évacuer.</div>
        <div><em>Prévention</em>ordinateur réglé à 1,4 b (recommandation DAN), garder de la marge (surtout au froid), ne pas frôler la profondeur max.</div>
        <div><em>🫁 Effet Lorrain-Smith</em>exposition <b>prolongée</b> dès 0,5 b. Touche les <b>poumons</b> : toux, irritation, gêne respiratoire. Conduite : faire respirer de l’air, évacuer. Prévention : <b>plongées limitées à 2 h</b>.</div>
        <h3 style="margin:10px 0 6px">PpO₂ selon la profondeur</h3>
        <div class="tbl-wrap"><table class="tbl pp-tbl"><thead><tr><th>Prof.</th><th>Pabs</th>${mixes.map(m => `<th>${m[1]}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>
        <p class="hint" style="margin-top:6px">En rouge : zone interdite (PpO₂ &gt; 1,6 b). Le suivi chiffré de la dose d’oxygène est vu au cours Nitrox Confirmé.</p>`;
    }

    function ppChart(fo2, depth) {
      const [W, H] = plotSize(el.sncPlot, 420, 230); const m = { l: 40, r: 10, t: 12, b: 26 };
      const xMax = 2.2, zMax = 65;
      const X = p => m.l + p / xMax * (W - m.l - m.r);
      const Y = z => m.t + z / zMax * (H - m.t - m.b);
      let g = `<rect width="${W}" height="${H}" style="fill:var(--water1)"/>`;
      g += `<rect x="${X(1.6)}" y="${m.t}" width="${X(xMax) - X(1.6)}" height="${H - m.t - m.b}" style="fill:var(--danger)" fill-opacity=".14"/>`;
      g += `<text x="${(X(1.6) + X(xMax)) / 2}" y="${H - m.b - 8}" font-size="11" font-weight="800" text-anchor="middle" style="fill:var(--danger)">Zone interdite</text>`;
      for (let z = 0; z <= zMax; z += 10) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(z)}" y2="${Y(z)}" style="stroke:var(--grid)"/><text x="${m.l - 5}" y="${Y(z) + 4}" font-size="11" text-anchor="end" style="fill:var(--text2)">${z} m</text>`;
      [0.5, 1, 1.4, 1.6, 2].forEach(p => { g += `<text x="${X(p)}" y="${H - 8}" font-size="11" text-anchor="middle" style="fill:var(--text2)">${fmt(p, 1)}</text>`; });
      g += `<line x1="${X(1.6)}" x2="${X(1.6)}" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--danger)" stroke-width="2"/>`;
      const pct = Math.round(fo2 * 100);
      withCur(pct).forEach(([n, name, c]) => {
        const f = n / 100, z1 = Math.min(zMax, (xMax / f - 1) * 10), on = n === pct;
        const col = on ? 'var(--accent)' : c;
        g += `<line x1="${X(f)}" y1="${Y(0)}" x2="${X(f * L.pabs(z1))}" y2="${Y(z1)}" style="stroke:${col}" stroke-width="${on ? 4 : 2}"/>`;
        g += `<text x="${Math.min(X(f * L.pabs(z1)) + 4, W - m.r - 34)}" y="${Math.min(Y(z1), H - m.b - 22)}" font-size="11" font-weight="800" style="fill:${col}">${name}</text>`;
      });
      const pp = L.ppo2At(depth, fo2);
      g += `<circle cx="${X(Math.min(pp, xMax))}" cy="${Y(depth)}" r="6" style="fill:var(--surface);stroke:${pp > 1.6 + 1e-9 ? 'var(--danger)' : 'var(--accent)'}" stroke-width="3"/>`;
      g += `<text x="${Math.max(m.l + 90, X(Math.min(pp, xMax)) - 10)}" y="${Y(depth) - 10}" font-size="12" font-weight="800" text-anchor="end" style="fill:var(--text);paint-order:stroke;stroke:var(--water1);stroke-width:4px">${depth} m → ${fmt(pp, 2)} b</text>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="PpO₂ selon la profondeur pour chaque mélange">${g}</svg>`;
    }

    /* ---------- Table Nitrox générée (MN90 lue à la PEA, profondeurs réelles) ---------- */
    let generated = false;
    const noStopOf = rows => { let t = 0; for (const r of rows) { if (Object.keys(r[1]).length) break; t = r[0]; } return Math.min(t, L.LIMITS.immersion); };
    const dur = v => (v >= L.LIMITS.immersion ? '> 2 h' : v + ' min');

    function generate() {
      const pct = +el.o2.value, fo2 = pct / 100, gear = P.get().gear;
      const mod = L.mod(fo2, S.pmax);
      const name = pct >= 100 ? 'O₂ pur' : pct === 21 ? 'Air' : 'Nx' + pct;
      const depths = L.DEPTHS.filter(d => d <= mod + 1e-9 && d <= L.LIMITS.maxDepth);
      if (!depths.length) { el.genOut.innerHTML = `<div class="alert danger">${name} : MOD ${fmt(mod, 1)} m à ${fmt(S.pmax, 1)} b, trop faible pour une table de fond.</div>`; return; }
      const sum = [], det = [];
      depths.forEach(d => {
        const peaD = pct === 21 ? d : L.pea(d, fo2);
        const line = L.DEPTHS.find(x => x >= Math.max(peaD, 0.1) - 1e-9);
        const rows = L.MN90[line].filter(r => r[0] <= L.LIMITS.immersion);
        const nsNx = noStopOf(L.MN90[line]);
        const nsAir = noStopOf(L.MN90[L.DEPTHS.find(x => x >= d)]);
        const gain = nsNx - nsAir;
        sum.push(`<tr><td><b>${d} m</b></td><td>${fmt(peaD, 1)} → ${line} m</td><td>${dur(nsNx)}</td><td>${dur(nsAir)}</td><td class="gain">${gain > 0 ? '+' + gain + ' min' : '—'}</td><td>${fmt(L.ppo2At(d, fo2), 2)}</td></tr>`);
        const cols = L.STOP_DEPTHS.filter(c => rows.some(r => r[1][c]));
        const body = rows.map(r => {
          const e = L.evaluate({ bottom: L.squareBottom(d, r[0]), fo2, nitrox: pct !== 21, gear });
          const dtr = e.prof ? Math.ceil(e.dtrReal - 1e-9) : r[2];
          return `<tr><td>${r[0]}′</td>${cols.map(c => r[1][c] ? `<td class="pd${c}" style="font-weight:800">${r[1][c]}</td>` : '<td class="dim">·</td>').join('')}<td>${dtr}′</td><td>${r[3]}</td></tr>`;
        }).join('');
        det.push(`<details class="gen-depth"><summary>${d} m réels · lu à ${line} m · sans palier ${dur(nsNx)}</summary>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Durée</th>${cols.map(c => `<th class="pd${c}">${c} m</th>`).join('')}<th>DTR réelle</th><th>GPS</th></tr></thead><tbody>${body}</tbody></table></div></details>`);
      });
      el.genOut.innerHTML = `
        <h3 style="margin-bottom:6px">Table ${name} · PpO₂ max ${fmt(S.pmax, 1)} b · MOD ${fmt(mod, 1)} m</h3>
        <div class="tbl-wrap"><table class="tbl gen-sum"><thead><tr><th>Profondeur réelle</th><th>PEA → ligne MN90</th><th>Sans palier</th><th>À l’air</th><th>Gain</th><th>PpO₂</th></tr></thead><tbody>${sum.join('')}</tbody></table></div>
        <p class="hint" style="margin-top:6px">Touche une profondeur pour voir toutes ses durées, paliers et lettres GPS.</p>
        ${det.join('')}
        <p class="hint" style="margin-top:8px">Méthode du cours : PEA = [(P + 10) × %N₂ / 0,8] − 10, ligne MN90 immédiatement supérieure. Plongées successives : la lettre GPS se reporte comme à l’air. La table ne tient pas compte de la toxicité de l’O₂ : ${S.conf ? 'surveille le %SNC' : 'immersion limitée à 2 h'}.</p>`;
      generated = true;
      el.printBtn.hidden = false;
    }

    // Grand écran : le graphique prend la taille de sa zone ; sinon taille fixe (mise à l'échelle)
    const DASH = window.matchMedia('(min-width: 1000px) and (min-height: 600px)');
    function plotSize(box, w, h) {
      if (DASH.matches && box.clientWidth > 200 && box.clientHeight > 100) return [box.clientWidth, box.clientHeight];
      return [w, h];
    }

    /* ---------- Nitrox Confirmé ---------- */
    const mixName = n => (n >= 100 ? 'O₂ pur' : 'Nx' + n);
    function renderDecoGas() {
      const pct = +el.decoO2.value, f = pct / 100;
      el.vDeco.textContent = mixName(pct);
      const mod16 = L.mod(f, 1.6);
      const stops = [21, 12, 9, 6, 3];
      el.decoOut.innerHTML = `<div class="steps">
          <div><em>MOD à 1,6 b</em>(1,6 / ${fmt(f, 2)} − 1) × 10 = <b>${fmt(mod16, 1)} m</b> : on passe sur ce gaz <b>à ${Math.floor(mod16)} m ou moins</b>.</div>
          <div><em>Matériel</em>au-delà de 40 % d’O₂ : détendeur, stab et bloc <b>compatibles O₂ pur</b>. Deux ordinateurs qui gèrent le changement de gaz.</div>
        </div>
        <h3 style="margin-top:10px">Best mix de déco selon la profondeur du palier (1,6 b)</h3>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Palier</th><th>Pabs</th><th>Best mix</th><th>${mixName(pct)} ?</th></tr></thead><tbody>` +
        stops.map(z => {
          const b = Math.min(100, L.bestMix(z, 1.6)), pp = L.ppo2At(z, f);
          return `<tr><td>${z} m</td><td>${fmt(L.pabs(z), 1)} b</td><td>${mixName(b)}</td><td class="${pp > 1.6 + 1e-9 ? 'bad-cell' : 'ok-cell'}">${pp > 1.6 + 1e-9 ? `⛔ PpO₂ ${fmt(pp, 2)}` : `✓ ${fmt(pp, 2)} b`}</td></tr>`;
        }).join('') + `</tbody></table></div>
        <p class="hint" style="margin-top:6px">Exemples du cours : Nx80 → MOD 10 m ; déco optimale à partir de 22 m au Nx50 ; O₂ pur à 6 m.</p>`;
    }

    function renderO2Stops() {
      const d = +el.o2Depth.value, t = +el.o2Time.value;
      el.vOd.textContent = d; el.vOt.textContent = t;
      const tab = L.lookup(d, t);
      if (tab.err) { el.o2Out.innerHTML = `<div class="alert danger">${tab.err}</div>`; return; }
      const st = L.stopList(tab.stops);
      const deep = st.filter(z => z > 6), shallow = st.filter(z => z <= 6);
      const airShallow = shallow.reduce((a, z) => a + tab.stops[z], 0);
      const o2 = {};
      shallow.forEach(z => { o2[z] = Math.ceil(tab.stops[z] * 2 / 3 - 1e-9); });
      let o2Total = shallow.reduce((a, z) => a + o2[z], 0);
      if (shallow.length && o2Total < 5) { const z = shallow[shallow.length - 1]; o2[z] += 5 - o2Total; o2Total = 5; }
      const otu = shallow.reduce((a, z) => a + o2[z] * Math.pow((L.pabs(z) - 0.5) / 0.5, 0.83), 0);
      const snc = shallow.reduce((a, z) => a + o2[z] / L.noaaLimit(L.pabs(z)) * 100, 0);
      el.o2Out.innerHTML = !st.length ? '<div class="alert ok">Pas de palier obligatoire sur cette plongée à l’air.</div>' : `<div class="steps">
          <div><em>Table air</em>${d} m / ${t}′ → ligne ${tab.d} m / ${tab.t}′ : ${st.map(z => `<span class="pd${z}" style="font-weight:800">${z} m ${tab.stops[z]}′</span>`).join(' + ')}.</div>
          ${deep.length ? `<div><em>Paliers profonds</em>${deep.map(z => `${z} m ${tab.stops[z]}′`).join(' + ')} : inchangés (O₂ pur interdit au-delà de 6 m).</div>` : ''}
          <div><em>À l’O₂ pur</em>2/3 de ${shallow.map(z => `${tab.stops[z]}′`).join(' + ')} → ${shallow.map(z => `<span class="pd${z}" style="font-weight:800">${z} m ${o2[z]}′</span>`).join(' + ')}${o2Total === 5 && airShallow * 2 / 3 < 5 ? ' (porté au minimum de 5 min)' : ''}.</div>
          <div><em>Gain</em>${airShallow} min de paliers à l’air → <b>${o2Total} min à l’O₂</b>, soit ${airShallow - o2Total} min de moins dans l’eau.</div>
          <div><em>Toxicité</em>PpO₂ ${fmt(L.pabs(6), 1)} b à 6 m : %SNC des paliers ≈ <b>${fmt(snc, 0)} %</b>, ${fmt(otu, 0)} OTU.</div>
        </div>`;
    }

    // Pression partielle : O₂ pur d'abord, puis complément à l'air (%O₂ air = 21 %)
    function renderGonf() {
      const Pf = +el.gPf.value, Fo = +el.gFo2.value / 100, Pi = Math.max(0, +el.gPi.value), Fi = +el.gFi.value / 100;
      const o2 = (Pf * Fo - Pi * Fi - (Pf - Pi) * 0.21) / 0.79;
      const ok = o2 >= -1e-9 && Pi <= Pf;
      const P1 = Pi + Math.max(0, o2);
      el.gonfOut.innerHTML = !ok ? `<div class="alert danger">Impossible : le reste du bloc est déjà trop riche ou trop haut pour viser ${mixName(Math.round(Fo * 100))} à ${Pf} b. Vide une partie du bloc.</div>` : `<div class="steps" style="margin-top:6px">
          <div><em>Formule</em>O₂ à ajouter = [Pf × %O₂ visé − Pi × %O₂ du reste − (Pf − Pi) × 0,21] / 0,79</div>
          <div><em>Calcul</em>[${Pf} × ${fmt(Fo, 2)} − ${Pi} × ${fmt(Fi, 2)} − ${Pf - Pi} × 0,21] / 0,79 = <b>${fmt(o2, 1)} b d’O₂ pur</b></div>
          <div><em>Étape 1</em>transférer l’O₂ pur de ${Pi} à <b>${fmt(P1, 0)} b</b> (Ph1), lentement : <b>5 b/min</b>, et <b>3 b/min au-delà de 100 b</b>.</div>
          <div><em>Étape 2</em>compléter à l’air de ${fmt(P1, 0)} à <b>${Pf} b</b> (Ph2), au compresseur.</div>
          <div><em>Ensuite</em>24 h d’attente pour l’homogénéisation, puis <b>analyse</b> (préparateur puis utilisateur), étiquette : % O₂, MOD, date, initiales, et registre du club.</div>
        </div>
        <p class="hint" style="margin-top:6px">Bloc et robinetterie compatibles O₂ pur (méthode réservée à un technicien formé). Pas de traces d’huile.</p>`;
    }

    let noaaBack = null;
    function openNoaa() {
      const pp = L.ppo2At(+el.depth.value, +el.o2.value / 100);
      const cur = L.NOAA.findIndex(x => x[0] >= pp - 1e-9);
      if (!noaaBack) {
        noaaBack = document.createElement('div');
        noaaBack.className = 'modal-back';
        noaaBack.hidden = true;
        noaaBack.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="noaa-title" style="max-width:640px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 id="noaa-title">📋 Table d’exposition NOAA</h2><button type="button" class="btn btn-outline btn-sm" data-close>Fermer ✕</button></div>
          <p class="hint" style="margin:4px 0 8px">Durée maximale d’exposition à l’O₂ selon la PpO₂ (cours Nitrox Confirmé, diapo 27). On lit la ligne <b>immédiatement supérieure</b> à sa PpO₂.</p>
          <div class="tbl-wrap"><table class="tbl" id="noaaTbl"></table></div>
          <p class="hint" style="margin-top:8px">%SNC = durée / durée max × 100. OTU par minute = ((PpO₂ − 0,5) / 0,5)^0,83. Au-delà de 1,6 b : interdit en plongée.</p></div>`;
        document.body.appendChild(noaaBack);
        const close = () => { noaaBack.hidden = true; document.documentElement.classList.remove('modal-open'); };
        noaaBack.addEventListener('click', e => { if (e.target === noaaBack || e.target.closest('[data-close]')) close(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && noaaBack && !noaaBack.hidden) close(); });
      }
      noaaBack.querySelector('#noaaTbl').innerHTML = `<thead><tr><th>PpO₂ (b)</th><th>Durée max</th><th>%SNC / min</th><th>OTU / min</th></tr></thead><tbody>` +
        L.NOAA.map(([p, lim], i) => {
          const col = p >= 1.7 ? 'var(--danger)' : p >= 1.6 ? 'var(--danger)' : p >= 1.5 ? 'var(--warn)' : 'var(--text)';
          return `<tr class="${i === cur ? 'hit' : ''}"><td style="color:${col};font-weight:800">${fmt(p, 1)}</td><td>${lim} min</td><td>${fmt(100 / lim, 2)}</td><td>${fmt(Math.pow((p - 0.5) / 0.5, 0.83), 2)}</td></tr>`;
        }).join('') + '</tbody>';
      noaaBack.hidden = false;
      document.documentElement.classList.add('modal-open');
      noaaBack.querySelector('[data-close]').focus();
    }

    function modChart(fo2, conf) {
      const [W, H] = plotSize(el.modPlot, 420, 250); const m = { l: 40, r: 10, t: 12, b: 26 };
      const xMax = conf ? 100 : 40, xMin = 21, zMax = 70;
      const X = p => m.l + (p - xMin) / (xMax - xMin) * (W - m.l - m.r);
      const Y = z => m.t + Math.min(z, zMax) / zMax * (H - m.t - m.b);
      let g = `<rect width="${W}" height="${H}" style="fill:var(--water1)"/>`;
      for (let z = 0; z <= zMax; z += 10) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(z)}" y2="${Y(z)}" style="stroke:var(--grid)"/><text x="${m.l - 5}" y="${Y(z) + 4}" font-size="11" text-anchor="end" style="fill:var(--text2)">${z} m</text>`;
      const step = conf ? 10 : 2;
      for (let p = Math.ceil(xMin / step) * step; p <= xMax; p += step) g += `<text x="${X(p)}" y="${H - 8}" font-size="11" text-anchor="middle" style="fill:var(--text2)">${p}%</text>`;
      [[1.4, 'var(--c1)'], [1.5, 'var(--c2)'], [1.6, 'var(--c3)']].filter(([pp]) => pps().includes(pp)).forEach(([pp, c]) => {
        const pts = [];
        for (let p = xMin; p <= xMax; p += 0.5) pts.push(`${X(p).toFixed(1)},${Y(Math.max(0, (pp / (p / 100) - 1) * 10)).toFixed(1)}`);
        g += `<polyline points="${pts.join(' ')}" fill="none" style="stroke:${c}" stroke-width="${pp === S.pmax ? 3.5 : 2}"/>`;
      });
      const mod = L.mod(fo2, S.pmax);
      g += `<line x1="${X(fo2 * 100)}" x2="${X(fo2 * 100)}" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--text)" stroke-opacity=".35" stroke-dasharray="4 3"/>`;
      g += `<circle cx="${X(fo2 * 100)}" cy="${Y(mod)}" r="6" style="fill:var(--surface);stroke:var(--accent)" stroke-width="3"/>`;
      g += `<text x="${Math.min(X(fo2 * 100) + 10, W - 90)}" y="${Math.max(Y(mod) - 10, 24)}" font-size="12" font-weight="800" style="fill:var(--text)">${fmt(mod, 1)} m</text>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="MOD selon le pourcentage d’oxygène">${g}</svg>`;
    }

    function sncChart(pp, min, snc) {
      const [W, H] = plotSize(el.sncPlot, 420, 230); const m = { l: 30, r: 6, t: 16, b: 30 };
      const rows = L.NOAA, yMax = 2.5;
      const bw = (W - m.l - m.r) / rows.length;
      const cur = rows.findIndex(x => x[0] >= pp - 1e-9);
      let g = `<rect width="${W}" height="${H}" style="fill:var(--water1)"/>`;
      [0, 0.5, 1, 1.5, 2].forEach(v => { const y = H - m.b - v / yMax * (H - m.t - m.b); g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" style="stroke:var(--grid)"/><text x="${m.l - 4}" y="${y + 4}" font-size="10" text-anchor="end" style="fill:var(--text2)">${fmt(v, 1)}</text>`; });
      rows.forEach(([p, lim], i) => {
        const v = 100 / lim, h = Math.min(v, yMax) / yMax * (H - m.t - m.b);
        const x = m.l + i * bw + 3, y = H - m.b - h;
        const color = p >= 1.6 ? 'var(--danger)' : p >= 1.5 ? 'var(--warn)' : 'var(--ok)';
        g += `<rect x="${x}" y="${y}" width="${bw - 6}" height="${h}" rx="3" style="fill:${color}" fill-opacity="${i === cur ? 1 : 0.45}"/>`;
        if (i === cur) g += `<rect x="${x - 2}" y="${y - 2}" width="${bw - 2}" height="${h + 4}" rx="4" fill="none" style="stroke:var(--text)" stroke-width="2"/>`;
        g += `<text x="${x + (bw - 6) / 2}" y="${H - m.b + 14}" font-size="10" text-anchor="middle" style="fill:var(--text2)">${fmt(p, 1)}</text>`;
        g += `<text x="${x + (bw - 6) / 2}" y="${Math.max(y - 4, m.t + 8)}" font-size="9.5" font-weight="700" text-anchor="middle" style="fill:var(--text)">${v >= 10 ? fmt(v, 0) : fmt(v, 2)}</text>`;
      });
      g += `<text x="${W - m.r}" y="${H - 4}" font-size="10" text-anchor="end" style="fill:var(--text2)">PpO₂ (b) · %SNC par minute</text>`;
      // Résultat de la durée choisie, au-dessus de la barre de ta PpO₂
      if (cur >= 0 && min) {
        const zc = snc > L.LIMITS.sncMax ? 'var(--danger)' : snc > L.LIMITS.sncWarn ? 'var(--warn)' : 'var(--ok)';
        const xc = Math.max(m.l + 80, Math.min(m.l + cur * bw + bw / 2, W - m.r - 80));
        g += `<text x="${xc}" y="${m.t + 14}" text-anchor="middle" font-size="13" font-weight="800" fill="${zc}" style="paint-order:stroke;stroke:var(--water1);stroke-width:4px">${min} min à ${fmt(pp, 2)} b → ${fmt(snc, 0)} % SNC</text>`;
      }
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="%SNC par minute selon la PpO2">${g}</svg>`;
    }

    [el.o2, el.depth, el.minutes].forEach(i => i.addEventListener('input', render));
    // Bouger la durée affiche le détail dans l'onglet Toxicité
    el.minutes.addEventListener('input', () => { if (!S.conf) return; const t = el.ntabs.querySelector('[data-pane="tox"]'); if (t && !t.classList.contains('on')) t.click(); });
    document.addEventListener('click', e => { if (e.target.closest('[data-noaa]')) openNoaa(); });
    el.o2.addEventListener('input', () => { if (generated) generate(); });
    el.genBtn.addEventListener('click', generate);
    el.printBtn.addEventListener('click', () => {
      el.genOut.querySelectorAll('details').forEach(d => { d.open = true; });
      window.print();
    });
    el.lvlSeg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.conf = b.dataset.v === 'conf'; if (!S.conf && +el.o2.value > 40) el.o2.value = 40; S.pmax = S.conf ? 1.4 : 1.6; render(); if (generated) generate(); });
    [el.decoO2].forEach(i => i.addEventListener('input', renderDecoGas));
    [el.o2Depth, el.o2Time].forEach(i => i.addEventListener('input', renderO2Stops));
    [el.gPf, el.gFo2, el.gPi, el.gFi].forEach(i => i.addEventListener('input', renderGonf));
    el.ppSeg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.pmax = +b.dataset.v; render(); if (generated) generate(); } });
    P.onChange(render);
    // Onglets du panneau
    el.ntabs.addEventListener('click', e => {
      const b = e.target.closest('.ptab');
      if (!b) return;
      el.ntabs.querySelectorAll('.ptab').forEach(x => x.classList.toggle('on', x === b));
      document.querySelectorAll('.pane[data-pane]').forEach(pn => { pn.hidden = pn.dataset.pane !== b.dataset.pane; });
    });
    // Hauteur de la barre du haut, et graphiques redessinés quand leur zone change de taille
    const nav = document.querySelector('.navbar');
    const setNavH = () => { if (nav) document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px'); };
    setNavH();
    window.addEventListener('resize', setNavH);
    if (window.ResizeObserver) {
      let last = '';
      const ro = new ResizeObserver(() => {
        const k = [el.modPlot, el.sncPlot].map(x => x.clientWidth + 'x' + x.clientHeight).join('|');
        if (k !== last) { last = k; render(); }
      });
      ro.observe(el.modPlot); ro.observe(el.sncPlot);
    }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
