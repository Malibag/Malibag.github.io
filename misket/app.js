// Misket yarışı — görüntü (three.js) + gerçek fizik (Rapier, her cihazda aynı sonuç) + saatli turnuva
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-deterministic-compat@0.19.3/rapier.mjs';
import { makeSim, funnelY } from './sim.js';
import { SLOTS, HEAT_SEC, ADV, skeleton, slotStart, trDate, raceName } from './turnuva.js';

const Q = new URLSearchParams(location.search);
const VER = '3';
const [course, NAMES] = await Promise.all([
  fetch('course.json?v=' + VER).then(r => r.json()),
  fetch('katilimcilar.json?v=' + VER).then(r => r.json()),
]);
await RAPIER.init({});
const MR = course.MR;
// ?at=2026-11-10T18:03 (Türkiye saati) -> saati kaydırarak deneme
const timeOff = Q.has('at') ? Date.parse(Q.get('at') + ':00Z') - 3 * 3600e3 - Date.now() : 0;
const nowMs = () => Date.now() + timeOff;

// ---------- sahne ----------
const mobile = matchMedia('(max-width: 820px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: Q.has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.6 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
document.getElementById('load').remove();

const scene = new THREE.Scene();
{
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2f7fd0'); gr.addColorStop(0.4, '#86c3ee'); gr.addColorStop(0.5, '#dcebf3'); gr.addColorStop(1, '#dcebf3');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}
scene.fog = new THREE.Fog(0xdcebf3, 90, 520);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

scene.add(new THREE.HemisphereLight(0xe2f2ff, 0x5f7f45, 0.85));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
sun.castShadow = true; sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 160 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const SUN_OFF = new THREE.Vector3(28, 55, 20);

const box = new THREE.Box3();
for (const pc of course.pieces) for (let i = 0; i < pc.mesh.pos.length; i += 3) box.expandByPoint(new THREE.Vector3(pc.mesh.pos[i], pc.mesh.pos[i + 1], pc.mesh.pos[i + 2]));
const center = box.getCenter(new THREE.Vector3());

{ // uzak zemin
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#86b664'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = Math.random(); g.fillStyle = v < .5 ? 'rgba(60,110,40,.35)' : 'rgba(170,210,120,.3)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(140, 140); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ map: t, roughness: 1, envMapIntensity: 0.3 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(center.x, -0.05, center.z); scene.add(ground);
}

const lin = v => Math.pow(v, 2.2);
const allPts = [];
course.pieces.forEach((pc, pi) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pc.mesh.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(pc.mesh.col.map(lin), 3));
  g.setIndex(pc.mesh.idx); g.computeVertexNormals();
  // üst üste gelen yüzeyler (çatal, birleşme) titremesin: her parça farklı derinlik payı
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05, side: THREE.DoubleSide, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: -(pi % 5) * 0.6, polygonOffsetUnits: -(pi % 5) * 2 });
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; scene.add(m);
  const rimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...pc.color.map(c => lin(Math.min(1, c * 0.55 + 0.5)))), roughness: 0.25, metalness: 0.1 });
  for (const rim of pc.rims) {
    const pts = rim.filter((_, i) => i % 3 === 0 || i === rim.length - 1).map(p => new THREE.Vector3(...p));
    if (pts.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(pts, pc.kind === 'funnel');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 2, 0.05, 6, pc.kind === 'funnel'), rimMat);
    tube.castShadow = true; scene.add(tube);
  }
  if (pc.kind === 'chute') pc.F.P.forEach((p, i) => { if (i % 3 === 0) allPts.push([p[0], p[1], p[2], pc.W[i] / 2, pc]); });
  else for (let r = pc.Rh; r <= pc.Rr; r += 0.6) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; allPts.push([pc.C[0] + r * Math.cos(a), funnelY(pc, r), pc.C[2] + r * Math.sin(a), 0.5, pc]); }
});

// arazi: parkurun altında onu izleyen dağ yamacı
const tPts = allPts.filter((_, i) => i % 2 === 0);
function terrainH(x, z) {
  let cone = 0, cap = 1e9;
  for (const q of tPts) {
    const dx = q[0] - x, dz = q[2] - z, d = Math.max(0, Math.sqrt(dx * dx + dz * dz) - q[3]);
    const base = q[1] - 2.4;
    const c = base - d * 0.62; if (c > cone) cone = c;
    const k = base + Math.max(0, d - 2.5) * 0.55; if (k < cap) cap = k;
  }
  return Math.max(0, Math.min(cone, cap));
}
{
  const M = 150, S = 3;
  const x0 = box.min.x - M, z0 = box.min.z - M, nx = Math.ceil((box.max.x - box.min.x + 2 * M) / S), nz = Math.ceil((box.max.z - box.min.z + 2 * M) / S);
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = new Float32Array(pos.length), idx = [];
  const rr = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i, x = x0 + i * S, z = z0 + j * S;
    pos[k * 3] = x; pos[k * 3 + 1] = terrainH(x, z) - 0.02; pos[k * 3 + 2] = z;
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const nrm = g.getAttribute('normal');
  const grass = new THREE.Color(0x6fa64c), grass2 = new THREE.Color(0x8cbc5c), rock = new THREE.Color(0x8d8a80), c = new THREE.Color();
  for (let k = 0; k < pos.length / 3; k++) {
    c.copy(grass).lerp(grass2, rr() * 0.6);
    c.lerp(rock, Math.max(0, Math.min(1, (0.86 - nrm.getY(k)) * 4)));
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // arazi gölge almıyor: gölge karesinin kenarı zeminde iz bırakmasın
  scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, envMapIntensity: 0.25 })));
}

