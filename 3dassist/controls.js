// controls.js — Clavier, souris, joysticks tactiles
'use strict';

// ===== CAMÉRA =====
let yaw=0,pitch=0,locked=false;
let moveF=false,moveB=false,moveL=false,moveR=false,moveU=false,moveD=false;

function _applyYaw(delta){ yaw-=delta; while(yaw>Math.PI)yaw-=Math.PI*2; while(yaw<-Math.PI)yaw+=Math.PI*2; }
function _applyPitch(delta){ pitch=Math.max(-Math.PI/2.5,Math.min(Math.PI/2.5,pitch-delta)); }

// Exposé pour game.js (détection 360)
Object.defineProperty(window,'_yaw',{get:()=>yaw});

document.addEventListener('keydown',e=>{
  if(!G.simStarted)return;
  switch(e.code){
    case 'KeyZ':case 'KeyW':moveF=true;break;
    case 'KeyS':moveB=true;break;
    case 'KeyQ':case 'KeyA':moveL=true;break;
    case 'KeyD':moveR=true;break;
    case 'Space':moveU=true;e.preventDefault();break;
    case 'ShiftLeft':case 'ShiftRight':moveD=true;break;
    case 'ControlLeft':case 'ControlRight':moveD=true;e.preventDefault();break;
    case 'KeyE':tryRescue();break;
    case 'KeyF':toggleTorch();break;
  }
});
document.addEventListener('keyup',e=>{
  switch(e.code){
    case 'KeyZ':case 'KeyW':moveF=false;break;
    case 'KeyS':moveB=false;break;
    case 'KeyQ':case 'KeyA':moveL=false;break;
    case 'KeyD':moveR=false;break;
    case 'Space':moveU=false;break;
    case 'ShiftLeft':case 'ShiftRight':case 'ControlLeft':case 'ControlRight':moveD=false;break;
  }
});

const canvas3dEl=document.getElementById('c');
canvas3dEl.addEventListener('click',()=>{ if(G.simStarted&&!isMobile())canvas3dEl.requestPointerLock(); });
document.addEventListener('pointerlockchange',()=>{ locked=document.pointerLockElement===canvas3dEl; });
document.addEventListener('mousemove',e=>{
  if(!locked||!G.simStarted)return;
  _applyYaw(e.movementX*0.002);
  _applyPitch(e.movementY*0.002);
});

// Exposé pour game.js (détection 360)
Object.defineProperty(window,'_yaw',{get:()=>yaw});

function isMobile(){ return 'ontouchstart' in window||navigator.maxTouchPoints>0; }

// ===== MOUVEMENT =====
const velocity=new THREE.Vector3();

function applyMovement(dt){
  const cam=window._camera;if(!cam)return;
  // Rotation caméra robuste
  cam.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));

  const maxSpd=G.rescued?2.0:5.0;
  const accel=4.0;
  const friction=G.rescued?0.90:0.85;

  const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(cam.quaternion);fwd.y=0;fwd.normalize();
  const rgt=new THREE.Vector3(1,0,0).applyQuaternion(cam.quaternion);rgt.y=0;rgt.normalize();
  const inp=new THREE.Vector3();

  if(moveF)inp.addScaledVector(fwd,1);if(moveB)inp.addScaledVector(fwd,-1);
  if(moveL)inp.addScaledVector(rgt,-1);if(moveR)inp.addScaledVector(rgt,1);

  const jl=joyState.left;
  if(jl.active&&(Math.abs(jl.dx)>0.05||Math.abs(jl.dy)>0.05)){
    inp.addScaledVector(fwd,-jl.dy);inp.addScaledVector(rgt,jl.dx);
  }
  const jr=joyState.right;
  if(jr.active&&(Math.abs(jr.dx)>0.05||Math.abs(jr.dy)>0.05)){
    _applyYaw(jr.dx*2.5*dt);
    _applyPitch(jr.dy*2.0*dt);
  }

  // Mouvement horizontal uniquement dans velocity
  velocity.x*=Math.pow(friction,dt*60);
  velocity.z*=Math.pow(friction,dt*60);
  velocity.y=0; // Y géré exclusivement par buoyVelocity

  if(inp.length()>0){inp.normalize();velocity.addScaledVector(inp,accel*dt);}
  const hspd=Math.sqrt(velocity.x*velocity.x+velocity.z*velocity.z);
  if(hspd>maxSpd){const s=maxSpd/hspd;velocity.x*=s;velocity.z*=s;}

  // Ondulation naturelle — seulement XZ
  const wave=Math.sin(G.gameTime*1.2)*0.006;
  cam.position.x+=wave*fwd.z*dt;
  cam.position.z+=wave*fwd.x*dt;

  cam.position.add(velocity.clone().multiplyScalar(dt));

  // Flottabilité Y — appliquée séparément, jamais écrasée
  cam.position.y+=G.buoyVelocity*dt;
  const minY=-(G.currentSite.depthMax+0.5);
  const floorY=-G.selectedDepth; // plancher = profondeur de départ
  // Empêcher de descendre plus bas que la profondeur choisie
  if(cam.position.y<floorY&&G.buoyVelocity<0){
    G.buoyVelocity=0;
    cam.position.y=floorY;
  }
  cam.position.y=Math.min(0.4,Math.max(minY,cam.position.y));

  // Log debug vitesse verticale
  if(G.simStarted&&Math.random()<0.005)
    console.log('[controls] buoyV='+G.buoyVelocity.toFixed(3)+' posY='+cam.position.y.toFixed(2));
}

