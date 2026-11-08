// effects.js — Effets visuels : masque monoverre, lampe torche, vision, houle
'use strict';

// ===== LE FILTRE DE L'IMAGE : hypoxie (manque d'air) + narcose =====
const _fx={flouHypoxie:0,flouNarcose:0,satNarcose:1};
function appliquerFiltre(){
  if(G.isDead)return;
  const flou=_fx.flouHypoxie+_fx.flouNarcose;
  const f=[];
  if(flou>0.05)f.push(`blur(${flou.toFixed(1)}px)`);
  if(_fx.satNarcose>1.01)f.push(`saturate(${_fx.satNarcose.toFixed(2)})`);
  document.getElementById('c').style.filter=f.length?f.join(' '):'none';
}

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
}

function updateTorch(){
  if(!_torchLight||!window._camera)return;
  const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(window._camera.quaternion);
  _torchLight.position.copy(window._camera.position).addScaledVector(fwd,0.5);
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
  const baseRoll=Math.sin(_swayTime*0.7)*0.008+Math.sin(_swayTime*0.35)*_narcoseRoulis*0.05;
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
    const m=Math.max(...T),lum=0.5+0.5*Math.pow(m,0.5);
    window._fenetreSnell.material.color.setRGB(Math.min(1,T[0]/m*lum+0.15),T[1]/m*lum,T[2]/m*lum);
  }
  // Hors de la fenêtre, la surface fait miroir : un plafond plus clair que l'eau autour
  if(window._water){
    const f=scene.fog?scene.fog.color:{r:0,g:0,b:0};
    window._water.material.color.setRGB(Math.min(1,f.r*3+0.04),Math.min(1,f.g*3+0.07),Math.min(1,f.b*3+0.1));
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
  _fx.flouHypoxie=0;
  if(bar>100){
    mc.style.opacity=G.currentSite.maskOpacity;
  } else if(bar>50){
    mc.style.opacity=G.currentSite.maskOpacity;
  } else if(bar>30){
    const t=(50-bar)/20;
    _fx.flouHypoxie=t*3;
    mc.style.background='rgba(120,0,0,1)';
    mc.style.opacity=0.15+Math.sin(G.gameTime*3)*0.1;
  } else if(bar>0){
    const t=(30-bar)/30;
    _fx.flouHypoxie=t*6;
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
  appliquerFiltre();
}

// ===== NARCOSE (ivresse des profondeurs) =====
// À l'air, elle se fait sentir vers 30 m et grandit avec la profondeur :
// vision en tunnel, image un peu floue et trop colorée, tête qui balance,
// et surtout une euphorie qui donne une fausse impression de sécurité.
// Le remède : remonter de quelques mètres.
let _narcoseHalo=null,_narcosePensee=null,_narcoseProchaine=0;
let _narcoseRoulis=0;
const PENSEES=['Tout va bien… on a le temps.','C’est beau ici, on reste encore un peu ?','Je compte mes bulles… une, deux…',
  'Il est où, déjà, le blessé ?','Ma montre dit quoi ? Bof, plus tard.','Je me sens super bien !','On pourrait descendre encore un peu…'];
function applyNarcose(depth,dt){
  const DEBUT=30,FORTE=42;
  const i=Math.max(0,Math.min(1,(depth-DEBUT)/(FORTE-DEBUT)));
  if(!_narcoseHalo){
    _narcoseHalo=document.createElement('div');
    _narcoseHalo.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:15;transition:opacity 1.5s';
    document.body.appendChild(_narcoseHalo);
    _narcosePensee=document.createElement('div');
    _narcosePensee.style.cssText='position:fixed;top:38%;left:50%;transform:translate(-50%,-50%);z-index:16;pointer-events:none;'
      +'font:italic 600 clamp(14px,2.4vw,22px) Rajdhani,sans-serif;color:rgba(255,236,170,.85);text-shadow:0 0 12px rgba(255,200,80,.6);'
      +'opacity:0;transition:opacity 1.2s;white-space:nowrap';
    document.body.appendChild(_narcosePensee);
  }
  // Vision en tunnel : les bords s'assombrissent, le champ se resserre
  const pouls=0.06*Math.sin(G.gameTime*1.1);
  const centre=Math.round(40-24*i+pouls*20);
  _narcoseHalo.style.background=`radial-gradient(ellipse at center,transparent ${centre}%,rgba(8,0,20,${Math.min(0.96,0.25+0.75*i).toFixed(2)}) 88%)`;
  _narcoseHalo.style.opacity=i>0?'1':'0';
  _fx.flouNarcose=i>0?0.3+1.4*i:0;
  _fx.satNarcose=1+0.6*i;
  // Roulis lent de la tête (appliqué avec la houle, voir updateSway)
  _narcoseRoulis=i;
  // Les pensées euphoriques, de temps en temps
  if(i>0.15&&G.gameTime>_narcoseProchaine){
    _narcosePensee.textContent=PENSEES[Math.floor(Math.random()*PENSEES.length)];
    _narcosePensee.style.opacity='1';
    setTimeout(()=>{if(_narcosePensee)_narcosePensee.style.opacity='0';},3200);
    _narcoseProchaine=G.gameTime+18-10*i+Math.random()*6;
    if(Math.random()<0.5)setAlert('NARCOSE — remontez de quelques mètres','warn');
  }
  if(i===0&&_narcosePensee)_narcosePensee.style.opacity='0';
}
