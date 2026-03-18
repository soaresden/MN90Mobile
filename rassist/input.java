/* global RA */
RA.input = {
  init(){
    const s = () => RA.state.S;

    const hold = (id, flag) => {
      const el = document.getElementById(id);
      if(!el) return;

      const on  = (e) => { e?.preventDefault?.(); const st=s(); if(st) st[flag]=true;  el.classList.add("held"); };
      const off = (e) => { e?.preventDefault?.(); const st=s(); if(st) st[flag]=false; el.classList.remove("held"); };

      el.addEventListener("mousedown", on);
      el.addEventListener("mouseup", off);
      el.addEventListener("mouseleave", off);

      el.addEventListener("touchstart", on, {passive:false});
      el.addEventListener("touchend", off, {passive:false});
      el.addEventListener("touchcancel", off, {passive:false});
    };

    hold("btn-inflate", "inflate");
    hold("btn-purge-v", "purgeV");
    hold("btn-purge-s", "purgeS");

    const clickBreath = (id, mode) => {
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener("click", () => {
        const st = s();
        if(!st) return;
        st.lungMode = mode;
        st.lungTimer = RA.CONF.overrideBreathSec;
      });
    };

    clickBreath("btn-inhale", "inhale");
    clickBreath("btn-exhale", "exhale");

    document.addEventListener("keydown", (e) => {
      const st = s();
      if(!st) return;

      if(e.repeat && (e.code==="KeyE" || e.code==="KeyV")) return;

      if(e.code==="Space") st.inflate = true;
      if(e.code==="KeyE")  st.purgeV = true;
      if(e.code==="KeyV")  st.purgeS = true;

      if(e.code==="KeyD"){ st.lungMode="inhale"; st.lungTimer=RA.CONF.overrideBreathSec; }
      if(e.code==="KeyF"){ st.lungMode="exhale"; st.lungTimer=RA.CONF.overrideBreathSec; }

      document.querySelectorAll(".kb-key").forEach(k=>{
        if(k.dataset.key===e.code) k.classList.add("pressed");
      });
    });

    document.addEventListener("keyup", (e) => {
      const st = s();
      if(!st) return;

      if(e.code==="Space") st.inflate = false;
      if(e.code==="KeyE")  st.purgeV = false;
      if(e.code==="KeyV")  st.purgeS = false;

      document.querySelectorAll(".kb-key").forEach(k=>{
        if(k.dataset.key===e.code) k.classList.remove("pressed");
      });
    });
  }
};
