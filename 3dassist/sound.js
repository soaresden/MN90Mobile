// sound.js — Sons synthétisés Web Audio API
// Ambiances site, respiration, gonflage, purge, bulles, alarme
'use strict';

let audioCtx=null;
let soundEnabled=false;
let _breathInterval=null,_bubbleInterval=null,_ambianceNode=null;
let lastAlarmTime=0;

// ===== INIT =====
function initAudio(){
  if(audioCtx)return;
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
}

function toggleSound(){
  soundEnabled=!soundEnabled;
  document.getElementById('sound-btn').textContent='SON : '+(soundEnabled?'ON':'OFF');
  if(soundEnabled){
    initAudio();
    startBreathing();
    startBubbleSoundLoop();
    startAmbiance();
  } else {
    clearInterval(_breathInterval);
    clearInterval(_bubbleInterval);
    stopAmbiance();
  }
}

// ===== RESPIRATION =====
// Inspiration : montée en fréquence + volume, durée ~1.5s
function playInspiration(){
  if(!audioCtx||!soundEnabled)return;
  const dur=1.5,sr=audioCtx.sampleRate;
  const buf=audioCtx.createBuffer(1,sr*dur,sr);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++){
    const t=i/sr;
    // Enveloppe : crescendo puis plateau
    const env=t<0.8?t/0.8:Math.max(0,1-(t-0.8)/0.7);
    // Bruit filtré + harmonique grave (turbulence air)
    d[i]=(Math.random()*2-1)*env*0.045;
  }
  const src=audioCtx.createBufferSource();
  const bp=audioCtx.createBiquadFilter();
  bp.type='bandpass';bp.frequency.value=380;bp.Q.value=0.4;
  const lp=audioCtx.createBiquadFilter();
  lp.type='lowpass';lp.frequency.value=900;
  src.buffer=buf;
  src.connect(bp);bp.connect(lp);lp.connect(audioCtx.destination);
  src.start();
}

// Expiration : descente en fréquence, plus courte
function playExpiration(){
  if(!audioCtx||!soundEnabled)return;
  const dur=1.2,sr=audioCtx.sampleRate;
  const buf=audioCtx.createBuffer(1,sr*dur,sr);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++){
    const t=i/sr;
    const env=t<0.3?t/0.3:Math.max(0,1-(t-0.3)/0.9);
    d[i]=(Math.random()*2-1)*env*0.038;
  }
  const src=audioCtx.createBufferSource();
  const bp=audioCtx.createBiquadFilter();
  bp.type='bandpass';bp.frequency.value=280;bp.Q.value=0.35;
  src.buffer=buf;src.connect(bp);bp.connect(audioCtx.destination);
  src.start();
}

function playBreath(){
  if(!audioCtx||!soundEnabled)return;
  playInspiration();
  setTimeout(()=>{ if(soundEnabled)playExpiration(); },1600);
}

function startBreathing(){
  clearInterval(_breathInterval);
  // Cycle ~4s : inspiration 1.5s, expiration 1.2s, pause
  _breathInterval=setInterval(()=>{
    if(G.simStarted&&soundEnabled)playBreath();
  },4200);
}

// ===== GONFLAGE STAB =====
// Son valve direct system : claquètement rythmique "brrrbrbrbrr"
let _inflateInterval=null;
function startInflateSound(){
  if(!audioCtx||!soundEnabled||_inflateInterval)return;
  _inflateInterval=setInterval(()=>{
    if(!soundEnabled){stopInflateSound();return;}
    const dur=0.04+Math.random()*0.02;
    const sr=audioCtx.sampleRate;
    const buf=audioCtx.createBuffer(1,Math.ceil(sr*dur),sr);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++){
      const t=i/sr;
      const env=t<0.006?t/0.006:Math.max(0,1-(t-0.006)/(dur-0.006));
      d[i]=(Math.random()*2-1)*env*0.22;
    }
    const src=audioCtx.createBufferSource();
    const hp=audioCtx.createBiquadFilter();hp.type='highpass';hp.frequency.value=100;
    const lp=audioCtx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;
    const g=audioCtx.createGain();g.gain.value=1.0;
    src.buffer=buf;
    src.connect(hp);hp.connect(lp);lp.connect(g);g.connect(audioCtx.destination);
    src.start();
  },52);
}
function stopInflateSound(){
  if(_inflateInterval){clearInterval(_inflateInterval);_inflateInterval=null;}
}

