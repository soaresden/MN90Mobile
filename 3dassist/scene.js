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
let fenetreSnell=null;
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
  _animaux.length=0;_silure=null;_catfishMixer=null;
  console.log('[scene] buildScene site:', site.name);

  renderer.setClearColor(site.fogColor);
  scene.fog=new THREE.FogExp2(site.fogColor,site.fogDensity);
  ambient=new THREE.AmbientLight(site.ambientColor,site.ambientInt);scene.add(ambient);
  window._ambient=ambient;
  const sun=new THREE.DirectionalLight(site.sunColor,site.sunInt);sun.position.set(5,20,3);scene.add(sun);
  window._sun=sun;fenetreSnell=null;
  caustic=new THREE.PointLight(site.causticColor,0.5,30);caustic.position.set(0,-5,0);scene.add(caustic);

  if(G.selectedSiteKey==='vlg'||G.selectedSiteKey==='nemo'){
    _buildPoolScene(site);
  } else {
    _buildNaturalScene(site);
    // Pas de rocher ni de corail dans la tête : on dégage 5 m autour de moi et du blessé
    const prof=-G.selectedDepth;
    scene.children.slice().forEach(o=>{
      if(!o.isMesh||!o.geometry||o.geometry.type==='PlaneGeometry')return;
      const dx=o.position.x,dz=o.position.z-5;
      if(o.position.y<prof+1&&o.position.y>prof-4&&dx*dx+dz*dz<25)scene.remove(o);
    });
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
  _surfaceEau(new THREE.CircleGeometry(radius,32),site);

  console.log('[scene]',isNemo?'Nemo 33':'Fosse VLG','construite — r='+radius+' depth='+depth);
}