{ // destek direkleri: yalnız kısa olanlar (uzun ince direkler kötü görünüyordu)
  const mats = [];
  const clear = (x, z, y, self) => allPts.every(q => q[4] === self || q[1] > y - 0.3 || Math.hypot(q[0] - x, q[2] - z) > q[3] + 0.45);
  const addPole = (x, y, z, self) => { const g = terrainH(x, z), L = y - g + 0.3; if (L > 0.5 && L < 9 && clear(x, z, y, self)) mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, g - 0.3 + L / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, L, 1))); };
  for (const pc of course.pieces) {
    if (pc.kind === 'chute') { for (let i = 10; i < pc.F.P.length - 5; i += 22) { const p = pc.F.P[i], u = pc.F.U[i]; addPole(p[0] - u[0] * 0.05, p[1] - 0.06, p[2] - u[2] * 0.05, pc); } }
    else for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4, r = pc.Rr * 0.75; addPole(pc.C[0] + r * Math.cos(a), funnelY(pc, r) - 0.06, pc.C[2] + r * Math.sin(a), pc); }
  }
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.12, 1, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, metalness: 0.1, roughness: 0.7 }), mats.length);
  mats.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = true; scene.add(im);
}

{ // ağaçlar
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const trunks = [], crowns = [];
  const size = box.getSize(new THREE.Vector3());
  for (let k = 0; k < 2500 && crowns.length < 420; k++) {
    const x = center.x + (rnd() - 0.5) * (size.x + 160), z = center.z + (rnd() - 0.5) * (size.z + 160), h = 3 + rnd() * 4, g = terrainH(x, z);
    if (!allPts.every(q => Math.hypot(q[0] - x, q[2] - z) > q[3] + 2.5 || q[1] > g + h + 1.5)) continue;
    trunks.push(new THREE.Matrix4().compose(new THREE.Vector3(x, g + h * 0.25, z), new THREE.Quaternion(), new THREE.Vector3(1, h * 0.5, 1)));
    crowns.push(new THREE.Matrix4().compose(new THREE.Vector3(x, g + h * 0.62, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * 6, 0)), new THREE.Vector3(h * 0.33, h * 0.42, h * 0.33)));
  }
  const tI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 1, 6), new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 1 }), trunks.length);
  const cI = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x4f8f3a, roughness: 0.9, flatShading: true }), crowns.length);
  trunks.forEach((m, i) => tI.setMatrixAt(i, m)); crowns.forEach((m, i) => { cI.setMatrixAt(i, m); cI.setColorAt(i, new THREE.Color(0.75 + rnd() * 0.35, 0.8 + rnd() * 0.25, 0.7 + rnd() * 0.2)); });
  tI.castShadow = cI.castShadow = true; scene.add(tI, cI);
}

{ // çiviler
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ color: 0xe8edf2, metalness: 0.9, roughness: 0.18 }), course.pegs.length);
  course.pegs.forEach((pg, i) => im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(...pg.c), new THREE.Quaternion(...pg.q), new THREE.Vector3(pg.r, pg.h, pg.r))));
  im.castShadow = true; scene.add(im);
}

// yaylar ve balonlar (çarpınca parlar/şişer)
const stripeTex = (() => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  for (let x = 0; x < 8; x++) { g.fillStyle = x % 2 ? '#ffffff' : '#ff6a00'; g.beginPath(); g.moveTo(x * 16, 0); g.lineTo(x * 16 + 16, 0); g.lineTo(x * 16 + 4, 32); g.lineTo(x * 16 - 12, 32); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const bumpVis = course.bumpers.map((b, k) => {
  const grp = new THREE.Group(); grp.position.set(...b.p); grp.quaternion.set(...b.q);
  if (b.kind === 'balloon') {
    const hue = [0xff3b5c, 0x3bb4ff, 0xffd23b, 0x7bff5a, 0xc56bff][k % 5];
    const mat = new THREE.MeshPhysicalMaterial({ color: hue, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, emissive: hue, emissiveIntensity: 0 });
    const s = new THREE.Mesh(new THREE.SphereGeometry(b.r, 24, 16), mat); s.castShadow = true; grp.add(s);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 10), mat); knot.position.y = -b.r - 0.02; knot.rotation.x = Math.PI; grp.add(knot);
    grp.userData = { mat, mesh: s, pulse: 0 };
  } else {
    const mat = new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.35, metalness: 0.2, emissive: 0xff7a1a, emissiveIntensity: 0 });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(b.he[0] * 2, b.he[1] * 2, b.he[2] * 2), mat); plate.castShadow = true; grp.add(plate);
    grp.userData = { mat, mesh: plate, pulse: 0 };
  }
  scene.add(grp); return grp;
});

