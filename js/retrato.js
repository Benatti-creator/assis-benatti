// Retrato em arte de código: desenha os dados de retrato-dados.js num canvas 2D.
// Entra montando de cima para baixo; onde o dedo ou o mouse passa, os caracteres embaralham.
(() => {
  const D = window.RETRATO; const fig = document.querySelector('.retrato'); if (!D || !fig) return;
  const cv = fig.querySelector('canvas'), g = cv.getContext('2d');
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = D.cols * D.rows, RAMPA = D.rampa;
  const cor = i => { const k = D.cores.charCodeAt(i) - 48; return k ? '#' + D.paleta[k - 1] : null; };
  const cores = Array.from({ length: N }, (_, i) => cor(i));
  const hash = i => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  let W = 0, cw = 0, chh = 0, dpr = 1, t0 = -1, ativo = true, px = -999, py = -999, ateQuando = 0;
  function medir() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = fig.clientWidth;
    cw = W / D.cols; chh = cw * 1.55;
    cv.width = Math.round(W * dpr); cv.height = Math.round(chh * D.rows * dpr);
    cv.style.height = (chh * D.rows) + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.font = `700 ${cw * 1.62}px "JetBrains Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    ativo = true;
  }
  function desenhar(agora) {
    const t = t0 < 0 ? 0 : (agora - t0) / 1000;
    g.clearRect(0, 0, W, chh * D.rows);
    let animando = false;
    const raio = innerWidth < 760 ? 44 : 64, emb = Math.floor(agora / 60);
    for (let r = 0; r < D.rows; r++) for (let c = 0; c < D.cols; c++) {
      const i = r * D.cols + c, ch = D.glifos[i]; if (ch === ' ') continue;
      const atraso = (r / D.rows) * 0.9 + hash(i) * 0.35, k = reduz ? 1 : (t - atraso) / 0.45;
      if (k <= 0) { animando = true; continue; }
      const x = (c + 0.5) * cw, y = (r + 0.5) * chh;
      let s = ch, cc = cores[i];
      if (k < 1) { animando = true; s = RAMPA[1 + Math.floor(hash(i + emb) * (RAMPA.length - 1))]; }
      const dx = x - px, dy = y - py;
      if (dx * dx + dy * dy < raio * raio) { s = RAMPA[1 + Math.floor(hash(i * 7 + emb) * (RAMPA.length - 1))]; cc = '#FF4A1C'; animando = true; }
      g.fillStyle = cc; g.globalAlpha = Math.min(1, k); g.fillText(s, x, y);
    }
    g.globalAlpha = 1;
    return animando;
  }
  function laco(agora) {
    if (ativo || agora < ateQuando) { const a = desenhar(agora); ativo = a; }
    requestAnimationFrame(laco);
  }
  const mover = e => { const b = cv.getBoundingClientRect(); px = e.clientX - b.left; py = e.clientY - b.top; ativo = true; ateQuando = performance.now() + 500; };
  fig.addEventListener('pointermove', mover); fig.addEventListener('pointerdown', mover);
  fig.addEventListener('pointerleave', () => { px = py = -999; ativo = true; ateQuando = performance.now() + 200; });
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting && t0 < 0) { t0 = performance.now(); ativo = true; } }, { threshold: 0.25 });
  (async () => {
    try { await Promise.race([document.fonts.load('700 20px "JetBrains Mono"'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
    medir(); io.observe(fig); requestAnimationFrame(laco);
    let tmr; addEventListener('resize', () => { clearTimeout(tmr); tmr = setTimeout(medir, 150); });
  })();
})();
