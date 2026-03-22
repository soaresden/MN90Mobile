// scene.js — Three.js scene, blessé, bras FPS, bulles
'use strict';

const W=window.innerWidth,H=window.innerHeight;
const canvas3d=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas:canvas3d,antialias:true});
renderer.setSize(W,H);renderer.setPixelRatio(Math.min(devicePixelRatio,2));

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(75,W/H,0.1,200);
window._camera=camera; // exposé pour hud.js

let ambient,caustic,water,armGroup=null;
let victimModel=null,victimMixer=null;
let bubbles3D=[];
// VP sera défini dynamiquement quand la caméra est positionnée
const VP=new THREE.Vector3(0,-19.5,-3);

function _setVictimPos(){
  const cam=window._camera;
  if(!cam)return;
  // Placer le blessé 3m devant la caméra, même profondeur
  const dir=new THREE.Vector3(0,0,-1).applyEuler(cam.rotation);
  dir.y=0;dir.normalize();
  VP.copy(cam.position).addScaledVector(dir,3);
  // Légèrement plus bas que la caméra (tête à hauteur des yeux)
  VP.y=cam.position.y-0.5;
}

window._ambient=null; // exposé pour hud.js applyDepthColor

// ===== BUILD SCENE =====
function buildScene(site,onReady){
  while(scene.children.length)scene.remove(scene.children[0]);
  bubbles3D=[];victimModel=null;victimMixer=null;armGroup=null;
  console.log('[scene] buildScene site:', site.name);

  renderer.setClearColor(site.fogColor);
  scene.fog=new THREE.FogExp2(site.fogColor,site.fogDensity);
  ambient=new THREE.AmbientLight(site.ambientColor,site.ambientInt);scene.add(ambient);
  window._ambient=ambient;
  const sun=new THREE.DirectionalLight(site.sunColor,site.sunInt);sun.position.set(5,20,3);scene.add(sun);
  caustic=new THREE.PointLight(site.causticColor,0.5,30);caustic.position.set(0,-5,0);scene.add(caustic);

  if(G.selectedSiteKey==='vlg'){
    _buildPoolScene(site);
  } else {
    _buildNaturalScene(site);
  }

  document.getElementById('mask-color').style.background=site.maskColor;
  document.getElementById('mask-color').style.opacity=site.maskOpacity;
  document.getElementById('hud-temp').textContent=site.temp;

  buildArm();
  loadVictimModel(onReady);
}

// ===== FOSSE VLG — piscine cylindrique optimisée =====
function _buildPoolScene(site){
  const depth=site.depthMax;
  const radius=8;

  // Sol carrelé
  const floor=new THREE.Mesh(
    new THREE.CircleGeometry(radius,32),
    new THREE.MeshLambertMaterial({color:0x1a2535})
  );
  floor.rotation.set(-Math.PI/2,0,0);floor.position.y=-depth;scene.add(floor);

  // Grille sol
  for(let i=-7;i<=7;i++){
    const lmat=new THREE.LineBasicMaterial({color:0x253545,transparent:true,opacity:0.35});
    const lh=new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-radius,0,i),new THREE.Vector3(radius,0,i)]),lmat);
    lh.position.y=-depth+0.02;scene.add(lh);
    const lv=new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i,0,-radius),new THREE.Vector3(i,0,radius)]),lmat);
    lv.position.y=-depth+0.02;scene.add(lv);
  }

  // Paroi cylindrique
  const wall=new THREE.Mesh(
    new THREE.CylinderGeometry(radius,radius,depth+1,32,1,true),
    new THREE.MeshLambertMaterial({color:0x1e2d3e,side:THREE.BackSide})
  );
  wall.position.y=-depth/2;scene.add(wall);

  // LEDs sur paroi — InstancedMesh pour perf (8 colonnes × depth = 160 instances)
  const ledGeo=new THREE.BoxGeometry(0.10,0.07,0.03);
  const ledMat=new THREE.MeshBasicMaterial({color:0x88ccff});
  const ledInst=new THREE.InstancedMesh(ledGeo,ledMat,8*depth);
  const dummy=new THREE.Object3D();
  let idx=0;
  for(let col=0;col<8;col++){
    const angle=col/8*Math.PI*2;
    const wx=Math.cos(angle)*(radius-0.3);
    const wz=Math.sin(angle)*(radius-0.3);
    for(let d=1;d<=depth;d++){
      dummy.position.set(wx,-d,wz);
      dummy.lookAt(0,-d,0);
      dummy.updateMatrix();
      ledInst.setMatrixAt(idx++,dummy.matrix);
    }
  }
  ledInst.instanceMatrix.needsUpdate=true;
  scene.add(ledInst);

  // Seulement 4 PointLights — réparties en croix à mi-profondeur
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2;
    const pl=new THREE.PointLight(0x4488bb,1.2,20);
    pl.position.set(Math.cos(a)*(radius-1),-depth/2,Math.sin(a)*(radius-1));
    scene.add(pl);
  }
  // Lumière centrale
  scene.add(Object.assign(new THREE.PointLight(0x3377cc,0.8,25),{position:{x:0,y:-depth/2,z:0}}));

  // Graduation métrique — lignes horizontales (segments réduits à 16)
  for(let d=1;d<=depth;d++){
    const pts=[];
    for(let s=0;s<=16;s++){
      const a=s/16*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(a)*radius,-d,Math.sin(a)*radius));
    }
    const isMajor=d%5===0;
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:isMajor?0x6699bb:0x2a3d50,transparent:true,opacity:isMajor?0.65:0.25})
    ));
  }

  // Labels métriques sur la paroi (tous les 5m)
  // On utilise des petites BoxGeometry colorées comme marqueurs
  for(let d=5;d<=depth;d+=5){
    const markerMat=new THREE.MeshBasicMaterial({color:0xffcc44});
    const marker=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.05,0.05),markerMat);
    marker.position.set(radius-0.2,-d,0);
    scene.add(marker);
  }

  // Surface
  water=new THREE.Mesh(
    new THREE.CircleGeometry(radius,32),
    new THREE.MeshLambertMaterial({color:0x021c26,transparent:true,opacity:0.6,side:THREE.DoubleSide})
  );
  water.rotation.set(-Math.PI/2,0,0);water.position.y=0.3;scene.add(water);

  console.log('[scene] Fosse VLG construite OK (optimisée)');
}

