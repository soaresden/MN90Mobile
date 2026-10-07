/* ============================================================
   MN90 Mobile — Animation d'ouverture (8 s, passable d'un toucher)
   Un plongeur fait un saut droit depuis un ponton, descend vite jusqu'à
   une épave au milieu d'un récif plein de vie. Les animaux viennent
   tourner autour de lui, il respire sur son détendeur et finit par un 👌.
   Jouée à chaque ouverture de l'accueil.
   À charger en haut de <body>, sans defer.
   ============================================================ */
(function () {
  'use strict';

  // Jouée à chaque ouverture de l'accueil. ?introAt=4000 : image figée à 4 s (pour vérifier une étape)
  const Q = new URLSearchParams(location.search);
  const FREEZE = Q.has('introAt') ? Math.max(0, +Q.get('introAt') || 0) : null;
  if (!document.body) return;

  const TXT = {
    fr: ['Bienvenue dans', 'Touche l’écran pour passer'],
    en: ['Welcome to', 'Tap the screen to skip'],
    es: ['Bienvenido a', 'Toca la pantalla para saltar'],
    it: ['Benvenuto in', 'Tocca lo schermo per saltare'],
    'pt-BR': ['Bem-vindo ao', 'Toque na tela para pular'],
    pl: ['Witaj w', 'Dotknij ekranu, aby pominąć'],
  };
  let lang = 'fr';
  try { lang = localStorage.getItem('mn90-lang') || navigator.language || 'fr'; } catch (e) { lang = 'fr'; }
  const tx = TXT[lang] || TXT[Object.keys(TXT).find(k => String(lang).toLowerCase().startsWith(k.slice(0, 2)))] || TXT.fr;

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = reduce ? 2500 : 8000;
  const NS = 'http://www.w3.org/2000/svg';
  const SURF = 300, BOTTOM = 1860;
  const END = { x: 205, y: BOTTOM - 215 };        // où le plongeur s'arrête, au-dessus de l'épave

  /* Animaux. [type, x, y, taille, vitesse, ami]. ami = vient tourner autour du plongeur à la fin.
     Les types en lettres sont dessinés (raie, poisson-clown, hippocampe), les autres sont des emojis. */
  const CREW = [
    ['ray', -80, 1380, 1.1, 0.5, 0], ['ray', 470, 1560, 0.8, 0.6, 0],
    ['clown', 110, 1590, 1, 1.1, 1], ['clown', 300, 1560, 0.9, 1.3, 1], ['clown', 60, 1740, 0.8, 1, 0],
    ['horse', 30, 1770, 1, 0.6, 0], ['horse', 418, 1745, 0.9, 0.7, 0],
    ['🐢', 340, 1610, 34, 0.5, 1], ['🐢', -30, 1500, 28, 0.4, 0],
    ['🐡', 260, 1690, 26, 0.8, 1], ['🐡', 70, 1640, 22, 0.9, 0], ['🐡', 420, 1450, 24, 0.7, 0],
    ['🦐', 150, 1830, 20, 0.9, 1], ['🦐', 330, 1835, 18, 1.1, 0], ['🦐', 250, 1600, 18, 1.2, 1],
    ['🐠', 180, 1520, 24, 1.2, 1], ['🐠', 380, 1690, 22, 1.4, 0], ['🐠', 20, 1580, 22, 1.1, 0], ['🐠', 240, 1460, 20, 1.5, 1],
    ['🐟', 300, 1480, 22, 1.4, 0], ['🐟', 140, 1700, 20, 1.6, 1], ['🐟', 200, 960, 18, 1.6, 0], ['🐟', 90, 1180, 20, 1.3, 0],
    ['🐙', 395, 1812, 28, 0.25, 0], ['🦀', 120, 1842, 22, 0.8, 0], ['🦑', 430, 1380, 28, 0.7, 0],
    ['🪼', 330, 720, 26, 0.5, 0], ['🪼', 60, 880, 20, 0.6, 0], ['🐬', -60, 520, 36, 0.9, 0], ['🐳', 480, 1050, 46, 0.3, 0],
    ['🐚', 300, 1850, 18, 0, 0], ['🪸', 40, 1838, 34, 0, 0], ['🪸', 360, 1842, 30, 0, 0], ['🪸', 200, 1850, 26, 0, 0],
  ];

  const ov = document.createElement('div');
  ov.className = 'intro';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-label', `${tx[0]} MN90 Mobile`);
  ov.innerHTML = `
    <style>
      .intro { position: fixed; inset: 0; z-index: 9999; background: #0a3d62; cursor: pointer; overflow: hidden; transition: opacity .5s; touch-action: manipulation; }
      .intro.out { opacity: 0; pointer-events: none; }
      .intro svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
      .intro-title { position: absolute; left: 0; right: 0; top: 14%; text-align: center; color: #fff; opacity: 0; transform: translateY(12px); transition: opacity .9s, transform .9s; text-shadow: 0 2px 12px rgba(0,0,0,.6); padding: 0 16px; pointer-events: none; }
      .intro-title.on { opacity: 1; transform: none; }
      .intro-title small { display: block; font-size: clamp(1rem, 4vw, 1.4rem); font-weight: 600; letter-spacing: .04em; opacity: .92; }
      .intro-title b { display: block; font-size: clamp(2.2rem, 10vw, 4.2rem); font-weight: 900; line-height: 1.05; }
      .intro-skip { position: absolute; left: 0; right: 0; bottom: max(18px, env(safe-area-inset-bottom)); text-align: center; color: rgba(255,255,255,.85); font-size: .9rem; font-weight: 600; pointer-events: none; animation: intro-blink 1.6s ease-in-out infinite; }
      .intro-bar { position: absolute; left: 0; bottom: 0; height: 3px; background: #4fd1c5; width: 0; }
      @keyframes intro-blink { 50% { opacity: .35; } }
    </style>
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g id="intro-world"></g></svg>
    <div class="intro-title"><small>${tx[0]}</small><b>🤿 MN90 Mobile</b></div>
    <div class="intro-skip">${tx[1]}</div>
    <div class="intro-bar"></div>`;
  document.body.appendChild(ov);
  document.documentElement.style.overflow = 'hidden';

  const svg = ov.querySelector('svg'), world = ov.querySelector('#intro-world');
  const title = ov.querySelector('.intro-title'), bar = ov.querySelector('.intro-bar');

  // Créatures dessinées, centrées sur l'origine, tournées vers la droite
  const SHAPES = {
    ray: `<g class="wing"><path d="M0 -4 C 20 -30 50 -26 62 -6 C 44 -2 22 4 0 6 C -22 4 -44 -2 -62 -6 C -50 -26 -20 -30 0 -4 Z" fill="#5d7f99" stroke="#0b2545" stroke-width="2.4"/></g>
          <path d="M0 6 Q -6 30 -30 52" stroke="#2c4a60" stroke-width="2" fill="none"/>
          <circle cx="-8" cy="-10" r="3.5" fill="#fff" stroke="#0b2545" stroke-width="1.2"/><circle cx="8" cy="-10" r="3.5" fill="#fff" stroke="#0b2545" stroke-width="1.2"/><circle cx="-7.5" cy="-9.5" r="1.6" fill="#0b2545"/><circle cx="8.5" cy="-9.5" r="1.6" fill="#0b2545"/><path d="M-5 -3 q 5 4 10 0" stroke="#0b2545" stroke-width="1.5" fill="none"/>
          <path d="M-14 -16 q 14 8 28 0" stroke="#e8f4fb" stroke-width="1.5" fill="none" opacity=".6"/>`,
    clown: `<ellipse cx="0" cy="0" rx="16" ry="10" fill="#ff7b1c" stroke="#0b2545" stroke-width="2.2"/>
          <path d="M-14 0 L-26 -9 L-26 9 Z" fill="#ff7b1c" stroke="#0b2545" stroke-width="2.2"/>
          <path d="M6 -9.5 q -4 9.5 0 19" stroke="#fff" stroke-width="4" fill="none"/>
          <path d="M-5 -10 q -4 10 0 20" stroke="#fff" stroke-width="4" fill="none"/>
          <circle cx="9" cy="-3" r="4" fill="#fff" stroke="#0b2545" stroke-width="1.5"/><circle cx="10" cy="-3" r="2" fill="#0b2545"/><path d="M11 3 q 3 2 5 0" stroke="#1b1b1b" stroke-width="1.2" fill="none"/>`,
    horse: `<path d="M4 -26 q 10 -2 12 6 l -8 2 q 4 10 -2 22 q -8 14 0 22 q 6 6 -2 10 q -10 -2 -6 -12 q -8 -14 0 -26 q 2 -8 -6 -14 q -2 -8 12 -10 Z" fill="#f5b83d" stroke="#0b2545" stroke-width="2.2"/>
          <circle cx="7" cy="-21" r="3.4" fill="#fff" stroke="#0b2545" stroke-width="1.2"/><circle cx="8" cy="-21" r="1.6" fill="#0b2545"/><path d="M-4 -6 q -8 4 -2 10" stroke="#ffe3a3" stroke-width="2" fill="none"/>`,
  };

  world.innerHTML = `
    <defs>
      <linearGradient id="in-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3fe"/><stop offset="1" stop-color="#d9f2ff"/></linearGradient>
      <linearGradient id="in-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2bb3d9"/><stop offset=".35" stop-color="#0f7fae"/><stop offset=".75" stop-color="#0b5a86"/><stop offset="1" stop-color="#08385a"/></linearGradient>
      <linearGradient id="in-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="in-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9ff0ff" stop-opacity=".45"/><stop offset="1" stop-color="#9ff0ff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="-2000" y="-200" width="4400" height="${SURF + 200}" fill="url(#in-sky)"/>
    <g stroke="#0b2545" stroke-width="2.4" stroke-linecap="round">
      <g id="in-sun" transform="translate(330 90)">
        ${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<line x1="0" y1="-44" x2="0" y2="-56" transform="rotate(${a})" stroke="#f4a300" stroke-width="5"/>`).join('')}
        <circle r="34" fill="#ffd23f"/>
        <circle cx="-11" cy="-6" r="3.5" fill="#0b2545" stroke="none"/><circle cx="11" cy="-6" r="3.5" fill="#0b2545" stroke="none"/>
        <path d="M-13 8 q 13 12 26 0" fill="none" stroke-width="3"/>
        <circle cx="-20" cy="6" r="5" fill="#ff9aa2" stroke="none" opacity=".7"/><circle cx="20" cy="6" r="5" fill="#ff9aa2" stroke="none" opacity=".7"/>
      </g>
      <g id="in-clouds" fill="#fff">
        <path d="M30 120 a18 18 0 0 1 30 -14 a22 22 0 0 1 40 6 a14 14 0 0 1 4 28 h-70 a14 14 0 0 1 -4 -20 Z"/>
        <path d="M170 60 a14 14 0 0 1 24 -10 a18 18 0 0 1 32 4 a12 12 0 0 1 2 22 h-54 a12 12 0 0 1 -4 -16 Z"/>
      </g>
    </g>
    <rect x="-2000" y="${SURF}" width="4400" height="${BOTTOM - SURF + 400}" fill="url(#in-sea)"/>
    <g opacity=".9">${[-60, 40, 150, 260, 370].map((x, k) => `<polygon points="${x},${SURF} ${x + 40},${SURF} ${x + 110 + k * 8},${SURF + 560} ${x + 30 + k * 8},${SURF + 560}" fill="url(#in-ray)"/>`).join('')}</g>
    <path id="in-wave" fill="#bfefff" opacity=".8" d=""/>
    <g>
      <rect x="-200" y="${SURF - 32}" width="380" height="14" rx="5" fill="#c68642" stroke="#0b2545" stroke-width="2.4"/>
      ${[-160, -80, 0, 80, 150].map(x => `<rect x="${x}" y="${SURF - 20}" width="12" height="70" rx="4" fill="#8b5a2b" stroke="#0b2545" stroke-width="2.4"/>`).join('')}
      ${[-180, -120, -60, 0, 60, 120].map(x => `<line x1="${x}" y1="${SURF - 32}" x2="${x}" y2="${SURF - 18}" stroke="#6b4220" stroke-width="2"/>`).join('')}
      <rect x="-30" y="${SURF - 70}" width="6" height="38" fill="#6b4220"/><polygon points="-24,${SURF - 70} 10,${SURF - 62} -24,${SURF - 54}" fill="#d62828"/>
    </g>
    <g>
      <path d="M-2000 ${BOTTOM} Q 100 ${BOTTOM - 30} 400 ${BOTTOM} T 2400 ${BOTTOM} V ${BOTTOM + 400} H -2000 Z" fill="#f6d98b" stroke="#0b2545" stroke-width="3"/>
      <ellipse cx="210" cy="${BOTTOM - 120}" rx="260" ry="150" fill="url(#in-glow)"/>
      <g transform="rotate(-8 210 ${BOTTOM - 40})">
        <path d="M40 ${BOTTOM - 70} L380 ${BOTTOM - 70} Q 372 ${BOTTOM - 10} 350 ${BOTTOM - 10} L70 ${BOTTOM - 10} Q 46 ${BOTTOM - 20} 40 ${BOTTOM - 70} Z" fill="#6c5b7b" stroke="#0b2545" stroke-width="3"/>
        <rect x="110" y="${BOTTOM - 110}" width="120" height="40" rx="8" fill="#8e7aa1" stroke="#0b2545" stroke-width="3"/>
        <rect x="250" y="${BOTTOM - 95}" width="60" height="25" rx="6" fill="#8e7aa1" stroke="#0b2545" stroke-width="3"/>
        <line x1="170" y1="${BOTTOM - 110}" x2="160" y2="${BOTTOM - 230}" stroke="#4a5a66" stroke-width="6"/>
        <line x1="160" y1="${BOTTOM - 200}" x2="215" y2="${BOTTOM - 190}" stroke="#4a5a66" stroke-width="4"/>
        ${[86, 124, 162].map(x => `<circle cx="${x}" cy="${BOTTOM - 45}" r="8" fill="#bdf0ff" stroke="#0b2545" stroke-width="3"/>`).join('')}
        <!-- Nom de l'épave : OGN, avec le badge du lapin plongeur du club -->
        <text x="248" y="${BOTTOM - 31}" font-size="30" font-weight="900" text-anchor="middle" fill="#ffffff" stroke="#0b2545" stroke-width="3" paint-order="stroke" font-family="Arial Black, Arial, sans-serif" letter-spacing="2">OGN</text>
        <g transform="translate(322 ${BOTTOM - 42})" stroke="#0b2545" stroke-width="2.2" stroke-linejoin="round">
          <circle r="19" fill="#ff6b6b"/>
          <ellipse cx="-5" cy="-13" rx="3.4" ry="9" fill="#fff" transform="rotate(-12 -5 -6)"/>
          <ellipse cx="5" cy="-13" rx="3.4" ry="9" fill="#fff" transform="rotate(12 5 -6)"/>
          <circle cx="0" cy="2" r="9" fill="#fff"/>
          <rect x="-8" y="-3" width="16" height="7" rx="3.5" fill="#bdf0ff" stroke="#1b8a80" stroke-width="1.8"/>
          <circle cx="7" cy="8" r="2.4" fill="#b8c2cc" stroke-width="1.2"/>
        </g>
        <path d="M60 ${BOTTOM - 70} q20 -10 40 0 q20 10 40 0 q20 -10 40 0" stroke="#2f9e6b" stroke-width="3" fill="none"/>
        <circle cx="300" cy="${BOTTOM - 72}" r="9" fill="#ff6fae"/><circle cx="318" cy="${BOTTOM - 74}" r="6" fill="#ffd166"/><circle cx="96" cy="${BOTTOM - 74}" r="7" fill="#c77dff"/>
      </g>
      ${[20, 70, 120, 330, 360, 395].map((x, k) => `<path class="in-weed" d="M${x} ${BOTTOM} q -12 -30 0 -60 q 12 -30 0 -60" stroke="${k % 2 ? '#2f9e6b' : '#3fbf7f'}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}
    </g>
    <g id="in-bubbles"></g>
    <g id="in-crew">${CREW.map(([e, x, y, s]) => SHAPES[e]
      ? `<g class="cr" transform="translate(${x} ${y})"><g transform="scale(${s})">${SHAPES[e]}</g></g>`
      : `<text class="cr" x="${x}" y="${y}" font-size="${Math.round(s * 1.5)}" text-anchor="middle" dominant-baseline="middle">${e}</text>`).join('')}</g>
    <g id="in-hearts"></g>
    <!-- Le lapin plongeur, mascotte de la section plongée du club -->
    <g id="in-rabbit">
      <g stroke="#0b2545" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
        <g id="in-ears">
          <ellipse cx="-5" cy="-60" rx="6" ry="17" fill="#ffffff" transform="rotate(-14 -5 -46)"/>
          <ellipse cx="-5" cy="-60" rx="2.6" ry="11" fill="#ffb3c6" stroke="none" transform="rotate(-14 -5 -46)"/>
          <ellipse cx="9" cy="-62" rx="6" ry="17" fill="#ffffff" transform="rotate(12 9 -46)"/>
          <ellipse cx="9" cy="-62" rx="2.6" ry="11" fill="#ffb3c6" stroke="none" transform="rotate(12 9 -46)"/>
        </g>
        <rect x="-19" y="-20" width="10" height="28" rx="5" fill="#2ec4b6"/>
        <rect x="-8" y="6" width="7" height="18" rx="3.5" fill="#ffffff"/>
        <rect x="1" y="6" width="7" height="18" rx="3.5" fill="#ffffff"/>
        <g id="in-rfins"><path d="M-9 22 q -5 12 -1 20 q 5 2 9 0 q 1 -10 0 -20 Z" fill="#ff5d8f"/><path d="M0 22 q -1 10 0 20 q 5 2 9 0 q 3 -8 -2 -20 Z" fill="#ff5d8f"/></g>
        <rect x="-10" y="-22" width="20" height="32" rx="10" fill="#ffffff"/>
        <path d="M-9 -2 h 18" stroke="#2ec4b6" stroke-width="3.5"/>
        <circle cx="2" cy="-33" r="15" fill="#ffffff"/>
        <rect x="-3" y="-44" width="20" height="13" rx="6" fill="#bdf0ff" stroke="#1b8a80" stroke-width="2.6"/>
        <circle cx="3" cy="-37.5" r="3.4" fill="#fff" stroke-width="1.3"/><circle cx="11" cy="-37.5" r="3.4" fill="#fff" stroke-width="1.3"/>
        <circle id="in-reye" cx="4" cy="-37" r="1.6" fill="#0b2545" stroke="none"/><circle cx="12" cy="-37" r="1.6" fill="#0b2545" stroke="none"/>
        <circle cx="16" cy="-27" r="2.2" fill="#ff8fab" stroke="none"/>
        <path d="M9 -24 h 4 v 4 h -4 Z" fill="#ffffff" stroke-width="1.4"/>
        <path d="M12 -27 l 9 -2 M12 -25 l 9 1" stroke-width="1.2"/>
        <circle cx="19" cy="-22" r="3.6" fill="#b8c2cc"/>
        <g id="in-rarm"><rect x="2" y="-18" width="7" height="16" rx="3.5" fill="#ffffff"/><circle cx="5.5" cy="0" r="3.4" fill="#ffffff"/></g>
      </g>
    </g>
    <g id="in-diver">
      <g stroke="#0b2545" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
        <!-- Bloc : gros, jaune, avec sa robinetterie -->
        <rect x="-24" y="-24" width="14" height="38" rx="7" fill="#ffd23f"/>
        <rect x="-20" y="-30" width="6" height="7" rx="2" fill="#b8c2cc"/>
        <path d="M-17 -29 q 6 -10 26 -2" fill="none" stroke-width="2.6"/>
        <!-- Jambes et palmes -->
        <rect x="-9" y="6" width="8" height="22" rx="4" fill="#1d3557"/>
        <rect x="1" y="6" width="8" height="22" rx="4" fill="#1d3557"/>
        <g id="in-fins"><path d="M-10 26 q -6 14 -2 24 q 6 2 10 0 q 2 -12 0 -24 Z" fill="#ffd400"/><path d="M0 26 q -2 12 0 24 q 6 2 10 0 q 4 -10 -2 -24 Z" fill="#ffd400"/></g>
        <!-- Corps : combinaison bleue, bande turquoise -->
        <rect x="-11" y="-24" width="22" height="36" rx="11" fill="#1d3557"/>
        <path d="M-10 -4 h 20" stroke="#4fd1c5" stroke-width="4"/>
        <rect x="-13" y="2" width="26" height="5" rx="2.5" fill="#e63946"/>
        <rect x="-9" y="-20" width="7" height="20" rx="3.5" fill="#1d3557"/>
        <!-- Grosse tête : cagoule, masque, grands yeux, sourire autour du détendeur -->
        <circle cx="2" cy="-38" r="15" fill="#1d3557"/>
        <circle cx="9" cy="-36" r="9" fill="#ffd6b0" stroke-width="2"/>
        <rect x="2" y="-49" width="20" height="13" rx="6" fill="#bdf0ff"/>
        <circle cx="9" cy="-42.5" r="3.6" fill="#fff" stroke-width="1.4"/><circle cx="16.5" cy="-42.5" r="3.6" fill="#fff" stroke-width="1.4"/>
        <circle id="in-eye1" cx="10.2" cy="-42" r="1.7" fill="#0b2545" stroke="none"/><circle id="in-eye2" cx="17.7" cy="-42" r="1.7" fill="#0b2545" stroke="none"/>
        <path d="M5 -46 l 3 -1.5" stroke="#fff" stroke-width="1.6"/>
        <path d="M8 -31 q 5 4 10 0" fill="none" stroke-width="2"/>
        <circle cx="19" cy="-31" r="4" fill="#b8c2cc"/>
        <!-- Bras qui fera le 👌 -->
        <g id="in-arm"><rect x="2" y="-20" width="8" height="20" rx="4" fill="#1d3557"/><circle cx="6" cy="1" r="3.6" fill="#1d3557"/></g>
      </g>
      <text id="in-ok" x="0" y="0" font-size="30" text-anchor="middle" dominant-baseline="middle" opacity="0">👌</text>
    </g>
    <g id="in-splash" opacity="0"></g>`;

  const $ = s => world.querySelector(s);
  const diver = $('#in-diver'), fins = $('#in-fins'), arm = $('#in-arm'), ok = $('#in-ok');
  const wave = $('#in-wave'), splash = $('#in-splash'), hearts = $('#in-hearts');
  const rabbit = $('#in-rabbit'), ears = $('#in-ears'), rfins = $('#in-rfins'), rarm = $('#in-rarm');
  const crewEls = [...world.querySelectorAll('#in-crew .cr')], weeds = [...world.querySelectorAll('.in-weed')];

  // Bulles et cœurs réutilisés
  function pool(parent, n, make) { const a = []; for (let k = 0; k < n; k++) { const e = make(); parent.appendChild(e); a.push({ el: e, life: 0 }); } return a; }
  const BUB = pool($('#in-bubbles'), 40, () => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#ffffff'); c.setAttribute('stroke-width', '2'); c.setAttribute('r', '0'); return c; });
  const HEART = pool(hearts, 14, () => { const t = document.createElementNS(NS, 'text'); t.setAttribute('font-size', '16'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('opacity', '0'); return t; });
  let bi = 0, hi = 0;
  const puff = (x, y) => { const b = BUB[bi++ % BUB.length]; b.x = x + (Math.random() - 0.5) * 6; b.y = y; b.r = 1.5 + Math.random() * 3.5; b.life = 1; };
  const love = (x, y) => { const h = HEART[hi++ % HEART.length]; h.x = x; h.y = y; h.life = 1; h.el.textContent = ['💖', '✨', '💙', '💛'][hi % 4]; };

  // Cadrage : la largeur suit l'écran (portrait ou paysage), la hauteur fait 800
  // En paysage on cadre plus serré (560 de haut) pour que le plongeur reste bien visible
  let vw = 400, vh = 800;
  const fit = () => { const a = innerWidth / Math.max(1, innerHeight); vh = a > 1 ? 560 : 800; vw = Math.max(400, vh * a); };
  fit(); addEventListener('resize', fit);

  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
  const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const seg = (t, a, b) => (t - a) / (b - a);

  // Trajet : debout, pas de géant, chute droite, bascule tête en bas, descente rapide, redressement face à toi
  function pose(t) {
    if (reduce) return { x: END.x, y: END.y, a: 0, cam: BOTTOM + 60 - vh };
    let x = 150, y = SURF - 97, a = 0;
    if (t < 500) { /* debout sur le ponton */ }
    else if (t < 1100) { const k = ease(seg(t, 500, 1100)); x = lerp(150, 205, k); y = SURF - 97 - Math.sin(k * Math.PI) * 14; }
    else if (t < 1550) { const k = seg(t, 1100, 1550); x = 205; y = lerp(SURF - 97, SURF + 30, k * k); }
    else if (t < 2100) { const k = ease(seg(t, 1550, 2100)); x = lerp(205, 212, k); y = lerp(SURF + 30, SURF + 110, k); a = lerp(0, 165, k); }
    else if (t < 5000) { const k = ease(seg(t, 2100, 5000)); x = lerp(212, 240, k); y = lerp(SURF + 110, END.y - 20, k); a = 165 + Math.sin(t / 260) * 4; }
    else { const k = ease(seg(t, 5000, 6000)); x = lerp(240, END.x, k); y = lerp(END.y - 20, END.y, k) + Math.sin(t / 600) * 3; a = lerp(165, 360, k); }
    const cam = Math.max(0, Math.min(BOTTOM + 60 - vh, y - vh * 0.42));
    return { x, y, a, cam };
  }
  const RLAG = 350;
  function rabbitPose(t) {
    const P = pose(t - RLAG);
    const wob = t > 1900 ? Math.sin(t / 380) * 6 : 0;          // il nage en ondulant
    return { x: P.x - 58 + wob, y: P.y + 17, a: P.a };
  }
  // Éclaboussure aux couleurs du club : des vagues bleues qui s'enroulent, et des gouttes
  function splashAt(x, k) {
    const sc = 0.4 + k * 1.2, op = Math.max(0, 1 - k);
    const curl = (dx, r, c, flip) => `<path d="M${dx} 0 a ${r} ${r} 0 1 ${flip ? 0 : 1} ${flip ? -r * 1.6 : r * 1.6} ${-r * 0.9} a ${r * 0.5} ${r * 0.5} 0 0 ${flip ? 0 : 1} ${flip ? r * 0.5 : -r * 0.5} ${r * 0.6}" fill="none" stroke="${c}" stroke-width="${7 - k * 3}" stroke-linecap="round"/>`;
    return `<g transform="translate(${x} ${SURF}) scale(${sc})" opacity="${op.toFixed(2)}">` +
      curl(-6, 14, '#29b6f6', true) + curl(6, 14, '#29b6f6', false) + curl(-14, 22, '#81d4fa', true) + curl(14, 22, '#81d4fa', false) +
      [-30, -16, 0, 16, 30].map((dx, j) => `<circle cx="${dx * (1 + k)}" cy="${-Math.sin(k * Math.PI) * (28 + (j % 2) * 18)}" r="3.5" fill="#e1f5fe" stroke="#29b6f6" stroke-width="1.5"/>`).join('') + '</g>';
  }

  const t0 = performance.now();
  let raf = 0, lastPuff = 0, lastRPuff = 0, lastLove = 0, done = false;
  function frame(now) {
    const t = FREEZE !== null ? FREEZE : reduce ? DUR - 1 : now - t0;
    const P = pose(t);
    svg.setAttribute('viewBox', `${(400 - vw) / 2} ${P.cam} ${vw} ${vh}`);
    diver.setAttribute('transform', `translate(${P.x} ${P.y}) rotate(${P.a}) scale(1.3)`);
    fins.setAttribute('transform', t > 1550 && t < 6000 ? `rotate(${Math.sin(t / 90) * 14} 0 30)` : `rotate(${Math.sin(t / 400) * 5} 0 30)`);
    const RP = rabbitPose(t);
    rabbit.setAttribute('transform', `translate(${RP.x.toFixed(1)} ${RP.y.toFixed(1)}) rotate(${RP.a.toFixed(1)}) scale(1.15)`);
    // Oreilles qui flottent dans l'eau, palmes qui battent, petit coucou de la patte à la fin
    ears.setAttribute('transform', `rotate(${(t > 1900 ? Math.sin(t / 240) * 9 : Math.sin(t / 500) * 3).toFixed(1)} 2 -46)`);
    rfins.setAttribute('transform', t > 1900 && t < 6300 ? `rotate(${Math.sin(t / 85 + 1) * 16} 0 24)` : '');
    const wave2 = ease(seg(t, 6200, 6600));
    rarm.setAttribute('transform', `rotate(${(-wave2 * 140 + (wave2 >= 1 ? Math.sin(t / 120) * 18 : 0)).toFixed(1)} 5 -16)`);
    $('#in-reye').setAttribute('r', t > 7100 && t < 7350 ? '0.4' : '1.6');
    // Le 👌 final : le bras se lève vers toi
    const okK = ease(seg(t, 6000, 6500));
    arm.setAttribute('transform', `rotate(${-okK * 125} 6 -18)`);
    ok.setAttribute('opacity', okK.toFixed(2));
    // Clin d'œil final
    $('#in-eye1').setAttribute('r', t > 6700 && t < 6950 ? '0.4' : '1.7');
    ok.setAttribute('transform', `translate(${24 + okK * 6} ${-52}) scale(${0.4 + okK * 0.9 + Math.sin(t / 160) * 0.05 * okK})`);
    $('#in-sun').setAttribute('transform', `translate(330 90) rotate(${(t / 60) % 360})`);
    // Vagues
    let d = `M -2000 ${SURF}`;
    for (let x = -600; x <= 1000; x += 20) d += ` L ${x} ${SURF + Math.sin(x / 30 + t / 400) * 3}`;
    wave.setAttribute('d', d + ` L 2400 ${SURF} L 2400 ${SURF + 6} L -2000 ${SURF + 6} Z`);
    // Éclaboussure
    if (!reduce && t > 1450 && t < 2300 + RLAG) {
      splash.setAttribute('opacity', '1');
      splash.innerHTML = (t < 2300 ? splashAt(205, seg(t, 1450, 2300)) : '') + (t > 1450 + RLAG ? splashAt(147, seg(t, 1450 + RLAG, 2300 + RLAG)) : '');
    } else splash.setAttribute('opacity', '0');
    // Respiration sur le détendeur : 1,1 s d'inspiration, puis une salve de bulles à l'expiration
    const r = P.a * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
    const regX = P.x + 1.3 * (22 * cos + 31 * sin), regY = P.y + 1.3 * (22 * sin - 31 * cos);
    const phase = (t % 1900) / 1900;
    if (t > 1550 && phase > 0.58 && now - lastPuff > 55) { lastPuff = now; puff(regX, regY); }
    const rr = RP.a * Math.PI / 180, rph = ((t + 900) % 1700) / 1700;
    if (t > 1900 && rph > 0.62 && now - lastRPuff > 70) { lastRPuff = now; puff(RP.x + 1.15 * (19 * Math.cos(rr) + 22 * Math.sin(rr)), RP.y + 1.15 * (19 * Math.sin(rr) - 22 * Math.cos(rr))); }
    BUB.forEach(b => {
      if (b.life <= 0) { b.el.setAttribute('r', '0'); return; }
      b.y -= 1.8 + b.r * 0.25; b.x += Math.sin(b.y / 11) * 0.7; b.life -= 0.01;
      if (b.y < SURF) b.life = 0;
      b.el.setAttribute('cx', b.x.toFixed(1)); b.el.setAttribute('cy', b.y.toFixed(1));
      b.el.setAttribute('r', b.r.toFixed(1)); b.el.setAttribute('opacity', Math.max(0, b.life).toFixed(2));
    });
    // Les animaux nagent ; les « amis » viennent tourner autour du plongeur à la fin
    const meet = ease(seg(t, 4800, 6400));
    crewEls.forEach((el, k) => {
      const [type, x0, y0, , sp, friend] = CREW[k];
      let x = x0, y = y0, flip = false;
      if (sp) {
        const dir = k % 2 ? 1 : -1;
        x = x0 + Math.sin(t / 1000 * sp + k) * 40 + dir * t / 1000 * sp * 7;
        y = y0 + Math.sin(t / 700 * sp + k * 2) * 8;
        flip = Math.cos(t / 1000 * sp + k) * 40 * sp / 1000 + dir * sp * 0.007 < 0;
        if (friend && meet > 0) {
          const ang = t / 1400 * (k % 2 ? 1 : -1) + k * 1.3, rad = 52 + (k % 3) * 16;
          const ox = END.x + Math.cos(ang) * rad * 1.15, oy = END.y + 6 + Math.sin(ang) * rad * 0.75;
          x = lerp(x, ox, meet); y = lerp(y, oy, meet);
          if (meet > 0.6) flip = (k % 2 ? 1 : -1) * -Math.sin(ang) < 0;
        }
      }
      if (type === 'ray') {
        el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${CREW[k][3]})`);
        el.querySelector('.wing').setAttribute('transform', `scale(1 ${(0.75 + Math.sin(t / 260 + k) * 0.35).toFixed(2)})`);
      } else if (type === 'clown' || type === 'horse') {
        el.setAttribute('transform', `translate(${x.toFixed(1)} ${(type === 'horse' ? y0 + Math.sin(t / 500 + k) * 10 : y).toFixed(1)}) scale(${(flip && type === 'clown' ? -1 : 1) * CREW[k][3]} ${CREW[k][3]})`);
      } else {
        el.setAttribute('x', x.toFixed(1)); el.setAttribute('y', y.toFixed(1));
        el.setAttribute('transform', flip ? `translate(${(2 * x).toFixed(1)} 0) scale(-1 1)` : '');
      }
      // Animaux heureux : de petits cœurs s'envolent
      if (friend && meet > 0.7 && now - lastLove > 260 && Math.random() < 0.18) { lastLove = now; love(x, y - 14); }
    });
    HEART.forEach(h => {
      if (h.life <= 0) { h.el.setAttribute('opacity', '0'); return; }
      h.y -= 0.8; h.life -= 0.014;
      h.el.setAttribute('x', h.x.toFixed(1)); h.el.setAttribute('y', h.y.toFixed(1)); h.el.setAttribute('opacity', Math.max(0, h.life).toFixed(2));
    });
    weeds.forEach((w, k) => w.setAttribute('transform', `skewX(${Math.sin(t / 700 + k) * 6})`));
    bar.style.width = Math.min(100, (now - t0) / DUR * 100) + '%';
    if ((FREEZE !== null ? FREEZE : now - t0) > (reduce ? 200 : 5600)) title.classList.add('on');
    if (FREEZE === null && now - t0 >= DUR) return close();
    raf = requestAnimationFrame(frame);
  }

  function close() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    ov.classList.add('out');
    document.documentElement.style.overflow = '';
    setTimeout(() => ov.remove(), 550);
  }
  ov.addEventListener('click', close);
  document.addEventListener('keydown', function onKey(e) {
    if (done) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); }
  });
  raf = requestAnimationFrame(frame);
  window.MN90Intro = { close };
})();
