// Headless test of the Harbor Jelly choreography (no browser, no GPU).
// Runs the pure core from index.html (<script id="harbor-core">) and checks the ship's day for collisions,
// grounding, crane spacing, container bookkeeping and loop timing.
//   node --test choreo.test.mjs            (reads ../index.html next to this folder)
//   HJ_CORE=path/to/core.js node --test choreo.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
function loadCore() {
  let src;
  if (process.env.HJ_CORE) src = readFileSync(process.env.HJ_CORE, "utf8");
  else {
    const html = readFileSync(join(here, "..", "index.html"), "utf8");
    const m = html.match(/<script id="harbor-core">([\s\S]*?)<\/script>/);
    assert.ok(m, "index.html has <script id=\"harbor-core\">");
    src = m[1];
  }
  const ctx = { console, Math, Float32Array, Uint8Array, Map };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.HarborCore;
}
const HC = loadCore();
const DT = 1 / 60;

function runDay(h, seconds, onStep) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) { h.update(DT); onStep?.(h, i * DT); }
}

test("three full ship's days: no collisions, no grounding, cranes apart, boxes conserved", () => {
  const h = new HC.Harbor({ seed: 7 });
  const nBoxes = h.containers.length;
  const phases = []; let lastPhase = h.phase; const cycleStarts = [0];
  let worstShip = Infinity, worstTug = Infinity, worstDepth = Infinity, worstCrane = Infinity, worstTugShip = -Infinity;
  const problems = [];
  runDay(h, 360, (h, t) => {
    if (h.phase !== lastPhase) { phases.push(h.phase); if (h.phase === "unload") cycleStarts.push(t); lastPhase = h.phase; }
    const ship = h.ship, tug = h.tug;
    const atBerth = h.phase === "unload" || h.phase === "load" || h.phase === "boomsUp" || h.phase === "tugComing" || h.phase === "boomsDown";
    const cs = HC.clearance(ship, HC.SHIP.L, HC.SHIP.W);
    worstShip = Math.min(worstShip, cs.clearance);
    if (cs.clearance < 0 && problems.length < 5) problems.push(`t=${t.toFixed(1)} ship ${h.phase} hits ${cs.hit.join(",")} (${cs.clearance.toFixed(3)})`);
    const ct = HC.clearance(tug, HC.TUG.L, HC.TUG.W);
    worstTug = Math.min(worstTug, ct.clearance);
    if (ct.clearance < 0 && problems.length < 5) problems.push(`t=${t.toFixed(1)} tug ${h.phase} hits ${ct.hit.join(",")} (${ct.clearance.toFixed(3)})`);
    const ov = HC.obbOverlap(tug, HC.TUG.L, HC.TUG.W, ship, HC.SHIP.L, HC.SHIP.W);
    worstTugShip = Math.max(worstTugShip, ov);
    if (ov > 0.004 && problems.length < 5) problems.push(`t=${t.toFixed(1)} tug overlaps ship by ${ov.toFixed(3)} (${h.phase})`);
    const depth = HC.minDepthUnder(ship, HC.SHIP.L, HC.SHIP.W);
    worstDepth = Math.min(worstDepth, depth);
    if (depth < HC.SHIP.draft + 0.03 && problems.length < 5) problems.push(`t=${t.toFixed(1)} ship aground: depth ${depth.toFixed(3)}`);
    const tugDepth = HC.minDepthUnder(tug, HC.TUG.L, HC.TUG.W);
    if (tugDepth < HC.TUG.draft + 0.03 && problems.length < 5) problems.push(`t=${t.toFixed(1)} tug aground: depth ${tugDepth.toFixed(3)}`);
    const sep = Math.abs(h.cranes[0].x - h.cranes[1].x);
    worstCrane = Math.min(worstCrane, sep);
    if (sep < HC.CRANE.legW && problems.length < 5) problems.push(`t=${t.toFixed(1)} cranes ${sep.toFixed(3)} apart`);
    if (!atBerth && h.cranes.some((c) => c.hold !== null) && problems.length < 5) problems.push(`t=${t.toFixed(1)} crane holding a box while the ship is away`);
    if (Math.round(t / DT) % 30 === 0) {
      const held = h.containers.filter((c) => c.held).length;
      assert.equal(h.slots.size + held, nBoxes, "containers conserved");
      for (const [key, id] of h.slots) assert.equal(h.containers[id].slot, key, "slot map consistent");
    }
  });
  console.log(`worst clearance ship ${worstShip.toFixed(3)} tug ${worstTug.toFixed(3)}, tug/ship overlap ${worstTugShip.toFixed(4)}, min depth ${worstDepth.toFixed(3)}, min crane gap ${worstCrane.toFixed(3)}`);
  console.log(`cycle starts: ${cycleStarts.map((t) => t.toFixed(1)).join(", ")}  boxes moved ${h.tally.moved}, voyages ${h.tally.voyages}`);
  assert.deepEqual(problems, []);
  assert.ok(h.tally.voyages >= 3, `three voyages done (got ${h.tally.voyages})`);
  const len = cycleStarts[1] - cycleStarts[0];
  assert.ok(len > 80 && len < 135, `loop about 100 s (got ${len.toFixed(1)} s)`);
  const order = ["load", "boomsUp", "tugComing", "castOff", "atSea", "berthing", "boomsDown", "unload"];
  assert.deepEqual(phases.slice(0, order.length), order, "phases in order");
  const inCycle = h.phase === "unload" ? h.moves.done : h.phase === "load" ? 8 + h.moves.done : 16;
  assert.equal(h.tally.moved, 16 * h.tally.voyages + inCycle, "8 boxes off + 8 on per call");
});

