/* ============================================================
   MN90 Mobile — Saturation, compartiments et facteurs de gradient (GF)
   Version dynamique du graphique « tension / pression absolue » du cours.
   Dépend de : shared/mn90.js, shared/buhlmann.js, shared/profile.js, shared/glossary.js
   ============================================================ */
(function () {
  'use strict';

  const NEEDED = ['depth', 'time', 'o2', 'vDepth', 'vTime', 'vGas', 'presets', 'gfLow', 'gfHigh', 'vLow', 'vHigh', 'duo', 'gfHint',
    'comp', 'pPlot', 'play', 'tCur', 'vCur', 'model', 'bPlot', 'tabs', 'cmpTbl', 'cmpNotes', 'zPlot', 'profSteps', 'readSteps', 'qSteps', 'qTbl'];
  const PRESETS = [[30, 80], [50, 80], [70, 85], [85, 85], [100, 100]];
  // Tableau du cours : même plongée (50 m, 15 min, air) avec différents GF
  const PAIRS = [[100, 100], [90, 90], [85, 85], [80, 80], [70, 70], [50, 50]];
  // Facteur Q (cours) : Q = profondeur × √(temps au fond)
  const QRISK = [[130, '1 sur 1 000 000'], [180, '1 sur 100 000'], [240, '1 sur 10 000'], [320, '1 sur 1 000'], [420, '1 sur 100'], [560, '1 sur 10'], [750, '1 sur 1']];

  function init() {
    const L = window.MN90Lib, B = window.MN90Buhlmann;
    if (!L || !B) { console.error('[saturation] bibliothèques partagées manquantes'); return; }
    const el = {};
    const missing = NEEDED.filter(id => !(el[id] = document.getElementById(id)));
    if (missing.length) { console.error('[saturation] éléments manquants :', missing); return; }
    const { fmt } = L;
    const S = { model: 'zh', comp: 'auto', playing: null };
    let R = null;                                   // résultats du dernier calcul

    el.comp.innerHTML = '<option value="auto">Directeur (automatique)</option>' +
      B.ZHL16C.map((c, i) => `<option value="${i}">C${i + 1} · période ${fmt(c[0], 1)} min</option>`).join('');
    el.presets.innerHTML = PRESETS.map(([a, b]) => `<button type="button" data-l="${a}" data-h="${b}">${a}/${b}</button>`).join('');

    const gasName = pct => (pct === 21 ? 'Air' : 'Nx' + pct);
    const stopsTxt = stops => {
      const z = Object.keys(stops).map(Number).sort((a, b) => b - a);
      return z.length ? z.map(d => `<span class="pd${d}" style="font-weight:800">${d} m ${stops[d]}′</span>`).join(' + ') : 'aucun palier';
    };
    // Part de la remontée passée dans les 10 derniers mètres
    function share10(p, time) {
      const pts = p.pts;
      for (let i = 1; i < pts.length; i++) {
        const [t0, z0] = pts[i - 1], [t1, z1] = pts[i];
        if (t0 >= time - 1e-9 && z0 > 10 && z1 <= 10) {
          const t10 = t0 + (t1 - t0) * (z0 - 10) / (z0 - z1);
          return (p.total - t10) / Math.max(p.dtr, 1e-9) * 100;
        }
      }
      return 100;
    }
    const firstTxt = p => (p.first ? `${p.first} m (${p.stops[p.first]}′)` : '—');

    // Compartiments MN90 (Haldane, critère Sc) le long d'un profil : % du seuil Sc
    function mn90Trace(pts, fo2, step) {
      const C = L.COMPARTMENTS, k = C.map(c => Math.LN2 / c[0]), fn2 = 1 - fo2;
      const T = C.map(() => 0.79);
      const out = [{ t: 0, z: 0, T: T.slice() }];
      for (let i = 1; i < pts.length; i++) {
        const [t0, z0] = pts[i - 1], [t1, z1] = pts[i];
        const n = Math.max(1, Math.ceil((t1 - t0) / step));
        for (let s = 1; s <= n; s++) {
          const dt = (t1 - t0) / n, zm = z0 + (z1 - z0) * (s - 0.5) / n, z = z0 + (z1 - z0) * s / n;
          const pi = L.pabs(zm) * fn2;
          for (let j = 0; j < T.length; j++) T[j] = pi + (T[j] - pi) * Math.exp(-k[j] * dt);
          out.push({ t: t0 + (t1 - t0) * s / n, z, T: T.slice() });
        }
      }
      return out;
    }
    const at = (tr, t) => { let best = tr[0]; for (const x of tr) { if (x.t <= t + 1e-9) best = x; else break; } return best; };

    function compute() {
      const depth = +el.depth.value, time = +el.time.value, pct = +el.o2.value, fo2 = pct / 100;
      const gl = +el.gfLow.value, gh = Math.max(+el.gfHigh.value, gl);
      if (+el.gfHigh.value < gl) el.gfHigh.value = gl;
      const plan = B.plan(depth, time, fo2, gl, gh);
      const tr = B.trace(plan.pts, fo2, 0.1);
      // Directeur : le compartiment au plafond le plus profond en arrivant au 1er palier (sinon en surface, GF haut)
      const iF = plan.first ? plan.pts.findIndex(q => q[0] > time && q[1] === plan.first) : -1;
      const ref = at(tr, iF > 0 ? plan.pts[iF][0] : plan.total);
      const gRef = (iF > 0 ? gl : gh) / 100;
      let lead = 0, cMax = -Infinity;
      ref.T.forEach((p, i) => {
        const a = B.ZHL16C[i][1], b = B.ZHL16C[i][2], g = gRef;
        const c = (p - a * g) / (g / b + 1 - g);
        if (c > cMax) { cMax = c; lead = i; }
      });
      const mn = L.evaluate({ bottom: L.squareBottom(depth, time), fo2, nitrox: pct > 21, gear: { tank: 15, press: 200, sac: 20, reserve: 50 } });
      const mnTr = mn.prof ? mn90Trace(mn.prof.pts, fo2, 0.1) : null;
      R = { depth, time, pct, fo2, gl, gh, plan, tr, lead, mn, mnTr };
      R.comp = S.comp === 'auto' ? lead : +S.comp;
      const tMax = Math.max(plan.total, mn.prof ? mn.prof.total : 0);
      el.tCur.max = tMax.toFixed(1);
      return R;
    }

    function render(keepTime) {
      const prevMax = +el.tCur.max, prev = +el.tCur.value;
      compute();
      if (!keepTime) el.tCur.value = R.time;           // par défaut : au départ du fond (repère 1)
      else if (prev > +el.tCur.max || prev >= prevMax - 1e-9) el.tCur.value = Math.min(prev, +el.tCur.max);
      el.vDepth.textContent = R.depth; el.vTime.textContent = R.time; el.vGas.textContent = gasName(R.pct);
      el.vLow.textContent = R.gl; el.vHigh.textContent = R.gh;
      el.presets.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.l === R.gl && +b.dataset.h === R.gh));
      el.model.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === S.model));
      const p = R.plan, mn = R.mn;
      el.duo.innerHTML = `<div class="on"><span>GF ${R.gl}/${R.gh}</span><b>${fmt(p.dtr, 0)}′ DTR</b><small>${stopsTxt(p.stops)}</small></div>
        <div><span>Table MN90</span><b>${mn.tab && !mn.tab.err ? mn.tab.dtr + '′ DTR' : '—'}</b><small>${mn.tab && !mn.tab.err ? stopsTxt(mn.tab.stops) : (mn.tab ? mn.tab.err : '')}</small></div>`;
      el.gfHint.innerHTML = R.gl >= 85 && R.gh >= 85 ? 'Dans la zone conseillée par le cours (entre 85 et 100).'
        : `Plus prudent que la zone conseillée (85 à 100) : ${R.gl < 85 ? 'GF bas plus bas = <b>premier palier plus profond</b>' : ''}${R.gl < 85 && R.gh < 85 ? ' ; ' : ''}${R.gh < 85 ? 'GF haut plus bas = <b>dernier palier plus long</b>' : ''}.`;
      drawAll();
      renderCmp();
      renderProf();
      renderRead();
      renderQ();
    }

    function drawAll() {
      el.pPlot.innerHTML = pChart();
      el.bPlot.innerHTML = bChart();
      el.zPlot.innerHTML = zChart();
      const t = +el.tCur.value, s = at(R.tr, t);
      el.vCur.textContent = `${L.mmss ? L.mmss(t) : fmt(t, 1) + ' min'} · ${fmt(s.z, 1)} m`;
    }

    // Grand écran : le graphique prend la taille de sa zone
    const DASH = window.matchMedia('(min-width: 1000px) and (min-height: 600px)');
    function plotSize(box, w, h) {
      if (DASH.matches && box.clientWidth > 200 && box.clientHeight > 100) return [box.clientWidth, box.clientHeight];
      return [Math.max(280, Math.min(box.clientWidth || w, 700)), h];
    }
    const svgText = (x, y, txt, o) => `<text x="${x}" y="${y}" font-size="${(o && o.fs) || 11}" ${o && o.anchor ? `text-anchor="${o.anchor}"` : ''} font-weight="${(o && o.fw) || 400}" style="fill:${(o && o.c) || 'var(--text2)'};paint-order:stroke;stroke:var(--water1);stroke-width:3px">${txt}</text>`;

    /* ---------- Graphique du cours : tension / pression absolue ---------- */
    function pChart() {
      const [W, H] = plotSize(el.pPlot, 520, 300); const m = { l: 44, r: 12, t: 12, b: 30 };
      const i = R.comp, a = B.ZHL16C[i][1], b = B.ZHL16C[i][2];
      const pMax = Math.ceil(B.pabs(R.depth) + 0.3), gl = R.gl / 100, gh = R.gh / 100;
      const tMaxY = Math.ceil(Math.max(B.mValue(i, pMax) * 0.75, ...R.tr.map(s => s.T[i])) + 0.3);
      const X = p => m.l + p / pMax * (W - m.l - m.r);
      const Y = v => H - m.b - Math.min(v, tMaxY) / tMaxY * (H - m.t - m.b);
      const line = f => { const pts = []; for (let p = 0; p <= pMax + 1e-9; p += pMax / 60) pts.push(`${X(p).toFixed(1)},${Y(f(p)).toFixed(1)}`); return pts.join(' '); };
      let g = `<rect width="${W}" height="${H}" style="fill:var(--water1)"/>`;
      // Zones : sous la pression ambiante (le tissu se charge), entre ambiante et M-value (désaturation), au-dessus (bulles)
      const poly = (f1, f2) => { const up = [], dn = []; for (let p = 0; p <= pMax + 1e-9; p += pMax / 60) { up.push(`${X(p)},${Y(f1(p))}`); dn.unshift(`${X(p)},${Y(f2(p))}`); } return up.concat(dn).join(' '); };
      g += `<polygon points="${poly(p => p, () => 0)}" style="fill:var(--c4)" fill-opacity=".10"/>`;
      g += `<polygon points="${poly(p => B.mValue(i, p), p => p)}" style="fill:var(--ok)" fill-opacity=".10"/>`;
      g += `<polygon points="${poly(() => tMaxY, p => B.mValue(i, p))}" style="fill:var(--danger)" fill-opacity=".10"/>`;
      for (let v = 0; v <= tMaxY; v += 1) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--grid)"/>${svgText(m.l - 5, Y(v) + 4, v, { anchor: 'end' })}`;
      for (let p = 0; p <= pMax; p += 1) g += `<line x1="${X(p)}" x2="${X(p)}" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--grid)"/>${svgText(X(p), H - 12, p, { anchor: 'middle' })}`;
      g += svgText(W - m.r, H - 2, 'Pression absolue (bar)', { anchor: 'end', fs: 10 });
      g += svgText(m.l + 4, m.t + 10, 'Tension N₂ (bar)', { fs: 10 });
      // Lignes de référence
      g += `<polyline points="${line(p => p)}" fill="none" style="stroke:var(--text2)" stroke-width="2"/>`;
      g += `<polyline points="${line(p => B.mValue(i, p))}" fill="none" style="stroke:var(--danger)" stroke-width="2.5"/>`;
      g += `<polyline points="${line(p => B.gfLine(i, p, gl))}" fill="none" style="stroke:var(--accent)" stroke-width="1.3" stroke-dasharray="5 4" opacity=".75"/>`;
      if (gh !== gl) g += `<polyline points="${line(p => B.gfLine(i, p, gh))}" fill="none" style="stroke:var(--accent)" stroke-width="1.3" stroke-dasharray="2 4" opacity=".75"/>`;
      // Ligne GF réellement suivie : du GF bas au 1er palier au GF haut en surface
      const pf = R.plan.first ? B.pabs(R.plan.first) : 1;
      g += `<line x1="${X(pf)}" y1="${Y(B.gfLine(i, pf, gl))}" x2="${X(1)}" y2="${Y(B.gfLine(i, 1, gh))}" style="stroke:var(--accent)" stroke-width="4" stroke-linecap="round"/>`;
      g += svgText(X(pMax) - 4, Y(B.mValue(i, pMax)) + 14, 'M-value', { anchor: 'end', c: 'var(--danger)', fw: 800 });
      g += svgText(X(pMax) - 4, Y(B.gfLine(i, pMax, gl)) + 14, `GF bas ${R.gl} %`, { anchor: 'end', c: 'var(--accent)', fw: 700, fs: 10 });
      g += svgText(X(pMax) - 4, Y(pMax) + 14, 'Pression absolue', { anchor: 'end', fw: 700, fs: 10 });
      g += svgText(X(pMax * 0.3), Y(tMaxY) + 16, '💥 Bulles', { c: 'var(--danger)', fw: 800 });
      g += svgText(X(pMax * 0.62), Y(pMax * 0.62 * 0.45), '⬇ Saturation (le tissu se charge)', { c: 'var(--c4)', fw: 700, fs: 10, anchor: 'middle' });
      // Trajet du tissu suivi
      const path = R.tr.map(s => `${X(s.p).toFixed(1)},${Y(s.T[i]).toFixed(1)}`).join(' ');
      g += `<polyline points="${path}" fill="none" style="stroke:var(--c1)" stroke-width="3" stroke-linejoin="round"/>`;
      // Repères du cours : 1 fond, 2 premier palier, 3 dernier palier
      const marks = [];
      marks.push([at(R.tr, R.time), '1']);
      const pts = R.plan.pts;
      if (R.plan.first) {
        const iF = pts.findIndex(q => q[0] > R.time && q[1] === R.plan.first);
        if (iF > 0) marks.push([at(R.tr, pts[iF][0]), '2']);
        let iL = -1;
        for (let k = pts.length - 1; k > 0; k--) if (pts[k][1] === 3 && pts[k - 1][1] === 3) { iL = k; break; }
        if (iL > 0) marks.push([at(R.tr, pts[iL][0]), '3']);
      }
      // Instant choisi (dessiné avant les repères pour ne pas les masquer)
      const s = at(R.tr, +el.tCur.value), gr = B.gradient(i, s.T[i], s.p) * 100;
      g += `<line x1="${X(s.p)}" x2="${X(s.p)}" y1="${Y(s.p)}" y2="${Y(s.T[i])}" style="stroke:var(--text)" stroke-width="1.5" stroke-dasharray="3 3"/>`;
      g += `<circle cx="${X(s.p)}" cy="${Y(s.T[i])}" r="13" style="fill:var(--c1)" fill-opacity=".35"/>`;
      marks.forEach(([s, n]) => {
        g += `<circle cx="${X(s.p)}" cy="${Y(s.T[i])}" r="9" style="fill:var(--surface);stroke:var(--c1)" stroke-width="2"/><text x="${X(s.p)}" y="${Y(s.T[i]) + 4}" font-size="11" font-weight="800" text-anchor="middle" style="fill:var(--text)">${n}</text>`;
      });
      g += `<circle cx="${X(s.p)}" cy="${Y(s.T[i])}" r="5" style="fill:var(--c1);stroke:var(--surface)" stroke-width="2"/>`;
      g += svgText(Math.min(X(s.p) + 10, W - 150), Math.max(Y(s.T[i]) - 10, m.t + 24), `C${i + 1} : ${fmt(s.T[i], 2)} b · ${gr >= 0 ? fmt(gr, 0) + ' % du gradient' : 'se charge'}`, { c: 'var(--text)', fw: 800, fs: 12 });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tension du compartiment selon la pression absolue">${g}</svg>`;
    }

    /* ---------- Barres des compartiments à l'instant choisi ---------- */
    function bChart() {
      const [W, H] = plotSize(el.bPlot, 520, 200); const m = { l: 40, r: 8, t: 14, b: 26 };
      const t = +el.tCur.value;
      let g = `<rect width="${W}" height="${H}" style="fill:var(--water1)"/>`;
      if (S.model === 'mn') {
        if (!R.mnTr) return `<svg viewBox="0 0 ${W} ${H}">${g}${svgText(W / 2, H / 2, 'Plongée hors table MN90', { anchor: 'middle', fw: 800 })}</svg>`;
        const s = at(R.mnTr, Math.min(t, R.mnTr[R.mnTr.length - 1].t)), pamb = L.pabs(s.z), C = L.COMPARTMENTS;
        const yMax = 110, Y = v => H - m.b - Math.max(0, Math.min(v, yMax)) / yMax * (H - m.t - m.b);
        const bw = (W - m.l - m.r) / C.length;
        [0, 50, 100].forEach(v => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:${v === 100 ? 'var(--danger)' : 'var(--grid)'}" stroke-width="${v === 100 ? 2 : 1}"/>${svgText(m.l - 4, Y(v) + 4, v + ' %', { anchor: 'end', fs: 10 })}`; });
        C.forEach(([per, sc], j) => {
          const v = s.T[j] / (sc * pamb) * 100, x = m.l + j * bw + 2, y = Y(v);
          const c = v > 100 ? 'var(--danger)' : v > 85 ? 'var(--warn)' : 'var(--ok)';
          g += `<rect x="${x}" y="${y}" width="${bw - 4}" height="${H - m.b - y}" rx="3" style="fill:${c}" fill-opacity=".85"/>`;
          g += svgText(x + (bw - 4) / 2, H - m.b + 13, per, { anchor: 'middle', fs: 10 });
          if (bw > 26) g += svgText(x + (bw - 4) / 2, Math.max(y - 3, m.t + 9), fmt(v, 0), { anchor: 'middle', fs: 9.5, c: 'var(--text)', fw: 700 });
        });
        g += svgText(W - m.r, m.t + 2, `MN90 : tension / (Sc × Pabs) · ${fmt(s.z, 1)} m`, { anchor: 'end', fs: 10 });
        g += svgText(W - m.r, H - 2, 'période (min)', { anchor: 'end', fs: 9.5 });
        return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Compartiments MN90 en pourcentage du seuil">${g}</svg>`;
      }
      const s = at(R.tr, t), Z = B.ZHL16C;
      const yMin = -100, yMax = 120;
      const Y = v => m.t + (yMax - Math.max(yMin, Math.min(v, yMax))) / (yMax - yMin) * (H - m.t - m.b);
      const bw = (W - m.l - m.r) / Z.length;
      // GF autorisé à cette profondeur pendant la déco (interpolé), sinon GF haut
      const first = R.plan.first, gfNow = first && s.t > R.time && s.z <= first ? R.gh - (R.gh - R.gl) * s.z / first : (s.t > R.time ? R.gl : R.gh);
      [-100, -50, 0, 50, 100].forEach(v => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:${v === 100 ? 'var(--danger)' : v === 0 ? 'var(--text2)' : 'var(--grid)'}" stroke-width="${v === 100 || v === 0 ? 2 : 1}"/>${svgText(m.l - 4, Y(v) + 4, v + ' %', { anchor: 'end', fs: 10 })}`; });
      g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(gfNow)}" y2="${Y(gfNow)}" style="stroke:var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>`;
      Z.forEach((c, j) => {
        const v = B.gradient(j, s.T[j], s.p) * 100, x = m.l + j * bw + 2;
        const y0 = Y(0), y1 = Y(v);
        const col = v < 0 ? 'var(--c4)' : v > 100 ? 'var(--danger)' : v > gfNow ? 'var(--warn)' : 'var(--ok)';
        g += `<rect x="${x}" y="${Math.min(y0, y1)}" width="${bw - 4}" height="${Math.max(1, Math.abs(y1 - y0))}" rx="2" style="fill:${col}" fill-opacity="${j === R.comp ? 1 : 0.7}"/>`;
        if (j === R.comp) g += `<rect x="${x - 1.5}" y="${Math.min(y0, y1) - 1.5}" width="${bw - 1}" height="${Math.abs(y1 - y0) + 3}" rx="3" fill="none" style="stroke:var(--text)" stroke-width="1.5"/>`;
        g += svgText(x + (bw - 4) / 2, H - m.b + 13, j + 1, { anchor: 'middle', fs: 10, fw: j === R.comp ? 800 : 400, c: j === R.comp ? 'var(--text)' : 'var(--text2)' });
      });
      g += svgText(W - m.r, m.t + 2, `${fmt(s.z, 1)} m · GF autorisé ${fmt(gfNow, 0)} % · 100 % = M-value`, { anchor: 'end', fs: 10, c: 'var(--text)', fw: 700 });
      g += svgText(m.l + 4, H - m.b - 4, 'sous 0 : le tissu se charge', { fs: 9.5, c: 'var(--c4)' });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gradient de chaque compartiment Bühlmann">${g}</svg>`;
    }

    /* ---------- Profils GF et MN90 ---------- */
    function zChart() {
      const [W, H] = [Math.max(300, el.zPlot.clientWidth || 380), 230]; const m = { l: 34, r: 8, t: 10, b: 24 };
      const mnPts = R.mn.prof ? R.mn.prof.pts : [];
      const tMax = Math.max(R.plan.total, mnPts.length ? mnPts[mnPts.length - 1][0] : 0);
      const zMax = Math.ceil(R.depth / 10) * 10;
      const X = t => m.l + t / tMax * (W - m.l - m.r), Y = z => m.t + z / zMax * (H - m.t - m.b);
      let g = `<rect width="${W}" height="${H}" style="fill:var(--water1)"/>`;
      for (let z = 0; z <= zMax; z += 10) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(z)}" y2="${Y(z)}" style="stroke:var(--grid)"/>${svgText(m.l - 4, Y(z) + 4, z, { anchor: 'end', fs: 10 })}`;
      for (let t = 0; t <= tMax; t += 10) g += svgText(X(t), H - 8, t + '′', { anchor: 'middle', fs: 10 });
      [3, 6, 9, 12, 15].forEach(z => { if (z < zMax) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(z)}" y2="${Y(z)}" style="stroke:var(--p${z})" stroke-opacity=".35" stroke-dasharray="3 3"/>`; });
      if (mnPts.length) g += `<polyline points="${mnPts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}" fill="none" style="stroke:var(--text2)" stroke-width="2" stroke-dasharray="6 4"/>`;
      g += `<polyline points="${R.plan.pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')}" fill="none" style="stroke:var(--accent)" stroke-width="3"/>`;
      const t = +el.tCur.value;
      g += `<line x1="${X(t)}" x2="${X(t)}" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--text)" stroke-opacity=".5"/>`;
      g += svgText(W - m.r, m.t + 12, `— GF ${R.gl}/${R.gh}   - - MN90`, { anchor: 'end', fs: 10.5, c: 'var(--text)', fw: 700 });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Profils de plongée GF et MN90">${g}</svg>`;
    }

    function renderCmp() {
      const list = PAIRS.slice();
      if (!list.some(([a, b]) => a === R.gl && b === R.gh)) list.push([R.gl, R.gh]);
      const rows = list.map(([a, b]) => {
        const p = B.plan(R.depth, R.time, R.fo2, a, b);
        return { a, b, p, last: p.stops[3] || 0, s10: share10(p, R.time) };
      });
      const mn = R.mn;
      const mnRow = mn.prof ? (() => {
        const tab = mn.tab, z = Object.keys(tab.stops).map(Number), f = z.length ? Math.max(...z) : 0;
        const fake = { pts: mn.prof.pts, total: mn.prof.total, dtr: mn.prof.total - R.time };
        return `<tr class="mn"><td>Table MN90</td><td>${tab.dtr}′</td><td>${f ? `${f} m (${tab.stops[f]}′)` : '—'}</td><td>${tab.stops[3] || 0}′</td><td>${fmt(share10(fake, R.time), 0)} %</td></tr>`;
      })() : '';
      el.cmpTbl.innerHTML = `<thead><tr><th>GF</th><th>DTR</th><th>1er palier</th><th>Palier 3 m</th><th>% DTR à &lt; 10 m</th></tr></thead><tbody>` +
        rows.map(r => `<tr class="${r.a === R.gl && r.b === R.gh ? 'cur' : ''}" data-l="${r.a}" data-h="${r.b}"><td>${r.a}/${r.b}</td><td>${fmt(r.p.dtr, 0)}′</td><td>${firstTxt(r.p)}</td><td>${r.last}′</td><td>${fmt(r.s10, 0)} %</td></tr>`).join('') + mnRow + '</tbody>';
      const isRef = R.depth === 50 && R.time === 15 && R.pct === 21;
      el.cmpNotes.innerHTML = [
        ['Ce qu’il faut voir', 'plus les GF baissent, plus la DTR s’allonge et plus on passe de temps près de la surface.'],
        ['GF bas', 'règle la profondeur du <b>premier palier</b> : plus il est bas, plus on s’arrête profond.'],
        ['GF haut', 'règle la <b>sortie</b> : plus il est bas, plus le dernier palier est long.'],
        ['Conseil du cours', 'préférer des valeurs <b>entre 85 et 100</b>.'],
        isRef ? ['Exemple du cours', '50 m, 15 min à l’air : c’est la plongée du tableau du cours. Les écarts d’une ou deux minutes viennent des réglages de l’ordinateur (vitesses, arrondis).'] : ['Exemple du cours', '<a href="#" data-ref>Charger la plongée du cours : 50 m, 15 min, air</a>.'],
      ].map(([t, x]) => `<div><em>${t}</em>${x}</div>`).join('');
    }

    function renderProf() {
      const p = R.plan, mn = R.mn;
      el.profSteps.innerHTML = [
        ['GF ' + R.gl + '/' + R.gh, `${stopsTxt(p.stops)} · DTR <b>${fmt(p.dtr, 0)}′</b> · sortie à ${fmt(p.total, 0)}′.`],
        ['MN90', mn.prof ? `${stopsTxt(mn.tab.stops)} · DTR <b>${mn.tab.dtr}′</b> (ligne ${mn.tab.d} m / ${mn.tab.t}′${R.pct > 21 ? `, PEA ${fmt(mn.pea, 1)} m` : ''}).` : (mn.tab.err || '—')],
        ['Vitesses', 'GF : remontée 10 m/min puis 6 m/min entre paliers (réglage courant des ordinateurs). MN90 : 15 m/min, puis 6 m/min.'],
      ].map(([t, x]) => `<div><em>${t}</em>${x}</div>`).join('');
    }

    function renderRead() {
      const i = R.comp, c = B.ZHL16C[i];
      el.readSteps.innerHTML = [
        ['Les axes', 'en bas la <b>pression absolue</b> (1 bar en surface, +1 bar tous les 10 m) ; à gauche la <b>tension d’azote</b> dans le tissu.'],
        ['Ligne grise', '<b>pression absolue</b> : tension = pression ambiante. En dessous, le tissu se charge (saturation) ; au-dessus, il se vide (désaturation).'],
        ['Ligne rouge', `<b>M-value</b> du compartiment C${i + 1} (période ${fmt(c[0], 1)} min) : la tension maximale tolérée. Au-dessus : bulles.`],
        ['Ligne bleue épaisse', `<b>ligne GF</b> : on ne s’autorise que ${R.gl} % de l’écart entre ambiante et M-value au premier palier, puis ${R.gh} % en surface.`],
        ['Courbe du tissu', '<b>1</b> fin du fond : le tissu est chargé. En remontant, la pression baisse plus vite que la tension : la courbe monte vers la ligne GF. <b>2</b> premier palier, <b>3</b> dernier palier : on attend que la tension baisse avant de remonter.'],
        ['ΔTension', 'l’écart entre la courbe du tissu et la pression absolue est l’azote à évacuer : c’est lui qui fait la DTR.'],
        ['Les barres', 'chaque compartiment en % de son gradient : 0 % = pression ambiante, 100 % = M-value. Le pointillé bleu est le GF autorisé à cette profondeur.'],
      ].map(([t, x]) => `<div><em>${t}</em>${x}</div>`).join('');
    }

    function renderQ() {
      const q = R.depth * Math.sqrt(R.time);
      const idx = QRISK.findIndex(r => r[0] >= q);
      el.qSteps.innerHTML = [
        ['Formule', `Q = profondeur × √(temps au fond) = ${R.depth} × √${R.time} = <b>${fmt(q, 0)}</b>`],
        ['Lecture', idx < 0 ? 'au-delà de 750 : hors de toute plongée raisonnable.' : `entre ${idx ? QRISK[idx - 1][0] : 0} et ${QRISK[idx][0]} : risque statistique d’accident de l’ordre de <b>${QRISK[idx][1]}</b>.`],
        ['Bon à savoir', 'un accident de décompression peut apparaître jusqu’à 24 h après (la moitié dans les 10 premières minutes). Le réflexe : <b>oxygène</b>.'],
      ].map(([t, x]) => `<div><em>${t}</em>${x}</div>`).join('');
      el.qTbl.innerHTML = '<thead><tr><th>Q</th><th>Risque</th></tr></thead><tbody>' + QRISK.map((r, k) => `<tr class="${k === idx ? 'cur' : ''}"><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</tbody>';
    }

    /* ---------- Événements ---------- */
    [el.depth, el.time, el.o2, el.gfLow, el.gfHigh].forEach(i => i.addEventListener('input', () => render(false)));
    el.tCur.addEventListener('input', drawAll);
    el.presets.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; el.gfLow.value = b.dataset.l; el.gfHigh.value = b.dataset.h; render(true); });
    el.cmpTbl.addEventListener('click', e => { const tr = e.target.closest('tr[data-l]'); if (!tr) return; el.gfLow.value = tr.dataset.l; el.gfHigh.value = tr.dataset.h; render(true); });
    el.cmpNotes.addEventListener('click', e => { if (!e.target.closest('[data-ref]')) return; e.preventDefault(); el.depth.value = 50; el.time.value = 15; el.o2.value = 21; render(false); });
    el.comp.addEventListener('change', () => { S.comp = el.comp.value; render(true); });
    el.model.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.model = b.dataset.v; render(true); });
    el.tabs.addEventListener('click', e => {
      const b = e.target.closest('.ptab'); if (!b) return;
      el.tabs.querySelectorAll('.ptab').forEach(x => x.classList.toggle('on', x === b));
      document.querySelectorAll('.pane[data-pane]').forEach(pn => { pn.hidden = pn.dataset.pane !== b.dataset.pane; });
      if (b.dataset.pane === 'prof') el.zPlot.innerHTML = zChart();
    });
    // Lecture animée de toute la plongée
    el.play.addEventListener('click', () => {
      if (S.playing) { clearInterval(S.playing); S.playing = null; el.play.textContent = '▶'; return; }
      if (+el.tCur.value >= +el.tCur.max - 0.1) el.tCur.value = 0;
      el.play.textContent = '⏸';
      const step = +el.tCur.max / 240;
      S.playing = setInterval(() => {
        const v = Math.min(+el.tCur.max, +el.tCur.value + step);
        el.tCur.value = v; drawAll();
        if (v >= +el.tCur.max) { clearInterval(S.playing); S.playing = null; el.play.textContent = '▶'; }
      }, 40);
    });
    const nav = document.querySelector('.navbar');
    const setNavH = () => { if (nav) document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px'); };
    setNavH();
    window.addEventListener('resize', setNavH);
    if (window.ResizeObserver) {
      let last = '';
      const ro = new ResizeObserver(() => {
        const k = [el.pPlot, el.bPlot, el.zPlot].map(x => x.clientWidth + 'x' + x.clientHeight).join('|');
        if (k !== last && R) { last = k; drawAll(); }
      });
      [el.pPlot, el.bPlot, el.zPlot].forEach(x => ro.observe(x));
    }
    render(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
