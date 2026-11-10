// Turnuva sonuçlarını önceden hesaplar: node misket/tools/hesapla.mjs [YYYY-AA-GG] [saat]
// Çıktı: misket/sonuc/YYYY-AA-GG.json — her saatin her yarışı: katılanlar, tohum, sıralama, bitiş süreleri.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runRace } from '../sim.js';
import { SLOTS, ADV, skeleton, roundHeats, trDate } from '../turnuva.js';
const R = (await import('@dimforge/rapier3d-deterministic-compat')).default;
await R.init({});

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const course = JSON.parse(fs.readFileSync(path.join(dir, 'course.json'), 'utf8'));
const names = JSON.parse(fs.readFileSync(path.join(dir, 'katilimcilar.json'), 'utf8'));
const date = process.argv[2] || trDate(Date.now());
const only = process.argv[3] ? [+process.argv[3]] : SLOTS;
const out = path.join(dir, 'sonuc', date + '.json');
const doc = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { date, slots: {} };

for (const hour of only) {
  if (doc.slots[hour]?.done && doc.slots[hour].n === names.length) { console.log(date, hour, 'zaten hazır'); continue; }
  const n = names.length, races = skeleton(date, hour, n);
  const t0 = Date.now();
  for (let r = 1; ; r++) {
    const rr = races.filter(x => x.round === r);
    if (!rr.length) break;
    if (r > 1) { // önceki turdan çıkanlar
      const q = []; races.filter(x => x.round === r - 1).forEach(x => q.push(...x.result.slice(0, Math.min(ADV, x.size))));
      roundHeats(date, hour, r, q).forEach((ids, i) => { rr[i].ids = ids; });
    }
    for (const x of rr) {
      const res = runRace(R, course, x.ids, x.seed);
      x.result = res.result; x.fin = res.fin; x.end = res.end;
      console.log(date, hour, `yarış ${x.k + 1}/${races.length}`, `kazanan ${names[x.result[0]]}`, `${x.fin[0]} sn`, `${((Date.now() - t0) / 1000).toFixed(0)} sn geçti`);
    }
  }
  doc.slots[hour] = { n, done: true, races: races.map(({ k, round, heat, of, final, size, seed, start, ids, result, fin, end }) => ({ k, round, heat, of, final, size, seed, start, ids, result, fin, end })) };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(doc));
}
console.log('yazıldı', out);
