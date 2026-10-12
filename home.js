/* Ana sayfa 3B "uygulama makinesi": fikirden yayına beş istasyonlu bir üretim hattı.
   İstasyon metinleri "Süreç" listesinden, uygulama verisi katalog kartlarından okunur
   (i18n.js çevirisini zaten uygulamış olur), böylece metinler tek yerde kalır. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const stage = document.getElementById("stage");
const sceneEl = document.getElementById("scene");
const canvas = document.getElementById("scene-canvas");
const tagsEl = document.getElementById("tags");
const panel = document.getElementById("app-panel");
const heroCopy = document.getElementById("hero-copy");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const viewButtons = [...document.querySelectorAll("[data-view]")];
const pauseBtn = document.querySelector(".ctrl-pause");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const isEn = document.documentElement.lang === "en";
const T = isEn
  ? { step: "Step", next: "Next step →", showcase: "Open the showcase", catalog: "Go to catalog ↓", pause: "Pause motion", resume: "Resume motion", core: "STUDIO 01", running: "RUNNING", live: "LIVE", idea: "IDEA" }
  : { step: "Adım", next: "Sonraki adım →", showcase: "Vitrini aç", catalog: "Kataloğa git ↓", pause: "Hareketi durdur", resume: "Hareketi başlat", core: "STÜDYO 01", running: "ÇALIŞIYOR", live: "YAYINDA", idea: "FİKİR" };

const ACCENT = 0xff7a2e;
const FACE = THREE.MathUtils.degToRad(28); // varsayılan kamera ve ekranların baktığı yön
const PW = 18.4, PD = 11.6, PH = 0.5;
const BELT_Y = 0.62;
const HW = 6, HD = 3, CR = 1.6; // bant halkası (yuvarlatılmış dikdörtgen)

const apps = [...document.querySelectorAll("[data-app]")].map((card, index) => ({
  index,
  card,
  num: String(index + 1).padStart(2, "0"),
  name: card.querySelector("h3").textContent.trim(),
  cat: card.querySelector(".card-cat").textContent.trim(),
  color: card.dataset.color,
  screen: card.dataset.screen,
  icon: card.querySelector(".card-icon").getAttribute("src"),
}));
const steps = [...document.querySelectorAll(".process li")].map((li) => ({
  num: li.querySelector(".step-num").textContent.trim(),
  title: li.querySelector("strong").textContent.trim(),
  desc: li.querySelector("p").textContent.trim(),
  key: li.querySelector(".step-key").textContent.trim(),
}));

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

async function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    stage.classList.add("no-webgl");
    return;
  }
  // Kanvas yazıları doğru yazı tipiyle çizilsin diye önce fontları bekle.
  await Promise.all([document.fonts.ready, document.fonts.load('600 66px "Geist"'), document.fonts.load('500 26px "Geist Mono"')]).catch(() => {});

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  /* Işıklar */
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x0b0c10, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(8, 14, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -13, right: 13, top: 11, bottom: -11, near: 1, far: 45 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8a3d, 1.0);
  rim.position.set(-10, 6, -8);
  scene.add(rim);

  /* Malzemeler */
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const mat = {
    deck: std({ color: 0x1a1d24, roughness: 0.5, metalness: 0.4, envMapIntensity: 0.5 }),
    plate: std({ color: 0x1e222a, roughness: 0.85, metalness: 0.1, envMapIntensity: 0.3 }),
    dark: std({ color: 0x14171c, roughness: 0.42, metalness: 0.55, envMapIntensity: 0.7 }),
    shell: std({ color: 0xc9cdd4, roughness: 0.45, metalness: 0.2, envMapIntensity: 0.7 }),
    paint: std({ color: 0xe8662a, roughness: 0.5, metalness: 0.15, envMapIntensity: 0.6 }),
    steel: std({ color: 0x4a505b, roughness: 0.32, metalness: 0.9, envMapIntensity: 0.9 }),
    body: std({ color: 0x17191e, roughness: 0.26, metalness: 0.8, envMapIntensity: 1 }),
    accent: std({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.6, roughness: 0.4 }),
    green: std({ color: 0x4ad08b, emissive: 0x4ad08b, emissiveIntensity: 1.4 }),
    amberDim: std({ color: 0x5a3a12, emissive: 0xffa630, emissiveIntensity: 0.15 }),
    redDim: std({ color: 0x4a1515, emissive: 0xff4040, emissiveIntensity: 0.12 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false }),
  };

  /* Yardımcılar */
  const shadowed = (m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const box = (w, h, d, material, r = 0) =>
    shadowed(new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), material));
  const cyl = (rt, rb, h, material, seg = 24) => shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material));
  const put = (obj, parent, x = 0, y = 0, z = 0) => {
    obj.position.set(x, y, z);
    parent.add(obj);
    return obj;
  };
  const canvasTex = (w, h, draw) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  };
  const mono = (size, weight = 500) => `${weight} ${size}px "Geist Mono", ui-monospace, monospace`;
  const screen = (w, h, tex) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  const SCREEN_BG = "#0e1115";

  // Mono yazıyı ölçüp tam sığan bir kanvasa çizer; düzlem genişliği orana göre ayarlanır.
  const labelPlane = (text, height, color = "rgba(236,235,231,.55)") => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const setup = () => {
      ctx.font = mono(40);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "6px";
    };
    setup();
    c.width = Math.ceil(ctx.measureText(text).width) + 12;
    c.height = 64;
    setup();
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 6, 34);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    const width = (height * c.width) / 64;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false }));
    m.userData.width = width;
    return m;
  };

  /* Ekran dokuları */
  const hazardTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#16181d";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#e8662a";
    for (let i = -h; i < w; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, h);
      ctx.lineTo(i + 16, h);
      ctx.lineTo(i + 16 + h, 0);
      ctx.lineTo(i + h, 0);
      ctx.fill();
    }
  });
  hazardTex.wrapS = hazardTex.wrapT = THREE.RepeatWrapping;

  const coreTex = canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = SCREEN_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ecebe7";
    ctx.font = mono(30);
    ctx.fillText(T.core, 28, 52);
    ctx.fillStyle = "#ff7a2e";
    ctx.beginPath();
    ctx.arc(w - 172, 42, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = mono(20);
    ctx.fillText(T.running, w - 158, 49);
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    for (let y = 90; y < 210; y += 30) {
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(w - 28, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#ff7a2e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= 20; x++) {
      const px = 28 + (x / 20) * (w - 56);
      const py = 190 - (Math.sin(x * 0.7) * 0.5 + 0.5) * 70 - x * 2.4;
      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(236,235,231,.45)";
    ctx.font = mono(16);
    ctx.fillText("M. ALİ BAĞCI · 2026", 28, 238);
  });

  const uiTex = canvasTex(512, 320, (ctx, w, h) => {
    ctx.fillStyle = SCREEN_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    for (let x = 16; x < w; x += 24) for (let y = 16; y < h; y += 24) ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = "#ff7a2e";
    ctx.font = mono(18);
    ctx.fillText("UI · 02", 24, 34);
    [[60, 60], [200, 60], [340, 60]].forEach(([x, y], i) => {
      ctx.strokeStyle = i === 1 ? "#ff7a2e" : "rgba(236,235,231,.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x, y, 112, 230, 16);
      ctx.stroke();
      ctx.fillStyle = i === 1 ? "rgba(255,122,46,.8)" : "rgba(236,235,231,.35)";
      ctx.fillRect(x + 14, y + 22, 84, 12);
      ctx.fillStyle = "rgba(236,235,231,.18)";
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 14, y + 56 + k * 38, 84, 24);
    });
  });

  const codeTex = canvasTex(384, 192, (ctx, w, h) => {
    ctx.fillStyle = SCREEN_BG;
    ctx.fillRect(0, 0, w, h);
    const colors = ["#ff7a2e", "#7489ea", "#4ad08b", "rgba(236,235,231,.5)"];
    for (let i = 0; i < 9; i++) {
      let x = 20 + (i % 3) * 18;
      const y = 22 + i * 18;
      for (let k = 0; k < 3; k++) {
        const len = 30 + ((i * 37 + k * 53) % 90);
        ctx.fillStyle = colors[(i + k) % colors.length];
        ctx.fillRect(x, y, len, 8);
        x += len + 10;
      }
    }
  });

  const checkTex = canvasTex(384, 256, (ctx, w, h) => {
    ctx.fillStyle = SCREEN_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ff7a2e";
    ctx.font = mono(18);
    ctx.fillText("QA · 04", 22, 34);
    for (let i = 0; i < 5; i++) {
      const y = 62 + i * 38;
      const done = i < 4;
      ctx.strokeStyle = done ? "#4ad08b" : "#ff7a2e";
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (done) {
        ctx.moveTo(24, y + 10);
        ctx.lineTo(32, y + 18);
        ctx.lineTo(46, y + 2);
      } else {
        ctx.arc(35, y + 10, 9, 0, Math.PI * 1.4);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(236,235,231,.3)";
      ctx.fillRect(64, y + 4, 120 + ((i * 61) % 150), 12);
    }
  });

  const ideaTex = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = SCREEN_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ff7a2e";
    ctx.font = mono(26);
    ctx.fillText(T.idea, 20, 46);
    ctx.fillStyle = "rgba(236,235,231,.25)";
    ctx.fillRect(20, 70, 216, 10);
    ctx.fillStyle = "#ff7a2e";
    ctx.fillRect(20, 70, 140, 10);
    ctx.fillStyle = "rgba(236,235,231,.25)";
    ctx.fillRect(20, 94, 160, 8);
  });

  const liveCount = document.querySelectorAll(".card-status.is-live").length;
  const storeTex = canvasTex(320, 160, (ctx, w, h) => {
    ctx.fillStyle = SCREEN_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#4ad08b";
    ctx.beginPath();
    ctx.arc(30, 44, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ecebe7";
    ctx.font = mono(24);
    ctx.fillText(T.live, 48, 52);
    ctx.font = '600 64px "Geist", sans-serif';
    ctx.fillText(`${liveCount}/${apps.length}`, 22, 132);
  });

  /* Platform */
  const deck = new THREE.Group();
  scene.add(deck);
  const base = put(box(PW, PH, PD, mat.deck, 0.12), deck, 0, -PH / 2, 0);
  base.castShadow = true;
  put(shadowed(new THREE.Mesh(new RoundedBoxGeometry(PW - 0.7, 0.08, PD - 0.7, 3, 0.035), mat.plate)), deck);

  const gridPts = [];
  const ghw = (PW - 1) / 2, ghd = (PD - 1) / 2;
  for (let x = -ghw; x <= ghw + 1e-6; x += 0.7) gridPts.push(x, 0.042, -ghd, x, 0.042, ghd);
  for (let z = -ghd; z <= ghd + 1e-6; z += 0.7) gridPts.push(-ghw, 0.042, z, ghw, 0.042, z);
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
  deck.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.035 })));

  const edgeLabel = labelPlane(isEn ? "M. ALI BAGCI — APP MACHINE · SERIES 2026" : "M. ALİ BAĞCI — UYGULAMA MAKİNESİ · SERİ 2026", 0.2);
  put(edgeLabel, deck, -PW / 2 + 0.5 + edgeLabel.userData.width / 2, -PH / 2, PD / 2 + 0.004);
  for (let i = 0; i < 3; i++) put(box(0.34, 0.07, 0.02, i === 0 ? mat.accent : mat.steel), deck, PW / 2 - 0.7 - i * 0.48, -PH / 2, PD / 2 + 0.01);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.ShadowMaterial({ opacity: 0.38 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -PH - 0.002;
  floor.receiveShadow = true;
  scene.add(floor);
  const ring = (rx, rz, opacity) =>
    new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, rx, rz).getPoints(220).map((p) => new THREE.Vector3(p.x, -PH, p.y))),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity })
    );
  scene.add(ring(12.2, 8, 0.09), ring(14.6, 9.6, 0.05));

  /* Bant halkası */
  const v = (x, z) => new THREE.Vector3(x, 0, z);
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(v(-HW, 0), v(-HW, -HD + CR)));
  path.add(new THREE.QuadraticBezierCurve3(v(-HW, -HD + CR), v(-HW, -HD), v(-HW + CR, -HD)));
  path.add(new THREE.LineCurve3(v(-HW + CR, -HD), v(HW - CR, -HD)));
  path.add(new THREE.QuadraticBezierCurve3(v(HW - CR, -HD), v(HW, -HD), v(HW, -HD + CR)));
  path.add(new THREE.LineCurve3(v(HW, -HD + CR), v(HW, HD - CR)));
  path.add(new THREE.QuadraticBezierCurve3(v(HW, HD - CR), v(HW, HD), v(HW - CR, HD)));
  path.add(new THREE.LineCurve3(v(HW - CR, HD), v(-HW + CR, HD)));
  path.add(new THREE.QuadraticBezierCurve3(v(-HW + CR, HD), v(-HW, HD), v(-HW, HD - CR)));
  path.add(new THREE.LineCurve3(v(-HW, HD - CR), v(-HW, 0)));
  const PATH_LEN = path.getLength();
  const NS = 720;
  const SP = [], STAN = [];
  for (let i = 0; i <= NS; i++) {
    SP.push(path.getPoint(i / NS));
    STAN.push(path.getTangent(i / NS).normalize());
  }
  const sampleAt = (u, outP, outT) => {
    const f = (((u % 1) + 1) % 1) * NS;
    const i = Math.floor(f), a = f - i;
    outP.lerpVectors(SP[i], SP[i + 1], a);
    if (outT) outT.lerpVectors(STAN[i], STAN[i + 1], a).normalize();
  };
  const uOf = (x, z) => {
    let best = 0, bd = Infinity;
    SP.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best / NS;
  };
  const edge = (side, y) => SP.map((p, i) => new THREE.Vector3(p.x - STAN[i].z * side, y, p.z + STAN[i].x * side));
  const strip = (A, B, uRepeat = 1) => {
    const pos = [], uv = [], idx = [];
    A.forEach((a, i) => {
      const b = B[i];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      const u = (i / (A.length - 1)) * uRepeat;
      uv.push(u, 0, u, 1);
      if (i < A.length - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  const beltTex = canvasTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = "#121418";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,.07)";
    ctx.fillRect(0, 0, 8, h);
    ctx.fillStyle = "rgba(255,122,46,.5)";
    ctx.fillRect(0, 0, 8, 5);
    ctx.fillRect(0, h - 5, 8, 5);
  });
  beltTex.wrapS = THREE.RepeatWrapping;
  const BELT_REPEAT = Math.round(PATH_LEN / 0.45);
  const belt = new THREE.Mesh(
    strip(edge(0.4, BELT_Y), edge(-0.4, BELT_Y), BELT_REPEAT),
    new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide })
  );
  belt.receiveShadow = true;
  deck.add(belt);
  [0.44, -0.44].forEach((s) => {
    const skirt = new THREE.Mesh(strip(edge(s, BELT_Y - 0.2), edge(s, BELT_Y + 0.02)), new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide }));
    skirt.castShadow = true;
    deck.add(skirt);
    const railPts = edge(s * 1.06, BELT_Y + 0.05).slice(0, -1);
    deck.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPts, true), 500, 0.045, 8, true), mat.shell)));
  });
  const legGeo = new THREE.BoxGeometry(0.08, BELT_Y - 0.24, 0.08);
  const legCount = Math.floor(NS / 30) * 2;
  const legs = new THREE.InstancedMesh(legGeo, mat.steel, legCount);
  legs.castShadow = true;
  const m4 = new THREE.Matrix4();
  for (let i = 0, k = 0; k < legCount; i += 30) {
    [0.42, -0.42].forEach((s) => {
      const p = SP[i], t = STAN[i];
      m4.makeTranslation(p.x - t.z * s, (BELT_Y - 0.24) / 2 + 0.04, p.z + t.x * s);
      legs.setMatrixAt(k++, m4);
    });
  }
  deck.add(legs);

  /* İstasyonlar */
  const stations = [];
  const addStation = (index, x, z, build) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    deck.add(group);
    const s = { index, group, lift: 0, liftTarget: 0, covers: [], anchor: new THREE.Vector3(0, 2.5, 0), focusY: 1.2, update: () => {} };
    build(s, group);
    group.traverse((o) => {
      if (o.isMesh) o.userData.pick = { type: "station", index };
    });
    stations.push(s);
    return s;
  };

  // 01 Fikir — bant üzerinde huni; fikir küresi cam kubbede parlıyor.
  addStation(0, -HW, 0, (s, g) => {
    [[-0.78, -0.78], [0.78, -0.78], [-0.78, 0.78], [0.78, 0.78]].forEach(([x, z]) => put(box(0.12, 2.35, 0.12, mat.steel), g, x, 1.2, z));
    const housing = put(box(1.8, 0.9, 1.8, mat.shell, 0.06), g, 0, 2.6, 0);
    const funnel = put(shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.24, 0.85, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9cdd4, roughness: 0.45, metalness: 0.2, side: THREE.DoubleSide }))), g, 0, 1.73, 0);
    funnel.rotation.y = Math.PI / 4;
    put(cyl(0.17, 0.17, 0.42, mat.dark), g, 0, 1.12, 0);
    put(box(1.84, 0.08, 1.84, mat.paint), g, 0, 3.05, 0);
    const dome = put(new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat.glass), g, 0, 3.09, 0);
    const bulbMat = std({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 2 });
    const bulb = put(new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), bulbMat), g, 0, 3.32, 0);
    put(screen(0.86, 0.43, ideaTex), housing, 0.2, 0, 0.905);
    const plate = put(new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshStandardMaterial({ map: hazardTex, roughness: 0.7 })), g, 0, 0.046, 0);
    plate.rotation.x = -Math.PI / 2;
    hazardTex.repeat.set(3, 3);
    plate.receiveShadow = true;
    s.covers.push(housing, funnel, dome);
    s.anchor.set(0, 3.75, 0);
    s.focusY = 1.8;
    s.update = (t) => {
      bulbMat.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.6;
      bulb.position.y = 3.32 + Math.sin(t * 1.5) * 0.04;
    };
  });

  // 02 Tasarım — bant üstünde portal; başlık sağa sola kayarak ekran çiziyor.
  addStation(1, -2.2, -HD, (s, g) => {
    [[-1.15, -0.85], [1.15, -0.85], [-1.15, 0.85], [1.15, 0.85]].forEach(([x, z]) => put(box(0.2, 2.15, 0.2, mat.shell, 0.03), g, x, 1.1, z));
    [-1.15, 1.15].forEach((x) => put(box(0.24, 0.22, 1.95, mat.shell, 0.03), g, x, 2.2, 0));
    put(box(2.6, 0.26, 0.32, mat.dark, 0.04), g, 0, 2.2, 0);
    put(box(2.4, 0.05, 0.05, mat.steel), g, 0, 2.2, 0.18);
    const carriage = put(box(0.5, 0.46, 0.56, mat.paint, 0.05), g, 0, 2.2, 0.05);
    put(cyl(0.05, 0.02, 0.9, mat.steel, 12), carriage, 0, -0.66, 0);
    put(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), mat.accent), carriage, 0, -1.12, 0);
    const mon = new THREE.Group();
    put(mon, g, -1.95, 0, 0.9);
    mon.rotation.y = FACE;
    put(cyl(0.05, 0.05, 1.5, mat.steel, 12), mon, 0, 0.8, 0);
    put(box(0.5, 0.06, 0.5, mat.dark, 0.02), mon, 0, 0.07, 0);
    const frame = put(box(1.5, 0.98, 0.07, mat.dark, 0.03), mon, 0, 1.9, 0);
    put(screen(1.4, 0.875, uiTex), frame, 0, 0, 0.037);
    put(box(0.32, 0.5, 0.26, mat.dark, 0.03), g, 1.15, 0.6, 1.08);
    [0, 1].forEach((k) => put(cyl(0.05, 0.05, 0.03, k ? mat.green : mat.accent, 12), g, 1.08 + k * 0.14, 0.72, 1.22).rotateX(Math.PI / 2));
    s.anchor.set(0, 2.85, 0);
    s.focusY = 1.5;
    s.update = (t) => {
      carriage.position.x = Math.sin(t * 1.3) * 0.95;
    };
  });

  // 03 Geliştirme — bant tünelden geçiyor; arkada yanıp sönen sunucu dolapları.
  const ledColors = [new THREE.Color(0x2a2f38), new THREE.Color(0xff7a2e), new THREE.Color(0x4ad08b), new THREE.Color(0x7489ea)];
  let leds = null;
  addStation(2, 2.6, -HD, (s, g) => {
    const top = put(box(2.6, 0.18, 1.5, mat.shell, 0.05), g, 0, 1.5, 0);
    const front = put(box(2.6, 1.0, 0.14, mat.shell, 0.04), g, 0, 0.96, 0.72);
    put(box(2.6, 1.0, 0.14, mat.shell, 0.04), g, 0, 0.96, -0.72);
    put(screen(0.95, 0.48, codeTex), front, -0.55, 0.05, 0.072);
    for (let k = 0; k < 5; k++) put(box(0.08, 0.04, 1.2, mat.dark), top, -1.05 + k * 0.16, 0.11, 0);
    const fan = new THREE.Group();
    put(fan, top, 0.65, 0.16, 0);
    put(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 10, 32), mat.dark), fan).rotation.x = Math.PI / 2;
    const blades = new THREE.Group();
    fan.add(blades);
    for (let k = 0; k < 4; k++) {
      const b = put(box(0.6, 0.02, 0.12, mat.steel), blades);
      b.rotation.y = (k * Math.PI) / 4;
    }
    const rackGeo = new RoundedBoxGeometry(0.74, 2.3, 0.7, 2, 0.03);
    const cols = 6, rows = 14;
    leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.075, 0.035, 0.012), new THREE.MeshBasicMaterial({ toneMapped: false }), 3 * cols * rows);
    let n = 0;
    [-0.86, 0, 0.86].forEach((x) => {
      put(shadowed(new THREE.Mesh(rackGeo, mat.dark)), g, x, 1.19, -1.45);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          m4.makeTranslation(x - 0.25 + c * 0.1, 0.45 + r * 0.13, -1.45 + 0.356);
          leds.setMatrixAt(n, m4);
          leds.setColorAt(n++, ledColors[Math.random() < 0.6 ? 0 : 1 + Math.floor(Math.random() * 3)]);
        }
    });
    g.add(leds);
    [-0.86, 0, 0.86].forEach((x, k) => {
      const pts = [new THREE.Vector3(x, 2.34, -1.45), new THREE.Vector3(x * 0.6, 2.75 - k * 0.08, -1.0), new THREE.Vector3(x * 0.4 - 0.3, 1.72, -0.3)];
      put(shadowed(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.035, 8), mat.dark)), g);
    });
    s.covers.push(top, front);
    s.anchor.set(0, 2.85, -0.9);
    s.focusY = 1.3;
    s.update = (t, dt) => {
      blades.rotation.y += dt * 6;
    };
  });

  // 04 Test — iki tarayıcı kemer ve kayan lazer düzlemi; yanında sinyal kulesi.
  addStation(3, HW, 0, (s, g) => {
    [-0.6, 0.6].forEach((z) => {
      put(shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.09, 12, 48, Math.PI), mat.shell)), g, 0, 0.4, z);
      [-0.98, 0.98].forEach((x) => put(box(0.3, 0.12, 0.3, mat.dark, 0.03), g, x, 0.1, z));
    });
    const laser = put(new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.95), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })), g, 0, 0.88, 0);
    const beam = put(box(1.8, 0.014, 0.014, mat.accent), laser, 0, 0.47, 0);
    beam.castShadow = false;
    const tower = new THREE.Group();
    put(tower, g, 1.45, 0, 0.95);
    put(cyl(0.05, 0.05, 1.1, mat.steel, 12), tower, 0, 0.55, 0);
    put(cyl(0.12, 0.12, 0.16, mat.green, 20), tower, 0, 1.2, 0);
    put(cyl(0.12, 0.12, 0.16, mat.amberDim, 20), tower, 0, 1.37, 0);
    put(cyl(0.12, 0.12, 0.16, mat.redDim, 20), tower, 0, 1.54, 0);
    put(cyl(0.13, 0.13, 0.03, mat.dark, 20), tower, 0, 1.64, 0);
    const kiosk = new THREE.Group();
    put(kiosk, g, 1.5, 0, -0.85);
    kiosk.rotation.y = FACE;
    put(box(0.5, 1.0, 0.36, mat.dark, 0.04), kiosk, 0, 0.5, 0);
    const pad = put(box(0.86, 0.6, 0.06, mat.shell, 0.03), kiosk, 0, 1.25, 0.05);
    pad.rotation.x = -0.35;
    put(screen(0.78, 0.52, checkTex), pad, 0, 0, 0.032);
    s.anchor.set(0, 2.15, 0);
    s.focusY = 0.9;
    s.update = (t) => {
      laser.position.z = Math.sin(t * 1.8) * 0.5;
    };
  });

  // 05 Yayın — robot kol bitmiş cihazı alıp vitrine bırakıyor; vitrinde altı uygulama.
  const rackPhones = [];
  addStation(4, 1.6, HD, (s, g) => {
    const arm = new THREE.Group();
    put(arm, g, 0, 0, -1.15);
    put(cyl(0.38, 0.46, 0.3, mat.dark), arm, 0, 0.15, 0);
    const turret = put(new THREE.Group(), arm, 0, 0.3, 0);
    put(cyl(0.28, 0.3, 0.22, mat.paint), turret, 0, 0.11, 0);
    const shoulder = put(new THREE.Group(), turret, 0, 0.26, 0);
    put(box(0.2, 1.15, 0.2, mat.paint, 0.05), shoulder, 0, 0.55, 0);
    const elbow = put(new THREE.Group(), shoulder, 0, 1.1, 0);
    put(new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), mat.dark), elbow);
    put(box(0.16, 0.95, 0.16, mat.shell, 0.04), elbow, 0, 0.45, 0);
    const wrist = put(new THREE.Group(), elbow, 0, 0.92, 0);
    put(box(0.34, 0.08, 0.2, mat.dark, 0.02), wrist);
    [-0.12, 0.12].forEach((x) => put(box(0.04, 0.2, 0.12, mat.steel), wrist, x, -0.12, 0));
    shoulder.rotation.x = 0.55;
    elbow.rotation.x = 1.25;

    put(box(4.7, 0.22, 1.25, mat.dark, 0.04), g, 0.2, 0.15, 1.55);
    put(box(4.7, 0.2, 0.42, mat.dark, 0.04), g, 0.2, 0.35, 1.15);
    put(box(4.7, 0.03, 0.02, mat.accent), g, 0.2, 0.15, 2.18);
    const phoneGeo = new RoundedBoxGeometry(0.6, 1.22, 0.07, 3, 0.06);
    const screenGeo = new THREE.PlaneGeometry(0.54, 1.1);
    apps.forEach((app, k) => {
      const ph = new THREE.Group();
      put(ph, g, -1.55 + k * 0.7, 0.88, 1.6);
      ph.rotation.x = -0.2;
      const body = put(shadowed(new THREE.Mesh(phoneGeo, mat.body)), ph);
      const scr = put(new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ color: 0x15171c, toneMapped: false })), ph, 0, 0, 0.037);
      put(box(0.44, 0.02, 0.012, std({ color: app.color, emissive: app.color, emissiveIntensity: 1 })), g, -1.55 + k * 0.7, 0.27, 2.18);
      rackPhones.push({ app, group: ph, screen: scr, picks: [body, scr] });
    });
    const sign = new THREE.Group();
    put(sign, g, -2.55, 0, 1.55);
    sign.rotation.y = FACE;
    put(cyl(0.04, 0.04, 1.1, mat.steel, 12), sign, 0, 0.55, 0);
    const signBox = put(box(0.86, 0.46, 0.06, mat.dark, 0.03), sign, 0, 1.2, 0);
    put(screen(0.8, 0.4, storeTex), signBox, 0, 0, 0.031);
    s.anchor.set(0.2, 1.75, 1.5);
    s.focusY = 1.0;
    s.update = (t) => {
      turret.rotation.y = Math.sin(t * 0.8) * 1.1;
      shoulder.rotation.x = 0.55 + Math.sin(t * 1.6) * 0.15;
      elbow.rotation.x = 1.25 + Math.cos(t * 1.6) * 0.2;
    };
  });

  /* Merkez konsol ve süslemeler */
  const core = new THREE.Group();
  put(core, deck, -0.8, 0, 0);
  put(box(2.8, 0.55, 1.4, mat.dark, 0.06), core, 0, 0.32, 0);
  put(box(2.84, 0.04, 1.44, mat.paint), core, 0, 0.6, 0);
  const desk = put(box(2.3, 0.08, 0.95, mat.shell, 0.03), core, 0, 0.92, 0.05);
  desk.rotation.x = 0.55;
  put(screen(2.1, 0.86, coreTex), desk, 0, 0.042, 0).rotation.x = -Math.PI / 2;
  put(cyl(0.035, 0.035, 1.7, mat.steel, 10), core, 1.2, 1.4, -0.5);
  const beacon = put(new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), std({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 2 })), core, 1.2, 2.3, -0.5);
  [-0.6, 0.6].forEach((x) => {
    const pts = [new THREE.Vector3(x, 0.3, -0.7), new THREE.Vector3(x * 1.4, 0.12, -1.6), new THREE.Vector3(x * 2 + 2.5, 0.12, -2.1)];
    put(shadowed(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.04, 8), mat.dark)), core);
  });

  [[0.32, mat.shell], [0.62, mat.paint]].forEach(([y, m]) => (put(shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, PW - 1.4, 16), m)), deck, 0, y, -PD / 2 + 0.55).rotation.z = Math.PI / 2));
  for (let x = -PW / 2 + 1.2; x < PW / 2 - 1; x += 2.2) put(box(0.12, 0.78, 0.3, mat.steel), deck, x, 0.4, -PD / 2 + 0.55);
  [[-7.6, 4.3, 0.7, mat.shell], [-6.9, 4.5, 0.55, mat.dark], [-7.35, 4.35, 0.5, mat.paint]].forEach(([x, z, sz, m], i) => put(box(sz, sz, sz, m, 0.04), deck, x, sz / 2 + 0.04 + (i === 2 ? 0.7 : 0), z));
  [[-PW / 2 + 0.7, -PD / 2 + 0.7], [PW / 2 - 0.7, -PD / 2 + 0.7], [PW / 2 - 0.7, PD / 2 - 0.7]].forEach(([x, z]) => {
    put(cyl(0.05, 0.07, 1.3, mat.steel, 12), deck, x, 0.69, z);
    put(new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), mat.accent), deck, x, 1.38, z);
  });

  /* Bant üzerindeki parçalar: istasyonlardan geçtikçe biçim değiştirir */
  const U = { design: uOf(-2.2, -HD), build: uOf(2.6, -HD), test: uOf(HW, 0), release: uOf(1.6, HD) };
  const variants = [
    () => new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), mat.accent),
    () => {
      const g = new THREE.Group();
      g.add(box(0.36, 0.05, 0.5, mat.shell, 0.02));
      put(box(0.26, 0.012, 0.05, mat.accent), g, 0, 0.03, -0.15);
      return g;
    },
    () => {
      const g = new THREE.Group();
      g.add(box(0.34, 0.07, 0.6, mat.body, 0.03));
      put(box(0.28, 0.01, 0.5, std({ color: 0x222233, emissive: 0x7489ea, emissiveIntensity: 0.9 })), g, 0, 0.038, 0);
      return g;
    },
    () => {
      const g = new THREE.Group();
      g.add(box(0.34, 0.07, 0.6, mat.body, 0.03));
      put(box(0.28, 0.01, 0.5, std({ color: 0x113322, emissive: 0x4ad08b, emissiveIntensity: 0.9 })), g, 0, 0.038, 0);
      return g;
    },
  ];
  const items = Array.from({ length: 11 }, () => {
    const g = new THREE.Group();
    const vs = variants.map((mk) => {
      const o = mk();
      o.visible = false;
      g.add(o);
      return o;
    });
    deck.add(g);
    return { g, vs };
  });
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3();
  const ITEM_SPEED = 0.022;
  const updateItems = (t) => {
    items.forEach((it, k) => {
      const phase = (t * ITEM_SPEED + k / items.length) % 1;
      const u = phase * U.release;
      sampleAt(u, tmpP, tmpT);
      const stage = u < U.design ? 0 : u < U.build ? 1 : u < U.test ? 2 : 3;
      it.vs.forEach((o, i) => (o.visible = i === stage));
      it.g.position.set(tmpP.x, BELT_Y + (stage === 0 ? 0.16 : 0.05), tmpP.z);
      it.g.rotation.y = Math.atan2(tmpT.x, tmpT.z);
      it.g.scale.setScalar(Math.max(0.001, Math.min(1, phase * 25, (1 - phase) * 25)));
    });
  };

  /* Kamera ve kontroller */
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false; // tekerlek sayfayı kaydırsın
  controls.rotateSpeed = 0.55;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = 1.4;
  controls.enabled = finePointer;
  canvas.style.touchAction = "pan-y"; // dokunmatikte sayfa kaydırması kilitlenmesin

  const state = { mode: "assembled", view: "overview", focus: null, showApps: false, paused: reduceMotion, time: 0 };
  let layout = { mobile: false, usable: 0.6, hFrac: 0.8, offX: 0, offY: 0, focusR: 11, phoneR: 6 };
  const anim = { active: false, t: 0, start: 0, dur: 1.3, fromPos: new THREE.Vector3(), toPos: new THREE.Vector3(), fromTgt: new THREE.Vector3(), toTgt: new THREE.Vector3() };
  const journey = { active: false, idx: 0, next: 0 };
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const tmp = new THREE.Vector3();

  const fitRadius = () => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    return Math.max(19.5 / 2 / (tanV * camera.aspect * layout.usable), 10.5 / 2 / (tanV * layout.hFrac));
  };
  const flyTo = (target, radius, polar, azimuth, instant = false) => {
    const toPos = new THREE.Vector3().setFromSphericalCoords(radius, polar, azimuth).add(target);
    if (instant || reduceMotion) {
      anim.active = false;
      camera.position.copy(toPos);
      controls.target.copy(target);
      controls.update();
      return;
    }
    anim.fromPos.copy(camera.position);
    anim.toPos.copy(toPos);
    anim.fromTgt.copy(controls.target);
    anim.toTgt.copy(target);
    anim.start = performance.now();
    anim.active = true;
    controls.enabled = false;
  };
  const showcaseTarget = () => rackPhones[2].group.getWorldPosition(tmp).clone().add(new THREE.Vector3(0.35, 0.1, 0));
  const cameraForView = (view, instant = false) => {
    const r = fitRadius();
    if (view === "top") flyTo(new THREE.Vector3(0, 0, 0.4), r * 1.02, 0.12, 0, instant);
    else if (view === "side") flyTo(new THREE.Vector3(0, 1.0, 0), r * 0.92, 1.36, 0.02, instant);
    else if (view === "showcase") flyTo(showcaseTarget(), layout.mobile ? 14 : 12.5, 1.2, 0.18, instant);
    else flyTo(new THREE.Vector3(0, 0.8, 0), r, 1.02, FACE, instant);
  };
  const applyViewOffset = () => {
    const w = sceneEl.clientWidth, h = sceneEl.clientHeight;
    const focusedMobile = layout.mobile && state.focus;
    camera.setViewOffset(w, h, layout.offX, focusedMobile ? h * 0.21 : layout.offY, w, h);
    camera.updateProjectionMatrix();
  };

  /* Etiketler: istasyonlar (01–05) ve vitrindeki uygulamalar */
  const makeTag = (cls, color, num, title, sub, label, onClick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `tag ${cls}`;
    b.style.setProperty("--c", color);
    b.innerHTML = '<span class="tag-num"></span><span class="tag-text"><b></b><small></small></span>';
    b.querySelector(".tag-num").textContent = num;
    b.querySelector("b").textContent = title;
    if (sub) b.querySelector("small").textContent = sub;
    else b.querySelector("small").remove();
    b.setAttribute("aria-label", label);
    b.addEventListener("click", onClick);
    tagsEl.appendChild(b);
    return b;
  };
  const stationTags = stations.map((s, i) =>
    makeTag("tag-station", "#ff7a2e", steps[i].num, steps[i].title, `${T.step} ${i + 1} · ${steps[i].key}`, steps[i].title, () => focusStation(i))
  );
  const appTags = rackPhones.map((rp, k) =>
    makeTag(`tag-app${k % 2 ? " is-tall" : ""}`, rp.app.color, rp.app.num, rp.app.name.split(":")[0], "", rp.app.name, () => selectApp(k))
  );
  const anchor = new THREE.Vector3();
  const placeTag = (el, w, h) => {
    anchor.project(camera);
    el.style.transform = `translate(${(((anchor.x + 1) / 2) * w).toFixed(1)}px, ${(((1 - anchor.y) / 2) * h).toFixed(1)}px)`;
    el.style.zIndex = String(Math.round((1 - anchor.z) * 1000));
  };
  const updateTags = () => {
    const w = sceneEl.clientWidth, h = sceneEl.clientHeight;
    stations.forEach((s, i) => {
      s.group.localToWorld(anchor.copy(s.anchor));
      placeTag(stationTags[i], w, h);
    });
    rackPhones.forEach((rp, k) => {
      rp.group.localToWorld(anchor.set(0, 0.68, 0));
      placeTag(appTags[k], w, h);
    });
  };
  const refreshTags = () => {
    const f = state.focus;
    stationTags.forEach((el) => el.classList.toggle("is-hidden", state.showApps || !!f));
    appTags.forEach((el, k) => {
      el.classList.toggle("is-hidden", !state.showApps);
      el.classList.toggle("is-active", !!(f && f.type === "app" && f.index === k));
    });
    sceneEl.classList.toggle("is-focused", !!f);
  };

  /* Panel */
  const panelId = panel.querySelector(".panel-id");
  const panelStatus = panel.querySelector(".panel-status");
  const panelIcon = panel.querySelector(".panel-icon");
  const panelLinks = panel.querySelector(".panel-links");
  const openPanel = () => {
    panel.hidden = false;
    heroCopy.classList.add("is-hidden");
  };
  const closePanel = () => {
    panel.hidden = true;
    heroCopy.classList.remove("is-hidden");
  };
  const fillStationPanel = (i) => {
    const st = steps[i];
    panel.style.setProperty("--app", "#ff7a2e");
    panelId.textContent = `${T.step} ${st.num}`;
    panelStatus.textContent = "";
    panelIcon.hidden = true;
    panel.querySelector(".panel-name").textContent = st.title;
    panel.querySelector(".panel-cat").textContent = st.key;
    panel.querySelector(".panel-desc").textContent = st.desc;
    const btn = document.createElement("button");
    btn.type = "button";
    if (i < stations.length - 1) {
      btn.textContent = T.next;
      btn.addEventListener("click", () => focusStation(i + 1));
      panelLinks.replaceChildren(btn);
    } else {
      btn.textContent = T.showcase;
      btn.addEventListener("click", () => setView("showcase"));
      const a = document.createElement("a");
      a.href = "#uygulamalar";
      a.textContent = T.catalog;
      panelLinks.replaceChildren(btn, a);
    }
  };
  const fillAppPanel = (k) => {
    const app = apps[k];
    const card = app.card;
    panel.style.setProperty("--app", app.color);
    panelId.textContent = card.querySelector(".card-id").textContent;
    const status = card.querySelector(".card-status");
    panelStatus.textContent = status.textContent;
    panelStatus.className = `panel-status ${status.classList.contains("is-soon") ? "is-soon" : "is-live"}`;
    panelIcon.hidden = false;
    panelIcon.src = app.icon;
    panel.querySelector(".panel-name").textContent = app.name;
    panel.querySelector(".panel-cat").textContent = app.cat;
    panel.querySelector(".panel-desc").textContent = card.querySelector(".card-desc").textContent;
    panelLinks.replaceChildren(...[...card.querySelector(".card-links").children].map((n) => n.cloneNode(true)));
  };

  /* Durum geçişleri */
  const setActive = (buttons, attr, value) => buttons.forEach((b) => b.classList.toggle("is-active", b.dataset[attr] === value));
  const stopJourney = () => {
    if (!journey.active) return;
    journey.active = false;
    state.mode = "assembled";
    setActive(modeButtons, "mode", "assembled");
  };

  function focusStation(i, fromJourney = false) {
    if (!fromJourney) stopJourney();
    state.focus = { type: "station", index: i };
    state.showApps = false;
    setActive(viewButtons, "view", null);
    fillStationPanel(i);
    openPanel();
    refreshTags();
    applyViewOffset();
    const s = stations[i];
    s.group.getWorldPosition(tmp);
    flyTo(tmp.clone().add(new THREE.Vector3(0, s.focusY + s.liftTarget, 0)), layout.focusR, 1.12, FACE);
  }
  function selectApp(k) {
    stopJourney();
    state.focus = { type: "app", index: k };
    state.showApps = true;
    setActive(viewButtons, "view", "showcase");
    fillAppPanel(k);
    openPanel();
    refreshTags();
    applyViewOffset();
    rackPhones[k].group.getWorldPosition(tmp);
    flyTo(tmp.clone(), layout.phoneR, 1.3, 0.12);
  }
  function setView(view, keepJourney = false) {
    if (!keepJourney) stopJourney();
    state.view = view;
    state.focus = null;
    state.showApps = view === "showcase";
    setActive(viewButtons, "view", view);
    closePanel();
    heroCopy.classList.toggle("is-hidden", view === "showcase");
    refreshTags();
    applyViewOffset();
    cameraForView(view);
  }
  const setMode = (mode) => {
    if (mode === "journey") {
      state.mode = "journey";
      setActive(modeButtons, "mode", "journey");
      journey.active = true;
      journey.idx = 0;
      journey.next = performance.now() + 3800;
      focusStation(0, true);
      return;
    }
    stopJourney();
    state.mode = mode;
    setActive(modeButtons, "mode", mode);
    stations.forEach((s, i) => {
      s.covers.forEach((c) => (c.visible = mode !== "cutaway"));
      s.liftTarget = mode === "exploded" ? 1.7 + (i % 2) * 1.1 : 0;
    });
    if (state.focus || state.view === "showcase") setView("overview");
  };

  modeButtons.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  viewButtons.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  panel.querySelector(".panel-close").addEventListener("click", () => setView(state.showApps ? "showcase" : "overview"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.focus) setView("overview");
  });

  const setPaused = (paused) => {
    state.paused = paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.setAttribute("aria-label", paused ? T.resume : T.pause);
  };
  setPaused(state.paused);
  pauseBtn.addEventListener("click", () => setPaused(!state.paused));

  /* Tıklama: kısa dokunuşta istasyonu ya da vitrindeki uygulamayı seç */
  rackPhones.forEach((rp, k) => rp.picks.forEach((m) => (m.userData.pick = { type: "app", index: k })));
  const pickables = [];
  deck.traverse((o) => {
    if (o.isMesh && o.userData.pick) pickables.push(o);
  });
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickables, false).find((h) => h.object.visible);
    return hit ? hit.object.userData.pick : null;
  };
  let down = null;
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
    stopJourney();
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const p = pick(e);
    if (!p) return;
    if (p.type === "app") selectApp(p.index);
    else focusStation(p.index);
  });
  if (finePointer) {
    canvas.addEventListener("pointermove", (e) => {
      if (e.buttons) return;
      canvas.style.cursor = pick(e) ? "pointer" : "grab";
    });
  }

  /* Boyut */
  const resize = () => {
    const w = sceneEl.clientWidth, h = sceneEl.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const mobile = window.innerWidth <= 900;
    layout = mobile
      ? { mobile, usable: 1.08, hFrac: 0.84, offX: 0, offY: h * 0.04, focusR: 13, phoneR: 7.5 }
      : { mobile, usable: 0.6, hFrac: 0.78, offX: -w * 0.16, offY: -h * 0.03, focusR: 16, phoneR: 8 };
    applyViewOffset();
    const f = state.focus;
    if (!f) cameraForView(state.view, true);
    else if (f.type === "station") {
      const s = stations[f.index];
      s.group.getWorldPosition(tmp);
      flyTo(tmp.clone().add(new THREE.Vector3(0, s.focusY + s.liftTarget - s.lift, 0)), layout.focusR, 1.12, FACE, true);
    } else {
      rackPhones[f.index].group.getWorldPosition(tmp);
      flyTo(tmp.clone(), layout.phoneR, 1.3, 0.12, true);
    }
  };
  new ResizeObserver(resize).observe(sceneEl);
  resize();
  refreshTags();

  /* Açılış: istasyonlar yukarıdan yerine iner */
  if (!reduceMotion) stations.forEach((s, i) => (s.lift = 4 + i * 1.3));

  /* Döngü — sahne görünmüyorken çizim yapılmaz */
  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(stage);
  const clock = new THREE.Clock();
  let ledTimer = 0;
  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) {
      clock.getDelta();
      return;
    }
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!state.paused) state.time += dt;
    const t = state.time;
    const moving = !state.paused;

    // Bant dokusu parçalarla aynı hızda akar (doku tekrarı / yol uzunluğu = birim başına kayma).
    beltTex.offset.x = -t * ITEM_SPEED * U.release * BELT_REPEAT;
    updateItems(t);
    stations.forEach((s) => {
      s.lift += (s.liftTarget - s.lift) * Math.min(1, dt * 3.2);
      s.group.position.y = s.lift;
      s.update(t, moving ? dt : 0);
    });
    beacon.visible = Math.floor(t * 1.5) % 2 === 0;
    if (moving && leds) {
      ledTimer += dt;
      if (ledTimer > 0.12) {
        ledTimer = 0;
        for (let k = 0; k < 14; k++) leds.setColorAt(Math.floor(Math.random() * leds.count), ledColors[Math.random() < 0.55 ? 0 : 1 + Math.floor(Math.random() * 3)]);
        leds.instanceColor.needsUpdate = true;
      }
    }

    if (anim.active) {
      // Kare hızından bağımsız: yavaş cihazda da geçiş aynı sürede biter.
      anim.t = Math.min(1, (performance.now() - anim.start) / (anim.dur * 1000));
      const k = ease(anim.t);
      camera.position.lerpVectors(anim.fromPos, anim.toPos, k);
      controls.target.lerpVectors(anim.fromTgt, anim.toTgt, k);
      if (anim.t >= 1) {
        anim.active = false;
        controls.enabled = finePointer;
      }
    }
    if (journey.active && !state.paused && performance.now() > journey.next) {
      journey.idx += 1;
      journey.next = performance.now() + 3800;
      if (journey.idx < stations.length) focusStation(journey.idx, true);
      else {
        setView("showcase", true);
        stopJourney();
      }
    }

    controls.update();
    renderer.render(scene, camera);
    updateTags();
  };
  frame();

  /* Vitrin ekranları yüklenince sahneyi göster */
  const loader = new THREE.TextureLoader();
  const loadTexture = (url) =>
    new Promise((resolve) =>
      loader.load(
        url,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = maxAniso;
          resolve(t);
        },
        undefined,
        () => resolve(null)
      )
    );
  // Vaultify'ın ekran görüntüsü yok: simgesiyle sade bir ekran çiz.
  const vaultScreen = async (app) => {
    const icon = await loadImage(app.icon);
    return canvasTex(540, 1100, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#9b2f4c");
      g.addColorStop(1, "#5a1327");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      if (icon) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(170, 250, 200, 200, 46);
        ctx.clip();
        ctx.drawImage(icon, 170, 250, 200, 200);
        ctx.restore();
      }
      ctx.textAlign = "center";
      ctx.fillStyle = "#f8edef";
      ctx.font = '600 66px "Geist", sans-serif';
      ctx.fillText("Vaultify", 270, 560);
      ctx.fillStyle = "rgba(248,237,239,.7)";
      ctx.font = '400 28px "Geist", sans-serif';
      ctx.fillText(app.cat, 270, 612);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.roundRect(60, 700 + i * 92, 420, 68, 16);
        ctx.fillStyle = "rgba(255,255,255,.12)";
        ctx.fill();
      }
    });
  };
  const textures = await Promise.all(rackPhones.map((rp) => (rp.app.screen ? loadTexture(rp.app.screen) : vaultScreen(rp.app))));
  textures.forEach((tex, k) => {
    if (!tex) return;
    const m = rackPhones[k].screen.material;
    m.map = tex;
    m.color.set(0xffffff);
    m.needsUpdate = true;
  });
  sceneEl.classList.add("is-ready");
}

init();
