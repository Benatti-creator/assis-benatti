// Vitrine dos trabalhos: uma tela 3D renderizada como código ASCII (mesma linguagem do & do topo).
// Rolando, ela gira e troca de projeto; parada de frente, o código vira o produto real. O toque abre a lente.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/three/addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from '../vendor/three/addons/RoomEnvironment.js';

const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sec = document.getElementById('vitrine'); if (!sec) throw new Error('sem vitrine');
const palco = sec.querySelector('.vit-palco'), canvas = sec.querySelector('.vit-canvas');
const itens = [...sec.querySelectorAll('.vit-item')], marcas = [...sec.querySelectorAll('.vit-indice button')];
const N = itens.length;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
const suave = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- texturas (computador e celular de cada projeto) ---------- */
async function imagem(src) {
  const celular = innerWidth < 760;
  const img = new Image(); img.src = celular ? src.replace(/\.webp$/, '-m.webp') : src; await img.decode().catch(() => {});
  const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (celular) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  t.needsUpdate = true; return t;
}
function desenho(tipo, cel) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const W = cel ? 780 : 1440, H = cel ? 1688 : 900; c.width = W; c.height = H;
  if (tipo === 'notas') {
    g.fillStyle = '#ECE7DC'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#14120F'; g.font = 'italic 800 ' + (cel ? 70 : 64) + 'px "Bodoni Moda", serif';
    if (cel) { g.fillText('Notas do júri', 60, 170); g.fillText('no meu perfil', 60, 250); } else g.fillText('Notas do júri no meu perfil', 90, 140);
    const notas = [['7,3', 0], ['7,9', 1], ['8,3', 2], ['8,5', 3]];
    if (!cel) {
      g.setLineDash([16, 14]); g.strokeStyle = '#2A3BFF'; g.lineWidth = 5; g.beginPath(); g.moveTo(90, 470); g.lineTo(1350, 470); g.stroke(); g.setLineDash([]);
      g.font = '500 30px "JetBrains Mono", monospace'; g.fillStyle = '#2A3BFF'; g.fillText('aprova a partir de 8', 90, 452);
      [640, 520, 440, 400].forEach((y, i) => { g.fillStyle = i === 3 ? '#FF4A1C' : '#14120F'; g.font = (i === 3 ? 'italic ' : '') + '800 180px "Bodoni Moda", serif'; g.fillText(notas[i][0], 90 + i * 325, y + 130); });
      g.font = '500 30px "JetBrains Mono", monospace'; g.fillStyle = '#4A453C';
      ['rodada 1', 'rodada 2', 'rodada 3', 'rodada 4 · aprovado'].forEach((s, i) => g.fillText(s, 96 + i * 320, 860));
    } else {
      notas.forEach(([n], i) => { const y = 1500 - i * 290; g.fillStyle = i === 3 ? '#FF4A1C' : '#14120F'; g.font = (i === 3 ? 'italic ' : '') + '800 230px "Bodoni Moda", serif'; g.fillText(n, 60 + i * 70, y);
        g.font = '500 32px "JetBrains Mono", monospace'; g.fillStyle = '#4A453C'; g.fillText('rodada ' + (i + 1), 470, y - 20); });
      g.setLineDash([16, 14]); g.strokeStyle = '#2A3BFF'; g.lineWidth = 5; g.beginPath(); g.moveTo(40, 760); g.lineTo(740, 760); g.stroke(); g.setLineDash([]);
      g.font = '500 30px "JetBrains Mono", monospace'; g.fillStyle = '#2A3BFF'; g.fillText('aprova a partir de 8', 60, 740);
    }
  } else {
    g.fillStyle = '#14120F'; g.fillRect(0, 0, W, H);
    const fs = cel ? 30 : 38, x2 = cel ? 60 : 420, passo = cel ? 120 : 62;
    g.font = '500 ' + fs + 'px "JetBrains Mono", monospace';
    g.fillStyle = '#FF8A5C'; g.fillText(cel ? '$ pentest-web' : '$ pentest-web --alvo seu-site.com.br', cel ? 50 : 80, cel ? 130 : 110);
    if (cel) { g.fillText('  --alvo seu-site.com.br', 50, 180); }
    const linhas = ['certificado SSL/TLS e cifras fracas', 'cabeçalhos de segurança', 'arquivos sensíveis expostos', 'XSS refletido e em DOM', 'injeção de SQL e de comandos', 'CORS, cookies, redirecionamento', 'SSRF, SSTI, XXE e NoSQL', 'painéis de administração expostos', 'SPF, DKIM e DMARC do e-mail', 'limite de tentativas no login'];
    linhas.forEach((s, i) => {
      const y = (cel ? 300 : 200) + i * passo;
      g.fillStyle = '#8C93FF'; g.fillText('→ verificando', cel ? 50 : 80, y);
      g.fillStyle = '#EDE6D6'; g.fillText(s, cel ? 50 : x2, cel ? y + 42 : y);
    });
    g.fillStyle = '#A69F90'; g.fillText('… e mais 35.', cel ? 50 : 80, cel ? 1560 : 850);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
async function texturasDe(item) {
  const d = item.dataset;
  if (d.desenho) return { pc: desenho(d.desenho, false), cel: desenho(d.desenho, true) };
  const [pc, cel] = await Promise.all([imagem(d.pc), imagem(d.cel)]);
  return { pc, cel };
}

/* ---------- cena ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true });
renderer.setClearColor(0, 0);
const cena = new THREE.Scene();
cena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture;
const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100); camera.position.set(0, 0, 9);
const luzes = new THREE.Group(); cena.add(luzes);
const k1 = new THREE.PointLight(0xfff3e6, 30, 0, 2); k1.position.set(-1.6, 1.4, 2); const k2 = new THREE.PointLight(0xff4a1c, 30, 0, 2); k2.position.set(1.8, -1.2, 1.4);
luzes.add(k1, k2); cena.add(new THREE.DirectionalLight(0xff6a2a, 3).translateX(4).translateZ(-3), new THREE.HemisphereLight(0x8fa0ff, 0x0d0820, 0.2));
const grupo = new THREE.Group(); cena.add(grupo);
const corpoMat = new THREE.MeshStandardMaterial({ color: 0x14120f, roughness: 0.62, metalness: 0.05, envMapIntensity: 0.3 });
// notebook (tampa + base) e celular na frente, à direita: o projeto nos dois tamanhos ao mesmo tempo
const DUO = { w: 2.3, h: 1.45 };
const duo = new THREE.Group(); duo.position.set(-0.16, 0.07, 0); grupo.add(duo);
const telaMat = () => new THREE.MeshBasicMaterial({ toneMapped: false });
const note = new THREE.Group(); duo.add(note);
const tampa = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.0, 0.03, 4, 0.02), corpoMat); tampa.position.y = 0.1;
const telaPc = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.95), telaMat()); telaPc.position.set(0, 0.1, 0.0155);
const baseNote = new THREE.Mesh(new RoundedBoxGeometry(1.74, 0.035, 0.6, 4, 0.016), corpoMat);
baseNote.position.set(0, -0.415, 0.3);
note.add(tampa, telaPc, baseNote); note.rotation.x = 0.06;
const fone = new THREE.Group(); duo.add(fone);
const corpoFone = new THREE.Mesh(new RoundedBoxGeometry(0.5, 1.06, 0.04, 5, 0.06), corpoMat);
const telaCel = new THREE.Mesh(new THREE.PlaneGeometry(0.468, 1.028), telaMat()); telaCel.position.z = 0.0205;
fone.add(corpoFone, telaCel); fone.position.set(0.86, -0.2, 1.0); fone.rotation.set(0.02, -0.2, 0);
const alvo = new THREE.WebGLRenderTarget(4, 4, { samples: 4 });

/* ---------- passe ASCII (igual ao do topo, com "revela") ---------- */
const RAMPA = [' ', '.', ':', '-', '=', '+', '*', '/', '<', '>', '{', '}', '#', '%', '&', '@'];
const TODOS = RAMPA.concat(['|', '-', '/', String.fromCharCode(92)]);
function atlas() {
  const cw = 48, ch = 72, c = document.createElement('canvas'); c.width = cw * TODOS.length; c.height = ch;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 58px "JetBrains Mono", monospace';
  TODOS.forEach((s, i) => g.fillText(s, i * cw + cw / 2, ch / 2 + 2));
  const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; return t;
}
const U = { tCena: { value: alvo.texture }, tAtlas: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uCel: { value: new THREE.Vector2(10, 15) },
  uN: { value: RAMPA.length }, uNT: { value: TODOS.length }, uTempo: { value: 0 }, uRevela: { value: 0 }, uEmbaralha: { value: 0 }, uLente: { value: new THREE.Vector3(-999, -999, 90) }, uLenteOn: { value: 0 }, uDpr: { value: 1 } };
const passe = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthTest: false, depthWrite: false,
  vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `precision highp float;
  uniform sampler2D tCena, tAtlas; uniform vec2 uRes, uCel; uniform float uN, uNT, uTempo, uRevela, uEmbaralha, uLenteOn, uDpr; uniform vec3 uLente;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
  // produto: a tela sai com a cor exata da captura (sem o tom do 3D, que lavava a imagem)
  vec4 produto(vec2 uv){ vec4 s = texture2D(tCena, uv); if (s.a < .001) return vec4(0.); vec3 c = pow(clamp(s.rgb / s.a, 0., 1.), vec3(1./2.2)); return vec4(c * s.a, s.a); }
  void main(){
    vec2 px = gl_FragCoord.xy, ci = floor(px / uCel), cu = fract(px / uCel), cuv = (ci + .5) * uCel / uRes;
    vec4 s = texture2D(tCena, cuv);
    vec3 col = s.a > .001 ? pow(aces(s.rgb / s.a), vec3(1./2.2)) : vec3(0.);
    float l = pow(clamp(dot(col, vec3(.299, .587, .114)) * 1.1, 0., 1.), 1.2);
    vec2 dx = vec2(uCel.x, 0.) / uRes, dy = vec2(0., uCel.y) / uRes;
    vec4 sl = texture2D(tCena, cuv - dx), sr = texture2D(tCena, cuv + dx), sd = texture2D(tCena, cuv - dy), su = texture2D(tCena, cuv + dy);
    float gx = (sr.a - sl.a), gy = (su.a - sd.a);
    float borda = step(.45, s.a) * smoothstep(.3, .55, length(vec2(gx, gy)));
    float r = h(ci);
    float gi = floor(clamp(.12 + (1. - l) * .86 + (r - .5) * .08, 0., .999) * uN);
    if (borda > .5) { float ax = abs(gx), ay = abs(gy); gi = ax > ay * 2.2 ? uN : (ay > ax * 2.2 ? uN + 1. : (gx * gy > 0. ? uN + 3. : uN + 2.)); }
    // troca de projeto: sem caracteres aleatórios; o código é sempre o desenho da própria tela
    float g = texture2D(tAtlas, vec2((gi + cu.x) / uNT, cu.y)).r;
    vec3 cor = col; float cin = dot(col, vec3(.333)); cor = mix(vec3(cin), cor, 1.4);
    cor = mix(cor, vec3(1., .36, .12), smoothstep(.62, .95, cin) * .8);
    cor = clamp(cor * .9, 0., 1.); cor = mix(cor, vec3(.06, .05, .22), borda * .85);
    float a = g * step(.45, s.a);
    vec4 cod = vec4(cor * a, a);
    // código vira produto numa varredura diagonal suave (de cima para baixo), sem blocos soltos
    vec2 uvp = px / uRes;
    float onda = (1. - uvp.y) * .75 + uvp.x * .25;
    float mostra = smoothstep(onda - .14, onda + .02, uRevela * 1.16 - .08);
    vec4 o = mix(cod, produto(uvp), mostra);
    float dl = distance(px, uLente.xy), dentro = (1. - smoothstep(uLente.z - 1.5 * uDpr, uLente.z, dl)) * uLenteOn;
    o = mix(o, produto(px / uRes), dentro);
    o = mix(o, vec4(.08, .07, .06, 1.), uLenteOn * (1. - smoothstep(0., 1.4 * uDpr, abs(dl - uLente.z))));
    gl_FragColor = o;
  }` });
