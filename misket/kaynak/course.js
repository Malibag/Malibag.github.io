// Misket parkuru — saf geometri (bağımlılık yok). Tarayıcı ve Node ortak kullanır.
export const MR = 0.17;          // misket yarıçapı
export const G = 15;             // yerçekimi
const D = Math.PI / 180;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const sm = t => t * t * (3 - 2 * t);
export const V = { add, sub, mul, dot, cross, nrm };

const fwdOf = (hd, pitch) => [Math.sin(hd) * Math.cos(pitch * D), -Math.sin(pitch * D), Math.cos(hd) * Math.cos(pitch * D)];
const leftOf = hd => [Math.cos(hd), 0, -Math.sin(hd)];

// ---------- kuaterniyon ----------
export function quatFromBasis(x, y, z) { // sütunlar: yerel x,y,z -> dünya
  const m00 = x[0], m01 = y[0], m02 = z[0], m10 = x[1], m11 = y[1], m12 = z[1], m20 = x[2], m21 = y[2], m22 = z[2];
  const tr = m00 + m11 + m22; let qx, qy, qz, qw;
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; qw = s / 4; qx = (m21 - m12) / s; qy = (m02 - m20) / s; qz = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; qw = (m21 - m12) / s; qx = s / 4; qy = (m01 + m10) / s; qz = (m02 + m20) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; qw = (m02 - m20) / s; qx = (m01 + m10) / s; qy = s / 4; qz = (m12 + m21) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; qw = (m10 - m01) / s; qx = (m02 + m20) / s; qy = (m12 + m21) / s; qz = s / 4; }
  return [qx, qy, qz, qw];
}
export const quatAxis = (ax, a) => { const s = Math.sin(a / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(a / 2)]; };
export const quatMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
export const quatYto = u => { // y eksenini u'ya çeviren
  const y = [0, 1, 0], c = dot(y, u);
  if (c > 0.99999) return [0, 0, 0, 1];
  const ax = nrm(cross(y, u)); return quatAxis(ax, Math.acos(Math.max(-1, Math.min(1, c))));
};

// ---------- merkez çizgisi üretimi ----------
// Kaplumbağa: segs = {len, turn(°,+sol), pitch(° +aşağı), w, h, rv(dikey yarıçap), bumps:{n,amp}, mark}
export function turtle(pose, segs) {
  let p = pose.p.slice(), hd = pose.hd, pitch = pose.pitch, w = pose.w, h = pose.h;
  const S = [{ p: p.slice(), w, h }]; const marks = {};
  for (const sg of segs) {
    const n = Math.max(2, Math.round(sg.len / 0.2)), ds = sg.len / n, turn = (sg.turn || 0) * D;
    const wts = []; let wsum = 0;
    for (let i = 1; i <= n; i++) { const t = (i - 0.5) / n; const q = Math.max(0.02, Math.min(1, t / 0.25, (1 - t) / 0.25)); wts.push(q); wsum += q; }
    const p0 = pitch, p1 = sg.pitch ?? pitch;
    const tl = Math.min(sg.len, Math.max(1.0, Math.abs(p1 - p0) * D * (sg.rv || 8)));
    const w0 = w, w1 = sg.w ?? w, h0 = h, h1 = sg.h ?? h;
    const i0 = S.length - 1;
    for (let i = 1; i <= n; i++) {
      const t = i / n, sd = t * sg.len;
      hd += turn * wts[i - 1] / wsum;
      pitch = lerp(p0, p1, sm(Math.min(1, sd / tl)));
      p = add(p, mul(fwdOf(hd, pitch), ds));
      w = lerp(w0, w1, sm(t)); h = lerp(h0, h1, sm(Math.min(1, t * 3)));
      const bump = sg.bumps ? sg.bumps.amp * Math.sin(Math.PI * sg.bumps.n * t) ** 2 : 0;
      S.push({ p: [p[0], p[1] + bump, p[2]], w, h, bm: sg.bank ?? 0.55 });
    }
    if (sg.mark) (marks[sg.mark] = marks[sg.mark] || []).push({ i0, i1: S.length - 1 });
  }
  return { S, end: { p, hd, pitch, w, h }, marks };
}

