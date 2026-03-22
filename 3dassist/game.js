// game.js — Logique jeu, fin de plongée, stats, courbe remontée
'use strict';

// Historique remontée pour la courbe finale
const ascentLog=[]; // {t, depth}
let ascentLogTimer=0;
let gamePhase='dive'; // 'dive' | 'palier' | 'surface_check' | 'done'
let surface360Start=null; // timestamp début du 360 en surface
let surface360YawStart=null;
let surface360TotalYaw=0;
let lastYawForSpin=0;
let rescueTime=null;
let surfaceTime=null;

function startSim(){
  G.currentSite=SITES[G.selectedSiteKey];
  document.getElementById('start-screen').style.display='none';
  buildScene(G.currentSite,()=>{
    const cam=window._camera;
    cam.position.set(0,-G.selectedDepth,5);
    // Repositionner le blessé 3m devant la caméra maintenant qu'elle est placée
    _setVictimPos();
    if(typeof victimModel!=='undefined'&&victimModel)victimModel.position.copy(VP);
    G.lastY=cam.position.y;G.lastYTime=performance.now()/1000;
    G.gasLevel=1.0;G.isDead=false;G.rescued=false;
    G.inPalier=false;G.palierDone=false;G.gameTime=0;
    G.fastAscentTime=0;G.buoyVelocity=0;
    // Equilibre exact : base=-1.0 / coeff=0.85 = 1.176L
    // Pas de variation aléatoire — on part strictement neutre
    G.playerStab=1.18;
    G.victimStab=0;G.lung=LUNG_NEUTRAL;G.buoyVelocity=0;
    ascentLog.length=0;ascentLogTimer=0;
    gamePhase='dive';surface360Start=null;surface360TotalYaw=0;
    rescueTime=null;surfaceTime=null;
    document.getElementById('c').style.filter='none';
    document.getElementById('victim-status').style.display='block';
    document.getElementById('btn-interact').style.display='flex';
    G.simStarted=true;
    initEffects(G.selectedSiteKey);
    if(!isMobile())document.getElementById('c').requestPointerLock();
    if(soundEnabled){initAudio();startBreathing();startBubbleSoundLoop();startAmbiance();loadLowAirSound();}
  });
}

function tryRescue(){ if(nearVictim()&&!G.rescued)startRescue(); }

function startRescue(){
  if(G.rescued)return;G.rescued=true;
  G.rescueTime=G.gameTime;
  document.getElementById('interact-prompt').style.display='none';
  document.getElementById('btn-interact').style.display='none';
  document.querySelector('.vs-name').textContent='Blessé — En charge';
  document.getElementById('vs-state').textContent='Pris en charge';
  setAlert('BLESSÉ EN CHARGE — GÉREZ LA FLOTTABILITÉ','warn');
  G.victimStab=0.5+Math.random()*1.5;
  G.playerStab=Math.max(0.5,(4.12-G.victimStab));
  G.lung=LUNG_NEUTRAL;G.buoyVelocity=0;
  showBuoyPanels(true);
  updateBuoyHUD();
  // Pas de playBreath() ici — startBreathing() interval tourne déjà
}

function checkSurfacePhase(depth,dt){
  if(gamePhase!=='surface_check')return;
  const currentYaw=window._yaw||0;
  let delta=currentYaw-lastYawForSpin;
  while(delta>Math.PI)delta-=Math.PI*2;
  while(delta<-Math.PI)delta+=Math.PI*2;
  surface360TotalYaw+=Math.abs(delta);
  lastYawForSpin=currentYaw;

  const has360=surface360TotalYaw>=Math.PI*2;
  const atSurface=depth<=6&&depth>=3;
  const stable=Math.abs(G.buoyVelocity)<0.15;

  // Afficher message 360° au centre
  const msg=document.getElementById('msg-360');
  if(msg){
    msg.style.display='block';
    const deg=Math.min(360,Math.round(surface360TotalYaw*180/Math.PI));
    const prog=document.getElementById('spin-progress');
    if(prog)prog.textContent=deg+'° / 360°';
  }

  if(has360&&atSurface&&stable){
    if(msg)msg.style.display='none';
    gamePhase='done';
    triggerSuccess();
  }
}

