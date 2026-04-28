/* v23a */
/* ============================================================
   closing-shader.js — Prohairesis closing plasma shader
   ------------------------------------------------------------
   A drifting magenta + cobalt plasma field behind the closing
   "fin." and the moral question. Bookends the experience —
   the void after the choice. Slower and more meditative than
   the title shader.
   ============================================================ */

(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const closing = document.querySelector('.closing');
  if (!closing) return;

  const isMobile = window.innerWidth < 720;

  const canvas = document.createElement('canvas');
  canvas.className = 'closing-shader-canvas';
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 2.5s ease-out',
    mixBlendMode: 'screen'
  });
  closing.style.position = 'relative';
  closing.insertBefore(canvas, closing.firstChild);

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; }

  const VS = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  // Magenta + cobalt blue plasma — echoes Ch V Choice palette
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
      for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res.xy;
      vec2 p = uv - 0.5;
      p.x *= u_res.x / u_res.y;

      // Even slower drift than the title shader — meditative
      float t = u_time * 0.025;
      vec2 q = p * 1.4 + vec2(t, t*0.4);
      float n1 = fbm(q);
      float n2 = fbm(q + vec2(n1*1.6, n1*1.2) + vec2(0.0, t*0.3));
      float n3 = fbm(q + vec2(n2*1.4, -n2*1.0));

      float r = length(p);
      float falloff = smoothstep(1.05, 0.05, r);
      float field = pow(n3, 1.5) * falloff;

      // Two-tone: magenta + cobalt
      vec3 magenta = vec3(0.95, 0.22, 0.78);
      vec3 cobalt  = vec3(0.18, 0.32, 0.95);
      float tone = 0.5 + 0.5 * sin(u_time*0.06 + n2*3.0 + r*2.0);
      vec3 col = mix(cobalt, magenta, tone);

      // Soft top + bottom fades so the question text reads cleanly
      float vfade = smoothstep(0.0, 0.18, uv.y) * smoothstep(1.0, 0.82, uv.y);
      field *= mix(0.35, 1.0, vfade);

      // Faint center bloom
      float bloom = exp(-r*3.0) * 0.18;
      col += vec3(0.6, 0.4, 0.8) * bloom;

      vec3 final = col * field * 0.7;
      gl_FragColor = vec4(final, 1.0);
    }
  `;

  function compile(t, s){ const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.warn('closing compile fail', gl.getShaderInfoLog(sh)); return null; }
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

  let visible = false, last = 0;
  const FRAME_MS = 1000 / (isMobile ? 22 : 28);
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

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => {
      visible = e[0].isIntersecting;
      if (visible) canvas.style.opacity = '1';
    }, { threshold: 0 });
    io.observe(closing);
  } else {
    canvas.style.opacity = '1';
    visible = true;
  }
})();