// Catmull-Rom (merkezcil) + eşit aralıklı yeniden örnekleme
export function spline(pts, w, h) {
  const dense = [];
  const P = [sub(mul(pts[0], 2), pts[1]), ...pts, sub(mul(pts[pts.length - 1], 2), pts[pts.length - 2])];
  for (let k = 1; k < P.length - 2; k++) {
    const p0 = P[k - 1], p1 = P[k], p2 = P[k + 1], p3 = P[k + 2];
    const tj = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), 0.5) || 1e-4;
    const t0 = 0, t1 = t0 + tj(p0, p1), t2 = t1 + tj(p1, p2), t3 = t2 + tj(p2, p3);
    for (let i = 0; i < 40; i++) {
      const t = t1 + (t2 - t1) * i / 40;
      const A1 = add(mul(p0, (t1 - t) / (t1 - t0)), mul(p1, (t - t0) / (t1 - t0)));
      const A2 = add(mul(p1, (t2 - t) / (t2 - t1)), mul(p2, (t - t1) / (t2 - t1)));
      const A3 = add(mul(p2, (t3 - t) / (t3 - t2)), mul(p3, (t - t2) / (t3 - t2)));
      const B1 = add(mul(A1, (t2 - t) / (t2 - t0)), mul(A2, (t - t0) / (t2 - t0)));
      const B2 = add(mul(A2, (t3 - t) / (t3 - t1)), mul(A3, (t - t1) / (t3 - t1)));
      dense.push(add(mul(B1, (t2 - t) / (t2 - t1)), mul(B2, (t - t1) / (t2 - t1))));
    }
  }
  dense.push(pts[pts.length - 1]);
  const cum = [0]; for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub(dense[i], dense[i - 1])));
  const L = cum[cum.length - 1], n = Math.max(2, Math.round(L / 0.2)), S = []; let j = 0;
  for (let i = 0; i <= n; i++) {
    const s = L * i / n; while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const t = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    S.push({ p: add(dense[j], mul(sub(dense[j + 1], dense[j]), t)), w, h });
  }
  return { S, marks: {} };
}

// Çerçeveler (T, sol L, üst U), eğim (bank), yay uzunluğu
function frames(S, vBank) {
  const n = S.length, P = S.map(o => o.p);
  const T = [], hd = [], s = [0];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    T.push(nrm(sub(b, a))); hd.push(Math.atan2(T[i][0], T[i][2]));
    if (i) s.push(s[i - 1] + Math.hypot(...sub(P[i], P[i - 1])));
  }
  const raw = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2);
    let d = hd[b] - hd[a]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const k = d / ((s[b] - s[a]) || 1);
    const bm = S[i].bm ?? 0.55; raw.push(Math.max(-bm, Math.min(bm, Math.atan(vBank * vBank * k / G))));
  }
  const bank = raw.map((_, i) => { let t = 0, c = 0; for (let j = -12; j <= 12; j++) { t += raw[Math.max(0, Math.min(n - 1, i + j))]; c++; } return t / c; });
  const L = [], U = [];
  for (let i = 0; i < n; i++) {
    const l0 = nrm(cross([0, 1, 0], T[i])), u0 = cross(T[i], l0), b = bank[i];
    U.push(nrm(add(mul(u0, Math.cos(b)), mul(l0, Math.sin(b)))));
    L.push(nrm(sub(mul(l0, Math.cos(b)), mul(u0, Math.sin(b)))));
  }
  return { P, T, L, U, s, bank };
}

// ---------- mesh yardımcıları ----------
class Mesh {
  constructor() { this.pos = []; this.idx = []; this.col = []; }
  v(p, c) { this.pos.push(p[0], p[1], p[2]); this.col.push(c[0], c[1], c[2]); return this.pos.length / 3 - 1; }
  tri(a, b, c, want) { // want: içe bakan normal yönü (opsiyonel)
    if (want) {
      const P = i => [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]];
      const nn = cross(sub(P(b), P(a)), sub(P(c), P(a)));
      if (dot(nn, want) < 0) { this.idx.push(a, c, b); return; }
    }
    this.idx.push(a, b, c);
  }
}
const shade = (c, k) => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];

function profile(w, h, f, nF) {
  const pr = [[w / 2, h]];
  for (let j = 0; j <= 4; j++) { const t = -90 * j / 4 * D; pr.push([w / 2 - f + f * Math.cos(t), f + f * Math.sin(t)]); }
  for (let q = 1; q < nF; q++) pr.push([(w / 2 - f) - (w - 2 * f) * q / nF, 0]);
  for (let j = 0; j <= 4; j++) { const t = (-90 - 90 * j / 4) * D; pr.push([-(w / 2 - f) + f * Math.cos(t), f + f * Math.sin(t)]); }
  pr.push([-w / 2, h]);
  return pr;
}

