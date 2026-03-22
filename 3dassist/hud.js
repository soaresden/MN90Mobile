// hud.js — Suunto D5 fidèle (arc extérieur=bouteille, flèches vitesse centre gauche)
'use strict';

const sc=document.getElementById('suunto-canvas'),sctx=sc.getContext('2d');
const CX=95,CY=95,R=82;

function drawSuunto(){
  sctx.clearRect(0,0,190,190);

  // === FOND ===
  sctx.beginPath();sctx.arc(CX,CY,R+12,0,Math.PI*2);
  sctx.fillStyle='#000';sctx.fill();

  // Boîtier (biseau)
  sctx.beginPath();sctx.arc(CX,CY,R+12,0,Math.PI*2);
  sctx.strokeStyle='#1e1e1e';sctx.lineWidth=14;sctx.stroke();
  sctx.beginPath();sctx.arc(CX,CY,R+12,0,Math.PI*2);
  sctx.strokeStyle='#2d2d2d';sctx.lineWidth=7;sctx.stroke();

  // === TICKS EXTÉRIEURS (graduation cadran) ===
  for(let d=0;d<360;d+=3){
    const isMaj=d%30===0,isMed=d%10===0;
    if(!isMaj&&!isMed&&d%6!==0)continue;
    const len=isMaj?10:isMed?6:3;
    const lw=isMaj?1.5:0.8;
    const col=isMaj?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.2)';
    const a=(d-90)*Math.PI/180;
    sctx.beginPath();
    sctx.moveTo(CX+(R+2)*Math.cos(a),CY+(R+2)*Math.sin(a));
    sctx.lineTo(CX+(R+2+len)*Math.cos(a),CY+(R+2+len)*Math.sin(a));
    sctx.strokeStyle=col;sctx.lineWidth=lw;sctx.stroke();
  }

  // Labels graduation (20, 40, 60, 80)
  sctx.font='bold 8px Arial';sctx.textAlign='center';sctx.textBaseline='middle';
  sctx.fillStyle='rgba(255,255,255,0.4)';
  [{a:-90,l:'0'},{a:-36,l:'20'},{a:18,l:'40'},{a:72,l:'60'},{a:126,l:'80'}].forEach(({a,l})=>{
    const rad=(a)*Math.PI/180;
    sctx.fillText(l,CX+(R-8)*Math.cos(rad),CY+(R-8)*Math.sin(rad));
  });

  // === ARC BOUTEILLE (extérieur, cyan) ===
  // 200 bar = arc complet de -150° à +150° (300° total comme D5)
  const arcStart=-150,arcEnd=150;
  const arcRange=arcEnd-arcStart;
  // Fond arc
  _arc(arcStart,arcEnd,'#0a2a2a',8);
  // Arc restant gaz
  const gasAngle=arcStart+G.gasLevel*arcRange;
  const bar=Math.round(G.gasLevel*200);
  const gasCol=G.gasLevel>0.5?'#00d4d4':G.gasLevel>0.25?'#d4b400':'#d42000';
  if(G.gasLevel>0.01)_arc(arcStart,gasAngle,gasCol,8);
  // Pointeur flèche sur l'arc
  if(G.gasLevel>0.01){
    const pa=(gasAngle-90)*Math.PI/180;
    const px=CX+R*Math.cos(pa),py=CY+R*Math.sin(pa);
    sctx.save();sctx.translate(px,py);sctx.rotate(pa+Math.PI/2);
    sctx.beginPath();sctx.moveTo(0,-8);sctx.lineTo(5,4);sctx.lineTo(-5,4);
    sctx.closePath();sctx.fillStyle=gasCol;sctx.fill();
    sctx.restore();
  }

  // === SÉPARATEUR HORIZONTAL (style D5) ===
  // Ligne cyan sous DEPTH
  sctx.beginPath();
  sctx.moveTo(CX-52,CY+8);sctx.lineTo(CX+52,CY+8);
  sctx.strokeStyle='rgba(0,200,200,0.25)';sctx.lineWidth=0.5;sctx.stroke();

  // Séparateur vertical entre NO DECO et DIVE TIME
  sctx.beginPath();
  sctx.moveTo(CX,CY+12);sctx.lineTo(CX,CY+44);
  sctx.strokeStyle='rgba(255,255,255,0.12)';sctx.lineWidth=0.5;sctx.stroke();

  // Séparateur bas (avant TEMPERATURE)
  sctx.beginPath();
  sctx.moveTo(CX-52,CY+46);sctx.lineTo(CX+52,CY+46);
  sctx.strokeStyle='rgba(0,200,200,0.25)';sctx.lineWidth=0.5;sctx.stroke();

  // === DEPTH — gros chiffre haut centre ===
  const depth=Math.max(0,G.currentDepth||0);
  sctx.fillStyle='#00d4d4';sctx.font='bold 9px Arial';
  sctx.textAlign='center';sctx.textBaseline='middle';
  sctx.fillText('DEPTH',CX,CY-38);

  sctx.fillStyle='#ffffff';sctx.font='bold 32px Arial';
  sctx.fillText(depth.toFixed(1),CX+5,CY-16);
  sctx.font='bold 14px Arial';sctx.fillStyle='rgba(255,255,255,0.7)';
  sctx.fillText('m',CX+32,CY-12);

  // === FLÈCHES VITESSE REMONTÉE (centre gauche, style D5) ===
  // Sur la photo : 4-5 traits/flèches empilées, grises = neutres, vertes/orange/rouge = actives
  _drawAscentArrows();

  // === NO DECO (bas gauche) ===
  sctx.fillStyle='#00d4d4';sctx.font='bold 8px Arial';sctx.textAlign='center';
  sctx.fillText('NO DECO',CX-26,CY+14);
  const nd=Math.max(0,Math.round(G.currentSite?G.currentSite.nodeco-G.gameTime/60:0));
  sctx.fillStyle='#fff';sctx.font="bold 22px Arial";
  sctx.fillText(nd+"'",CX-26,CY+32);

  // === DIVE TIME (bas droite) ===
  sctx.fillStyle='#00d4d4';sctx.font='bold 8px Arial';sctx.textAlign='center';
  sctx.fillText('DIVE TIME',CX+26,CY+14);
  const mins=Math.floor(G.gameTime/60),secs=Math.floor(G.gameTime%60);
  sctx.fillStyle='#fff';sctx.font="bold 18px Arial";sctx.textAlign='right';
  sctx.fillText(mins+"'",CX+36,CY+32);
  sctx.font="bold 14px Arial";sctx.fillStyle='rgba(255,255,255,0.8)';
  sctx.textAlign='left';
  sctx.fillText(String(secs).padStart(2,'0'),CX+38,CY+35);

  // === TEMPERATURE (bas centre) ===
  sctx.fillStyle='#00d4d4';sctx.font='bold 8px Arial';sctx.textAlign='center';
  sctx.fillText('TEMPERATURE',CX,CY+52);
  sctx.fillStyle='#fff';sctx.font='bold 18px Arial';
  sctx.fillText((G.currentSite?G.currentSite.temp:'—'),CX,CY+68);

  // === ALERTE BAS (bande colorée si urgence) ===
  if(bar<=50&&G.simStarted){
    const urgCol=bar<=20?'#ff2200':bar<=50?'#ff8800':'#ffcc00';
    sctx.fillStyle=urgCol+'22';
    sctx.fillRect(CX-55,CY+74,110,14);
    sctx.fillStyle=urgCol;sctx.font='bold 7px Courier New';sctx.textAlign='center';
    sctx.fillText(bar+' BAR',CX,CY+83);
  }
}