// ===== SITES NATURELS =====
function _buildNaturalScene(site){
  const maxDepth=Math.min(site.depthMax,42);

  // Sol
  const fg=new THREE.PlaneGeometry(200,200,40,40);
  const fp=fg.attributes.position;
  for(let i=0;i<fp.count;i++)fp.setZ(i,(Math.random()-0.5)*2);
  fg.computeVertexNormals();
  const fl=new THREE.Mesh(fg,new THREE.MeshLambertMaterial({color:site.floorColor}));
  fl.rotation.set(-Math.PI/2,0,0);fl.position.y=-maxDepth-2;scene.add(fl);

  // Rochers
  for(let i=0;i<30;i++){
    const g=new THREE.DodecahedronGeometry(0.3+Math.random()*2,0);
    const r=new THREE.Mesh(g,new THREE.MeshLambertMaterial({
      color:new THREE.Color().setHSL(0.3,0.15,0.06+Math.random()*0.06)
    }));
    r.position.set((Math.random()-0.5)*70,-maxDepth-2+Math.random()*0.5,(Math.random()-0.5)*70);
    r.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,Math.random()*Math.PI);
    scene.add(r);
  }

  // Végétation / coraux
  for(let i=0;i<80;i++){
    const h=0.4+Math.random()*2.5;
    const col=site.coralColors[Math.floor(Math.random()*site.coralColors.length)];
    const m=new THREE.Mesh(
      new THREE.CylinderGeometry(0.03,0.18,h,5),
      new THREE.MeshLambertMaterial({color:col})
    );
    m.position.set((Math.random()-0.5)*60,-maxDepth-2+h/2,(Math.random()-0.5)*60);
    m.rotation.set(0,0,(Math.random()-0.5)*0.3);
    scene.add(m);
  }

  // Particules
  const pg=new THREE.BufferGeometry();
  const pp=new Float32Array(900*3);
  for(let i=0;i<900;i++){
    pp[i*3]=(Math.random()-0.5)*70;
    pp[i*3+1]=-maxDepth-5+Math.random()*(maxDepth+10);
    pp[i*3+2]=(Math.random()-0.5)*70;
  }
  pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
  scene.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0x88bbcc,size:0.055,transparent:true,opacity:0.3})));

  // Surface
  water=new THREE.Mesh(
    new THREE.PlaneGeometry(200,200,8,8),
    new THREE.MeshLambertMaterial({color:site.waterColor,transparent:true,opacity:0.5,side:THREE.DoubleSide})
  );
  water.rotation.set(-Math.PI/2,0,0);water.position.y=0.5;scene.add(water);
}