// Oluk parçası: S -> mesh + izleme verisi
function chute(name, S, o) {
  const F = frames(S, o.vBank ?? 5.5);
  const n = S.length, f = 0.2;
  const maxW = Math.max(...S.map(q => q.w)), nF = Math.max(2, Math.ceil(maxW / 0.45));
  const m = new Mesh(), rows = [];
  const base = o.color;
  for (let i = 0; i < n; i++) {
    const pr = profile(S[i].w, S[i].h, f, nF), band = Math.floor(F.s[i] / 1.0) % 2 ? 0.88 : 1.0;
    rows.push(pr.map(([a, c]) => {
      const isWall = c > f * 1.01;
      return m.v(add(add(F.P[i], mul(F.L[i], a)), mul(F.U[i], c)), shade(base, (isWall ? 1.12 : 1.0) * band));
    }));
  }
  const np = rows[0].length;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < np - 1; j++) {
    const A = rows[i][j], B = rows[i][j + 1], C = rows[i + 1][j], Dd = rows[i + 1][j + 1];
    m.tri(A, B, C); m.tri(B, Dd, C);
  }
  const cap = (i, dir) => {
    const pr = profile(S[i].w, S[i].h, f, nF), cen = add(F.P[i], mul(F.U[i], S[i].h * 0.5));
    const c0 = m.v(cen, shade(base, 0.85));
    const ring = pr.map(([a, c]) => m.v(add(add(F.P[i], mul(F.L[i], a)), mul(F.U[i], c)), shade(base, 0.85)));
    for (let j = 0; j < ring.length; j++) m.tri(c0, ring[j], ring[(j + 1) % ring.length], mul(F.T[i], dir));
  };
  if (o.capStart) cap(0, 1);
  if (o.capEnd) cap(n - 1, -1);
  const rimL = [], rimR = [];
  for (let i = 0; i < n; i++) {
    rimL.push(add(add(F.P[i], mul(F.L[i], S[i].w / 2)), mul(F.U[i], S[i].h)));
    rimR.push(add(add(F.P[i], mul(F.L[i], -S[i].w / 2)), mul(F.U[i], S[i].h)));
  }
  return { name, kind: 'chute', F, W: S.map(q => q.w), H: S.map(q => q.h), mesh: m, rims: [rimL, rimR], len: F.s[n - 1], color: base };
}

function funnel(name, C, Rr, Rh, hw, color, dir, low) {
  const a = Math.tan(9 * D), b = 0.55;
  const y = r => C[1] - a * (Rr - r) - b * (1 / r - 1 / Rr);
  const m = new Mesh(), nA = 64, nR = 18;
  const rr = []; for (let j = 0; j <= nR; j++) rr.push(Rh + (Rr - Rh) * Math.pow(j / nR, 1.6));
  const ring = (r, yy, k) => { const t = 2 * Math.PI * k / nA; return [C[0] + r * Math.cos(t), yy, C[2] + r * Math.sin(t)]; };
  const grid = rr.map((r, j) => { const out = []; for (let k = 0; k < nA; k++) out.push(m.v(ring(r, y(r), k), shade(color, (k % 8 < 4 ? 1 : 0.88) * (0.85 + 0.15 * j / nR)))); return out; });
  for (let j = 0; j < nR; j++) for (let k = 0; k < nA; k++) {
    const k2 = (k + 1) % nA; m.tri(grid[j][k], grid[j + 1][k], grid[j][k2], [0, 1, 0]); m.tri(grid[j + 1][k], grid[j + 1][k2], grid[j][k2], [0, 1, 0]);
  }
  // duvar yüksekliği: oluğun üstünden geçtiği açıda alçak, başka her yerde yüksek
  const hwAt = k => {
    if (!low) return hw;
    let d = Math.abs(2 * Math.PI * k / nA - low.ang); d = Math.min(d, 2 * Math.PI - d);
    const t = Math.max(0, Math.min(1, (d - low.half) / 0.25));
    return lerp(low.h, hw, sm(t));
  };
  const wall = (r, y0, y1, c) => {
    const lo = [], hi = []; for (let k = 0; k < nA; k++) { lo.push(m.v(ring(r, y0, k), c)); hi.push(m.v(ring(r, typeof y1 === 'function' ? y1(k) : y1, k), c)); }
    for (let k = 0; k < nA; k++) {
      const k2 = (k + 1) % nA, t = 2 * Math.PI * (k + 0.5) / nA, want = [-Math.cos(t), 0, -Math.sin(t)];
      m.tri(lo[k], hi[k], lo[k2], want); m.tri(hi[k], hi[k2], lo[k2], want);
    }
  };
  wall(Rr, y(Rr) - 0.05, k => y(Rr) + hwAt(k), shade(color, 1.15));
  wall(Rh, y(Rh) - 0.55, y(Rh) + 0.01, shade(color, 0.8));
  const rim = []; for (let k = 0; k <= nA; k++) rim.push(ring(Rr, y(Rr) + hwAt(k % nA), k));
  return { name, kind: 'funnel', C, Rr, Rh, hw, ya: a, yb: b, y, mesh: m, rims: [rim], spoutBottom: y(Rh) - 0.55, len: 14, color, dir };
}

