const pontoEm = (idCaminho, fracao) => {
  const caminho = document.getElementById(idCaminho);
  return caminho.getPointAtLength(caminho.getTotalLength() * fracao);
};

document.querySelectorAll("[data-sobre]").forEach((el) => {
  const p = pontoEm(el.dataset.sobre, parseFloat(el.dataset.em));
  el.setAttribute("cx", p.x);
  el.setAttribute("cy", p.y);
});

const painel = document.querySelector("[data-painel]");

if (painel) {
  const tela = painel.querySelector(".painel-tela");
  const hora = painel.querySelector("[data-hora]");
  const status = painel.querySelector("[data-status]");
  const caminhao = painel.querySelector("[data-caminhao]");
  const feito = painel.querySelector("[data-feito]");
  const marcos = painel.querySelectorAll("[data-marco]");
  const eventos = document.querySelectorAll(".evento");

  const ativar = (evento) => {
    const passo = parseInt(evento.dataset.passo, 10);
    const fracao = parseFloat(evento.dataset.em);
    const p = pontoEm("trajeto", fracao);

    eventos.forEach((e) => e.classList.toggle("ativo", e === evento));
    tela.dataset.tipo = evento.dataset.tipo;
    hora.textContent = evento.dataset.hora;
    status.textContent = evento.dataset.status;
    caminhao.style.transform = `translate(${p.x}px, ${p.y}px)`;
    feito.style.strokeDashoffset = 1 - fracao;
    marcos.forEach((m) => {
      m.classList.toggle("passou", parseInt(m.dataset.marco, 10) <= passo);
    });
  };

  ativar(eventos[0]);

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) ativar(entrada.target);
    });
  }, {
    rootMargin: matchMedia("(max-width: 991.98px)").matches ? "-68% 0px -22% 0px" : "-45% 0px -45% 0px"
  });

  eventos.forEach((e) => observador.observe(e));
}