// ===== PURGE =====
// Son court de dépression : rush d'air
function playPurgeSound(){
  if(!audioCtx||!soundEnabled)return;
  const dur=0.3,sr=audioCtx.sampleRate;
  const buf=audioCtx.createBuffer(1,sr*dur,sr);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++){
    const t=i/sr;
    const env=t<0.05?t/0.05:Math.max(0,1-(t-0.05)/0.25);
    d[i]=(Math.random()*2-1)*env*0.08;
  }
  const src=audioCtx.createBufferSource();
  const hp=audioCtx.createBiquadFilter();
  hp.type='highpass';hp.frequency.value=800;
  const g=audioCtx.createGain();g.gain.value=1.2;
  src.buffer=buf;src.connect(hp);hp.connect(g);g.connect(audioCtx.destination);
  src.start();
}

// ===== BULLES =====
function playBubbleSnd(){
  if(!audioCtx||!soundEnabled)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(600+Math.random()*500,audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(150+Math.random()*100,audioCtx.currentTime+0.15);
  g.gain.setValueAtTime(0.028,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.15);
  o.connect(g);g.connect(audioCtx.destination);
  o.start();o.stop(audioCtx.currentTime+0.15);
}
function startBubbleSoundLoop(){
  clearInterval(_bubbleInterval);
  _bubbleInterval=setInterval(()=>{
    if(G.simStarted&&soundEnabled)playBubbleSnd();
  },250+Math.random()*200);
}

// ===== ALARME =====
function playAlarm(){
  if(!audioCtx||!soundEnabled)return;
  const now=audioCtx.currentTime;
  if(now-lastAlarmTime<0.55)return;
  lastAlarmTime=now;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type='square';o.frequency.value=1200;
  g.gain.setValueAtTime(0.06,now);
  g.gain.exponentialRampToValueAtTime(0.001,now+0.1);
  o.connect(g);g.connect(audioCtx.destination);
  o.start();o.stop(now+0.1);
}

// ===== AMBIANCE PAR SITE =====
// Sons de fond différents selon le site (bruit sous-marin, courant, etc.)
let _ambiGain=null;

function startAmbiance(){
  if(!audioCtx||!soundEnabled)return;
  stopAmbiance();
  const site=G.currentSite;
  const masterGain=audioCtx.createGain();
  masterGain.gain.value=0;
  masterGain.connect(audioCtx.destination);
  masterGain.gain.linearRampToValueAtTime(0.04,audioCtx.currentTime+2);
  _ambiGain=masterGain;

  // Grondement sous-marin grave (toujours présent)
  const deep=audioCtx.createOscillator();
  const dg=audioCtx.createGain();
  deep.type='sine';deep.frequency.value=40+Math.random()*10;
  dg.gain.value=0.3;
  deep.connect(dg);dg.connect(masterGain);deep.start();
  _ambianceNode=deep;

  // Bruit blanc filtré (ambiance eau)
  const sr=audioCtx.sampleRate;
  const bufLen=sr*4;
  const noiseBuf=audioCtx.createBuffer(1,bufLen,sr);
  const nd=noiseBuf.getChannelData(0);
  for(let i=0;i<bufLen;i++)nd[i]=(Math.random()*2-1);
  const noiseLoop=audioCtx.createBufferSource();
  noiseLoop.buffer=noiseBuf;noiseLoop.loop=true;
  const lp=audioCtx.createBiquadFilter();
  lp.type='lowpass';
  // Eau douce (VLG, Roussay, Nemo) = plus sourd
  lp.frequency.value=site.freshwater?120:200;
  const ng=audioCtx.createGain();ng.gain.value=0.15;
  noiseLoop.connect(lp);lp.connect(ng);ng.connect(masterGain);
  noiseLoop.start();

  // Martinique : léger courant (LFO sur gain)
  if(G.selectedSiteKey==='martinique'){
    const lfo=audioCtx.createOscillator();
    const lfog=audioCtx.createGain();
    lfo.frequency.value=0.12;lfog.gain.value=0.02;
    lfo.connect(lfog);lfog.connect(masterGain.gain);
    lfo.start();
  }
}

function stopAmbiance(){
  if(_ambianceNode){try{_ambianceNode.stop();}catch(e){} _ambianceNode=null;}
  if(_ambiGain){
    _ambiGain.gain.linearRampToValueAtTime(0,audioCtx?audioCtx.currentTime+0.5:0);
    setTimeout(()=>{try{_ambiGain.disconnect();}catch(e){} _ambiGain=null;},600);
  }
}

// Appelé par buoyancy.js quand on appuie sur gonflage/purge
function onInflateStart(who){ startInflateSound(); }
function onInflateStop(who){ stopInflateSound(); }
function onPurge(who){ playPurgeSound(); }

// Surcharge les fonctions inflatePush/purgePush pour déclencher les sons
const _origInflate=inflatePush;
inflatePush=function(who,on){
  _origInflate(who,on);
  if(on)onInflateStart(who);else onInflateStop(who);
};
const _origPurge=purgePush;
purgePush=function(who,on){
  _origPurge(who,on);
  if(on)onPurge(who);
};