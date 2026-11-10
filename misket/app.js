// Misket yarışı — görüntü (three.js) + gerçek fizik (Rapier)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/rapier.es.js';
import { buildCourse, MR } from './course.js';
import { makeSim } from './sim.js';

const Q = new URLSearchParams(location.search);
const N = Math.max(10, Math.min(150, +(Q.get('n') || 100)));
const SEED = +(Q.get('seed') || (Date.now() % 100000));
await RAPIER.init();
const course = buildCourse();
const sim = makeSim(RAPIER, course, { n: N, seed: SEED });
for (let i = 0; i < 240; i++) sim.step(); // misketler kapının arkasına otursun

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
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 160 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const SUN_OFF = new THREE.Vector3(28, 55, 20);

// sınırlar
const box = new THREE.Box3();
for (const pc of course.pieces) for (let i = 0; i < pc.mesh.pos.length; i += 3) box.expandByPoint(new THREE.Vector3(pc.mesh.pos[i], pc.mesh.pos[i + 1], pc.mesh.pos[i + 2]));
const center = box.getCenter(new THREE.Vector3());

// zemin
{
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#86b664'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = Math.random(); g.fillStyle = v < .5 ? 'rgba(60,110,40,.35)' : 'rgba(170,210,120,.3)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(140, 140); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ map: t, roughness: 1, envMapIntensity: 0.3 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(center.x, 0, center.z); ground.receiveShadow = true; scene.add(ground);
}

const lin = v => Math.pow(v, 2.2);
// pist parçaları
const trackMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05, side: THREE.DoubleSide, envMapIntensity: 0.6 });
const allPts = []; // destek/ağaç kontrolü
for (const pc of course.pieces) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pc.mesh.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(pc.mesh.col.map(lin), 3));
  g.setIndex(pc.mesh.idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, trackMat); m.castShadow = m.receiveShadow = true; scene.add(m);
  const rimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...pc.color.map(c => lin(Math.min(1, c * 0.55 + 0.5)))), roughness: 0.25, metalness: 0.1 });
  for (const rim of pc.rims) {
    const pts = rim.filter((_, i) => i % 3 === 0 || i === rim.length - 1).map(p => new THREE.Vector3(...p));
    if (pts.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(pts, pc.kind === 'funnel');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 2, 0.05, 6, pc.kind === 'funnel'), rimMat);
    tube.castShadow = true; scene.add(tube);
  }
  if (pc.kind === 'chute') pc.F.P.forEach((p, i) => { if (i % 3 === 0) allPts.push([p[0], p[1], p[2], pc.W[i] / 2, pc]); });
  else for (let r = pc.Rh; r <= pc.Rr; r += 0.6) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; allPts.push([pc.C[0] + r * Math.cos(a), pc.y(r), pc.C[2] + r * Math.sin(a), 0.5, pc]); }
}

// arazi: parkurun altında onu izleyen dağ yamacı
const tPts = allPts.filter((_, i) => i % 2 === 0);
function terrainH(x, z) { // her pist noktasının altında koni (yamaç), hiçbir pistin üstüne çıkmayan tavan
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
    const k = j * (nx + 1) + i, x = x0 + i * S, z = z0 + j * S, h = terrainH(x, z);
    pos[k * 3] = x; pos[k * 3 + 1] = h - 0.02; pos[k * 3 + 2] = z;
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const nrm = g.getAttribute('normal');
  const grass = new THREE.Color(0x6fa64c), grass2 = new THREE.Color(0x8cbc5c), rock = new THREE.Color(0x8d8a80), c = new THREE.Color();
  for (let k = 0; k < pos.length / 3; k++) {
    const ny = nrm.getY(k), v = rr();
    c.copy(grass).lerp(grass2, v * 0.6);
    c.lerp(rock, Math.max(0, Math.min(1, (0.86 - ny) * 4)));
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const terr = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, envMapIntensity: 0.25, flatShading: false }));
  terr.receiveShadow = true; scene.add(terr);
}

// destek direkleri (yamaca kadar)
{
  const mats = [];
  const clear = (x, z, y, self) => allPts.every(q => q[4] === self || q[1] > y - 0.3 || Math.hypot(q[0] - x, q[2] - z) > q[3] + 0.45);
  const addPole = (x, y, z, self) => { const g = terrainH(x, z), L = y - g + 0.3; if (L > 0.5 && clear(x, z, y, self)) mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, g - 0.3 + L / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, L, 1))); };
  for (const pc of course.pieces) {
    if (pc.kind === 'chute') { for (let i = 10; i < pc.F.P.length - 5; i += 22) { const p = pc.F.P[i], u = pc.F.U[i]; addPole(p[0] - u[0] * 0.05, p[1] - 0.06, p[2] - u[2] * 0.05, pc); } }
    else for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4, r = pc.Rr * 0.75; addPole(pc.C[0] + r * Math.cos(a), pc.y(r) - 0.06, pc.C[2] + r * Math.sin(a), pc); }
  }
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.12, 1, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, metalness: 0.1, roughness: 0.7 }), mats.length);
  mats.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = true; scene.add(im);
}