function _arc(startDeg,endDeg,col,lw){
  sctx.beginPath();
  sctx.arc(CX,CY,R,(startDeg-90)*Math.PI/180,(endDeg-90)*Math.PI/180);
  sctx.strokeStyle=col;sctx.lineWidth=lw;sctx.lineCap='round';sctx.stroke();
}

// Flèches remontée style D5 — traits horizontaux empilés côté gauche
function _drawAscentArrows(){
  const spd=G.rescued?Math.max(0,G.currentAscentSpeed):0;
  // 5 niveaux : >0.5, >2, >5, >8, >11 m/min
  const levels=[
    {thr:0.5,  col:'#00cc44', label:'▲'},
    {thr:2.0,  col:'#00cc44', label:'▲'},
    {thr:5.0,  col:'#ffaa00', label:'▲'},
    {thr:8.0,  col:'#ff6600', label:'▲'},
    {thr:11.0, col:'#ff2200', label:'▲'},
  ];
  const x=CX-40, startY=CY+28;
  levels.forEach((lv,i)=>{
    const on=spd>=lv.thr;
    const y=startY-i*8;
    if(on){
      // Triangle rempli
      sctx.fillStyle=lv.col;
      sctx.beginPath();
      sctx.moveTo(x,y-5);sctx.lineTo(x-5,y+1);sctx.lineTo(x+5,y+1);
      sctx.closePath();sctx.fill();
    } else {
      // Trait gris horizontal
      sctx.strokeStyle='rgba(120,120,120,0.4)';sctx.lineWidth=2;sctx.lineCap='round';
      sctx.beginPath();sctx.moveTo(x-5,y-2);sctx.lineTo(x+5,y-2);sctx.stroke();
    }
  });
}

