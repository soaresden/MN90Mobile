// buoyancy.js — Flottabilité, stabs, poumon ballast, loi de Boyle
'use strict';

// ---------- Les lois physiques ----------
const rhoEau=()=>(G.currentSite&&G.currentSite.freshwater)?1000:1025;   // kg/m³
/** Pression absolue (bar) à une profondeur (m) : 1 bar d'air + la colonne d'eau. */
function pressionA(d){ return 1+rhoEau()*9.81*Math.max(0,d)/101325; }
const combiSurface=()=>COMBI[G.selectedSiteKey]||5;

/** Volume réel du gilet au fond : la quantité d'air divisée par la pression (Mariotte/Boyle). */
function volumeGilet(gaz,P){ return Math.min(STAB_MAX,gaz/P); }

/**
 * Flottabilité de chacun en kg (positif = monte) : poussée d'Archimède des
 * volumes d'air (gilet, combinaison écrasée par la pression, poumons) moins
 * le reste (lest, corps, bloc) réglé pour être équilibré au départ.
 */
function flottabilites(d){
  const P=pressionA(d),rho=rhoEau()/1000;
  const combi=combiSurface()/P;
  const poumon=(G.lung-LUNG_NEUTRAL)+(G.respiration||0);
  const joueur=(volumeGilet(G.gazJoueur,P)+combi+poumon)*rho+G.lestJoueur;
  const blesse=(volumeGilet(G.gazBlesse,P)+combi)*rho+G.lestBlesse;
  return {joueur,blesse,total:G.rescued?joueur+blesse:joueur,P};
}
function buoyForce(){ return flottabilites(G.currentDepth||0).total; }

/**
 * Chacun part équilibré, mais pas avec le même air dans le gilet : on ne
 * pèse pas pareil, on n'a pas le même lest. Le volume (et la masse, pour
 * l'inertie) est tiré au hasard ; le lest est réglé pour être neutre.
 */
function _equilibrer(d){
  const P=pressionA(d),rho=rhoEau()/1000;
  const v=1+Math.random()*3;                      // 1 à 4 L dans le gilet
  return {gaz:v*P,lest:-(v+combiSurface()/P)*rho,masse:75+Math.random()*35};   // 75 à 110 kg équipé
}
function equilibrerJoueur(d){
  const e=_equilibrer(d);
  G.gazJoueur=e.gaz;G.lestJoueur=e.lest;G.masseJoueur=e.masse;
}
function preparerBlesse(d){
  const e=_equilibrer(d);
  G.gazBlesse=e.gaz;G.lestBlesse=e.lest;G.masseBlesse=e.masse;
}

function inflatePush(who,on){
  G.inflating[who]=on;
  if(soundEnabled){
    if(on)startInflateSound();
    else stopInflateSound();
  }
}
function purgePush(who,on,rapide=false){
  G.purging[who]=on&&!rapide;
  G.purgeRapide[who]=on&&rapide;
  if(on)_bullesPurge(who,rapide);
  if(soundEnabled){
    if(on)startPurgeSound();
    else stopPurgeSound();
  }
}
// Les bulles de la purge (l'air qui sort du gilet)
function _bullesPurge(who,rapide){
  const cam=window._camera;
  if(!cam||typeof spawnBubble!=='function')return;
  const n=rapide?14:6;
  for(let i=0;i<n;i++)setTimeout(()=>{
    if(who==='victim'&&typeof victimModel!=='undefined'&&victimModel)spawnBubble(victimModel.position,true);
    else spawnBubble(null,false);
  },i*60);
}

// Poumon ballast : UN clic = 5 secondes automatiques (pas besoin de maintenir)
function triggerLung(dir){
  stopLung();
  const step=dir==='in'?0.45:-0.45;
  let count=0;
  G.lungDir=dir==='in'?1:-1;
  console.log('[sound] triggerLung dir='+dir);
  if(soundEnabled){ if(dir==='in')playLungIn(); else playLungOut(); }
  G.lungInterval=setInterval(()=>{
    G.lung=Math.min(LUNG_MAX,Math.max(LUNG_MIN,G.lung+step));
    count++;
    if(count>=10||(dir==='in'&&G.lung>=LUNG_MAX)||(dir==='out'&&G.lung<=LUNG_MIN)){
      stopLung();
      // Retour progressif au neutre après 5s
      setTimeout(()=>_returnToNeutral(),5000);
    }
  },500);
}
function stopLung(){ clearInterval(G.lungInterval);G.lungDir=0; }

