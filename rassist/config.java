/* global window */
window.RA = window.RA || {};

RA.CONF = {
  dt: 1/60,
  depths: [20,30,40,50,60],

  // Capacités gilets en litres "fond"
  maxVictimFond: 6.0,
  maxMeFond: 5.0,

  // Timings pédagogiques
  inflateFullSec: 8.0, // maintenir gonfle => plein en 8s
  purgeFullSec: 2.0,   // maintenir purge => vide en 2s

  // Poumons (circuit ouvert)
  lungTotalLiters: 6.0,
  lungDeltaMaxLiters: 3.0, // +/- 3L autour neutre

  // Respiration
  normalBreathInSec: 3.0,
  normalBreathOutSec: 3.0,
  overrideBreathSec: 5.0,

  // Physique
  massTotalKg: 90,
  accelPerLiter: 0.22,   // réaction plus franche (réaliste pédagogique)
	dragLin: 0.35,   // moins d’amortissement mou
	dragQuad: 0.30,  // garde une limite de vitesse réaliste

  // Couplage sangle
  strapOffset: 0.5,
  strapK: 2.0,
  strapC: 1.2,

  vmax: 1.2,

  // Limites vitesse (m/min)
  speedLimit(depth){
    if(depth > 30) return 25;
    if(depth > 20) return 15;
    if(depth > 10) return 10;
    return 6;
  },

  // Pression absolue
  pAbs(depth){ return 1 + Math.max(0, depth)/10; }
};

RA.util = {
  clamp(x,a,b){ return Math.max(a, Math.min(b,x)); },
  vFond(ls, depth){ return ls / RA.CONF.pAbs(depth); }
};