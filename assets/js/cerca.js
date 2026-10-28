const mapa = document.querySelector("[data-mapa]");
const rota = document.getElementById("rota");
const cerca = document.querySelector("[data-cerca]");
const centro = document.querySelector("[data-cerca-centro]");
const rotulo = document.querySelector("[data-cerca-rotulo]");
const veiculo = document.querySelector("[data-veiculo]");
const raio = document.querySelector("[data-raio]");
const bloqueio = document.querySelector("[data-bloqueio]");
const liberar = document.querySelector("[data-liberar]");
const caixa = document.querySelector("[data-status-caixa]");
const status = document.querySelector("[data-status]");
const hora = document.querySelector("[data-hora]");
const registro = document.querySelector("[data-registro]");

const VELOCIDADE = 90;
const MINUTOS_POR_SEGUNDO = 6;
const comprimento = rota.getTotalLength();

let pos = { x: 200, y: 190 };
let distancia = 0;
let dentro = true;
let bloqueado = false;
let anterior = performance.now();
let minutos = 22 * 60;
let arrastando = false;

const relogio = () => {
  const m = Math.floor(minutos) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const anotar = (texto, tipo) => {
  const vazio = registro.querySelector(".registro-vazio");
  if (vazio) vazio.remove();
  const item = document.createElement("li");
  if (tipo) item.classList.add(`registro-${tipo}`);
  item.innerHTML = `<time>${relogio()}</time> <span>${texto}</span>`;
  registro.prepend(item);
  while (registro.children.length > 6) registro.lastElementChild.remove();
};

const situacao = (valor, texto) => {
  caixa.dataset.situacao = valor;
  status.textContent = texto;
  mapa.dataset.situacao = valor;
};

const moverCerca = (x, y) => {
  pos = { x: Math.max(0, Math.min(780, x)), y: Math.max(0, Math.min(500, y)) };
  cerca.setAttribute("cx", pos.x);
  cerca.setAttribute("cy", pos.y);
  centro.setAttribute("cx", pos.x);
  centro.setAttribute("cy", pos.y);
  rotulo.setAttribute("x", pos.x);
  rotulo.setAttribute("y", pos.y - 14);
};

const pontoNoMapa = (evento) => {
  const p = mapa.createSVGPoint();
  p.x = evento.clientX;
  p.y = evento.clientY;
  return p.matrixTransform(mapa.getScreenCTM().inverse());
};

const verificar = (ponto) => {
  const agoraDentro = Math.hypot(ponto.x - pos.x, ponto.y - pos.y) <= parseFloat(raio.value);
  if (agoraDentro === dentro) return;
  dentro = agoraDentro;
  if (dentro) {
    anotar("Entrou na cerca", "ok");
    situacao("dentro", "Dentro da cerca");
    return;
  }
  anotar("Saiu da cerca", "alerta");
  if (bloqueio.checked) {
    bloqueado = true;
    anotar("Bloqueio automático acionado", "alerta");
    situacao("bloqueado", "Veículo bloqueado");
    liberar.hidden = false;
  } else {
    situacao("fora", "Fora da cerca");
  }
};

const quadro = (agora) => {
  const dt = Math.min(0.1, (agora - anterior) / 1000);
  anterior = agora;
  minutos += dt * MINUTOS_POR_SEGUNDO;
  if (!bloqueado && !arrastando) {
    distancia = (distancia + VELOCIDADE * dt) % comprimento;
  }
  const ponto = rota.getPointAtLength(distancia);
  veiculo.setAttribute("transform", `translate(${ponto.x} ${ponto.y})`);
  verificar(ponto);
  hora.textContent = relogio();
  requestAnimationFrame(quadro);
};

mapa.addEventListener("pointerdown", (e) => {
  arrastando = true;
  mapa.setPointerCapture(e.pointerId);
  const p = pontoNoMapa(e);
  moverCerca(p.x, p.y);
});

mapa.addEventListener("pointermove", (e) => {
  if (!arrastando) return;
  const p = pontoNoMapa(e);
  moverCerca(p.x, p.y);
});

["pointerup", "pointercancel"].forEach((tipo) => {
  mapa.addEventListener(tipo, () => {
    arrastando = false;
  });
});

mapa.addEventListener("keydown", (e) => {
  const passo = e.shiftKey ? 40 : 15;
  const mapaTeclas = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
  const delta = mapaTeclas[e.key];
  if (!delta) return;
  e.preventDefault();
  moverCerca(pos.x + delta[0], pos.y + delta[1]);
});

raio.addEventListener("input", () => {
  cerca.setAttribute("r", raio.value);
});

bloqueio.addEventListener("change", () => {
  anotar(bloqueio.checked ? "Bloqueio automático ligado" : "Bloqueio automático desligado");
  if (!bloqueio.checked && bloqueado) liberar.click();
});

liberar.addEventListener("click", () => {
  bloqueado = false;
  liberar.hidden = true;
  anotar("Veículo liberado pela central", "ok");
  situacao(dentro ? "dentro" : "fora", dentro ? "Dentro da cerca" : "Fora da cerca");
});

requestAnimationFrame(quadro);
