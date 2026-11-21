// Botão fixo de orçamento (celular): nunca atrapalha a leitura.
// Aparece só quando a pessoa rola para CIMA (gesto de quem procura algo) depois do topo; some ao rolar para baixo,
// dentro da vitrine (que já tem os próprios botões) e no contato. O "Orçamento" do menu do topo fica sempre à mão.
const barra = document.getElementById('barraOrc'), heroi = document.getElementById('heroi');
const ocultar = [document.getElementById('vitrine'), document.getElementById('contato')];
const dentro = new Set();
const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? dentro.add(e.target) : dentro.delete(e.target)); atualizar(); }, { threshold: 0.12 });
ocultar.forEach(el => el && io.observe(el));
let ultimoY = scrollY, subindo = false, parado;
function atualizar() {
  const pode = scrollY > heroi.offsetHeight * 0.75 && dentro.size === 0;
  barra.classList.toggle('on', pode && subindo);
}
addEventListener('scroll', () => {
  const y = scrollY;
  if (y < ultimoY - 6) subindo = true; else if (y > ultimoY + 6) subindo = false;
  ultimoY = y; atualizar();
  // parou de rolar para ler: o botão se recolhe depois de alguns segundos (o "Orçamento" do topo continua ali)
  clearTimeout(parado); parado = setTimeout(() => { subindo = false; atualizar(); }, 2600);
}, { passive: true });
atualizar();
const marcas = [...document.querySelectorAll('.vit-indice button')];
document.querySelectorAll('[data-proj]').forEach(a => a.addEventListener('click', e => {
  const b = marcas[+a.dataset.proj]; if (!b) return; e.preventDefault(); b.click();
}));
// teclado: ao chegar com Tab no link de um projeto que não está à mostra, a vitrine vai até ele (antes o foco ficava escondido atrás da tela 3D)
document.querySelectorAll('.vit-item').forEach((it, i) => it.addEventListener('focusin', () => { if (!it.classList.contains('ativo') && marcas[i]) marcas[i].click(); }));
