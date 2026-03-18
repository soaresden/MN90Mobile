/* global RA */
(function(){
  RA.render.init();
  RA.input.init();
  RA.audio.init();

  RA.ui.initDepthButtons();
  RA.ui.updateVictimWeight();

  const wVictim = document.getElementById("wVictim");
  if(wVictim){
    wVictim.addEventListener("input", ()=>RA.ui.updateVictimWeight());
  }

  const btnStart = document.getElementById("btnStart");
  if(btnStart){
    btnStart.onclick = () => {
      const depth = RA.state.startDepth ?? 40;
      const weight = RA.state.victimWeightKg ?? 75;

      RA.state.S = RA.state.init(depth, weight);

      const panel = document.getElementById("panelRight");
      if(panel) panel.style.display = "none";

      const hud = document.getElementById("hudSim");
      if(hud) hud.style.display = "block";
    };
  }

  function loop(){
    if(RA.state.S){
      const phys = RA.physics.step();
      RA.render.draw(phys);
      RA.ui.update(phys);
    }else{
      RA.render.drawPreview();
    }
    requestAnimationFrame(loop);
  }

  loop();
})();