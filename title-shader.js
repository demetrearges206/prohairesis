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
  const tooSmall = window.innerWidth < 720;
  if (reduceMotion || tooSmall) return;

  const opening = document.querySelector('.opening');
  if (!opening) return;

  // ---- Canvas setup -------------------------------------------------------
  const canvas = document.createElement('canvas');
  canvas.className = 'title-shader-canvas';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 1.2s ease-out',
    mixBlendMode: 'screen'
  });
  // Insert as first child so opening-inner stays above
  opening.style.position = 'relative';
  opening.insertBefore(canvas, opening.firstChild);

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; }

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
      float field = pow(n3, 1.6) * falloff;

      // Two-tone mix: crimson (PROHAIRESIS sphere) + cyan (signal)
      vec3 crimson = vec3(1.0, 0.33, 0.10);
      vec3 cyan    = vec3(0.06, 0.95, 0.82);
      // Tone selector drifts slowly so it isn't static
      float tone = 0.5 + 0.5 * sin(u_time*0.08 + n2*4.0 + r*3.0);
      vec3 col = mix(cyan, crimson, tone);

      // Layer a faint deeper red glow at center to seed the sphere
      float core = exp(-r*4.0) * 0.35;
      col += crimson * core * (0.55 + 0.45*sin(u_time*0.7));

      // Apply field as luminance, dim heavily so it sits behind type
      vec3 final = col * field * 0.85;

      // Slight desaturation toward black at large r
      final *= mix(0.55, 1.0, falloff);

      // Master alive multiplier
      final *= u_alive;

      gl_FragColor = vec4(final, 1.0);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
  const FRAME_MS = 1000 / 30; // 30fps cap

  function render(now){
    requestAnimationFrame(render);
    if (!visible) return;
    if (now - last < FRAME_MS) return;
    last = now;

    resize();
    gl.uniform2f(u_res, canvas.width, canvas.height);
    gl.uniform1f(u_time, now * 0.001);

    // Scroll-driven contract: 0 at top, 1 once title is fully off-screen
    const rect = opening.getBoundingClientRect();
    const vh = window.innerHeight;
    // progress: 0 when opening fully visible, 1 when fully scrolled past
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - vh*0.5)));
    gl.uniform1f(u_contract, progress);
    gl.uniform1f(u_alive, 1.0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(render);

  // Pause when opening is fully out of view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(opening);
  }

  // Fade in once first frame is rendered
  requestAnimationFrame(() => { canvas.style.opacity = '1'; });
})();