// ---------- parkur ----------
const COL = {
  red: [0.93, 0.27, 0.27], orange: [0.98, 0.55, 0.15], yellow: [0.98, 0.8, 0.2], green: [0.3, 0.78, 0.4],
  teal: [0.15, 0.72, 0.72], blue: [0.25, 0.5, 0.95], purple: [0.6, 0.38, 0.9], pink: [0.95, 0.42, 0.7], white: [0.92, 0.92, 0.95],
  lime: [0.6, 0.85, 0.25]
};
export const DT = 1 / 120;

export function buildCourse(L = {}) {
  const pieces = [], kins = [], pegs = [], bumpers = [];
  const P = pc => { pieces.push(pc); return pieces.length - 1; };

  // A: başlangıç -> büyük iniş -> eğimli U dönüş -> BURGU -> tümsekler -> huni 1
  const A = turtle({ p: [0, 0, 0], hd: 0, pitch: 5, w: 3.0, h: 0.7 }, L.A || [
    { len: 7.5, pitch: 5 },
    { len: 4, w: 1.9 },
    { len: 15, pitch: 33, rv: 12 },
    { len: 7, pitch: 7, rv: 8, h: 1.1 },
    { len: 24, turn: 180, pitch: 6, h: 1.1 },
    { len: 5, pitch: 7, w: 1.7, h: 1.0 },
    { len: 34, turn: 540, pitch: 7.5, h: 1.0, mark: 'helix' },
    { len: 5, pitch: 6, h: 0.8, w: 1.9 },
    { len: 12, pitch: 8, bumps: { n: 4, amp: 0.2 }, h: 0.75 },
    { len: 13, turn: -100, pitch: 9, h: 0.85 },
    { len: 8, pitch: 14, rv: 9 },
    { len: 6, pitch: 3 },
    { len: 12, turn: 70, pitch: 2, h: 0.8 },
  ]);
  const iA = P(chute('A', A.S, { color: COL.red, capStart: true }));
  const gateI = 37;
  kins.push(gateKin(pieces[iA], gateI));

  const f1 = funnelAt('H1', A.end, 3.0, 0.43, 1.3, L.f1side ?? +1, COL.yellow);
  const iF1 = P(f1);

  // B: huniden düşüş -> çivili tahta -> çark -> KESKİN KESMELER (yaylı) -> zikzak -> çatal
  const B0 = trayStart(f1, (L.hdB ?? 200) * D);
  const B = turtle(B0, L.B || [
    { len: 3, pitch: 8 },
    { len: 4, w: 1.6, pitch: 14, h: 0.7 },
    { len: 9, pitch: 30, rv: 10 },
    { len: 4, pitch: 20, w: 4.6, h: 1.3 },
    { len: 16, pitch: 22, mark: 'pegs' },
    { len: 5, w: 1.6, pitch: 10, h: 0.9 },
    { len: 10, turn: -60, pitch: 7 },
    { len: 7, pitch: 6, w: 1.7, mark: 'wheel' },
    { len: 6, pitch: 9, h: 1.05 },
    { len: 3.2, turn: 95, pitch: 9, h: 1.1, bank: 0.12, mark: 'sharp' },
    { len: 2.5, pitch: 9, bank: 0.12 },
    { len: 3.2, turn: -95, pitch: 9, h: 1.1, bank: 0.12, mark: 'sharp' },
    { len: 4, pitch: 9, h: 0.9 },
    { len: 13, turn: 120, pitch: 8, h: 0.9 },
    { len: 7, pitch: 24, rv: 9, h: 0.75 },
    { len: 11, turn: -120, pitch: 7, h: 0.9 },
    { len: 4, pitch: 7, w: 2.25, h: 0.6 },
    { len: 8, pitch: 8, mark: 'split' },
  ]);
  const iB = P(chute('B', B.S, { color: COL.blue, capStart: true }));
  addPegs(pegs, pieces[iB], B.marks.pegs[0], 0.85, 1.0);
  addPegs(pegs, pieces[iB], B.marks.split[0], 0.72, 1.3);
  kins.push(wheelKin(pieces[iB], Math.round((B.marks.wheel[0].i0 + B.marks.wheel[0].i1) / 2)));
  B.marks.sharp.forEach((mk, k) => addSprings(bumpers, pieces[iB], mk, k ? +1 : -1));

  // Çatal: 3 ayrı yol (duvarlar çakışmasın diye aralıklı), sonunda geniş toplama teknesine dökülür
  const fk = B.end, Fw = fwdOf(fk.hd, 0), Lw = leftOf(fk.hd);
  const loc = (f, l, dy) => add(add(add(fk.p, mul(Fw, f)), mul(Lw, l)), [0, dy, 0]);
  const FL = 34, DR = 7, lw = 0.75, LO = 0.75;
  const laneDefs = [
    { name: 'Uçurum', color: COL.orange, pts: [[-0.2, LO, 0.02], [2, LO, -.15], [6, 2.1, -.5], [10, 3.5, -.95], [13, 4.0, -1.35], [16.5, 4.0, -4.6], [19.5, 3.7, -5.9], [23, 3.0, -6.3], [27, 1.9, -6.6], [31, 0.95, -6.85], [FL + 0.2, LO, -DR + 0.03]] },
    { name: 'Tümsek', color: COL.green, pts: [] },
    { name: 'Kıvrım', color: COL.purple, pts: [[-0.2, -LO, 0.02], [3, -LO, -.4], [7, -2.7, -1.0], [11, -5.3, -1.8], [15, -6.4, -2.7], [19, -5.3, -3.6], [22.5, -3.3, -4.4], [25.5, -3.5, -5.2], [29, -2.1, -6.2], [32, -1.0, -6.85], [FL + 0.2, -LO, -DR + 0.03]] },
  ];
  for (let f = 0; f < FL; f += 2.5) {
    const ff = f === 0 ? -0.2 : f, bump = (f > 3 && f < FL - 3 && Math.round(f / 2.5) % 2) ? 0.22 : 0;
    laneDefs[1].pts.push([ff, 0, -DR * Math.max(0, ff) / FL + bump + 0.02]);
  }
  laneDefs[1].pts.push([FL + 0.2, 0, -DR + 0.03]);
  const lanes = [];
  for (const ld of laneDefs) lanes.push(P(chute(ld.name, spline(ld.pts.map(q => loc(...q)), lw, 0.55).S, { color: ld.color, vBank: 4 })));

  // C: geniş toplama teknesi (yollar üstten dökülür) -> daralma -> iniş -> rampa (sıçrama)
  const C0 = { p: loc(FL - 0.4, 0, -DR - 0.45), hd: fk.hd, pitch: 6, w: 2.95, h: 0.3 };
  const Cc = turtle(C0, L.C || [
    { len: 2, pitch: 6, h: 0.75 },
    { len: 9, w: 1.25, pitch: 9, h: 0.8 },
    { len: 10, turn: 40, pitch: 12 },
    { len: 8, pitch: 22, rv: 9, w: 1.5 },
    { len: 3.2, pitch: -16, rv: 3.5 },
  ]);
  const iC = P(chute('C', Cc.S, { color: COL.teal, capStart: true }));

  // D: iniş tablası -> dönen kol -> BALON ALANI -> virajlar -> huni 2
  const ce = Cc.end, cF = fwdOf(ce.hd, 0);
  const D0 = { p: add(add(ce.p, mul(cF, -0.9)), [0, -2.6, 0]), hd: ce.hd, pitch: 5, w: 2.8, h: 1.4 };
  const Dd = turtle(D0, L.D || [
    { len: 15, pitch: 5 },
    { len: 4, w: 3.6, h: 0.9, pitch: 5 },
    { len: 8, pitch: 5, mark: 'spin' },
    { len: 3, pitch: 7, w: 4.2, h: 1.0 },
    { len: 13, pitch: 8, mark: 'balloons' },
    { len: 4, w: 1.6, pitch: 9, h: 0.9 },
    { len: 14, turn: -130, pitch: 9, h: 0.95 },
    { len: 8, pitch: 20, rv: 9 },
    { len: 10, turn: 110, pitch: 4, h: 0.95 },
    { len: 6, pitch: 2 },
  ]);
  const iD = P(chute('D', Dd.S, { color: COL.pink, capStart: true }));
  kins.push(spinKin(pieces[iD], Math.round((Dd.marks.spin[0].i0 + Dd.marks.spin[0].i1) / 2)));
  addBalloons(bumpers, pieces[iD], Dd.marks.balloons[0]);

  const f2 = funnelAt('H2', Dd.end, 3.6, 0.43, 1.3, L.f2side ?? -1, COL.teal);
  const iF2 = P(f2);

  // E: huni 2 altı -> iniş -> KESKİN KESMELER (yaylı) -> yavaşlatan tepe -> huni 3
  const E0 = trayStart(f2, Dd.end.hd + (L.hdE ?? 150) * D);
  const E = turtle(E0, L.E || [
    { len: 3, pitch: 8 },
    { len: 5, pitch: 12, w: 1.6, h: 0.9 },
    { len: 8, pitch: 20, rv: 9 },
    { len: 3, pitch: 6, h: 1.45 },
    { len: 3.4, turn: -110, pitch: 9, h: 1.45, bank: 0.12, mark: 'sharp' },
    { len: 3, pitch: 9, bank: 0.12 },
    { len: 3.4, turn: 110, pitch: 9, h: 1.45, bank: 0.12, mark: 'sharp' },
    { len: 4, pitch: 10, h: 0.9 },
    { len: 5, pitch: 14 },
    { len: 6, pitch: -7, rv: 6, h: 0.9 },
    { len: 3, pitch: 12, rv: 5 },
    { len: 14, turn: 80, pitch: 6 },
    { len: 6, pitch: 3, w: 1.8 },
  ]);
  const iE = P(chute('E', E.S, { color: COL.lime, capStart: true }));
  E.marks.sharp.forEach((mk, k) => addSprings(bumpers, pieces[iE], mk, k ? -1 : +1));

  const f3 = funnelAt('H3', E.end, 3.6, 0.43, 1.3, L.f3side ?? +1, COL.purple);
  const iF3 = P(f3);

  // F: final — büyük düşüş -> bitiş düzlüğü
  const F0 = trayStart(f3, E.end.hd + (L.hdF ?? 200) * D);
  const Fn = turtle(F0, L.F || [
    { len: 3, pitch: 8 },
    { len: 5, pitch: 10, w: 1.8, h: 0.8 },
    { len: 18, pitch: 38, rv: 12 },
    { len: 9, pitch: 5, rv: 9 },
    { len: 22, pitch: 3, w: 2.6, h: 1.0 },
    { len: 14, pitch: -7, h: 1.1 },
  ]);
  const iF = P(chute('F', Fn.S, { color: COL.white, capStart: true, capEnd: true }));
  const finishS = 3 + 5 + 18 + 9 + 18;

  const link = (a, ...b) => { pieces[a].next = b; };
  link(iA, iF1); link(iF1, iB); link(iB, ...lanes); lanes.forEach(l => { link(l, iC); pieces[l].alt = lanes.filter(x => x !== l); });
  link(iC, iD); link(iD, iF2); link(iF2, iE); link(iE, iF3); link(iF3, iF); link(iF);
  const order = [iA, iF1, iB, lanes, iC, iD, iF2, iE, iF3, iF];
  let off = 0;
  for (const o of order) {
    if (Array.isArray(o)) { const Lm = Math.min(...o.map(i => pieces[i].len)); o.forEach(i => { pieces[i].pOff = off; pieces[i].scale = Lm / pieces[i].len; }); off += Lm; }
    else { pieces[o].pOff = off; pieces[o].scale = 1; off += pieces[o].len; }
  }
  const finishP = pieces[iF].pOff + finishS;

  let minY = Infinity;
  for (const pc of pieces) for (let i = 1; i < pc.mesh.pos.length; i += 3) minY = Math.min(minY, pc.mesh.pos[i]);
  shiftAll(pieces, kins, pegs, bumpers, 1.5 - minY);

  return { pieces, kins, pegs, bumpers, start: iA, gate: gateI, lanes, finish: { piece: iF, s: finishS, p: finishP }, total: off };
}

