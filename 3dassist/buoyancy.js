// buoyancy.js — Flottabilité, stabs, poumon ballast, loi de Boyle
'use strict';

function buoyForce(){
  // Base : joueur seul légèrement négatif (-1), avec blessé plus négatif (-3)
  // Valeurs réduites pour que 2-3L de stab suffisent à monter
  const base=G.rescued?-3.0:-1.0;
  const ps=G.playerStab*0.85;
  const vs=G.victimStab*0.85;
  const lf=(G.lung-LUNG_NEUTRAL)*0.7;
  const force=base+ps+vs+lf;
  if(G.simStarted&&Math.random()<0.01) // log toutes les ~100 frames
    console.log('[buoy] force='+force.toFixed(2)+' playerStab='+G.playerStab.toFixed(1)+' victimStab='+G.victimStab.toFixed(1)+' lung='+G.lung.toFixed(1));
  return force;
}

function inflatePush(who,on){
  G.inflating[who]=on;
  console.log('[buoy] inflatePush',who,on,'playerStab='+G.playerStab.toFixed(1));
}
function purgePush(who,on){ G.purging[who]=on; }

function triggerLung(dir){
  stopLung();
  const step=dir==='in'?0.45:-0.45;
  let count=0;
  G.lungDir=dir==='in'?1:-1;
  G.lungInterval=setInterval(()=>{
    G.lung=Math.min(LUNG_MAX,Math.max(LUNG_MIN,G.lung+step));
    updateBuoyHUD();count++;
    if(count>=10||(dir==='in'&&G.lung>=LUNG_MAX)||(dir==='out'&&G.lung<=LUNG_MIN))stopLung();
  },500);
}
function stopLung(){ clearInterval(G.lungInterval);G.lungDir=0; }

function processBuoyancy(dt,depth){
  // Gonflage et purge actifs même avant rescue (joueur se stabilise)
  const INFLATE_RATE=1.5;
  if(G.inflating.player) G.playerStab=Math.min(STAB_MAX,G.playerStab+INFLATE_RATE*dt);
  if(G.inflating.victim) G.victimStab=Math.min(STAB_MAX,G.victimStab+INFLATE_RATE*dt);

  const PURGE=STAB_MAX/2;
  if(G.purging.player) G.playerStab=Math.max(0,G.playerStab-PURGE*dt);
  if(G.purging.victim) G.victimStab=Math.max(0,G.victimStab-PURGE*dt);

  // Loi de Boyle : dilatation en remontant
  const ata=Math.max(1,depth/10+1);
  const prevY=window._camera?window._camera.position.y-G.buoyVelocity*dt:0;
  const prevDepth=Math.abs(Math.min(0,prevY));
  const prevAta=Math.max(1,prevDepth/10+1);
  if(Math.abs(prevAta-ata)>0.0005){
    const expansion=prevAta/ata;
    G.playerStab=Math.min(STAB_MAX,G.playerStab*expansion);
    if(G.rescued) G.victimStab=Math.min(STAB_MAX,G.victimStab*expansion);
  }

  updateBuoyHUD();

  // Intégration force → vitesse verticale
  // f en "newtons gameplay", masse effective ~80kg → accélération = f/80
  // dt~0.016s, on veut ~0.5 m/s après 2s de gonflage avec f=3
  // f=3 → a=3/80=0.0375 m/s² → en 2s → 0.075 m/s → trop lent
  // On simplifie : buoyVelocity += f * 0.15 * dt (calibré pour ~0.3 m/s avec f=3)
  const f=buoyForce();
  G.buoyVelocity+=f*0.15*dt;
  // Friction eau légère — pas trop agressive
  G.buoyVelocity*=(1-0.8*dt);
  G.buoyVelocity=Math.max(-2.5,Math.min(2.5,G.buoyVelocity));

  if(G.rescued&&G.buoyVelocity>0.8&&!G.inPalier)
    setAlert('TROP VITE — PURGEZ !','danger');
}

function updateBuoyHUD(){
  const vstab=document.getElementById('v-stab-val');
  const vstabbar=document.getElementById('v-stab-bar');
  const pstab=document.getElementById('p-stab-val');
  const pstabbar=document.getElementById('p-stab-bar');
  const ppurge=document.getElementById('p-purge-val');
  const ppurgebar=document.getElementById('p-purge-bar');
  if(vstab)vstab.textContent=G.victimStab.toFixed(1)+' L';
  if(vstabbar)vstabbar.style.width=(G.victimStab/STAB_MAX*100)+'%';
  if(pstab)pstab.textContent=G.playerStab.toFixed(1)+' L';
  if(pstabbar)pstabbar.style.width=(G.playerStab/STAB_MAX*100)+'%';
  if(ppurge)ppurge.textContent=G.playerStab.toFixed(1)+' L';
  if(ppurgebar)ppurgebar.style.width=(G.playerStab/STAB_MAX*100)+'%';
  const lv=document.getElementById('lung-val');
  const lb=document.getElementById('lung-bar');
  const ls=document.getElementById('lung-sub');
  if(lv)lv.textContent=G.lung.toFixed(1)+' L';
  if(lb)lb.style.width=((G.lung-LUNG_MIN)/(LUNG_MAX-LUNG_MIN)*100)+'%';
  if(ls)ls.textContent=G.lung>LUNG_NEUTRAL+0.3?'INSPIRÉ':G.lung<LUNG_NEUTRAL-0.3?'EXPIRÉ':'NEUTRE';
}

function showBuoyPanels(show){
  ['panel-victim','panel-self','panel-victim-ds','panel-purge-me','panel-lung'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.setProperty('display',show?'block':'none','important');
  });
}