const cenaPasse = new THREE.Scene(); cenaPasse.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), passe));
const camPasse = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

/* ---------- medidas ---------- */
let W = 1, H = 1, dpr = 1, tetoDpr = 3, cel = false, centro = { x: 0.5, y: 0.5 }, escalaTela = 1;
function medir() {
  W = palco.clientWidth; H = palco.clientHeight; cel = W < 760; dpr = Math.min(devicePixelRatio || 1, tetoDpr);
  renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); alvo.setSize(Math.round(W * dpr), Math.round(H * dpr));
  camera.aspect = W / H; camera.updateProjectionMatrix();
  U.uRes.value.set(W * dpr, H * dpr); U.uDpr.value = dpr;
  const c = cel ? 6 : 9; U.uCel.value.set(c * dpr, c * 1.55 * dpr);
  const Hv = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), Wv = Hv * camera.aspect;
  encaixar(true);
}
// onde a tela 3D cabe: computador, à direita do texto; celular, entre a barra do topo e o texto do projeto ativo
let alvoPos = new THREE.Vector3(), alvoEsc = 1;
function encaixar(ja) {
  const Hv = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), Wv = Hv * camera.aspect, pxU = H / Hv;
  const it = itens[Math.max(0, atual)], forma = DUO;
  let x0, x1, y0, y1;
  if (!cel) { x0 = W * 0.38; x1 = W - 40; y0 = 96; y1 = H - 110; }
  else {
    const topoTexto = it ? it.getBoundingClientRect().top - palco.getBoundingClientRect().top : H * 0.55;
    x0 = 18; x1 = W - 18; y0 = 78; y1 = Math.max(y0 + 120, topoTexto - 18);
  }
  // a rotação durante a troca alarga um pouco a tela: folga de 8%
  const esc = Math.min((y1 - y0) * 0.92 / (forma.h * pxU), (x1 - x0) * 0.9 / (forma.w * pxU));
  centro = { x: (x0 + x1) / 2 / W, y: (y0 + y1) / 2 / H };
  alvoEsc = esc; alvoPos.set((centro.x - 0.5) * Wv, (0.5 - centro.y) * Hv, 0);
  if (ja) { grupo.position.copy(alvoPos); grupo.scale.setScalar(alvoEsc); }
}