function shiftAll(pieces, kins, pegs, bumpers, dy) {
  const sh = p => { p[1] += dy; };
  for (const pc of pieces) {
    for (let i = 1; i < pc.mesh.pos.length; i += 3) pc.mesh.pos[i] += dy;
    pc.rims.forEach(r => r.forEach(sh));
    if (pc.kind === 'chute') pc.F.P.forEach(sh);
    else { pc.C = [pc.C[0], pc.C[1] + dy, pc.C[2]]; const y0 = pc.y; pc.y = r => y0(r) + dy; pc.spoutBottom += dy; }
  }
  for (const k of kins) k.base[1] += dy;
  for (const p of pegs) p.p[1] += dy;
  for (const b of bumpers) b.p[1] += dy;
}

function funnelAt(name, end, Rr, Rh, hw, side, color) {
  const Lh = leftOf(end.hd), r0 = Rr - 0.75, lowH = 0.42;
  const C = add(end.p, mul(Lh, side * r0)); C[1] = end.p[1] - lowH - 0.14;
  const d = Math.sqrt(Rr * Rr - r0 * r0), Pc = sub(end.p, mul(fwdOf(end.hd, 0), d));
  let ang = Math.atan2(Pc[2] - C[2], Pc[0] - C[0]); if (ang < 0) ang += 2 * Math.PI;
  return funnel(name, C, Rr, Rh, hw, color, side, { ang, half: (end.w / 2 + 0.25) / Rr, h: lowH });
}
function trayStart(f, hd) {
  const p = add([f.C[0], f.spoutBottom - 0.75, f.C[2]], mul(fwdOf(hd, 0), -1.0));
  return { p, hd, pitch: 8, w: 2.1, h: 0.8 };
}