// hareketli parçalar
const kinGroups = course.kins.map(k => {
  const grp = new THREE.Group();
  const col = { gate: 0xf2f2f2, wheel: 0xffc21a, spin: 0xff4a4a }[k.type];
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.15 });
  const hub = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.6 });
  for (const pt of k.parts) {
    const geo = pt.shape === 'box' ? new THREE.BoxGeometry(pt.he[0] * 2, pt.he[1] * 2, pt.he[2] * 2) : new THREE.CylinderGeometry(pt.r, pt.r, pt.hh * 2, 16);
    const mesh = new THREE.Mesh(geo, pt.shape === 'box' ? mat : hub);
    mesh.position.set(...pt.p); mesh.quaternion.set(...pt.q); mesh.castShadow = true; grp.add(mesh);
  }
  grp.position.set(...k.base); grp.quaternion.set(...k.q0);
  scene.add(grp); return grp;
});

// başlangıç ve bitiş kemerleri
function textTex(txt, bg, fg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 96); g.fillStyle = fg; g.font = '900 60px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function arch(pc, i, txt, bg) {
  const F = pc.F, w = pc.W[i] + 0.5, P = new THREE.Vector3(...F.P[i]);
  const L = new THREE.Vector3(...F.L[i]), U = new THREE.Vector3(...F.U[i]), T = new THREE.Vector3(...F.T[i]);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(L, U, T));
  const grp = new THREE.Group(); grp.position.copy(P); grp.quaternion.copy(q);
  const postM = new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.6, roughness: 0.4 });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 10), postM); p.position.set(s * w / 2, 1.3, 0); p.castShadow = true; grp.add(p); }
  const ban = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.55, 0.08), [postM, postM, postM, postM, new THREE.MeshStandardMaterial({ map: textTex(txt, bg, '#fff') }), new THREE.MeshStandardMaterial({ map: textTex(txt, bg, '#fff') })]);
  ban.position.set(0, 2.45, 0); ban.castShadow = true; grp.add(ban);
  scene.add(grp);
}
arch(course.pieces[course.start], course.gate + 2, 'BAŞLA', '#d43c3c');
{
  const E = course.pieces[course.finish.piece], fi = Math.round(course.finish.s / 0.2);
  arch(E, fi, 'BİTİŞ', '#161a20');
  const c = document.createElement('canvas'); c.width = 256; c.height = 32; const g = c.getContext('2d');
  for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 16, y * 16, 16, 16); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const F = E.F, w = E.W[fi] - 0.4;
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 8), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 }));
  const L = new THREE.Vector3(...F.L[fi]), U = new THREE.Vector3(...F.U[fi]), T = new THREE.Vector3(...F.T[fi]);
  pl.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(L, T.clone().negate(), U));
  pl.position.set(...F.P[fi]).addScaledVector(U, 0.012); pl.receiveShadow = true; scene.add(pl);
}

// misketler: her takipçinin rengi sırasına göre sabit
const colorOf = gid => { const h = (gid * 0.61803398875) % 1, s = 0.72 + (gid % 3) * 0.09, l = 0.45 + (gid % 4) * 0.05; return new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace); };
const cssOf = gid => '#' + colorOf(gid).getHexString(THREE.SRGBColorSpace);
const swirl = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, 512, 256);
  const band = (y0, amp, wid, col) => { g.strokeStyle = col; g.lineWidth = wid; g.beginPath(); for (let x = -10; x <= 522; x += 8) { const y = y0 + Math.sin(x / 512 * Math.PI * 4) * amp; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); };
  band(70, 40, 34, '#ffffff'); band(150, 50, 22, '#8a8a8a'); band(200, 30, 18, '#ffffff'); band(110, 60, 10, '#5c5c5c'); band(30, 20, 14, '#a8a8a8');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
})();
const MAXN = 100;
const mMat = new THREE.MeshPhysicalMaterial({ map: swirl, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1 });
const marbles = new THREE.InstancedMesh(new THREE.SphereGeometry(MR, mobile ? 20 : 28, mobile ? 14 : 20), mMat, MAXN);
marbles.castShadow = true; marbles.frustumCulled = false; marbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
for (let m = 0; m < MAXN; m++) marbles.setColorAt(m, new THREE.Color(1, 1, 1));
marbles.count = 0;
scene.add(marbles);
const dummy = new THREE.Object3D();
const marker = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 14), new THREE.MeshBasicMaterial({ color: 0xffd23a, depthTest: false, transparent: true }));
marker.rotation.x = Math.PI; marker.renderOrder = 999; marker.visible = false; scene.add(marker);

