const VISAO = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODELO = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const REGRAS = {
  olhos: { limite: 0.5, tempo: 1500, titulo: "Fadiga detectada", texto: "Olhos fechados por tempo demais" },
  boca: { limite: 0.45, tempo: 900, titulo: "Bocejo detectado", texto: "Sinal de cansaço" },
  olhar: { limite: 0.6, tempo: 1500, titulo: "Olhar fora da pista", texto: "Rosto virado para o lado" },
  ausente: { tempo: 2500, titulo: "Motorista fora de vista", texto: "Rosto não encontrado na cabine" }
};

const palco = document.querySelector("[data-palco]");
const video = document.querySelector("[data-video]");
const desenho = document.querySelector("[data-desenho]");
const ctx = desenho.getContext("2d");
const alerta = document.querySelector("[data-alerta]");
const erro = document.querySelector("[data-erro]");
const registro = document.querySelector("[data-registro]");
const relogio = document.querySelector("[data-relogio]");
const btnLigar = document.querySelector("[data-ligar]");
const btnDesligar = document.querySelector("[data-desligar]");

const medidores = {};
document.querySelectorAll("[data-medidor]").forEach((m) => {
  medidores[m.dataset.medidor] = {
    el: m,
    barra: m.querySelector(".medidor-barra"),
    leitura: m.querySelector("[data-leitura]")
  };
});

let detector = null;
let fluxo = null;
let rodando = false;
let inicio = 0;
let ultimoTempo = -1;
let audio = null;
const inicioCondicao = {};
const disparado = {};
let timerAlerta = null;

const estado = (valor) => {
  palco.dataset.estado = valor;
};

const pegar = (lista, nome) => {
  const item = lista.find((c) => c.categoryName === nome);
  return item ? item.score : 0;
};

const analisar = (resultado) => {
  if (!resultado.faceLandmarks || resultado.faceLandmarks.length === 0) {
    return { rosto: false };
  }
  const pontos = resultado.faceLandmarks[0];
  const formas = resultado.faceBlendshapes[0].categories;
  const olhos = (pegar(formas, "eyeBlinkLeft") + pegar(formas, "eyeBlinkRight")) / 2;
  const boca = pegar(formas, "jawOpen");
  const nariz = pontos[1];
  const esq = pontos[234];
  const dir = pontos[454];
  const razao = (nariz.x - esq.x) / (dir.x - esq.x);
  const olhar = Math.min(1, Math.abs(razao - 0.5) / 0.3);
  return { rosto: true, pontos, olhos, boca, olhar };
};

const tocar = () => {
  try {
    audio = audio || new AudioContext();
    [0, 0.22].forEach((atraso) => {
      const osc = audio.createOscillator();
      const ganho = audio.createGain();
      osc.frequency.value = 880;
      ganho.gain.setValueAtTime(0.0001, audio.currentTime + atraso);
      ganho.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + atraso + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + atraso + 0.18);
      osc.connect(ganho).connect(audio.destination);
      osc.start(audio.currentTime + atraso);
      osc.stop(audio.currentTime + atraso + 0.2);
    });
  } catch (e) {
    audio = null;
  }
};

