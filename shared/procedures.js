/* ============================================================
   MN90 Mobile — Procédures (remontée rapide, panne d'ordinateur,
   palier interrompu, remontée lente) et fiche réflexe accident.
   D'après le mode d'emploi des tables fédérales FFESSM (Blanchard & Imbert).
   Dépend de shared/mn90.js. Expose window.MN90Procedures.
   ============================================================ */
(function () {
  'use strict';
  const L = window.MN90Lib;
  if (!L) { console.error('[procédures] MN90Lib manquante'); return; }
  const { fmt, mmss } = L;

  function miniChart(pts, segs, mark) {
    const W = 460, H = 190, m = { l: 30, r: 8, t: 14, b: 20 };
    const maxT = pts[pts.length - 1][0] * 1.03, maxZ = Math.max(10, Math.ceil(Math.max(...pts.map(p => p[1])) / 5) * 5);
    const X = t => m.l + t / maxT * (W - m.l - m.r), Y = z => m.t + z / maxZ * (H - m.t - m.b);
    let g = `<rect width="${W}" height="${H}" style="fill:var(--water1)"/>`;
    for (let z = 0; z <= maxZ; z += maxZ > 30 ? 10 : 5) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(z)}" y2="${Y(z)}" style="stroke:var(--grid)"/><text x="${m.l - 4}" y="${Y(z) + 4}" font-size="10" text-anchor="end" style="fill:var(--text2)">${z}</text>`;
    g += `<polyline points="${pts.map(([t, z]) => `${X(t)},${Y(z)}`).join(' ')}" fill="none" style="stroke:var(--c1)" stroke-width="2.5" stroke-linejoin="round"/>`;
    segs.forEach(s => { g += `<line x1="${X(s.from)}" x2="${X(s.to)}" y1="${Y(s.depth)}" y2="${Y(s.depth)}" style="stroke:var(--p${s.depth})" stroke-width="6" stroke-linecap="round"/>`; });
    if (mark) {
      g += `<line x1="${X(mark.t0)}" x2="${X(mark.t0)}" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--danger)" stroke-dasharray="4 3"/>`;
      g += `<text x="${X(mark.t0) + 4}" y="${m.t + 10}" font-size="11" font-weight="700" style="fill:var(--danger)">remontée rapide</text>`;
      g += `<line x1="${X(mark.t1)}" x2="${X(mark.t2)}" y1="${Y(mark.mid)}" y2="${Y(mark.mid)}" style="stroke:var(--danger)" stroke-width="6" stroke-linecap="round"/>`;
      g += `<text x="${(X(mark.t1) + X(mark.t2)) / 2}" y="${Y(mark.mid) + 18}" font-size="11" font-weight="700" text-anchor="middle" style="fill:var(--danger)">${fmt(mark.mid, Number.isInteger(mark.mid) ? 0 : 1)} m · 5′</text>`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;border-radius:10px;border:1px solid var(--border)" role="img" aria-label="Profil de la procédure">${g}</svg>`;
  }

  function html(r) {
    if (!r || !r.prof) return '';
    const ra = L.rapidAscent(r);
    const sl = L.slowAscent(r, 10);
    const st = L.stopList(r.tab.stops);
    let out = `<h3 style="margin-bottom:6px">⬆️ Remontée rapide (plus de 15 à 17 m/min)</h3>`;
    if (!ra || ra.err) {
      out += `<div class="alert danger">Procédure hors table${ra ? ` (${ra.err})` : ''} : oxygène pur, alerte des secours, évacuation.</div>`;
    } else {
      const pst = L.stopList(ra.stops);
      const midTxt = fmt(ra.mid, Number.isInteger(ra.mid) ? 0 : 1);
      out += `<div class="steps" style="margin:0 0 10px">
        <div><em>1.</em>Seulement si le plongeur va bien et que la réimmersion est possible <b>en moins de 3 min</b>.</div>
        <div><em>2.</em>Redescendre à la <b>demi-profondeur : ${midTxt} m</b> (moitié de ${ra.ref} m${r.nitrox ? ', profondeur réelle au Nitrox' : ', profondeur de la table'}).</div>
        <div><em>3.</em><b>Palier de 5 min</b> à ${midTxt} m, puis remontée à 15–17 m/min.</div>
        <div><em>4.</em>Nouvelle durée de plongée : du début de la plongée à la fin du palier de ${midTxt} m ≈ <b>${ra.duration} min</b> → table ${ra.tab.d} m / ${ra.tab.t}′.</div>
        <div><em>5.</em>Paliers : ${pst.map(s => `<span class="pd${s}" style="font-weight:800">${s} m ${ra.stops[s]}′</span>`).join(' + ')}${(r.tab.stops[3] || 0) < 2 || !ra.tab.stops[3] || ra.tab.stops[3] < 2 ? ' (3 m porté au minimum de 2 min)' : ''}. Beaucoup de clubs ajoutent aussi 3 min de palier de sécurité.</div>
      </div>`;
      const bi = ra.prof.pts.findIndex(p => p[0] >= r.prof.bottomEnd - 1e-9);
      const t1 = ra.prof.pts.find(p => p[0] > ra.tSurface + 3 - 1e-9 && Math.abs(p[1] - ra.mid) < 1e-9);
      out += miniChart(ra.prof.pts, ra.prof.segs, t1 ? { t0: ra.prof.pts[bi][0], t1: t1[0], t2: t1[0] + 5, mid: ra.mid } : null);
      out += `<p class="small muted" style="margin-top:6px">Hypothèses : remontée rapide au départ du fond, 3 min en surface. Sortie de l’eau vers ${Math.round(ra.prof.total)}′.</p>`;
    }
    out += `<div class="alert danger" style="margin-top:10px">Réimmersion impossible en moins de 3 min, ou le moindre symptôme : <b>oxygène pur</b>, alerte (<b>196</b> CROSS en mer, <b>112</b> à terre), évacuation. Pas de réimmersion.</div>`;

    // Panne d'ordinateur : on reste entre 3 et 6 m jusqu'à la pression de réserve
    {
      const g = r.gear, zStop = 4.5;
      const ascL = Math.max(0, r.depth - zStop) / L.SPEED.asc * g.sac * ((r.depth + zStop) / 20 + 1);
      const pAt = r.pBottom - ascL / g.tank;
      const minutes = Math.max(0, (pAt - g.reserve) * g.tank / (g.sac * L.pabs(zStop)));
      const need = st.reduce((x, k) => x + r.tab.stops[k], 0);
      out += `<h3 style="margin:16px 0 6px">💻 Panne d’ordinateur</h3>
        <div class="steps" style="margin:0">
          <div><em>1.</em>Préviens ton binôme et <b>suis son ordinateur</b> : même profondeur, mêmes paliers.</div>
          <div><em>2.</em>Sans ordinateur fiable : remonte calmement (sans dépasser 15 m/min) et <b>reste entre 3 et 6 m jusqu’à ta pression de réserve (${g.reserve} b)</b>. Pas de calcul de tête, c’est ton bloc qui décide.</div>
          <div><em>3.</em>Pour cette plongée : tu arrives vers 5 m avec environ <b>${Math.round(pAt)} b</b>, soit <b>${Math.floor(minutes)} min</b> possibles entre 3 et 6 m${need ? `, contre ${need} min de paliers prévus par la table` : ''}.${need && minutes < need ? ' <b style="color:var(--danger)">Pas assez d’air pour couvrir les paliers : partage d’air avec le binôme.</b>' : ''}</div>
          <div><em>4.</em>Conseillé : pas de nouvelle plongée dans les 24 h, ta saturation n’est plus connue.</div>
        </div>`;
    }

    out += `<h3 style="margin:16px 0 6px">⏸️ Palier interrompu</h3>`;
    out += st.length
      ? `<div class="steps" style="margin:0">${st.map(s => `<div><em>${s} m</em>si tu quittes le palier de <span class="pd${s}" style="font-weight:800">${s} m</span> avant la fin : dans les 3 min, redescends à ${s} m et <b>refais les ${r.tab.stops[s]} min en entier</b>, puis continue normalement.</div>`).join('')}</div>`
      : `<p class="muted">Pas de palier obligatoire sur cette plongée. Si le palier de sécurité est interrompu, il n’y a pas de procédure, mais reste prudent.</p>`;

    out += `<h3 style="margin:16px 0 6px">🐢 Remontée lente jusqu’au 1er palier</h3>`;
    if (sl && !sl.tab.err) {
      const ns = L.stopList(sl.tab.stops);
      out += `<p>Exemple à 10 m/min au lieu de 15 : la remontée prend ${mmss(sl.tAsc)}. On l’ajoute à la durée : ${Number.isInteger(r.time) ? r.time : fmt(r.time, 1)} + ${fmt(sl.tAsc, 1)} → <b>${sl.duration} min</b>, table ${sl.tab.d} m / ${sl.tab.t}′ : ${ns.length ? ns.map(s => `<span class="pd${s}" style="font-weight:800">${s} m ${sl.tab.stops[s]}′</span>`).join(' + ') : 'toujours sans palier'}.</p>`;
    }
    out += `<p class="small muted" style="margin-top:8px">Remontée trop rapide <i>entre</i> deux paliers (plus de 6 m/min) : aucun protocole MN90. Source : mode d’emploi des tables fédérales FFESSM (Blanchard &amp; Imbert).</p>`;
    return out;
  }


  // Plongée carrée prête pour html() : ajoute la pression au départ du fond
  function compute(depth, time, fo2, nitrox, gear) {
    const bottom = L.squareBottom(depth, time);
    const r = L.evaluate({ bottom, fo2, nitrox, gear });
    r.gear = gear;
    if (r.prof) r.pBottom = gear.press - L.gasUse(bottom, gear.sac) / gear.tank;
    return r;
  }

  // Fiche réflexe, valable pour toutes les plongées
  function reflex() {
    return `<div class="steps" style="margin:0">
      <div><em>Au moindre doute</em>fatigue anormale, douleur, fourmillements, vertiges, gêne respiratoire, comportement inhabituel après une plongée : <b>c’est un accident jusqu’à preuve du contraire</b>.</div>
      <div><em>1.</em><b>Oxygène pur</b> au masque, tout de suite et sans attendre : c’est le réflexe numéro un.</div>
      <div><em>2.</em><b>Alerter</b> : <b>VHF canal 16</b> ou <b>196</b> (CROSS) en mer, <b>112</b> ou <b>15</b> à terre.</div>
      <div><em>3.</em>Allonger, couvrir, surveiller ; faire boire de l’eau plate si la victime est consciente.</div>
      <div><em>4.</em>Noter le profil de plongée (profondeur, durée, paliers, incident) et suivre les consignes du médecin régulateur.</div>
      <div><em>Rappel</em>les accidents apparaissent le plus souvent dans l’heure qui suit la sortie, mais peuvent survenir jusqu’à 24 h après.</div>
    </div>`;
  }

  window.MN90Procedures = { html, compute, reflex };
})();
