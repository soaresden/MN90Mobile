// scene.js — Three.js scene, blessé, bras FPS, bulles
'use strict';

const W=window.innerWidth,H=window.innerHeight;
const canvas3d=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas:canvas3d,antialias:true});
renderer.setSize(W,H);renderer.setPixelRatio(Math.min(devicePixelRatio,2));

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(85,W/H,0.05,300);
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

  if(G.selectedSiteKey==='vlg'||G.selectedSiteKey==='nemo'){
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

// ===== FOSSE (VLG + NEMO 33) — piscine cylindrique =====
function _buildPoolScene(site){
  const isNemo=G.selectedSiteKey==='nemo';
  const depth=site.depthMax; // VLG=20, Nemo=33
  const radius=isNemo?5:8;   // Nemo plus étroit

  // Couleurs
  const wallCol=isNemo?0x0a2530:0x1e2d3e;
  const floorCol=isNemo?0x082028:0x1a2535;
  const ledCol=isNemo?0x44ddcc:0x88ccff;
  const lightCol=isNemo?0x00bbaa:0x3377cc;
  const gridCol=isNemo?0x0d3040:0x253545;

  // Sol avec grille
  const floor=new THREE.Mesh(
    new THREE.CircleGeometry(radius,32),
    new THREE.MeshLambertMaterial({color:floorCol})
  );
  floor.rotation.set(-Math.PI/2,0,0);floor.position.y=-depth;scene.add(floor);

  // Grille sol
  const step=isNemo?1.25:1;
  for(let i=Math.ceil(-radius);i<=Math.floor(radius);i++){
    const lmat=new THREE.LineBasicMaterial({color:gridCol,transparent:true,opacity:0.4});
    const lh=new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-radius,0,i*step),new THREE.Vector3(radius,0,i*step)]),lmat);
    lh.position.y=-depth+0.02;scene.add(lh);
    const lv=new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i*step,0,-radius),new THREE.Vector3(i*step,0,radius)]),lmat);
    lv.position.y=-depth+0.02;scene.add(lv);
  }

  // Paroi cylindrique
  const wall=new THREE.Mesh(
    new THREE.CylinderGeometry(radius,radius,depth+1,32,1,true),
    new THREE.MeshLambertMaterial({color:wallCol,side:THREE.BackSide})
  );
  wall.position.y=-depth/2;scene.add(wall);

  // LEDs verticales (InstancedMesh)
  const cols=isNemo?6:8;
  const ledGeo=new THREE.BoxGeometry(0.10,0.07,0.03);
  const ledMat=new THREE.MeshBasicMaterial({color:ledCol});
  const ledInst=new THREE.InstancedMesh(ledGeo,ledMat,cols*depth);
  const dummy=new THREE.Object3D();
  let idx=0;
  for(let col=0;col<cols;col++){
    const angle=col/cols*Math.PI*2;
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

  // Lumières
  for(let i=0;i<4;i++){
    const a=i/4*Math.PI*2;
    const pl=new THREE.PointLight(lightCol,1.2,20);
    pl.position.set(Math.cos(a)*(radius-1),-depth/2,Math.sin(a)*(radius-1));
    scene.add(pl);
  }
  const centralLight=new THREE.PointLight(lightCol,1.0,28);
  centralLight.position.set(0,-depth/2,0);scene.add(centralLight);
  const botLight=new THREE.PointLight(lightCol,0.6,15);
  botLight.position.set(0,-depth+1,0);scene.add(botLight);
  const topLight=new THREE.PointLight(lightCol,0.8,12);
  topLight.position.set(0,-2,0);scene.add(topLight);

  // Graduation métrique
  // Nemo : tous les 5m de 0 à 30, + label 33m au fond
  // VLG : toutes les 1m
  const majStep=isNemo?5:5;
  const minStep=isNemo?5:1;
  for(let d=minStep;d<=depth;d+=minStep){
    const pts=[];
    for(let s=0;s<=16;s++){
      const a=s/16*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(a)*radius,-d,Math.sin(a)*radius));
    }
    const isMajor=d%majStep===0;
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:isMajor?0x6699bb:0x2a3d50,transparent:true,opacity:isMajor?0.65:0.25})
    ));
    // Marqueurs de profondeur tous les 5m sur la paroi
    if(isMajor){
      const markerCol=isNemo?0x44ddcc:0xffcc44;
      const marker=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.05,0.05),
        new THREE.MeshBasicMaterial({color:markerCol}));
      marker.position.set(radius-0.2,-d,0);
      scene.add(marker);
      // Deuxième marqueur à 90°
      const marker2=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.05,0.05),
        new THREE.MeshBasicMaterial({color:markerCol}));
      marker2.position.set(0,-d,radius-0.2);
      scene.add(marker2);
    }
  }
  // Ligne fond (33m pour Nemo)
  if(isNemo){
    const ptsBot=[];
    for(let s=0;s<=16;s++){
      const a=s/16*Math.PI*2;
      ptsBot.push(new THREE.Vector3(Math.cos(a)*radius,-depth,Math.sin(a)*radius));
    }
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ptsBot),
      new THREE.LineBasicMaterial({color:0x44ddcc,transparent:true,opacity:0.8})
    ));
    // Marqueur 33m
    const mBot=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.05,0.05),
      new THREE.MeshBasicMaterial({color:0xff4444}));
    mBot.position.set(radius-0.2,-depth,0);scene.add(mBot);
  }

  // Surface
  water=new THREE.Mesh(
    new THREE.CircleGeometry(radius,32),
    new THREE.MeshLambertMaterial({color:site.waterColor,transparent:true,opacity:0.6,side:THREE.DoubleSide})
  );
  water.rotation.set(-Math.PI/2,0,0);water.position.y=0.3;scene.add(water);

  console.log('[scene]',isNemo?'Nemo 33':'Fosse VLG','construite — r='+radius+' depth='+depth);
}