const tempoDecorrido = () => {
  const s = Math.floor((performance.now() - inicio) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const disparar = (chave) => {
  const regra = REGRAS[chave];
  alerta.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> <span><strong>${regra.titulo}</strong>${regra.texto}</span>`;
  palco.classList.add("em-alerta");
  clearTimeout(timerAlerta);
  timerAlerta = setTimeout(() => palco.classList.remove("em-alerta"), 2600);

  const vazio = registro.querySelector(".registro-vazio");
  if (vazio) vazio.remove();
  const item = document.createElement("li");
  item.innerHTML = `<time>${tempoDecorrido()}</time> <span>${regra.titulo}</span>`;
  registro.prepend(item);
  tocar();
};

const vigiar = (chave, ativo, agora) => {
  if (ativo) {
    if (!inicioCondicao[chave]) inicioCondicao[chave] = agora;
    if (!disparado[chave] && agora - inicioCondicao[chave] >= REGRAS[chave].tempo) {
      disparado[chave] = true;
      disparar(chave);
    }
  } else {
    inicioCondicao[chave] = 0;
    disparado[chave] = false;
  }
};

const medir = (chave, valor, rotulo, risco) => {
  const m = medidores[chave];
  m.barra.style.width = `${Math.round(Math.min(1, valor) * 100)}%`;
  m.leitura.textContent = rotulo;
  m.el.classList.toggle("em-risco", risco);
};

const desenharRosto = (pontos) => {
  const w = desenho.width;
  const h = desenho.height;
  let x1 = 1, y1 = 1, x2 = 0, y2 = 0;
  pontos.forEach((p) => {
    x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y);
    x2 = Math.max(x2, p.x); y2 = Math.max(y2, p.y);
  });
  const folga = 0.04;
  const ax = (x1 - folga) * w, ay = (y1 - folga) * h;
  const bx = (x2 + folga) * w, by = (y2 + folga) * h;
  const canto = Math.min(bx - ax, by - ay) * 0.18;
  ctx.strokeStyle = palco.classList.contains("em-alerta") ? "#E30613" : "#F5B700";
  ctx.lineWidth = Math.max(3, w / 220);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay + canto); ctx.lineTo(ax, ay); ctx.lineTo(ax + canto, ay);
  ctx.moveTo(bx - canto, ay); ctx.lineTo(bx, ay); ctx.lineTo(bx, ay + canto);
  ctx.moveTo(bx, by - canto); ctx.lineTo(bx, by); ctx.lineTo(bx - canto, by);
  ctx.moveTo(ax + canto, by); ctx.lineTo(ax, by); ctx.lineTo(ax, by - canto);
  ctx.stroke();
  ctx.fillStyle = "rgba(127, 227, 255, .55)";
  [33, 133, 362, 263, 13, 14, 1].forEach((i) => {
    ctx.beginPath();
    ctx.arc(pontos[i].x * w, pontos[i].y * h, Math.max(2, w / 320), 0, Math.PI * 2);
    ctx.fill();
  });
};

const quadro = () => {
  if (!rodando) return;
  const agora = performance.now();
  if (video.readyState >= 2 && video.currentTime !== ultimoTempo) {
    ultimoTempo = video.currentTime;
    if (desenho.width !== video.videoWidth) {
      desenho.width = video.videoWidth;
      desenho.height = video.videoHeight;
    }
    const leitura = analisar(detector.detectForVideo(video, agora));
    ctx.clearRect(0, 0, desenho.width, desenho.height);

    if (leitura.rosto) {
      desenharRosto(leitura.pontos);
      medir("olhos", leitura.olhos, leitura.olhos > REGRAS.olhos.limite ? "fechados" : "abertos", leitura.olhos > REGRAS.olhos.limite);
      medir("boca", leitura.boca, leitura.boca > REGRAS.boca.limite ? "bocejando" : "normal", leitura.boca > REGRAS.boca.limite);
      medir("olhar", leitura.olhar, leitura.olhar > REGRAS.olhar.limite ? "fora da pista" : "na pista", leitura.olhar > REGRAS.olhar.limite);
    } else {
      ["olhos", "boca", "olhar"].forEach((c) => medir(c, 0, "sem rosto", false));
    }

    vigiar("olhos", leitura.rosto && leitura.olhos > REGRAS.olhos.limite, agora);
    vigiar("boca", leitura.rosto && leitura.boca > REGRAS.boca.limite, agora);
    vigiar("olhar", leitura.rosto && leitura.olhar > REGRAS.olhar.limite, agora);
    vigiar("ausente", !leitura.rosto, agora);
  }
  relogio.textContent = tempoDecorrido();
  requestAnimationFrame(quadro);
};

const criarDetector = async () => {
  const { FaceLandmarker, FilesetResolver } = await import(`${VISAO}/vision_bundle.mjs`);
  const arquivos = await FilesetResolver.forVisionTasks(`${VISAO}/wasm`);
  const opcoes = (delegate) => ({
    baseOptions: { modelAssetPath: MODELO, delegate },
    outputFaceBlendshapes: true,
    runningMode: "VIDEO",
    numFaces: 1
  });
  try {
    return await FaceLandmarker.createFromOptions(arquivos, opcoes("GPU"));
  } catch (e) {
    return FaceLandmarker.createFromOptions(arquivos, opcoes("CPU"));
  }
};

const mostrarErro = (texto) => {
  erro.textContent = texto;
  estado("parado");
};

const ligar = async () => {
  erro.textContent = "";
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    mostrarErro("Seu navegador não permite usar a câmera nesta página. Tente pelo Chrome, Edge ou Safari atualizados.");
    return;
  }
  estado("carregando");
  try {
    fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 } }, audio: false });
  } catch (e) {
    mostrarErro(e.name === "NotAllowedError"
      ? "Você não liberou a câmera. Permita o acesso no navegador e tente de novo."
      : "Não encontramos uma câmera neste aparelho.");
    return;
  }
  try {
    detector = detector || await criarDetector();
  } catch (e) {
    fluxo.getTracks().forEach((t) => t.stop());
    mostrarErro("Não foi possível carregar o detector. Verifique sua conexão e tente de novo.");
    return;
  }
  video.srcObject = fluxo;
  await video.play();
  inicio = performance.now();
  rodando = true;
  estado("rodando");
  btnDesligar.hidden = false;
  requestAnimationFrame(quadro);
};

const desligar = () => {
  rodando = false;
  if (fluxo) fluxo.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
  ctx.clearRect(0, 0, desenho.width, desenho.height);
  palco.classList.remove("em-alerta");
  ["olhos", "boca", "olhar"].forEach((c) => medir(c, 0, "aguardando", false));
  btnDesligar.hidden = true;
  estado("parado");
};

btnLigar.addEventListener("click", ligar);
btnDesligar.addEventListener("click", desligar);