function _returnToNeutral(){
  // Ramène doucement le poumon vers LUNG_NEUTRAL sur 3s
  const steps=6;
  let n=0;
  const iv=setInterval(()=>{
    const diff=LUNG_NEUTRAL-G.lung;
    G.lung+=diff*0.4;
    n++;
    if(n>=steps||Math.abs(G.lung-LUNG_NEUTRAL)<0.1){ G.lung=LUNG_NEUTRAL; clearInterval(iv); }
  },500);
}

function processBuoyancy(dt,depth){
  const P=pressionA(depth);
  // Inflateur : l'air du bloc arrive à la pression du fond (moins de volume en profondeur)
  if(G.inflating.player) G.gazJoueur+=PHYS.GONFLAGE*dt;
  if(G.inflating.victim) G.gazBlesse+=PHYS.GONFLAGE*dt;
  // Purges : un débit en volume réel (tuyau levé, ou tirette de purge rapide)
  const purger=(gaz,normal,rapide)=>{
    const debit=(rapide?PHYS.PURGE_RAPIDE:0)+(normal?PHYS.PURGE:0);
    return debit?Math.max(0,gaz-debit*P*dt):gaz;
  };
  G.gazJoueur=purger(G.gazJoueur,G.purging.player,G.purgeRapide.player);
  G.gazBlesse=purger(G.gazBlesse,G.purging.victim,G.purgeRapide.victim);
  // Gilet plein : la soupape de surpression lâche le trop-plein
  G.gazJoueur=Math.min(G.gazJoueur,STAB_MAX*P);
  G.gazBlesse=Math.min(G.gazBlesse,STAB_MAX*P);
  // Volumes réels (Boyle) : ils gonflent tout seuls quand on remonte
  G.playerStab=volumeGilet(G.gazJoueur,P);
  G.victimStab=volumeGilet(G.gazBlesse,P);
  // La respiration : ±0,3 L autour du poumon ballast (on oscille un peu)
  G.respiration=0.3*Math.sin(G.gameTime*2*Math.PI/4.5);

  updateBuoyHUD();
  updateLungWave();

  // Newton : poussée nette − traînée de l'eau (en v²), sur la masse + l'eau entraînée
  const f=flottabilites(depth);
  G.flottabilite=f.total;
  const rho=rhoEau();
  const deux=G.rescued;
  const masse=((G.masseJoueur||PHYS.MASSE)+(deux?(G.masseBlesse||PHYS.MASSE):0))*(1+PHYS.MASSE_AJOUTEE);
  const cda=deux?PHYS.CDA_DEUX:PHYS.CDA_SEUL;
  const v=G.buoyVelocity;
  const trainee=0.5*rho*cda*v*Math.abs(v);
  G.buoyVelocity+=(f.total*9.81-trainee)/masse*dt;
  G.buoyVelocity=Math.max(-2,Math.min(2,G.buoyVelocity));
  // En surface, on ne monte plus
  if(depth<=0.05&&G.buoyVelocity>0)G.buoyVelocity=0;
  // Vitesse verticale affichée (m/min), lissée comme sur un ordinateur
  G.currentAscentSpeed+=(G.buoyVelocity*60-G.currentAscentSpeed)*Math.min(1,dt*2);
}

// === SINUSOÏDE POUMON ===
let _lungWaveCtx=null;
let _lungWaveT=0;
function initLungWave(){
  const c=document.getElementById('lung-wave');
  if(!c)return;
  _lungWaveCtx=c.getContext('2d');
}
function updateLungWave(){
  if(!_lungWaveCtx)return;
  const c=_lungWaveCtx;
  const W=_lungWaveCtx.canvas.width,H=_lungWaveCtx.canvas.height;
  c.clearRect(0,0,W,H);
  _lungWaveT+=0.05;
  // Amplitude = proportion poumon vs neutre
  const amp=(G.lung-LUNG_NEUTRAL)/(LUNG_MAX-LUNG_NEUTRAL)*0.8+0.2;
  // Fréquence respiratoire : ~0.25 Hz (4s/cycle) simulée
  const freq=0.25+Math.abs(G.lung-LUNG_NEUTRAL)*0.05;
  c.beginPath();
  c.strokeStyle=G.lung>LUNG_NEUTRAL+0.3?'#44dd88':G.lung<LUNG_NEUTRAL-0.3?'#ff6633':'#4499ff';
  c.lineWidth=1.5;
  for(let x=0;x<W;x++){
    const t=x/W*Math.PI*4+_lungWaveT;
    const y=H/2-Math.sin(t)*amp*(H/2-2);
    if(x===0)c.moveTo(x,y);else c.lineTo(x,y);
  }
  c.stroke();
  // Ligne centrale
  c.beginPath();c.strokeStyle='rgba(255,255,255,0.08)';c.lineWidth=0.5;
  c.moveTo(0,H/2);c.lineTo(W,H/2);c.stroke();
}

