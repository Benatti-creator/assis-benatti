// Telas dos projetos: a captura real começa como código ASCII colorido e "compila" na imagem conforme a rolagem.
// O toque ou o mouse abre uma lente com o produto pronto, como no & do topo.
const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const RAMPA = [' ', '.', ':', '-', '=', '+', '*', '/', '<', '>', '{', '}', '#', '%', '&', '@'];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

let atlasCanvas = null;
function atlas() {
  if (atlasCanvas) return atlasCanvas;
  const cw = 48, ch = 72, c = document.createElement('canvas');
  c.width = cw * RAMPA.length; c.height = ch;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 58px "JetBrains Mono", monospace';
  RAMPA.forEach((s, i) => g.fillText(s, i * cw + cw / 2, ch / 2 + 2));
  return (atlasCanvas = c);
}

const VS = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D tImg, tAtlas; uniform vec2 uRes, uCel, uImg; uniform float uN, uRevela, uTempo, uLenteOn, uDpr; uniform vec3 uLente;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 cobre(vec2 uv){ // object-fit: cover, ancorado no topo
  float ra = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = ra > ri ? vec2(1., ri / ra) : vec2(ra / ri, 1.);
  vec2 q = vec2((uv.x - .5) * s.x + .5, 1. - (1. - uv.y) * s.y);
  return vec2(q.x, 1. - q.y);
}
void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 ci = floor(px / uCel), cu = fract(px / uCel);
  vec2 cuv = (ci + .5) * uCel / uRes;
  vec3 c = texture(tImg, cobre(cuv)).rgb;
  float l = dot(c, vec3(.299, .587, .114));
  float r = h(ci);
  // compila: cada célula vira imagem no seu tempo, de cima para baixo; perto da virada, embaralha
  vec2 uvp = px / uRes;
  float img = smoothstep((1. - uvp.y) * .7 + uvp.x * .2 - .1, (1. - uvp.y) * .7 + uvp.x * .2 + .04, uRevela * 1.1 - .05);
  float perto = 0.;
  float gi = floor(clamp(.12 + (1. - l) * .86 + (r - .5) * .08, 0., .999) * uN);
  if (perto > .3 && img < .5) gi = floor(h(ci + floor(uTempo * 14.)) * uN);
  float g = texture(tAtlas, vec2((gi + cu.x) / uN, 1. - cu.y)).r;
  vec3 cor = clamp(mix(vec3(dot(c, vec3(.333))), c, 1.5) * .82, 0., 1.);
  cor = mix(cor, vec3(.06, .05, .2), smoothstep(.22, .04, l) * .6);
  vec4 cod = vec4(cor * g, g);
  vec4 real = vec4(texture(tImg, cobre(px / uRes)).rgb, 1.);
  vec4 res = mix(cod, real, img);
  // lente
  float dl = distance(px, uLente.xy);
  float dentro = (1. - smoothstep(uLente.z - 1.5 * uDpr, uLente.z, dl)) * uLenteOn;
  res = mix(res, real, dentro);
  float aro = uLenteOn * (1. - smoothstep(0., 1.4 * uDpr, abs(dl - uLente.z)));
  res = mix(res, vec4(.08, .07, .06, 1.), aro);
  o = res;
}`;

function criarTela(fig) {
  const imgEl = fig.querySelector('img');
  const canvas = document.createElement('canvas');
  canvas.className = 'tela-gl'; canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const pg = gl.createProgram();
  gl.attachShader(pg, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pg, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pg);
  gl.useProgram(pg);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pg, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pg, n);
  const tex = (src, un) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + un); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  tex(imgEl, 0); tex(atlas(), 1);
  gl.uniform1i(U('tImg'), 0); gl.uniform1i(U('tAtlas'), 1); gl.uniform1f(U('uN'), RAMPA.length);
  gl.uniform2f(U('uImg'), imgEl.naturalWidth, imgEl.naturalHeight);
  fig.appendChild(canvas); fig.classList.add('gl-ok');

  const st = { revela: reduz ? 1 : 0, alvo: 0, lx: 0, ly: 0, lenteOn: 0, ligada: false, w: 0, h: 0, dpr: 1, visivel: false, sujo: true };
  const atraso = parseFloat(fig.dataset.atraso || '0');
  function medir() {
    const r = fig.getBoundingClientRect();
    st.dpr = Math.min(devicePixelRatio || 1, 2); st.w = r.width; st.h = r.height;
    canvas.width = Math.round(r.width * st.dpr); canvas.height = Math.round(r.height * st.dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const c = (innerWidth < 760 ? 5.5 : 8) * st.dpr;
    gl.uniform2f(U('uRes'), canvas.width, canvas.height); gl.uniform2f(U('uCel'), c, c * 1.55); gl.uniform1f(U('uDpr'), st.dpr);
    st.sujo = true;
  }
  const raio = () => (innerWidth < 760 ? 54 : 84);
  function mover(e) { const r = canvas.getBoundingClientRect(); st.lx = e.clientX - r.left; st.ly = e.clientY - r.top; st.ligada = true; st.sujo = true; }
  fig.addEventListener('pointermove', mover);
  fig.addEventListener('pointerdown', mover);
  fig.addEventListener('pointerleave', () => { st.ligada = false; });
  fig.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') st.ligada = false; });
  fig.addEventListener('pointercancel', () => { st.ligada = false; });
  return {
    fig, medir, st,
    quadro(t) {
      if (!st.visivel) return;
      // alvo da compilação: a tela compila enquanto sobe do pé da janela até ~40% da altura
      const r = fig.getBoundingClientRect();
      st.alvo = reduz ? 1 : clamp((innerHeight * 0.95 - r.top) / (innerHeight * 0.6) - atraso, 0, 1);
      const antes = st.revela, lAntes = st.lenteOn;
      st.revela += (st.alvo - st.revela) * 0.12;
      st.lenteOn += ((st.ligada ? 1 : 0) - st.lenteOn) * 0.2;
      const animando = Math.abs(st.revela - antes) > 1e-4 || Math.abs(st.lenteOn - lAntes) > 1e-3 || (st.revela > 0.01 && st.revela < 0.99);
      if (!animando && !st.sujo) return;
      st.sujo = false;
      gl.uniform1f(U('uRevela'), st.revela); gl.uniform1f(U('uTempo'), t / 1000);
      gl.uniform1f(U('uLenteOn'), st.lenteOn);
      gl.uniform3f(U('uLente'), st.lx * st.dpr, (st.h - st.ly) * st.dpr, raio() * st.dpr);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
}

async function iniciar() {
  const marcar = () => document.documentElement.classList.toggle('rolou', scrollY > 30);
  addEventListener('scroll', marcar, { passive: true }); marcar();
  // entradas simples: notas do júri e linhas do terminal
  document.querySelectorAll('.term-lista li').forEach((li, i) => li.style.setProperty('--i', i));
  const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); io2.unobserve(e.target); } }), { threshold: 0.35 });
  document.querySelectorAll('.notas, .terminal').forEach(el => reduz ? el.classList.add('visto') : io2.observe(el));

  try { await Promise.race([document.fonts.load('700 58px "JetBrains Mono"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  const telas = [];
  const io = new IntersectionObserver(es => es.forEach(e => { const t = telas.find(x => x.fig === e.target); if (t) { t.st.visivel = e.isIntersecting; t.st.sujo = true; } }), { rootMargin: '200px 0px' });
  const montar = fig => {
    try { const t = criarTela(fig); if (t) { t.medir(); telas.push(t); io.observe(fig); } } catch (e) { console.warn('tela sem WebGL:', e.message); }
  };
  // cada tela nasce quando a sua imagem chega (as de baixo carregam tarde, de propósito)
  for (const fig of document.querySelectorAll('.tela')) {
    const img = fig.querySelector('img');
    if (img.complete && img.naturalWidth) montar(fig);
    else img.addEventListener('load', () => montar(fig), { once: true });
  }
  let tmr; addEventListener('resize', () => { clearTimeout(tmr); tmr = setTimeout(() => telas.forEach(t => t.medir()), 150); });
  (function laco(t) { telas.forEach(x => x.quadro(t)); requestAnimationFrame(laco); })(0);
}
iniciar();