// ===== ALERTES =====
function setAlert(msg,cls){
  const el=document.getElementById('hud-alert-bar');
  if(!el)return;
  el.textContent=msg;
  el.className=(cls?'warn danger'.includes(cls)?cls:'':'');
  if(cls==='danger'&&soundEnabled)playAlarm();
}

// ===== UPDATE HUD =====
function updateHUD(depth,dt){
  if(G.isDead)return;
  G.currentDepth=depth;

  const ata=depth/10+1;
  const consoLmin=(G.rescued?18:15)*ata;
  const ratePerSec=consoLmin/2400/60*2.0;
  G.gasLevel=Math.max(0,G.gasLevel-ratePerSec*dt);
  const bar=Math.round(G.gasLevel*200);

  // Alarme <50 bar
  if(bar<50&&bar>0) startLowAirAlarm();
  else stopLowAirAlarm();

  const consumed=1.0-G.gasLevel;
  const alertEl=document.getElementById('hud-alert-bar');
  if(!alertEl)return;
  if(consumed<0.33){
    if(!alertEl.className||alertEl.className==='')alertEl.textContent='SYS OK · '+bar+' BAR';
  } else if(consumed<0.5){
    setAlert('1/3 CONSOMMÉ — RETOUR · '+bar+' BAR','warn');
  } else if(consumed<0.67){
    setAlert('GAZ : '+bar+' BAR — REMONTER','warn');
  } else if(bar>30){
    setAlert('RÉSERVE ! '+bar+' BAR','danger');
  } else if(bar>0){
    setAlert("PANNE D'AIR ! "+bar+' BAR','danger');
  }

  if(bar<=0&&!G.isDead)triggerDeath();
  drawSuunto();
}

// ===== FIN DE VIE =====
function triggerDeath(){
  G.isDead=true;
  stopLowAirAlarm();
  document.getElementById('c').style.filter='blur(8px) brightness(0.2)';
  _deathScreen('VOUS ÊTES MORT',
    `Bouteille vide à ${Math.round(depth||0)} m`,'#cc0000','#cc6666');
}

function triggerSurpressionPulmonaire(){
  G.hadSurpression=true;
  setAlert('⚠ SURPRESSION — RALENTISSEZ !','danger');
  if(soundEnabled){playAlarm();setTimeout(()=>playAlarm(),300);setTimeout(()=>playAlarm(),600);}
  G.fastAscentTime=0;
}

function _deathScreen(title,sub,col,btnCol){
  const d=document.createElement('div');
  d.style.cssText='position:absolute;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);pointer-events:all;font-family:Courier New,monospace;';
  d.innerHTML=`<div style="color:${col};font-size:clamp(20px,4vw,38px);font-weight:bold;letter-spacing:6px;animation:db 1s infinite">${title}</div><div style="color:rgba(220,100,60,0.7);font-size:12px;letter-spacing:2px;margin-top:14px;max-width:400px;text-align:center;line-height:1.8">${sub}</div><button onclick="location.reload()" style="margin-top:28px;padding:11px 32px;background:rgba(150,60,0,0.2);border:1px solid rgba(200,80,0,0.4);border-radius:6px;color:${btnCol};font-family:Courier New,monospace;font-size:12px;letter-spacing:3px;cursor:pointer">RECOMMENCER</button><style>@keyframes db{0%,100%{opacity:1;text-shadow:0 0 24px ${col}}50%{opacity:0.5;text-shadow:0 0 48px ${col}}}</style>`;
  document.body.appendChild(d);
}