function updateBuoyHUD(){
  const set=(id,txt)=>{const e=document.getElementById(id);if(e)e.textContent=txt;};
  const setH=(id,pct)=>{const e=document.getElementById(id);if(e)e.style.height=Math.max(0,Math.min(100,pct))+'%';};
  set('inf-moi-vol',G.playerStab.toFixed(1)+' L');
  setH('inf-moi-jauge',G.playerStab/STAB_MAX*100);
  set('inf-lui-vol',G.victimStab.toFixed(1)+' L');
  setH('inf-lui-jauge',G.victimStab/STAB_MAX*100);
  const plein=(id,v)=>{const e=document.getElementById(id);if(e)e.classList.toggle('plein',v>=STAB_MAX-0.05);};
  plein('inf-moi',G.playerStab);plein('inf-lui',G.victimStab);
  // Le gilet s'allume quand il se remplit (gonflage, ou l'air qui se dilate en montant) ou se vide
  const etat=(id,qui,vol)=>{const e=document.getElementById(id);if(!e)return;
    const prev=e._vol??vol;e._vol=vol;
    e.classList.toggle('gonfle',G.inflating[qui]||vol-prev>0.0004);
    e.classList.toggle('purge',G.purging[qui]||G.purgeRapide[qui]||vol-prev<-0.0004);};
  etat('inf-moi','player',G.playerStab);etat('inf-lui','victim',G.victimStab);
  set('lung-val',(G.lung+(G.respiration||0)).toFixed(1)+' L');
  const lb=document.getElementById('lung-bar');if(lb)lb.style.width=((G.lung-LUNG_MIN)/(LUNG_MAX-LUNG_MIN)*100)+'%';
  set('lung-sub',G.lung>LUNG_NEUTRAL+0.3?'INSPIRÉ':G.lung<LUNG_NEUTRAL-0.3?'EXPIRÉ':'NEUTRE');
}

function showBuoyPanels(show){
  ['inf-moi','inf-lui','panel-lung'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.setProperty('display',show?(id==='panel-lung'?'block':'flex'):'none','important');
  });
  if(show){ initLungWave(); updateBuoyHUD(); }
}

// ---------- Les boutons des inflateurs : maintenir pour gonfler / purger ----------
(function brancherInflateurs(){
  const lancer=()=>{
    document.querySelectorAll('.inflateur [data-action]').forEach(b=>{
      const qui=b.dataset.qui,action=b.dataset.action;
      const on=e=>{
        e.preventDefault();
        try{b.setPointerCapture(e.pointerId);}catch(_){}
        b.classList.add('actif');
        if(action==='gonfler')inflatePush(qui,true);
        else purgePush(qui,true,action==='rapide');
      };
      const off=()=>{
        if(!b.classList.contains('actif'))return;
        b.classList.remove('actif');
        if(action==='gonfler')inflatePush(qui,false);
        else purgePush(qui,false,action==='rapide');
      };
      b.addEventListener('pointerdown',on);
      ['pointerup','pointercancel','lostpointercapture'].forEach(t=>b.addEventListener(t,off));
      b.addEventListener('contextmenu',e=>e.preventDefault());
    });
    const h=document.getElementById('btn-haut');
    if(h){
      h.addEventListener('pointerdown',e=>{e.preventDefault();try{h.setPointerCapture(e.pointerId);}catch(_){}setRegardHaut(true);});
      ['pointerup','pointercancel','lostpointercapture'].forEach(t=>h.addEventListener(t,()=>setRegardHaut(false)));
      h.addEventListener('contextmenu',e=>e.preventDefault());
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',lancer);else lancer();
})();