/* ---------- interação ---------- */
const st = { lx: 0, ly: 0, ligada: false, mx: 0, my: 0, mxS: 0, myS: 0, visivel: false };
palco.addEventListener('pointermove', e => { const b = palco.getBoundingClientRect(); st.lx = e.clientX - b.left; st.ly = e.clientY - b.top; st.mx = st.lx / W * 2 - 1; st.my = st.ly / H * 2 - 1;
  const perto = Math.abs(st.lx - centro.x * W) < W * (cel ? 0.4 : 0.3) && Math.abs(st.ly - centro.y * H) < H * (cel ? 0.24 : 0.36); st.ligada = e.pointerType === 'mouse' ? perto : st.ligada; });
palco.addEventListener('pointerdown', e => { const b = palco.getBoundingClientRect(); st.lx = e.clientX - b.left; st.ly = e.clientY - b.top; st.ligada = true; st.t0 = performance.now(); st.x0 = e.clientX; st.y0 = e.clientY; });
palco.addEventListener('pointerup', e => {
  if (e.pointerType !== 'mouse') {
    st.ligada = false;
    const rapido = performance.now() - (st.t0 || 0) < 350 && Math.hypot(e.clientX - st.x0, e.clientY - st.y0) < 10;
    const b = palco.getBoundingClientRect(), y = e.clientY - b.top;
    const naTela = Math.abs(y - centro.y * H) < H * 0.25;
    const link = itens[atual] && itens[atual].dataset.link;
    if (rapido && naTela && link && !e.target.closest('a,button') && U.uRevela.value > 0.9) window.open(link, '_blank', 'noopener');
    return;
  }
  if (e.target.closest('a,button')) return;
  const link = itens[atual] && itens[atual].dataset.link;
  if (link && st.ligada && U.uRevela.value > 0.9) window.open(link, '_blank', 'noopener');
});
palco.addEventListener('pointercancel', () => { st.ligada = false; });
palco.addEventListener('pointerleave', () => { st.ligada = false; });
marcas.forEach((b, i) => b.addEventListener('click', () => {
  const total = sec.offsetHeight - innerHeight; scrollTo({ top: (sec.getBoundingClientRect().top + scrollY) + total * (i / (N - 1)), behavior: reduz ? 'auto' : 'smooth' });
}));
new IntersectionObserver(es => { st.visivel = es[0].isIntersecting; }, { rootMargin: '100px 0px' }).observe(sec);