// ===== CHARGEMENT ANIMAUX GLB =====
let _catfishMixer=null;

function _loadCatfish(maxDepth){
  const loader=new THREE.GLTFLoader();
  console.log('[scene] Chargement catfish.glb...');
  loader.load('catfish.glb',
    gltf=>{
      console.log('[scene] catfish.glb OK');
      const model=gltf.scene;
      model.scale.set(0.8,0.8,0.8);
      model.position.set(12,-maxDepth+3,0);
      scene.add(model);
      _silure=model;
      _silureAngle=0;
      if(gltf.animations&&gltf.animations.length>0){
        _catfishMixer=new THREE.AnimationMixer(model);
        _catfishMixer.clipAction(gltf.animations[0]).play();
      }
    },
    null,
    ()=>{ console.warn('[scene] catfish.glb non trouvé — fallback silure'); _buildFallbackSilure(maxDepth); }
  );
}

function _buildFallbackSilure(maxDepth){
  const sg=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.35,3.2,8),new THREE.MeshLambertMaterial({color:0x3a3020}));
  body.rotation.z=Math.PI/2; sg.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.38,8,6),new THREE.MeshLambertMaterial({color:0x2e2618}));
  head.position.set(1.8,0,0); sg.add(head);
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.15,1.4,5),new THREE.MeshLambertMaterial({color:0x2a2214}));
  tail.rotation.z=Math.PI/2; tail.position.set(-2.1,0,0); sg.add(tail);
  for(let b=0;b<2;b++){
    const barb=new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.01,0.8,4),new THREE.MeshLambertMaterial({color:0x1a1008}));
    barb.position.set(1.5,0,b===0?0.35:-0.35); barb.rotation.z=0.4*(b===0?1:-1); sg.add(barb);
  }
  sg.position.set(12,-maxDepth+3,0);
  scene.add(sg); _silure=sg; _silureAngle=0;
}

let _fishMixers=[];