// ===== LA SURFACE, VUE D'EN DESSOUS =====
// Hors d'un cône de 97° au-dessus de soi, la lumière du ciel ne passe pas
// (réflexion totale) : la surface y fait miroir et paraît sombre. Dans le
// cône, la « fenêtre de Snell » : un disque lumineux, centré au-dessus du
// plongeur, de rayon profondeur × tan(48,6°).
function _surfaceEau(geo,site){
  water=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:site.waterColor,transparent:true,opacity:0.88,side:THREE.DoubleSide}));
  water.rotation.set(-Math.PI/2,0,0);water.position.y=0.4;scene.add(water);
  const c=document.createElement('canvas');c.width=c.height=256;
  const x=c.getContext('2d');
  const g=x.createRadialGradient(128,128,0,128,128,128);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(0.6,'rgba(225,245,255,0.95)');
  g.addColorStop(0.88,'rgba(160,215,245,0.75)');
  g.addColorStop(0.97,'rgba(120,190,235,0.35)');
  g.addColorStop(1,'rgba(120,190,235,0)');
  x.fillStyle=g;x.fillRect(0,0,256,256);
  // Le soleil, un peu décentré, et quelques rides de la surface
  const s=x.createRadialGradient(160,100,0,160,100,34);
  s.addColorStop(0,'rgba(255,255,240,1)');s.addColorStop(1,'rgba(255,255,240,0)');
  x.fillStyle=s;x.fillRect(0,0,256,256);
  x.strokeStyle='rgba(255,255,255,0.25)';x.lineWidth=2;
  for(let i=0;i<26;i++){const a=Math.random()*Math.PI*2,r=Math.random()*100;x.beginPath();x.arc(128+Math.cos(a)*r,128+Math.sin(a)*r,4+Math.random()*10,0,Math.PI*(0.6+Math.random()));x.stroke();}
  fenetreSnell=new THREE.Mesh(new THREE.CircleGeometry(1,48),
    new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  fenetreSnell.rotation.set(-Math.PI/2,0,0);fenetreSnell.renderOrder=2;scene.add(fenetreSnell);
  window._fenetreSnell=fenetreSnell;
  // La surface est la chose la plus claire sous l'eau : le voile de l'eau ne l'efface pas
  water.material.fog=false;fenetreSnell.material.fog=false;
  window._water=water;
  // Les rayons de soleil qui descendent de la surface (sites naturels)
  _rayons.length=0;
  if(G.selectedSiteKey!=='vlg'&&G.selectedSiteKey!=='nemo'){
    for(let i=0;i<7;i++){
      const h=14+Math.random()*10;
      const m=new THREE.Mesh(new THREE.CylinderGeometry(0.4+Math.random()*0.6,1.6+Math.random()*1.8,h,14,1,true),
        new THREE.MeshBasicMaterial({color:0xbfe6ff,transparent:true,opacity:0.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
      m.userData={dx:(Math.random()-0.5)*18,dz:(Math.random()-0.5)*18,h,ph:Math.random()*6.3,op:0.035+Math.random()*0.04};
      m.rotation.z=0.12;m.rotation.x=0.05;
      scene.add(m);_rayons.push(m);
    }
  }
}
const _rayons=[];

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
      model.position.set(12,-maxDepth-0.9,0);
      _silureY=-maxDepth-0.9;
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
  sg.position.set(12,-maxDepth-0.9,0);_silureY=-maxDepth-0.9;
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
let _silureAngle=0,_silureY=0;

function _buildNaturalScene(site){
  // Le fond est 1,6 m sous la profondeur choisie : le blessé et moi sommes
  // près du fond (avant, il était toujours à 42-44 m, on flottait en pleine eau).
  const maxDepth=Math.max(4,G.selectedDepth-0.4);

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
  _surfaceEau(new THREE.PlaneGeometry(200,200,8,8),site);

  // Bateaux en surface
  _buildBoats(siteKey);
}

function _buildBoats(siteKey){
  const mk=(geo,col)=>new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:col}));
  const positions=siteKey==='martinique'
    ? [{x:25,z:-30},{x:-20,z:35},{x:40,z:10}]
    : [{x:20,z:-25},{x:-15,z:30}]; // roussay moins de bateaux

  positions.forEach(({x,z})=>{
    const boat=new THREE.Group();
    // Coque
    const hull=mk(new THREE.BoxGeometry(6,1.2,2.2),siteKey==='martinique'?0x8b4513:0x5a3010);
    hull.position.y=0.6; boat.add(hull);
    // Pont
    const deck=mk(new THREE.BoxGeometry(5.5,0.15,2),0xc8a878);
    deck.position.y=1.28; boat.add(deck);
    // Cabine
    const cabin=mk(new THREE.BoxGeometry(2,1.2,1.8),0xddccaa);
    cabin.position.set(0.5,2.0,0); boat.add(cabin);
    // Fenêtres cabine
    for(let w=0;w<2;w++){
      const win=mk(new THREE.BoxGeometry(0.4,0.3,0.05),0x88ccff);
      win.position.set(0.3+w*0.8,2.1,0.93); boat.add(win);
    }
    // Mât
    const mast=mk(new THREE.CylinderGeometry(0.04,0.04,3,6),0x8b7355);
    mast.position.set(-1.5,2.8,0); boat.add(mast);
    // Bouée côté
    const buoy=mk(new THREE.TorusGeometry(0.25,0.08,6,8),0xff4400);
    buoy.rotation.z=Math.PI/2; buoy.position.set(3.1,0.8,0.8); boat.add(buoy);

    boat.position.set(x,0.5,z);
    boat.rotation.y=Math.random()*Math.PI*2;
    scene.add(boat);
  });
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
    // La vie du lac : perches, gardons, un brochet
    _vieLac(maxDepth);

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
    // La vie du récif : bancs de poissons, une tortue, une raie aigle
    _vieRecif(maxDepth);

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

// ===== LA VIE DANS L'EAU (dessinée : légère, pas de gros modèles) =====
const _animaux=[];   // {update(dt,t)}
const _mat={};
const _m=c=>_mat[c]||(_mat[c]=new THREE.MeshLambertMaterial({color:c}));
const _geo={sphere:new THREE.SphereGeometry(0.5,10,8),cone:new THREE.ConeGeometry(0.5,1,4),oeil:new THREE.SphereGeometry(0.5,6,4)};

/**
 * Un poisson, tête vers +x : corps ovale, rayures, queue qui bat, nageoire dorsale.
 * o = {L longueur, h hauteur, w épaisseur (en fraction de L), corps, ventre, rayures:{n,c}, nageoires}
 */
function _poisson(o){
  const g=new THREE.Group(),L=o.L;
  const corps=new THREE.Mesh(_geo.sphere,_m(o.corps));corps.scale.set(L,L*o.h,L*o.w);g.add(corps);
  if(o.ventre){const v=new THREE.Mesh(_geo.sphere,_m(o.ventre));v.scale.set(L*0.9,L*o.h*0.6,L*o.w*0.95);v.position.y=-L*o.h*0.18;g.add(v);}
  if(o.rayures)for(let i=0;i<o.rayures.n;i++){
    const r=new THREE.Mesh(_geo.sphere,_m(o.rayures.c));
    r.scale.set(L*0.07,L*o.h*0.97,L*o.w*1.04);
    r.position.x=L*(0.22-i*0.44/Math.max(1,o.rayures.n-1));g.add(r);
  }
  const pivot=new THREE.Group();pivot.position.x=-L*0.45;g.add(pivot);
  const q=new THREE.Mesh(_geo.cone,_m(o.nageoires||o.corps));
  q.rotation.z=Math.PI/2;q.scale.set(L*o.h*0.9,L*0.35,L*0.06);q.position.x=-L*0.16;pivot.add(q);
  const d=new THREE.Mesh(_geo.cone,_m(o.nageoires||o.corps));
  d.scale.set(L*0.35,L*o.h*0.45,L*0.04);d.position.set(-L*0.05,L*o.h*0.5,0);g.add(d);
  for(const z of [1,-1]){const e=new THREE.Mesh(_geo.oeil,_m(0x0b0b0b));e.scale.setScalar(L*0.07);e.position.set(L*0.36,L*o.h*0.1,z*L*o.w*0.42);g.add(e);}
  g.userData.queue=pivot;
  return g;
}

/** Un banc : les poissons tournent ensemble autour d'un point, à leur hauteur. */
function _banc(espece,n,cx,cz,y,rayon,vitesse){
  const grp=new THREE.Group(),membres=[];
  for(let i=0;i<n;i++){
    const f=_poisson(espece);
    f.position.set((Math.random()-0.5)*1.6,(Math.random()-0.5)*0.9,(Math.random()-0.5)*1.6);
    grp.add(f);membres.push({f,ph:Math.random()*6.3,b:f.position.clone()});
  }
  scene.add(grp);
  let a=Math.random()*Math.PI*2;
  _animaux.push({update(dt,t){
    a+=vitesse*dt/rayon;
    grp.position.set(cx+Math.cos(a)*rayon,y+Math.sin(t*0.3+cx)*0.6,cz+Math.sin(a)*rayon);
    grp.rotation.y=-a-Math.PI/2;           // nez dans le sens de la nage
    for(const m of membres){
      m.f.userData.queue.rotation.y=Math.sin(t*9+m.ph)*0.45;
      m.f.position.y=m.b.y+Math.sin(t*1.3+m.ph)*0.12;
      m.f.position.z=m.b.z+Math.sin(t*0.9+m.ph)*0.15;
    }
  }});
}

/** Une tortue verte qui croise lentement. */
function _tortue(y,rayon){
  const g=new THREE.Group();
  const carap=new THREE.Mesh(_geo.sphere,_m(0x5b5a2a));carap.scale.set(1.0,0.32,0.8);g.add(carap);
  for(let i=0;i<5;i++){const p=new THREE.Mesh(_geo.sphere,_m(0x3f3d1c));p.scale.set(0.24,0.06,0.2);p.position.set(0.3-i*0.15,0.15,(i%2?0.12:-0.12));g.add(p);}
  const plastron=new THREE.Mesh(_geo.sphere,_m(0xc9b27a));plastron.scale.set(0.9,0.18,0.7);plastron.position.y=-0.06;g.add(plastron);
  const tete=new THREE.Mesh(_geo.sphere,_m(0x6d6a3e));tete.scale.set(0.3,0.2,0.22);tete.position.set(0.62,0.02,0);g.add(tete);
  const pattes=[];
  for(const [x,z,l] of [[0.25,0.38,0.62],[0.25,-0.38,0.62],[-0.38,0.3,0.3],[-0.38,-0.3,0.3]]){
    const pv=new THREE.Group();pv.position.set(x,0,z*0.9);
    const pa=new THREE.Mesh(_geo.sphere,_m(0x6d6a3e));pa.scale.set(l*0.45,0.05,l);pa.position.z=Math.sign(z)*l*0.45;pv.add(pa);
    g.add(pv);pattes.push({pv,s:Math.sign(z),avant:x>0});
  }
  scene.add(g);
  let a=Math.random()*6.3;
  _animaux.push({update(dt,t){
    a+=0.35*dt/rayon;
    g.position.set(Math.cos(a)*rayon,y+Math.sin(t*0.25)*0.5,5+Math.sin(a)*rayon);
    g.rotation.y=-a-Math.PI/2;
    for(const p of pattes)p.pv.rotation.x=p.s*Math.sin(t*1.4+(p.avant?0:1.2))*(p.avant?0.5:0.25);
  }});
}

/** Une raie aigle : des ailes qui ondulent, une longue queue. */
function _raie(y,rayon){
  const g=new THREE.Group();
  const corps=new THREE.Mesh(_geo.sphere,_m(0x1f2a36));corps.scale.set(0.9,0.14,0.45);g.add(corps);
  const ailes=[];
  for(const z of [1,-1]){
    const pv=new THREE.Group();pv.position.z=z*0.18;
    const ai=new THREE.Mesh(_geo.cone,_m(0x1f2a36));ai.rotation.x=z*Math.PI/2;ai.scale.set(0.55,1.1,0.05);ai.position.z=z*0.55;pv.add(ai);
    for(let i=0;i<4;i++){const t=new THREE.Mesh(_geo.oeil,_m(0xe8e8e0));t.scale.setScalar(0.06);t.position.set(0.15-Math.random()*0.4,0.04,z*(0.25+Math.random()*0.6));pv.add(t);}
    g.add(pv);ailes.push({pv,z});
  }
  const queue=new THREE.Mesh(_geo.cone,_m(0x141c24));queue.rotation.z=Math.PI/2;queue.scale.set(0.03,1.8,0.03);queue.position.x=-1.3;g.add(queue);
  scene.add(g);
  let a=Math.random()*6.3;
  _animaux.push({update(dt,t){
    a+=0.6*dt/rayon;
    g.position.set(Math.cos(a)*rayon,y+Math.sin(t*0.4)*0.4,5+Math.sin(a)*rayon);
    g.rotation.y=-a-Math.PI/2;
    for(const w of ailes)w.pv.rotation.x=w.z*Math.sin(t*1.6)*0.35;
  }});
}

/** Un brochet, presque immobile près des herbiers, qui démarre de temps en temps. */
function _brochet(y){
  const f=_poisson({L:0.9,h:0.17,w:0.13,corps:0x55663a,ventre:0xd8d6b0,rayures:{n:6,c:0x748a4c},nageoires:0x8a6a3a});
  scene.add(f);
  let a=1,x0=-6,z0=-2;
  _animaux.push({update(dt,t){
    const elan=Math.max(0,Math.sin(t*0.15))**8;     // de rares accélérations
    a+=dt*(0.02+elan*0.6);
    f.position.set(x0+Math.cos(a)*7,y+Math.sin(t*0.3)*0.15,z0+Math.sin(a)*7);
    f.rotation.y=-a-Math.PI/2;
    f.userData.queue.rotation.y=Math.sin(t*(3+elan*10))*0.25;
  }});
}

function _vieRecif(fond){
  const y=d=>Math.min(-2,-fond-1+d);
  const especes=[
    {L:0.16,h:0.55,w:0.22,corps:0xf2d23a,ventre:0xf6efc0,rayures:{n:5,c:0x1b1b1b},nageoires:0xe8c22a},   // sergents-majors
    {L:0.25,h:0.55,w:0.18,corps:0x2d5fd6,rayures:null,nageoires:0x1d3f9a},                              // chirurgiens bleus
    {L:0.38,h:0.42,w:0.26,corps:0x2fb38f,ventre:0xe07aa0,nageoires:0x7fd6ff},                           // perroquets
    {L:0.55,h:0.38,w:0.18,corps:0xb8c3c9,ventre:0xe9eef0,nageoires:0x9fb0b8},                           // carangues
  ];
  _banc(especes[0],12,-4,0,y(2.5),5,0.6);
  _banc(especes[1],9,6,-3,y(3.5),7,0.7);
  _banc(especes[2],5,2,8,y(1.6),6,0.45);
  _banc(especes[3],7,-8,-6,y(6),11,1.1);
  _tortue(y(3),9);
  _raie(y(1.2),15);
}
function _vieLac(fond){
  const y=d=>Math.min(-2,-fond-1+d);
  const perche={L:0.24,h:0.42,w:0.2,corps:0x6f7d3d,ventre:0xd9d6a8,rayures:{n:5,c:0x2c3318},nageoires:0xd06a2a};
  const gardon={L:0.2,h:0.36,w:0.16,corps:0xb9c2c0,ventre:0xe8ece8,nageoires:0xc45a3a};
  _banc(perche,8,-3,1,y(1.4),5,0.4);
  _banc(gardon,12,5,-2,y(3),7,0.6);
  _banc(perche,6,2,9,y(2.2),6,0.35);
  _brochet(y(1.1));
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
    // Les caustiques (le soleil ondulé par la surface) s'effacent avec la profondeur
    const prof=Math.max(0,-camera.position.y);
    caustic.intensity=(0.4+Math.sin(gameTime*1.9)*0.14)*Math.exp(-prof/7);
    caustic.position.x=Math.sin(gameTime*0.4)*4;
    caustic.position.z=Math.cos(gameTime*0.35)*4;
  }
  if(water)water.position.y=0.4+Math.sin(gameTime*0.6)*0.07;
  if(fenetreSnell&&water){
    const d=Math.max(0.3,water.position.y-camera.position.y);
    const r=d*Math.tan(48.6*Math.PI/180);
    fenetreSnell.scale.set(r,r,1);
    fenetreSnell.position.set(camera.position.x,water.position.y-0.03,camera.position.z);
  }
  // Les rayons suivent le plongeur (comme le soleil), ondulent et s'éteignent en profondeur
  const profR=Math.max(0,-camera.position.y);
  for(const r of _rayons){
    const u=r.userData;
    r.position.set(camera.position.x+u.dx,0.4-u.h/2,camera.position.z+u.dz);
    r.material.opacity=u.op*(0.6+0.4*Math.sin(gameTime*0.7+u.ph))*Math.exp(-profR/18);
  }
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

  // La vie dans l'eau
  for(const an of _animaux)an.update(dt,gameTime);

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