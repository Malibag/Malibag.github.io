// Turnuva düzeni — tarayıcı ve sonuç hesaplayan görev ortak kullanır.
// Her saat (12:00, 18:00, 21:00 Türkiye) ayrı turnuva: 100'erli elemeler, her elemeden ilk 10 üst tura, en sonda final.
import { mulberry, shuffle } from './sim.js';

export const SLOTS = [12, 18, 21];     // Türkiye saati (UTC+3, yaz saati yok)
export const HEAT_SEC = 240;           // her yarışa ayrılan süre (geri sayım + yarış + sonuç)
export const PER = 100;                // bir yarıştaki en fazla misket
export const ADV = 10;                 // her elemeden üst tura çıkan

export function seedOf(date, hour, k) { // tarih + saat + yarış sırası -> tohum
  let h = 2166136261;
  for (const ch of `${date}|${hour}|${k}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function slotStart(date, hour) { const [y, m, d] = date.split('-').map(Number); return Date.UTC(y, m - 1, d, hour - 3, 0, 0); }
export function trDate(ms) { const t = new Date(ms + 3 * 3600e3); return t.toISOString().slice(0, 10); }

function split(ids) { // dengeli bölme: 250 -> 84/83/83
  const h = Math.ceil(ids.length / PER), out = []; let o = 0;
  for (let k = 0; k < h; k++) { const sz = Math.floor(ids.length / h) + (k < ids.length % h ? 1 : 0); out.push(ids.slice(o, o + sz)); o += sz; }
  return out;
}
// Turların boyutları (sonuç bilinmeden): [[100,100,...], [100]]
export function shape(n) {
  const rounds = []; let cur = n;
  while (true) {
    const sizes = split(Array.from({ length: cur }, (_, i) => i)).map(a => a.length);
    rounds.push(sizes);
    if (sizes.length === 1) break;
    cur = sizes.reduce((s, z) => s + Math.min(ADV, z), 0);
  }
  return rounds;
}
export function raceCount(n) { return shape(n).reduce((s, r) => s + r.length, 0); }
// Bir turun yarışları: katılanlar tohumla karıştırılıp bölünür
export function roundHeats(date, hour, round, ids) {
  const rnd = mulberry(seedOf(date, hour, 'tur' + round));
  return split(shuffle(ids, rnd));
}
// Yarış listesi iskeleti (1. tur dolu, sonraki turlar sonuç gelince dolar)
export function skeleton(date, hour, n) {
  const sh = shape(n), races = []; let k = 0;
  sh.forEach((sizes, r) => sizes.forEach((sz, h) => {
    races.push({ k, round: r + 1, heat: h + 1, of: sizes.length, final: r === sh.length - 1, size: sz, seed: seedOf(date, hour, k), start: slotStart(date, hour) + k * HEAT_SEC * 1000 });
    k++;
  }));
  const first = roundHeats(date, hour, 1, Array.from({ length: n }, (_, i) => i));
  races.filter(r => r.round === 1).forEach((r, i) => { r.ids = first[i]; });
  return races;
}
export function raceName(r) {
  if (r.final) return 'FİNAL';
  return `${r.round}. Tur · Eleme ${r.heat}/${r.of}`;
}