// ===== BLESSÉ GLB =====
function loadVictimModel(onLoaded){
  if(window.location.protocol==='file:'){
    console.log('[scene] file:// → fallback victim (pas de GLB en local)');
    _setVictimPos();
    buildFallbackVictim();
    if(onLoaded)onLoaded();
    return;
  }
  console.log('[scene] Chargement Swimming.glb...');
  const loader=new THREE.GLTFLoader();
  document.getElementById('loading-bar-wrap').style.display='block';
  loader.load('Swimming.glb',
    gltf=>{
      console.log('[scene] GLB OK — animations:', gltf.animations.length, '— meshes:', gltf.scene.children.length);
      document.getElementById('loading-bar-wrap').style.display='none';
      const model=gltf.scene;
      model.scale.set(0.0106,0.0106,0.0106);
      model.position.copy(VP);
      model.rotation.order='YXZ';
      model.rotation.set(-Math.PI/2, 0, 0);
      console.log('[scene] model rotation après set:', model.rotation.x, model.rotation.y, model.rotation.z);
      model.traverse(child=>{
        if(child.isMesh){
          child.castShadow=false;child.receiveShadow=false;
          if(child.material){
            if(Array.isArray(child.material))child.material.forEach(m=>{if(m.color)m.color.multiplyScalar(0.88);});
            else if(child.material.color)child.material.color.multiplyScalar(0.88);
          }
        }
      });
      scene.add(model);victimModel=model;
      if(gltf.animations&&gltf.animations.length>0){
        victimMixer=new THREE.AnimationMixer(model);
        const action=victimMixer.clipAction(gltf.animations[0]);
        action.timeScale=0;action.play();victimMixer.setTime(0.15);
      }
      const vl=new THREE.PointLight(0x4466aa,0.8,10);vl.position.copy(VP);vl.position.y+=2;scene.add(vl);
      if(onLoaded)onLoaded();
    },
    xhr=>{
      const pct=xhr.total?Math.round(xhr.loaded/xhr.total*100):0;
      document.getElementById('loading-fill').style.width=pct+'%';
      console.log('[scene] GLB loading:', pct+'%');
    },
    err=>{
      console.error('[scene] Erreur GLB:', err);
      document.getElementById('loading-bar-wrap').style.display='none';
      _setVictimPos();
      buildFallbackVictim();
      if(onLoaded)onLoaded();
    }
  );
}

// ===== FALLBACK BLESSÉ — debout, vertical, face vers joueur =====
function buildFallbackVictim(){
  console.log('[scene] buildFallbackVictim');
  const g=new THREE.Group();
  g.position.copy(VP);
  const M=c=>new THREE.MeshLambertMaterial({color:c});
  const mk=(geo,col,px,py,pz,rx,ry,rz)=>{
    const m=new THREE.Mesh(geo,M(col));
    m.position.set(px||0,py||0,pz||0);
    if(rx!=null)m.rotation.set(rx,ry||0,rz||0);
    g.add(m);return m;
  };
  // Debout : Y = vertical, Z- = face au joueur
  // Torse
  mk(new THREE.CylinderGeometry(0.22,0.20,0.85,8),0x0a0a14, 0, 0, 0);
  // Tête (au-dessus du torse)
  mk(new THREE.SphereGeometry(0.20,10,10),0xc8845a, 0, 0.62, 0);
  // Masque (devant la tête, côté Z-)
  const mask=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.22,0.08),M(0x1a1a1a));
  mask.position.set(0,0.62,-0.22);g.add(mask);
  // Bouteille (dans le dos, côté Z+)
  mk(new THREE.CylinderGeometry(0.10,0.10,0.65,8),0x334455, 0, 0.1, 0.28);
  // Bras gauche
  mk(new THREE.CylinderGeometry(0.07,0.06,0.45,7),0x0a0a14, -0.30, 0.15, 0, 0,0,Math.PI/2.2);
  // Bras droit
  mk(new THREE.CylinderGeometry(0.07,0.06,0.45,7),0x0a0a14,  0.30, 0.15, 0, 0,0,-Math.PI/2.2);
  // Jambe gauche
  mk(new THREE.CylinderGeometry(0.09,0.08,0.60,8),0x0a0a14, -0.12,-0.65, 0);
  // Jambe droite
  mk(new THREE.CylinderGeometry(0.09,0.08,0.60,8),0x0a0a14,  0.12,-0.65, 0);
  // Palmes (pieds)
  mk(new THREE.BoxGeometry(0.14,0.08,0.50),0x223322, -0.12,-0.98, 0.12);
  mk(new THREE.BoxGeometry(0.14,0.08,0.50),0x223322,  0.12,-0.98, 0.12);
  // Lumière
  const vl=new THREE.PointLight(0x3366ff,0.7,10);vl.position.set(0,1.0,0);g.add(vl);
  scene.add(g);victimModel=g;
  console.log('[scene] fallback victim créé à VP=',VP.x,VP.y,VP.z);
}