test("Cast off early: cranes finish the box in hand, ship leaves, Call her in hurries her home", () => {
  const h = new HC.Harbor({ seed: 3 });
  runDay(h, 9);
  assert.equal(h.phase, "unload");
  assert.equal(h.buttonState().label, "Cast off");
  assert.ok(h.castOff(), "cast off accepted");
  assert.equal(h.buttonState().enabled, false, "button greys out");
  let t = 0;
  while (h.phase !== "atSea" && t < 60) { h.update(DT); t += DT; }
  assert.equal(h.phase, "atSea", "ship sailed");
  assert.ok(h.cranes.every((c) => c.hold === null && !c.task), "no box left hanging");
  assert.ok(h.events.some((e) => e.type === "horn"), "horn sounded on sailing");
  runDay(h, 3);
  assert.equal(h.buttonState().label, "Call her in");
  assert.ok(h.buttonState().enabled);
  const before = h.lapFrac();
  assert.ok(h.callIn());
  runDay(h, 2);
  const fast = h.lapFrac() - before;
  const g = new HC.Harbor({ seed: 3 }); runDay(g, 9); g.castOff(); while (g.phase !== "atSea") g.update(DT); runDay(g, 3);
  const b2 = g.lapFrac(); runDay(g, 2); const slow = g.lapFrac() - b2;
  assert.ok(fast > slow * 1.5, `hurried (${fast.toFixed(3)} vs ${slow.toFixed(3)})`);
  let guard = 0; while (h.phase !== "unload" && guard++ < 60 * 90) h.update(DT);
  assert.equal(h.phase, "unload", "back alongside and working again");
});

test("water sim stays bounded and settles; tipping sloshes to the low side", () => {
  const w = new HC.WaterSim(100);
  w.disturb(0, 1.2, 0.2, 0.08, 1);
  const P = { g: 3, damp: 0.6, tension: 0.0006, fx: 0, fz: 0 };
  let maxAbs = 0; const t0 = performance.now();
  for (let i = 0; i < 600; i++) { w.step(1 / 120, P); for (const e of w.eta) maxAbs = Math.max(maxAbs, Math.abs(e)); }
  const ms = (performance.now() - t0) / 600;
  let after = 0; for (const e of w.eta) after = Math.max(after, Math.abs(e));
  console.log(`sim step ${ms.toFixed(3)} ms (100×100, incl. test loop), peak ${maxAbs.toFixed(3)}, after 5 s ${after.toFixed(4)}`);
  assert.ok(maxAbs <= 0.12 + 1e-6 && after < 0.02, "bounded and settling");
  assert.ok(ms * 2 < 2, "two sim steps per frame under 2 ms");
  const t = new HC.WaterSim(100);
  for (let i = 0; i < 240; i++) t.step(1 / 120, { ...P, fx: 0.4 });
  assert.ok(t.height(1.5, 1.8) > t.height(-1.5, 1.8), "water runs to the low side");
});
