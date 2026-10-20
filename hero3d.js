// «Живое фото» на приветствии онбординга: картинка мамы с малышом и карта глубины дают объём —
// ближние планы (еда, малыш) смещаются сильнее дальних (стена), камера мягко плавает. Картинка не обрезается.
// Чистый WebGL без библиотек. Без WebGL остаётся обычная картинка <img>.

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main(){ uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
varying vec2 uv;
uniform sampler2D img, depth;
uniform vec2 shift;      // смещение камеры
uniform float focus;     // плоскость, которая стоит на месте (лица)
uniform vec2 cover;      // подгонка картинки под рамку, как object-fit: cover
void main(){
  // картинка целиком, без обрезки и приближения
  vec2 c = (1.0 - cover) * 0.5 + uv * cover;
  // у краёв сдвиг гаснет: рамка не «съедает» картинку и края не тянутся
  vec2 e = smoothstep(0.0, 0.08, c) * smoothstep(0.0, 0.08, 1.0 - c);
  vec2 sh = shift * e.x * e.y;
  // несколько шагов: точнее обходит края предметов, меньше «резины»
  vec2 q = c;
  for (int i = 0; i < 3; i++) {
    float d = texture2D(depth, q).r;
    q = c + sh * (d - focus);
  }
  gl_FragColor = texture2D(img, clamp(q, 0.001, 0.999));
}`;

function loadImage(src) {
  return new Promise((ok, fail) => { const im = new Image(); im.onload = () => ok(im); im.onerror = fail; im.src = src; });
}

export async function mount(canvas, { src, depthSrc, still = false }) {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) throw new Error("no webgl");
  const [im, dm] = await Promise.all([loadImage(src), loadImage(depthSrc)]);

  const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog); gl.useProgram(prog);

  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = (unit, image) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const tImg = tex(0, im), tDepth = tex(1, dm);
  const U = n => gl.getUniformLocation(prog, n);
  gl.uniform1i(U("img"), 0); gl.uniform1i(U("depth"), 1);
  gl.uniform1f(U("focus"), 0.62);
  const uShift = U("shift"), uCover = U("cover");

  let w = 0, h = 0;
  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (!W || (W === w && H === h)) return;
    w = W; h = H; canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H);
    const ia = im.width / im.height, ca = W / H;
    gl.uniform2f(uCover, ca > ia ? 1 : ca / ia, ca > ia ? ia / ca : 1);
  }

  // палец или мышь слегка поворачивают «камеру»
  let px = 0, py = 0, tx = 0, ty = 0;
  const onMove = e => { const r = canvas.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2; };
  const onLeave = () => { tx = 0; ty = 0; };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);

  function frame(ms) {
    resize();
    const s = ms / 1000;
    px += (tx - px) * 0.06; py += (ty - py) * 0.06;
    // плавная «восьмёрка» камеры + параллакс от пальца
    const sx = Math.sin(s * 0.55) * 0.022 + px * 0.018;
    const sy = Math.sin(s * 0.9) * 0.010 + py * 0.012;
    gl.uniform2f(uShift, sx, sy);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  let raf = 0, running = false;
  const loop = t => { frame(t); raf = requestAnimationFrame(loop); };
  const api = {
    start() { if (running) return; running = true; if (still) { frame(0); } else raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
    dispose() {
      api.stop(); canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerleave", onLeave);
      gl.deleteTexture(tImg); gl.deleteTexture(tDepth); gl.deleteBuffer(buf); gl.deleteProgram(prog);
    }
  };
  api.start();
  return api;
}
