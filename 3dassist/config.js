// config.js — Sites de plongée et constantes globales
'use strict';

const SITES={
  roussay:{name:'Roussay',depthMax:40,startDepth:20,fogColor:0x0e1e0e,fogDensity:0.032,ambientColor:0x142814,ambientInt:1.1,sunColor:0x306030,sunInt:0.6,waterColor:0x0d2010,maskColor:'rgba(20,60,15,1)',maskOpacity:0.16,floorColor:0x1a2a10,coralColors:[0x2d5a1b,0x1a3d0f,0x3d5c20],temp:'11 °C',nodeco:40,causticColor:0x204030,freshwater:true},
  martinique:{name:'St-Pierre',depthMax:999,startDepth:20,fogColor:0x03142a,fogDensity:0.012,ambientColor:0x0a2848,ambientInt:1.3,sunColor:0x30a0e0,sunInt:1.1,waterColor:0x041e3a,maskColor:'rgba(0,30,90,1)',maskOpacity:0.10,floorColor:0x1a3a20,coralColors:[0x992222,0xff5500,0xcc8800,0x228855,0xff6633],temp:'28 °C',nodeco:73,causticColor:0x0077bb,freshwater:false},
  vlg:{name:'Fosse VLG',depthMax:20,startDepth:18,fogColor:0x08101a,fogDensity:0.055,ambientColor:0x0a1220,ambientInt:0.85,sunColor:0x182230,sunInt:0.35,waterColor:0x060a16,maskColor:'rgba(8,12,35,1)',maskOpacity:0.22,floorColor:0x101520,coralColors:[0x1a2030,0x151a28,0x202530],temp:'13 °C',nodeco:40,causticColor:0x0a1828,freshwater:true},
  nemo:{name:'Nemo 33',depthMax:33,startDepth:20,fogColor:0x021c26,fogDensity:0.010,ambientColor:0x082830,ambientInt:1.4,sunColor:0x30d0c0,sunInt:1.0,waterColor:0x021c24,maskColor:'rgba(0,60,70,1)',maskOpacity:0.08,floorColor:0x0a2830,coralColors:[0x0a4048,0x085058,0x0d6070],temp:'33 °C',nodeco:73,causticColor:0x009999,freshwater:true}
};

// L'eau de chaque site, pour la couleur :
//  K   = coefficient d'atténuation diffuse (par mètre) du rouge, du vert, du bleu.
//        Le rouge est absorbé dès les premiers mètres, le bleu va le plus loin ;
//        en lac, les matières dissoutes mangent aussi le bleu (eau verte).
//  eau = teinte de l'eau (diffusion) juste sous la surface ; elle s'assombrit
//        avec la profondeur selon K.
//  jour, soleil = intensité de la lumière du jour (ambiante, directe) à 0 m.
const OPTIQUE={
  roussay:   {K:[0.60,0.13,0.26],eau:[0.10,0.30,0.12],jour:0.75,soleil:0.9},
  martinique:{K:[0.42,0.065,0.028],eau:[0.05,0.26,0.40],jour:0.75,soleil:1.6},
  vlg:       {K:[0.32,0.06,0.05],eau:[0.04,0.10,0.18],jour:0.30,soleil:0.30},
  nemo:      {K:[0.30,0.045,0.035],eau:[0.03,0.30,0.34],jour:0.60,soleil:1.0},
};

// Flottabilité (vraies unités : litres, kilos, bars)
//  STAB_MAX : volume du gilet ; au-delà, la soupape de surpression lâche.
//  GONFLAGE : débit de l'inflateur, en litres « surface » par seconde (le
//             volume réellement ajouté au fond est divisé par la pression).
//  PURGE    : débit de la purge de l'inflateur (tuyau levé), litres par seconde ;
//  PURGE_RAPIDE : la tirette (purge haute/basse), bien plus forte.
//  COMBI    : air piégé dans le néoprène à la surface (litres) : il s'écrase
//             en profondeur (loi de Boyle) — on est plus lourd au fond.
//  VMAX     : vitesse de remontée maximale (MN90 : 15 à 17 m/min).
const STAB_MAX=16,LUNG_MIN=1.5,LUNG_MAX=6.0,LUNG_NEUTRAL=3.5;
const PHYS={
  GONFLAGE:2.5, PURGE:5, PURGE_RAPIDE:12,
  MASSE:95,            // kg : plongeur + équipement (chacun)
  MASSE_AJOUTEE:0.5,   // l'eau entraînée (+50 %)
  CDA_SEUL:0.30, CDA_DEUX:0.50,   // traînée (m²) : un plongeur, puis les deux ensemble
  VCONSEIL:15, VMAX:17,           // m/min
};
const COMBI={roussay:7,martinique:3,vlg:6,nemo:2.5};

// État global partagé entre modules
const G={
  currentSite:SITES.roussay,
  selectedSiteKey:'roussay',
  selectedDepth:10,
  simStarted:false,
  rescued:false,
  inPalier:false,
  palierDone:false,
  gameTime:0,
  gasLevel:1.0,
  isDead:false,
  playerStab:0,      // volume (L) dans le gilet, au fond
  victimStab:0,
  gazJoueur:0,       // quantité d'air dans le gilet, en « litres surface » (bar·L)
  gazBlesse:0,
  lestJoueur:0,      // le reste du plongeur (lest, corps, bloc) : kg, négatif = coule
  lestBlesse:0,
  regardHaut:false,
  fondY:null,        // hauteur du fond (y), posée par la scène
  purgeRapide:{player:false,victim:false},
  lung:LUNG_NEUTRAL,
  lungDir:0,
  buoyVelocity:0,
  inflating:{player:false,victim:false},
  purging:{player:false,victim:false},
  fastAscentTime:0,
  currentAscentSpeed:0,
  lastY:0,
  lastYTime:0,
  palierTimer:60,
  palierInterval:null,
  lungInterval:null,
  bubbleTimer:0,
  victimBubbleTimer:0,
  currentDepth:0,
  rescueTime:null,
  hadSurpression:false,
};

function selectSite(btn){
  document.querySelectorAll('.site-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  G.selectedSiteKey=btn.dataset.site;
  G.currentSite=SITES[G.selectedSiteKey];
  document.getElementById('sel-site').textContent=G.currentSite.name;
  // Filtrer les boutons de profondeur selon depthMax
  _updateDepthBtns();
}

function selectDepth(btn){
  document.querySelectorAll('.depth-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  G.selectedDepth=parseInt(btn.dataset.depth);
}

function _updateDepthBtns(){
  const max=G.currentSite.depthMax;
  document.querySelectorAll('.depth-btn').forEach(btn=>{
    const d=parseInt(btn.dataset.depth);
    const ok=d<=max;
    btn.disabled=!ok;
    btn.style.opacity=ok?'1':'0.25';
    btn.style.pointerEvents=ok?'all':'none';
    if(!ok&&btn.classList.contains('selected')){
      btn.classList.remove('selected');
      // Sélectionner le max disponible
      const best=Array.from(document.querySelectorAll('.depth-btn')).filter(b=>parseInt(b.dataset.depth)<=max).pop();
      if(best){best.classList.add('selected');G.selectedDepth=parseInt(best.dataset.depth);}
    }
  });
}