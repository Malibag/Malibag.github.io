/* Rüya Kâtibi yolculuğu: adım noktalarını kıvrılan altın bir çizgiyle bağlar (bir sağa bir sola
   salınarak aşağı iner); çizgi sayfa kaydırıldıkça dolar, ulaştığı adım ve sağdaki gösterge parlar. */
(() => {
  "use strict";
  const journey = document.getElementById("journey");
  if (!journey) return;
  // Çizgi iki katmanda çizilir: arka katman adımların altında, ön katman üstünde kalır.
  // Bağlantılar sırayla katman değiştirir; çizgi yazı ve görsellerin bir altından bir üstünden geçer.
  const NS = "http://www.w3.org/2000/svg";
  const back = journey.querySelector(".journey-path");
  back.replaceChildren();
  const front = back.cloneNode(false);
  front.classList.add("is-front");
  journey.appendChild(front);
  const steps = [...journey.querySelectorAll(".step")];
  const dots = [...document.querySelectorAll(".step-dots a")];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Her bağlantı, okuma çizgisi y0'dan y1'e inerken kendi uzunluğu boyunca SABİT hızla çizilir
  // (kavisin yatay kısımlarında fırlamaz); ekrandaki uç bu hedefe her karede yumuşakça yaklaşır.
  let segs = []; // { ink, len, y0, y1 }
  let drawn = 0;
  let target = 0;
  let animating = false;

  const addSeg = (layer, d, y0, y1) => {
    const track = document.createElementNS(NS, "path");
    track.setAttribute("class", "track");
    track.setAttribute("d", d);
    const ink = document.createElementNS(NS, "path");
    ink.setAttribute("class", "ink");
    ink.setAttribute("d", d);
    layer.append(track, ink);
    const len = ink.getTotalLength();
    ink.style.strokeDasharray = `${len}`;
    ink.style.strokeDashoffset = `${len}`;
    segs.push({ ink, len, y0, y1 });
  };

  // Noktalar arasından geçen yumuşak eğri (Catmull-Rom → kübik Bezier).
  const smooth = (pts) => {
    let d = `M ${pts[1][0]} ${pts[1][1]}`;
    for (let i = 1; i < pts.length - 2; i++) {
      const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  };

  const build = () => {
    if (getComputedStyle(back).display === "none") return; // dar ekranda çizgi yok
    const box = journey.getBoundingClientRect();
    [back, front].forEach((layer) => {
      layer.replaceChildren();
      layer.setAttribute("width", box.width);
      layer.setAttribute("height", box.height);
      layer.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    });
    segs = [];
    const pts = steps.map((step) => {
      const r = step.querySelector(".node").getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    });
    const reach = box.width * 0.36; // salınımın genişliği: yazı ve görsel sütunlarının içine kadar
    // Giriş: en üstten de düz inmez, dalgalanarak ilk düğüme oturur.
    addSeg(back, wave(pts[0][0], 0, pts[0][0], pts[0][1], -1, reach * 0.8), 0, pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1];
      const [x2, y2] = pts[i];
      // Bağlantılar sırayla ön/arka katmana geçer; yön her bağlantıda değişir.
      addSeg(i % 2 ? front : back, wave(x1, y1, x2, y2, i % 2 ? 1 : -1, reach), y1, y2);
    }
    update();
    drawn = target; // yeniden boyutlanınca baştan çizmeye başlamasın
    paint();
  };

  // Dalga: düğümden bir yana yuvarlak bir dönüşle açılır, ortadan karşı yana geçer, yine
  // yuvarlak dönüp sonraki düğüme oturur (uçlar oval, çapraz düz çizgi yok).
  function wave(x1, y1, x2, y2, dir, reach) {
    const dy = y2 - y1;
    const cx = (x1 + x2) / 2;
    return smooth([
      [x1, y1 - dy * 0.2],
      [x1, y1],
      [cx + dir * reach * 0.72, y1 + dy * 0.15],
      [cx + dir * reach, y1 + dy * 0.3],
      [cx + dir * reach * 0.55, y1 + dy * 0.42],
      [cx - dir * reach * 0.55, y1 + dy * 0.58],
      [cx - dir * reach, y1 + dy * 0.7],
      [cx - dir * reach * 0.72, y1 + dy * 0.85],
      [x2, y2],
      [x2, y2 + dy * 0.2],
    ]);
  }

  // Çizili uzunluğu bağlantılara dağıtır; çizgi bir düğüme vardığında o adım parlar.
  function paint() {
    let rest = drawn;
    let reachedUntil = 0;
    segs.forEach((sg, k) => {
      const f = Math.max(0, Math.min(sg.len, rest));
      sg.ink.style.strokeDashoffset = `${sg.len - f}`;
      reachedUntil += sg.len;
      if (steps[k]) steps[k].classList.toggle("is-active", drawn >= reachedUntil - 1);
      rest -= sg.len;
    });
  }

  function tickLine() {
    const diff = target - drawn;
    drawn = Math.abs(diff) < 0.5 ? target : drawn + diff * 0.12;
    paint();
    if (drawn !== target) requestAnimationFrame(tickLine);
    else animating = false;
  }

  function update() {
    const box = journey.getBoundingClientRect();
    const head = window.innerHeight * 0.55 - box.top; // okuma çizgisi, yolculuğa göre
    target = segs.reduce((sum, sg) => sum + sg.len * (reduceMotion ? 1 : Math.max(0, Math.min(1, (head - sg.y0) / (sg.y1 - sg.y0)))), 0);
    if (reduceMotion) {
      drawn = target;
      paint();
    } else if (!animating && drawn !== target) {
      animating = true;
      requestAnimationFrame(tickLine);
    }
    let current = -1;
    steps.forEach((step, i) => {
      const r = step.getBoundingClientRect();
      if (!segs.length) step.classList.toggle("is-active", r.top < window.innerHeight * 0.55); // dar ekran: çizgi yok
      if (r.top < window.innerHeight * 0.9) step.classList.add("is-in"); // hızlı kaydırmada da boş kalmasın
      if (r.top < window.innerHeight * 0.6) current = i;
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  if ("IntersectionObserver" in window && !reduceMotion) {
    journey.classList.add("is-ready");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.2 }
    );
    steps.forEach((s) => io.observe(s));
  }

  build();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", build);
  window.addEventListener("load", build);
  if (document.fonts) document.fonts.ready.then(build);

  /* İmleç yıldızı: imlecin ucunda parlayan bir yıldız, fare ilerledikçe arkasında
     yavaşça düşüp sönen küçük yıldızlar bırakır. Yalnızca fareli cihazlarda çalışır. */
  if (reduceMotion || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const canvas = document.createElement("canvas");
  canvas.className = "star-trail";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let dpr = 1;
  const resizeCanvas = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  };
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const stars = [];
  const MAX_STARS = 220;
  const pointer = { x: 0, y: 0, inside: false, lastMove: 0 };
  let running = false;
  let prev = 0;

  const sparkle = (x, y, r, rot) => {
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = rot + (k * Math.PI) / 4;
      const rad = k % 2 ? r * 0.3 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
  };

  const tick = (now) => {
    const dt = Math.min(now - prev, 50);
    prev = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.shadowColor = "rgba(226, 194, 122, 0.9)";
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.life += dt;
      if (s.life >= s.max) {
        stars.splice(i, 1);
        continue;
      }
      const k = s.life / s.max;
      s.x += s.vx * dt * 0.06;
      s.y += s.vy * dt * 0.06;
      ctx.globalAlpha = Math.max(0, (1 - k) * (0.65 + 0.35 * Math.sin(s.life * 0.02 + s.phase)));
      ctx.fillStyle = s.gold ? "#e2c27a" : "#f2ead9";
      ctx.shadowBlur = 8;
      sparkle(s.x, s.y, s.r * (1 - k * 0.6), s.rot + k * 1.5);
    }
    // İmlecin ucundaki yıldız: hareket durunca yavaşça söner.
    const idle = now - pointer.lastMove;
    const headAlpha = pointer.inside ? Math.max(0, 1 - Math.max(0, idle - 900) / 600) : 0;
    if (headAlpha > 0) {
      ctx.globalAlpha = headAlpha * (0.85 + 0.15 * Math.sin(now * 0.008));
      ctx.fillStyle = "#f6dc96";
      ctx.shadowBlur = 16;
      sparkle(pointer.x + 9, pointer.y + 9, 7, now * 0.0015);
    }
    ctx.globalAlpha = 1;
    if (stars.length || headAlpha > 0) requestAnimationFrame(tick);
    else running = false;
  };

  const start = () => {
    if (running) return;
    running = true;
    prev = performance.now();
    requestAnimationFrame(tick);
  };

  let last = null;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.inside = true;
      pointer.lastMove = performance.now();
      const dist = last ? Math.hypot(e.clientX - last.x, e.clientY - last.y) : 0;
      const n = Math.min(4, Math.floor(dist / 16));
      for (let j = 0; j < n && stars.length < MAX_STARS; j++) {
        const t = (j + 1) / n;
        stars.push({
          x: last.x + (e.clientX - last.x) * t + 9 + (Math.random() - 0.5) * 8,
          y: last.y + (e.clientY - last.y) * t + 9 + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.15 + Math.random() * 0.5, // yavaşça aşağı süzülür
          r: 1.6 + Math.random() * 3.6,
          rot: Math.random() * Math.PI,
          phase: Math.random() * 6,
          life: 0,
          max: 650 + Math.random() * 650,
          gold: Math.random() < 0.72,
        });
      }
      if (!last || dist >= 16) last = { x: e.clientX, y: e.clientY };
      start();
    },
    { passive: true }
  );
  document.documentElement.addEventListener("mouseleave", () => (pointer.inside = false));
})();