function addPegs(pegs, pc, mk, gapX, gapS) {
  const { F } = pc; let row = 0;
  for (let i = mk.i0 + 6; i < mk.i1 - 4; i += Math.round(gapS / 0.2), row++) {
    const hw = pc.W[i] / 2 - 0.42;
    for (let a = -hw + (row % 2 ? gapX / 2 : 0); a <= hw + 1e-6; a += gapX)
      pegs.push({ p: add(F.P[i], mul(F.L[i], a)), u: F.U[i], r: 0.07, h: 0.45 });
  }
}
// Yay: keskin virajın dış duvarındaki geri teptiren plaka (side: +1 sol duvar, -1 sağ duvar)
function addSprings(bumpers, pc, mk, side) {
  for (const t of [0.3, 0.55, 0.8]) {
    const i = Math.round(mk.i0 + (mk.i1 - mk.i0) * t), F = pc.F;
    const p = add(add(F.P[i], mul(F.L[i], side * (pc.W[i] / 2 - 0.07))), mul(F.U[i], 0.42));
    bumpers.push({ kind: 'spring', shape: 'box', p, q: frameQuat(pc, i), he: [0.32, 0.2, 0.035], n: mul(F.L[i], -side) });
  }
}
// Balonlar: geniş tablada misketi geri teptiren yuvarlak tamponlar
function addBalloons(bumpers, pc, mk) {
  const rows = [[-0.6, 0.6], [-1.25, 0, 1.25], [-0.6, 0.6], [-1.25, 0, 1.25], [0]];
  const n = mk.i1 - mk.i0;
  rows.forEach((lat, k) => {
    const i = Math.round(mk.i0 + n * (0.1 + 0.8 * k / (rows.length - 1))), F = pc.F;
    for (const a of lat) bumpers.push({ kind: 'balloon', shape: 'ball', r: 0.3, p: add(add(F.P[i], mul(F.L[i], a)), mul(F.U[i], 0.3)), q: [0, 0, 0, 1], u: F.U[i] });
  });
}
// ---------- hareketli parçalar ----------
function frameQuat(pc, i) { return quatFromBasis(pc.F.T[i], pc.F.U[i], mul(pc.F.L[i], -1)); } // yerel x=T, y=U, z=-L
function gateKin(pc, i) {
  const q = frameQuat(pc, i), w = pc.W[i];
  return { type: 'gate', base: add(pc.F.P[i], mul(pc.F.U[i], 0.45)), q0: q, up: pc.F.U[i], parts: [{ shape: 'box', he: [0.05, 0.45, w / 2 - 0.02], p: [0, 0, 0], q: [0, 0, 0, 1] }] };
}
function wheelKin(pc, i) {
  // yarım genişlikte çark: sol yarıdaki misketleri tutar/fırlatır, sağ yarı serbest
  const q0 = frameQuat(pc, i), w = pc.W[i], R = 0.42, parts = [], hz = w * 0.3, zc = -(w / 2 - hz - 0.03);
  parts.push({ shape: 'cyl', r: 0.06, hh: hz + 0.02, p: [0, 0, zc], q: quatAxis([1, 0, 0], Math.PI / 2) });
  for (let k = 0; k < 5; k++) {
    const a = 2 * Math.PI * k / 5;
    parts.push({ shape: 'box', he: [R / 2 - 0.02, 0.025, hz], p: [Math.cos(a) * R / 2, Math.sin(a) * R / 2, zc], q: quatAxis([0, 0, 1], a) });
  }
  return { type: 'wheel', base: add(pc.F.P[i], mul(pc.F.U[i], R + 0.03)), q0, dq: quatAxis([0, 0, 1], 2.6 * DT), parts };
}
function spinKin(pc, i) {
  const q0 = frameQuat(pc, i), R = 1.2;
  return {
    type: 'spin', base: add(pc.F.P[i], mul(pc.F.U[i], 0.17)), q0, dq: quatAxis([0, 1, 0], 1.3 * DT),
    parts: [
      { shape: 'box', he: [R, 0.14, 0.05], p: [0, 0, 0], q: [0, 0, 0, 1] },
      { shape: 'cyl', r: 0.12, hh: 0.3, p: [0, 0.16, 0], q: [0, 0, 0, 1] }]
  };
}

