/* ============================================================
   MN90 Mobile — Glossaire : explications simples + version "cours"
   Tout bouton  <button class="help-btn" data-help="snc" data-example="...">?</button>
   ouvre l'explication. Expose window.MN90Help.
   ============================================================ */
(function () {
  'use strict';

  const G = {
    dtr: {
      title: 'DTR : durée totale de remontée',
      simple: 'Le temps qu’il te faut pour revenir du fond à la surface, paliers compris. C’est la table qui te la donne.',
      cours: 'Lue dans la table MN90 sur la ligne (profondeur, durée) retenue. Elle suppose une remontée à 15 m/min jusqu’au 1er palier puis 6 m/min entre les paliers et jusqu’à la surface. En planification GP : DTR ≈ pression absolue du fond (en minutes) + durée des paliers.',
    },
    pdeco: {
      title: 'Pression de décollage',
      simple: 'La pression que doit afficher ton manomètre au moment de quitter le fond, pour faire toute la remontée et sortir avec ta réserve.',
      cours: 'Méthode GP : Pdéco = DTR × β + pression de sécurité. β (bar par minute de DTR) dépend du bloc et de la conso : 3 pour un 15 L et 4 pour un 12 L à 20 L/min. La règle de Tito (profondeur + 2 × DTR) est un moyen mnémotechnique moins prudent : l’appli te montre l’écart.',
    },
    gps: {
      title: 'GPS : groupe de plongée successive',
      simple: 'Une lettre qui dit combien d’azote il te reste dans le corps en sortant de l’eau. Plus la lettre est loin dans l’alphabet, plus il en reste.',
      cours: 'Lettre lue sur la ligne MN90. Pour une 2e plongée : tableau I (lettre + intervalle de surface → azote résiduel), puis tableau II (azote résiduel + profondeur de la 2e plongée → majoration). « * » : pas de plongée successive possible.',
    },
    ppo2: {
      title: 'PpO₂ : pression partielle d’oxygène',
      simple: 'La « force » de l’oxygène que tu respires. Elle augmente quand tu descends. Trop forte, l’oxygène devient toxique pour le cerveau.',
      cours: 'PpO₂ = Pabs × %O₂. Limite FFESSM 1,6 b ; DAN recommande 1,4 b en plongée ; best mix souvent calculé à 1,5 b pour limiter le %SNC.',
    },
    mod: {
      title: 'MOD : profondeur maximale d’utilisation',
      simple: 'La profondeur à ne JAMAIS dépasser avec ce mélange. Elle est écrite sur ton bloc.',
      cours: 'MOD = (PpO₂ max / %O₂ − 1) × 10, arrondie vers le bas. Exemple : Nx32 à 1,4 b → 4,375 b → 33,7 m.',
    },
    pea: {
      title: 'PEA : profondeur équivalente air',
      simple: 'Au Nitrox tu respires moins d’azote : ta plongée se lit dans la table comme une plongée à l’air moins profonde.',
      cours: 'PEA = [(P + 10) × %N₂ / 0,8] − 10 (pression absolue, diviseur 0,8 comme dans le cours FFESSM). On lit ensuite la table à la profondeur immédiatement supérieure. La DTR réelle se calcule depuis la vraie profondeur.',
    },
    snc: {
      title: '%SNC : la jauge « cerveau »',
      simple: 'L’oxygène respiré sous pression, trop d’un coup, peut provoquer une crise de convulsions sous l’eau. Le %SNC est une jauge qui se remplit pendant la plongée : à 100 %, c’est la dose maximale de la journée.',
      cours: 'Effet Paul Bert. %SNC = durée / durée max NOAA × 100, par tranche de PpO₂. Non linéaire : 0,83 %/min à 1,5 b mais 2,22 %/min à 1,6 b. En surface le %SNC est divisé par 2 toutes les 90 min ; remise à 0 chaque matin. Au-delà de 80 % : alerte.',
    },
    otu: {
      title: 'OTU : la jauge « poumons »',
      simple: 'Respirer de l’oxygène très longtemps irrite les poumons, comme un coup de soleil à l’intérieur. 1 OTU = 1 minute d’oxygène pur à la surface. Limite : 850 par jour.',
      cours: 'Effet Lorrain-Smith, dès PpO₂ 0,5 b dans la durée. OTU/min = ((PpO₂ − 0,5) / 0,5)^0,83. Dose max 850 OTU pour 1 jour, moins sur plusieurs jours consécutifs.',
    },
    palier: {
      title: 'Palier',
      simple: 'Un arrêt obligatoire à une profondeur donnée pendant la remontée, pour laisser ton corps éliminer l’azote sans faire de bulles.',
      cours: 'MN90 : paliers à 15, 12, 9, 6 et 3 m. Vitesse 6 m/min entre paliers. Palier de sécurité conseillé (3 min à 3–5 m) même quand la table n’en impose pas.',
    },
    autonomie: {
      title: 'Autonomie en air',
      simple: 'Combien de temps ton bloc te laisse au fond, en gardant ta réserve pour la fin. Plus tu descends, plus tu consommes vite.',
      cours: 'Litres consommés = conso surface × pression absolue × durée, segment par segment (descente, fond, remontée, paliers). Bar consommés = litres / volume du bloc.',
    },
    narcose: {
      title: 'Narcose',
      simple: 'L’azote sous pression agit comme l’alcool : tu réfléchis moins bien. Elle apparaît vers 30 m et devient forte au-delà de 50 m.',
      cours: 'PpN₂ = Pabs × %N₂. Seuil 3,2 b (≈ 30 m à l’air), maximum admis 5,6 b (≈ 60 m à l’air).',
    },
  };

  let back = null;

  function build() {
    if (back) return back;
    back = document.createElement('div');
    back.className = 'modal-back';
    back.hidden = true;
    back.innerHTML = `<div class="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <h2 id="help-title"></h2><p class="help-simple"></p><p class="help-ex"></p>
      <details class="help-cours"><summary>Version cours</summary><p></p></details>
      <div class="modal-actions"><button type="button" class="btn btn-primary" data-close>Compris</button></div></div>`;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !back.hidden) close(); });
    return back;
  }

  function expert() {
    const p = window.MN90Profile ? window.MN90Profile.get() : null;
    return !!p && (p.nitrox === 'PNC' || p.level === 'N4' || p.level === 'MF');
  }

  let lastFocus = null;
  function open(key, example) {
    const g = G[key];
    if (!g) return;
    build();
    back.querySelector('#help-title').textContent = g.title;
    back.querySelector('.help-simple').textContent = g.simple;
    const ex = back.querySelector('.help-ex');
    ex.textContent = example ? 'Dans ta plongée : ' + example : '';
    ex.hidden = !example;
    back.querySelector('.help-cours p').textContent = g.cours;
    back.querySelector('.help-cours').open = expert();
    lastFocus = document.activeElement;
    back.hidden = false;
    document.documentElement.classList.add('modal-open');
    back.querySelector('[data-close]').focus();
  }
  function close() {
    back.hidden = true;
    document.documentElement.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.help-btn[data-help]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    open(b.dataset.help, b.dataset.example || '');
  });

  // Petit bouton "?" prêt à insérer dans du HTML généré
  const btn = (key, example) => `<button type="button" class="help-btn" data-help="${key}"${example ? ` data-example="${String(example).replace(/"/g, '&quot;')}"` : ''} aria-label="C’est quoi ?">?</button>`;

  window.MN90Help = { G, open, btn };
})();