// ===== BRAS FPS =====
function buildArm(){
  console.log('[scene] buildArm start');
  armGroup=new THREE.Group();
  const M=c=>new THREE.MeshLambertMaterial({color:c});

  const mk=(geo,col)=>{
    const m=new THREE.Mesh(geo,M(col));
    return m;
  };

  const leftArm=new THREE.Group();
  const faL=mk(new THREE.CylinderGeometry(0.055,0.065,0.45,8),0x0a1520);
  faL.rotation.set(Math.PI/2,0,0);faL.position.set(0,0,0.22);leftArm.add(faL);
  const cuL=mk(new THREE.CylinderGeometry(0.068,0.068,0.09,8),0x081018);
  cuL.rotation.set(Math.PI/2,0,0);cuL.position.set(0,0,0.02);leftArm.add(cuL);
  const wb=mk(new THREE.CylinderGeometry(0.050,0.050,0.020,20),0x181818);
  wb.rotation.set(Math.PI/2,0,0);wb.position.set(0,0.072,0.03);leftArm.add(wb);
  const wg=mk(new THREE.CylinderGeometry(0.043,0.043,0.003,20),0x001a1a);
  wg.rotation.set(Math.PI/2,0,0);wg.position.set(0,0.072,0.018);leftArm.add(wg);
  const sb=mk(new THREE.BoxGeometry(0.018,0.050,0.085),0x060606);
  sb.position.set(0,0.072,0.075);leftArm.add(sb);
  // Ordi de plongée sur bras gauche (boîtier + écran)
  const computer=new THREE.Group();
  const body=mk(new THREE.BoxGeometry(0.10,0.055,0.016),0x111820);
  body.rotation.set(Math.PI/2,0,0);computer.add(body);
  const screen=mk(new THREE.BoxGeometry(0.082,0.038,0.002),0x001a14);
  screen.rotation.set(Math.PI/2,0,0);screen.position.set(0,0,-0.009);computer.add(screen);
  // Petit reflet écran
  const glow=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.025,0.001),
    new THREE.MeshBasicMaterial({color:0x00cc88,transparent:true,opacity:0.6}));
  glow.rotation.set(Math.PI/2,0,0);glow.position.set(0,0,-0.011);computer.add(glow);
  computer.position.set(0,0.072,-0.04);
  leftArm.add(computer);

  leftArm.position.set(-0.18,-0.22,0);
  leftArm.rotation.set(0,0,0.1);
  armGroup.add(leftArm);

  const rightArm=new THREE.Group();
  const faR=mk(new THREE.CylinderGeometry(0.055,0.065,0.45,8),0x0a1520);
  faR.rotation.set(Math.PI/2,0,0);faR.position.set(0,0,0.22);rightArm.add(faR);
  const cuR=mk(new THREE.CylinderGeometry(0.068,0.068,0.09,8),0x081018);
  cuR.rotation.set(Math.PI/2,0,0);cuR.position.set(0,0,0.02);rightArm.add(cuR);
  rightArm.position.set(0.28,-0.22,0);
  rightArm.rotation.set(0,0,-0.15);
  armGroup.add(rightArm);

  scene.add(armGroup);
  console.log('[scene] buildArm OK');
}

function updateArmPosition(gameTime){
  if(!armGroup)return;
  const off=new THREE.Vector3(0,-0.18,0.48);
  off.applyQuaternion(camera.quaternion);
  armGroup.position.copy(camera.position).add(off);
  armGroup.quaternion.copy(camera.quaternion);
  armGroup.position.y+=Math.sin(gameTime*1.6)*0.012;
  armGroup.rotation.z=Math.sin(gameTime*0.8)*0.015;
}

