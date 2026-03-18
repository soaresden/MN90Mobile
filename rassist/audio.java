/* global RA */
RA.audio = {
  ctx:null, master:null, noiseBuf:null, inflateNode:null,

  init(){
    if(this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);

    const len = this.ctx.sampleRate * 1.0;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<len;i++) data[i] = (Math.random()*2-1)*0.8;
    this.noiseBuf = buf;
  },

  purge(str=1){
    if(!this.ctx) return;
    const t=this.ctx.currentTime;
    const n=this.ctx.createBufferSource(); n.buffer=this.noiseBuf;
    const f=this.ctx.createBiquadFilter(); f.type="highpass"; f.frequency.value=900;
    const g=this.ctx.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(0.16*str,t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.16);
    n.connect(f).connect(g).connect(this.master);
    n.start(t); n.stop(t+0.20);
  },

  inflate(on){
    if(!this.ctx) return;
    if(on && !this.inflateNode){
      const t=this.ctx.currentTime;
      const osc=this.ctx.createOscillator(); osc.type="sawtooth"; osc.frequency.value=140;
      const f=this.ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=900; f.Q.value=0.9;
      const g=this.ctx.createGain();
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(0.10,t+0.05);
      osc.connect(f).connect(g).connect(this.master);
      osc.start();
      this.inflateNode={osc,g};
    }
    if(!on && this.inflateNode){
      const t=this.ctx.currentTime;
      this.inflateNode.g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
      setTimeout(()=>{ try{this.inflateNode.osc.stop();}catch(e){} this.inflateNode=null; },90);
    }
  }
};