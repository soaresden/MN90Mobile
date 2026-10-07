/* ============================================================
   MN90 Mobile — Bibliothèque de calcul partagée
   Tables MN90 FFESSM, PEA Nitrox, toxicité O2, consommation.
   Expose un seul objet global : window.MN90Lib
   ============================================================ */
(function () {
  'use strict';

  // ===== Tables MN90 FFESSM (Blanchard & Imbert) =====
  // { profondeur: [[durée_min, {palier_m: min}, DTR_min, GPS], ...] }
  // GPS "*" = pas de plongée successive possible.
  const MN90 = {"6":[[15,{},1,"A"],[30,{},1,"B"],[45,{},1,"C"],[75,{},1,"D"],[105,{},1,"E"],[135,{},1,"F"],[180,{},1,"G"],[240,{},1,"H"],[315,{},1,"I"],[360,{},1,"J"]],"8":[[15,{},1,"B"],[30,{},1,"C"],[45,{},1,"D"],[60,{},1,"E"],[90,{},1,"F"],[105,{},1,"G"],[135,{},1,"H"],[165,{},1,"I"],[195,{},1,"J"],[255,{},1,"K"],[300,{},1,"L"],[360,{},1,"M"]],"10":[[15,{},1,"B"],[30,{},1,"C"],[45,{},1,"D"],[60,{},1,"F"],[75,{},1,"G"],[105,{},1,"H"],[120,{},1,"I"],[135,{},1,"J"],[165,{},1,"K"],[180,{},1,"L"],[240,{},1,"M"],[255,{},1,"N"],[315,{},1,"O"],[330,{},1,"P"],[360,{"3":1},2,"P"]],"12":[[5,{},1,"A"],[10,{},1,"B"],[15,{},1,"B"],[20,{},1,"C"],[25,{},1,"C"],[30,{},1,"D"],[35,{},1,"D"],[40,{},1,"E"],[45,{},1,"E"],[50,{},1,"F"],[55,{},1,"F"],[60,{},1,"G"],[65,{},1,"G"],[70,{},1,"H"],[75,{},1,"H"],[80,{},1,"H"],[85,{},1,"I"],[90,{},1,"I"],[95,{},1,"J"],[100,{},1,"J"],[105,{},1,"J"],[110,{},1,"K"],[115,{},1,"K"],[120,{},1,"K"],[130,{},1,"L"],[135,{},1,"L"],[140,{"3":2},4,"L"],[150,{"3":4},6,"M"],[160,{"3":6},8,"M"],[170,{"3":7},9,"N"],[180,{"3":9},11,"N"],[190,{"3":11},13,"N"],[200,{"3":13},15,"O"],[210,{"3":14},16,"O"],[220,{"3":15},17,"O"],[230,{"3":16},18,"O"],[240,{"3":17},19,"O"],[250,{"3":18},20,"P"],[255,{"3":19},21,"P"],[270,{"3":22},24,"P"]],"15":[[5,{},1,"A"],[10,{},1,"B"],[15,{},1,"C"],[20,{},1,"C"],[25,{},1,"D"],[30,{},1,"E"],[35,{},1,"E"],[40,{},1,"F"],[45,{},1,"G"],[50,{},1,"G"],[55,{},1,"H"],[60,{},1,"H"],[65,{},1,"I"],[70,{},1,"I"],[75,{},1,"J"],[80,{"3":2},4,"J"],[85,{"3":4},6,"K"],[90,{"3":6},8,"K"],[95,{"3":8},10,"L"],[100,{"3":11},13,"L"],[105,{"3":13},15,"L"],[110,{"3":15},17,"M"],[115,{"3":17},19,"M"],[120,{"3":18},20,"M"]],"18":[[5,{},2,"B"],[10,{},2,"B"],[15,{},2,"C"],[20,{},2,"D"],[25,{},2,"E"],[30,{},2,"F"],[35,{},2,"F"],[40,{},2,"G"],[45,{},2,"H"],[50,{},2,"H"],[55,{"3":1},3,"I"],[60,{"3":5},7,"J"],[65,{"3":8},10,"J"],[70,{"3":11},13,"K"],[75,{"3":14},16,"K"],[80,{"3":17},19,"L"],[85,{"3":21},23,"L"],[90,{"3":23},25,"M"],[95,{"3":26},28,"M"],[100,{"3":28},30,"M"],[105,{"3":31},33,"N"],[110,{"3":34},36,"N"],[115,{"3":36},38,"N"],[120,{"3":38},40,"O"]],"20":[[5,{},2,"B"],[10,{},2,"B"],[15,{},2,"D"],[20,{},2,"D"],[25,{},2,"E"],[30,{},2,"F"],[35,{},2,"G"],[40,{},2,"H"],[45,{"3":1},3,"I"],[50,{"3":4},6,"I"],[55,{"3":9},11,"J"],[60,{"3":13},15,"K"],[65,{"3":16},18,"K"],[70,{"3":20},22,"L"],[75,{"3":24},26,"L"],[80,{"3":27},29,"M"],[85,{"3":30},32,"M"],[90,{"3":34},36,"M"]],"22":[[5,{},2,"B"],[10,{},2,"C"],[15,{},2,"D"],[20,{},2,"E"],[25,{},2,"F"],[30,{},2,"G"],[35,{},2,"H"],[40,{"3":2},4,"I"],[45,{"3":7},9,"I"],[50,{"3":12},14,"J"],[55,{"3":16},18,"K"],[60,{"3":20},22,"K"],[65,{"3":25},27,"L"],[70,{"3":29},31,"L"],[75,{"3":33},35,"M"],[80,{"3":37},39,"M"],[85,{"3":41},43,"N"],[90,{"3":44},46,"N"]],"25":[[5,{},2,"B"],[10,{},2,"C"],[15,{},2,"D"],[20,{},2,"E"],[25,{"3":1},3,"F"],[30,{"3":2},4,"H"],[35,{"3":5},7,"I"],[40,{"3":10},12,"J"],[45,{"3":16},18,"J"],[50,{"3":21},23,"K"],[55,{"3":27},29,"L"],[60,{"3":32},34,"L"],[65,{"3":37},39,"M"],[70,{"6":1,"3":41},45,"M"],[75,{"6":4,"3":43},50,"N"],[80,{"6":7,"3":45},55,"N"],[85,{"6":9,"3":48},60,"O"],[90,{"6":11,"3":50},64,"O"]],"28":[[5,{},2,"B"],[10,{},2,"D"],[15,{},2,"E"],[20,{"3":1},4,"F"],[25,{"3":2},5,"G"],[30,{"3":6},9,"H"],[35,{"3":12},15,"I"],[40,{"3":19},22,"J"],[45,{"3":25},28,"K"],[50,{"3":32},35,"L"],[55,{"6":2,"3":36},41,"M"],[60,{"6":4,"3":40},47,"M"],[65,{"6":8,"3":43},54,"N"],[70,{"6":11,"3":46},60,"N"],[75,{"6":14,"3":48},65,"O"],[80,{"6":17,"3":50},70,"O"],[85,{"6":20,"3":53},76,"O"],[90,{"6":23,"3":56},82,"P"]],"30":[[5,{},2,"B"],[10,{},2,"D"],[15,{"3":1},4,"E"],[20,{"3":2},5,"F"],[25,{"3":4},7,"H"],[30,{"3":9},12,"I"],[35,{"3":17},20,"J"],[40,{"3":24},27,"K"],[45,{"6":1,"3":31},35,"L"],[50,{"6":3,"3":36},42,"M"],[55,{"6":6,"3":39},48,"M"],[60,{"6":10,"3":43},56,"N"],[65,{"6":14,"3":46},63,"N"],[70,{"6":17,"3":48},68,"O"]],"32":[[5,{},3,"B"],[10,{},3,"D"],[15,{"3":1},4,"E"],[20,{"3":3},6,"G"],[25,{"3":6},9,"H"],[30,{"3":14},17,"I"],[35,{"3":22},25,"K"],[40,{"6":1,"3":29},33,"K"],[45,{"6":4,"3":34},41,"L"],[50,{"6":7,"3":39},49,"M"],[55,{"6":11,"3":43},57,"N"],[60,{"6":15,"3":46},64,"N"],[65,{"6":19,"3":48},70,"O"],[70,{"6":23,"3":50},76,"O"]],"35":[[5,{},3,"C"],[10,{},3,"D"],[15,{"3":2},5,"F"],[20,{"3":5},8,"H"],[25,{"3":11},14,"I"],[30,{"6":1,"3":20},24,"J"],[35,{"6":2,"3":27},32,"K"],[40,{"6":5,"3":34},42,"L"],[45,{"6":9,"3":39},51,"M"],[50,{"6":14,"3":43},60,"N"],[55,{"6":18,"3":47},68,"N"],[60,{"6":22,"3":50},75,"O"],[65,{"9":2,"6":26,"3":52},84,"*"],[70,{"9":4,"6":28,"3":57},93,"*"]],"38":[[5,{},3,"C"],[10,{"3":1},4,"E"],[15,{"3":4},7,"F"],[20,{"3":8},11,"H"],[25,{"6":1,"3":16},21,"J"],[30,{"6":3,"3":24},31,"K"],[35,{"6":5,"3":33},42,"L"],[40,{"6":10,"3":38},52,"M"],[45,{"6":15,"3":43},62,"N"],[50,{"6":20,"3":47},71,"N"],[55,{"9":2,"6":23,"3":50},79,"O"],[60,{"9":5,"6":27,"3":53},89,"P"],[65,{"9":8,"6":29,"3":58},99,"*"],[70,{"9":11,"6":31,"3":62},108,"*"]],"40":[[5,{},3,"C"],[10,{"3":2},5,"E"],[15,{"3":4},7,"G"],[20,{"6":1,"3":9},14,"H"],[25,{"6":2,"3":19},25,"J"],[30,{"6":4,"3":28},36,"K"],[35,{"6":8,"3":35},47,"L"],[40,{"6":13,"3":40},57,"M"],[45,{"9":1,"6":18,"3":45},68,"N"],[50,{"9":2,"6":23,"3":48},77,"O"],[55,{"9":5,"6":26,"3":52},87,"O"],[60,{"9":8,"6":29,"3":57},98,"P"],[65,{"9":12,"6":31,"3":61},108,"*"],[70,{"9":15,"6":33,"3":66},118,"*"]],"42":[[5,{},3,"C"],[10,{"3":2},6,"E"],[15,{"3":5},9,"G"],[20,{"6":1,"3":12},17,"I"],[25,{"6":3,"3":22},29,"J"],[30,{"6":6,"3":31},41,"L"],[35,{"6":11,"3":37},52,"M"],[40,{"9":1,"6":16,"3":43},64,"N"],[45,{"9":3,"6":21,"3":47},75,"*"],[50,{"9":6,"6":24,"3":50},84,"*"],[55,{"9":8,"6":29,"3":55},96,"*"],[60,{"9":13,"6":30,"3":60},107,"*"]],"45":[[5,{},3,"C"],[10,{"3":3},7,"F"],[15,{"6":1,"3":6},11,"H"],[20,{"6":3,"3":15},22,"I"],[25,{"6":5,"3":25},34,"K"],[30,{"6":9,"3":35},48,"L"],[35,{"9":1,"6":15,"3":40},60,"M"],[40,{"9":3,"6":20,"3":46},73,"N"],[45,{"9":6,"6":24,"3":50},84,"*"],[50,{"9":10,"6":28,"3":54},96,"*"],[55,{"9":14,"6":30,"3":60},108,"*"],[60,{"12":1,"9":18,"6":32,"3":65},121,"*"]],"48":[[5,{},4,"D"],[10,{"3":4},8,"F"],[15,{"6":2,"3":7},13,"H"],[20,{"6":4,"3":19},27,"J"],[25,{"6":7,"3":30},41,"K"],[30,{"9":1,"6":12,"3":37},55,"M"],[35,{"9":3,"6":18,"3":44},70,"N"],[40,{"9":6,"6":23,"3":48},82,"O"],[45,{"9":10,"6":27,"3":53},95,"*"],[50,{"12":1,"9":14,"6":30,"3":59},109,"*"],[55,{"12":2,"9":18,"6":32,"3":64},121,"*"],[60,{"12":5,"9":19,"6":36,"3":70},135,"*"]],"50":[[5,{"3":1},5,"D"],[10,{"3":4},8,"F"],[15,{"6":2,"3":9},15,"H"],[20,{"6":4,"3":22},30,"J"],[25,{"9":1,"6":8,"3":32},46,"L"],[30,{"9":2,"6":14,"3":39},60,"M"],[35,{"9":5,"6":20,"3":45},75,"N"],[40,{"9":9,"6":24,"3":50},88,"O"],[45,{"12":1,"9":12,"6":29,"3":55},102,"*"],[50,{"12":2,"9":17,"6":30,"3":62},116,"*"],[55,{"12":5,"9":19,"6":34,"3":67},130,"*"]],"52":[[5,{"3":1},5,"D"],[10,{"6":1,"3":4},10,"F"],[15,{"6":3,"3":10},18,"I"],[20,{"9":1,"6":5,"3":23},34,"K"],[25,{"9":2,"6":9,"3":34},50,"L"],[30,{"9":4,"6":15,"3":41},65,"M"],[35,{"9":6,"6":22,"3":47},80,"O"],[40,{"12":1,"9":10,"6":26,"3":52},94,"O"],[45,{"12":2,"9":15,"6":29,"3":59},110,"*"],[50,{"12":5,"9":17,"6":32,"3":64},123,"*"],[55,{"12":8,"9":19,"6":36,"3":71},139,"*"]],"55":[[5,{"3":1},5,"D"],[10,{"6":1,"3":5},11,"G"],[15,{"6":4,"3":13},22,"I"],[20,{"9":1,"6":6,"3":27},39,"K"],[25,{"9":3,"6":11,"3":37},56,"M"],[30,{"9":6,"6":18,"3":44},73,"N"],[35,{"12":1,"9":9,"6":23,"3":50},88,"O"],[40,{"12":3,"9":12,"6":29,"3":55},104,"P"],[45,{"12":5,"9":17,"6":31,"3":62},120,"*"],[50,{"12":8,"9":19,"6":35,"3":69},136,"*"],[55,{"12":12,"9":22,"6":37,"3":76},152,"*"]],"58":[[5,{"3":2},7,"D"],[10,{"6":2,"3":5},12,"G"],[15,{"9":1,"6":4,"3":16},26,"J"],[20,{"9":2,"6":7,"3":30},44,"K"],[25,{"9":4,"6":13,"3":40},62,"M"],[30,{"12":1,"9":7,"6":21,"3":46},81,"N"],[35,{"12":2,"9":11,"6":26,"3":52},97,"O"],[40,{"12":5,"9":15,"6":30,"3":59},115,"P"],[45,{"12":8,"9":18,"6":33,"3":66},131,"*"],[50,{"15":1,"12":11,"9":21,"6":37,"3":74},150,"*"],[55,{"15":3,"12":14,"9":23,"6":39,"3":83},168,"*"]],"60":[[5,{"3":2},7,"D"],[10,{"6":2,"3":6},13,"G"],[15,{"9":1,"6":4,"3":19},29,"J"],[20,{"9":3,"6":8,"3":32},48,"L"],[25,{"9":5,"6":15,"3":41},66,"M"],[30,{"12":1,"9":8,"6":22,"3":48},85,"O"],[35,{"12":4,"9":11,"6":28,"3":54},103,"P"],[40,{"12":6,"9":17,"6":30,"3":62},121,"P"],[45,{"15":1,"12":9,"9":19,"6":35,"3":69},139,"*"],[50,{"15":2,"12":13,"9":22,"6":37,"3":78},158,"*"],[55,{"15":5,"12":15,"9":24,"6":40,"3":88},178,"*"]],"62":[[5,{"3":2},7,"*"],[10,{"6":2,"3":7},14,"*"],[15,{"9":1,"6":5,"3":21},33,"*"]],"65":[[5,{"3":3},8,"*"],[10,{"6":3,"3":8},16,"*"],[15,{"9":2,"6":5,"3":24},37,"*"]]};
  const DEPTHS = Object.keys(MN90).map(Number).sort((a, b) => a - b);
  const STOP_DEPTHS = [15, 12, 9, 6, 3];

  // Vitesses (m/min) : descente, remontée jusqu'au 1er palier, entre paliers et palier → surface
  const SPEED = { desc: 20, asc: 15, ascStop: 6 };

  // Limites de sécurité retenues par l'application
  const LIMITS = {
    immersion: 120,   // 2 h d'immersion max (cours Nitrox)
    sncWarn: 50,      // %SNC : orange
    sncMax: 80,       // %SNC : rouge (et limite du "maximum possible")
    otuDay: 850,      // OTU : dose max sur 1 journée
    maxDepth: 60,     // profondeur max air et Nitrox (Code du sport)
    nitroxSimpleO2: 0.40,
  };

  // Table d'exposition NOAA : [PpO2, durée max (min)] — cours Nitrox Confirmé, diapo 27
  const NOAA = [[0.6, 720], [0.7, 570], [0.8, 450], [0.9, 360], [1.0, 300], [1.1, 240],
    [1.2, 210], [1.3, 180], [1.4, 150], [1.5, 120], [1.6, 45], [1.7, 10], [1.8, 2]];

  const pabs = z => z / 10 + 1;
  const ppo2At = (z, fo2) => pabs(z) * fo2;

  // PEA = [(P + 10) × FN2 / 0,8] − 10 (pression absolue, diviseur 0,8 comme dans le cours)
  function pea(depth, fo2) {
    return (pabs(depth) * (1 - fo2) / 0.8 - 1) * 10;
  }

  // MOD : profondeur max pour une PpO2 donnée (arrondie vers le bas au dixième)
  function mod(fo2, ppo2max) {
    return Math.floor((ppo2max / fo2 - 1) * 100 + 1e-6) / 10;   // tolérance : erreurs d'arrondi machine
  }

  // Best mix : % O2 le plus riche utilisable à cette profondeur (arrondi vers le bas)
  function bestMix(depth, ppo2max) {
    return Math.floor(ppo2max / pabs(depth) * 100 + 1e-6);
  }

  // Lecture de table : profondeur et durée immédiatement supérieures, pas d'interpolation
  function lookup(depth, time) {
    const d = DEPTHS.find(x => x >= depth - 1e-9);
    if (d === undefined) return { err: `Profondeur hors table (au-delà de ${DEPTHS[DEPTHS.length - 1]} m)` };
    const rows = MN90[d];
    const idx = rows.findIndex(r => r[0] >= time);
    if (idx < 0) return { d, err: `Durée hors table à ${d} m (max ${rows[rows.length - 1][0]} min)` };
    const row = rows[idx];
    return { d, t: row[0], idx, stops: row[1], dtr: row[2], gps: row[3] };
  }

  const stopList = stops => Object.keys(stops).map(Number).sort((a, b) => b - a);

  // Profil complet à partir de la partie "fond" (points [t, z] depuis la mise à l'eau
  // jusqu'au départ du fond). Ajoute la remontée et les paliers.
  function buildProfile(bottom, stops) {
    const pts = bottom.map(p => [p[0], p[1]]);
    let [t, z] = pts[pts.length - 1];
    const segs = [];
    stopList(stops).forEach((s, i) => {
      if (s < z) { t += (z - s) / (i === 0 ? SPEED.asc : SPEED.ascStop); z = s; pts.push([t, z]); }
      segs.push({ depth: s, from: t, to: t + stops[s], dur: stops[s] });
      t += stops[s]; pts.push([t, z]);
    });
    t += z / (segs.length ? SPEED.ascStop : SPEED.asc);
    pts.push([t, 0]);
    return { pts, segs, total: t, bottomEnd: bottom[bottom.length - 1][0] };
  }

  // Partie "fond" d'une plongée carrée
  function squareBottom(depth, time) {
    const tDesc = Math.min(depth / SPEED.desc, time);
    return [[0, 0], [tDesc, depth], [time, depth]];
  }

  // Litres consommés : conso surface × pression absolue moyenne de chaque segment
  function gasUse(pts, sac) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) {
      const [t0, z0] = pts[i - 1], [t1, z1] = pts[i];
      L += (t1 - t0) * sac * ((z0 + z1) / 20 + 1);
    }
    return L;
  }

  // Durée max NOAA pour une PpO2 (ligne immédiatement supérieure, au-delà de 1,8 : 1 min)
  function noaaLimit(p) {
    const r = NOAA.find(x => x[0] >= p - 1e-9);
    return r ? r[1] : 1;
  }

  // %SNC (NOAA) et OTU sur un profil
  function toxicity(pts, fo2) {
    let snc = 0, otu = 0, ppMax = 0;
    for (let i = 1; i < pts.length; i++) {
      const dt = pts[i][0] - pts[i - 1][0];
      if (dt <= 0) continue;
      const p = ppo2At((pts[i][1] + pts[i - 1][1]) / 2, fo2);
      ppMax = Math.max(ppMax, ppo2At(Math.max(pts[i][1], pts[i - 1][1]), fo2));
      if (p > 0.5) otu += dt * Math.pow((p - 0.5) / 0.5, 0.83);
      if (p >= 0.6) snc += dt / noaaLimit(p) * 100;
    }
    return { snc, otu, ppMax };
  }

  // Profondeur à un instant t (interpolation linéaire sur le profil)
  function depthAt(pts, t) {
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const [t0, z0] = pts[i - 1], [t1, z1] = pts[i];
        return t1 === t0 ? z1 : z0 + (z1 - z0) * (t - t0) / (t1 - t0);
      }
    }
    return 0;
  }

  /* ---------- Plongée complète ----------
     dive = { bottom: [[t,z]...], fo2, nitrox: bool, gear: {tank, press, sac, reserve} } */
  function evaluate(dive) {
    const bottom = dive.bottom;
    const depth = Math.max(...bottom.map(p => p[1]));
    const time = bottom[bottom.length - 1][0];
    const fo2 = dive.fo2;
    const peaDepth = dive.nitrox ? pea(depth, fo2) : depth;
    const tab = lookup(Math.max(peaDepth, 0.1), Math.max(time, 0.1));
    const res = { depth, time, fo2, nitrox: dive.nitrox, pea: peaDepth, tab, ppo2: ppo2At(depth, fo2) };
    if (tab.err) return res;
    res.prof = buildProfile(bottom, tab.stops);
    res.dtrReal = res.prof.total - time;
    res.gasL = gasUse(res.prof.pts, dive.gear.sac);
    res.gasBar = res.gasL / dive.gear.tank;
    res.left = dive.gear.press - res.gasBar;
    res.tox = toxicity(res.prof.pts, fo2);
    return res;
  }

  /* ---------- Durées max pour une plongée carrée ----------
     Renvoie la durée max sans palier et la durée max paliers compris,
     chacune avec la limite qui bloque. */
  function limits(depth, fo2, nitrox, gear) {
    const peaDepth = nitrox ? pea(depth, fo2) : depth;
    const d = DEPTHS.find(x => x >= Math.max(peaDepth, 0.1) - 1e-9);
    if (d === undefined) return null;
    const tableMax = MN90[d][MN90[d].length - 1][0];
    const cap = Math.min(tableMax, LIMITS.immersion);
    const out = { d, tableMax, noStop: 0, gas: 0, snc: 0, time: 0 };
    let noStopOk = true, gasOk = true, sncOk = true, timeOk = true;
    for (let T = 1; T <= cap; T++) {
      const e = evaluate({ bottom: squareBottom(depth, T), fo2, nitrox, gear });
      if (!e.prof) break;
      if (noStopOk && stopList(e.tab.stops).length === 0) out.noStop = T; else noStopOk = false;
      if (gasOk && e.left >= gear.reserve) out.gas = T; else gasOk = false;
      if (sncOk && e.tox.snc <= LIMITS.sncMax) out.snc = T; else sncOk = false;
      if (timeOk && e.prof.total <= LIMITS.immersion) out.time = T; else timeOk = false;
      if (!gasOk && !sncOk && !timeOk && !noStopOk) break;
    }
    if (gasOk) out.gas = cap;
    if (sncOk) out.snc = cap;
    if (timeOk) out.time = cap;
    const pick = list => list.reduce((a, b) => (b[1] < a[1] ? b : a));
    out.maxNoStop = pick([['noStop', out.noStop], ['gas', out.gas], ['snc', out.snc], ['time', out.time]]);
    out.max = pick([['table', tableMax], ['gas', out.gas], ['snc', out.snc], ['time', out.time]]);
    return out;
  }

  /* ---------- Pression de décollage ----------
     Méthode GP (CODEP 01, d'après L. Bardassier) : Pdéco = DTR × β + pression de sécurité.
     β (bar par minute de DTR) selon le volume du bloc et la conso surface. */
  const BETA = {
    sacs: [15, 17, 20, 22],
    rows: { 12: [3.0, 3.5, 4.0, 4.5], 15: [2.5, 2.5, 3.0, 3.5], 17: [2.0, 2.5, 2.5, 3.0],
      18: [2.0, 2.5, 2.5, 3.0], 20: [1.5, 2.0, 2.5, 2.5], 24: [1.5, 1.5, 2.0, 2.0] },
  };
  // β : valeur de la table si le bloc y figure (conso immédiatement supérieure),
  // sinon estimation sac × 2,25 / V arrondie au demi-bar supérieur.
  function beta(tank, sac) {
    const row = BETA.rows[Math.round(tank)];
    const i = BETA.sacs.findIndex(s => s >= sac);
    if (row && i >= 0) return { value: row[i], fromTable: true };
    return { value: Math.ceil(sac * 2.25 / tank * 2) / 2, fromTable: false };
  }

  // Pression nécessaire pour toute la remontée (départ du fond → surface), calcul exact
  function ascentGas(res, sac) {
    if (!res.prof) return null;
    const pts = res.prof.pts;
    const i = pts.findIndex(p => p[0] >= res.prof.bottomEnd - 1e-9);
    return gasUse(pts.slice(i), sac);
  }

  function decollage(res, gear) {
    if (!res.prof) return null;
    const dtr = res.tab.dtr;
    const b = beta(gear.tank, gear.sac);
    const L = ascentGas(res, gear.sac);
    return {
      dtr,
      beta: b,
      gp: dtr * b.value + gear.reserve,
      tito: res.depth + 2 * dtr,
      exact: gear.reserve + L / gear.tank,
      ascentL: L,
    };
  }

  /* ---------- Procédures MN90 (mode d'emploi des tables fédérales) ---------- */

  // Remontée rapide (définition du cours) : plus de 15 m/min entre 30 m et la surface, sur 10 m minimum.
  // Dans les 3 min : palier de 5 min à mi-profondeur minimum, puis les paliers prévus
  // + 1 min à 6 m + 5 min à 3 m. Hypothèses du dessin : remontée rapide à 30 m/min, 3 min en surface.
  function rapidAscent(res) {
    if (!res.prof) return null;
    const mid = Math.ceil(res.depth / 2);
    const i = res.prof.pts.findIndex(p => p[0] >= res.prof.bottomEnd - 1e-9);
    const pts = res.prof.pts.slice(0, i + 1).map(p => p.slice());
    let [t, z] = pts[pts.length - 1];
    t += z / 30; pts.push([t, 0]);
    const tSurface = t;
    t += 3; pts.push([t, 0]);
    t += mid / SPEED.desc; pts.push([t, mid]);
    t += 5; pts.push([t, mid]);
    const stops = Object.assign({}, res.tab.stops);
    stops[6] = (stops[6] || 0) + 1;
    stops[3] = (stops[3] || 0) + 5;
    const prof = buildProfile(pts, stops);
    return { mid, ref: res.depth, stops, base: res.tab.stops, prof, tSurface };
  }

  // Une remontée est "rapide" (procédure) si elle dépasse 15 m/min entre 30 m et la surface sur 10 m minimum
  function isRapidAscent(z0, z1, dt) {
    const top = Math.min(z0, 30), dz = top - z1;
    return z1 < z0 && dt > 0 && (z0 - z1) / dt > SPEED.asc + 1e-9 && dz >= 10 - 1e-9;
  }

  // Remontée lente jusqu'au 1er palier : on majore la durée de plongée de la durée de remontée
  function slowAscent(res, speed) {
    if (!res.prof) return null;
    const first = stopList(res.tab.stops)[0] || 0;
    const tAsc = (res.depth - first) / speed;
    const duration = Math.ceil(res.time + tAsc - 1e-9);
    const tabDepth = res.nitrox ? pea(res.depth, res.fo2) : res.depth;
    return { speed, tAsc, duration, tab: lookup(Math.max(tabDepth, 0.1), duration) };
  }

  // ===== Plongées successives (mode d'emploi des tables fédérales, Blanchard & Imbert) =====
  // Tableau I : azote résiduel selon la lettre GPS et l'intervalle de surface (colonnes en minutes).
  // Case vide (fin de ligne) : azote résiduel revenu à la normale, pas de majoration.
  const T1_COLS = [15, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 630, 660, 690, 720];
  const TABLE_I = {"A":[0.84,0.83,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81,0.81,0.81,0.81],"B":[0.88,0.88,0.87,0.86,0.85,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81,0.81,0.81],"C":[0.92,0.91,0.9,0.89,0.88,0.87,0.85,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81,0.81,0.81],"D":[0.97,0.95,0.94,0.93,0.91,0.89,0.88,0.86,0.85,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81,0.81,0.81],"E":[1.0,0.98,0.97,0.96,0.93,0.91,0.89,0.88,0.87,0.86,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81,0.81,0.81],"F":[1.05,1.03,1.01,0.99,0.96,0.94,0.91,0.9,0.88,0.87,0.86,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81,0.81,0.81,0.81],"G":[1.08,1.06,1.04,1.02,0.98,0.96,0.93,0.91,0.89,0.88,0.87,0.85,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81,0.81,0.81],"H":[1.13,1.1,1.08,1.05,1.01,0.98,0.95,0.93,0.91,0.89,0.88,0.86,0.85,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81,0.81,0.81],"I":[1.17,1.14,1.11,1.08,1.04,1.0,0.97,0.94,0.92,0.9,0.88,0.87,0.86,0.85,0.84,0.84,0.83,0.83,0.82,0.82,0.81,0.81,0.81,0.81,0.81,0.81],"J":[1.2,1.17,1.14,1.11,1.06,1.02,0.98,0.96,0.93,0.91,0.89,0.88,0.87,0.86,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81,0.81],"K":[1.25,1.21,1.18,1.15,1.09,1.04,1.01,0.97,0.95,0.92,0.9,0.89,0.87,0.86,0.85,0.84,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81],"L":[1.29,1.25,1.21,1.17,1.12,1.07,1.02,0.99,0.96,0.93,0.91,0.89,0.88,0.87,0.86,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81,0.81],"M":[1.33,1.29,1.25,1.21,1.14,1.09,1.04,1.01,0.97,0.94,0.92,0.9,0.89,0.87,0.86,0.85,0.84,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81],"N":[1.37,1.32,1.28,1.24,1.17,1.11,1.06,1.02,0.98,0.95,0.93,0.91,0.89,0.88,0.87,0.85,0.85,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81,0.81],"O":[1.41,1.36,1.32,1.27,1.2,1.13,1.08,1.04,1.0,0.97,0.94,0.92,0.9,0.88,0.87,0.86,0.85,0.84,0.84,0.83,0.82,0.82,0.82,0.81,0.81,0.81],"P":[1.45,1.4,1.35,1.3,1.22,1.15,1.1,1.05,1.01,0.98,0.95,0.93,0.91,0.89,0.87,0.86,0.85,0.84,0.84,0.83,0.83,0.82,0.82,0.82,0.81,0.81]};
  // Tableau II : majoration (min) selon l'azote résiduel (ligne) et la profondeur de la 2e plongée (colonne)
  const T2_DEPTHS = [12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 52, 55, 58, 60];
  const TABLE_II = [[0.82,4,3,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1],[0.84,7,6,5,4,4,3,3,3,3,2,2,2,2,2,2,2,2,2,1,1],[0.86,11,9,7,7,6,5,5,4,4,4,3,3,3,3,3,3,3,2,2,2],[0.89,17,13,11,10,9,8,7,7,6,6,5,5,5,4,4,4,4,4,3,3],[0.92,23,18,15,13,12,11,10,9,8,8,7,7,6,6,5,5,5,5,5,4],[0.95,29,23,19,17,15,13,12,11,10,10,9,8,8,7,7,7,6,6,6,5],[0.99,38,30,24,22,20,17,15,14,13,12,11,11,10,9,9,8,8,8,7,7],[1.03,47,37,30,27,24,21,19,17,16,15,14,13,12,11,11,10,10,9,9,9],[1.07,57,44,36,32,29,25,22,21,19,18,16,15,15,13,13,12,12,11,10,10],[1.11,68,52,42,37,34,29,26,24,22,20,19,18,17,16,15,14,13,13,12,12],[1.16,81,62,50,44,40,34,30,28,26,24,22,21,20,18,17,16,16,15,14,13],[1.2,93,70,56,50,45,39,34,32,29,27,24,23,22,20,19,18,18,17,16,15],[1.24,106,79,63,56,50,43,38,35,33,30,27,26,24,23,21,20,19,18,17,17],[1.29,124,91,72,63,56,49,43,40,37,33,30,29,27,25,24,23,22,20,19,19],[1.33,139,101,79,70,62,53,47,43,40,36,33,31,30,28,26,25,24,22,21,20],[1.38,160,114,89,78,69,59,52,48,44,40,37,35,33,30,28,27,26,24,23,22],[1.42,180,126,97,85,75,64,56,52,48,43,39,37,35,33,30,29,28,26,25,24],[1.45,196,135,104,90,80,68,59,55,51,46,42,39,37,34,32,31,29,28,26,25]];

  /* Plongée suivante selon l'intervalle de surface (minutes) :
     < 15 min : consécutive (durées additionnées, profondeur max) ; >= 12 h : isolée ;
     sinon successive : Tableau I (colonne immédiatement inférieure) -> azote résiduel,
     Tableau II (azote immédiatement supérieur, profondeur immédiatement supérieure) -> majoration. */
  function nextDive(first, interval, depth2, time2, fo2, nitrox, gear) {
    const out = { interval };
    const pea2 = nitrox ? pea(depth2, fo2) : depth2;
    if (interval < 15) {
      out.kind = 'consecutive';
      out.depth = Math.max(first.depth, depth2);
      out.duration = first.time + time2;
      out.tabDepth = Math.max(first.nitrox ? first.pea : first.depth, pea2);
    } else if (interval >= 720) {
      out.kind = 'isolee';
      out.duration = time2;
      out.tabDepth = pea2;
    } else {
      out.kind = 'successive';
      const gps = first.tab && first.tab.gps;
      if (!gps || gps === '*') { out.err = 'Pas de lettre GPS après la 1re plongée : plongée successive interdite (attendre 12 h).'; return out; }
      let ci = -1;
      T1_COLS.forEach((c, k) => { if (c <= interval) ci = k; });
      out.col = T1_COLS[ci];
      const row = TABLE_I[gps] || [];
      out.gps = gps;
      out.n2 = ci < row.length ? row[ci] : null;           // null : case vide, azote revenu à la normale
      if (out.n2 === null || out.n2 <= 0.81 + 1e-9) { out.maj = 0; }
      else {
        const r2 = TABLE_II.find(r => r[0] >= out.n2 - 1e-9) || TABLE_II[TABLE_II.length - 1];
        out.n2row = r2[0];
        const di = T2_DEPTHS.findIndex(d => d >= pea2 - 1e-9);
        if (di < 0) { out.err = 'Profondeur hors Tableau II (au-delà de 60 m).'; return out; }
        out.depthCol = T2_DEPTHS[di];
        out.maj = r2[1 + di];
      }
      out.duration = time2 + out.maj;
      out.tabDepth = pea2;
    }
    out.tab = lookup(Math.max(out.tabDepth, 0.1), Math.max(out.duration, 0.1));
    if (out.tab.err) { out.err = out.tab.err; return out; }
    out.prof = buildProfile(squareBottom(depth2, time2), out.tab.stops);
    out.gasL = gasUse(out.prof.pts, gear.sac);
    out.left = gear.press - out.gasL / gear.tank;
    out.tox = toxicity(out.prof.pts, fo2);
    // %SNC : divisé par 2 toutes les 90 min en surface, on additionne
    out.sncCarry = first.tox ? first.tox.snc * Math.pow(0.5, interval / 90) : 0;
    out.sncTotal = out.sncCarry + out.tox.snc;
    out.otuTotal = (first.tox ? first.tox.otu : 0) + out.tox.otu;
    return out;
  }

  const fmt = (n, d = 0) => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const mmss = m => {
    const mm = Math.floor(m), ss = Math.round((m - mm) * 60);
    if (ss === 60) return `${mm + 1} min`;
    return ss ? `${mm} min ${String(ss).padStart(2, '0')}` : `${mm} min`;
  };

  window.MN90Lib = {
    MN90, DEPTHS, STOP_DEPTHS, SPEED, LIMITS, NOAA,
    pabs, ppo2At, pea, mod, bestMix, lookup, stopList, buildProfile, squareBottom,
    gasUse, noaaLimit, toxicity, depthAt, evaluate, limits, beta, ascentGas, decollage, rapidAscent, isRapidAscent, slowAscent, nextDive,
    T1_COLS, TABLE_I, T2_DEPTHS, TABLE_II, fmt, mmss,
  };
})();