// ---------- yarış durumu ----------
let sim = null, race = null, ids = [], simStartMs = 0, eventKey = '', ev = null, endShown = false;
const docs = {}; // tarih -> sonuç dosyası (yoksa null)
async function loadDoc(date, force) {
  if (!force && docs[date]) return docs[date];
  const t = Math.floor(Date.now() / 60000);
  for (const u of [`sonuc/${date}.json?t=${t}`, `https://raw.githubusercontent.com/Malibag/Malibag.github.io/main/misket/sonuc/${date}.json?t=${t}`]) {
    try { const r = await fetch(u, { cache: 'no-store' }); if (r.ok) { docs[date] = await r.json(); return docs[date]; } } catch { }
  }
  docs[date] = docs[date] || null;
  return docs[date];
}
function slotRaces(date, hour) {
  const d = docs[date], s = d && d.slots && d.slots[hour];
  if (s && s.n === NAMES.length) return { races: s.races, official: true };
  return { races: skeleton(date, hour, NAMES.length), official: false };
}
function findEvent(now) {
  const today = trDate(now), yest = trDate(now - 86400e3), tom = trDate(now + 86400e3);
  let next = null, lastDone = null;
  for (const d of [yest, today, tom]) for (const h of SLOTS) {
    const st = slotStart(d, h), { races, official } = slotRaces(d, h), endW = st + races.length * HEAT_SEC * 1000;
    if (now >= st && now < endW) {
      const k = Math.floor((now - st) / (HEAT_SEC * 1000));
      return { type: 'live', date: d, hour: h, races, official, race: races[k], next: races[k + 1] || null, nextStart: st + (k + 1) * HEAT_SEC * 1000, key: `live|${d}|${h}|${k}|${races[k].ids ? 1 : 0}` };
    }
    if (st > now && !next) next = { date: d, hour: h, start: st };
    if (endW <= now && official) lastDone = { date: d, hour: h, races };
  }
  if (lastDone) {
    const fin = lastDone.races[lastDone.races.length - 1];
    return { type: 'replay', date: lastDone.date, hour: lastDone.hour, races: lastDone.races, official: true, race: fin, nextSlot: next, key: `replay|${lastDone.date}|${lastDone.hour}` };
  }
  const n = Math.min(MAXN, NAMES.length); // hiç sonuç yoksa: tanıtım yarışı
  return { type: 'demo', race: { ids: Array.from({ length: n }, (_, i) => i), seed: 12345, final: true, size: n }, nextSlot: next, key: 'demo' };
}

function startRace(e, startMs) {
  if (sim) { sim.world.free(); sim = null; }
  race = e.race; ids = race.ids || [];
  endShown = false; $('res').style.display = 'none';
  if (!ids.length) { marbles.count = 0; return; }
  sim = makeSim(RAPIER, course, { n: ids.length, seed: race.seed });
  simStartMs = startMs;
  marbles.count = ids.length;
  for (let m = 0; m < ids.length; m++) marbles.setColorAt(m, colorOf(ids[m]));
  marbles.instanceColor.needsUpdate = true;
  const li = followGid >= 0 ? ids.indexOf(followGid) : -1;
  if (li >= 0) { target = li; setMode('follow'); }
  else if (!camFree) { target = -1; if (followGid >= 0) setMode('lead'); }
}

function syncMarbles() {
  if (!sim) return;
  for (let m = 0; m < ids.length; m++) {
    const b = sim.bodies[m], t = b.translation(), r = b.rotation();
    dummy.position.set(t.x, t.y, t.z); dummy.quaternion.set(r.x, r.y, r.z, r.w); dummy.updateMatrix(); marbles.setMatrixAt(m, dummy.matrix);
  }
  marbles.instanceMatrix.needsUpdate = true;
  course.kins.forEach((k, i) => { const b = sim.kinBodies[i], t = b.translation(), r = b.rotation(); kinGroups[i].position.set(t.x, t.y, t.z); kinGroups[i].quaternion.set(r.x, r.y, r.z, r.w); });
  bumpVis.forEach((g, k) => { // yay/balon çarpma efekti
    const b = course.bumpers[k], ud = g.userData, R2 = b.kind === 'balloon' ? 0.26 : 0.2; let hit = false;
    for (let m = 0; m < ids.length && !hit; m++) { const t = sim.bodies[m].translation(), dx = t.x - b.p[0], dy = t.y - b.p[1], dz = t.z - b.p[2]; if (dx * dx + dy * dy + dz * dz < R2) hit = true; }
    ud.pulse = hit ? 1 : Math.max(0, ud.pulse - 0.06);
    ud.mat.emissiveIntensity = ud.pulse * 0.9;
    const s = 1 + ud.pulse * (b.kind === 'balloon' ? 0.18 : 0.08); ud.mesh.scale.set(s, b.kind === 'balloon' ? 1 / Math.sqrt(s) : s, s);
  });
}

