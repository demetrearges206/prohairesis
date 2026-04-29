/* v1 */
/* ============================================================
   cryo-shader.js — Chapter II "Waking Up" cryo glow
   ------------------------------------------------------------
   A soft, cool cyan/teal plasma field centered in the Ch II
   scene — the same category of effect as the Ch I sphere aura
   but tuned to the cryo pod light aesthetic.

   Colors: #0fffd0 (teal-cyan) + #5ad7ff (sky blue) + deep indigo.
   Shape: horizontally centered bloom, taller than wide — like
   the column of light above a cryo tub. Soft top + bottom fade
   so there are no harsh edges where the scene meets the prose.

   Attached as first child of .scene[data-palette="cryo"].
   mix-blend-mode: screen — dark areas transparent, glow bleeds
   through the grid and beam layers above it.

   Pauses via IntersectionObserver when off-screen.
   Respects prefers-reduced-motion.
   ============================================================ */

(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const scene = document.querySelector('.scene[data-palette="cryo"]');
  if (!scene) return;

  const isMobile = window.innerWidth < 720;

  const canvas = document.createElement('canvas');
  canvas.className = 'cryo-shader-canvas';
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
  scene.insertBefore(canvas, scene.firstChild);

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; }

  const VS = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  // Cool cyan + teal + indigo plasma — cryo palette
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
      for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.01; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p  = uv - 0.5;
      p.x    *= u_res.x / u_res.y;

      // Very slow upward drift — like cryo coolant rising
      float t  = u_time * 0.016;
      vec2  q  = p * 1.1 + vec2(t * 0.2, -t);
      float n1 = fbm(q);
      float n2 = fbm(q + vec2(n1 * 1.3, n1 * 0.8) + vec2(0.0, -t * 0.2));
      float n3 = fbm(q + vec2(n2 * 1.1, -n2 * 0.7));

      // Tall vertical bloom — the cryo column of light.
      // Compress X more than Y so it forms a vertical pillar.
      float rx = abs(p.x) * 3.2;
      float ry = abs(p.y) * 0.75;
      float r  = sqrt(rx*rx + ry*ry);
      float falloff = smoothstep(1.15, 0.0, r);

      float field = pow(max(n3, 0.0), 1.4) * falloff;

      // Three-tone: deep indigo base → teal mid → bright cyan peak
      // #0a0a2e → (0.04, 0.04, 0.18) indigo
      // #0fffd0 → (0.059, 1.0, 0.816) teal-cyan
      // #5ad7ff → (0.353, 0.843, 1.0)  sky blue
      vec3 indigo = vec3(0.04, 0.05, 0.22);
      vec3 teal   = vec3(0.06, 0.98, 0.80);
      vec3 sky    = vec3(0.35, 0.84, 1.00);

      float tone = 0.5 + 0.5 * sin(u_time * 0.05 + n2 * 3.2 + r * 2.5);
      // Blend indigo→teal then teal→sky across the tone range
      vec3 col = tone < 0.5
        ? mix(indigo, teal, tone * 2.0)
        : mix(teal, sky, (tone - 0.5) * 2.0);

      // Generous top + bottom fade so no harsh edge where scene meets prose
      float vfade = smoothstep(0.0, 0.22, uv.y) * smoothstep(1.0, 0.78, uv.y);
      field *= mix(0.0, 1.0, vfade);

      // Faint central bloom — the lamp overhead
      float bloom = exp(-r * 2.4) * 0.20;
      col += vec3(0.1, 0.85, 0.9) * bloom;

      // Subtle pulsing brightness — the cryo pod cycling
      float pulse = 0.88 + 0.12 * sin(u_time * 0.38);

      vec3 final = col * field * 0.65 * pulse;
      gl_FragColor = vec4(final, 1.0);
    }
  `;

  function compile(t, s) {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('cryo-shader compile fail', gl.getShaderInfoLog(sh));
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
  const FRAME_MS = 1000 / (isMobile ? 22 : 28);

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
