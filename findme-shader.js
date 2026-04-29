/* v1 */
/* ============================================================
   findme-shader.js — Chapter IV "Ghost in the Shell" background
   ------------------------------------------------------------
   A slow phosphor-green + deep-red plasma field that pulses
   behind the HUD. Evokes a ship's reactor core — alive but
   contained. Two-tone: warm green wash (mission-control phosphor)
   with rare crimson alert flares.

   Attached to the Ch IV .scene[data-palette="findme"] so it
   sits behind the HUD SVG layer. mix-blend-mode: screen means
   the near-black void stays dark; only the plasma bleeds through.

   Pauses via IntersectionObserver when Ch IV is off-screen.
   Disabled on prefers-reduced-motion.
   ============================================================ */

(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const scene = document.querySelector('.scene[data-palette="findme"]');
  if (!scene) return;

  const isMobile = window.innerWidth < 720;

  const canvas = document.createElement('canvas');
  canvas.className = 'findme-shader-canvas';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 3s ease-out',
    mixBlendMode: 'screen',
  });
  // Insert as first child — sits behind all layer divs (z-index 0 < layers default)
  scene.insertBefore(canvas, scene.firstChild);

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; }

  const VS = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  // Phosphor green + crimson alert plasma — find-me palette
  const FS = `
    precision mediump float;
    uniform vec2  u_res;
    uniform float u_time;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i),           hash(i+vec2(1.,0.)), u.x),
                 mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p  = uv - 0.5;
      p.x    *= u_res.x / u_res.y;

      // Very slow vertical drift — ominous reactor pulse
      float t  = u_time * 0.018;
      vec2  q  = p * 1.2 + vec2(t * 0.3, t);
      float n1 = fbm(q);
      float n2 = fbm(q + vec2(n1 * 1.4, n1 * 0.9) + vec2(0.0, t * 0.25));
      float n3 = fbm(q + vec2(n2 * 1.2, -n2 * 0.8));

      // Vertical elongated falloff — tall reactor beam shape
      float rx = abs(p.x) * 2.2;
      float ry = abs(p.y) * 0.9;
      float r  = sqrt(rx*rx + ry*ry);
      float falloff = smoothstep(1.1, 0.0, r);

      float field = pow(max(n3, 0.0), 1.6) * falloff;

      // Two-tone: phosphor green + crimson alert
      // #a8d088  → 0.659, 0.816, 0.533
      // #ff4a3a  → 1.000, 0.290, 0.227
      vec3 green   = vec3(0.659, 0.816, 0.533);
      vec3 crimson = vec3(1.000, 0.290, 0.227);

      // Slow oscillation with noise — mostly green, rare crimson flare
      float tone = 0.5 + 0.5 * sin(u_time * 0.04 + n2 * 2.5 + r * 1.5);
      // Bias heavily toward green — crimson only bleeds in on high-tone peaks
      float alertMix = pow(max(0.0, tone - 0.65) / 0.35, 2.0);
      vec3 col = mix(green, crimson, alertMix);

      // Vertical soft fades so the very top and bottom edges don't hard-clip
      float vfade = smoothstep(0.0, 0.14, uv.y) * smoothstep(1.0, 0.86, uv.y);
      field *= mix(0.3, 1.0, vfade);

      // Faint central bloom — the reactor core
      float bloom = exp(-r * 2.8) * 0.14;
      col += vec3(0.5, 0.9, 0.4) * bloom;

      // Keep it dim — the HUD should dominate
      vec3 final = col * field * 0.55;
      gl_FragColor = vec4(final, 1.0);
    }
  `;

  function compile(t, s) {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('findme-shader compile fail', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { canvas.remove(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const a_pos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(a_pos);
  gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);

  const u_res  = gl.getUniformLocation(prog, 'u_res');
  const u_time = gl.getUniformLocation(prog, 'u_time');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.5);
    const w = Math.floor(canvas.clientWidth  * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  resize();
  window.addEventListener('resize', resize);

  let visible = false, last = 0;
  const FRAME_MS = 1000 / (isMobile ? 20 : 26);

  function render(now) {
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

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => {
      visible = e[0].isIntersecting;
      if (visible) canvas.style.opacity = '1';
    }, { threshold: 0 });
    io.observe(scene);
  } else {
    canvas.style.opacity = '1';
    visible = true;
  }
})();
