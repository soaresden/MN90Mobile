/* ============================================================
   MN90 Mobile — Modèle Bühlmann ZHL-16C avec facteurs de gradient (GF)
   Outil pédagogique : comparer avec la MN90 et voir l'effet des GF.
   Expose window.MN90Buhlmann. Pression : 1 bar en surface + 1 bar / 10 m.
   ============================================================ */
(function () {
  'use strict';

  // ZHL-16C, azote : [période (min), a (bar), b]
  const ZHL16C = [[5.0, 1.1696, 0.5578], [8.0, 1.0, 0.6514], [12.5, 0.8618, 0.7222], [18.5, 0.7562, 0.7825],
    [27.0, 0.62, 0.8126], [38.3, 0.5043, 0.8434], [54.3, 0.441, 0.8693], [77.0, 0.4, 0.891],
    [109.0, 0.375, 0.9092], [146.0, 0.35, 0.9222], [187.0, 0.3295, 0.9319], [239.0, 0.3065, 0.9403],
    [305.0, 0.2835, 0.9477], [390.0, 0.261, 0.9544], [498.0, 0.248, 0.9602], [635.0, 0.2327, 0.9653]];
  const K = ZHL16C.map(c => Math.LN2 / c[0]);
  const PH2O = 0.0627;                       // vapeur d'eau alvéolaire (bar)
  const pabs = z => z / 10 + 1;
  const DEF = { desc: 20, asc: 10, ascStop: 6, step: 3, lastStop: 3 };

  const inspired = (z, fn2) => Math.max(0, pabs(z) - PH2O) * fn2;

  // Équation de Schreiner : variation linéaire de profondeur de z0 à z1 en dt minutes
  function load(T, z0, z1, dt, fn2) {
    if (dt <= 0) return;
    const p0 = inspired(z0, fn2), R = (inspired(z1, fn2) - p0) / dt;
    for (let i = 0; i < T.length; i++) {
      const k = K[i];
      T[i] = p0 + R * (dt - 1 / k) - (p0 - T[i] - R / k) * Math.exp(-k * dt);
    }
  }

  // Plafond (pression absolue tolérée) pour un GF donné
  function ceilingP(T, gf) {
    let c = 0;
    T.forEach((p, i) => {
      const a = ZHL16C[i][1], b = ZHL16C[i][2];
      c = Math.max(c, (p - a * gf) / (gf / b + 1 - gf));
    });
    return c;
  }
  const ceilingDepth = (T, gf) => Math.max(0, (ceilingP(T, gf) - 1) * 10);

  // M-value et ligne GF d'un compartiment à une pression ambiante
  const mValue = (i, p) => ZHL16C[i][1] + p / ZHL16C[i][2];
  const gfLine = (i, p, gf) => p + gf * (mValue(i, p) - p);

  /* Plan de décompression pour une plongée carrée.
     time : durée de plongée (de l'immersion au départ du fond, comme la MN90). */
  function plan(depth, time, fo2, gfLow, gfHigh, opts) {
    const o = Object.assign({}, DEF, opts || {});
    const fn2 = 1 - fo2, gl = gfLow / 100, gh = gfHigh / 100;
    const T = ZHL16C.map(() => (1 - PH2O) * 0.79);
    const pts = [[0, 0]], path = [];              // profil et trajet des tissus
    const snap = (t, z) => path.push({ t, z, T: T.slice() });
    snap(0, 0);
    const tDesc = Math.min(depth / o.desc, time);
    load(T, 0, depth, tDesc, fn2); pts.push([tDesc, depth]); snap(tDesc, depth);
    load(T, depth, depth, time - tDesc, fn2); pts.push([time, depth]); snap(time, depth);
    let t = time, z = depth;
    const stops = {};
    // 1er palier : plafond au GF bas calculé au départ du fond, arrondi au multiple de 3 m supérieur
    let first = 0;
    const nextMult = zz => Math.floor((zz - 1e-9) / o.step) * o.step;
    if (o.firstFromBottom) {
      const c = ceilingDepth(T, gl);
      if (c > 1e-9) {
        const fs = Math.max(o.lastStop, Math.ceil(c / o.step - 1e-9) * o.step);
        const dt = (z - fs) / o.asc;
        load(T, z, fs, dt, fn2); t += dt; z = fs; pts.push([t, z]); snap(t, z);
      }
    }
    while (z > 0 && !(o.firstFromBottom && z % o.step === 0 && ceilingDepth(T, gl) > 1e-9)) {
      const target = z > o.lastStop ? Math.max(nextMult(z), 0) : 0;
      const tt = T.slice();
      const dt = (z - target) / o.asc;
      load(tt, z, target, dt, fn2);
      if (ceilingDepth(tt, gl) > target + 1e-9 && target > 0 || (target === 0 && ceilingDepth(tt, gh) > 1e-9)) { first = z; break; }
      for (let i = 0; i < T.length; i++) T[i] = tt[i];
      t += dt; z = target; pts.push([t, z]); snap(t, z);
      if (target === 0) break;
    }
    // Paliers : GF interpolé de GF bas (1er palier) à GF haut (surface)
    if (z > 0) {
      first = z;
      const gfAt = zz => gh - (gh - gl) * zz / first;
      while (z > 0) {
        const next = z - o.step <= 0 ? 0 : z - o.step;
        let wait = 0;
        while (ceilingDepth(T, gfAt(next)) > next + 1e-9) {
          load(T, z, z, 1, fn2); wait++; t += 1;
          if (wait > 999) break;
        }
        if (wait) { stops[z] = wait; pts.push([t, z]); snap(t, z); }
        const dt = (z - next) / o.ascStop;
        load(T, z, next, dt, fn2); t += dt; z = next; pts.push([t, z]); snap(t, z);
      }
    }
    const dtr = t - time;
    return { stops, first: Object.keys(stops).length ? Math.max(...Object.keys(stops).map(Number)) : 0, dtr, total: t, pts, path, gfLow, gfHigh };
  }

  // Durée max sans palier (GF haut) en minutes entières
  function ndl(depth, fo2, gfHigh, maxT) {
    let best = 0;
    for (let T = 1; T <= (maxT || 200); T++) {
      const p = plan(depth, T, fo2, gfHigh, gfHigh);
      if (Object.keys(p.stops).length) break;
      best = T;
    }
    return best;
  }

  // Suivi des 16 tensions le long d'un profil [[t, z], ...], pas de dt minutes
  function trace(pts, fo2, dt) {
    const fn2 = 1 - fo2, step = dt || 0.2;
    const T = ZHL16C.map(() => (1 - PH2O) * 0.79);
    const out = [{ t: 0, z: 0, p: 1, T: T.slice() }];
    for (let i = 1; i < pts.length; i++) {
      const [t0, z0] = pts[i - 1], [t1, z1] = pts[i];
      const n = Math.max(1, Math.ceil((t1 - t0) / step));
      for (let s = 1; s <= n; s++) {
        const za = z0 + (z1 - z0) * (s - 1) / n, zb = z0 + (z1 - z0) * s / n;
        load(T, za, zb, (t1 - t0) / n, fn2);
        out.push({ t: t0 + (t1 - t0) * s / n, z: zb, p: pabs(zb), T: T.slice() });
      }
    }
    return out;
  }

  // Part du gradient : (tension − ambiante) / (M-value − ambiante). 100 % = M-value, < 0 = le tissu se charge
  const gradient = (i, T, p) => (T - p) / (mValue(i, p) - p);

  window.MN90Buhlmann = { ZHL16C, PH2O, plan, ndl, ceilingP, mValue, gfLine, pabs, trace, gradient };
})();
