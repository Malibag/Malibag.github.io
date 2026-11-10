// Gerçek fizik (Rapier) — tarayıcı ve Node ortak
import { MR, G, V, quatYto } from './course.js';

export function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function makeSim(R, course, { n = 100, seed = 1 } = {}) {
  const rnd = mulberry(seed);
  const world = new R.World({ x: 0, y: -G, z: 0 });
  world.timestep = 1 / 120;
  const flags = R.TriMeshFlags ? R.TriMeshFlags.FIX_INTERNAL_EDGES : undefined;
  for (const pc of course.pieces) {
    const cd = R.ColliderDesc.trimesh(new Float32Array(pc.mesh.pos), new Uint32Array(pc.mesh.idx), flags).setFriction(0.35).setRestitution(0.2);
    world.createCollider(cd);
  }
  for (const pg of course.pegs) {
    const q = quatYto(pg.u), c = V.add(pg.p, V.mul(pg.u, pg.h / 2));
    world.createCollider(R.ColliderDesc.cylinder(pg.h / 2, pg.r).setTranslation(c[0], c[1], c[2]).setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }).setRestitution(0.5).setFriction(0.1));
  }
  const kinBodies = course.kins.map(k => {
    const p0 = k.pose(0, null);
    const b = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(p0.p[0], p0.p[1], p0.p[2]).setRotation({ x: p0.q[0], y: p0.q[1], z: p0.q[2], w: p0.q[3] }));
    for (const pt of k.parts) {
      const cd = pt.shape === 'box' ? R.ColliderDesc.cuboid(...pt.he) : R.ColliderDesc.cylinder(pt.hh, pt.r);
      cd.setTranslation(...pt.p).setRotation({ x: pt.q[0], y: pt.q[1], z: pt.q[2], w: pt.q[3] }).setFriction(0.3).setRestitution(0.3);
      world.createCollider(cd, b);
    }
    return b;
  });

  // başlangıç dizilimi: kapının arkasında ızgara
  const A = course.pieces[course.start], F = A.F, bodies = [];
  const order = Array.from({ length: n }, (_, i) => i).sort(() => rnd() - 0.5);
  let slot = 0;
  for (let row = 0; slot < n; row++) {
    const i = course.gate - 3 - Math.round(row * 0.37 / 0.2); if (i < 2) throw new Error('başlangıç alanı küçük');
    const w = A.W[i], per = Math.floor((w - 0.25) / 0.37);
    for (let k = 0; k < per && slot < n; k++, slot++) {
      const a = -(per - 1) * 0.37 / 2 + k * 0.37 + (row % 2 ? 0.09 : -0.09);
      const p = V.add(V.add(F.P[i], V.mul(F.L[i], a)), V.mul(F.U[i], MR + 0.02 + (row % 3) * 0.01));
      const b = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p[0], p[1], p[2]).setLinearDamping(0.06).setAngularDamping(0.15).setCanSleep(false));
      world.createCollider(R.ColliderDesc.ball(MR).setFriction(0.45).setRestitution(0.4).setDensity(2.5), b);
      bodies[order[slot]] = b;
    }
  }

  const st = {
    world, bodies, kinBodies, t: 0, open: null, n,
    piece: new Int32Array(n).fill(course.start), idx: new Int32Array(n), prog: new Float32Array(n),
    best: new Float32Array(n), fin: new Float32Array(n).fill(-1), lost: new Float32Array(n), stuckT: new Float32Array(n),
    respawns: 0, nudges: 0, nFin: 0, steps: 0, laneOf: new Int8Array(n).fill(-1),
  };
  for (let m = 0; m < n; m++) st.idx[m] = course.gate - 5;

  const dt = world.timestep;
  function probe(pc, p, i0, win) {
    if (pc.kind === 'funnel') {
      const r = Math.hypot(p[0] - pc.C[0], p[2] - pc.C[2]);
      if (r > pc.Rr + 0.3 || p[1] < pc.spoutBottom - 0.3 || p[1] > pc.y(pc.Rr) + 2.5) return null;
      return { i: 0, s: Math.max(0, Math.min(1, (pc.Rr - r) / (pc.Rr - pc.Rh))) * pc.len * (p[1] < pc.y(pc.Rh) ? 1 : 0.97) };
    }
    const P = pc.F.P, N = P.length;
    let a = 0, b = N - 1;
    if (i0 >= 0) { a = Math.max(0, i0 - win); b = Math.min(N - 1, i0 + win); }
    let bi = -1, bd = 1e9;
    for (let i = a; i <= b; i++) { const q = P[i], d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2; if (d < bd) { bd = d; bi = i; } }
    const o = V.sub(p, P[bi]), lat = V.dot(o, pc.F.L[bi]), up = V.dot(o, pc.F.U[bi]), al = V.dot(o, pc.F.T[bi]);
    if (Math.abs(lat) > pc.W[bi] / 2 + 0.5 || up < -0.6 || up > 3.5 || Math.abs(al) > 1.0) return null;
    return { i: bi, s: pc.F.s[bi], d: Math.abs(lat) + Math.max(0, -up) };
  }
  function locate(m, p) {
    const pc = course.pieces[st.piece[m]];
    const r = probe(pc, p, st.idx[m], 25);
    if (r && (pc.kind === 'funnel' ? r.s < pc.len * 0.9 : r.s < pc.len - 3)) return { pi: st.piece[m], ...r };
    let best = null;
    for (const ni of [...(pc.next || []), ...(pc.alt || [])]) {
      const q = probe(course.pieces[ni], p, -1, 0);
      if (q && q.s < 18 && (!best || (q.d ?? 0) < best.d)) best = { pi: ni, ...q, d: q.d ?? 0 };
    }
    if (best) return best;
    return r ? { pi: st.piece[m], ...r } : null;
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
      if (st.fin[m] < 0 && st.prog[m] >= course.finish.p) { st.fin[m] = st.t; st.nFin++; b.setLinearDamping(1.6); b.setAngularDamping(1.5); }
      if (st.lost[m] > 2.5) respawn(m);
      else if (st.open != null && st.fin[m] < 0 && st.stuckT[m] > 4) {
        const v = b.linvel();
        if (Math.hypot(v.x, v.y, v.z) < 0.4) { const k = 0.25 * b.mass(); b.applyImpulse({ x: (rnd() - 0.5) * k, y: k * 0.8, z: (rnd() - 0.5) * k }, true); st.nudges++; }
        st.stuckT[m] = 2.5;
      }
    }
  }
  function respawn(m) {
    const pc = course.pieces[st.piece[m]], b = bodies[m];
    let p, v;
    if (pc.kind === 'funnel') { p = [pc.C[0], pc.y(pc.Rh) + 0.3, pc.C[2]]; v = [0, 0, 0]; }
    else { const i = Math.max(0, Math.min(pc.F.P.length - 1, st.idx[m])); p = V.add(pc.F.P[i], V.mul(pc.F.U[i], 0.5)); v = V.mul(pc.F.T[i], 2); }
    b.setTranslation({ x: p[0], y: p[1], z: p[2] }, true); b.setLinvel({ x: v[0], y: v[1], z: v[2] }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    st.lost[m] = 0; st.respawns++;
  }

  st.start = () => { st.open = st.t; };
  st.step = () => {
    const tn = st.t + dt;
    course.kins.forEach((k, i) => { const q = k.pose(tn, st.open); kinBodies[i].setNextKinematicTranslation({ x: q.p[0], y: q.p[1], z: q.p[2] }); kinBodies[i].setNextKinematicRotation({ x: q.q[0], y: q.q[1], z: q.q[2], w: q.q[3] }); });
    world.step(); st.t = tn; st.steps++;
    if (st.steps % 3 === 0) track();
  };
  st.ranking = () => Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const fa = st.fin[a], fb = st.fin[b];
    if (fa >= 0 || fb >= 0) { if (fa < 0) return 1; if (fb < 0) return -1; return fa - fb; }
    return st.prog[b] - st.prog[a];
  });
  return st;
}
