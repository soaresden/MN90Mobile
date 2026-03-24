// buoyancy.js — Flottabilité, stabs, poumon ballast, loi de Boyle
'use strict';

function buoyForce(){
  // Equilibre : base + stab_joueur*coeff = 0 → base = -stab_equil * coeff
  // On veut équilibre à playerStab=EQUIL_STAB (défini dans game.js)
  // base = -1.0, coeff = 0.85 → équilibre à 1.0/0.85 = 1.176L
  // Avec blessé : base = -3.5 → équilibre joueur+blessé ~2L chacun
  const base=G.rescued?-3.5:-1.0;
  const ps=G.playerStab*0.85;
  const vs=G.victimStab*0.85;
  const lf=(G.lung-LUNG_NEUTRAL)*0.7;
  const force=base+ps+vs+lf;
  if(G.simStarted&&Math.random()<0.008)
    console.log('[buoy] force='+force.toFixed(2)+' player='+G.playerStab.toFixed(1)+' victim='+G.victimStab.toFixed(1)+' lung='+G.lung.toFixed(1)+' buoyV='+G.buoyVelocity.toFixed(3));
  return force;
}

function inflatePush(who,on){ G.inflating[who]=on; }
function purgePush(who,on){ G.purging[who]=on; }

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
  // Gonflage/purge actifs tout le temps
  if(G.inflating.player) G.playerStab=Math.min(STAB_MAX,G.playerStab+1.5*dt);
  if(G.inflating.victim) G.victimStab=Math.min(STAB_MAX,G.victimStab+1.5*dt);
  const PURGE=STAB_MAX/2;
  if(G.purging.player) G.playerStab=Math.max(0,G.playerStab-PURGE*dt);
  if(G.purging.victim) G.victimStab=Math.max(0,G.victimStab-PURGE*dt);

  // Loi de Boyle : dilatation en remontant
  const ata=Math.max(1,depth/10+1);
  const prevY=window._camera?window._camera.position.y-G.buoyVelocity*dt:0;
  const prevAta=Math.max(1,Math.abs(Math.min(0,prevY))/10+1);
  if(Math.abs(prevAta-ata)>0.0005){
    const exp=prevAta/ata;
    G.playerStab=Math.min(STAB_MAX,G.playerStab*exp);
    if(G.rescued) G.victimStab=Math.min(STAB_MAX,G.victimStab*exp);
  }

  updateBuoyHUD();
  updateLungWave();

  const f=buoyForce();
  G.buoyVelocity+=f*0.15*dt;
  G.buoyVelocity*=(1-0.8*dt);
  G.buoyVelocity=Math.max(-2.5,Math.min(2.5,G.buoyVelocity));

  if(G.rescued&&G.buoyVelocity>0.8&&!G.inPalier)
    setAlert('TROP VITE — PURGEZ !','danger');
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
  const setW=(id,pct)=>{const e=document.getElementById(id);if(e)e.style.width=pct+'%';};
  set('v-stab-val',G.victimStab.toFixed(1)+' L');
  setW('v-stab-bar',G.victimStab/STAB_MAX*100);
  set('p-stab-val',G.playerStab.toFixed(1)+' L');
  setW('p-stab-bar',G.playerStab/STAB_MAX*100);
  set('p-purge-val',G.playerStab.toFixed(1)+' L');
  setW('p-purge-bar',G.playerStab/STAB_MAX*100);
  set('lung-val',G.lung.toFixed(1)+' L');
  setW('lung-bar',(G.lung-LUNG_MIN)/(LUNG_MAX-LUNG_MIN)*100);
  set('lung-sub',G.lung>LUNG_NEUTRAL+0.3?'INSPIRÉ':G.lung<LUNG_NEUTRAL-0.3?'EXPIRÉ':'NEUTRE');
}

function showBuoyPanels(show){
  ['panel-victim','panel-self','panel-purge-me','panel-lung'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.setProperty('display',show?'block':'none','important');
  });
  if(show){ initLungWave(); updateBuoyHUD(); }
}