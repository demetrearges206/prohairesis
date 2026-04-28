/* v23a */
/* ============================================================
   sphere-aura.js — Prohairesis Ch I sphere aura shader
   ------------------------------------------------------------
   A tighter, slower flow-field tinted in pure crimson, masked
   to a soft circle behind the I-sphere SVG layer in Chapter I.
   Makes the sphere feel alive without competing with it —
   subtle organic warp inside the orbital rings.

   Performance: same envelope as title-shader.js — 30fps cap on
   desktop, 24fps mobile, low DPR. Pauses when Ch I out of view.
   ============================================================ */

(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Find Ch I scene (genesis palette)
  const scene = document.querySelector('.scene[data-palette="genesis"]');
  if (!scene) return;

  const isMobile = window.innerWidth < 720;

  // ---- Canvas setup -------------------------------------------------------
  const canvas = document.createElement('canvas');
  canvas.className = 'sphere-aura-canvas';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 2s ease-out',
    mixBlendMode: 'screen',
    zIndex: '1' // below sphere/rings layers (which sit at default z), above bg
  });
  // Insert as first child of scene so the SVG layers render on top.
  // IMPORTANT: do NOT touch `scene.style.position` here — the scene must
  // remain `position: sticky` (set in CSS) for the parallax pin to work.
  // Sticky elements are positioned and serve as the containing block for
  // our absolute-positioned canvas, so this just works.
  scene.insertBefore(canvas, scene.firstChild);

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; }

  // ---- Shaders -----------------------------------------------------------
  const VS = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const FS = `
    precision mediump float;
    uniform vec2 u_res;
    uniform float u_time;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1.,0.)), u.x),
                 mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for(int i=0;i<4;i++){ v += a*noise(p); p *= 2.05; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p = uv - 0.5;
      p.x *= u_res.x / u_res.y;

      float r = length(p);

      // Hard radial mask — only show inside the sphere's orbital halo
      // (roughly the size of the rings layer)
      float mask = smoothstep(0.42, 0.05, r);
      if (mask < 0.001) { gl_FragColor = vec4(0.0); return; }

      // Slow flow field
      float t = u_time * 0.06;
      vec2 q = p * 4.5 + vec2(t, -t*0.7);
      float n1 = fbm(q);
      float n2 = fbm(q + vec2(n1*1.3, n1*0.9) + vec2(t*0.5, 0.0));

      // Pure crimson palette, slightly warm
      vec3 deep   = vec3(0.95, 0.18, 0.06);
      vec3 bright = vec3(1.0, 0.55, 0.22);
      vec3 col = mix(deep, bright, pow(n2, 1.4));

      // Center pulse — same cadence as the SVG sphere CSS pulse
      float pulse = 0.55 + 0.45 * sin(u_time * 0.55);
      float core = exp(-r*5.5) * 0.7 * pulse;
      col += bright * core;

      // Apply field
      float field = pow(n2, 1.3) * mask;
      vec3 final = col * field * 0.9;

      gl_FragColor = vec4(final, 1.0);
    }
  `;

  function compile(t, s){ const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn('aura compile fail', gl.getShaderInfoLog(sh)); return null; }
    return sh; }
  const vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { canvas.remove(); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const a_pos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(a_pos);
  gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);

  const u_res = gl.getUniformLocation(prog, 'u_res');
  const u_time = gl.getUniformLocation(prog, 'u_time');

  function resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.5);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  resize();
  window.addEventListener('resize', resize);

  let visible = true, last = 0;
  const FRAME_MS = 1000 / (isMobile ? 24 : 30);
  function render(now){
    requestAnimationFrame(render);
    if (!visible) return;
    if (now - last < FRAME_MS) return;
    last = now;
    resize();
    gl.uniform2f(u_res, canvas.width, canvas.height);
    gl.uniform1f(u_time, now * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  requestAnimationFrame(render);

  // Pause when scene out of view (saves battery on long stories)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0 });
    // Observe the parent chapter so the aura stays alive while sticky scene is held
    io.observe(scene.closest('.chapter') || scene);
  }

  requestAnimationFrame(() => { canvas.style.opacity = '1'; });
})();
