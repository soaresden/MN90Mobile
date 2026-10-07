/* ============================================================
   MN90 Mobile — Outil Nitrox (MOD, best mix, PEA, toxicité O2)
   Dépend de : shared/mn90.js, shared/profile.js, shared/glossary.js
   ============================================================ */
(function () {
  'use strict';

  const NEEDED = ['o2', 'vO2', 'ppSeg', 'modBig', 'modTrio', 'reqMix', 'modSteps', 'modPlot',
    'depth', 'vDepth', 'bestTrio', 'mixTbl', 'sncPlot', 'minutes', 'vMin', 'sncSteps'];
  const PPS = [1.4, 1.5, 1.6];

  function init() {
    const L = window.MN90Lib, P = window.MN90Profile;
    if (!L || !P) { console.error('[nitrox] bibliothèques partagées manquantes'); return; }
    const el = {};
    const missing = NEEDED.filter(id => !(el[id] = document.getElementById(id)));
    if (missing.length) { console.error('[nitrox] éléments manquants :', missing); return; }
    const { fmt } = L;
    const S = { pmax: 1.4 };

    function render() {
      const conf = P.get().nitrox === 'PNC';
      const pct = +el.o2.value, fo2 = pct / 100, depth = +el.depth.value;
      el.vO2.textContent = pct;
      el.vDepth.textContent = depth;
      el.vMin.textContent = el.minutes.value;
      el.ppSeg.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.pmax));

      // ----- MOD -----
      const mod = L.mod(fo2, S.pmax);
      el.modBig.textContent = `${fmt(mod, 1)} m`;
      el.modTrio.innerHTML = PPS.map(p => `<div class="${p === S.pmax ? 'on' : ''}"><b>${fmt(L.mod(fo2, p), 1)} m</b><span>à ${fmt(p, 1)} b</span></div>`).join('');
      const reqs = pct > 21 ? P.requirements({ depth: 0, mode: 'enc', nitrox: true, fo2 }).filter(x => /Nitrox/.test(x.code)) : [];
      const icon = { used: '🟡', missing: '⛔', unknown: '❔' };
      el.reqMix.innerHTML = reqs.map(x => `<div class="req ${x.status}"><span>${icon[x.status] || 'ℹ️'}</span><span><b>${x.code}</b> · ${x.text}</span></div>`).join('');
      const pa = S.pmax / fo2;
      el.modSteps.innerHTML = [
        ['Pression max', `PpO₂ max / FO₂ = ${fmt(S.pmax, 1)} / ${fmt(fo2, 2)} = ${fmt(pa, 3)} b`],
        ['Profondeur', `(${fmt(pa, 3)} − 1) × 10 = ${fmt((pa - 1) * 10, 2)} m → <b>${fmt(mod, 1)} m</b> (arrondi vers le bas : jamais au-delà)`],
        ['Sur le bloc', `on écrit la MOD et le % d’O₂ analysé, avec la date et ses initiales.`],
      ].map(([t, x]) => `<div><em>${t}</em>${x}</div>`).join('');
      el.modPlot.innerHTML = modChart(fo2, conf || pct > 40);

      // ----- Best mix et mélanges à cette profondeur -----
      el.bestTrio.innerHTML = PPS.map(p => {
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
      el.sncPlot.innerHTML = sncChart(pp);
      const lim = L.noaaLimit(pp);
      const snc = pp < 0.6 ? 0 : min / lim * 100;
      const otu = pp > 0.5 ? min * Math.pow((pp - 0.5) / 0.5, 0.83) : 0;
      const row = L.NOAA.find(x => x[0] >= pp - 1e-9);
      el.sncSteps.innerHTML = [
        ['PpO₂', `Nx${pct} à ${depth} m : ${fmt(L.pabs(depth), 1)} × ${fmt(fo2, 2)} = <b>${fmt(pp, 2)} b</b>${pp > S.pmax + 1e-9 ? ` <b style="color:var(--danger)">au-delà de ${fmt(S.pmax, 1)} b : interdit</b>` : ''}`],
        ['Table NOAA', pp < 0.6 ? 'sous 0,6 b : le compteur %SNC ne bouge pas.' : `ligne ${row ? fmt(row[0], 1) : '> 1,8'} b → durée max ${lim} min.`],
        ['%SNC', `${min} / ${lim} × 100 = <b style="color:${snc > 80 ? 'var(--danger)' : snc > 50 ? 'var(--warn)' : 'var(--ok)'}">${fmt(snc, 0)} %</b> de la jauge cerveau.`],
        ['OTU', `${fmt(otu, 0)} OTU sur les 850 d’une journée (jauge poumons).`],
      ].map(([t, x]) => `<div><em>${t}</em>${x}</div>`).join('');
    }

    function modChart(fo2, conf) {
      const W = 420, H = 250, m = { l: 40, r: 10, t: 12, b: 26 };
      const xMax = conf ? 100 : 40, xMin = 21, zMax = 70;
      const X = p => m.l + (p - xMin) / (xMax - xMin) * (W - m.l - m.r);
      const Y = z => m.t + Math.min(z, zMax) / zMax * (H - m.t - m.b);
      let g = `<rect width="${W}" height="${H}" style="fill:var(--water1)"/>`;
      for (let z = 0; z <= zMax; z += 10) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(z)}" y2="${Y(z)}" style="stroke:var(--grid)"/><text x="${m.l - 5}" y="${Y(z) + 4}" font-size="11" text-anchor="end" style="fill:var(--text2)">${z} m</text>`;
      const step = conf ? 10 : 2;
      for (let p = Math.ceil(xMin / step) * step; p <= xMax; p += step) g += `<text x="${X(p)}" y="${H - 8}" font-size="11" text-anchor="middle" style="fill:var(--text2)">${p}%</text>`;
      [[1.4, 'var(--c1)'], [1.5, 'var(--c2)'], [1.6, 'var(--c3)']].forEach(([pp, c]) => {
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

    function sncChart(pp) {
      const W = 420, H = 230, m = { l: 30, r: 6, t: 16, b: 30 };
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
      return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="%SNC par minute selon la PpO2">${g}</svg>`;
    }

    [el.o2, el.depth, el.minutes].forEach(i => i.addEventListener('input', render));
    el.ppSeg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.pmax = +b.dataset.v; render(); } });
    P.onChange(render);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
