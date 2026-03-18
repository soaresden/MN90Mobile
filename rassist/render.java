/* global RA */

RA.render = {
  canvas: null, ctx: null, W: 0, H: 0,

  init(){
    this.canvas = document.getElementById("scene");
    this.ctx = this.canvas.getContext("2d");

    if(!CanvasRenderingContext2D.prototype.roundRect){
      CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
        r=Math.min(r,w/2,h/2);
        this.beginPath();
        this.moveTo(x+r,y);
        this.arcTo(x+w,y,x+w,y+h,r);
        this.arcTo(x+w,y+h,x,y+h,r);
        this.arcTo(x,y+h,x,y,r);
        this.arcTo(x,y,x+w,y,r);
        this.closePath();
        return this;
      };
    }

    const resize=()=>{
      this.W = this.canvas.width = window.innerWidth;
      this.H = this.canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
  },

  drawPreview(){
    const ctx = this.ctx;
    const W = this.W, H = this.H;

    const bgTop = getComputedStyle(document.documentElement).getPropertyValue('--bgTop').trim();
    const bgBottom = getComputedStyle(document.documentElement).getPropertyValue('--bgBottom').trim();

    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, bgTop);
    grd.addColorStop(1, bgBottom);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(W/2, H/2);
    ctx.scale(1.5, 1.5);
    ctx.translate(-W/2, -H/2);

    const tn = Date.now() * 0.0005;
    const bobY = Math.sin(tn * 0.8) * 1.5;
    ctx.translate(0, bobY);

    this.drawVictim(ctx, {
      depth: 5,
      vicDepth: 5,
      vicLS: RA.CONF.maxVictimFond * 0.5,
      maxVictimFond: RA.CONF.maxVictimFond,
      victimWeightKg: RA.state.victimWeightKg || 75
    });

    ctx.restore();
  },

  draw(phys){
    const s = RA.state.S;
    const ctx = this.ctx;
    const W = this.W, H = this.H;

    // Récupère les couleurs CSS
    const bgTop = getComputedStyle(document.documentElement).getPropertyValue('--bgTop').trim();
    const bgBottom = getComputedStyle(document.documentElement).getPropertyValue('--bgBottom').trim();

    // Gradient eau Subnautica
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, bgTop);
    grd.addColorStop(1, bgBottom);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Particules flottantes (style Subnautica)
    this.drawParticles(ctx, W, H);

    if(!s) return;

    ctx.save();

    // Oscillation légère
    const tn = Date.now() * 0.001;
    const bobY = Math.sin(tn * 0.8) * 2;
    const bobX = Math.sin(tn * 0.5) * 1;

    // ZOOM 1.5x
    ctx.translate(W / 2 + bobX, H / 2 + bobY);
    ctx.scale(1.5, 1.5);
    ctx.translate(-W / 2 - bobX, -H / 2 - bobY);

    this.drawVictim(ctx, s);
    this.drawArms(ctx, s, phys);

    ctx.restore();

  },

  drawParticles(ctx, W, H){
    // Particules flottantes (bulles) - Subnautica style
    const time = Date.now() * 0.0001;
    for(let i = 0; i < 5; i++){
      const x = (W/2 + Math.sin(time * (0.3 + i*0.1) + i) * 200) % W;
      const y = (H/2 + Math.cos(time * (0.2 + i*0.08) + i*2) * 250) % H;
      const size = 2 + Math.sin(time * (0.5 + i*0.1)) * 1.5;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 232, 255, ${0.1 + Math.sin(time + i) * 0.05})`;
      ctx.fill();
    }
  },

  drawVictim(ctx, s){
    const cx = this.W/2;
    const cy = this.H/2;

    const weight = s.victimWeightKg || 75;
    const weightFactor = (weight - 55) / (110 - 55);
    
    const vicVol = RA.util.vFond(s.vicLS, s.depth || s.vicDepth || 5);
    const vicFill = RA.util.clamp(vicVol / s.maxVictimFond, 0, 1);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(Date.now()*0.0009)*0.04);

    // GILET
    const baseStabW = 26 + weightFactor * 12;
    const stabW = baseStabW + vicFill * 28;
    const stabH = 56 + vicFill * 30;
    
    ctx.roundRect(-stabW/2-8, -28, stabW+16, stabH, 16);
    ctx.fillStyle = `rgba(35,110,255,${0.22 + vicFill*0.45})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(0,232,255,${0.22 + vicFill*0.25})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // TORSE
    const torsoW = 60 + weightFactor * 20;
    ctx.roundRect(-torsoW/2, -18, torsoW, 66, 18);
    ctx.fillStyle = 'rgba(18,33,62,.93)';
    ctx.fill();

    // TÊTE
    const headSize = 20 + weightFactor * 6;
    ctx.beginPath();
    ctx.ellipse(0, -40, headSize, headSize*1.05, 0, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(13,24,48,.95)';
    ctx.fill();

    // DIRECT SYSTEM
    ctx.strokeStyle = 'rgba(50,130,255,.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(30, 10);
    ctx.bezierCurveTo(50, 22, 54, 34, 48, 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(46, 52, 7, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(0,90,240,.7)';
    ctx.fill();

    ctx.restore();
  },

  drawArms(ctx, s, phys){
    const cx = this.W/2;
    const baseY = this.H + 10;
    const topY = this.H/2;
    const spd = phys.spd || 0;

    // BRAS GAUCHE
    const lx = cx - 96;
    ctx.beginPath();
    ctx.moveTo(lx - 55, baseY);
    ctx.bezierCurveTo(lx - 32, baseY - 55, lx - 14, topY + 65, lx, topY);
    ctx.lineWidth = 52;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(18,32,62,.97)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(lx, topY, 20, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(14,26,52,.96)';
    ctx.fill();

    // ORDO GAUCHE
    ctx.save();
    ctx.translate(lx - 34, topY - 34);
    ctx.rotate(-0.26);
    ctx.fillStyle = 'rgba(0,8,24,.95)';
    ctx.strokeStyle = 'rgba(0,232,255,.55)';
    ctx.lineWidth = 2.0;
    ctx.roundRect(-26, -18, 52, 36, 9);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,232,255,.10)';
    ctx.roundRect(-22, -14, 44, 28, 7);
    ctx.fill();

    ctx.fillStyle = '#00e8ff';
    ctx.font = '1000 11px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.max(0, phys.depth).toFixed(1)}m`, 0, -2);

    ctx.fillStyle = 'rgba(0,232,255,.80)';
    ctx.font = '1000 8px Helvetica';
    ctx.fillText(`${spd.toFixed(1)} m/min`, 0, 10);

    ctx.restore();

    // BRAS DROIT
    const rx = cx + 96;
    ctx.beginPath();
    ctx.moveTo(rx + 55, baseY);
    ctx.bezierCurveTo(rx + 32, baseY - 55, rx + 14, topY + 65, rx, topY);
    ctx.lineWidth = 52;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(18,32,62,.97)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rx, topY, 20, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(14,26,52,.96)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(50,130,255,.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, topY);
    ctx.bezierCurveTo(rx - 12, topY - 22, cx + 42, this.H/2 + 28, cx + 46, this.H/2 + 52);
    ctx.stroke();
  },

  drawHUD(ctx, s, phys){
    const W = this.W;
    const H = this.H;

    // ===== JAUGES SUR LES CÔTÉS =====
    const gaugeW = 28;
    const gaugeH = 100;
    const centerX = W / 2;
    const centerY = H / 2;
    const gaugeY = centerY - 50;

    // JAUGE GAUCHE = BLESSÉ (VERT)
    const gaugeLX = centerX - 120;
    ctx.fillStyle = 'rgba(0,232,255,.85)';
    ctx.font = '700 9px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText('BLESSE', gaugeLX + gaugeW / 2, gaugeY - 15);

    ctx.strokeStyle = 'rgba(0,232,255,.5)';
    ctx.lineWidth = 2;
    ctx.roundRect(gaugeLX, gaugeY, gaugeW, gaugeH, 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,255,153,.85)';
    const vicFill = phys.vicFill || 0;
    const fillH = (gaugeH - 4) * vicFill;
    ctx.roundRect(gaugeLX + 2, gaugeY + gaugeH - 2 - fillH, gaugeW - 4, fillH, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,232,255,.7)';
    ctx.font = '700 9px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText((vicFill * 100 | 0) + '%', gaugeLX + gaugeW / 2, gaugeY - 32);

    // JAUGE DROITE = MOI (BLEU)
    const gaugeRX = centerX + 70;
    ctx.fillStyle = 'rgba(0,232,255,.85)';
    ctx.font = '700 9px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText('MOI', gaugeRX + gaugeW / 2, gaugeY - 15);

    ctx.strokeStyle = 'rgba(0,232,255,.5)';
    ctx.lineWidth = 2;
    ctx.roundRect(gaugeRX, gaugeY, gaugeW, gaugeH, 4);
    ctx.stroke();

    ctx.fillStyle = 'rgba(100,200,255,.85)';
    const meFill = phys.meFill || 0;
    const fillH2 = (gaugeH - 4) * meFill;
    ctx.roundRect(gaugeRX + 2, gaugeY + gaugeH - 2 - fillH2, gaugeW - 4, fillH2, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,232,255,.7)';
    ctx.font = '700 9px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText((meFill * 100 | 0) + '%', gaugeRX + gaugeW / 2, gaugeY - 32);

    // ===== POUMON À DROITE DE MA STAB =====
    const lungRX = gaugeRX + gaugeW + 20;
    const lungY = gaugeY;
    const lungW = 26;
    const lungH = 100;

    ctx.fillStyle = 'rgba(0,232,255,.85)';
    ctx.font = '700 9px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText('RESPIR', lungRX + lungW / 2, lungY - 15);

    ctx.strokeStyle = 'rgba(0,232,255,.5)';
    ctx.lineWidth = 2;
    ctx.roundRect(lungRX, lungY, lungW, lungH, 4);
    ctx.stroke();

    const lungFill = phys.lungFill || 0.5;
    if(s.lungMode === "inhale"){
      ctx.fillStyle = 'rgba(0,255,100,.9)';
    } else if(s.lungMode === "exhale"){
      ctx.fillStyle = 'rgba(255,100,100,.9)';
    } else {
      // Respiration normale : affiche une onde
      ctx.fillStyle = `rgba(0,232,255, ${0.3 + lungFill * 0.4})`;
    }
    
    const fillHLung = (lungH - 4) * lungFill;
    ctx.roundRect(lungRX + 2, lungY + lungH - 2 - fillHLung, lungW - 4, fillHLung, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,232,255,.7)';
    ctx.font = '700 8px Helvetica';
    ctx.textAlign = 'center';
    ctx.fillText((lungFill * 100 | 0) + '%', lungRX + lungW / 2, lungY - 32);

    // ===== INFOS EN HAUT À DROITE =====
    const infoX = W - 180;
    const infoY = 15;
    const lineH = 14;

    ctx.fillStyle = 'rgba(0,232,255,.95)';
    ctx.font = 'bold 11px Helvetica';
    ctx.textAlign = 'left';
    ctx.fillText('MISSION', infoX, infoY);

    ctx.fillStyle = 'rgba(0,232,255,.75)';
    ctx.font = '700 9px Helvetica';
    const elapsed = (phys.elapsed || 0) / 1000;
    const m = Math.floor(elapsed / 60);
    const sec = Math.floor(elapsed % 60);
    
    let y = infoY + lineH;
    ctx.fillText(`⏱ ${m}:${String(sec).padStart(2, "0")}`, infoX, y);
    
    y += lineH;
    ctx.fillText(`📍 ${phys.depth.toFixed(1)}m`, infoX, y);

    let phase = "Montée";
    if(phys.depth > 35) phase = "Sortie 30+";
    if(phys.depth < 5) phase = "SURFACE!";
    y += lineH;
    ctx.fillText(`Phase: ${phase}`, infoX, y);

    // ===== VITESSE =====
    const spd = phys.spd || 0;
    const lim = phys.lim || 10;
    const spdColor = spd > lim ? 'rgba(255,100,100,1)' : '#00e8ff';
    
    y += lineH + 4;
    ctx.fillStyle = spdColor;
    ctx.font = 'bold 16px Helvetica';
    ctx.fillText(`${spd.toFixed(1)} m/min`, infoX, y);
    
    ctx.fillStyle = 'rgba(0,232,255,.65)';
    ctx.font = '700 8px Helvetica';
    y += lineH - 2;
    ctx.fillText(`max: ${lim | 0}`, infoX, y);

    if(spd > lim){
      ctx.fillStyle = 'rgba(255,100,100,.95)';
      ctx.roundRect(infoX - 5, y + 6, 165, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 9px Helvetica';
      ctx.textAlign = 'left';
      ctx.fillText('⚠ TROP RAPIDE', infoX, y + 16);
    }
  }
};