// ---------- kamera ----------
const portrait = innerHeight > innerWidth;
const cam = new THREE.PerspectiveCamera(portrait ? 72 : 55, innerWidth / innerHeight, 0.1, 900);
const controls = new OrbitControls(cam, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.12; controls.minDistance = 0.8; controls.maxDistance = 320; controls.maxPolarAngle = Math.PI * 0.495;
let target = -1, followGid = -1, camFree = false, camManual = false;
const camPos = new THREE.Vector3(), look = new THREE.Vector3(), camDir = new THREE.Vector3(0, 0, 1);
let lift = 0;
{ // açılış: kapının önünden misketlere bakış
  const A = course.pieces[course.start], i = course.gate + 18;
  camPos.set(...A.F.P[i]).add(new THREE.Vector3(0, 2.6, 0)); look.set(...A.F.P[course.gate - 14]); camDir.set(...A.F.T[course.gate]).setY(0).normalize();
  cam.position.copy(camPos); controls.target.copy(look);
}
const tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();
const funnels = course.pieces.filter(p => p.kind === 'funnel');
const prevOf = new Map(); course.pieces.forEach((p, i) => (p.next || []).forEach(n => { if (!prevOf.has(n)) prevOf.set(n, i); }));
function targetId(rank) {
  if (target >= 0) return target;
  for (const m of rank) if (sim.fin[m] < 0 || sim.t - sim.fin[m] < 2.5) return m;
  return rank[0];
}
function setMode(m) { // 'lead' | 'free' | 'follow'
  camFree = m === 'free';
  if (m === 'lead') { target = -1; followGid = -1; camManual = false; }
  if (m === 'free') { target = null; camManual = true; }
  if (m === 'follow') camManual = false;
  controls.enablePan = camFree;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: camFree ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.DOLLY_ROTATE };
  $('bLead').classList.toggle('on', m === 'lead');
  $('bFree').classList.toggle('on', m === 'free');
  updateAutoChip();
}
function updateAutoChip() { $('bAuto').hidden = !(camManual && !camFree); }
function autoCam(dt, rank) {
  if (!sim || sim.t < 3.5 || target == null) return false;
  const id = targetId(rank), b = sim.bodies[id], t = b.translation(), v = b.linvel(), pc = course.pieces[sim.piece[id]];
  const p = tmpL.set(t.x, t.y, t.z);
  if (pc.kind === 'funnel') {
    tmpV.set(camPos.x - pc.C[0], 0, camPos.z - pc.C[2]).normalize().multiplyScalar(pc.Rr * 0.9);
    tmpV.add(new THREE.Vector3(pc.C[0], funnelY(pc, pc.Rr) + pc.Rr * 1.6 + 1.5, pc.C[2]));
    camPos.lerp(tmpV, 1 - Math.exp(-dt * 2.5)); look.lerp(new THREE.Vector3(pc.C[0], funnelY(pc, pc.Rh * 2), pc.C[2]), 1 - Math.exp(-dt * 4));
  } else {
    const hv = new THREE.Vector3(v.x, 0, v.z); const sp = hv.length();
    let mis = 0;
    if (sp > 0.6) { hv.multiplyScalar(1 / sp); mis = 1 - hv.dot(camDir); camDir.lerp(hv, 1 - Math.exp(-dt * 3.2)).normalize(); }
    lift += (Math.min(3.5, mis * 7) - lift) * (1 - Math.exp(-dt * 2));
    const i = sim.idx[id], pv = prevOf.get(sim.piece[id]);
    if (pv != null && course.pieces[pv].kind === 'funnel' && pc.F.s[i] < 8) { // huniden düşüş: önden bak
      const T = pc.F.T[Math.min(pc.F.T.length - 1, i + 15)], f = new THREE.Vector3(T[0], 0, T[2]).normalize();
      tmpV.copy(p).addScaledVector(f, 6.5); tmpV.y += 2.2;
      camPos.lerp(tmpV, 1 - Math.exp(-dt * 3)); look.lerp(p, 1 - Math.exp(-dt * 6));
    } else {
      const back = 3.0 + Math.min(2.5, sp * 0.16);
      tmpV.copy(p).addScaledVector(camDir, -back); tmpV.y += 4.3 + Math.min(1.8, sp * 0.1) + lift;
      camPos.lerp(tmpV, 1 - Math.exp(-dt * 4.5));
      look.lerp(p.clone().addScaledVector(camDir, 2.0), 1 - Math.exp(-dt * 9));
    }
  }
  for (const f of funnels) { // huninin içine/altına girmesin
    const dx = camPos.x - f.C[0], dz = camPos.z - f.C[2], r = Math.hypot(dx, dz);
    if (r < f.Rr + 1.2 && camPos.y < funnelY(f, f.Rr) + f.hw + 0.8 && camPos.y > f.spoutBottom - 4) { const k = (f.Rr + 1.2) / Math.max(0.01, r); camPos.x = f.C[0] + dx * k; camPos.z = f.C[2] + dz * k; }
  }
  return true;
}
const lastTgt = new THREE.Vector3(); let haveLast = false;
function updateCam(dt, rank) {
  if (!camManual) {
    if (autoCam(dt, rank)) { cam.position.copy(camPos); controls.target.copy(look); }
    haveLast = false;
  } else {
    if (!camFree && sim && target != null) { // elle kamera ama misketi izlemeye devam
      const q = sim.bodies[targetId(rank)].translation(); tmpL.set(q.x, q.y, q.z);
      if (haveLast) { tmpV.subVectors(tmpL, lastTgt); cam.position.add(tmpV); }
      controls.target.copy(tmpL); lastTgt.copy(tmpL); haveLast = true;
    } else haveLast = false;
    controls.update();
    camPos.copy(cam.position); look.copy(controls.target);
  }
  const gy = terrainH(cam.position.x, cam.position.z) + 0.8; if (cam.position.y < gy) cam.position.y = gy;
  cam.lookAt(controls.target);
  if (sim && target != null && sim.t > 3.5) {
    const q = sim.bodies[targetId(rank)].translation();
    marker.visible = true; marker.position.set(q.x, q.y + 0.62 + Math.sin(performance.now() / 180) * 0.06, q.z);
  } else marker.visible = false;
  sun.target.position.copy(controls.target); sun.position.copy(controls.target).add(SUN_OFF);
}