// ---------- dışa aktarma: tüm sayılar sabitlenir, her cihaz aynı veriyi okur ----------
export function exportCourse(c) {
  const r = (v, k = 1e4) => Math.round(v * k) / k;
  const ra = (a, k) => a.map(v => Array.isArray(v) ? ra(v, k) : r(v, k));
  const pieces = c.pieces.map(pc => {
    const o = {
      name: pc.name, kind: pc.kind, color: ra(pc.color, 1e3), len: r(pc.len), pOff: r(pc.pOff), scale: r(pc.scale, 1e6), next: pc.next || [], alt: pc.alt || [],
      mesh: { pos: ra(pc.mesh.pos, 1e4), idx: pc.mesh.idx, col: ra(pc.mesh.col, 1e3) }, rims: pc.rims.map(rm => ra(rm, 1e3))
    };
    if (pc.kind === 'chute') Object.assign(o, { F: { P: ra(pc.F.P, 1e5), T: ra(pc.F.T, 1e5), L: ra(pc.F.L, 1e5), U: ra(pc.F.U, 1e5), s: ra(pc.F.s, 1e5) }, W: ra(pc.W, 1e4), H: ra(pc.H, 1e4) });
    else Object.assign(o, { C: ra(pc.C, 1e5), Rr: pc.Rr, Rh: pc.Rh, hw: pc.hw, ya: r(pc.ya, 1e9), yb: pc.yb, spoutBottom: r(pc.spoutBottom, 1e5) });
    return o;
  });
  const pegs = c.pegs.map(pg => { const q = quatYto(pg.u), cc = add(pg.p, mul(pg.u, pg.h / 2)); return { c: ra(cc, 1e5), q: ra(q, 1e7), r: pg.r, h: pg.h }; });
  const kins = c.kins.map(k => ({
    type: k.type, base: ra(k.base, 1e5), q0: ra(k.q0, 1e8), up: k.up ? ra(k.up, 1e6) : undefined, dq: k.dq ? ra(k.dq, 1e12) : undefined,
    parts: k.parts.map(pt => ({ shape: pt.shape, he: pt.he ? ra(pt.he, 1e5) : undefined, r: pt.r, hh: pt.hh != null ? r(pt.hh, 1e5) : undefined, p: ra(pt.p, 1e5), q: ra(pt.q, 1e8) }))
  }));
  const bumpers = c.bumpers.map(b => ({ kind: b.kind, shape: b.shape, p: ra(b.p, 1e5), q: ra(b.q, 1e8), he: b.he, r: b.r, n: b.n ? ra(b.n, 1e4) : undefined, u: b.u ? ra(b.u, 1e4) : undefined }));
  return { v: 2, MR, G, DT, pieces, pegs, kins, bumpers, start: c.start, gate: c.gate, lanes: c.lanes, finish: { piece: c.finish.piece, s: c.finish.s, p: r(c.finish.p) }, total: r(c.total) };
}
