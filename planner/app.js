/* ============================================================
   MN90 Mobile — Planificateur de plongée
   Dépend de : shared/mn90.js (MN90Lib), shared/profile.js (MN90Profile),
               shared/glossary.js (MN90Help)
   ============================================================ */
(function () {
  'use strict';

  const NEEDED = ['depth', 'time', 'vDepth', 'vTime', 'o2', 'vO2', 'o2Field', 'compare', 'cmpField',
    'gasSeg', 'ppSeg', 'gearTxt', 'gearEdit', 'paramInputs', 'drawInputs', 'scaleZ', 'scaleT',
    'vScaleZ', 'vScaleT', 'answer', 'answerCard', 'mixTbl', 'reqs', 'chart', 'svg', 'tip', 'lgGhost',
    'drawTools', 'undoPt', 'clearPts', 'examplePts', 'kpis', 'gauges', 'stops', 'alerts', 'tableRead', 'deco', 'dtrMax', 'emerg', 'ptabs', 'alertCount', 'mixTab', 'calc'];

  function init() {
    const L = window.MN90Lib, P = window.MN90Profile, H = window.MN90Help;
    if (!L || !P || !H) { console.error('[planner] bibliothèques partagées manquantes'); return; }
    const el = {};
    const missing = NEEDED.filter(id => !(el[id] = document.getElementById(id)));
    if (missing.length) { console.error('[planner] éléments manquants :', missing); return; }

    const { fmt, mmss } = L;
    const DEFAULT_DRAW = [[0, 0], [2, 25], [18, 25]];
    const S = {
      view: 'param',
      gas: 'air',
      pmax: 1.4,
      draw: DEFAULT_DRAW.map(p => p.slice()),
      last: null,
      map: null,
      drag: null,
    };

    // Grand écran : tableau de bord sans défilement
    const DASHBOARD = window.matchMedia('(min-width: 1000px) and (min-height: 600px)');
    const nav = document.querySelector('.navbar');
    const setNavH = () => { if (nav) document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px'); };
    setNavH();

    function showPane(name) {
      el.ptabs.querySelectorAll('.ptab').forEach(b => b.classList.toggle('on', b.dataset.pane === name));
      document.querySelectorAll('.pane[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== name; });
    }

    /* ---------- Lecture des entrées ---------- */
    const gear = () => P.get().gear;
    const fo2 = () => (S.gas === 'air' ? 0.21 : +el.o2.value / 100);
    const isNx = () => S.gas === 'nx';

    function bottom() {
      if (S.view === 'draw') return S.draw;
      return L.squareBottom(+el.depth.value, +el.time.value);
    }

    /* ---------- Calcul ---------- */
    function compute() {
      const g = gear();
      const dive = { bottom: bottom(), fo2: fo2(), nitrox: isNx(), gear: g };
      const res = L.evaluate(dive);
      res.gear = g;
      res.pmax = isNx() ? S.pmax : 1.6;   // à l'air, seule la limite absolue 1,6 b s'applique
      res.mod = L.mod(res.fo2, S.pmax);
      res.ppn2 = L.pabs(res.depth) * (1 - res.fo2);
      res.reqs = P.requirements({ depth: res.depth, nitrox: res.nitrox, fo2: res.fo2 });
      if (res.prof) {
        const bottomL = L.gasUse(dive.bottom, g.sac);
        res.pBottom = g.press - bottomL / g.tank;     // manomètre au départ du fond
        res.deco = L.decollage(res, g);
        res.pdecoMin = Math.ceil(res.deco.exact);                                   // strict : remontée + réserve
        res.pdecoRec = Math.ceil(Math.max(res.deco.gp, res.deco.exact) / 10) * 10;  // repère conseillé (marge GP)
      }
      if (S.view === 'draw') res.fast = fastAscents(dive.bottom);
      if (S.view === 'param' && isNx() && el.compare.checked) {
        const air = L.evaluate({ bottom: dive.bottom, fo2: 0.21, nitrox: false, gear: g });
        if (air.prof) res.air = air;
      }
      if (S.view === 'param') res.lim = L.limits(res.depth, res.fo2, res.nitrox, g);
      return res;
    }

    // Remontées > 15 m/min entre deux points dessinés
    function fastAscents(pts) {
      const out = [];
      for (let i = 1; i < pts.length; i++) {
        const dz = pts[i - 1][1] - pts[i][1], dt = pts[i][0] - pts[i - 1][0];
        if (dz > 0 && dt > 0 && dz / dt > L.SPEED.asc + 1e-9) out.push({ i, rate: dz / dt, from: pts[i - 1], to: pts[i] });
      }
      return out;
    }

    /* ---------- Rendu ---------- */
    function render() {
      el.vDepth.textContent = el.depth.value;
      el.vTime.textContent = el.time.value;
      el.vScaleZ.textContent = el.scaleZ.value;
      el.vScaleT.textContent = el.scaleT.value;
      const p = P.get();
      el.vO2.textContent = el.o2.value;
      el.o2Field.hidden = !isNx();
      el.ppSeg.parentElement.hidden = !isNx();
      el.cmpField.hidden = !isNx() || S.view === 'draw';
      el.paramInputs.hidden = S.view !== 'param';
      el.drawInputs.hidden = S.view !== 'draw';
      el.drawTools.hidden = S.view !== 'draw';
      el.answerCard.hidden = S.view !== 'param';
      el.chart.classList.toggle('drawing', S.view === 'draw');
      el.mixTab.hidden = S.view !== 'param';
      if (S.view !== 'param' && el.mixTab.classList.contains('on')) showPane('alerts');
      setSeg(el.gasSeg, S.gas);
      setSeg(el.ppSeg, String(S.pmax));
      const g = p.gear;
      el.gearTxt.textContent = `Bloc ${g.tank} L · ${g.press} b · ${g.sac} L/min · réserve ${g.reserve} b`;

      const r = compute();
      S.last = r;
      el.lgGhost.hidden = !r.air;
      renderAnswer(r);
      renderReqs(r);
      drawChart(r);
      renderKpis(r);
      renderGauges(r);
      renderStops(r);
      renderAlerts(r);
      renderTableRead(r);
      renderDeco(r);
      renderEmerg(r);
      renderCalc(r);
    }

    function setSeg(seg, v) {
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    }

    const LIMIT_TXT = (key, r, lim) => ({
      noStop: 'la table : au-delà, palier obligatoire',
      gas: `ton bloc : au-delà, tu entames ta réserve de ${r.gear.reserve} b`,
      snc: `l’oxygène : la jauge cerveau dépasserait ${L.LIMITS.sncMax} %`,
      time: 'les 2 h d’immersion maximum',
      table: `la fin de la table à ${lim.d} m`,
    })[key];

    function blockingReason(r) {
      const bad = r.reqs.find(x => x.status === 'missing' || x.status === 'forbidden');
      if (bad) return bad.text;
      if (r.ppo2 > r.pmax + 1e-9) return `PpO₂ ${fmt(r.ppo2, 2)} b au fond : au-delà de ${fmt(r.pmax, 1)} b (MOD ${fmt(r.mod, 1)} m).`;
      return '';
    }

    function renderAnswer(r) {
      if (S.view !== 'param') return;
      const lim = r.lim;
      if (!lim) { el.answer.innerHTML = `<div class="alert danger">${r.tab.err || 'Hors table'}</div>`; el.mixTbl.innerHTML = ''; return; }
      const block = blockingReason(r);
      const card = (title, pair, extra) => {
        const [key, T] = pair;
        if (T <= 0) {
          const txt = key === 'noStop' ? `Aucune durée sans palier à cette profondeur${r.nitrox ? ' (lecture à la PEA)' : ''}.` : `Limité par ${LIMIT_TXT(key, r, lim)}.`;
          return `<div class="ans"><span class="l">${title}</span><div class="ans-row"><span class="v">0 min</span></div><span class="why">${txt}</span></div>`;
        }
        const e = L.evaluate({ bottom: L.squareBottom(r.depth, T), fo2: r.fo2, nitrox: r.nitrox, gear: r.gear });
        const st = L.stopList(e.tab.stops);
        const det = st.length ? st.map(s => `${s} m ${e.tab.stops[s]}′`).join(' + ') + ` · DTR ${e.tab.dtr}′` : `sans palier · DTR ${e.tab.dtr}′`;
        return `<div class="ans"><span class="l">${title}</span>
          <div class="ans-row"><span class="v">${T} min</span><button type="button" class="btn btn-outline btn-sm" data-settime="${T}">Utiliser</button></div>
          <span class="why">Limité par ${LIMIT_TXT(key, r, lim)}.</span>
          <span class="det">${det} · sortie à ${Math.round(e.prof.total)}′ avec ${Math.round(e.left)} b</span>${extra || ''}</div>`;
      };
      el.answer.className = 'answer' + (block ? ' blocked' : '');
      el.answer.innerHTML = (block ? `<div class="alert danger" style="grid-column:1/-1">⛔ Plongée non permise : ${block}</div>` : '')
        + card('Sans palier', lim.maxNoStop)
        + card('Maximum, paliers compris', lim.max)
        + `<button type="button" class="btn btn-outline btn-sm" data-calcopen style="grid-column:1/-1;justify-self:start">🧮 Voir le calcul</button>`;

      // Comparatif des mélanges
      const mixes = [['Air', 0.21, false], ['Nx32', 0.32, true], ['Nx36', 0.36, true], ['Nx40', 0.40, true]];
      if (isNx() && ![21, 32, 36, 40].includes(+el.o2.value)) mixes.push([`Nx${el.o2.value}`, fo2(), true]);
      el.mixTbl.innerHTML = `<thead><tr><th>Mélange</th><th>PpO₂</th><th>Sans palier</th><th>Max</th></tr></thead><tbody>` +
        mixes.map(([name, f, nx]) => {
          const pp = L.ppo2At(r.depth, f);
          const cur = Math.abs(f - r.fo2) < 1e-9 && nx === r.nitrox;
          if (pp > S.pmax + 1e-9) return `<tr class="${cur ? 'cur' : ''}"><td>${name}</td><td style="color:var(--danger)">${fmt(pp, 2)}</td><td colspan="2" style="color:var(--danger)">Interdit (MOD ${fmt(L.mod(f, S.pmax), 1)} m)</td></tr>`;
          const m = L.limits(r.depth, f, nx, r.gear);
          return `<tr class="${cur ? 'cur' : ''}"><td>${name}</td><td>${fmt(pp, 2)}</td><td>${m ? m.maxNoStop[1] + ' min' : '—'}</td><td>${m ? m.max[1] + ' min' : '—'}</td></tr>`;
        }).join('') + '</tbody>';
    }

    function renderReqs(r) {
      const icon = { used: '🟡', missing: '⛔', forbidden: '⛔', unknown: '❔', info: 'ℹ️' };
      let html = r.reqs.map(x => `<div class="req ${x.status}"><span>${icon[x.status]}</span><span><b>${x.code}</b> · ${x.text}</span></div>`).join('');
      if (!P.get().level) html += `<button type="button" class="btn btn-outline btn-sm" data-open-profile style="align-self:flex-start">Renseigner mon profil</button>`;
      el.reqs.innerHTML = html;
    }

    /* ---------- Courbe SVG ---------- */
    function drawChart(r) {
      const W = Math.max(300, el.chart.clientWidth || 800);
      let H;
      if (DASHBOARD.matches && el.chart.clientHeight > 120) H = el.chart.clientHeight;
      else {
        H = Math.round(W < 600 ? W * 0.72 : W * 0.42);
        if (window.innerHeight > 200 && window.innerHeight < 520) H = Math.min(H, Math.round(window.innerHeight * 0.62));
        H = Math.max(H, 160);
      }
      const m = { l: 40, r: 12, t: 26, b: 28 };
      const draw = S.view === 'draw';
      const total = r.prof ? r.prof.total : r.time + 5;
      const maxT = draw ? +el.scaleT.value : Math.max(total, r.air ? r.air.prof.total : 0) * 1.05;
      const showMod = r.nitrox && r.mod < r.depth + 15;
      const maxZ = draw ? +el.scaleZ.value : Math.max(10, Math.ceil((Math.max(r.depth, showMod ? r.mod : 0) + 4) / 5) * 5);
      const X = t => m.l + t / maxT * (W - m.l - m.r);
      const Y = z => m.t + z / maxZ * (H - m.t - m.b);
      const pl = pts => pts.map(([t, z]) => `${X(t).toFixed(1)},${Y(z).toFixed(1)}`).join(' ');
      let g = `<defs><clipPath id="plot"><rect x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H - m.b}"/></clipPath></defs>`;
      g += `<rect x="0" y="0" width="${W}" height="${H}" style="fill:var(--water1)"/>`;
      g += `<rect x="${m.l}" y="${Y(0)}" width="${W - m.l - m.r}" height="${Y(maxZ) - Y(0)}" style="fill:var(--water2);fill-opacity:.55"/>`;
      const zStep = maxZ > 40 ? 10 : 5;
      for (let z = 0; z <= maxZ; z += zStep) {
        g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(z)}" y2="${Y(z)}" style="stroke:var(--grid)"/>`;
        g += `<text x="${m.l - 6}" y="${Y(z) + 4}" text-anchor="end" font-size="11" style="fill:var(--text2)">${z} m</text>`;
      }
      const tStep = maxT > 150 ? 30 : maxT > 70 ? 10 : 5;
      for (let t = 0; t <= maxT; t += tStep) {
        g += `<line y1="${m.t}" y2="${H - m.b}" x1="${X(t)}" x2="${X(t)}" style="stroke:var(--grid)"/>`;
        g += `<text x="${X(t)}" y="${H - m.b + 17}" text-anchor="middle" font-size="11" style="fill:var(--text2)">${t}′</text>`;
      }
      g += `<g clip-path="url(#plot)">`;
      g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}" style="stroke:var(--accent2)" stroke-width="1.5" stroke-dasharray="2 4"/>`;
      if (showMod && r.mod < maxZ) {
        g += `<rect x="${m.l}" y="${Y(r.mod)}" width="${W - m.l - m.r}" height="${Y(maxZ) - Y(r.mod)}" style="fill:var(--danger)" fill-opacity=".12"/>`;
        g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(r.mod)}" y2="${Y(r.mod)}" style="stroke:var(--danger)" stroke-width="1.5" stroke-dasharray="6 4"/>`;
        g += `<text x="${W - m.r - 6}" y="${Y(r.mod) - 6}" text-anchor="end" font-size="11" font-weight="700" style="fill:var(--danger)">MOD ${fmt(r.mod, 1)} m (PpO₂ ${fmt(r.pmax, 1)})</text>`;
      }
      if (r.air) {
        g += `<polyline points="${pl(r.air.prof.pts)}" fill="none" style="stroke:var(--c4)" stroke-width="2" stroke-dasharray="6 4"/>`;
        g += `<text x="${X(r.air.prof.total)}" y="${Y(0) - 18}" text-anchor="end" font-size="11" style="fill:var(--c4)">air : ${Math.round(r.air.prof.total)}′</text>`;
      }
      if (r.prof) {
        const pts = r.prof.pts;
        g += `<polygon points="${X(0)},${Y(0)} ${pl(pts)}" style="fill:var(--c1)" fill-opacity=".10"/>`;
        if (draw) {
          // Remontée automatique en pointillés après le départ du fond
          const i = pts.findIndex(p => p[0] >= r.prof.bottomEnd - 1e-9);
          g += `<polyline points="${pl(pts.slice(0, i + 1))}" fill="none" style="stroke:var(--c1)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
          g += `<polyline points="${pl(pts.slice(i))}" fill="none" style="stroke:var(--c1)" stroke-width="3" stroke-dasharray="7 5" stroke-linejoin="round"/>`;
          (r.fast || []).forEach(f => {
            g += `<line x1="${X(f.from[0])}" y1="${Y(f.from[1])}" x2="${X(f.to[0])}" y2="${Y(f.to[1])}" style="stroke:var(--danger)" stroke-width="5" stroke-dasharray="4 3"/>`;
          });
        } else {
          g += `<polyline points="${pl(pts)}" fill="none" style="stroke:var(--c1)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
          g += `<text x="${(X(pts[1][0]) + X(pts[2][0])) / 2}" y="${Y(r.depth) - 8}" text-anchor="middle" font-size="12" font-weight="700" style="fill:var(--text)">${r.depth} m · ${r.time}′</text>`;
        }
        r.prof.segs.forEach(s => {
          g += `<line x1="${X(s.from)}" x2="${X(s.to)}" y1="${Y(s.depth)}" y2="${Y(s.depth)}" style="stroke:var(--p${s.depth})" stroke-width="7" stroke-linecap="round"/>`;
          g += `<text x="${(X(s.from) + X(s.to)) / 2}" y="${Y(s.depth) + 19}" text-anchor="middle" font-size="11.5" font-weight="800" style="fill:var(--p${s.depth})">${s.depth} m · ${s.dur}′</text>`;
        });
        g += `<circle cx="${X(r.prof.bottomEnd)}" cy="${Y(bottom().at(-1)[1])}" r="4" style="fill:var(--c1)"/>`;
        g += `<text x="${Math.min(X(r.prof.total), W - m.r - 4)}" y="${Y(0) - 6}" text-anchor="end" font-size="11" font-weight="700" style="fill:var(--text)">sortie ${Math.round(r.prof.total)}′</text>`;
      } else {
        g += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="15" font-weight="700" style="fill:var(--danger)">${r.tab.err}</text>`;
      }
      g += `</g>`;
      if (draw) {
        S.draw.forEach((p, i) => {
          const last = i === S.draw.length - 1;
          g += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${last ? 9 : 7}" style="fill:var(--surface);stroke:${i === 0 ? 'var(--text2)' : 'var(--c1)'}" stroke-width="3"/>`;
          if (last && i > 0) { const ly = Y(p[1]) + 26 > H - m.b ? Y(p[1]) - 14 : Y(p[1]) + 26; g += `<text x="${X(p[0])}" y="${ly}" text-anchor="middle" font-size="11" font-weight="700" style="fill:var(--text)">départ du fond</text>`; }
        });
      }
      g += `<line id="cursor" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--text);display:none" stroke-opacity=".4"/>`;
      el.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      el.svg.innerHTML = g;
      S.map = { X, Y, maxT, maxZ, m, W, H };
    }

    /* ---------- Indicateurs ---------- */
    function renderKpis(r) {
      const T = (key, l, v, sub, cls, help, ex) => ({ key, l, v, sub, cls, help, ex });
      const has = !!r.prof;
      const ppCls = r.ppo2 > r.pmax + 1e-9 ? 'danger' : r.nitrox && r.ppo2 > 1.4 ? 'warn' : 'ok';
      const res = r.gear.reserve;
      const snc = has ? r.tox.snc : 0;
      const groups = [
        ['⏱️ Temps', [
          T('dtr', 'DTR', has ? `${r.tab.dtr}′` : '—', 'remontée (table)', '', 'dtr', has ? `${r.tab.dtr} min pour remonter de ${r.depth} m.` : ''),
          T('total', 'Durée totale', has ? `${Math.round(r.prof.total)}′` : '—', 'immersion → sortie', has && r.prof.total > L.LIMITS.immersion ? 'danger' : '', 'dtr', has ? `sortie de l’eau à ${Math.round(r.prof.total)} min.` : ''),
          T('gps', 'GPS', has ? (r.tab.gps === '*' ? '—' : r.tab.gps) : '—', has && r.tab.gps === '*' ? 'pas de successive' : 'lettre de sortie', '', 'gps', has ? `tu sors avec la lettre ${r.tab.gps}.` : ''),
        ]],
        ['🫧 Air', [
          T('fin', 'Fin de plongée', has ? `${Math.round(r.left)} b` : '—', has ? `conso ${Math.round(r.gasL)} L` : '', has ? (r.left < res ? 'danger' : r.left < res + 20 ? 'warn' : 'ok') : '', 'autonomie', has ? `il te reste ${Math.round(r.left)} b en sortant.` : ''),
          T('deco', 'Décollage', has ? `${r.pdecoRec} b` : '—', 'quitter le fond à', has ? (r.pBottom < r.pdecoMin ? 'danger' : r.pBottom < r.pdecoRec ? 'warn' : 'ok') : '', 'pdeco', has ? `quitte le fond à ${r.pdecoRec} b au plus tard.` : ''),
        ]],
        ['🧪 Gaz', [
          T('ppo2', 'PpO₂ fond', `${fmt(r.ppo2, 2)} b`, `max ${fmt(r.pmax, 1)} b`, ppCls, 'ppo2', `${fmt(L.pabs(r.depth), 1)} × ${fmt(r.fo2, 2)} = ${fmt(r.ppo2, 2)} b.`),
          T('pea', 'PEA', r.nitrox ? `${fmt(r.pea, 1)} m` : `${r.depth} m`, r.nitrox ? `table ${r.tab.d ?? '—'} m` : 'à l’air = réelle', '', 'pea', r.nitrox ? `compte comme ${fmt(r.pea, 1)} m à l’air.` : ''),
          T('mod', 'MOD', `${fmt(r.mod, 1)} m`, r.nitrox ? `Nx${Math.round(r.fo2 * 100)} à ${fmt(r.pmax, 1)} b` : 'air à 1,6 b', r.depth > r.mod ? 'danger' : 'ok', 'mod', `ne dépasse jamais ${fmt(r.mod, 1)} m.`),
        ]],
        ['🧠 Corps', [
          T('snc', '%SNC', has ? `${fmt(snc, 0)} %` : '—', 'jauge cerveau', snc > L.LIMITS.sncMax ? 'danger' : snc > L.LIMITS.sncWarn ? 'warn' : 'ok', 'snc', has ? `${fmt(snc, 0)} % de la dose max du jour.` : ''),
          T('narc', 'Narcose', `${fmt(r.ppn2, 1)} b`, 'PpN₂ au fond', r.ppn2 > 5.6 ? 'danger' : r.ppn2 > 3.2 ? 'warn' : 'ok', 'narcose', `PpN₂ ${fmt(r.ppn2, 1)} b.`),
        ]],
      ];
      el.kpis.innerHTML = groups.map(([title, tiles]) => `<div class="kgroup"><div class="gt">${title}</div><div class="row" style="--n:${tiles.length}">` +
        tiles.map(t => `<div class="kpi ${t.cls}" data-calc="${t.key}" title="Voir le calcul">${H.btn(t.help, t.ex)}<div class="l">${t.l}</div><div class="v">${t.v}</div><div class="s">${t.sub}</div></div>`).join('') +
        '</div></div>').join('');
    }

    /* ---------- Détail de tous les calculs ---------- */
    function phasesList(r) {
      const pts = r.prof.pts, g = r.gear, out = [];
      const isStop = (t0, z) => r.prof.segs.some(s => s.depth === z && Math.abs(s.from - t0) < 1e-6);
      let p = g.press;
      for (let i = 1; i < pts.length; i++) {
        const [t0, z0] = pts[i - 1], [t1, z1] = pts[i], dt = t1 - t0;
        if (dt <= 1e-9) continue;
        const pm = (z0 + z1) / 20 + 1, Lc = dt * g.sac * pm;
        p -= Lc / g.tank;
        const name = z1 > z0 ? `Descente → ${fmt(z1, 0)} m` : z1 < z0 ? `Remontée → ${fmt(z1, 0)} m` : isStop(t0, z0) ? `Palier ${z0} m` : `Fond ${fmt(z0, 0)} m`;
        out.push({ name, dt, pm, L: Lc, p });
      }
      return out;
    }

    function renderCalc(r) {
      const C = [];
      const item = (key, title, body) => C.push(`<div class="calc-item" id="calc-${key}"><h4>${title}</h4>${body}</div>`);
      const g = r.gear;
      if (S.view === 'param' && r.lim) {
        const lim = r.lim;
        item('answer', '⏱️ Combien de temps je peux rester ?', `<p>On essaie chaque durée, minute par minute, et on garde la plus courte des limites :</p>
          <div class="f">Table sans palier : ${lim.noStop} min (ligne ${lim.d} m)<br>Bloc (réserve ${g.reserve} b gardée) : ${lim.gas} min<br>Oxygène (%SNC ≤ ${L.LIMITS.sncMax} %) : ${lim.snc} min<br>2 h d’immersion : ${lim.time} min<br>Fin de la table : ${lim.tableMax} min</div>
          <p>→ <b>sans palier : ${lim.maxNoStop[1]} min</b> · <b>maximum : ${lim.max[1]} min</b></p>`);
      }
      if (!r.prof) { el.calc.innerHTML = C.join('') + `<div class="alert danger">${r.tab.err}</div>`; return; }
      const st = L.stopList(r.tab.stops);
      const first = st[0] || 0;
      const tUp = (r.depth - first) / L.SPEED.asc;
      const tStops = st.reduce((a, k) => a + r.tab.stops[k], 0);
      const tInter = st.length ? (st.length - 1) * 3 / L.SPEED.ascStop + first / L.SPEED.ascStop : 0;
      item('dtr', 'DTR : durée totale de remontée', `<div class="f">Table ${r.tab.d} m / ${r.tab.t} min → DTR <b>${r.tab.dtr} min</b></div>
        <p>Vérification avec les vitesses MN90 :</p>
        <div class="f">Fond → ${first ? first + ' m' : 'surface'} : (${r.depth} − ${first}) / 15 = ${fmt(tUp, 2)} min<br>` +
        (st.length ? `Paliers : ${st.map(k => `${k} m ${r.tab.stops[k]}′`).join(' + ')} = ${tStops} min<br>Entre paliers et vers la surface à 6 m/min : ${fmt(tInter, 2)} min<br>` : '') +
        `Total = ${fmt(r.dtrReal, 2)} min → la table donne ${r.tab.dtr} min</div>`);
      item('total', 'Durée totale', `<div class="f">${S.view === 'draw' ? fmt(r.time, 1) : r.time} min de plongée + ${fmt(r.dtrReal, 1)} min de remontée = <b>${fmt(r.prof.total, 1)} min</b></div>`);
      item('gps', 'Lettre GPS', `<div class="f">Ligne ${r.tab.d} m / ${r.tab.t} min → <b>${r.tab.gps}</b></div><p class="small muted">Elle mesure l’azote restant en sortant. 2e plongée : tableau I avec l’intervalle de surface.</p>`);
      const ph = phasesList(r);
      item('fin', 'Fin de plongée : consommation', `<p class="f">litres = durée × ${g.sac} L/min × pression absolue moyenne</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="text-align:left">Phase</th><th>Durée</th><th>Pabs moy.</th><th>Litres</th><th>Reste</th></tr></thead><tbody>` +
        ph.map(x => `<tr><td style="text-align:left">${x.name}</td><td>${fmt(x.dt, 2)}</td><td>${fmt(x.pm, 2)}</td><td>${fmt(x.L, 0)}</td><td>${Math.round(x.p)} b</td></tr>`).join('') +
        `</tbody></table></div><div class="f">Total ${fmt(r.gasL, 0)} L ÷ ${g.tank} L = ${fmt(r.gasBar, 1)} b → ${g.press} − ${fmt(r.gasBar, 1)} = <b>${Math.round(r.left)} b</b></div>`);
      const D = r.deco;
      item('deco', 'Pression de décollage', `<div class="f">GP : DTR × β + sécurité = ${D.dtr} × ${fmt(D.beta.value, 1)} + ${g.reserve} = ${fmt(D.gp, 0)} b<br>
        Exact : remontée ${fmt(D.ascentL, 0)} L ÷ ${g.tank} L + ${g.reserve} = ${fmt(D.exact, 0)} b<br>
        Tito : ${r.depth} + 2 × ${D.dtr} = ${D.tito} b<br>
        Repère = max(GP, exact) arrondi à la dizaine supérieure = <b>${r.pdecoRec} b</b></div>
        <p class="small muted">Au départ du fond, ton manomètre affichera environ ${Math.round(r.pBottom)} b.</p>`);
      item('ppo2', 'PpO₂ au fond', `<div class="f">Pabs = ${r.depth} / 10 + 1 = ${fmt(L.pabs(r.depth), 1)} b<br>PpO₂ = Pabs × %O₂ = ${fmt(L.pabs(r.depth), 1)} × ${fmt(r.fo2, 2)} = <b>${fmt(r.ppo2, 2)} b</b> (max ${fmt(r.pmax, 1)} b)</div>`);
      item('pea', 'PEA : profondeur équivalente air', r.nitrox
        ? `<div class="f">PEA = [(P + 10) × %N₂ / 0,8] − 10<br>= [(${r.depth} + 10) × ${fmt(1 - r.fo2, 2)} / 0,8] − 10<br>= ${fmt((r.depth + 10) * (1 - r.fo2) / 0.8, 2)} − 10 = <b>${fmt(r.pea, 1)} m</b> → ligne ${r.tab.d} m</div>`
        : `<p>À l’air, la PEA est la profondeur réelle : ${r.depth} m → ligne ${r.tab.d} m.</p>`);
      item('mod', 'MOD', `<div class="f">MOD = (PpO₂ max / %O₂ − 1) × 10<br>= (${fmt(r.pmax, 1)} / ${fmt(r.fo2, 2)} − 1) × 10 = ${fmt((r.pmax / r.fo2 - 1) * 10, 2)} → <b>${fmt(r.mod, 1)} m</b> (arrondi vers le bas)</div>`);
      const rows = [];
      for (let i = 1; i < r.prof.pts.length; i++) {
        const [t0, z0] = r.prof.pts[i - 1], [t1, z1] = r.prof.pts[i], dt = t1 - t0;
        if (dt <= 1e-9) continue;
        const pp = L.ppo2At((z0 + z1) / 2, r.fo2);
        const lim = pp >= 0.6 ? L.noaaLimit(pp) : 0;
        rows.push({ seg: z0 === z1 ? `à ${fmt(z0, 0)} m` : `${fmt(z0, 0)} → ${fmt(z1, 0)} m`, dt, pp, lim, v: lim ? dt / lim * 100 : 0 });
      }
      item('snc', '%SNC : la jauge cerveau', `<p class="f">%SNC = durée / durée max NOAA (ligne de PpO₂ immédiatement supérieure) × 100</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="text-align:left">Segment</th><th>Durée</th><th>PpO₂ moy.</th><th>Max NOAA</th><th>%SNC</th></tr></thead><tbody>` +
        rows.map(x => `<tr><td style="text-align:left">${x.seg}</td><td>${fmt(x.dt, 1)}</td><td>${fmt(x.pp, 2)}</td><td>${x.lim ? x.lim + ' min' : '< 0,6 b'}</td><td>${fmt(x.v, 1)}</td></tr>`).join('') +
        `</tbody></table></div><div class="f">Total = <b>${fmt(r.tox.snc, 0)} %</b> · OTU = ${fmt(r.tox.otu, 0)} / 850</div>`);
      item('narc', 'Narcose', `<div class="f">PpN₂ = Pabs × %N₂ = ${fmt(L.pabs(r.depth), 1)} × ${fmt(1 - r.fo2, 2)} = <b>${fmt(r.ppn2, 2)} b</b></div><p class="small muted">Narcose probable au-delà de 3,2 b, maximum admis 5,6 b.</p>`);
      el.calc.innerHTML = C.join('');
    }

    function openCalc(key) {
      showPane('calc');
      const t = document.getElementById('calc-' + key);
      if (!t) return;
      t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      t.classList.add('flash');
      setTimeout(() => t.classList.remove('flash'), 1200);
    }

    /* ---------- Jauges cerveau / poumons ---------- */
    const BRAIN = 'M50 16C42 8 27 10 25 22 13 24 9 38 17 46 11 56 19 70 31 68 35 78 47 80 50 72 53 80 65 78 69 68 81 70 89 56 83 46 91 38 87 24 75 22 73 10 58 8 50 16Z';
    const LUNGS = 'M45 26C45 18 39 15 34 20 22 32 14 52 14 72 14 86 23 92 34 88 42 85 45 78 45 68ZM55 26C55 18 61 15 66 20 78 32 86 52 86 72 86 86 77 92 66 88 58 85 55 78 55 68Z';
    function gaugeSvg(id, path, pct, color) {
      const h = Math.max(0, Math.min(100, pct));
      return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="${id}"><rect x="0" y="${96 - h * 0.86}" width="100" height="100"/></clipPath></defs>
        <path d="${path}" style="fill:var(--surface);stroke:var(--text2)" stroke-width="3"/>
        <path d="${path}" clip-path="url(#${id})" style="fill:${color}"/>
        ${id === 'gLungs' ? '<path d="M50 4V40M50 34L44 42M50 34L56 42" style="stroke:var(--text2)" stroke-width="3" fill="none" stroke-linecap="round"/>' : '<path d="M50 16V72" style="stroke:var(--text2)" stroke-width="2" fill="none"/>'}
      </svg>`;
    }
    function renderGauges(r) {
      if (!r.prof) { el.gauges.innerHTML = ''; return; }
      const snc = r.tox.snc, otu = r.tox.otu;
      const sColor = snc > L.LIMITS.sncMax ? 'var(--danger)' : snc > L.LIMITS.sncWarn ? 'var(--warn)' : 'var(--ok)';
      const oPct = otu / L.LIMITS.otuDay * 100;
      const oColor = oPct > 100 ? 'var(--danger)' : oPct > 60 ? 'var(--warn)' : 'var(--ok)';
      const airNote = !r.nitrox && snc < 10 ? ' À l’air, aucun risque à ces profondeurs.' : '';
      el.gauges.innerHTML = `
        <div class="gauge">${gaugeSvg('gBrain', BRAIN, snc, sColor)}<div>
          <div class="gh">Cerveau · %SNC ${H.btn('snc', `${fmt(snc, 0)} % de la dose max de la journée.`)}</div>
          <div class="gv" style="color:${sColor}">${fmt(snc, 0)} %</div>
          <div class="gt">Dose d’oxygène reçue par le cerveau. Alerte à ${L.LIMITS.sncWarn} %, limite ${L.LIMITS.sncMax} %.${airNote}</div></div></div>
        <div class="gauge">${gaugeSvg('gLungs', LUNGS, oPct, oColor)}<div>
          <div class="gh">Poumons · OTU ${H.btn('otu', `${fmt(otu, 0)} OTU sur ${L.LIMITS.otuDay} possibles aujourd’hui.`)}</div>
          <div class="gv" style="color:${oColor}">${fmt(otu, 0)} <small style="font-size:.55em">/ ${L.LIMITS.otuDay}</small></div>
          <div class="gt">Irritation des poumons par l’oxygène sur la journée.</div></div></div>`;
    }

    /* ---------- Paliers et alertes ---------- */
    function renderStops(r) {
      if (!r.prof) { el.stops.innerHTML = `<div class="alert danger">${r.tab.err}</div>`; return; }
      const st = L.stopList(r.tab.stops);
      let html = st.length
        ? `<div class="stops">${st.map(s => `<span class="stop" data-d="${s}"><i>${s} m</i> · ${r.tab.stops[s]} min</span>`).join('')}</div>`
        : `<div class="alert ok">✓ Pas de palier obligatoire. Palier de sécurité de 3 min à 3–5 m conseillé.</div>`;
      if (r.air) {
        const as = L.stopList(r.air.tab.stops);
        const txt = as.length ? as.map(s => `${s} m ${r.air.tab.stops[s]}′`).join(' + ') : 'aucun palier';
        html += `<p class="small muted" style="margin-top:10px">À l’air : ${txt} · DTR ${r.air.tab.dtr}′ → <b style="color:var(--ok)">gain Nitrox ${r.air.tab.dtr - r.tab.dtr}′</b></p>`;
      }
      el.stops.innerHTML = html;
    }

    function renderAlerts(r) {
      const A = [];
      if (r.ppo2 > r.pmax + 1e-9) A.push(['danger', `PpO₂ ${fmt(r.ppo2, 2)} b au fond : au-delà de ${fmt(r.pmax, 1)} b. Ne dépasse pas ${fmt(r.mod, 1)} m avec ce mélange.`]);
      else if (r.nitrox && r.ppo2 > 1.4 + 1e-9) A.push(['warn', `PpO₂ ${fmt(r.ppo2, 2)} b : au-dessus de 1,4 b, la jauge cerveau monte vite (×2,7 entre 1,5 et 1,6 b).`]);
      if (r.depth > 60) A.push(['danger', 'Au-delà de 60 m : interdit (tables de secours uniquement).']);
      if (r.ppn2 > 5.6) A.push(['danger', `PpN₂ ${fmt(r.ppn2, 1)} b : au-delà de 5,6 b, narcose dangereuse.`]);
      else if (r.ppn2 > 3.2) A.push(['warn', `PpN₂ ${fmt(r.ppn2, 1)} b : narcose probable, palanquée expérimentée et vigilance.`]);
      (r.fast || []).forEach(f => A.push(['danger', `Remontée trop rapide entre ${fmt(f.from[0], 1)}′ et ${fmt(f.to[0], 1)}′ : ${fmt(f.rate, 0)} m/min (max ${L.SPEED.asc} m/min).`]));
      if (r.prof) {
        if (r.left < r.gear.reserve) A.push(['danger', `Gaz insuffisant : tu sors avec ${Math.round(r.left)} b (réserve ${r.gear.reserve} b).`]);
        if (r.pBottom < r.pdecoMin) A.push(['danger', `Au départ du fond tu n’auras que ${Math.round(r.pBottom)} b : il en faut ${r.pdecoMin} pour remonter avec ta réserve.`]);
        else if (r.pBottom < r.pdecoRec) A.push(['warn', `Au départ du fond tu auras ${Math.round(r.pBottom)} b : c’est suffisant (${r.pdecoMin} b), mais sous le repère GP de ${r.pdecoRec} b. Peu de marge en cas d’imprévu.`]);
        if (r.prof.total > L.LIMITS.immersion) A.push(['danger', `Immersion de ${Math.round(r.prof.total)} min : au-delà de 2 h.`]);
        if (r.tox.snc > L.LIMITS.sncMax) A.push(['danger', `%SNC ${fmt(r.tox.snc, 0)} % : au-delà de ${L.LIMITS.sncMax} %, risque de crise hyperoxique.`]);
        else if (r.tox.snc > L.LIMITS.sncWarn) A.push(['warn', `%SNC ${fmt(r.tox.snc, 0)} % : pense à un intervalle de surface d’au moins 45 min avant de replonger.`]);
        if (r.tox.otu > L.LIMITS.otuDay) A.push(['danger', `${fmt(r.tox.otu, 0)} OTU : au-delà de la dose d’une journée.`]);
        if (r.tab.gps === '*') A.push(['info', 'Pas de lettre GPS : aucune plongée successive possible après celle-ci.']);
        if (S.view === 'draw' && S.draw.length > 3) A.push(['info', `Plongée multi-niveaux : la table est lue à la profondeur max (${r.depth} m) et à la durée jusqu’au départ du fond (${fmt(r.time, 1)} min).`]);
      }
      if (!A.some(a => a[0] === 'danger' || a[0] === 'warn')) A.unshift(['ok', 'Plongée dans les clous ✓']);
      el.alerts.innerHTML = A.map(([c, t]) => `<div class="alert ${c}">${t}</div>`).join('');
      const nD = A.filter(a => a[0] === 'danger').length, nW = A.filter(a => a[0] === 'warn').length;
      el.alertCount.textContent = nD || nW || '✓';
      el.alertCount.className = 'n ' + (nD ? '' : nW ? 'warn' : 'ok');
    }

    /* ---------- Lecture de la table, justifiée ---------- */
    function renderTableRead(r) {
      if (!r.prof) { el.tableRead.innerHTML = `<div class="alert danger">${r.tab.err}</div>`; return; }
      const d = r.tab.d, rows = L.MN90[d], i = r.tab.idx;
      const ex = rows.slice(Math.max(0, i - 2), Math.min(rows.length, i + 3));
      let cols = L.STOP_DEPTHS.filter(s => ex.some(x => x[1][s]));
      if (!cols.length) cols = [3];
      const di = L.DEPTHS.indexOf(d);
      const around = L.DEPTHS.slice(Math.max(0, di - 1), di + 2).map(x => (x === d ? `<b>${x} m</b>` : `${x} m`)).join(' · ');
      let html = `<div class="depth-lines">Lignes de profondeur : ${around}</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Durée</th>${cols.map(c => `<th class="pd${c}">${c} m</th>`).join('')}<th>DTR</th><th>GPS</th></tr></thead><tbody>` +
        ex.map(x => `<tr class="${x[0] === r.tab.t ? 'hit' : ''}"><td>${x[0]}′</td>${cols.map(c => x[1][c] ? `<td class="pd${c}" style="font-weight:800">${x[1][c]}</td>` : '<td class="dim">·</td>').join('')}<td>${x[2]}</td><td>${x[3]}</td></tr>`).join('') +
        `</tbody></table></div>`;

      const E = [];
      const src = r.nitrox ? r.pea : r.depth;
      if (r.nitrox) {
        E.push(['PEA', `au Nx${Math.round(r.fo2 * 100)} tu respires moins d’azote. (${r.depth} + 10) × ${fmt(1 - r.fo2, 2)} / 0,8 − 10 = <b>${fmt(r.pea, 1)} m</b> équivalent air.`]);
      }
      if (S.view === 'draw') E.push(['Profil', `profondeur max atteinte <b>${r.depth} m</b>, départ du fond à <b>${fmt(r.time, 1)} min</b> : c’est ce qu’on lit dans la table.`]);
      const srcTxt = r.nitrox ? fmt(src, 1) : String(src);
      E.push(['Profondeur', Math.abs(src - d) < 1e-9 ? `${srcTxt} m existe dans la table : ligne <b>${d} m</b>.` : `${srcTxt} m n’existe pas : on prend toujours la profondeur immédiatement supérieure, <b>${d} m</b>.`]);
      const tTxt = S.view === 'draw' ? fmt(r.time, 1) : String(r.time);
      E.push(['Durée', Math.abs(r.time - r.tab.t) < 1e-9 ? `${tTxt} min : ligne <b>${r.tab.t} min</b>.` : `${tTxt} min n’existe pas : on prend la durée immédiatement supérieure, <b>${r.tab.t} min</b>.`]);
      const st = L.stopList(r.tab.stops);
      E.push(['Paliers', st.length ? st.map(s => `<span class="pd${s}" style="font-weight:800">${s} m pendant ${r.tab.stops[s]} min</span>`).join(', puis ') + '.' : 'aucun palier obligatoire. Palier de sécurité 3 min conseillé.']);
      E.push(['DTR', `${r.tab.dtr} min d’après la table. Concrètement : remontée à 15 m/min${st.length ? ` jusqu’à ${st[0]} m, paliers, puis 6 m/min` : ''} jusqu’à la surface.` +
        (r.nitrox ? ` Attention : tu remontes de ${r.depth} m (pas de ${d} m), compte ${mmss(r.dtrReal)}.` : '')]);
      E.push(['GPS', r.tab.gps === '*' ? 'pas de lettre (*) : aucune plongée successive possible.' :
        `lettre <b>${r.tab.gps}</b> : elle mesure l’azote qu’il te reste en sortant. Pour une 2e plongée, tu la reportes dans le tableau I avec ton intervalle de surface.`]);
      html += `<div class="steps">${E.map(([t, x]) => `<div><em>${t}</em>${x}</div>`).join('')}</div>`;
      el.tableRead.innerHTML = html;
    }

    /* ---------- DTR et pression de décollage ---------- */
    function renderDeco(r) {
      if (!r.prof || !r.deco) { el.deco.innerHTML = '<p class="muted">Pas de calcul possible hors table.</p>'; return; }
      const D = r.deco, g = r.gear, st = L.stopList(r.tab.stops);
      const tStops = st.reduce((a, s) => a + r.tab.stops[s], 0);
      const gpAsc = Math.round(L.pabs(r.depth));
      const titoRound = Math.ceil(D.tito / 10) * 10;
      const titoLow = titoRound < D.exact;
      const rows = [
        { k: 'gp', name: 'Méthode GP', v: D.gp, best: D.gp >= D.exact,
          d: `DTR × β + sécurité = ${D.dtr} × ${fmt(D.beta.value, 1)} + ${g.reserve} = ${fmt(D.gp, 0)} b. β = ${fmt(D.beta.value, 1)} b/min pour un ${g.tank} L à ${g.sac} L/min${D.beta.fromTable ? ' (table Bardassier)' : ' (estimé)'}.` },
        { k: 'exact', name: 'Calcul exact', v: D.exact, best: D.exact > D.gp,
          d: `Gaz de toute la remontée : ${Math.round(D.ascentL)} L ÷ ${g.tank} L = ${fmt(D.ascentL / g.tank, 0)} b, + réserve ${g.reserve} b.` },
        { k: 'tito', name: 'Règle de Tito', v: D.tito, best: false,
          d: `Profondeur + 2 × DTR = ${r.depth} + 2 × ${D.dtr} = ${D.tito} b, arrondi à la dizaine supérieure : ${titoRound} b.` + (titoLow ? ` <b style="color:var(--danger)">Moins prudente que le calcul exact : ne l’utilise pas seule.</b>` : ' Cohérente avec le calcul exact pour ce bloc.') },
      ];
      // DTR max convenue : durée max au fond qui la respecte (lecture de la table à la PEA)
      const dtrMax = +el.dtrMax.value;
      let dtrLine = '';
      if (dtrMax > 0) {
        const rowsD = L.MN90[r.tab.d];
        const ok = rowsD.filter(x => x[2] <= dtrMax);
        const over = rowsD.find(x => x[2] > dtrMax);
        dtrLine = ok.length
          ? `<div><em>DTR max ${dtrMax}′</em>à ${r.tab.d} m, la table te laisse <b>${ok[ok.length - 1][0]} min au fond</b> au maximum (DTR ${ok[ok.length - 1][2]}′)${over ? ` ; à ${over[0]} min la DTR passe déjà à ${over[2]}′` : ''}.${r.tab.dtr > dtrMax ? ` <b style="color:var(--danger)">Ta plongée actuelle (DTR ${r.tab.dtr}′) dépasse ce contrat.</b>` : ''}</div>`
          : `<div><em>DTR max ${dtrMax}′</em><b style="color:var(--danger)">impossible à ${r.tab.d} m : même 5 min donnent une DTR de ${rowsD[0][2]}′.</b></div>`;
      }
      const half = Math.round(g.press / 2);
      const halfTrip = Math.round((g.press + r.pdecoRec) / 2);
      const secuOk = r.pBottom >= r.pdecoMin && r.left >= g.reserve;
      const secuMarge = r.pBottom >= r.pdecoRec;
      const timeTxt = S.view === 'draw' ? `${fmt(r.time, 1)} min` : `${r.time} min`;
      el.deco.innerHTML = `
        <div class="answer" style="margin-bottom:12px">
          <div class="ans"><span class="l">⏱ Déclencheur temps</span><span class="v">${timeTxt}</span><span class="why">Au bout de ce temps au fond, on s’en va.</span><span class="det">DTR prévue : ${D.dtr}′ (table ${r.tab.d} m / ${r.tab.t}′)</span></div>
          <div class="ans"><span class="l">🔽 Déclencheur pression</span><span class="v">${r.pdecoRec} b</span><span class="why">Dès que le manomètre l’affiche, on s’en va.</span><span class="det">Le premier des deux qui arrive fait décoller.</span></div>
        </div>
        <div class="steps" style="margin:0 0 12px">
          <div><em>DTR</em>table MN90 : <b>${D.dtr} min</b>. Méthode GP rapide : pression absolue au fond ${fmt(L.pabs(r.depth), 1)} b → environ ${gpAsc} min de remontée${tStops ? ` + ${tStops} min de paliers = ${gpAsc + tStops} min` : ''}. Attention : la DTR n’est pas le temps au fond.</div>
          ${dtrLine}
          <div><em>Mi-pression</em><b>${half} b</b> (moitié de ${g.press} b). Si la plongée est un aller-retour, le demi-tour logique se fait à (${g.press} + ${r.pdecoRec}) / 2 = <b>${halfTrip} b</b> pour garder de quoi revenir ET remonter.</div>
          <div><em>Sécu paliers</em>${secuOk ? `<b style="color:var(--ok)">OK</b> : au départ du fond tu auras environ ${Math.round(r.pBottom)} b, il en faut ${r.pdecoMin} (calcul exact)${secuMarge ? ` et ${r.pdecoRec} avec la marge GP.` : `. <b style="color:var(--warn)">Sous le repère GP de ${r.pdecoRec} b : peu de marge.</b>`}` : `<b style="color:var(--danger)">NON</b> : au départ du fond tu n’auras que ${Math.round(r.pBottom)} b, il en faut ${r.pdecoMin}. Raccourcis la plongée.`}</div>
        </div>
        <div class="deco-rows">${rows.map(x => `<div class="deco-row ${x.best ? 'best' : ''}"><span><b>${x.name}</b>${x.best ? '<span class="badge">la plus prudente</span>' : ''}${x.k === 'tito' && titoLow ? '<span class="badge warnb">insuffisante ici</span>' : ''}</span><span class="dv">${fmt(x.v, 0)} b${x.k === 'tito' && titoRound !== x.v ? ` <small style="font-size:.6em;color:var(--text2)">→ ${titoRound}</small>` : ''}</span><span class="dd">${x.d}</span></div>`).join('')}</div>
        <div class="alert ${r.pBottom < r.pdecoMin ? 'danger' : r.pBottom < r.pdecoRec ? 'warn' : 'ok'}" style="margin-top:12px">🔑 Contrat : <b>${timeTxt} au fond OU ${r.pdecoRec} b au manomètre</b>, le premier des deux fait décoller.${r.pBottom < r.pdecoRec ? ` Avec environ ${Math.round(r.pBottom)} b au départ du fond, c’est la pression qui décidera avant le temps${r.pBottom < r.pdecoMin ? ' : raccourcis la plongée' : ''}.` : ''}</div>` + phasesTable(r);
    }

    // Consommation phase par phase (repris de l'ancien outil DTR)
    function phasesTable(r) {
      const pts = r.prof.pts, g = r.gear;
      const isStop = (t0, z) => r.prof.segs.some(s => s.depth === z && Math.abs(s.from - t0) < 1e-6);
      let p = g.press, rows = '';
      for (let i = 1; i < pts.length; i++) {
        const [t0, z0] = pts[i - 1], [t1, z1] = pts[i];
        const dt = t1 - t0;
        if (dt <= 1e-9) continue;
        const L_ = L.gasUse([pts[i - 1], pts[i]], g.sac), dp = L_ / g.tank;
        p -= dp;
        const name = z1 > z0 ? `Descente → ${fmt(z1, 0)} m` : z1 < z0 ? `Remontée → ${fmt(z1, 0)} m`
          : isStop(t0, z0) ? `<span class="pd${z0}" style="font-weight:800">Palier ${z0} m</span>` : `Fond à ${fmt(z0, 0)} m`;
        const cls = p < g.reserve ? 'color:var(--danger);font-weight:800' : '';
        rows += `<tr><td style="text-align:left">${name}</td><td>${mmss(dt)}</td><td>−${fmt(dp, 1)}</td><td style="${cls}">${Math.round(p)}</td></tr>`;
      }
      return `<details style="margin-top:12px"><summary class="muted" style="cursor:pointer;font-weight:700">Consommation phase par phase</summary>
        <div class="tbl-wrap" style="margin-top:8px"><table class="tbl"><thead><tr><th style="text-align:left">Phase</th><th>Durée</th><th>bar</th><th>Reste</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
    }

    /* ---------- Procédures d'urgence (shared/procedures.js) ---------- */
    function renderEmerg(r) {
      const X = window.MN90Procedures;
      el.emerg.innerHTML = X ? `<h3>🆘 Fiche réflexe accident</h3>${X.reflex()}<h3 style="margin-top:16px"></h3>${X.html(r)}` : '';
    }

    /* ---------- Survol de la courbe ---------- */
    function svgPoint(e) {
      const rect = el.svg.getBoundingClientRect(), mp = S.map;
      const sx = (e.clientX - rect.left) / rect.width * mp.W;
      const sy = (e.clientY - rect.top) / rect.height * mp.H;
      const t = (sx - mp.m.l) / (mp.W - mp.m.l - mp.m.r) * mp.maxT;
      const z = (sy - mp.m.t) / (mp.H - mp.m.t - mp.m.b) * mp.maxZ;
      return { t, z, sx, sy, rect };
    }

    function showTip(e) {
      const r = S.last;
      if (!r || !r.prof || !S.map) return;
      const { t, rect } = svgPoint(e);
      const cur = el.svg.querySelector('#cursor');
      if (t < 0 || t > r.prof.total) { el.tip.hidden = true; if (cur) cur.style.display = 'none'; return; }
      const z = L.depthAt(r.prof.pts, t);
      if (cur) { cur.setAttribute('x1', S.map.X(t)); cur.setAttribute('x2', S.map.X(t)); cur.style.display = ''; }
      el.tip.innerHTML = `<b>${mmss(t)}</b> · ${fmt(z, 1)} m<br>PpO₂ ${fmt(L.ppo2At(z, r.fo2), 2)} b`;
      el.tip.hidden = false;
      const px = e.clientX - rect.left;
      el.tip.style.left = Math.max(4, Math.min(px + 12, rect.width - el.tip.offsetWidth - 6)) + 'px';
      el.tip.style.top = Math.min(S.map.Y(z) / S.map.H * rect.height + 10, rect.height - el.tip.offsetHeight - 4) + 'px';
    }
    function hideTip() { el.tip.hidden = true; const c = el.svg.querySelector('#cursor'); if (c) c.style.display = 'none'; }

    /* ---------- Dessin libre ---------- */
    const snap = (v, s) => Math.round(v / s) * s;
    let raf = 0;
    const renderSoon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };

    function nearest(e) {
      const { rect } = svgPoint(e);
      const k = rect.width / S.map.W;
      let best = -1, bd = 24;
      S.draw.forEach((p, i) => {
        if (i === 0) return;
        const dx = S.map.X(p[0]) * k + rect.left - e.clientX, dy = S.map.Y(p[1]) * k + rect.top - e.clientY;
        const d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }

    function removePoint(i) {
      if (i > 0 && S.draw.length > 2) { S.draw.splice(i, 1); render(); }
    }

    function onDown(e) {
      if (S.view !== 'draw' || !S.map) return;
      e.preventDefault();
      const i = nearest(e);
      if (i > 0) {
        S.drag = { i, x: e.clientX, y: e.clientY, moved: false, timer: setTimeout(() => { if (S.drag && !S.drag.moved) { const k = S.drag.i; S.drag = null; removePoint(k); } }, 650) };
      } else {
        const { t, z } = svgPoint(e);
        if (t <= 0 || t > S.map.maxT) return;
        let nt = Math.max(0.5, snap(t, 0.5));
        const nz = Math.max(0, Math.min(S.map.maxZ, snap(z, 1)));
        while (S.draw.some(p => Math.abs(p[0] - nt) < 1e-9)) nt += 0.5;
        S.draw.push([nt, nz]);
        S.draw.sort((a, b) => a[0] - b[0]);
        const idx = S.draw.findIndex(p => p[0] === nt);
        S.drag = { i: idx, x: e.clientX, y: e.clientY, moved: true, timer: 0 };
        render();
      }
      try { el.svg.setPointerCapture(e.pointerId); } catch (err) { /* pas grave */ }
    }

    function onMove(e) {
      if (S.view === 'draw' && S.drag) {
        e.preventDefault();
        if (Math.hypot(e.clientX - S.drag.x, e.clientY - S.drag.y) > 6) { S.drag.moved = true; clearTimeout(S.drag.timer); }
        if (!S.drag.moved) return;
        const { t, z } = svgPoint(e);
        const i = S.drag.i, prev = S.draw[i - 1], next = S.draw[i + 1];
        const lo = prev[0] + 0.5, hi = next ? next[0] - 0.5 : S.map.maxT;
        S.draw[i] = [Math.max(lo, Math.min(hi, snap(t, 0.5))), Math.max(0, Math.min(S.map.maxZ, snap(z, 1)))];
        renderSoon();
        return;
      }
      showTip(e);
    }

    function onUp() {
      if (S.drag) { clearTimeout(S.drag.timer); S.drag = null; }
    }

    /* ---------- Événements ---------- */
    [el.depth, el.time, el.o2, el.compare, el.scaleZ, el.scaleT, el.dtrMax].forEach(i => i.addEventListener('input', render));
    el.gasSeg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.gas = b.dataset.v; render(); } });
    el.ppSeg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { S.pmax = +b.dataset.v; render(); } });
    el.gearEdit.addEventListener('click', () => P.open());
    document.querySelectorAll('.tab[data-mode]').forEach(b => b.addEventListener('click', () => {
      S.view = b.dataset.mode;
      document.querySelectorAll('.tab[data-mode]').forEach(x => x.classList.toggle('on', x === b));
      hideTip();
      render();
    }));
    el.answerCard.addEventListener('click', e => {
      if (e.target.closest('[data-calcopen]')) { openCalc('answer'); return; }
      const b = e.target.closest('[data-settime]');
      if (!b) return;
      el.time.value = b.dataset.settime;
      render();
    });
    el.reqs.addEventListener('click', e => { if (e.target.closest('[data-open-profile]')) P.open(); });
    el.ptabs.addEventListener('click', e => { const b = e.target.closest('.ptab'); if (b) showPane(b.dataset.pane); });
    el.kpis.addEventListener('click', e => {
      if (e.target.closest('.help-btn')) return;
      const k = e.target.closest('.kpi[data-calc]');
      if (k) openCalc(k.dataset.calc);
    });
    el.undoPt.addEventListener('click', () => { if (S.draw.length > 2) { S.draw.pop(); render(); } });
    el.clearPts.addEventListener('click', () => { S.draw = [[0, 0], [2, 20], [3, 20]]; render(); });
    el.examplePts.addEventListener('click', () => {
      S.draw = [[0, 0], [2, 30], [10, 30], [12, 20], [20, 20], [22, 12], [30, 12]];
      el.scaleZ.value = 40; el.scaleT.value = 60;
      render();
    });
    el.svg.addEventListener('pointerdown', onDown);
    el.svg.addEventListener('pointermove', onMove);
    el.svg.addEventListener('pointerup', onUp);
    el.svg.addEventListener('pointercancel', onUp);
    el.svg.addEventListener('pointerleave', () => { if (!S.drag) hideTip(); });
    el.svg.addEventListener('dblclick', e => { if (S.view === 'draw') { const i = nearest(e); if (i > 0) removePoint(i); } });
    P.onChange(render);
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { setNavH(); render(); }, 120); });

    // Liens directs : #dessin ouvre le dessin libre, #contrat va au contrat de palanquée
    const hash = (location.hash || '').toLowerCase();
    if (hash === '#dessin') {
      S.view = 'draw';
      document.querySelectorAll('.tab[data-mode]').forEach(x => x.classList.toggle('on', x.dataset.mode === 'draw'));
    }
    render();
    if (hash === '#contrat') {
      showPane('contrat');
      if (!DASHBOARD.matches) setTimeout(() => el.ptabs.scrollIntoView({ block: 'start' }), 60);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