// ağaçlar (yamaçta)
{
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

// çiviler
{
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ color: 0xe8edf2, metalness: 0.9, roughness: 0.18 }), course.pegs.length);
  course.pegs.forEach((pg, i) => {
    const u = new THREE.Vector3(...pg.u), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), u);
    const p = new THREE.Vector3(...pg.p).addScaledVector(u, pg.h / 2);
    im.setMatrixAt(i, new THREE.Matrix4().compose(p, q, new THREE.Vector3(pg.r, pg.h, pg.r)));
  });
  im.castShadow = true; scene.add(im);
}

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
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 8), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }));
  const L = new THREE.Vector3(...F.L[fi]), U = new THREE.Vector3(...F.U[fi]), T = new THREE.Vector3(...F.T[fi]);
  pl.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(L, T.clone().negate(), U));
  pl.position.set(...F.P[fi]).addScaledVector(U, 0.012); pl.receiveShadow = true; scene.add(pl);
}

// misketler
const NAMES = Array.from({ length: N }, (_, i) => 'takipci_' + String(i + 1).padStart(3, '0'));
const COLS = [], CSS = [];
for (let m = 0; m < N; m++) {
  const h = (m * 0.61803398875) % 1, s = 0.72 + (m % 3) * 0.09, l = 0.45 + (m % 4) * 0.05;
  const c = new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace); COLS.push(c); CSS.push('#' + c.getHexString(THREE.SRGBColorSpace));
}
const swirl = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, 512, 256);
  const band = (y0, amp, wid, col) => { g.strokeStyle = col; g.lineWidth = wid; g.beginPath(); for (let x = -10; x <= 522; x += 8) { const y = y0 + Math.sin(x / 512 * Math.PI * 4) * amp; x < 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); };
  band(70, 40, 34, '#ffffff'); band(150, 50, 22, '#8a8a8a'); band(200, 30, 18, '#ffffff'); band(110, 60, 10, '#5c5c5c'); band(30, 20, 14, '#a8a8a8');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
})();
const mMat = new THREE.MeshPhysicalMaterial({ map: swirl, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1 });
const marbles = new THREE.InstancedMesh(new THREE.SphereGeometry(MR, mobile ? 20 : 28, mobile ? 14 : 20), mMat, N);
marbles.castShadow = true; marbles.frustumCulled = false; marbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
for (let m = 0; m < N; m++) marbles.setColorAt(m, COLS[m]);
scene.add(marbles);
const dummy = new THREE.Object3D();
// takip edilen misketin üstünde her zaman görünen ok
const marker = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 14), new THREE.MeshBasicMaterial({ color: 0xffd23a, depthTest: false, transparent: true }));
marker.rotation.x = Math.PI; marker.renderOrder = 999; marker.visible = false; scene.add(marker);
function syncMarbles() {
  for (let m = 0; m < N; m++) {
    const b = sim.bodies[m], t = b.translation(), r = b.rotation();
    dummy.position.set(t.x, t.y, t.z); dummy.quaternion.set(r.x, r.y, r.z, r.w); dummy.updateMatrix(); marbles.setMatrixAt(m, dummy.matrix);
  }
  marbles.instanceMatrix.needsUpdate = true;
  course.kins.forEach((k, i) => { const b = sim.kinBodies[i], t = b.translation(), r = b.rotation(); kinGroups[i].position.set(t.x, t.y, t.z); kinGroups[i].quaternion.set(r.x, r.y, r.z, r.w); });
}