// ===== JOYSTICKS TACTILES =====
const joyState={
  left:{active:false,id:null,startX:0,startY:0,dx:0,dy:0},
  right:{active:false,id:null,startX:0,startY:0,dx:0,dy:0}
};
const JOY_MAX=45;

function setupJoystick(zoneId,stickId,side){
  const zone=document.getElementById(zoneId);
  const stick=document.getElementById(stickId);
  const js=joyState[side];
  zone.addEventListener('touchstart',e=>{
    e.preventDefault();const t=e.changedTouches[0];
    js.active=true;js.id=t.identifier;
    const r=zone.getBoundingClientRect();
    js.startX=r.left+r.width/2;js.startY=r.top+r.height/2;js.dx=0;js.dy=0;
  },{passive:false});
  zone.addEventListener('touchmove',e=>{
    e.preventDefault();
    for(const t of e.changedTouches){
      if(t.identifier!==js.id)continue;
      const dx=t.clientX-js.startX,dy=t.clientY-js.startY;
      const dist=Math.min(Math.sqrt(dx*dx+dy*dy),JOY_MAX);
      const angle=Math.atan2(dy,dx);
      js.dx=Math.cos(angle)*dist/JOY_MAX;js.dy=Math.sin(angle)*dist/JOY_MAX;
      stick.style.transform=`translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px))`;
    }
  },{passive:false});
  const end=e=>{
    for(const t of e.changedTouches){
      if(t.identifier!==js.id)continue;
      js.active=false;js.dx=0;js.dy=0;stick.style.transform='translate(-50%,-50%)';
    }
  };
  zone.addEventListener('touchend',end,{passive:false});
  zone.addEventListener('touchcancel',end,{passive:false});
}
setupJoystick('joy-left','joy-left-stick','left');
setupJoystick('joy-right','joy-right-stick','right');

let touchCamId=null,lastTX=0,lastTY=0;
canvas3dEl.addEventListener('touchstart',e=>{
  if(!G.simStarted)return;
  for(const t of e.changedTouches){
    const el=document.elementFromPoint(t.clientX,t.clientY);
    if(el&&el.closest&&(el.closest('#joy-left')||el.closest('#joy-right')))continue;
    touchCamId=t.identifier;lastTX=t.clientX;lastTY=t.clientY;break;
  }
},{passive:true});
canvas3dEl.addEventListener('touchmove',e=>{
  if(!G.simStarted)return;
  for(const t of e.changedTouches){
    if(t.identifier!==touchCamId)continue;
    _applyYaw((t.clientX-lastTX)*0.0015);
    _applyPitch((t.clientY-lastTY)*0.0015);
    lastTX=t.clientX;lastTY=t.clientY;
  }
},{passive:true});
canvas3dEl.addEventListener('touchend',e=>{
  for(const t of e.changedTouches)if(t.identifier===touchCamId)touchCamId=null;
},{passive:true});

// Son géré dans sound.js