function _loadFishPack(maxDepth,site){
  const loader=new THREE.GLTFLoader();
  console.log('[scene] Chargement 250_fish_pack.glb...');
  loader.load('250_fish_pack.glb',
    gltf=>{
      console.log('[scene] 250_fish_pack.glb OK — meshes:',gltf.scene.children.length);
      _fishMixers=[];
      // Créer 5 bancs à partir du modèle
      for(let b=0;b<5;b++){
        const grp=new THREE.Group();
        const count=6+Math.floor(Math.random()*5);
        for(let f=0;f<count;f++){
          const clone=gltf.scene.clone(true);
          clone.scale.set(0.3,0.3,0.3);
          clone.position.set((Math.random()-0.5)*3,(Math.random()-0.5)*1.5,(Math.random()-0.5)*3);
          grp.add(clone);
          // Animation
          if(gltf.animations&&gltf.animations.length>0){
            const mx=new THREE.AnimationMixer(clone);
            mx.clipAction(gltf.animations[0]).play();
            // Offset aléatoire pour désynchroniser
            mx.setTime(Math.random()*2);
            _fishMixers.push(mx);
          }
        }
        const startY=-(5+Math.random()*(maxDepth-8));
        grp.position.set((Math.random()-0.5)*20,startY,(Math.random()-0.5)*20);
        scene.add(grp);
        _fish.push({group:grp,speed:0.3+Math.random()*0.3,radius:6+Math.random()*8,angle:Math.random()*Math.PI*2,y:startY,wobble:Math.random()*Math.PI*2});
      }
    },
    null,
    ()=>{ console.warn('[scene] 250_fish_pack.glb non trouvé — fallback'); _buildFallbackFish(maxDepth,site); }
  );
}

function _buildFallbackFish(maxDepth,site){
  for(let b=0;b<5;b++){
    const grp=new THREE.Group();
    const count=8+Math.floor(Math.random()*6);
    const col=new THREE.Color().setHSL(Math.random(),0.8,0.55);
    for(let f=0;f<count;f++){
      const fish=new THREE.Group();
      const fc=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.25,5),new THREE.MeshLambertMaterial({color:col}));
      fc.rotation.z=Math.PI/2; fish.add(fc);
      const fq=new THREE.Mesh(new THREE.ConeGeometry(0.06,0.1,4),new THREE.MeshLambertMaterial({color:col}));
      fq.rotation.z=-Math.PI/2; fq.position.set(-0.16,0,0); fish.add(fq);
      fish.position.set((Math.random()-0.5)*2,(Math.random()-0.5)*1,(Math.random()-0.5)*2);
      grp.add(fish);
    }
    const startY=-(5+Math.random()*(maxDepth-8));
    grp.position.set((Math.random()-0.5)*20,startY,(Math.random()-0.5)*20);
    scene.add(grp);
    _fish.push({group:grp,speed:0.4+Math.random()*0.3,radius:6+Math.random()*6,angle:Math.random()*Math.PI*2,y:startY,wobble:Math.random()*Math.PI*2});
  }
}
// Stockage animaux pour updateScene
const _fish=[];  // [{group, speed, radius, angle, y}]
let _silure=null;
let _silureAngle=0;

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

  // Végétation / coraux — selon site
  const siteKey=Object.keys(SITES).find(k=>SITES[k]===site)||'roussay';
  _buildSiteVegetation(site,siteKey,maxDepth);

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

