// v2 · "&": escultura 3D renderizada como código ASCII colorido; a lente revela o produto pronto por baixo.
import * as THREE from 'three';
import { Font } from '../vendor/three/addons/FontLoader.js';
import { TextGeometry } from '../vendor/three/addons/TextGeometry.js';
import { RoomEnvironment } from '../vendor/three/addons/RoomEnvironment.js';

const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const semTresD = () => document.documentElement.classList.add('pronto', 'sem-3d');
setTimeout(() => document.documentElement.classList.add('pronto'), 4000); // o nome aparece de qualquer jeito
const temGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
if (!temGL) { semTresD(); throw new Error('sem WebGL: & estático'); }
const heroi = document.getElementById('heroi');
const canvas = document.getElementById('escultura');
const etiqueta = document.getElementById('etiquetaLente');
const pAssis = document.querySelector('.p-assis'), pBen = document.querySelector('.p-benatti');
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- renderizador e cena ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
renderer.setClearColor(0x000000, 0);
const cena = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
cena.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
camera.position.set(0, 0, 9);

// luz: um ponto quente perto da face (degradê na frente plana) + recorte laranja + céu azul
const luzes = new THREE.Group(); cena.add(luzes);
const chave = new THREE.PointLight(0xfff3e6, 30, 0, 2); chave.position.set(-1.2, 1.1, 1.4);
const quente = new THREE.PointLight(0xff4a1c, 34, 0, 2); quente.position.set(1.3, -0.9, 1.1);
const recorte = new THREE.DirectionalLight(0xff6a2a, 4); recorte.position.set(4, 1, -3);
luzes.add(chave, quente);
cena.add(recorte, new THREE.HemisphereLight(0x8fa0ff, 0x0d0820, 0.16));

const grupo = new THREE.Group(); cena.add(grupo);
const material = new THREE.MeshPhysicalMaterial({ color: 0x2235d6, roughness: 0.32, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.65 });
let malha = null, caixa = new THREE.Vector3(1, 1, 1);

const alvo = new THREE.WebGLRenderTarget(4, 4, { samples: 2 });

/* ---------- atlas de caracteres ---------- */
const RAMPA = [' ', '.', ':', '-', '=', '+', '*', '/', '<', '>', '{', '}', '#', '%', '&', '@'];
const BORDA = ['|', '-', '/', String.fromCharCode(92)];
const TODOS = RAMPA.concat(BORDA);
function criarAtlas() {
  const cw = 48, ch = 72, c = document.createElement('canvas');
  c.width = cw * TODOS.length; c.height = ch;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 58px "JetBrains Mono", monospace';
  TODOS.forEach((s, i) => g.fillText(s, i * cw + cw / 2, ch / 2 + 2));
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}

