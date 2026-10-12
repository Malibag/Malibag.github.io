/* Rüya Kâtibi yolculuğu: adım noktalarını kıvrılan altın bir çizgiyle bağlar (bir sağa bir sola
   salınarak aşağı iner); çizgi sayfa kaydırıldıkça dolar, ulaştığı adım ve sağdaki gösterge parlar. */
(() => {
  "use strict";
  const journey = document.getElementById("journey");
  if (!journey) return;
  const svg = journey.querySelector(".journey-path");
  const track = svg.querySelector(".track");
  const ink = svg.querySelector(".ink");
  const steps = [...journey.querySelectorAll(".step")];
  const dots = [...document.querySelectorAll(".step-dots a")];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const parts = steps.map((step) => ({ art: step.querySelector(".step-art"), copy: step.querySelector(".step-copy") }));
  const heroImg = document.querySelector(".hero-art img");
  const PARALLAX = matchMedia("(max-width: 900px)").matches ? 36 : 90; // en fazla kayma (px)

  let length = 0;
  let samples = []; // [yol uzunluğu, y]: okuma çizgisinin y'sini çizilecek uzunluğa çevirir
  let nodeYs = [];

  const build = () => {
    if (getComputedStyle(svg).display === "none") return; // dar ekranda çizgi yok
    const box = journey.getBoundingClientRect();
    svg.setAttribute("width", box.width);
    svg.setAttribute("height", box.height);
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    const pts = steps.map((step) => {
      const r = step.querySelector(".node").getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    });
    const swing = Math.min(130, box.width * 0.11);
    let d = `M ${pts[0][0]} 0 L ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1];
      const [x2, y2] = pts[i];
      const dir = steps[i].classList.contains("is-flip") ? -1 : 1; // kıvrım, gelinen adımın görsel tarafına salınır (yazının üstünden geçmez)
      const dy = y2 - y1;
      d += ` C ${x1 + dir * swing} ${y1 + dy * 0.35}, ${x2 + dir * swing} ${y2 - dy * 0.35}, ${x2} ${y2}`;
    }
    track.setAttribute("d", d);
    ink.setAttribute("d", d);
    length = ink.getTotalLength();
    ink.style.strokeDasharray = `${length}`;
    samples = [];
    for (let i = 0; i <= 300; i++) {
      const l = (length * i) / 300;
      samples.push([l, ink.getPointAtLength(l).y]);
    }
    nodeYs = pts.map((p) => p[1]);
    update();
  };

  const update = () => {
    const box = journey.getBoundingClientRect();
    const head = reduceMotion ? Infinity : window.innerHeight * 0.55 - box.top;
    if (length) {
      let drawn = length;
      if (head !== Infinity) {
        const hit = samples.find((s) => s[1] >= head);
        drawn = hit ? hit[0] : length;
      }
      ink.style.strokeDashoffset = `${length - drawn}`;
    }
    let current = -1;
    steps.forEach((step, i) => {
      const r = step.getBoundingClientRect();
      const reached = nodeYs.length ? head >= nodeYs[i] - 1 : r.top < window.innerHeight * 0.55;
      step.classList.toggle("is-active", reached);
      if (r.top < window.innerHeight * 0.9) step.classList.add("is-in"); // hızlı kaydırmada da boş kalmasın
      if (r.top < window.innerHeight * 0.6) current = i;
      // Kaydırırken görsel ve yazı zıt yönlerde süzülür; yön her adımda değişir (bir aşağı, bir yukarı).
      if (!reduceMotion) {
        const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight; // -1 … 1
        const dir = i % 2 ? -1 : 1;
        parts[i].art.style.translate = `0 ${(p * PARALLAX * dir).toFixed(1)}px`;
        parts[i].copy.style.translate = `0 ${(-p * PARALLAX * 0.6 * dir).toFixed(1)}px`;
      }
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
    if (heroImg && !reduceMotion && window.scrollY < window.innerHeight * 1.2) {
      heroImg.style.translate = `0 ${(window.scrollY * 0.18).toFixed(1)}px`;
    }
  };

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
  update(); // dar ekranda build() erken döner; kayma ve görünürlük yine de ilk karede ayarlansın
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
