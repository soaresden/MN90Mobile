/* global RA, performance */
RA.physics = {
  step(){
    const s = RA.state.S;

    if(!s || !s.running){
      return {
        spd:0, lim:10, depth:0, vicDepth:0,
        vicVol:0, myVol:0,
        vicFill:0, meFill:0,
        lungFill:0.5,
        narcose:0,
        dead:false,
        elapsed:0
      };
    }

    const dt = RA.CONF.dt;
    const clamp = RA.util.clamp;
    const pAbs = RA.CONF.pAbs;
    const vFond = RA.util.vFond;

    // Narcosis factor >30m (0..1)
    s.narcose = clamp((s.depth - 30) / 30, 0, 1);

    // ========== RESPIRATION ==========
    let lungFill = 0.5;
    const period = RA.CONF.normalBreathInSec + RA.CONF.normalBreathOutSec;

    if(s.lungMode === "normal"){
      s.breathT = (s.breathT + dt) % period;
      const t = s.breathT;
      if(t < RA.CONF.normalBreathInSec){
        lungFill = t / RA.CONF.normalBreathInSec; // 0->1 en 3s
      }else{
        lungFill = 1 - ((t - RA.CONF.normalBreathInSec) / RA.CONF.normalBreathOutSec); // 1->0 en 3s
      }
    } else {
      s.lungTimer -= dt;
      if(s.lungTimer <= 0){
        s.lungMode = "normal";
        s.lungTimer = 0;
      }
      lungFill = (s.lungMode === "inhale") ? 1.0 : 0.0;
    }

    // Poumon en litres fond (circuit ouvert => juste une oscillation)
    const lungBoostFond = (lungFill - 0.5) * 2 * RA.CONF.lungDeltaMaxLiters;

    // ========== GONFLAGE BLESSE (8s plein) ==========
    if(s.inflate){
      const inflFondPerSec = RA.CONF.maxVictimFond / RA.CONF.inflateFullSec;
      s.vicLS += inflFondPerSec * pAbs(s.vicDepth) * dt;
    }

   // ========== PURGES (2s vide) ==========
	if(s.purgeV && s.vicLS > 0){
	  const purgeFondPerSec = RA.CONF.maxVictimFond / RA.CONF.purgeFullSec; // L_fond/s
	  s.vicLS -= purgeFondPerSec * pAbs(s.vicDepth) * dt;                  // -> LS
	  if(s.vicLS < 0.01) s.vicLS = 0;
	}

	if(s.purgeS && s.myLS > 0){
	  const purgeFondPerSec = RA.CONF.maxMeFond / RA.CONF.purgeFullSec; // L_fond/s
	  s.myLS -= purgeFondPerSec * pAbs(s.depth) * dt;                   // -> LS
	  if(s.myLS < 0.01) s.myLS = 0;
	}

    // ========== LIMITES LS ==========
    const maxVicLS = RA.CONF.maxVictimFond * pAbs(s.vicDepth);
    const maxMyLS  = RA.CONF.maxMeFond     * pAbs(s.depth);
    s.vicLS = clamp(s.vicLS, 0, maxVicLS);
    s.myLS  = clamp(s.myLS,  0, maxMyLS);

    // ========== VOLUMES FOND ==========
    const vicVolFond = vFond(s.vicLS, s.vicDepth);
    const myVolFond  = vFond(s.myLS,  s.depth);

    // delta vs neutre (stabilisation)
    const vicDelta = vicVolFond - s.vicNeutralFond;
    const myDelta  = (myVolFond + lungBoostFond) - s.myNeutralFond;

    // ========== ACCEL ==========
    // Buoyancy : plus de volume => force vers le HAUT => vitesse devient plus NEGATIVE
	const vicAccel = -vicDelta * RA.CONF.accelPerLiter;
	const myAccel  = -myDelta  * RA.CONF.accelPerLiter;

    s.vicVel += vicAccel * dt;
    s.vel    += myAccel  * dt;

    // Drag lin + quad
    s.vicVel -= (RA.CONF.dragLin * s.vicVel + RA.CONF.dragQuad * s.vicVel * Math.abs(s.vicVel)) * dt;
    s.vel    -= (RA.CONF.dragLin * s.vel    + RA.CONF.dragQuad * s.vel    * Math.abs(s.vel))    * dt;

    // Clamp vitesses
    s.vicVel = clamp(s.vicVel, -RA.CONF.vmax, RA.CONF.vmax);
    s.vel    = clamp(s.vel,    -RA.CONF.vmax, RA.CONF.vmax);

    // Integration depth (vel positive = descente)
    s.vicDepth += s.vicVel * dt;
    s.depth    += s.vel    * dt;

    // Sangle (toi sous le blessé)
    const desiredOffset = RA.CONF.strapOffset;
    const actualOffset  = s.depth - s.vicDepth;
    const offsetError   = actualOffset - desiredOffset;
    const relativeVel   = s.vel - s.vicVel;
    const strapForce    = -RA.CONF.strapK * offsetError - RA.CONF.strapC * relativeVel;
    s.vel += strapForce * dt;

    // Clamp surface
    if(s.vicDepth < 0) s.vicDepth = 0;
    if(s.depth < 0) s.depth = 0;

    // Death > 60m
    let dead = false;
    if(s.depth > 60){
      dead = true;
      s.running = false;
    }

    const spd = (-s.vel) * 60;
    const lim = RA.CONF.speedLimit(s.depth);

    const elapsed = performance.now() - s.t0;

    return {
      spd, lim,
      depth: s.depth,
      vicDepth: s.vicDepth,
      vicVol: vicVolFond,
      myVol: myVolFond,
      vicFill: clamp(vicVolFond / RA.CONF.maxVictimFond, 0, 1),
      meFill:  clamp(myVolFond  / RA.CONF.maxMeFond,     0, 1),
      lungFill,
      narcose: s.narcose,
      dead,
      elapsed
    };
  }
};