// ---------- kamera ----------
const portrait = innerHeight > innerWidth;
const cam = new THREE.PerspectiveCamera(portrait ? 72 : 55, innerWidth / innerHeight, 0.1, 700);
let mode = Q.get('cam') === 'all' ? 'all' : 'lead', followId = -1, orbitA = 0.6;
const camPos = new THREE.Vector3(), look = new THREE.Vector3(), camDir = new THREE.Vector3(0, 0, 1);
let lift = 0;
{ // açılış: kapının önünden misketlere bakış
  const A = course.pieces[course.start], i = course.gate + 18;
  const P = new THREE.Vector3(...A.F.P[i]), T = new THREE.Vector3(...A.F.T[course.gate]);
  camPos.copy(P).add(new THREE.Vector3(0, 2.6, 0)); look.set(...A.F.P[course.gate - 14]); camDir.copy(T).setY(0).normalize();
}
const tmpV = new THREE.Vector3(), tmpL = new THREE.Vector3();
const funnels = course.pieces.filter(p => p.kind === 'funnel');
const prevOf = new Map(); course.pieces.forEach((p, i) => (p.next || []).forEach(n => { if (!prevOf.has(n)) prevOf.set(n, i); }));
function targetId(rank) {
  if (mode === 'follow' && followId >= 0) return followId;
  for (const m of rank) if (sim.fin[m] < 0 || sim.t - sim.fin[m] < 2.5) return m;
  return rank[0];
}
function updateCam(dt, rank) {
  if (mode === 'all') {
    orbitA += dt * 0.06;
    const size = box.getSize(tmpV), R = Math.max(size.x, size.z) * 0.75 + 20;
    tmpV.set(center.x + Math.cos(orbitA) * R, box.max.y + 25, center.z + Math.sin(orbitA) * R);
    camPos.lerp(tmpV, 1 - Math.exp(-dt * 1.5)); look.lerp(center, 1 - Math.exp(-dt * 2));
  } else if (sim.open != null) {
    const id = targetId(rank), b = sim.bodies[id], t = b.translation(), v = b.linvel(), pc = course.pieces[sim.piece[id]];
    const p = tmpL.set(t.x, t.y, t.z);
    if (pc.kind === 'funnel') {
      tmpV.set(camPos.x - pc.C[0], 0, camPos.z - pc.C[2]).normalize().multiplyScalar(pc.Rr * 0.9);
      tmpV.add(new THREE.Vector3(pc.C[0], pc.y(pc.Rr) + pc.Rr * 1.6 + 1.5, pc.C[2]));
      camPos.lerp(tmpV, 1 - Math.exp(-dt * 2.5)); look.lerp(new THREE.Vector3(pc.C[0], pc.y(pc.Rh * 2), pc.C[2]), 1 - Math.exp(-dt * 4));
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
  }
  // kamera: huninin içine/altına ve yamacın içine girmesin
  for (const f of funnels) {
    const dx = camPos.x - f.C[0], dz = camPos.z - f.C[2], r = Math.hypot(dx, dz);
    if (r < f.Rr + 1.2 && camPos.y < f.y(f.Rr) + f.hw + 0.8 && camPos.y > f.spoutBottom - 4) {
      const k = (f.Rr + 1.2) / Math.max(0.01, r); camPos.x = f.C[0] + dx * k; camPos.z = f.C[2] + dz * k;
    }
  }
  const gy = terrainH(camPos.x, camPos.z) + 1.2; if (camPos.y < gy) camPos.y = gy;
  cam.position.copy(camPos); cam.lookAt(look);
  if (mode !== 'all' && sim.open != null) {
    const m = targetId(rank), q = sim.bodies[m].translation();
    marker.visible = true; marker.position.set(q.x, q.y + 0.62 + Math.sin(performance.now() / 180) * 0.06, q.z);
  } else marker.visible = false;
  sun.target.position.copy(look); sun.position.copy(look).add(SUN_OFF);
}

// ---------- arayüz ----------
const $ = id => document.getElementById(id);
const fmt = s => { s = Math.max(0, s); const m = Math.floor(s / 60); return m + ':' + (s % 60).toFixed(1).padStart(4, '0'); };
const board = $('board'), labels = $('labels');
const lblPool = Array.from({ length: 4 }, () => { const d = document.createElement('div'); d.className = 'lbl'; d.style.display = 'none'; labels.appendChild(d); return d; });
board.addEventListener('click', e => { const r = e.target.closest('.row'); if (!r) return; followId = +r.dataset.id; setMode('follow'); });
function setMode(m) { mode = m; $('bLead').classList.toggle('on', m === 'lead'); $('bAll').classList.toggle('on', m === 'all'); }
$('bLead').onclick = () => { followId = -1; setMode('lead'); };
$('bAll').onclick = () => setMode('all');
$('bRe').onclick = () => { location.search = '?seed=' + ((SEED * 7919 + 13) % 100000) + (Q.has('n') ? '&n=' + N : ''); };
function row(m, rank) {
  const tm = sim.fin[m] >= 0 ? fmt(sim.fin[m] - sim.open) : '';
  return `<div class="row${mode === 'follow' && followId === m ? ' sel' : ''}" data-id="${m}"><span class="rk">${rank}.</span><span class="dot" style="background:${CSS[m]}"></span><span class="nm">${NAMES[m]}</span><span class="tm">${tm}</span></div>`;
}
let boardT = 0, toastT = 0, shownWin = false, resShown = false;
function updateUI(dt, rank) {
  const raceT = sim.open == null ? 0 : sim.t - sim.open;
  $('clock').textContent = fmt(raceT);
  const lead = rank[0];
  $('sub').textContent = sim.open == null ? `${N} misket hazır` : sim.nFin ? `Bitiren ${sim.nFin}/${N}` : `Lider: ${NAMES[lead]}`;
  if ((boardT -= dt) <= 0) {
    boardT = 0.25;
    const top = mobile ? 8 : 12; let html = '';
    for (let k = 0; k < top; k++) html += row(rank[k], k + 1);
    if (mode === 'follow' && followId >= 0) { const k = rank.indexOf(followId); if (k >= top) html += row(followId, k + 1); }
    board.innerHTML = html;
  }
  if (!shownWin && sim.nFin > 0) { shownWin = true; toast('Kazanan: ' + NAMES[rank[0]]); }
  if (toastT > 0 && (toastT -= dt) <= 0) $('toast').classList.remove('on');
  if (!resShown && sim.open != null && (sim.nFin === N || (sim.nFin > 0 && sim.t - sim.fin[rank[0]] > 75))) { resShown = true; showResults(rank); }
  // etiketler: ilk 3 + takip edilen
  const ids = rank.slice(0, 3); if (mode === 'follow' && followId >= 0 && !ids.includes(followId)) ids.push(followId);
  lblPool.forEach((d, k) => {
    const m = ids[k]; if (m == null || sim.open == null) { d.style.display = 'none'; return; }
    const t = sim.bodies[m].translation(); tmpV.set(t.x, t.y + MR * 2.2, t.z);
    if (tmpV.distanceTo(cam.position) > 40) { d.style.display = 'none'; return; }
    tmpV.project(cam);
    if (tmpV.z > 1) { d.style.display = 'none'; return; }
    d.style.display = ''; const txt = `${rank.indexOf(m) + 1}. ${NAMES[m]}`;
    if (d.textContent !== txt) { d.textContent = txt; d.style.borderLeftColor = CSS[m]; }
    d.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * innerWidth}px, ${(-tmpV.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -130%)`;
  });
}
function toast(t) { const d = $('toast'); d.textContent = t; d.classList.add('on'); toastT = 4; }
function showResults(rank) {
  let html = `<h2>Yarış bitti</h2><div class="win">Kazanan: <b>${NAMES[rank[0]]}</b> · ${fmt(sim.fin[rank[0]] - sim.open)}</div><div class="grid">`;
  rank.forEach((m, k) => { html += `<div class="row ${k < 3 ? 'p' + (k + 1) : ''}"><span class="rk">${k + 1}.</span><span class="dot" style="background:${CSS[m]}"></span><span class="nm">${NAMES[m]}</span><span class="tm">${sim.fin[m] >= 0 ? fmt(sim.fin[m] - sim.open) : '—'}</span></div>`; });
  html += '</div><button id="again">Yeni yarış</button> <button id="close" style="background:#dfe5ec">Kapat</button>';
  const r = $('res'); r.querySelector('.box').innerHTML = html; r.style.display = 'flex';
  $('again').onclick = () => $('bRe').click(); $('close').onclick = () => { r.style.display = 'none'; };
}

// ---------- döngü ----------
let phase = 'count', countT = Q.has('t') ? 0 : 3.6, acc = 0, last = performance.now();
if (Q.has('t')) { // test: belirtilen saniyeye hızlı sar
  sim.start(); phase = 'race';
  const until = sim.t + +Q.get('t'); while (sim.t < until) sim.step();
  const rk = sim.ranking(); for (let i = 0; i < 400; i++) updateCam(1 / 60, rk);
}
const DT = 1 / 120;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (phase === 'count') {
    countT -= dt; const c = Math.ceil(countT - 0.6);
    $('count').textContent = countT > 0.6 ? String(c) : 'BAŞLA!';
    if (countT <= 0.6 && sim.open == null) sim.start();
    if (countT <= 0) { phase = 'race'; $('count').textContent = ''; }
  }
  if (!Q.has('shot')) { acc += dt; let k = 0; while (acc >= DT && k < 6) { sim.step(); acc -= DT; k++; } if (k === 6) acc = 0; }
  const rank = sim.ranking();
  syncMarbles(); updateCam(dt, rank); updateUI(dt, rank);
  renderer.render(scene, cam);
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.fov = innerHeight > innerWidth ? 72 : 55; cam.updateProjectionMatrix(); });
requestAnimationFrame(frame);
