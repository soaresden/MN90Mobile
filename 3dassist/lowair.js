// lowair.js — Alarme faible pression (<50 bar)
// Charge subnautica_oxygen.mp3 depuis le même dossier
'use strict';

let _lowAirBuffer = null;
let _lowAirLoaded = false;

async function loadLowAirSound(){
  if(!audioCtx) return;
  try {
    const resp = await fetch('subnautica_oxygen.mp3');
    if(!resp.ok) throw new Error('Fichier introuvable');
    const arr = await resp.arrayBuffer();
    _lowAirBuffer = await audioCtx.decodeAudioData(arr);
    _lowAirLoaded = true;
    console.log('[sound] subnautica_oxygen.mp3 chargé OK');
  } catch(e){
    console.warn('[sound] subnautica_oxygen.mp3 non trouvé — fallback synthétique:', e.message);
  }
}

let _lowAirInterval = null;

function startLowAirAlarm(){
  if(_lowAirInterval) return;
  _lowAirInterval = setInterval(()=>{
    if(!soundEnabled) return;
    if(_lowAirLoaded && _lowAirBuffer && audioCtx){
      const src = audioCtx.createBufferSource();
      const g = audioCtx.createGain();
      g.gain.value = 0.75;
      src.buffer = _lowAirBuffer;
      src.connect(g); g.connect(audioCtx.destination);
      src.start();
    } else {
      _playLowAirFallback();
    }
  }, 4000);
}

function stopLowAirAlarm(){
  if(_lowAirInterval){ clearInterval(_lowAirInterval); _lowAirInterval = null; }
}

function _playLowAirFallback(){
  if(!audioCtx) return;
  const now = audioCtx.currentTime;
  for(let i = 0; i < 3; i++){
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 880;
    g.gain.setValueAtTime(0, now + i*0.2);
    g.gain.linearRampToValueAtTime(0.1, now + i*0.2 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + i*0.2 + 0.16);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now + i*0.2);
    o.stop(now + i*0.2 + 0.16);
  }
}