// Gerçek fizik (Rapier, deterministik derleme) — tarayıcı ve Node ortak.
// Her cihazda aynı sonucu vermesi için: parkur verisi course.json'dan gelir, burada yalnız + - * / ve sqrt kullanılır.
export function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function shuffle(arr, rnd) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qn = q => { const l = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]); return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
const rq = q => ({ x: q[0], y: q[1], z: q[2], w: q[3] });
export const funnelY = (pc, r) => pc.C[1] - pc.ya * (pc.Rr - r) - pc.yb * (1 / r - 1 / pc.Rr);

export const OPEN_T = 4;        // kapı yarış başlangıcından 4 sn sonra açılır (geri sayım)
export const AFTER_WIN = 50;    // kazanandan 50 sn sonra yarış kapanır
export const MAX_T = 330;       // güvenlik sınırı

export function makeSim(R, course, { n = 100, seed = 1 } = {}) {
  const rnd = mulberry(seed);
  const MR = course.MR;
  const world = new R.World({ x: 0, y: -course.G, z: 0 });
  world.timestep = course.DT;
  const flags = R.TriMeshFlags ? R.TriMeshFlags.FIX_INTERNAL_EDGES : undefined;
  for (const pc of course.pieces) {
    const cd = R.ColliderDesc.trimesh(new Float32Array(pc.mesh.pos), new Uint32Array(pc.mesh.idx), flags).setFriction(0.35).setRestitution(0.2);
    world.createCollider(cd);
  }
  for (const pg of course.pegs) world.createCollider(R.ColliderDesc.cylinder(pg.h / 2, pg.r).setTranslation(pg.c[0], pg.c[1], pg.c[2]).setRotation(rq(pg.q)).setRestitution(0.5).setFriction(0.1));
  const MAXR = R.CoefficientCombineRule.Max;
  for (const b of course.bumpers) {
    const cd = b.shape === 'ball' ? R.ColliderDesc.ball(b.r) : R.ColliderDesc.cuboid(b.he[0], b.he[1], b.he[2]);
    cd.setTranslation(b.p[0], b.p[1], b.p[2]).setRotation(rq(b.q)).setFriction(0.05)
      .setRestitution(b.kind === 'balloon' ? 1.12 : 1.15).setRestitutionCombineRule(MAXR);
    world.createCollider(cd);
  }
  const kinState = course.kins.map(k => ({ q: k.q0.slice() }));
  const kinBodies = course.kins.map(k => {
    const b = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(k.base[0], k.base[1], k.base[2]).setRotation(rq(k.q0)));
    for (const pt of k.parts) {
      const cd = pt.shape === 'box' ? R.ColliderDesc.cuboid(pt.he[0], pt.he[1], pt.he[2]) : R.ColliderDesc.cylinder(pt.hh, pt.r);
      cd.setTranslation(pt.p[0], pt.p[1], pt.p[2]).setRotation(rq(pt.q)).setFriction(0.3).setRestitution(0.3);
      world.createCollider(cd, b);
    }
    return b;
  });

  // başlangıç dizilimi: kapının arkasında ızgara (sıra tohumla karışık)
  const A = course.pieces[course.start], F = A.F, bodies = [];
  const order = shuffle(Array.from({ length: n }, (_, i) => i), rnd);
  let slot = 0;
  for (let row = 0; slot < n; row++) {
    const i = course.gate - 3 - Math.round(row * 0.37 / 0.2); if (i < 2) throw new Error('başlangıç alanı küçük');
    const w = A.W[i], per = Math.floor((w - 0.25) / 0.37);
    for (let k = 0; k < per && slot < n; k++, slot++) {
      const a = -(per - 1) * 0.37 / 2 + k * 0.37 + (row % 2 ? 0.09 : -0.09) + (rnd() - 0.5) * 0.05;
      const p = add(add(F.P[i], mul(F.L[i], a)), mul(F.U[i], MR + 0.02 + (row % 3) * 0.01));
      const b = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p[0], p[1], p[2]).setLinearDamping(0.06).setAngularDamping(0.15).setCanSleep(false));
      world.createCollider(R.ColliderDesc.ball(MR).setFriction(0.45).setRestitution(0.3).setDensity(2.5), b);
      bodies[order[slot]] = b;
    }
  }

  const st = {
    world, bodies, kinBodies, t: 0, open: null, n, ended: false, endT: -1,
    piece: new Int32Array(n).fill(course.start), idx: new Int32Array(n), prog: new Float32Array(n),
    best: new Float32Array(n), fin: new Float32Array(n).fill(-1), lost: new Float32Array(n), stuckT: new Float32Array(n),
    respawns: 0, nudges: 0, nFin: 0, steps: 0, laneOf: new Int8Array(n).fill(-1), firstFin: -1,
  };
  for (let m = 0; m < n; m++) st.idx[m] = course.gate - 5;

  const dt = course.DT;
  function probe(pc, p, i0, win) {
    if (pc.kind === 'funnel') {
      const dx = p[0] - pc.C[0], dz = p[2] - pc.C[2], r = Math.sqrt(dx * dx + dz * dz);
      if (r > pc.Rr + 0.3 || p[1] < pc.spoutBottom - 0.3 || p[1] > funnelY(pc, pc.Rr) + 2.5) return null;
      return { i: 0, s: Math.max(0, Math.min(1, (pc.Rr - r) / (pc.Rr - pc.Rh))) * pc.len * (p[1] < funnelY(pc, pc.Rh) ? 1 : 0.97) };
    }
    const P = pc.F.P, N = P.length;
    let a = 0, b = N - 1;
    if (i0 >= 0) { a = Math.max(0, i0 - win); b = Math.min(N - 1, i0 + win); }
    let bi = -1, bd = 1e9;
    for (let i = a; i <= b; i++) { const q = P[i], d = (q[0] - p[0]) * (q[0] - p[0]) + (q[1] - p[1]) * (q[1] - p[1]) + (q[2] - p[2]) * (q[2] - p[2]); if (d < bd) { bd = d; bi = i; } }
    const o = sub(p, P[bi]), lat = dot(o, pc.F.L[bi]), up = dot(o, pc.F.U[bi]), al = dot(o, pc.F.T[bi]);
    if (Math.abs(lat) > pc.W[bi] / 2 + 0.5 || up < -0.6 || up > 3.5 || Math.abs(al) > 1.0) return null;
    return { i: bi, s: pc.F.s[bi], d: Math.abs(lat) + Math.max(0, -up) };
  }
  function locate(m, p) {
    const pc = course.pieces[st.piece[m]];
    const r = probe(pc, p, st.idx[m], 25);
    if (r && (pc.kind === 'funnel' ? r.s < pc.len * 0.9 : r.s < pc.len - 3)) return { pi: st.piece[m], i: r.i, s: r.s, d: 0 };
    let best = null;
    for (const ni of [...pc.next, ...pc.alt]) {
      const q = probe(course.pieces[ni], p, -1, 0);
      if (q && q.s < 18 && (!best || (q.d ?? 0) < best.d)) best = { pi: ni, i: q.i, s: q.s, d: q.d ?? 0 };
    }
    if (best) return best;
    return r ? { pi: st.piece[m], i: r.i, s: r.s, d: 0 } : null;
  }
  function track() {
    for (let m = 0; m < n; m++) {
      if (st.fin[m] >= 0 && st.fin[m] < st.t - 5) continue;
      const b = bodies[m], t = b.translation(), p = [t.x, t.y, t.z];
      const c = locate(m, p);
      if (c) {
        if (c.pi !== st.piece[m]) { st.piece[m] = c.pi; const li = course.lanes.indexOf(c.pi); if (li >= 0) st.laneOf[m] = li; }
        st.idx[m] = c.i; const pc = course.pieces[c.pi];
        st.prog[m] = pc.pOff + c.s * pc.scale; st.lost[m] = 0;
      } else st.lost[m] += dt * 3;
      if (st.prog[m] > st.best[m] + 0.3) { st.best[m] = st.prog[m]; st.stuckT[m] = 0; } else st.stuckT[m] += dt * 3;
      if (st.fin[m] < 0 && st.prog[m] >= course.finish.p) {
        st.fin[m] = st.t; st.nFin++; if (st.firstFin < 0) st.firstFin = st.t;
        b.setLinearDamping(1.6); b.setAngularDamping(1.5);
      }
      if (st.lost[m] > 2.5) respawn(m);
      else if (st.open != null && st.fin[m] < 0 && st.stuckT[m] > 4) {
        const v = b.linvel();
        if (v.x * v.x + v.y * v.y + v.z * v.z < 0.16) { const k = 0.25 * b.mass(); b.applyImpulse({ x: (rnd() - 0.5) * k, y: k * 0.8, z: (rnd() - 0.5) * k }, true); st.nudges++; }
        st.stuckT[m] = 2.5;
      }
    }
  }
  function respawn(m) {
    const pc = course.pieces[st.piece[m]], b = bodies[m];
    let p, v;
    if (pc.kind === 'funnel') { p = [pc.C[0], funnelY(pc, pc.Rh) + 0.3, pc.C[2]]; v = [0, 0, 0]; }
    else { const i = Math.max(0, Math.min(pc.F.P.length - 1, st.idx[m])); p = add(pc.F.P[i], mul(pc.F.U[i], 0.5)); v = mul(pc.F.T[i], 2); }
    b.setTranslation({ x: p[0], y: p[1], z: p[2] }, true); b.setLinvel({ x: v[0], y: v[1], z: v[2] }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    st.lost[m] = 0; st.respawns++;
  }
  function kinPose(k, ks, tn) {
    if (k.type === 'gate') {
      const lift = st.open == null ? 0 : Math.min(1.4, Math.max(0, (tn - st.open) * 3));
      return { p: add(k.base, mul(k.up, lift)), q: k.q0 };
    }
    ks.q = qmul(ks.q, k.dq);
    if (st.steps % 600 === 0) ks.q = qn(ks.q);
    return { p: k.base, q: ks.q };
  }

  st.step = () => {
    const tn = st.t + dt;
    if (st.open == null && tn >= OPEN_T - 1e-9) st.open = tn;
    course.kins.forEach((k, i) => { const q = kinPose(k, kinState[i], tn); kinBodies[i].setNextKinematicTranslation({ x: q.p[0], y: q.p[1], z: q.p[2] }); kinBodies[i].setNextKinematicRotation(rq(q.q)); });
    world.step(); st.t = tn; st.steps++;
    if (st.steps % 3 === 0) {
      track();
      if (!st.ended && (st.nFin === n || (st.firstFin >= 0 && st.t - st.firstFin > AFTER_WIN) || st.t > MAX_T)) { st.ended = true; st.endT = st.t; }
    }
  };
  st.ranking = () => Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const fa = st.fin[a], fb = st.fin[b];
    if (fa >= 0 || fb >= 0) { if (fa < 0) return 1; if (fb < 0) return -1; return fa - fb || a - b; }
    return st.prog[b] - st.prog[a] || a - b;
  });
  return st;
}

// Bir yarışı baştan sona koşar (sonuç hesabı / test). onStep isteğe bağlı.
export function runRace(R, course, ids, seed, onStep) {
  const sim = makeSim(R, course, { n: ids.length, seed });
  while (!sim.ended) { sim.step(); if (onStep) onStep(sim); }
  const rk = sim.ranking();
  return { sim, result: rk.map(i => ids[i]), fin: rk.map(i => sim.fin[i] >= 0 ? Math.round((sim.fin[i] - sim.open) * 1000) / 1000 : -1), end: Math.round(sim.endT * 1000) / 1000 };
}
