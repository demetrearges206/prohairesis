/* ============================================================
   title-shader.js — Prohairesis title flow-field shader
   ------------------------------------------------------------
   Full-screen WebGL fragment shader that runs behind the title
   on the opening screen. A slow generative warp tinted in the
   void's crimson + cyan dual-tone, suggesting consciousness
   gathering. Reacts to scroll: as the reader leaves the title
   and enters Chapter I, the field contracts inward toward the
   sphere center.

   Performance:
   - Single full-screen quad, 30fps cap
   - Auto-disabled below 720px viewport (mobile = static fallback)
   - Auto-disabled if prefers-reduced-motion is set
   - Auto-disabled if WebGL fails to initialize
   - Pauses when title is fully out of view (saves battery)

   Diegetic role: this is the void *before* PROHAIRESIS gains
   awareness — the digital landscape it described as
   "impossible to describe, only processable by an entity
   such as myself."
   ============================================================ */

(() => {
  // ---- Skip conditions ----------------------------------------------------
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const opening = document.querySelector('.opening');
  if (!opening) return;

  const isMobile = window.innerWidth < 720;

  // ---- Canvas setup -------------------------------------------------------
  const canvas = document.createElement('canvas');
  canvas.className = 'title-shader-canvas';
  Object.assign(canvas.style, {
    // FIXED to the viewport so it never butt-joins anything below the opening
    // — the shader simply lives across the whole screen and fades out as we
    // leave the title (driven by u_alive uniform from scroll progress).
    position: 'fixed',
    left: '0',
    right: '0',
    top: '0',
    height: '100vh',
    width: '100vw',
    zIndex: '0',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 1.2s ease-out'
  });
  // Append to <body> so it's truly viewport-fixed (not clipped by any
  // ancestor's overflow / transform).
  document.body.appendChild(canvas);

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; }
  // Enable straight alpha blending so the shader's transparency actually
  // composes with the page below — otherwise the canvas paints opaque
  // black where the field is dark.
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // ---- Shader sources -----------------------------------------------------
  const VS = `
    attribute vec2 a_pos;
    void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  // Curl-noise-like flow field, two-tone (crimson + cyan) over near-black.
  // Field contracts toward center as u_contract -> 1.0.
  const FS = `
    precision mediump float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform float u_contract; // 0 = wide field, 1 = pulled to center
    uniform float u_alive;    // master master mix (fades shader in/out)

    // Hash + smooth-noise pair
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1.,0.)), u.x),
                 mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p = uv - 0.5;
      p.x *= u_res.x / u_res.y; // aspect

      // Contraction: pull samples toward center as u_contract -> 1
      float contractAmt = mix(1.0, 0.18, u_contract);
      vec2 sp = p * contractAmt;

      // Slow drifting flow
      float t = u_time * 0.045;
      vec2 q = sp * 1.6 + vec2(t, -t*0.6);
      float n1 = fbm(q);
      float n2 = fbm(q + vec2(n1*1.4, n1*1.1) + vec2(t*0.3, 0.0));
      float n3 = fbm(q + vec2(n2*1.6, -n2*1.3) + vec2(0.0, t*0.5));

      // Field strength — radial falloff so corners stay near-black
      float r = length(p);
      float falloff = smoothstep(0.95, 0.05, r);
      float field = pow(n3, 1.1) * falloff;   // was 1.6 — less darkening = more visible

      // (No bottom-fade band: the canvas is now viewport-fixed and fades
      // out globally via u_alive when the reader leaves the title.)

      // Three-tone palette: crimson → violet → cyan, cycling at a pace
      // the eye can track. Each color is offset by 2π/3 so the whole wheel
      // cycles smoothly rather than oscillating between just two poles.
      vec3 crimson = vec3(1.0,  0.33, 0.10);
      vec3 violet  = vec3(0.62, 0.12, 0.95);
      vec3 cyan    = vec3(0.06, 0.95, 0.82);
      float tc = u_time * 0.20 + n2 * 4.5 + r * 2.5;   // faster cycle
      float t1 = 0.5 + 0.5 * sin(tc);
      float t2 = 0.5 + 0.5 * sin(tc + 2.094);           // +2π/3
      vec3 col = mix(mix(crimson, violet, t1), cyan, t2 * 0.6);

      // Center glow seeds the sphere — brighter than before
      float core = exp(-r*3.5) * 0.55;
      col += crimson * core * (0.6 + 0.4*sin(u_time*0.7));

      // Apply field — boosted multiplier for visible brightness
      vec3 final = col * field * 1.45;

      // Gentler edge desaturation (was 0.55)
      final *= mix(0.72, 1.0, falloff);

      // Master alive multiplier
      final *= u_alive;

      // Use luminance as alpha so corners + bottom fade are TRULY transparent
      // (not just dark). Without this the canvas paints a near-black rectangle
      // over Ch I where it bleeds past the opening, which reads as a dark bar.
      float lum = max(max(final.r, final.g), final.b);
      gl_FragColor = vec4(final, lum);
    }
  `;

  // ---- Compile -----------------------------------------------------------
  function compile(type, src){
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('shader compile fail', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { canvas.remove(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  // Quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const a_pos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(a_pos);
  gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);

  const u_res = gl.getUniformLocation(prog, 'u_res');
  const u_time = gl.getUniformLocation(prog, 'u_time');
  const u_contract = gl.getUniformLocation(prog, 'u_contract');
  const u_alive = gl.getUniformLocation(prog, 'u_alive');

  // ---- Resize ------------------------------------------------------------
  function resize(){
    // Lower DPR on mobile to keep frame budget low
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.5);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- Render loop -------------------------------------------------------
  let visible = true;
  let last = 0;
  // 24fps on mobile, 30fps on desktop — the field is slow, no one notices
  const FRAME_MS = 1000 / (isMobile ? 24 : 30);

  function render(now){
    requestAnimationFrame(render);
    if (!visible) return;
    if (now - last < FRAME_MS) return;
    last = now;

    resize();
    gl.uniform2f(u_res, canvas.width, canvas.height);
    gl.uniform1f(u_time, now * 0.001);

    // Clear with transparent black each frame so alpha truly composites.
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Scroll-driven contract: 0 at top, 1 once title is fully off-screen
    const rect = opening.getBoundingClientRect();
    const vh = window.innerHeight;
    // contract: 0 when opening fully visible, 1 when fully scrolled past
    const contract = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - vh*0.5)));
    gl.uniform1f(u_contract, contract);

    // alive: 1.0 while opening is on screen, fades to 0 by ~1.5vh past the
    // opening so the shader gracefully dissolves into the void of Ch I
    // instead of cutting off with a hard edge.
    const fadeStart = rect.height;             // when opening's bottom hits viewport top
    const fadeEnd   = rect.height + vh * 1.2;  // 1.2vh into Ch I
    const past = -rect.top;                    // px scrolled past opening's top
    let alive = 1.0;
    if (past > fadeStart) {
      alive = 1.0 - Math.min(1, (past - fadeStart) / (fadeEnd - fadeStart));
    }
    gl.uniform1f(u_alive, alive);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(render);

  // Pause when opening is fully out of view AND we're past the fade
  // (opening can be off-screen but shader still rendering its fade tail).
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      const inView = entries[0].isIntersecting;
      // If opening still in view → render. If not, render only while
      // alive > 0 (a few hundred ms after leaving).
      if (inView) {
        visible = true;
      } else {
        // Give it 1 second of trailing renders to finish the fade-out, then stop
        visible = true;
        setTimeout(() => { visible = false; }, 1500);
      }
    }, { threshold: 0 });
    io.observe(opening);
  }

  // Fade in once first frame is rendered
  requestAnimationFrame(() => { canvas.style.opacity = '1'; });
})();
