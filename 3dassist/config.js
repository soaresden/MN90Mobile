// config.js — Sites de plongée et constantes globales
'use strict';

const SITES={
  roussay:{name:'Roussay',depthMax:40,startDepth:20,fogColor:0x0e1e0e,fogDensity:0.032,ambientColor:0x142814,ambientInt:1.1,sunColor:0x306030,sunInt:0.6,waterColor:0x0d2010,maskColor:'rgba(20,60,15,1)',maskOpacity:0.16,floorColor:0x1a2a10,coralColors:[0x2d5a1b,0x1a3d0f,0x3d5c20],temp:'11 °C',nodeco:40,causticColor:0x204030,freshwater:true},
  martinique:{name:'St-Pierre',depthMax:999,startDepth:20,fogColor:0x03142a,fogDensity:0.012,ambientColor:0x0a2848,ambientInt:1.3,sunColor:0x30a0e0,sunInt:1.1,waterColor:0x041e3a,maskColor:'rgba(0,30,90,1)',maskOpacity:0.10,floorColor:0x1a3a20,coralColors:[0x992222,0xff5500,0xcc8800,0x228855,0xff6633],temp:'28 °C',nodeco:73,causticColor:0x0077bb,freshwater:false},
  vlg:{name:'Fosse VLG',depthMax:20,startDepth:18,fogColor:0x08101a,fogDensity:0.055,ambientColor:0x0a1220,ambientInt:0.85,sunColor:0x182230,sunInt:0.35,waterColor:0x060a16,maskColor:'rgba(8,12,35,1)',maskOpacity:0.22,floorColor:0x101520,coralColors:[0x1a2030,0x151a28,0x202530],temp:'13 °C',nodeco:40,causticColor:0x0a1828,freshwater:true},
  nemo:{name:'Nemo 33',depthMax:33,startDepth:20,fogColor:0x021c26,fogDensity:0.010,ambientColor:0x082830,ambientInt:1.4,sunColor:0x30d0c0,sunInt:1.0,waterColor:0x021c24,maskColor:'rgba(0,60,70,1)',maskOpacity:0.08,floorColor:0x0a2830,coralColors:[0x0a4048,0x085058,0x0d6070],temp:'33 °C',nodeco:73,causticColor:0x009999,freshwater:true}
};

// Flottabilité
const STAB_MAX=16,LUNG_MIN=1.5,LUNG_MAX=6.0,LUNG_NEUTRAL=3.5;

// État global partagé entre modules
const G={
  currentSite:SITES.roussay,
  selectedSiteKey:'roussay',
  simStarted:false,
  rescued:false,
  inPalier:false,
  palierDone:false,
  gameTime:0,
  gasLevel:1.0,
  isDead:false,
  playerStab:0,
  victimStab:0,
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
};

function selectSite(btn){
  document.querySelectorAll('.site-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  G.selectedSiteKey=btn.dataset.site;
  G.currentSite=SITES[G.selectedSiteKey];
  document.getElementById('sel-site').textContent=G.currentSite.name;
  document.getElementById('sel-depth').textContent=G.currentSite.startDepth+'m';
}
