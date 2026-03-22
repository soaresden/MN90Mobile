// sound.js — Sons synthétisés Web Audio
'use strict';

let soundEnabled=true; // ON par défaut
let audioCtx=null;

function initAudio(){
  if(audioCtx)return;
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
}

function toggleSound(){
  soundEnabled=!soundEnabled;
  document.getElementById('sound-btn').textContent='SON : '+(soundEnabled?'ON':'OFF');
  if(soundEnabled){initAudio();startBreathing();startBubbleSoundLoop();startAmbiance();loadLowAirSound();}
  else{stopBreathing();stopBubbleSoundLoop();stopAmbiance();}
}

// ===== RESPIRATION =====
let _breathInterval=null;

function playBreath(){
  if(!audioCtx)return;
  console.log('[sound] playBreath');
  const now=audioCtx.currentTime;
  // Inspiration — sine doux montant
  const bIn=audioCtx.createOscillator();
  const gIn=audioCtx.createGain();
  bIn.type='sine';
  bIn.frequency.setValueAtTime(140,now);
  bIn.frequency.linearRampToValueAtTime(220,now+1.2);
  gIn.gain.setValueAtTime(0,now);
  gIn.gain.linearRampToValueAtTime(0.035,now+0.4);
  gIn.gain.linearRampToValueAtTime(0,now+1.4);
  bIn.connect(gIn);gIn.connect(audioCtx.destination);
  bIn.start(now);bIn.stop(now+1.4);
  // Expiration — sine doux descendant
  const bOut=audioCtx.createOscillator();
  const gOut=audioCtx.createGain();
  bOut.type='sine';
  bOut.frequency.setValueAtTime(200,now+1.8);
  bOut.frequency.linearRampToValueAtTime(130,now+3.0);
  gOut.gain.setValueAtTime(0,now+1.8);
  gOut.gain.linearRampToValueAtTime(0.028,now+2.1);
  gOut.gain.linearRampToValueAtTime(0,now+3.1);
  bOut.connect(gOut);gOut.connect(audioCtx.destination);
  bOut.start(now+1.8);bOut.stop(now+3.1);
}

// Son poumon ballast — inspiration longue 5s
function playLungIn(){
  if(!audioCtx)return;
  console.log('[sound] playLungIn — stop breath');
  stopBreathing();
  const now=audioCtx.currentTime;
  const o=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(300,now);
  o.frequency.linearRampToValueAtTime(420,now+4.5);
  g.gain.setValueAtTime(0,now);
  g.gain.linearRampToValueAtTime(0.04,now+0.8);
  g.gain.linearRampToValueAtTime(0.035,now+4.2);
  g.gain.linearRampToValueAtTime(0,now+5);
  o.connect(g);g.connect(audioCtx.destination);
  o.start(now);o.stop(now+5);
  // Reprendre la respiration après 5.5s
  setTimeout(()=>{ if(soundEnabled)startBreathing(); },5500);
}

// Son poumon ballast — expiration longue 5s
function playLungOut(){
  if(!audioCtx)return;
  console.log('[sound] playLungOut — stop breath');
  stopBreathing();
  const now=audioCtx.currentTime;
  const o=audioCtx.createOscillator();
  const g=audioCtx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(400,now);
  o.frequency.linearRampToValueAtTime(280,now+4.5);
  g.gain.setValueAtTime(0,now);
  g.gain.linearRampToValueAtTime(0.035,now+0.6);
  g.gain.linearRampToValueAtTime(0.028,now+4.2);
  g.gain.linearRampToValueAtTime(0,now+5);
  o.connect(g);g.connect(audioCtx.destination);
  o.start(now);o.stop(now+5);
  setTimeout(()=>{ if(soundEnabled)startBreathing(); },5500);
}

function startBreathing(){
  if(_breathInterval){console.log('[sound] startBreathing — déjà actif, skip');return;}
  console.log('[sound] startBreathing — démarrage');
  playBreath();
  _breathInterval=setInterval(()=>{ if(soundEnabled)playBreath(); },4000);
}
function stopBreathing(){
  if(_breathInterval)console.log('[sound] stopBreathing');
  clearInterval(_breathInterval);_breathInterval=null;
}

// ===== ALARME =====
let _lastAlarm=0;
function playAlarm(){
  if(!audioCtx)return;
  const now2=audioCtx.currentTime;
  // Throttle : max 1 alarme par seconde
  if(now2-_lastAlarm<1.0)return;
  _lastAlarm=now2;
  console.log('[sound] playAlarm at',now2.toFixed(1));
  // 2 bips sine doux
  for(let i=0;i<2;i++){
    const o=audioCtx.createOscillator();const g=audioCtx.createGain();
    o.type='sine';o.frequency.value=660+i*200;
    g.gain.setValueAtTime(0,now2+i*0.28);
    g.gain.linearRampToValueAtTime(0.05,now2+i*0.28+0.04);
    g.gain.exponentialRampToValueAtTime(0.001,now2+i*0.28+0.22);
    o.connect(g);g.connect(audioCtx.destination);
    o.start(now2+i*0.28);o.stop(now2+i*0.28+0.25);
  }
}

// ===== BULLES =====
let _bubbleLoop=null;
function playBubble(){
  if(!audioCtx)return;
  const now=audioCtx.currentTime;
  const o=audioCtx.createOscillator();const g=audioCtx.createGain();
  o.type='sine';o.frequency.value=400+Math.random()*300;o.frequency.exponentialRampToValueAtTime(800+Math.random()*400,now+0.08);
  g.gain.setValueAtTime(0.04,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.08);
  o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+0.1);
}
function startBubbleSoundLoop(){
  if(_bubbleLoop)return;
  _bubbleLoop=setInterval(()=>{ if(soundEnabled&&Math.random()<0.3)playBubble(); },400);
}
function stopBubbleSoundLoop(){ clearInterval(_bubbleLoop);_bubbleLoop=null; }

// ===== GONFLAGE VALVE =====
function playInflate(){
  if(!audioCtx)return;
  const now=audioCtx.currentTime;
  const dur=0.06+Math.random()*0.04;
  const n=audioCtx.createBufferSource();
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.1,audioCtx.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1);
  n.buffer=buf;
  const f=audioCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=100+Math.random()*800;f.Q.value=1;
  const g=audioCtx.createGain();g.gain.setValueAtTime(0.12,now);g.gain.exponentialRampToValueAtTime(0.001,now+dur);
  n.connect(f);f.connect(g);g.connect(audioCtx.destination);n.start(now);
}

// ===== AMBIANCE =====
let _ambianceNode=null,_ambianceGain=null;
function startAmbiance(){
  if(!audioCtx||_ambianceNode)return;
  const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*4,audioCtx.sampleRate);
  const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.15;
  _ambianceNode=audioCtx.createBufferSource();_ambianceNode.buffer=buf;_ambianceNode.loop=true;
  const f=audioCtx.createBiquadFilter();f.type='lowpass';f.frequency.value=180;
  _ambianceGain=audioCtx.createGain();_ambianceGain.gain.value=0.08;
  _ambianceNode.connect(f);f.connect(_ambianceGain);_ambianceGain.connect(audioCtx.destination);
  _ambianceNode.start();
}
function stopAmbiance(){ if(_ambianceNode){_ambianceNode.stop();_ambianceNode=null;} }