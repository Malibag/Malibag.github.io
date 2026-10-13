/* Rüya Kâtibi yolculuğu — "merdiven" kaydırma: geniş ekranda bölüm sabitlenir, ziyaretçi aşağı
   kaydırdıkça görünüm sırayla bir aşağı, bir sağa ilerler (01 → 02 aşağı, 02 → 03 sağa …).
   Altın çizgi bu yolu izleyerek dolar. Dar ekranda ve "hareketi azalt" tercihinde adımlar
   normal sayfa akışında alt alta kalır. */
(() => {
  "use strict";
  const journey = document.getElementById("journey");
  if (!journey) return;
  const stage = journey.querySelector(".journey-stage");
  const world = journey.querySelector(".journey-world");
  const svg = journey.querySelector(".journey-path");
  const steps = [...journey.querySelectorAll(".step")];
  const dots = [...document.querySelectorAll(".step-dots a")];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wide = matchMedia("(min-width: 901px)");
  const NS = "http://www.w3.org/2000/svg";

  const GRID = [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]]; // [sütun, satır]: aşağı, sağa, aşağı, sağa
  const HOLD = 0.35; // her geçişten önce adımı okumak için bekleme payı (geçiş süresinin oranı)
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let stair = false;
  let W = 0, H = 0, SEG = 0;
  let segs = [];

  const svgPath = (cls, d) => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("class", cls);
    p.setAttribute("d", d);
    svg.appendChild(p);
    return p;
  };

  // İki düğüm arasındaki yol: aşağı geçişte ortadaki boş sütundan iner; sağa geçişte içeriklerin
  // altından (ekranın alt bandından) dolanır, böylece hiçbir yazının ya da görselin üstünden geçmez.
  const segmentPath = ([x1, y1], [x2, y2], down, rowTop) => {
    if (down) return `M ${x1} ${y1} L ${x2} ${y2}`;
    const yb = rowTop + H * 0.9;
    const r = 46;
    return `M ${x1} ${y1} L ${x1} ${yb - r} Q ${x1} ${yb} ${x1 + r} ${yb} L ${x2 - r} ${yb} Q ${x2} ${yb} ${x2} ${yb - r} L ${x2} ${y2}`;
  };

  const layout = () => {
    stair = wide.matches && !reduceMotion;
    journey.classList.toggle("is-stair", stair);
    svg.replaceChildren();
    segs = [];
    if (!stair) {
      journey.style.height = "";
      world.style.transform = "";
      world.style.width = world.style.height = "";
      steps.forEach((s) => (s.style.left = s.style.top = s.style.width = s.style.height = ""));
      update();
      return;
    }
    W = stage.clientWidth;
    H = window.innerHeight;
    SEG = H * 1.1; // bir geçiş için kaydırma mesafesi
    journey.style.setProperty("--W", `${W}px`);
    journey.style.height = `${(GRID.length - 1) * SEG + H * 1.35}px`;
    world.style.width = `${3 * W}px`;
    world.style.height = `${3 * H}px`;
    steps.forEach((s, i) => {
      const [c, r] = GRID[i];
      Object.assign(s.style, { left: `${c * W}px`, top: `${r * H}px`, width: `${W}px`, height: `${H}px` });
    });
    svg.setAttribute("width", 3 * W);
    svg.setAttribute("height", 3 * H);
    svg.setAttribute("viewBox", `0 0 ${3 * W} ${3 * H}`);
    const wb = world.getBoundingClientRect();
    const pts = steps.map((s) => {
      const r = s.querySelector(".node").getBoundingClientRect();
      return [r.left + r.width / 2 - wb.left, r.top + r.height / 2 - wb.top];
    });
    for (let i = 0; i < GRID.length - 1; i++) {
      const down = GRID[i][0] === GRID[i + 1][0];
      const d = segmentPath(pts[i], pts[i + 1], down, GRID[i][1] * H);
      svgPath("track", d);
      const ink = svgPath("ink", d);
      const len = ink.getTotalLength();
      ink.style.strokeDasharray = `${len}`;
      ink.style.strokeDashoffset = `${len}`;
      segs.push({ ink, len });
    }
    update();
  };

  const setCurrent = (current) => {
    steps.forEach((s, k) => {
      s.classList.toggle("is-current", k === current);
      s.classList.toggle("is-active", k <= current);
    });
    dots.forEach((d, k) => d.classList.toggle("is-active", k === current));
  };

  const update = () => {
    if (!stair) {
      // Normal akış: ekranın ortasını geçen son adım etkin sayılır.
      let current = -1;
      steps.forEach((s, k) => {
        if (s.getBoundingClientRect().top < window.innerHeight * 0.6) current = k;
      });
      setCurrent(current);
      return;
    }
    const y = -journey.getBoundingClientRect().top;
    const raw = Math.max(0, Math.min(GRID.length - 1, y / SEG));
    const i = Math.min(GRID.length - 2, Math.floor(raw));
    const t = raw - i;
    const m = raw >= GRID.length - 1 ? 1 : ease(Math.max(0, (t - HOLD) / (1 - HOLD)));
    const [c1, r1] = GRID[i];
    const [c2, r2] = GRID[i + 1];
    world.style.transform = `translate3d(${-(c1 + (c2 - c1) * m) * W}px, ${-(r1 + (r2 - r1) * m) * H}px, 0)`;
    segs.forEach((sg, k) => {
      const f = k < i ? 1 : k === i ? m : 0;
      sg.ink.style.strokeDashoffset = `${sg.len * (1 - f)}`;
    });
    setCurrent(m > 0.5 ? i + 1 : i);
  };

  // Adım bağlantıları (sağdaki göstergeler, "Yolculuğu keşfet") merdivende doğru durağa götürür.
  const scrollToStep = (k) => {
    const behavior = reduceMotion ? "auto" : "smooth";
    if (!stair) return steps[k].scrollIntoView({ behavior, block: "center" });
    const top = journey.getBoundingClientRect().top + window.scrollY + k * SEG;
    window.scrollTo({ top, behavior });
  };
  document.querySelectorAll('a[href^="#adim-"]').forEach((a) =>
    a.addEventListener("click", (e) => {
      const k = steps.findIndex((s) => `#${s.id}` === a.getAttribute("href"));
      if (k < 0) return;
      e.preventDefault();
      scrollToStep(k);
    })
  );

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", layout);
  window.addEventListener("load", layout);
  if (document.fonts) document.fonts.ready.then(layout);
  layout();

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