// ---------- arayüz ----------
const $ = id => document.getElementById(id);
const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60); return m + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
const fmtW = ms => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };
const hhmm = ms => new Date(ms + 3 * 3600e3).toISOString().slice(11, 16);
const board = $('board'), labels = $('labels');
const lblPool = Array.from({ length: 4 }, () => { const d = document.createElement('div'); d.className = 'lbl'; d.style.display = 'none'; labels.appendChild(d); return d; });
board.addEventListener('click', e => { const r = e.target.closest('.row'); if (r) follow(+r.dataset.g); });
$('bLead').onclick = () => setMode('lead');
$('bFree').onclick = () => { setMode('free'); toast('Serbest kamera: sürükle, iki parmakla yaklaş/kaydır'); };
$('bAuto').onclick = () => { camManual = false; updateAutoChip(); };
setMode('lead');

// elle kamera: sürükleme / yakınlaştırma başlayınca otomatik kamera bırakılır; kısa dokunuş misket seçer
{
  const el = renderer.domElement; let down = null, moved = false, ptrs = 0;
  el.addEventListener('pointerdown', e => { ptrs++; down = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = ptrs > 1; });
  el.addEventListener('pointermove', e => {
    if (!down) return;
    if (ptrs > 1 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { moved = true; if (!camManual) { camManual = true; updateAutoChip(); } }
  });
  const up = e => { ptrs = Math.max(0, ptrs - 1); if (down && !moved && performance.now() - down.t < 350) pick(e.clientX, e.clientY); if (!ptrs) down = null; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', () => { ptrs = 0; down = null; });
  el.addEventListener('wheel', () => { if (!camManual) { camManual = true; updateAutoChip(); } }, { passive: true });
}
function pick(x, y) {
  if (!sim) return;
  let best = -1, bd = (mobile ? 44 : 30) ** 2;
  for (let m = 0; m < ids.length; m++) {
    const t = sim.bodies[m].translation(); tmpV.set(t.x, t.y, t.z).project(cam);
    if (tmpV.z > 1) continue;
    const sx = (tmpV.x * 0.5 + 0.5) * innerWidth, sy = (-tmpV.y * 0.5 + 0.5) * innerHeight, d = (sx - x) ** 2 + (sy - y) ** 2;
    if (d < bd) { bd = d; best = m; }
  }
  if (best >= 0) follow(ids[best]);
}
function follow(gid) {
  followGid = gid; const li = ids.indexOf(gid);
  if (li >= 0) { target = li; setMode('follow'); toast('Takip: ' + NAMES[gid]); }
}

// arama: adını yaz, misketini bul
const sBox = $('search'), sIn = $('sIn'), sList = $('sList'), sInfo = $('sInfo');
$('bFind').onclick = () => { sBox.hidden = !sBox.hidden; if (!sBox.hidden) { sIn.value = ''; sList.innerHTML = ''; sInfo.textContent = ''; sIn.focus(); } };
$('sClose').onclick = () => { sBox.hidden = true; };
const lower = s => s.toLocaleLowerCase('tr');
sIn.addEventListener('input', () => {
  const q = lower(sIn.value.trim().replace(/^@/, '')); sInfo.textContent = '';
  if (!q) { sList.innerHTML = ''; return; }
  const out = []; for (let g = 0; g < NAMES.length && out.length < 8; g++) if (lower(NAMES[g]).includes(q)) out.push(g);
  sList.innerHTML = out.map(g => `<div class="row" data-g="${g}"><span class="dot" style="background:${cssOf(g)}"></span><span class="nm">${NAMES[g]}</span></div>`).join('') || '<div class="hint">Bulunamadı</div>';
});
sList.addEventListener('click', e => {
  const r = e.target.closest('.row'); if (!r) return; const g = +r.dataset.g;
  if (sim && ids.includes(g)) { follow(g); sBox.hidden = true; return; }
  followGid = g; sInfo.innerHTML = `<b>${NAMES[g]}</b>: ${statusOf(g)}`;
});
function statusOf(g) {
  if (!ev || !ev.races) return 'Şu an yarışta değil.';
  const rs = ev.races, tag = ev.type === 'replay' ? `${ev.hour}:00 turnuvasında ` : '';
  let last = null;
  for (const r of rs) if (r.ids && r.ids.includes(g)) last = r;
  if (!last) return tag + '1. turda elendi.';
  const done = last.result && (ev.type === 'replay' || nowMs() >= last.start + (last.end + 2) * 1000);
  if (!done) return `${tag}${raceName(last)} yarışında · başlangıç ${hhmm(last.start)}. Yarış başlayınca kamera onu izler.`;
  const pos = last.result.indexOf(g) + 1;
  if (last.final) return `${tag}Finalde ${pos}. oldu${pos === 1 ? ' — ŞAMPİYON!' : '.'}`;
  if (pos <= Math.min(ADV, last.size)) return `${tag}${raceName(last)} yarışında ${pos}. oldu, tur atladı.`;
  return `${tag}${raceName(last)} yarışında ${pos}. oldu, elendi.`;
}

function row(m, rank) {
  const g = ids[m], tm = sim.fin[m] >= 0 ? fmt(sim.fin[m] - sim.open) : '';
  const cut = !race.final && rank === Math.min(ADV, ids.length) ? ' cut' : '';
  return `<div class="row${target === m ? ' sel' : ''}${cut}" data-g="${g}"><span class="rk">${rank}.</span><span class="dot" style="background:${cssOf(g)}"></span><span class="nm">${NAMES[g]}</span><span class="tm">${tm}</span></div>`;
}
function titleOf(e) {
  if (e.type === 'live') return `${e.hour}:00 Turnuvası · ${raceName(e.race)}`;
  if (e.type === 'replay') return `Tekrar · ${e.hour}:00 Finali`;
  return 'Tanıtım yarışı';
}
let boardT = 0, toastT = 0, shownWin = false, behind = 0;
function updateUI(dt, rank) {
  const now = nowMs();
  $('ttl').textContent = ev ? titleOf(ev) : '';
  $('clock').textContent = fmt(sim && sim.open != null ? sim.t - sim.open : 0);
  let sub = '';
  if (!sim) sub = ev?.type === 'live' ? 'Bu yarışın katılımcıları hesaplanıyor…' : '';
  else if (sim.open == null) sub = `${ids.length} misket kapıda`;
  else sub = sim.nFin ? `Bitiren ${sim.nFin}/${ids.length}` : `Lider: ${NAMES[ids[rank[0]]]}`;
  $('sub').textContent = sub;
  let nx = '';
  if (ev?.type === 'live') nx = ev.next ? `Sıradaki: ${raceName(ev.next)} · ${fmtW(ev.nextStart - now)}` : `Turnuva bitiyor · ${fmtW(ev.nextStart - now)}`;
  else if (ev?.nextSlot) nx = `Sıradaki turnuva ${ev.nextSlot.hour}:00 · ${fmtW(ev.nextSlot.start - now)}`;
  $('nxt').textContent = nx;
  $('sync').hidden = !(sim && behind > 1.5);
  if (sim && (boardT -= dt) <= 0) {
    boardT = 0.25;
    const top = mobile ? 8 : 12; let html = '';
    for (let k = 0; k < Math.min(top, ids.length); k++) html += row(rank[k], k + 1);
    if (target != null && target >= 0) { const k = rank.indexOf(target); if (k >= top) html += row(target, k + 1); }
    board.innerHTML = html;
  }
  if (!sim) board.innerHTML = '';
  if (sim && !shownWin && sim.nFin > 0) { shownWin = true; toast((race.final ? 'Kazanan: ' : 'Elemeyi kazanan: ') + NAMES[ids[rank[0]]]); }
  if (toastT > 0 && (toastT -= dt) <= 0) $('toast').classList.remove('on');
  if (sim && !endShown && sim.ended) { endShown = true; showResults(rank); }
  const c = $('count'); // geri sayım (kapı 4. saniyede açılır)
  c.textContent = !sim || sim.t < 0.4 || sim.t > 4.6 ? '' : sim.t < 3.4 ? String(Math.ceil(3.4 - sim.t)) : 'BAŞLA!';
  const ls = sim && sim.open != null ? rank.slice(0, 3) : []; // etiketler: ilk 3 + takip edilen
  if (sim && target != null && target >= 0 && !ls.includes(target)) ls.push(target);
  lblPool.forEach((d, k) => {
    const m = ls[k]; if (m == null) { d.style.display = 'none'; return; }
    const t = sim.bodies[m].translation(); tmpV.set(t.x, t.y + MR * 2.2, t.z);
    if (tmpV.distanceTo(cam.position) > 40) { d.style.display = 'none'; return; }
    tmpV.project(cam);
    if (tmpV.z > 1) { d.style.display = 'none'; return; }
    d.style.display = ''; const txt = `${rank.indexOf(m) + 1}. ${NAMES[ids[m]]}`;
    if (d.textContent !== txt) { d.textContent = txt; d.style.borderLeftColor = cssOf(ids[m]); }
    d.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * innerWidth}px, ${(-tmpV.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -130%)`;
  });
}
function toast(t) { const d = $('toast'); d.textContent = t; d.classList.add('on'); toastT = 4; }
function showResults(rank) {
  // resmî sonuç varsa onu göster (her cihazda aynı liste)
  const off = ev.official && race.result ? race.result : rank.map(m => ids[m]);
  const finOf = g => { if (ev.official && race.result) { const i = race.result.indexOf(g); return race.fin[i]; } const m = ids.indexOf(g); return sim.fin[m] >= 0 ? sim.fin[m] - sim.open : -1; };
  const adv = race.final ? 0 : Math.min(ADV, ids.length);
  let html = race.final ? `<h2>${ev.type === 'live' ? 'Final bitti' : ev.type === 'replay' ? 'Final (tekrar)' : 'Yarış bitti'}</h2><div class="win">🏆 Şampiyon: <b>${NAMES[off[0]]}</b> · ${fmt(finOf(off[0]))}</div>`
    : `<h2>${raceName(race)} bitti</h2><div class="win">İlk ${adv} tur atladı</div>`;
  html += '<div class="grid">';
  off.forEach((g, k) => { const f = finOf(g); html += `<div class="row ${k < 3 ? 'p' + (k + 1) : ''}${k < adv ? ' adv' : ''}"><span class="rk">${k + 1}.</span><span class="dot" style="background:${cssOf(g)}"></span><span class="nm">${NAMES[g]}</span><span class="tm">${f >= 0 ? fmt(f) : '—'}</span></div>`; });
  html += '</div>';
  if (ev.type !== 'live') html += '<button id="again">Tekrar izle</button> ';
  html += '<button id="close" style="background:#dfe5ec">Kapat</button>';
  const r = $('res'); r.querySelector('.box').innerHTML = html; r.style.display = 'flex';
  if ($('again')) $('again').onclick = () => { eventKey = ''; };
  $('close').onclick = () => { r.style.display = 'none'; };
}

// ---------- döngü ----------
let lastCheck = 0;
async function tick() { // her saniye: hangi yarış gösterilmeli?
  const now = nowMs(), d = trDate(now);
  if (!(d in docs) || now - lastCheck > 60000) { lastCheck = now; await Promise.all([loadDoc(d, true), loadDoc(trDate(now - 86400e3))]); }
  const e = findEvent(now);
  ev = e;
  if (e.key !== eventKey) { eventKey = e.key; shownWin = false; startRace(e, e.type === 'live' ? e.race.start : now); }
}
await tick();
setInterval(tick, 1000);

if (Q.has('t') && sim) { // test görüntüsü: belirtilen saniyeye sar
  const until = +Q.get('t'); while (sim.t < until) sim.step(); simStartMs = nowMs() - until * 1000;
  const rk = sim.ranking(); for (let i = 0; i < 400; i++) updateCam(1 / 60, rk);
  if (Q.get('cam') === 'free') { setMode('free'); cam.position.set(center.x + 70, box.max.y + 25, center.z + 70); controls.target.copy(center); controls.update(); }
}
let last = performance.now();
function frame(nowP) {
  const dt = Math.max(0, Math.min(0.05, (nowP - last) / 1000)); last = Math.max(last, nowP);
  if (sim && !Q.has('shot')) { // gerçek saate yetiş: telefon yavaşsa her karede bütçe kadar adım
    const tgt = (nowMs() - simStartMs) / 1000, t0 = performance.now();
    let k = 0;
    while (sim.t < tgt && !(sim.ended && sim.t > sim.endT + 8)) { sim.step(); if (++k % 8 === 0 && performance.now() - t0 > 26) break; }
    behind = sim.ended ? 0 : tgt - sim.t;
  }
  const rank = sim ? sim.ranking() : [];
  syncMarbles(); updateCam(dt, rank); updateUI(dt, rank);
  renderer.render(scene, cam);
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.fov = innerHeight > innerWidth ? 72 : 55; cam.updateProjectionMatrix(); });
requestAnimationFrame(frame);
