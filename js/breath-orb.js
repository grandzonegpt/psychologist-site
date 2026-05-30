/* breath-orb.js: premium WebGL breathing orb, shared across breathing practices.
   Usage: <div class="orb-engine" data-phases='[["inhale",4],["hold",4],["exhale",4],["hold",4]]'
                data-cycles="6" data-shape="box"></div>  + /css/orb.css
   Self-initializing. Falls back to a CSS orb without WebGL; respects reduced-motion. v1 */
(function(){
  "use strict";
  function init(root){
    var lang=(document.documentElement.getAttribute("lang")||"ru").slice(0,2);
    var pl = lang==="pl";
    var T = pl ? {
      inhale:"Wdech", hold:"Zatrzymanie", exhale:"Wydech", ready:"Gotów?", done:"Gotowe",
      cycle:"Cykl", of:"z", start:"Zacznij", pause:"Pauza", resume:"Wznów", reset:"Reset", again:"Jeszcze raz",
      settings:"Ustawienia", phaseLen:"Długość fazy", cycles:"Cykle", sound:"Delikatny dźwięk",
      haptics:"Wibracja w telefonie", sec:"s"
    } : {
      inhale:"Вдох", hold:"Задержка", exhale:"Выдох", ready:"Готов?", done:"Готово",
      cycle:"Цикл", of:"из", start:"Начать", pause:"Пауза", resume:"Продолжить", reset:"Сброс", again:"Ещё раз",
      settings:"Настройки", phaseLen:"Длина фазы", cycles:"Циклов", sound:"Мягкий звук",
      haptics:"Вибрация на телефоне", sec:"с"
    };
    function labelOf(key){ return key==="inhale"?T.inhale : key==="exhale"?T.exhale : T.hold; }

    var phases;
    try{ phases = JSON.parse(root.getAttribute("data-phases")||"[]"); }catch(e){ phases=[]; }
    if(!phases.length) phases=[["inhale",4],["hold",4],["exhale",4],["hold",4]];
    var cycles = parseInt(root.getAttribute("data-cycles")||"6",10);
    var shape = root.getAttribute("data-shape")||"box";
    if(shape==="box" && phases.length!==4) shape="ring";

    var baseDur = phases.map(function(p){return p[1];});
    var allEqual = baseDur.every(function(d){return d===baseDur[0];});
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- build DOM ----------
    var boxSvg = '<svg class="orb-svg" viewBox="0 0 360 360" aria-hidden="true">'
      + '<rect class="orb-box-path" x="56" y="56" width="248" height="248" rx="30"/>'
      + '<rect class="orb-box-progress orb-prog" x="56" y="56" width="248" height="248" rx="30"/></svg>';
    var ringSvg = '<svg class="orb-svg" viewBox="0 0 360 360" aria-hidden="true">'
      + '<circle class="orb-box-path" cx="180" cy="180" r="132"/>'
      + '<circle class="orb-box-progress orb-prog" cx="180" cy="180" r="132" transform="rotate(-90 180 180)"/></svg>';

    var lenRow = allEqual
      ? '<div class="orb-row"><label for="oLen">'+T.phaseLen+'</label><input type="range" id="oLen" min="3" max="6" step="1" value="'+baseDur[0]+'"><span class="orb-val"><span class="oLenV">'+baseDur[0]+'</span> '+T.sec+'</span></div>'
      : '';

    root.classList.add("orb-engine");
    root.innerHTML =
      '<div class="orb-cycle">'+T.cycle+' <b class="oCyc">1</b> '+T.of+' <b class="oCycT">'+cycles+'</b></div>'
      + '<div class="orb-stage">'
        + '<canvas class="orb-canvas"></canvas>'
        + '<div class="orb-fallback"></div>'
        + (shape==="box"?boxSvg:ringSvg)
        + '<span class="orb-dot"></span>'
        + '<div class="orb-readout"><div class="orb-phase">'+T.ready+'</div><div class="orb-count">·</div></div>'
      + '</div>'
      + '<p class="orb-live" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></p>'
      + '<div class="orb-controls">'
        + '<button class="orb-btn is-primary oStart">'+T.start+'</button>'
        + '<button class="orb-btn oPause" hidden>'+T.pause+'</button>'
        + '<button class="orb-btn oReset" hidden>'+T.reset+'</button>'
      + '</div>'
      + '<button class="orb-set-toggle" aria-expanded="false">'+T.settings+' <span class="chev">⌄</span></button>'
      + '<div class="orb-panel"><div class="orb-panel-inner">'
        + lenRow
        + '<div class="orb-row"><label for="oCyc">'+T.cycles+'</label><input type="range" id="oCyc" min="3" max="10" step="1" value="'+cycles+'"><span class="orb-val oCycV">'+cycles+'</span></div>'
        + '<div class="orb-row"><label for="oSnd">'+T.sound+'</label><span class="orb-switch"><input type="checkbox" id="oSnd"><span class="orb-track"></span></span></div>'
        + '<div class="orb-row"><label for="oHap">'+T.haptics+'</label><span class="orb-switch"><input type="checkbox" id="oHap"><span class="orb-track"></span></span></div>'
      + '</div></div>';

    var $=function(s){return root.querySelector(s);};
    var stage=$(".orb-stage"), canvas=$(".orb-canvas"), fb=$(".orb-fallback"),
        prog=$(".orb-prog"), dot=$(".orb-dot"), phaseEl=$(".orb-phase"), countEl=$(".orb-count"),
        live=$(".orb-live"), cycEl=$(".oCyc"), cycTEl=$(".oCycT"),
        bStart=$(".oStart"), bPause=$(".oPause"), bReset=$(".oReset");

    var cfg={ len:baseDur[0], cycles:cycles, sound:false, haptics:false };
    // working durations array (mutable when allEqual)
    function durs(){ return allEqual ? phases.map(function(){return cfg.len;}) : baseDur; }

    // ---------- WebGL ----------
    var gl=null, uni={}, glOK=false;
    var FSH = [
"precision highp float;",
"uniform vec2 uRes; uniform float uTime,uRadius,uWarm,uCalm;",
"float hash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }",
"float noise(vec3 x){ vec3 i=floor(x),f=fract(x); f=f*f*(3.0-2.0*f);",
" return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),",
"            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }",
"float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*noise(p); p=p*2.02+vec3(1.3); a*=0.5; } return s; }",
"vec3 pal(float t){ return vec3(0.46,0.46,0.40)+vec3(0.30,0.26,0.22)*cos(6.2831*(vec3(1.0)*t+vec3(0.0,0.10,0.20))); }",
"void main(){",
" vec2 p=(gl_FragCoord.xy-0.5*uRes)/min(uRes.x,uRes.y); float r=length(p); float R=uRadius;",
" vec3 sage=vec3(0.40,0.50,0.32),gold=vec3(0.80,0.63,0.39),cream=vec3(1.0,0.97,0.90);",
" vec3 col=vec3(0.0); float alpha=0.0;",
" float glow=pow(smoothstep(R*2.0,R*0.78,r),1.6); vec3 gc=mix(sage,gold,uWarm*0.7);",
" col+=gc*glow*0.5; alpha+=glow*0.45;",
" if(r<R+0.004){",
"  float z=sqrt(max(R*R-r*r,1e-5)); vec3 nrm=normalize(vec3(p,z)); float t=uTime*0.16;",
"  vec3 q=nrm*2.3+vec3(0.0,t,0.0);",
"  vec3 warp=vec3(fbm(q),fbm(q+vec3(4.7,1.2,8.3)),fbm(q+vec3(t*0.6,3.1,1.7)));",
"  float flow=fbm(nrm*1.6+warp*1.7+vec3(0.0,t*1.1,0.0));",
"  float amp=mix(0.14,0.46,uCalm); vec3 n2=normalize(nrm+amp*(warp-0.5));",
"  vec3 Ld=normalize(vec3(-0.35,0.65,0.9)); float diff=clamp(dot(n2,Ld)*0.5+0.58,0.0,1.0);",
"  float fres=pow(1.0-clamp(z,0.0,1.0),2.6);",
"  vec3 base=mix(sage,gold,clamp(uWarm*0.7+flow*0.45,0.0,1.0));",
"  base=mix(base,pal(flow*0.55+fres*0.35+uWarm*0.2),0.16);",
"  vec3 sph=base*diff; sph+=cream*fres*0.55; sph+=cream*pow(diff,7.0)*0.55; sph+=gc*flow*0.06;",
"  float edge=smoothstep(R,R-0.006,r); col=mix(col,sph,edge); alpha=mix(alpha,1.0,edge);",
" }",
" float g=hash(vec3(gl_FragCoord.xy,floor(uTime*30.0)))*0.028-0.014; col+=g*alpha;",
" gl_FragColor=vec4(col*alpha,alpha);",
"}"].join("\n");
    var VSH="attribute vec2 aPos; void main(){ gl_Position=vec4(aPos,0.0,1.0); }";

    try{ gl=canvas.getContext("webgl",{premultipliedAlpha:true,alpha:true,antialias:true})||canvas.getContext("experimental-webgl"); }catch(e){}
    function comp(t,s){ var sh=gl.createShader(t); gl.shaderSource(sh,s); gl.compileShader(sh);
      return gl.getShaderParameter(sh,gl.COMPILE_STATUS)?sh:null; }
    if(gl){
      var vs=comp(gl.VERTEX_SHADER,VSH), fs=comp(gl.FRAGMENT_SHADER,FSH);
      if(vs&&fs){
        var pr=gl.createProgram(); gl.attachShader(pr,vs); gl.attachShader(pr,fs); gl.linkProgram(pr);
        if(gl.getProgramParameter(pr,gl.LINK_STATUS)){
          gl.useProgram(pr);
          var b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
          gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
          var loc=gl.getAttribLocation(pr,"aPos"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
          ["uRes","uTime","uRadius","uWarm","uCalm"].forEach(function(n){uni[n]=gl.getUniformLocation(pr,n);});
          gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0,0,0,0);
          glOK=true;
        }
      }
    }
    if(!glOK){ canvas.style.display="none"; fb.style.display="block"; }
    function resize(){ if(!glOK)return; var dpr=Math.min(window.devicePixelRatio||1,2);
      var w=Math.round(stage.clientWidth*dpr),h=Math.round(stage.clientHeight*dpr);
      if(canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; gl.viewport(0,0,w,h); } }
    window.addEventListener("resize",resize);

    // progress geometry
    var PLEN = prog.getTotalLength();
    prog.style.strokeDasharray=PLEN; prog.style.strokeDashoffset=PLEN;
    function dotXY(t){ var f=(t*4)%1,side=Math.floor(t*4)%4,x=0,y=0;
      if(side===0){x=-1+f*2;y=-1;}else if(side===1){x=1;y=-1+f*2;}else if(side===2){x=1-f*2;y=1;}else{x=-1;y=1-f*2;} return{x:x,y:y}; }
    function placeDotBox(t){ var rc=stage.getBoundingClientRect(); var tr=rc.width*(248/360)/2; var pt=dotXY(t);
      dot.style.transform="translate(calc(-50% + "+(pt.x*tr).toFixed(1)+"px), calc(-50% + "+(pt.y*tr).toFixed(1)+"px))"; }
    function placeDotRing(c){ var rc=stage.getBoundingClientRect(); var rad=rc.width*(132/360); var a=c*6.2831-1.5708;
      dot.style.transform="translate(calc(-50% + "+(Math.cos(a)*rad).toFixed(1)+"px), calc(-50% + "+(Math.sin(a)*rad).toFixed(1)+"px))"; }

    // uniforms (smoothed)
    var vis={radius:0.18,warm:0.18,calm:0.5}, tgt={radius:0.18,warm:0.18,calm:0.5};
    var RMIN=0.18,RMAX=0.30;
    function scaleToRadius(s){ return RMIN+(s-0.55)/(1.0-0.55)*(RMAX-RMIN); }

    // audio
    var actx=null;
    function ensureAudio(){ if(!actx){ try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } if(actx&&actx.state==="suspended") actx.resume(); }
    function chime(f){ if(!cfg.sound||!actx)return; var t=actx.currentTime,o=actx.createOscillator(),g=actx.createGain();
      o.type="sine"; o.frequency.value=f; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.05,t+0.04);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.9); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+1.0); }
    function freqFor(key){ return key==="inhale"?523.25 : key==="exhale"?392.0 : 466.16; }

    // engine state
    var st={ running:false, paused:false, phase:0, cycle:1, elapsed:0, last:0, curScale:0.55, warmTarget:0.05 };

    function easeInOutSine(p){ return -(Math.cos(Math.PI*p)-1)/2; }
    function phaseKey(i){ return phases[i][0]; }
    function cycleTotal(){ return durs().reduce(function(a,b){return a+b;},0); }
    function elapsedInCycle(){ var d=durs(),s=0; for(var i=0;i<st.phase;i++) s+=d[i]; return s+st.elapsed; }

    function onPhaseEnter(){
      var key=phaseKey(st.phase);
      phaseEl.textContent=labelOf(key);
      phaseEl.style.opacity=0; phaseEl.style.transform="translateY(4px)";
      requestAnimationFrame(function(){ phaseEl.style.opacity=1; phaseEl.style.transform="translateY(0)"; });
      live.textContent=labelOf(key);
      chime(freqFor(key));
      if(cfg.haptics&&navigator.vibrate) navigator.vibrate(26);
      if(key==="inhale") st.warmTarget=0.05; else if(key==="exhale") st.warmTarget=1.0; // holds keep previous
      tgt.warm=st.warmTarget;
      tgt.calm=(key==="hold")?0.28:1.0;
    }
    function renderBreath(){
      var key=phaseKey(st.phase), dur=durs()[st.phase], pr=Math.min(st.elapsed/dur,1);
      var from, to;
      if(key==="inhale"){ from=0.55; to=1.0; } else if(key==="exhale"){ from=1.0; to=0.55; } else { from=st.curScale; to=st.curScale; }
      var s = (key==="hold") ? from : (from+(to-from)*easeInOutSine(pr));
      st.curScale=s; tgt.radius=scaleToRadius(s);
      countEl.textContent=Math.max(0,Math.ceil(dur-st.elapsed-1e-6)); countEl.classList.remove("is-mark");
      if(shape==="box"){ var tLoop=(st.phase+pr)/4; placeDotBox(tLoop); prog.style.strokeDashoffset=PLEN*(1-tLoop); }
      else { var c=elapsedInCycle()/cycleTotal(); placeDotRing(c); prog.style.strokeDashoffset=PLEN*(1-c); }
    }

    function start(){
      ensureAudio();
      st.running=true; st.paused=false; st.phase=0; st.cycle=1; st.elapsed=0; st.curScale=0.55;
      cycEl.textContent=1; root.classList.add("is-live");
      bStart.hidden=true; bPause.hidden=false; bReset.hidden=false; bPause.textContent=T.pause;
      onPhaseEnter(); renderBreath();
    }
    function togglePause(){ st.paused=!st.paused; bPause.textContent=st.paused?T.resume:T.pause;
      phaseEl.textContent=st.paused?(pl?"Pauza":"Пауза"):labelOf(phaseKey(st.phase)); }
    function reset(){ st.running=false; st.paused=false; root.classList.remove("is-live");
      tgt.radius=RMIN; tgt.warm=0.18; tgt.calm=0.5; prog.style.strokeDashoffset=PLEN;
      phaseEl.textContent=T.ready; countEl.textContent="·"; countEl.classList.remove("is-mark"); cycEl.textContent=1;
      bStart.hidden=false; bStart.textContent=T.start; bPause.hidden=true; bReset.hidden=true; }
    function finish(){ st.running=false; root.classList.remove("is-live");
      tgt.radius=0.24; tgt.warm=1.0; tgt.calm=0.35; prog.style.strokeDashoffset=0;
      phaseEl.textContent=T.done; phaseEl.style.opacity=1; phaseEl.style.transform="none";
      countEl.textContent="✓"; countEl.classList.add("is-mark"); live.textContent=T.done;
      if(cfg.haptics&&navigator.vibrate) navigator.vibrate([30,60,30]);
      bStart.hidden=false; bStart.textContent=T.again; bPause.hidden=true; bReset.hidden=false; }

    function draw(now){
      vis.radius+=(tgt.radius-vis.radius)*0.12; vis.warm+=(tgt.warm-vis.warm)*0.05; vis.calm+=(tgt.calm-vis.calm)*0.06;
      if(glOK){
        gl.uniform2f(uni.uRes,canvas.width,canvas.height);
        gl.uniform1f(uni.uTime,reduce?0.0:now*0.001);
        gl.uniform1f(uni.uRadius,vis.radius); gl.uniform1f(uni.uWarm,vis.warm); gl.uniform1f(uni.uCalm,vis.calm);
        gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      } else { var k=(vis.radius-RMIN)/(RMAX-RMIN); fb.style.transform="scale("+(0.7+k*0.45).toFixed(3)+")"; }
    }

    var hidden=false;
    document.addEventListener("visibilitychange",function(){ hidden=document.hidden; });
    function frame(now){
      requestAnimationFrame(frame);
      if(hidden) return;
      var dt=st.last?(now-st.last)/1000:0; st.last=now; if(dt>0.25) dt=0.25;
      if(st.running&&!st.paused){
        st.elapsed+=dt;
        var d=durs()[st.phase];
        if(st.elapsed>=d){
          st.elapsed-=d; st.phase=(st.phase+1)%phases.length;
          if(st.phase===0){ st.cycle++; if(st.cycle>cfg.cycles){ finish(); } else { cycEl.textContent=st.cycle; onPhaseEnter(); } }
          else onPhaseEnter();
        }
        if(st.running) renderBreath();
      }
      draw(now);
    }
    requestAnimationFrame(frame);

    // wiring
    bStart.addEventListener("click",start);
    bPause.addEventListener("click",togglePause);
    bReset.addEventListener("click",reset);
    var setT=$(".orb-set-toggle"), panel=$(".orb-panel");
    setT.addEventListener("click",function(){ var o=panel.classList.toggle("is-open"); setT.setAttribute("aria-expanded",o?"true":"false"); });
    var lenInput=$("#oLen"); if(lenInput) lenInput.addEventListener("input",function(){ cfg.len=+this.value; $(".oLenV").textContent=cfg.len; });
    $("#oCyc").addEventListener("input",function(){ cfg.cycles=+this.value; $(".oCycV").textContent=cfg.cycles; cycTEl.textContent=cfg.cycles; });
    $("#oSnd").addEventListener("change",function(){ cfg.sound=this.checked; if(cfg.sound) ensureAudio(); });
    $("#oHap").addEventListener("change",function(){ cfg.haptics=this.checked; });

    resize();
  }

  function boot(){ var el=document.querySelector(".orb-engine[data-phases]"); if(el) init(el); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