function _buildSiteVegetation(site,siteKey,maxDepth){
  _fish.length=0; _silure=null; _fishMixers=[]; _catfishMixer=null;

  if(siteKey==='roussay'){
    // Algues longues et sombres (eau douce trouble)
    for(let i=0;i<120;i++){
      const h=0.8+Math.random()*3.5;
      const cols=[0x1a4010,0x254a15,0x1e3a0c,0x2d5218];
      const col=cols[Math.floor(Math.random()*cols.length)];
      const m=new THREE.Mesh(
        new THREE.CylinderGeometry(0.02,0.12,h,4),
        new THREE.MeshLambertMaterial({color:col})
      );
      m.position.set((Math.random()-0.5)*60,-maxDepth-2+h/2,(Math.random()-0.5)*60);
      m.rotation.set(0,Math.random()*Math.PI,(Math.random()-0.5)*0.5);
      scene.add(m);
    }
    // Silure — grande forme allongée gris-brun
    const sg=new THREE.Group();
    // Corps
    const body=new THREE.Mesh(
      new THREE.CylinderGeometry(0.18,0.35,3.2,8),
      new THREE.MeshLambertMaterial({color:0x3a3020})
    );
    body.rotation.z=Math.PI/2; sg.add(body);
    // Tête bulbeuse
    const head=new THREE.Mesh(
      new THREE.SphereGeometry(0.38,8,6),
      new THREE.MeshLambertMaterial({color:0x2e2618})
    );
    head.position.set(1.8,0,0); sg.add(head);
    // Queue
    const tail=new THREE.Mesh(
      new THREE.CylinderGeometry(0.02,0.15,1.4,5),
      new THREE.MeshLambertMaterial({color:0x2a2214})
    );
    tail.rotation.z=Math.PI/2; tail.position.set(-2.1,0,0); sg.add(tail);
    // Barbillons
    for(let b=0;b<2;b++){
      const barb=new THREE.Mesh(
        new THREE.CylinderGeometry(0.015,0.01,0.8,4),
        new THREE.MeshLambertMaterial({color:0x1a1008})
      );
      barb.position.set(1.5,0,b===0?0.35:-0.35);
      barb.rotation.z=0.4*(b===0?1:-1);
      sg.add(barb);
    }
    // Silure — charger catfish.glb si dispo, sinon fallback primitif
    _loadCatfish(maxDepth);

  } else if(siteKey==='martinique'){
    // Coraux colorés denses
    for(let i=0;i<100;i++){
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
    // Poissons — charger 250_fish_pack.glb si dispo, sinon fallback primitifs
    _loadFishPack(maxDepth,site);

  } else if(siteKey==='nemo'){
    // Nemo 33 : rochers blancs calcaires + éponges
    for(let i=0;i<40;i++){
      const g=new THREE.DodecahedronGeometry(0.2+Math.random()*1.5,0);
      const r=new THREE.Mesh(g,new THREE.MeshLambertMaterial({
        color:new THREE.Color().setHSL(0.55,0.1,0.3+Math.random()*0.2)
      }));
      r.position.set((Math.random()-0.5)*50,-maxDepth-2+Math.random()*0.8,(Math.random()-0.5)*50);
      r.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,0);
      scene.add(r);
    }
    // Éponges turquoise
    for(let i=0;i<60;i++){
      const h=0.3+Math.random()*1.2;
      const m=new THREE.Mesh(
        new THREE.CylinderGeometry(0.05+Math.random()*0.15,0.08+Math.random()*0.12,h,6),
        new THREE.MeshLambertMaterial({color:new THREE.Color().setHSL(0.52,0.7,0.25+Math.random()*0.15)})
      );
      m.position.set((Math.random()-0.5)*50,-maxDepth-2+h/2,(Math.random()-0.5)*50);
      scene.add(m);
    }

  } else {
    // Site générique
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
  }
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

  // Mixers animations GLB
  if(_catfishMixer)_catfishMixer.update(dt);
  for(const mx of _fishMixers)mx.update(dt);

  // Animation poissons Martinique
  for(const f of _fish){
    f.angle+=f.speed*dt;
    f.wobble=(f.wobble||0)+dt*1.2;
    f.group.position.x=Math.cos(f.angle)*f.radius;
    f.group.position.z=Math.sin(f.angle)*f.radius;
    f.group.position.y=f.y+Math.sin(f.wobble)*0.8;
    f.group.rotation.y=-f.angle+Math.PI/2;
  }

  // Animation silure Roussay
  if(_silure){
    _silureAngle+=0.08*dt;
    const sr=12;
    _silure.position.x=Math.cos(_silureAngle)*sr;
    _silure.position.z=Math.sin(_silureAngle)*sr;
    _silure.rotation.y=-_silureAngle+Math.PI/2;
    // Ondulation légère
    _silure.rotation.z=Math.sin(gameTime*0.8)*0.06;
  }

  G.bubbleTimer+=dt;
  if(G.bubbleTimer>0.20){G.bubbleTimer=0;spawnBubble(null,false);}
  G.victimBubbleTimer+=dt;
  const victimBubbleRate=G.rescued?1.2:2.0;
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