/* ---------- passe ASCII ---------- */
const U = {
  tCena: { value: alvo.texture }, tAtlas: { value: null }, uRes: { value: new THREE.Vector2(1, 1) },
  uCel: { value: new THREE.Vector2(10, 15) }, uN: { value: RAMPA.length }, uNT: { value: TODOS.length }, uTempo: { value: 0 }, uIntro: { value: 0 },
  uLente: { value: new THREE.Vector3(-999, -999, 120) }, uLenteOn: { value: 0 }, uOnda: { value: new THREE.Vector4(0, 0, -9, 0) }, uDpr: { value: 1 }
};
const passe = new THREE.ShaderMaterial({
  uniforms: U, transparent: true, depthTest: false, depthWrite: false,
  vertexShader: `void main(){ gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
  precision highp float;
  uniform sampler2D tCena, tAtlas; uniform vec2 uRes, uCel; uniform float uN, uNT, uTempo, uIntro, uLenteOn, uDpr;
  uniform vec3 uLente; uniform vec4 uOnda;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
  vec3 paleta(float t){
    vec3 a = vec3(.09,.07,.36), b = vec3(.16,.23,1.), c = vec3(1.,.29,.11), d = vec3(1.,.58,.10);
    return t < .42 ? mix(a, b, t/.42) : (t < .74 ? mix(b, c, (t-.42)/.32) : mix(c, d, (t-.74)/.26));
  }
  vec4 produto(vec2 uv){ // o render "de verdade": tom, gama, pré-multiplicado
    vec4 s = texture2D(tCena, uv); if (s.a < .001) return vec4(0.);
    vec3 c = pow(aces(s.rgb / s.a * 1.05), vec3(1./2.2)); return vec4(c * s.a, s.a);
  }
  void main(){
    vec2 px = gl_FragCoord.xy;
    vec2 ci = floor(px / uCel), cu = fract(px / uCel);
    vec2 cuv = (ci + .5) * uCel / uRes;
    vec4 s = texture2D(tCena, cuv);
    vec3 col = s.a > .001 ? pow(aces(s.rgb / s.a), vec3(1./2.2)) : vec3(0.);
    float l = pow(clamp(dot(col, vec3(.299, .587, .114)) * 1.15, 0., 1.), 1.25);
    // contorno: diferença com as células vizinhas (silhueta e quebras de luz) vira traço direcional
    vec2 dx = vec2(uCel.x, 0.) / uRes, dy = vec2(0., uCel.y) / uRes;
    vec4 sl = texture2D(tCena, cuv - dx), sr = texture2D(tCena, cuv + dx), sd = texture2D(tCena, cuv - dy), su = texture2D(tCena, cuv + dy);
    float ll = sl.a * dot(sl.rgb, vec3(.333)), lr = sr.a * dot(sr.rgb, vec3(.333)), ld = sd.a * dot(sd.rgb, vec3(.333)), lu = su.a * dot(su.rgb, vec3(.333));
    float gx = (sr.a - sl.a) + (lr - ll) * 1.6, gy = (su.a - sd.a) + (lu - ld) * 1.6;
    float borda = step(.45, s.a) * smoothstep(.28, .5, length(vec2(gx, gy)));
    float r = h(ci);
    // entrada: cada célula aparece no seu tempo, de baixo para cima, embaralhando antes de assentar
    float apar = smoothstep(r * .55, r * .55 + .25, uIntro * 1.35 - (1. - cuv.y) * .35);
    // onda do clique: um anel que embaralha os caracteres por onde passa
    float t = uTempo - uOnda.z;
    float anel = uOnda.w * (1. - smoothstep(0., 46. * uDpr, abs(distance(px, uOnda.xy) - t * 1100. * uDpr))) * (1. - smoothstep(.4, 1.3, t));
    // gravura: sombra = caractere denso, luz = caractere leve (o papel aparece no brilho)
    float gi = floor(clamp(.14 + (1. - l) * .86 + (r - .5) * .08, 0., .999) * uN);
    if (borda > .5) {
      float ax = abs(gx), ay = abs(gy);
      gi = ax > ay * 2.2 ? uN : (ay > ax * 2.2 ? uN + 1. : (gx * gy > 0. ? uN + 3. : uN + 2.));
    }
    float emb = max(1. - apar, anel);
    if (emb > .02) gi = mix(gi, floor(h(ci + floor(uTempo * 16.)) * uN), step(.35, emb));
    float g = texture2D(tAtlas, vec2((gi + cu.x) / uNT, cu.y)).r;
    // cor do próprio render, saturada; o quase branco (brilho) vira laranja para não sumir no papel
    vec3 cor = col; float cin = dot(col, vec3(.333));
    cor = mix(vec3(cin), cor, 1.35);
    cor = mix(cor, vec3(1., .36, .12), smoothstep(.55, .9, cin));
    cor = mix(cor, vec3(.05, .04, .2), smoothstep(.25, .05, cin) * .7); // sombra funda vira tinta azul-noite
    cor = clamp(cor * .92, 0., 1.);
    cor = mix(cor, vec3(.06, .05, .22), borda * .85);
    cor = mix(cor, vec3(.08, .07, .06), anel * .5);
    float a = g * step(.45, s.a) * max(apar, anel);
    vec4 cod = vec4(cor * a, a);
    // lente: dentro dela, o produto pronto
    float dl = distance(px, uLente.xy);
    float dentro = (1. - smoothstep(uLente.z - 1.5 * uDpr, uLente.z, dl)) * uLenteOn;
    vec4 o = mix(cod, produto(px / uRes), dentro);
    float aro = uLenteOn * (1. - smoothstep(.0, 1.4 * uDpr, abs(dl - uLente.z)));
    o = mix(o, vec4(vec3(.08, .07, .06), 1.), aro);
    // marcas do aro (4 traços), como numa lupa de precisão
    vec2 dv = px - uLente.xy; float ang = atan(dv.y, dv.x);
    float traco = uLenteOn * step(uLente.z, dl) * (1. - step(uLente.z + 9. * uDpr, dl)) * step(.985, cos(ang * 4.)) ;
    o = mix(o, vec4(vec3(.08, .07, .06), 1.), traco);
    gl_FragColor = o;
  }`
});
const cenaPasse = new THREE.Scene();
cenaPasse.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), passe));
const camPasse = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

