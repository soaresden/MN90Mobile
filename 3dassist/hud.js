// hud.js — HUD Suunto, alertes, physique couleurs par profondeur
'use strict';

const sc=document.getElementById('suunto-canvas'),sctx=sc.getContext('2d');
const CX=95,CY=95,R=84;

function drawSuunto(){
  sctx.clearRect(0,0,190,190);
  sctx.beginPath();sctx.arc(CX,CY,R+8,0,Math.PI*2);sctx.strokeStyle='#111';sctx.lineWidth=16;sctx.stroke();
  sctx.beginPath();sctx.arc(CX,CY,R+8,0,Math.PI*2);sctx.strokeStyle='#1c1c1c';sctx.lineWidth=12;sctx.stroke();
  _sArc(-140,140,'#222',5);
  const ge=-140+G.gasLevel*280;
  const gc=G.gasLevel>0.4?'#00cc44':G.gasLevel>0.2?'#ffaa00':'#ff3333';
  if(G.gasLevel>0.01)_sArc(-140,ge,gc,5);
  _sArc(-140,-40,'#282828',4);
  const sn=Math.min(1,Math.abs(G.currentAscentSpeed)/20);
  if(sn>0.01)_sArc(-140,-140+sn*100,sn>0.55?'#ff3333':'#ffd700',4);
  for(let d=-140;d<=140;d+=10){const mj=d%30===0;_sTick(d,mj?6:3,mj?'#444':'#2a2a2a',mj?1.5:1);}
  _sArrow(G.gasLevel>0.01?ge:-140);
  sctx.beginPath();sctx.arc(CX,CY,R-3,0,Math.PI*2);sctx.strokeStyle='#1a1a1a';sctx.lineWidth=2;sctx.stroke();
}
function _sArc(s,e,col,lw){sctx.beginPath();sctx.arc(CX,CY,R,(s-90)*Math.PI/180,(e-90)*Math.PI/180);sctx.strokeStyle=col;sctx.lineWidth=lw;sctx.lineCap='round';sctx.stroke();}
function _sTick(d,len,col,lw){const a=(d-90)*Math.PI/180;sctx.beginPath();sctx.moveTo(CX+(R+1)*Math.cos(a),CY+(R+1)*Math.sin(a));sctx.lineTo(CX+(R+1+len)*Math.cos(a),CY+(R+1+len)*Math.sin(a));sctx.strokeStyle=col;sctx.lineWidth=lw;sctx.stroke();}
function _sArrow(d){const a=(d-90)*Math.PI/180,tx=CX+(R+9)*Math.cos(a),ty=CY+(R+9)*Math.sin(a);sctx.save();sctx.translate(tx,ty);sctx.rotate(a+Math.PI/2);sctx.beginPath();sctx.moveTo(0,-6);sctx.lineTo(4,2);sctx.lineTo(-4,2);sctx.closePath();sctx.fillStyle='#00e5cc';sctx.fill();sctx.restore();}

function setAlert(msg,cls){
  const el=document.getElementById('hud-alert');
  el.textContent=msg;
  el.className='w-alert'+(cls?' '+cls:'');
  if(cls==='danger'&&soundEnabled)playAlarm();
}

function updateHUD(depth,dt){
  if(G.isDead)return;
  document.getElementById('hud-depth').textContent=Math.max(0,Math.round(depth*10)/10);
  const mins=Math.floor(G.gameTime/60),secs=Math.floor(G.gameTime%60);
  document.getElementById('hud-divetime').childNodes[0].textContent=mins+"'";
  document.getElementById('hud-secs').textContent=(secs<10?'0':'')+secs;
  const nd=Math.max(0,Math.round(G.currentSite.nodeco-G.gameTime/60));
  document.getElementById('hud-nodeco').textContent=nd+"'";

  // Consommation réelle : 15 L/min surface × ATA × 2 (gameplay)
  const ata=depth/10+1;
  const consoLmin=(G.rescued?18:15)*ata;
  const ratePerSec=consoLmin/2400/60*2.0;
  G.gasLevel=Math.max(0,G.gasLevel-ratePerSec*dt);
  const bar=Math.round(G.gasLevel*200);

  // Règle des tiers (cours N3)
  const consumed=1.0-G.gasLevel;
  if(consumed<0.33){
    if(document.getElementById('hud-alert').className==='w-alert')
      document.getElementById('hud-alert').textContent='SYS OK  ·  '+bar+' BAR';
  } else if(consumed<0.5){
    setAlert('1/3 CONSOMMÉ — RETOUR · '+bar+' BAR','warn');
  } else if(consumed<0.67){
    setAlert('GAZ : '+bar+' BAR — REMONTER','warn');
  } else if(bar>30){
    setAlert('RÉSERVE ! '+bar+' BAR — URGENCE','danger');
  } else if(bar>0){
    setAlert("PANNE D'AIR IMMINENTE ! "+bar+' BAR','danger');
  }

  // Effects visuels appelés depuis game.js avec le bon dt
  if(bar<=0&&!G.isDead)triggerDeath();
  drawSuunto();
}

// applyHypoxia et applyDepthColor sont dans effects.js


function triggerDeath(){
  G.isDead=true;
  document.getElementById('c').style.filter='blur(8px) brightness(0.2)';
  document.getElementById('mask-vignette').style.boxShadow='inset 0 0 0 9999px rgba(0,0,0,0.95)';
  _deathScreen('VOUS ÊTES MORT',`Bouteille vide à ${Math.round(Math.abs(Math.min(0,window._camera?window._camera.position.y:20)))} m`,'#cc0000','#cc6666');
}

function triggerSurpressionPulmonaire(){
  G.isDead=true;
  document.getElementById('c').style.filter='blur(6px) brightness(0.3)';
  document.getElementById('mask-vignette').style.boxShadow='inset 0 0 0 9999px rgba(0,0,0,0.95)';
  _deathScreen('SURPRESSION PULMONAIRE','Remontée trop rapide — rupture alvéolaire.<br><span style="font-size:10px;color:rgba(180,80,40,0.6)">Max 10 m/min — expirez en continu</span>','#cc4400','#ff8844');
}

function _deathScreen(title,sub,col,btnCol){
  const d=document.createElement('div');
  d.style.cssText='position:absolute;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);pointer-events:all;font-family:Courier New,monospace;';
  d.innerHTML=`<div style="color:${col};font-size:clamp(20px,4vw,38px);font-weight:bold;letter-spacing:6px;animation:db 1s infinite">${title}</div><div style="color:rgba(220,100,60,0.7);font-size:12px;letter-spacing:2px;margin-top:14px;max-width:400px;text-align:center;line-height:1.8">${sub}</div><button onclick="location.reload()" style="margin-top:28px;padding:11px 32px;background:rgba(150,60,0,0.2);border:1px solid rgba(200,80,0,0.4);border-radius:6px;color:${btnCol};font-family:Courier New,monospace;font-size:12px;letter-spacing:3px;cursor:pointer">RECOMMENCER</button><style>@keyframes db{0%,100%{opacity:1;text-shadow:0 0 24px ${col}}50%{opacity:0.5;text-shadow:0 0 48px ${col}}}</style>`;
  document.body.appendChild(d);
}
