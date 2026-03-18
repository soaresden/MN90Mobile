/* global RA */
RA.ui = {
  initDepthButtons(){
    const depthRow = document.getElementById("depthRow");
    if(!depthRow) return;

    depthRow.innerHTML = "";
    RA.CONF.depths.forEach(d=>{
      const btn = document.createElement("button");
      btn.className = "depth-btn";
      btn.textContent = d + "m";
      btn.onclick = () => {
        RA.state.startDepth = d;
        document.querySelectorAll(".depth-btn").forEach(b=>b.classList.remove("sel"));
        btn.classList.add("sel");
        this.updateBackgroundDepth(d);
      };
      depthRow.appendChild(btn);
    });

    const def = [...depthRow.querySelectorAll("button")].find(b=>b.textContent.startsWith("40"));
    if(def) def.click();
  },

  updateBackgroundDepth(depth){
    const colors = {
      20:{top:'rgb(85,120,170)', bottom:'rgb(0,22,45)'},
      30:{top:'rgb(65,100,150)', bottom:'rgb(0,20,40)'},
      40:{top:'rgb(45,80,130)',  bottom:'rgb(0,15,35)'},
      50:{top:'rgb(25,60,110)',  bottom:'rgb(0,10,25)'},
      60:{top:'rgb(10,40,90)',   bottom:'rgb(0,5,15)'}
    };
    const c = colors[depth] || colors[40];
    document.documentElement.style.setProperty('--bgTop', c.top);
    document.documentElement.style.setProperty('--bgBottom', c.bottom);
  },

  updateVictimWeight(){
    const w = document.getElementById("wVictim");
    const label = document.getElementById("wVictimVal");
    if(!w || !label) return;
    RA.state.victimWeightKg = parseInt(w.value, 10);
    label.textContent = RA.state.victimWeightKg + " kg";
  },

  update(phys){
    const hud = document.getElementById("hudSim");
    if(hud && hud.style.display !== "block") hud.style.display = "block";

    // jauges gilets
    const elV = document.getElementById("bcdV");
    const elS = document.getElementById("bcdS");
    const tv  = document.getElementById("bcdVtxt");
    const ts  = document.getElementById("bcdStxt");

    if(elV) elV.style.height = (phys.vicFill*100).toFixed(0) + "%";
    if(elS) elS.style.height = (phys.meFill*100).toFixed(0) + "%";
    if(tv)  tv.textContent = (phys.vicFill*100).toFixed(0) + "%";
    if(ts)  ts.textContent = (phys.meFill*100).toFixed(0) + "%";

    // vitesse
    const spdVal = document.getElementById("spdVal");
    const spdLim = document.getElementById("spdLim");
    const warn   = document.getElementById("warnSpeed");
    if(spdVal) spdVal.textContent = phys.spd.toFixed(1);
    if(spdLim) spdLim.textContent = phys.lim.toFixed(0);
    if(warn) warn.style.display = (phys.spd > phys.lim) ? "block" : "none";

    // panel infos
    const phaseTxt = document.getElementById("phaseTxt");
    const depthTxt = document.getElementById("depthTxt");
    const timeTxt  = document.getElementById("timeTxt");

    let phase = "Remontee";
    if(phys.depth > 35) phase = "Sortie 30+";
    if(phys.depth < 5)  phase = "Surface";

    if(phaseTxt) phaseTxt.textContent = phase;
    if(depthTxt) depthTxt.textContent = phys.depth.toFixed(1);

    const elapsed = (phys.elapsed || 0)/1000;
    const m = Math.floor(elapsed/60);
    const sec = Math.floor(elapsed%60);
    if(timeTxt) timeTxt.textContent = `${m}:${String(sec).padStart(2,"0")}`;

    // ✅ SINUSOIDE POUMON ENTRE INSPIR/EXPIR
    const c = document.getElementById("lungWaveMini");
    if(c){
      const g = c.getContext("2d");
      const w = c.width, h = c.height;
      g.clearRect(0,0,w,h);

      // fond noir
      g.fillStyle = "rgba(0,0,0,0.92)";
      g.fillRect(0,0,w,h);

      // cercle léger
      g.strokeStyle = "rgba(0,232,255,0.20)";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(w/2,h/2, (Math.min(w,h)/2)-2, 0, Math.PI*2);
      g.stroke();

      const mid = h/2;
      const amp = 6 + phys.lungFill * 10;

      g.strokeStyle = "rgba(0,232,255,0.95)";
      g.lineWidth = 2;
      g.beginPath();
      for(let x=0;x<w;x++){
        const p = x/(w-1);
        const y = mid + Math.sin(p*Math.PI*2) * amp;
        if(x===0) g.moveTo(x,y);
        else g.lineTo(x,y);
      }
      g.stroke();
    }
  }
};