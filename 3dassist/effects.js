// effects.js — Effets visuels : masque monoverre, lampe torche, vision, houle
'use strict';

// ===== LAMPE TORCHE =====
let torchEnabled=false;
let _torchLight=null;

function buildTorch(){
  // PointLight intense devant la caméra
  _torchLight=new THREE.PointLight(0xffffff,0,25);
  scene.add(_torchLight);
}

function toggleTorch(){
  torchEnabled=!torchEnabled;
  if(_torchLight)_torchLight.intensity=torchEnabled?2.5:0;
  document.getElementById('torch-btn').textContent='LAMPE : '+(torchEnabled?'ON':'OFF');
  // La lampe remet les couleurs naturelles localement
  if(torchEnabled)document.getElementById('c').style.filter='none';
}

function updateTorch(){
  if(!_torchLight||!window._camera)return;
  const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(window._camera.quaternion);
  _torchLight.position.copy(window._camera.position).addScaledVector(fwd,0.5);
  // La lampe éclaircit aussi le filtre CSS autour du faisceau
  if(torchEnabled&&!G.isDead){
    document.getElementById('c').style.filter='none';
  }
}

// ===== MASQUE MONOVERRE (injecté dans le SVG existant) =====
function applyMonoverseMask(){
  // SVG monoverre défini directement dans index.html — rien à faire ici
}

// ===== BALANCEMENT CORPS (houle / apesanteur) =====
let _swayTime=0;
let _swayAmplitude=0; // 0 = calme, 1 = houle forte

function setSiteHoule(siteKey){
  // Martinique : légère houle possible
  // Nemo / VLG / Roussay : plan d'eau calme
  _swayAmplitude=siteKey==='martinique'?0.4:0.0;
}

function updateSway(dt){
  if(!window._camera)return;
  _swayTime+=dt;
  const cam=window._camera;

  // Balancement naturel sous l'eau (toujours un peu présent)
  const baseRoll=Math.sin(_swayTime*0.7)*0.008;
  const basePitch=Math.sin(_swayTime*0.45)*0.005;

  // Houle en surface / eau ouverte
  const houleRoll=Math.sin(_swayTime*1.2)*_swayAmplitude*0.025;
  const houlePitch=Math.sin(_swayTime*0.9+1)*_swayAmplitude*0.015;
  const houleY=Math.sin(_swayTime*1.0)*_swayAmplitude*0.04;

  // Appliquer offset de rotation sans écraser la caméra principale
  // On utilise un quaternion additif
  const swayEuler=new THREE.Euler(basePitch+houlePitch,0,baseRoll+houleRoll,'XYZ');
  const swayQ=new THREE.Quaternion().setFromEuler(swayEuler);
  cam.quaternion.multiply(swayQ);

  // Dérive verticale douce
  if(!G.rescued)cam.position.y+=houleY*dt*0.5;
}

// ===== PHYSIQUE COULEURS PROFONDEUR =====
// (déplacé depuis hud.js pour centraliser les effets visuels)
function applyDepthColor(depth,bar){
  if(bar<=100)return; // hypoxie prend le dessus
  const brightness=Math.max(0.08,1.0-depth*0.018);
  const redLoss=Math.min(1,Math.max(0,(depth-2)/6));
  const orangeLoss=Math.min(1,Math.max(0,(depth-8)/10));
  const yellowLoss=Math.min(1,Math.max(0,(depth-15)/15));
  const greenLoss=Math.min(1,Math.max(0,(depth-30)/15));
  const sat=Math.max(0.05,1.0-greenLoss*0.5-yellowLoss*0.3-redLoss*0.1);
  const hue=depth*0.8;

  if(!G.isDead){
    if(!torchEnabled){
      // Sans lampe : filtre couleur complet
      document.getElementById('c').style.filter=
        `brightness(${brightness.toFixed(2)}) saturate(${sat.toFixed(2)}) hue-rotate(${hue.toFixed(0)}deg)`;
    } else {
      // Avec lampe : seulement léger assombrissement sur les bords (vignette)
      // Le centre est éclairé normalement par la torche
      document.getElementById('c').style.filter=`brightness(${Math.min(1,brightness+0.4).toFixed(2)})`;
    }
    const ov=document.getElementById('depth-color-overlay');
    ov.style.background=`rgba(${Math.round((1-redLoss)*80)},${Math.round((1-orangeLoss)*20)},0,1)`;
    ov.style.opacity=(redLoss>0.05&&!torchEnabled?(1-redLoss)*0.25:0).toFixed(2);

    // Ambient light
    if(window._ambient){
      const intensity=torchEnabled?G.currentSite.ambientInt:G.currentSite.ambientInt;
      const r=Math.max(0.02,0.14*(torchEnabled?1:1-redLoss));
      const g2=Math.max(0.04,0.18*(torchEnabled?1:1-yellowLoss*0.5));
      const b=torchEnabled?0.35:0.28;
      window._ambient.color.setRGB(r*intensity,g2*intensity,b*intensity);
    }
  }
}

// ===== VISION TROUBLE (hypoxie) =====
function applyHypoxia(bar){
  const mc=document.getElementById('mask-color');
  if(bar>100){
    mc.style.opacity=G.currentSite.maskOpacity;
    if(!torchEnabled)document.getElementById('c').style.filter='none';
  } else if(bar>50){
    mc.style.opacity=G.currentSite.maskOpacity;
  } else if(bar>30){
    const t=(50-bar)/20;
    if(!torchEnabled)document.getElementById('c').style.filter=`blur(${(t*3).toFixed(1)}px)`;
    mc.style.background='rgba(120,0,0,1)';
    mc.style.opacity=0.15+Math.sin(G.gameTime*3)*0.1;
  } else if(bar>0){
    const t=(30-bar)/30;
    if(!torchEnabled)document.getElementById('c').style.filter=`blur(${(t*6).toFixed(1)}px)`;
    mc.style.background='rgba(160,0,0,1)';
    mc.style.opacity=0.25+Math.sin(G.gameTime*5)*0.2;
  }
}

// ===== INIT EFFETS =====
function initEffects(siteKey){
  applyMonoverseMask();
  setSiteHoule(siteKey);
  buildTorch();
}

function updateEffects(dt,depth,bar){
  if(!window._camera)return; // pas encore prêt
  updateTorch();
  updateSway(dt);
  applyDepthColor(depth,bar);
  applyHypoxia(bar);
}