/* ---------- medidas ---------- */
let W = 1, H = 1, dpr = 1, tetoDpr = 2, cel = false, centroTela = { x: 0.5, y: 0.5 }, raioLente = 120, meia = { x: 100, y: 100 };
function medir() {
  W = heroi.clientWidth; H = heroi.clientHeight; cel = W < 760;
  dpr = Math.min(window.devicePixelRatio || 1, tetoDpr);
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
  alvo.setSize(Math.round(W * dpr), Math.round(H * dpr));
  camera.aspect = W / H; camera.updateProjectionMatrix();
  U.uRes.value.set(W * dpr, H * dpr); U.uDpr.value = dpr;
  const c = cel ? 6.5 : 8.5;
  U.uCel.value.set(c * dpr, c * 1.55 * dpr);
  raioLente = cel ? 60 : 92;
  posicionar();
}
function posicionar() {
  if (!malha) return;
  const Hv = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), Wv = Hv * camera.aspect;
  // o & ocupa o espaço livre entre as palavras, sem encostar nelas (caixas reais, sem transform)
  const caixaDe = el => ({ l: el.offsetLeft, t: el.offsetTop, r: el.offsetLeft + el.offsetWidth, b: el.offsetTop + el.offsetHeight });
  const prop = caixa.x / caixa.y, pxU = H / Hv, oferta = document.querySelector('.b-oferta');
  let R;
  if (!cel) {
    // computador: "Assis & Benatti" numa linha só, centralizado; o & em código entre as palavras; o texto logo abaixo
    const fs = parseFloat(getComputedStyle(pAssis).fontSize);
    const wA = pAssis.offsetWidth, wB = pBen.offsetWidth, hP = pAssis.offsetHeight;
    const eH = fs * 1.75, eW = eH * prop, g = fs * 0.08;
    const total = wA + g + eW + g + wB, x0 = Math.max(24, (W - total) / 2), cy = H * 0.43, topo = cy - hP / 2;
    Object.assign(pAssis.style, { left: x0 + 'px', top: topo + 'px', right: 'auto', bottom: 'auto' });
    Object.assign(pBen.style, { left: (x0 + wA + 2 * g + eW) + 'px', top: topo + 'px', right: 'auto', bottom: 'auto' });
    Object.assign(oferta.style, { left: x0 + 'px', top: Math.max(topo + hP + fs * 0.42, cy + eH * 0.44 + 24) + 'px' });
    R = { x0: x0 + wA + g, x1: x0 + wA + g + eW, y0: cy - eH * 0.56, y1: cy + eH * 0.44 };
  } else {
    [pAssis, pBen, oferta].forEach(el => { el.style.left = el.style.top = el.style.right = el.style.bottom = ''; });
    const A = caixaDe(pAssis), B = caixaDe(pBen);
    R = { x0: 18, x1: W - 18, y0: A.b + 18, y1: B.t - 14 };
  }
  const altPx = Math.min((R.y1 - R.y0) * 0.94, (R.x1 - R.x0) * 0.9 / prop);
  const s = altPx / (caixa.y * pxU);
  centroTela = { x: (R.x0 + R.x1) / 2 / W, y: (R.y0 + R.y1) / 2 / H };
  meia = { x: caixa.x * s / Wv * W / 2, y: caixa.y * s / Hv * H / 2 };
  grupo.scale.setScalar(s);
  grupo.position.set((centroTela.x - 0.5) * Wv, (0.5 - centroTela.y) * Hv, 0);
  luzes.position.copy(grupo.position); luzes.scale.setScalar(s);
}

