const RECURSOS = {
  rastreio: { nome: "Rastreamento em tempo real", texto: "Veja onde o veículo está pelo app, a qualquer hora." },
  bloqueio: { nome: "Bloqueio remoto", texto: "Pare o veículo à distância em caso de roubo ou furto." },
  recuperacao: { nome: "Apoio na recuperação", texto: "A central acompanha a localização até o veículo voltar." },
  satcam: { nome: "SAT CAM", texto: "Alerta na hora para fadiga, celular, cigarro, falta de cinto e olhar fora da pista.", link: "satcam.html" },
  telemetria: { nome: "Telemetria", texto: "Velocidade, frenagens e motor ligado para cortar gasto com combustível e manutenção." },
  cerca: { nome: "Cerca eletrônica", texto: "Alerta quando sair da área combinada, com bloqueio automático se quiser.", link: "cerca-eletronica.html" },
  horas: { nome: "Horas de uso", texto: "Quanto cada máquina trabalhou, dia a dia." },
  historico: { nome: "Histórico e relatórios", texto: "Por onde andou, onde parou e por quanto tempo." },
  frota: { nome: "Painel da frota", texto: "Todos os veículos no mesmo mapa, com grupos e relatórios por motorista." }
};

const PREOCUPACOES = {
  roubo: "Roubo e furto",
  fadiga: "Motorista cansado ou distraído",
  custo: "Gasto com combustível e manutenção",
  horario: "Uso fora do horário",
  trajeto: "Saber por onde andou"
};

const form = document.querySelector("[data-questionario]");
const etapas = [...form.querySelectorAll("[data-etapa]")];
const progresso = form.querySelector("[data-progresso]");
const contador = form.querySelector("[data-contador]");
const aviso = form.querySelector("[data-aviso]");
const voltar = form.querySelector("[data-voltar]");
const avancar = form.querySelector("[data-avancar]");
const concluir = form.querySelector("[data-concluir]");
const grade = document.querySelector(".montador-grade");
const listaFicha = document.querySelector("[data-recursos]");
const resultado = document.querySelector("[data-resultado]");
const resumoResultado = document.querySelector("[data-resultado-resumo]");
const listaResultado = document.querySelector("[data-resultado-lista]");
const enviar = document.querySelector("[data-enviar]");
const refazer = document.querySelector("[data-refazer]");

let atual = 0;

const respostas = () => {
  const dados = new FormData(form);
  return {
    veiculo: dados.get("veiculo"),
    quantidade: dados.get("quantidade"),
    uso: dados.get("uso"),
    preocupacoes: dados.getAll("preocupacao"),
    nome: (dados.get("nome") || "").trim(),
    cidade: (dados.get("cidade") || "").trim()
  };
};

const recomendar = (r) => {
  const lista = new Map();
  const incluir = (chave, motivo) => {
    if (!lista.has(chave)) lista.set(chave, motivo || "");
  };
  const pesado = ["Caminhão ou carreta", "Vários tipos"].includes(r.veiculo);

  incluir("rastreio");
  if (r.preocupacoes.includes("roubo")) {
    incluir("bloqueio");
    incluir("recuperacao");
  }
  if (r.preocupacoes.includes("fadiga") && r.veiculo !== "Moto") incluir("satcam");
  if (r.preocupacoes.includes("custo")) {
    incluir("telemetria");
    incluir("historico");
  }
  if (r.preocupacoes.includes("horario")) incluir("cerca");
  if (r.preocupacoes.includes("trajeto")) incluir("historico");
  if (r.veiculo === "Máquina pesada") incluir("horas");
  if ((r.quantidade && r.quantidade !== "1") || r.veiculo === "Vários tipos") incluir("frota");
  if (r.uso === "Estrada" && pesado) incluir("satcam", "Indicado para quem roda na estrada");
  if (r.uso === "Campo ou obra") incluir("cerca", "Indicado para campo e obra");
  return lista;
};

const atualizarFicha = () => {
  const r = respostas();
  ["veiculo", "quantidade", "uso"].forEach((campo) => {
    const alvo = document.querySelector(`[data-resumo="${campo}"]`);
    alvo.textContent = r[campo] || "a definir";
    alvo.classList.toggle("definido", Boolean(r[campo]));
  });
  listaFicha.innerHTML = "";
  if (!r.veiculo) return;
  recomendar(r).forEach((motivo, chave) => {
    const item = document.createElement("li");
    item.innerHTML = `<i class="bi bi-check2"></i> ${RECURSOS[chave].nome}`;
    listaFicha.append(item);
  });
};