// ===== ÉCRAN DE FIN =====
function triggerSuccess(){
  G.isDead=true; // stopper la loop
  const totalTime=Math.round(G.gameTime);
  const ascentTime=G.rescueTime?Math.round(surfaceTime-G.rescueTime):totalTime;
  const gasUsed=Math.round((1.0-G.gasLevel)*200);
  const maxSpeed=Math.round(Math.max(...ascentLog.map(p=>p.speed||0)));

  // Note — pénalité surpression
  let note=10;
  if(G.hadSurpression)note-=2;
  if(maxSpeed>10)note-=2;else if(maxSpeed>8)note-=1;
  if(gasUsed>150)note-=1;
  if(ascentTime>300)note-=1;
  if(ascentTime<60)note-=2;
  note=Math.max(1,Math.min(10,note));

  const stars=note>=8?'★★★':note>=6?'★★☆':'★☆☆';

  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;z-index:200;background:rgba(0,5,15,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Courier New,monospace;padding:20px;overflow:auto';

  // Courbe remontée
  const curveW=Math.min(500,window.innerWidth-40),curveH=160;

  overlay.innerHTML=`
    <div style="color:#00e5cc;font-size:clamp(16px,3vw,28px);letter-spacing:6px;margin-bottom:4px">MISSION ACCOMPLIE</div>
    <div style="color:rgba(0,229,204,0.4);font-size:10px;letter-spacing:3px;margin-bottom:20px">BINÔME SAUVÉ</div>
    <div style="font-size:clamp(28px,6vw,52px);margin-bottom:6px">${stars}</div>
    <div style="color:#fff;font-size:clamp(20px,4vw,36px);font-weight:bold;margin-bottom:20px">NOTE : ${note}/10</div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;width:min(480px,95vw)">
      <div style="background:rgba(0,229,204,0.06);border:1px solid rgba(0,229,204,0.15);border-radius:8px;padding:12px;text-align:center">
        <div style="color:rgba(0,229,204,0.5);font-size:8px;letter-spacing:2px">TEMPS TOTAL</div>
        <div style="color:#fff;font-size:20px;font-weight:bold;margin-top:4px">${Math.floor(totalTime/60)}'${String(totalTime%60).padStart(2,'0')}"</div>
      </div>
      <div style="background:rgba(0,229,204,0.06);border:1px solid rgba(0,229,204,0.15);border-radius:8px;padding:12px;text-align:center">
        <div style="color:rgba(0,229,204,0.5);font-size:8px;letter-spacing:2px">REMONTÉE</div>
        <div style="color:#fff;font-size:20px;font-weight:bold;margin-top:4px">${Math.floor(ascentTime/60)}'${String(ascentTime%60).padStart(2,'0')}"</div>
      </div>
      <div style="background:rgba(0,229,204,0.06);border:1px solid rgba(0,229,204,0.15);border-radius:8px;padding:12px;text-align:center">
        <div style="color:rgba(0,229,204,0.5);font-size:8px;letter-spacing:2px">GAZ CONSOMMÉ</div>
        <div style="color:#fff;font-size:20px;font-weight:bold;margin-top:4px">${gasUsed} BAR</div>
      </div>
      ${G.hadSurpression?`<div style="background:rgba(255,80,0,0.08);border:1px solid rgba(255,80,0,0.2);border-radius:8px;padding:12px;text-align:center;grid-column:1/-1"><div style="color:rgba(255,100,50,0.6);font-size:8px;letter-spacing:2px">⚠ SURPRESSION PULMONAIRE DÉTECTÉE</div><div style="color:#ff8844;font-size:11px;margin-top:4px">-2 points</div></div>`:''}
    </div>

    <div style="color:rgba(0,229,204,0.5);font-size:8px;letter-spacing:2px;margin-bottom:8px">PROFIL DE REMONTÉE</div>
    <canvas id="ascent-curve" width="${curveW}" height="${curveH}"
      style="border:1px solid rgba(0,229,204,0.15);border-radius:6px;margin-bottom:20px;background:rgba(0,10,20,0.8)"></canvas>

    <button onclick="location.reload()" style="padding:12px 40px;background:rgba(0,200,170,0.1);border:1px solid rgba(0,200,170,0.4);border-radius:6px;color:#00e5cc;font-family:Courier New,monospace;font-size:13px;letter-spacing:3px;cursor:pointer">RECOMMENCER</button>
  `;
  document.body.appendChild(overlay);

  // Dessiner la courbe après injection DOM
  requestAnimationFrame(()=>{
    const cv=document.getElementById('ascent-curve');
    if(!cv||ascentLog.length<2)return;
    const ctx=cv.getContext('2d');
    const W=cv.width,H=cv.height;
    const maxD=Math.max(...ascentLog.map(p=>p.depth),G.currentSite.startDepth);
    const maxT=ascentLog[ascentLog.length-1].t||1;

    // Grille
    ctx.strokeStyle='rgba(0,229,204,0.08)';ctx.lineWidth=0.5;
    for(let d=0;d<=maxD;d+=5){
      const y=H-d/maxD*(H-10)-5;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
      ctx.fillStyle='rgba(0,229,204,0.25)';ctx.font='8px Courier New';
      ctx.fillText(d+'m',2,y-2);
    }

    // Ligne palier 3m
    const palierY=H-3/maxD*(H-10)-5;
    ctx.strokeStyle='rgba(255,200,0,0.3)';ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(0,palierY);ctx.lineTo(W,palierY);ctx.stroke();
    ctx.setLineDash([]);

    // Courbe
    ctx.beginPath();ctx.strokeStyle='#00e5cc';ctx.lineWidth=2;
    ascentLog.forEach((p,i)=>{
      const x=p.t/maxT*W;
      const y=H-p.depth/maxD*(H-10)-5;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();

    // Point de rescue
    if(rescueTime){
      const rx=rescueTime/maxT*W;
      const rEntry=ascentLog.find(p=>p.t>=rescueTime);
      if(rEntry){
        const ry=H-rEntry.depth/maxD*(H-10)-5;
        ctx.beginPath();ctx.arc(rx,ry,5,0,Math.PI*2);
        ctx.fillStyle='#ff8844';ctx.fill();
        ctx.fillStyle='rgba(255,136,68,0.7)';ctx.font='8px Courier New';
        ctx.fillText('RESCUE',rx+6,ry+3);
      }
    }
  });
}

// ===== LOOP PRINCIPALE =====
const clock=new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),0.05); // cap à 50ms max (20fps min)
  if(!G.simStarted){sceneAnimate(dt,0);return;}
  if(G.isDead&&gamePhase==='done'){renderer.render(scene,window._camera);return;}

  G.gameTime+=dt;
  const cam=window._camera;

  applyMovement(dt);
  processBuoyancy(dt,Math.abs(Math.min(0,cam.position.y)));

  const depth=Math.abs(Math.min(0,cam.position.y));

  // Log remontée toutes les secondes
  ascentLogTimer+=dt;
  if(ascentLogTimer>1.0){
    ascentLogTimer=0;
    ascentLog.push({t:G.gameTime,depth:Math.round(depth*10)/10,speed:Math.abs(G.currentAscentSpeed)});
  }

  const now=performance.now()/1000;
  if(now-G.lastYTime>0.4){
    G.currentAscentSpeed=(cam.position.y-G.lastY)/(now-G.lastYTime)*60;
    G.lastY=cam.position.y;G.lastYTime=now;
  }

  // Phases
  if(gamePhase==='done')return;

  if(G.rescued&&G.currentAscentSpeed>11){
    G.fastAscentTime+=dt;
    if(!G._lastSpeedAlert||G.gameTime-G._lastSpeedAlert>2){
      G._lastSpeedAlert=G.gameTime;
      setAlert('TROP VITE ! MAX 10 m/min','danger');
    }
    if(G.fastAscentTime>8&&!G.hadSurpression)triggerSurpressionPulmonaire();
  } else if(gamePhase==='surface_check'){
    checkSurfacePhase(depth,dt);
  } else if(G.rescued&&depth<=6&&depth>=4&&gamePhase==='dive'){
    // Zone surface — déclencher le 360°
    gamePhase='surface_check';
    surfaceTime=G.gameTime;
    lastYawForSpin=window._yaw||0;
    setAlert('STABILISEZ À 5-6m — FAITES UN 360° !','warn');
    G.fastAscentTime=Math.max(0,G.fastAscentTime-dt*0.5);
  } else if(G.rescued&&gamePhase==='dive'){
    G.fastAscentTime=Math.max(0,G.fastAscentTime-dt*0.5);
    const f=buoyForce();
    if(Math.abs(f)<0.5)setAlert('NEUTRE — GONFLEZ POUR MONTER','warn');
  } else {
    G.fastAscentTime=Math.max(0,G.fastAscentTime-dt*0.5);
  }

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