/* ---------- interação ---------- */
const estado = { rotY: reduz ? -0.12 : -1.7, rotX: 0, vel: 0, mx: 0, my: 0, mxS: 0, myS: 0, arrastando: false, ultX: 0, ultT: 0, moveu: 0,
  lx: 0, ly: 0, ptrX: -1, ptrY: -1, ptrAte: 0, toqueAte: 0, introT0: 0 };
function ponto(e) { const r = heroi.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
heroi.addEventListener('pointermove', e => {
  const p = ponto(e);
  estado.mx = p.x / W * 2 - 1; estado.my = p.y / H * 2 - 1;
  estado.ptrX = p.x; estado.ptrY = p.y; estado.ptrAte = performance.now() + (e.pointerType === 'mouse' ? 3200 : 1600);
  if (estado.arrastando) {
    const agora = performance.now(), dx = p.x - estado.ultX;
    estado.rotY += dx * 0.0085; estado.vel = dx * 0.0085 / Math.max(8, agora - estado.ultT) * 16;
    estado.ultX = p.x; estado.ultT = agora; estado.moveu += Math.abs(dx);
  }
});
heroi.addEventListener('pointerdown', e => {
  if (e.target.closest('a,button')) return;
  const p = ponto(e);
  estado.arrastando = true; estado.ultX = p.x; estado.ultT = performance.now(); estado.moveu = 0; estado.vel = 0;
  estado.ptrX = p.x; estado.ptrY = p.y; estado.ptrAte = performance.now() + 1600;
  heroi.classList.add('arrastando'); heroi.setPointerCapture(e.pointerId);
  if (e.pointerType !== 'mouse') estado.toqueAte = performance.now() + 900;
});
function soltar(e) {
  if (!estado.arrastando) return;
  estado.arrastando = false; heroi.classList.remove('arrastando');
  if (e.pointerType !== 'mouse') estado.toqueAte = performance.now() + 700;
  if (estado.moveu < 6) { // clique: onda + empurrão
    const p = ponto(e);
    U.uOnda.value.set(p.x * dpr, (H - p.y) * dpr, U.uTempo.value, 1);
    estado.vel += reduz ? 0 : 0.16;
  }
}
heroi.addEventListener('pointerup', soltar);
heroi.addEventListener('pointercancel', soltar);
heroi.addEventListener('pointerleave', () => { estado.ptrAte = Math.min(estado.ptrAte, performance.now() + 600); });


/* qualidade adaptativa: se o aparelho não sustenta ~35 quadros por segundo, a resolução da arte baixa um degrau
   (2 → 1,5). A grade ASCII mantém o mesmo tamanho; em aparelho bom nada muda. */
const ritmo = { n: 0, soma: 0, ult: 0 };
function vigiar(agora) {
  const d = agora - ritmo.ult; ritmo.ult = agora;
  if (d <= 0 || d > 250) { ritmo.n = 0; ritmo.soma = 0; return; } // aba escondida, pausa ou fora da tela
  if (++ritmo.n <= 20) return;                                     // aquecimento
  ritmo.soma += d; if (ritmo.n < 110) return;
  const media = ritmo.soma / (ritmo.n - 20); ritmo.n = 0; ritmo.soma = 0;
  if (media > 28 && dpr > 1.5) { tetoDpr = dpr >= 2.5 ? 2 : 1.5; medir(); }
}

/* ---------- laço ---------- */
let heroiVisivel = true;
new IntersectionObserver(es => { heroiVisivel = es[0].isIntersecting; }).observe(heroi);
let t0 = 0, ultimo = 0;
function quadro(agora) {
  const dt = Math.min(0.05, (agora - (ultimo || agora)) / 1000); ultimo = agora;
  const t = (agora - t0) / 1000;
  U.uTempo.value = t;

  // entrada (1,9 s)
  const ki = reduz ? 1 : clamp(t / 1.9, 0, 1);
  U.uIntro.value = ki;
  const e = 1 - Math.pow(1 - ki, 3);

  // giro: entrada, balanço ocioso, arrasto com inércia
  if (!estado.arrastando) {
    estado.rotY += estado.vel; estado.vel *= Math.pow(0.93, dt * 60);
    if (!reduz && Math.abs(estado.vel) < 0.002) { // volta suave para o balanço
      const balanco = Math.sin(t * 0.32) * 0.18;
      const perto = Math.round((estado.rotY - balanco) / (Math.PI * 2)) * Math.PI * 2 + balanco;
      estado.rotY = lerp(estado.rotY, perto, ki < 1 ? 0.06 : 0.018);
    }
  }
  estado.mxS = lerp(estado.mxS, estado.mx, 0.06); estado.myS = lerp(estado.myS, estado.my, 0.06);
  grupo.rotation.y = estado.rotY + estado.mxS * 0.22;
  grupo.rotation.x = estado.myS * 0.1 + (1 - e) * 0.5;

  // lente: só existe enquanto o mouse está sobre o & (ou o dedo encosta nele); pequena, sem etiqueta
  const cx = centroTela.x * W, cy = centroTela.y * H;
  const sobre = agora < estado.ptrAte && Math.abs(estado.ptrX - cx) < meia.x * 0.95 && Math.abs(estado.ptrY - cy) < meia.y * 0.95;
  const ligada = ki >= 1 && (cel ? (estado.arrastando || agora < estado.toqueAte) : sobre);
  estado.lx = lerp(estado.lx || estado.ptrX, estado.ptrX, 0.35); estado.ly = lerp(estado.ly || estado.ptrY, estado.ptrY, 0.35);
  U.uLente.value.set(estado.lx * dpr, (H - estado.ly) * dpr, raioLente * dpr);
  U.uLenteOn.value = lerp(U.uLenteOn.value, ligada ? 1 : 0, 0.18);
  if (!ligada && U.uLenteOn.value < 0.02) U.uLenteOn.value = 0;
  etiqueta.style.opacity = 0;

  // palavras: entram de baixo e acompanham o ponteiro em sentidos opostos (profundidade)
  if (!reduz) {
    pAssis.style.transform = `translate3d(${-estado.mxS * 14}px,${-estado.myS * 8 + (1 - e) * 60}px,0)`;
    pBen.style.transform = `translate3d(${estado.mxS * 20}px,${estado.myS * 12 + (1 - e) * 80}px,0)`;
    pAssis.style.opacity = pBen.style.opacity = Math.min(1, ki * 1.6);
  }

  if (heroiVisivel) {
  vigiar(agora);
  renderer.setRenderTarget(alvo); renderer.render(cena, camera);
  renderer.setRenderTarget(null); renderer.render(cenaPasse, camPasse);
  }
  requestAnimationFrame(quadro);
}

/* ---------- início ---------- */
async function comecar() {
  try { await Promise.race([document.fonts.load('700 58px "JetBrains Mono"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  try { await Promise.race([document.fonts.load('800 100px "Bodoni Moda"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  U.tAtlas.value = criarAtlas();
  // só o glifo do & (pré-extraído da Bodoni Moda itálico 800): evita baixar o opentype.js e a fonte inteira
  const json = await fetch('assets/fontes/e-comercial.json').then(r => { if (!r.ok) throw new Error('fonte'); return r.json(); });
  const fonte = new Font(json);
  const geo = new TextGeometry('&', { font: fonte, size: 1, height: 0.36, depth: 0.36, curveSegments: 16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.022, bevelSegments: 6 });
  geo.center(); geo.computeBoundingBox(); geo.computeVertexNormals();
  geo.boundingBox.getSize(caixa);
  malha = new THREE.Mesh(geo, material); grupo.add(malha);
  medir();
  document.documentElement.classList.add('pronto');
  t0 = performance.now();
  requestAnimationFrame(quadro);
  let tmr; addEventListener('resize', () => { clearTimeout(tmr); tmr = setTimeout(medir, 120); });
  document.fonts.ready.then(() => medir());
}
comecar().catch(e => { console.warn('3D indisponível:', e && e.message); semTresD(); });
