/* global RA, performance */
RA.state = {
  S: null,
  startDepth: 40,
  victimWeightKg: 75,

  init(depth, victimWeightKg){
    depth = depth ?? 40;
    victimWeightKg = victimWeightKg ?? 75;

    const P0 = RA.CONF.pAbs(depth);

    // Neutre en litres fond : gilet pas vide au départ
    const vicNeutralFond = RA.util.clamp(
      2.8 + (victimWeightKg - 75) * 0.03,
      1.8,
      RA.CONF.maxVictimFond * 0.85
    );
    const myNeutralFond  = RA.util.clamp(
      2.3,
      1.5,
      RA.CONF.maxMeFond * 0.85
    );

    return {
      depth, vel: 0,
      vicDepth: depth, vicVel: 0,

      // LS stocké (Boyle)
      vicLS: vicNeutralFond * P0,
      myLS:  myNeutralFond  * P0,

      // Références neutres (litres fond)
      vicNeutralFond,
      myNeutralFond,

      // Respiration
      lungMode: "normal",   // normal | inhale | exhale
      lungTimer: 0,
      breathT: 0,

      // Inputs
      inflate: false,
      purgeV: false,
      purgeS: false,

      // Timing
      t0: performance.now(),
      running: true,

      // FX
      narcose: 0
    };
  }
};