// ===== BLESSÉ ANIMATION =====
function updateVictim(dt,gameTime){
  if(victimMixer)victimMixer.update(dt);
  if(!victimModel)return;

  const cam=window._camera;

  if(!G.rescued){
    // Flotte sur place, agite légèrement (signe ça va pas)
    victimModel.position.y=VP.y+Math.sin(gameTime*0.3)*0.05;
    // Debout, face vers joueur (Z-)
    const toPlayer=cam.position.clone().sub(victimModel.position);
    const angleY=Math.atan2(toPlayer.x, toPlayer.z);
    victimModel.rotation.set(
      Math.sin(gameTime*2.0)*0.08, // tête qui secoue ça va pas
      angleY,
      Math.sin(gameTime*1.5)*0.06
    );
  } else {
    // Pris en charge : caméra sur sa tête = blessé 1.8m devant, même hauteur Y
    // On vise sa tête : position group = bas du corps, tête = +0.62m
    // Pour que la caméra soit "sur sa tête" → placer group tel que tête = cam.pos + 1.8m fwd
    const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion);
    fwd.y=0; fwd.normalize();

    // Centre du group = 1.8m devant, décalé vers le bas de 0.62m (hauteur tête dans group)
    const targetPos=cam.position.clone()
      .addScaledVector(fwd, 1.8)
      .add(new THREE.Vector3(0,-0.6,0));

    victimModel.position.lerp(targetPos, 0.08);

    // Debout, face au joueur
    const toPlayer=cam.position.clone().sub(victimModel.position);
    const angleY=Math.atan2(toPlayer.x, toPlayer.z);
    victimModel.rotation.set(
      Math.sin(gameTime*0.25)*0.03,
      angleY,
      Math.sin(gameTime*0.3)*0.04
    );
  }

  if(victimModel.userData&&victimModel.userData.equipment){
    const eq=victimModel.userData.equipment;
    eq.position.copy(victimModel.position);
    eq.rotation.copy(victimModel.rotation);
  }
}

function nearVictim(){
  if(!victimModel)return false;
  const vw=new THREE.Vector3();victimModel.getWorldPosition(vw);
  return camera.position.distanceTo(vw)<4.5;
}

// ===== BULLES =====
function spawnBubble(pos,isVictim){
  const g=new THREE.SphereGeometry(isVictim?0.012+Math.random()*0.02:0.02+Math.random()*0.03,5,5);
  const b=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0xaaddff,transparent:true,opacity:isVictim?0.45:0.35}));
  if(pos){b.position.copy(pos);b.position.x+=(Math.random()-0.5)*0.08;b.position.z+=(Math.random()-0.5)*0.08;}
  else{b.position.copy(camera.position);b.position.x+=(Math.random()-0.5)*0.25;b.position.z+=(Math.random()-0.5)*0.25;b.position.y-=0.1;}
  b.userData={vy:(isVictim?0.20:0.35)+Math.random()*0.2,vx:(Math.random()-0.5)*0.04,vz:(Math.random()-0.5)*0.04,life:0};
  scene.add(b);bubbles3D.push(b);
}

function spawnVictimBubbles(){
  if(!victimModel)return;
  // Bulles depuis la tête/masque du blessé (position group + offset tête)
  const headPos=victimModel.position.clone().add(new THREE.Vector3(0,0.62,0));
  const count=G.rescued?4+Math.floor(Math.random()*4):2+Math.floor(Math.random()*3);
  for(let i=0;i<count;i++){
    setTimeout(()=>spawnBubble(headPos,true),i*80);
  }
}

function updateBubbles(dt){
  for(let i=bubbles3D.length-1;i>=0;i--){
    const b=bubbles3D[i];b.userData.life+=dt;
    b.position.y+=b.userData.vy*dt;b.position.x+=b.userData.vx*dt;b.position.z+=b.userData.vz*dt;
    b.material.opacity=Math.max(0,0.4-b.userData.life*0.14);
    if(b.userData.life>3||b.position.y>0.5){scene.remove(b);bubbles3D.splice(i,1);}
  }
}

// ===== SCENE ANIMATE =====
function sceneAnimate(dt,gameTime){
  if(caustic){
    caustic.intensity=0.4+Math.sin(gameTime*1.9)*0.14;
    caustic.position.x=Math.sin(gameTime*0.4)*4;
    caustic.position.z=Math.cos(gameTime*0.35)*4;
  }
  if(water)water.position.y=0.4+Math.sin(gameTime*0.6)*0.07;
  updateVictim(dt,gameTime);
  updateArmPosition(gameTime);
  G.bubbleTimer+=dt;
  if(G.bubbleTimer>0.20){G.bubbleTimer=0;spawnBubble(null,false);}
  G.victimBubbleTimer+=dt;
  const victimBubbleRate=G.rescued?1.2:2.0; // plus fréquent si pris en charge
  if(G.victimBubbleTimer>victimBubbleRate+Math.random()){
    G.victimBubbleTimer=0;spawnVictimBubbles();
  }
  updateBubbles(dt);
  renderer.render(scene,camera);
}

window.addEventListener('resize',()=>{
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});