const mostrar = (indice) => {
  atual = indice;
  etapas.forEach((e, i) => {
    e.hidden = i !== indice;
  });
  progresso.style.width = `${((indice + 1) / etapas.length) * 100}%`;
  contador.textContent = `Pergunta ${indice + 1} de ${etapas.length}`;
  voltar.hidden = indice === 0;
  avancar.hidden = indice === etapas.length - 1;
  concluir.hidden = indice !== etapas.length - 1;
  aviso.textContent = "";
};

const valida = (indice) => {
  const etapa = etapas[indice];
  const radios = etapa.querySelectorAll('input[type="radio"]');
  const caixas = etapa.querySelectorAll('input[type="checkbox"]');
  if (radios.length && ![...radios].some((i) => i.checked)) {
    aviso.textContent = "Escolha uma opção para continuar.";
    return false;
  }
  if (caixas.length && ![...caixas].some((i) => i.checked)) {
    aviso.textContent = "Marque pelo menos uma opção para continuar.";
    return false;
  }
  return true;
};

const mensagem = (r, lista) => {
  const linhas = [
    "Olá! Montei minha proteção no site da Aradsat.",
    `Veículo: ${r.veiculo}`,
    `Quantidade: ${r.quantidade}`,
    `Uso: ${r.uso}`,
    `Preocupações: ${r.preocupacoes.map((p) => PREOCUPACOES[p]).join(", ")}`,
    `Recomendado: ${[...lista.keys()].map((c) => RECURSOS[c].nome).join(", ")}`
  ];
  if (r.nome) linhas.push(`Nome: ${r.nome}`);
  if (r.cidade) linhas.push(`Cidade: ${r.cidade}`);
  return linhas.join("\n");
};

const finalizar = () => {
  const r = respostas();
  const lista = recomendar(r);
  const qtd = r.quantidade === "1" ? "1 veículo" : `${r.quantidade.toLowerCase()} veículos`;
  const usos = { "Cidade": "uso na cidade", "Estrada": "uso na estrada", "Campo ou obra": "uso no campo ou na obra", "Um pouco de tudo": "uso variado" };
  const uso = usos[r.uso];
  const quem = r.nome ? `${r.nome}, ` : "";
  resumoResultado.textContent = `${quem}${r.veiculo}, ${qtd}, ${uso}. Esta é a combinação que faz sentido:`;
  listaResultado.innerHTML = "";
  lista.forEach((motivo, chave) => {
    const recurso = RECURSOS[chave];
    const item = document.createElement("li");
    const link = recurso.link ? ` <a href="${recurso.link}">Ver como funciona</a>` : "";
    const tag = motivo ? `<span class="resultado-tag">${motivo}</span>` : "";
    item.innerHTML = `<i class="bi bi-check-circle-fill"></i><div><strong>${recurso.nome}</strong>${tag}<p>${recurso.texto}${link}</p></div>`;
    listaResultado.append(item);
  });
  enviar.href = `https://wa.me/5517997221920?text=${encodeURIComponent(mensagem(r, lista))}`;
  grade.hidden = true;
  resultado.hidden = false;
  resultado.focus();
  resultado.scrollIntoView({ behavior: "smooth", block: "start" });
};

avancar.addEventListener("click", () => {
  if (valida(atual)) mostrar(atual + 1);
});

voltar.addEventListener("click", () => mostrar(atual - 1));

form.addEventListener("change", (e) => {
  atualizarFicha();
  aviso.textContent = "";
  if (e.target.type === "radio" && atual < etapas.length - 1) {
    setTimeout(() => mostrar(atual + 1), 250);
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!valida(3)) {
    mostrar(3);
    return;
  }
  finalizar();
});

refazer.addEventListener("click", () => {
  form.reset();
  atualizarFicha();
  resultado.hidden = true;
  grade.hidden = false;
  mostrar(0);
  grade.scrollIntoView({ behavior: "smooth", block: "start" });
});

mostrar(0);
