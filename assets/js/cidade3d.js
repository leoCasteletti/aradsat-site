(async () => {
  const palco = document.querySelector("[data-cidade3d]");
  if (!palco) return;

  let THREE;
  try {
    THREE = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js");
  } catch (e) {
    palco.classList.add("sem-3d");
    return;
  }

  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FUNDO = 0x06090E;
  const CELULA = 74;
  const QUADRA = 58;
  const N = 9;
  const RODOVIA_Z = 150;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    palco.classList.add("sem-3d");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(FUNDO);
  palco.prepend(renderer.domElement);

  const cena = new THREE.Scene();
  cena.fog = new THREE.FogExp2(FUNDO, 0.0011);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 4000);

  const brilho = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const janelas = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#0A111A";
    g.fillRect(0, 0, 64, 256);
    for (let y = 4; y < 256; y += 8) {
      for (let x = 4; x < 64; x += 8) {
        const r = Math.random();
        if (r < 0.34) {
          g.fillStyle = r < 0.24 ? `rgba(255, 210, 150, ${0.55 + Math.random() * 0.45})` : `rgba(170, 225, 255, ${0.45 + Math.random() * 0.5})`;
          g.fillRect(x, y, 4, 4);
        }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const lateral = new THREE.MeshBasicMaterial({ map: janelas });
  const teto = new THREE.MeshBasicMaterial({ color: 0x0B131D });
  const caixa = new THREE.BoxGeometry(1, 1, 1);
  caixa.translate(0, 0.5, 0);

  const predios = [];
  for (let i = -N; i < N; i++) {
    for (let j = -N; j < N; j++) {
      const cx = i * CELULA + CELULA / 2;
      const cz = j * CELULA + CELULA / 2;
      if (Math.abs(cz - RODOVIA_Z) < CELULA * 0.9) continue;
      const dist = Math.hypot(cx, cz);
      const partes = Math.random() < 0.5 ? 2 : 1;
      for (let p = 0; p < partes; p++) {
        const larg = partes === 2 ? QUADRA / 2 - 4 : QUADRA - 6;
        const desloc = partes === 2 ? (p === 0 ? -QUADRA / 4 : QUADRA / 4) : 0;
        const alto = Math.max(6, (Math.random() ** 2.2) * 120 * Math.max(0.25, 1 - dist / 700));
        predios.push({ x: cx + desloc, z: cz, w: larg, d: QUADRA - 6, h: alto });
      }
    }
  }

  const instancias = new THREE.InstancedMesh(caixa, [lateral, lateral, teto, teto, lateral, lateral], predios.length);
  const matriz = new THREE.Matrix4();
  predios.forEach((b, k) => {
    matriz.compose(new THREE.Vector3(b.x, 0, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
    instancias.setMatrixAt(k, matriz);
  });
  cena.add(instancias);

  const chao = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: 0x080D14 }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.2;
  cena.add(chao);

  const faixa = (comp, larg, cor, opac, x, z, giro) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(comp, larg),
      new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: opac, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = giro;
    m.position.set(x, 0.05, z);
    cena.add(m);
    return m;
  };

  const extensao = N * CELULA * 2;
  for (let i = -N; i <= N; i++) {
    faixa(extensao, 12, 0x2A7FA8, 0.12, 0, i * CELULA, 0);
    faixa(extensao, 12, 0x2A7FA8, 0.12, i * CELULA, 0, Math.PI / 2);
    faixa(extensao, 2, 0x5BC8F0, 0.45, 0, i * CELULA, 0);
    faixa(extensao, 2, 0x5BC8F0, 0.45, i * CELULA, 0, Math.PI / 2);
  }
  faixa(4000, 60, 0x1E5C7A, 0.35, 0, RODOVIA_Z, 0);
  faixa(4000, 2, 0x9BEBFF, 0.8, 0, RODOVIA_Z - 10, 0);
  faixa(4000, 2, 0x9BEBFF, 0.8, 0, RODOVIA_Z + 10, 0);

  const pontos = (qtd, cor, tamanho) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(qtd * 3), 3));
    const mat = new THREE.PointsMaterial({ color: cor, size: tamanho, map: brilho, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const obj = new THREE.Points(geo, mat);
    cena.add(obj);
    return obj;
  };

  const veiculos = [];
  for (let k = 0; k < 220; k++) {
    const eixoX = Math.random() < 0.5;
    const linha = (Math.floor(Math.random() * (N * 2 + 1)) - N) * CELULA;
    const sentido = Math.random() < 0.5 ? 1 : -1;
    veiculos.push({ eixoX, fixo: linha + sentido * 2.5, pos: (Math.random() * 2 - 1) * extensao / 2, vel: sentido * (14 + Math.random() * 26), lim: extensao / 2 });
  }
  for (let k = 0; k < 70; k++) {
    const sentido = k % 2 ? 1 : -1;
    veiculos.push({ eixoX: true, fixo: RODOVIA_Z + sentido * (4 + (k % 3) * 4), pos: (Math.random() * 2 - 1) * 1400, vel: sentido * (55 + Math.random() * 35), lim: 1400 });
  }

  const farois = pontos(veiculos.length, 0xFFF1D6, 16);
  const rastro1 = pontos(veiculos.length, 0xFF5A4E, 11);
  const rastro2 = pontos(veiculos.length, 0xFF5A4E, 7);

  const alvo = new THREE.Group();
  const alvoPonto = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: 0xFF2A35, blending: THREE.AdditiveBlending, depthWrite: false }));
  alvoPonto.scale.set(44, 44, 1);
  alvoPonto.position.y = 2;
  alvo.add(alvoPonto);
  const anel = new THREE.Mesh(
    new THREE.RingGeometry(12, 15, 48),
    new THREE.MeshBasicMaterial({ color: 0xFF2A35, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  anel.rotation.x = -Math.PI / 2;
  anel.position.y = 0.6;
  alvo.add(anel);
  const feixe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 160, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xFF2A35, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  feixe.position.y = 80;
  alvo.add(feixe);
  cena.add(alvo);

  const cercaCentro = new THREE.Vector3(260, 0.5, RODOVIA_Z);
  const cercaGeo = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 97 }, (_, i) => {
      const a = (i / 96) * Math.PI * 2;
      return new THREE.Vector3(cercaCentro.x + Math.cos(a) * 90, 0.6, cercaCentro.z + Math.sin(a) * 90);
    })
  );
  const cerca = new THREE.Line(cercaGeo, new THREE.LineDashedMaterial({ color: 0x7FE3FF, dashSize: 8, gapSize: 6, transparent: true, opacity: 0.9 }));
  cerca.computeLineDistances();
  cena.add(cerca);

  const orbita = new THREE.Group();
  orbita.rotation.set(0.35, 0, -0.28);
  orbita.position.set(0, 330, -120);
  const curva = new THREE.EllipseCurve(0, 0, 760, 260, 0, Math.PI * 2);
  const orbitaLinha = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(curva.getPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y))),
    new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.25 })
  );
  orbita.add(orbitaLinha);
  const satelite = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilho, color: 0xBFF2FF, blending: THREE.AdditiveBlending, depthWrite: false }));
  satelite.scale.set(34, 34, 1);
  orbita.add(satelite);
  cena.add(orbita);

  const elo = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: 0x7FE3FF, transparent: true, opacity: 0.45 })
  );
  cena.add(elo);

  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  const ajustar = () => {
    const w = palco.clientWidth;
    const h = palco.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 700 ? 58 : 40;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(ajustar).observe(palco);
  ajustar();

  const temp = new THREE.Vector3();
  const satPos = new THREE.Vector3();
  let alvoX = 40;
  let dentroAntes = false;
  let alertaAte = 0;

  const quadro = (t, dt) => {
    const arr0 = farois.geometry.attributes.position.array;
    const arr1 = rastro1.geometry.attributes.position.array;
    const arr2 = rastro2.geometry.attributes.position.array;
    veiculos.forEach((v, k) => {
      v.pos += v.vel * dt;
      if (v.pos > v.lim) v.pos = -v.lim;
      if (v.pos < -v.lim) v.pos = v.lim;
      const d = Math.sign(v.vel);
      const i = k * 3;
      const set = (arr, off) => {
        arr[i] = v.eixoX ? v.pos - d * off : v.fixo;
        arr[i + 1] = 1.5;
        arr[i + 2] = v.eixoX ? v.fixo : v.pos - d * off;
      };
      set(arr0, 0);
      set(arr1, 3.5);
      set(arr2, 7);
    });
    farois.geometry.attributes.position.needsUpdate = true;
    rastro1.geometry.attributes.position.needsUpdate = true;
    rastro2.geometry.attributes.position.needsUpdate = true;

    alvoX += 38 * dt;
    if (alvoX > 640) alvoX = -160;
    alvo.position.set(alvoX, 0, RODOVIA_Z - 6);
    const pulso = (t * 0.8) % 1;
    anel.scale.setScalar(1 + pulso * 2.4);
    anel.material.opacity = 0.9 * (1 - pulso);
    const dentro = Math.abs(alvoX - cercaCentro.x) <= 90;
    if (dentroAntes && !dentro) alertaAte = t + 2.5;
    dentroAntes = dentro;
    cerca.material.color.set(t < alertaAte ? 0xFF2A35 : 0x7FE3FF);

    const a = t * 0.12;
    satelite.position.set(Math.cos(a) * 760, 0, Math.sin(a) * 260);
    satelite.getWorldPosition(satPos);
    const pos = elo.geometry.attributes.position.array;
    pos[0] = satPos.x; pos[1] = satPos.y; pos[2] = satPos.z;
    alvo.getWorldPosition(temp);
    pos[3] = temp.x; pos[4] = 2; pos[5] = temp.z;
    elo.geometry.attributes.position.needsUpdate = true;

    const giro = t * 0.025;
    const raio = 520;
    camera.position.set(Math.sin(giro) * raio + 160 + mouse.x * 60, 230 - mouse.y * 40, Math.cos(giro) * raio + RODOVIA_Z);
    camera.lookAt(140, 10, RODOVIA_Z);
    renderer.render(cena, camera);
  };

  if (calmo) {
    quadro(8, 0);
    return;
  }

  let visivel = true;
  new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting;
  }).observe(palco);

  const relogio = new THREE.Clock();
  const loop = () => {
    const dt = Math.min(0.05, relogio.getDelta());
    if (visivel && !document.hidden) quadro(relogio.elapsedTime, dt);
    requestAnimationFrame(loop);
  };
  loop();
  palco.classList.add("com-3d");
})();
