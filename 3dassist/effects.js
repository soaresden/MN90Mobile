// effects.js — Effets visuels : masque monoverre, lampe torche, vision, houle
'use strict';

// ===== LAMPE TORCHE =====
let torchEnabled=true; // ON par défaut
let _torchLight=null;

function buildTorch(){
  _torchLight=new THREE.PointLight(0xffffff,0,25);
  scene.add(_torchLight);
  // Allumer immédiatement
  _torchLight.intensity=2.5;
  document.getElementById('torch-btn').textContent='LAMPE : ON';
}

function toggleTorch(){
  torchEnabled=!torchEnabled;
  if(_torchLight)_torchLight.intensity=torchEnabled?2.5:0;
  document.getElementById('torch-btn').textContent='LAMPE : '+(torchEnabled?'ON':'OFF');
  if(!torchEnabled) return;
  if(!G.isDead)document.getElementById('c').style.filter='none';
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

// ===== COULEURS : L'ABSORPTION DE LA LUMIÈRE PAR L'EAU =====
// La lumière du jour qui descend perd ses couleurs avec la profondeur :
// T = exp(−K·d) pour le rouge, le vert, le bleu (K : voir OPTIQUE dans
// config.js). Le rouge disparaît dans les 5 premiers mètres, puis l'orange,
// le jaune ; il reste le bleu (ou le vert en lac). Tout est fait dans la
// scène 3D (lumières, couleur de l'eau, fenêtre de Snell) : la lampe, elle,
// rend les couleurs de près.
function applyDepthColor(depth,bar){
  const o=OPTIQUE[G.selectedSiteKey];
  if(!o||!window._ambient)return;
  const d=Math.max(0,depth);
  const T=o.K.map(k=>Math.exp(-k*d));
  // L'eau elle-même (le fond de l'image et le voile au loin)
  if(scene.fog){
    scene.fog.color.setRGB(o.eau[0]*T[0],o.eau[1]*T[1],o.eau[2]*T[2]);
    renderer.setClearColor(scene.fog.color);
  }
  // La lumière du jour qui arrive à cette profondeur
  window._ambient.intensity=1;
  window._ambient.color.setRGB(Math.max(0.012,o.jour*T[0]),Math.max(0.014,o.jour*T[1]),Math.max(0.02,o.jour*T[2]));
  if(window._sun){window._sun.intensity=1;window._sun.color.setRGB(o.soleil*T[0],o.soleil*T[1],o.soleil*T[2]);}
  // Le ciel vu à travers la fenêtre de Snell : même teinte, moins lumineux en profondeur
  if(window._fenetreSnell){
    const m=Math.max(...T),lum=0.8*Math.pow(m,0.8);
    window._fenetreSnell.material.color.setRGB(T[0]/m*lum,T[1]/m*lum,T[2]/m*lum);
  }
  // La lampe : blanche, mais l'eau mange déjà le rouge sur l'aller-retour (≈ 2 m)
  if(_torchLight){
    const L=o.K.map(k=>Math.exp(-k*2));const mx=Math.max(...L);
    _torchLight.color.setRGB(L[0]/mx,L[1]/mx,L[2]/mx);
  }
  // Plus aucun filtre CSS de couleur (il faussait les teintes)
  const ov=document.getElementById('depth-color-overlay');
  if(ov)ov.style.opacity='0';
}

// ===== VISION TROUBLE (hypoxie) =====
function applyHypoxia(bar){
  const mc=document.getElementById('mask-color');
  if(bar>100){
    mc.style.opacity=G.currentSite.maskOpacity;
    document.getElementById('c').style.filter='none';
  } else if(bar>50){
    mc.style.opacity=G.currentSite.maskOpacity;
  } else if(bar>30){
    const t=(50-bar)/20;
    document.getElementById('c').style.filter=`blur(${(t*3).toFixed(1)}px)`;
    mc.style.background='rgba(120,0,0,1)';
    mc.style.opacity=0.15+Math.sin(G.gameTime*3)*0.1;
  } else if(bar>0){
    const t=(30-bar)/30;
    document.getElementById('c').style.filter=`blur(${(t*6).toFixed(1)}px)`;
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
  if(!window._camera)return;
  updateTorch();
  updateSway(dt);
  applyDepthColor(depth,bar);
  applyHypoxia(bar);
  applyNarcose(depth,dt);
}

// ===== NARCOSE (ivresse des profondeurs) =====
let _narcoseHalo=null;
let _narcosePhase=0;
function applyNarcose(depth,dt){
  const NARCOSE_START=30;
  const NARCOSE_FULL=50;
  if(depth<NARCOSE_START){ 
    if(_narcoseHalo){_narcoseHalo.style.opacity='0';} 
    return; 
  }
  // Intensité 0→1 entre 30m et 50m
  const intensity=Math.min(1,(depth-NARCOSE_START)/(NARCOSE_FULL-NARCOSE_START));
  
  // Halo coloré vignette (violet/bleu)
  if(!_narcoseHalo){
    _narcoseHalo=document.createElement('div');
    _narcoseHalo.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:15;transition:opacity 2s;background:radial-gradient(ellipse at center,transparent 40%,rgba(80,0,180,0.0) 60%,rgba(40,0,120,0.5) 100%)';
    document.body.appendChild(_narcoseHalo);
  }
  _narcoseHalo.style.opacity=(intensity*0.7).toFixed(2);
  
  // Légère distorsion visuelle — balancement amplifié
  _narcosePhase+=dt*(0.3+intensity*0.5);
  const wobble=Math.sin(_narcosePhase)*intensity*1.5;
  if(!G.isDead&&window._camera){
    window._camera.rotation.z=wobble*Math.PI/180;
  }
  
  // Alerte au joueur
  if(intensity>0.3&&Math.random()<0.001){
    setAlert('NARCOSE — Remontez !','warn');
  }
}