/* qualidade adaptativa: se o aparelho não sustenta ~35 quadros por segundo, a resolução da arte baixa um degrau
   (3 → 2 → 1,5). A grade ASCII mantém o mesmo tamanho; em aparelho bom nada muda. */
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
let texturas = [], atual = -1, t0 = performance.now();
function quadro(agora) {
  requestAnimationFrame(quadro);
  if (!st.visivel || !texturas.length) return;
  vigiar(agora);
  const t = (agora - t0) / 1000; U.uTempo.value = t;
  const total = Math.max(1, sec.offsetHeight - innerHeight);
  const p = clamp((scrollY - (sec.getBoundingClientRect().top + scrollY)) / total, 0, 1) * (N - 1);
  // a tela "descansa" em cada projeto e gira entre eles
  const base = Math.floor(p), f = p - base, e = base + suave(0.36, 0.64, f);
  const idx = clamp(Math.round(e), 0, N - 1), desvio = e - Math.round(e);
  if (idx !== atual) {
    atual = idx;
    telaPc.material.map = texturas[idx].pc; telaPc.material.needsUpdate = true;
    telaCel.material.map = texturas[idx].cel; telaCel.material.needsUpdate = true;
    itens.forEach((x, i) => x.classList.toggle('ativo', i === idx)); marcas.forEach((x, i) => x.classList.toggle('ativo', i === idx));
    requestAnimationFrame(() => encaixar(false));
    // índice com rolagem lateral (celular): mantém o projeto ativo inteiro à vista, sem mexer na página
    const m = marcas[idx], ind = m && m.parentElement;
    if (ind && ind.scrollWidth > ind.clientWidth) ind.scrollTo({ left: Math.max(0, m.offsetLeft - (ind.clientWidth - m.offsetWidth) / 2), behavior: reduz ? 'auto' : 'smooth' });
  }
  grupo.position.lerp(alvoPos, 0.15); grupo.scale.setScalar(lerp(grupo.scale.x, alvoEsc, 0.15));
  luzes.position.copy(grupo.position); luzes.scale.copy(grupo.scale);
  st.mxS = lerp(st.mxS, st.mx, 0.06); st.myS = lerp(st.myS, st.my, 0.06);
  grupo.rotation.y = (reduz ? 0 : desvio * 0.55) + Math.sin(t * 0.5) * (reduz ? 0 : 0.03) - 0.09 + st.mxS * 0.08;
  grupo.rotation.x = -0.02 + st.myS * 0.05;
  U.uRevela.value = reduz ? 1 : 1 - suave(0.03, 0.2, Math.abs(desvio));
  palco.style.cursor = (!cel && st.ligada && itens[atual] && itens[atual].dataset.link) ? 'pointer' : '';
  U.uLenteOn.value = lerp(U.uLenteOn.value, st.ligada ? 1 : 0, 0.2); if (!st.ligada && U.uLenteOn.value < 0.02) U.uLenteOn.value = 0;
  U.uLente.value.set(st.lx * dpr, (H - st.ly) * dpr, (cel ? 62 : 96) * dpr);
  renderer.setRenderTarget(alvo); renderer.render(cena, camera);
  renderer.setRenderTarget(null); renderer.render(cenaPasse, camPasse);
}

(async () => {
  try { await Promise.race([Promise.all([document.fonts.load('700 58px "JetBrains Mono"'), document.fonts.load('italic 800 64px "Bodoni Moda"'), document.fonts.load('800 64px "Bodoni Moda"')]), new Promise(r => setTimeout(r, 2000))]); } catch (e) {}
  U.tAtlas.value = atlas();
  texturas = await Promise.all(itens.map(texturasDe));
  medir(); requestAnimationFrame(quadro);
  let tmr; addEventListener('resize', () => { clearTimeout(tmr); tmr = setTimeout(medir, 120); });
})().catch(e => { console.warn('vitrine sem 3D:', e && e.message); sec.classList.add('sem-3d'); });
