// game.js — Logique jeu principale, loop animate
'use strict';

function startSim(){
  G.currentSite=SITES[G.selectedSiteKey];
  document.getElementById('start-screen').style.display='none';
  buildScene(G.currentSite,()=>{
    const cam=window._camera;
    cam.position.set(0,-G.currentSite.startDepth,5);
    G.lastY=cam.position.y;G.lastYTime=performance.now()/1000;
    G.gasLevel=1.0;G.isDead=false;G.rescued=false;
    G.inPalier=false;G.palierDone=false;G.gameTime=0;
    G.fastAscentTime=0;G.buoyVelocity=0;
    G.playerStab=1.0+Math.random()*3.0;
    G.victimStab=0;G.lung=LUNG_NEUTRAL;
    document.getElementById('c').style.filter='none';
    document.getElementById('victim-status').style.display='block';
    document.getElementById('btn-interact').style.display='flex';
    G.simStarted=true;
    initEffects(G.selectedSiteKey);
    if(!isMobile())document.getElementById('c').requestPointerLock();
    if(soundEnabled){initAudio();startBreathing();startBubbleSoundLoop();startAmbiance();}
  });
}

function tryRescue(){ if(nearVictim()&&!G.rescued)startRescue(); }

function startRescue(){
  if(G.rescued)return;G.rescued=true;
  document.getElementById('interact-prompt').style.display='none';
  document.getElementById('btn-interact').style.display='none';
  document.querySelector('.vs-name').textContent='Blessé — En charge';
  document.getElementById('vs-state').textContent='Pris en charge';
  setAlert('BLESSÉ EN CHARGE — GÉREZ LA FLOTTABILITÉ','warn');
  G.victimStab=0.5+Math.random()*2.0;
  G.lung=LUNG_NEUTRAL;G.buoyVelocity=0;
  showBuoyPanels(true);
  updateBuoyHUD();
  if(soundEnabled)playBreath();
}

function startPalier(){
  G.palierTimer=60;
  G.palierInterval=setInterval(()=>{
    G.palierTimer--;
    document.getElementById('palier-countdown').textContent=G.palierTimer;
    if(soundEnabled)playAlarm();
    if(G.palierTimer<=0){
      clearInterval(G.palierInterval);
      G.inPalier=false;G.palierDone=true;
      document.getElementById('palier-banner').style.display='none';
      setAlert('PALIER OK — SURFACE','');
    }
  },1000);
}

// ===== LOOP PRINCIPALE =====
const clock=new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.1);
  if(!G.simStarted){sceneAnimate(dt,0);return;}

  G.gameTime+=dt;
  const cam=window._camera;

  applyMovement(dt);
  processBuoyancy(dt,Math.abs(Math.min(0,cam.position.y)));

  const depth=Math.abs(Math.min(0,cam.position.y));

  const now=performance.now()/1000;
  if(now-G.lastYTime>0.4){
    G.currentAscentSpeed=(cam.position.y-G.lastY)/(now-G.lastYTime)*60;
    G.lastY=cam.position.y;G.lastYTime=now;
  }

  if(G.rescued&&G.currentAscentSpeed>11){
    setAlert('TROP VITE ! MAX 10 m/min — SURPRESSION !','danger');
    G.fastAscentTime+=dt;
    if(G.fastAscentTime>8&&!G.isDead)triggerSurpressionPulmonaire();
  } else if(G.rescued&&depth<=3.5&&!G.inPalier&&!G.palierDone){
    G.fastAscentTime=Math.max(0,G.fastAscentTime-dt*0.5);
    G.inPalier=true;
    document.getElementById('palier-banner').style.display='block';
    setAlert('PALIER 3m — STOP !','warn');
    startPalier();
  } else if(G.rescued&&!G.inPalier&&!G.palierDone){
    G.fastAscentTime=Math.max(0,G.fastAscentTime-dt*0.5);
    const f=buoyForce();
    if(Math.abs(f)<0.8&&document.getElementById('hud-alert').textContent.indexOf('BAR')<0)
      setAlert('NEUTRE — GONFLEZ POUR MONTER','warn');
  } else {
    G.fastAscentTime=Math.max(0,G.fastAscentTime-dt*0.5);
  }
  if(G.palierDone&&depth<0.5)setAlert('SURFACE — APPELEZ LES SECOURS','');

  if(!G.rescued){
    const np=nearVictim();
    document.getElementById('interact-prompt').style.display=np?'block':'none';
    document.getElementById('btn-interact').style.display=np?'flex':'none';
  }

  updateHUD(depth,dt);
  updateEffects(dt,depth,Math.round(G.gasLevel*200));
  sceneAnimate(dt,G.gameTime);
}

animate();
