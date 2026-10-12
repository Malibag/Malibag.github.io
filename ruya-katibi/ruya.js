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
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
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
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", build);
  window.addEventListener("load", build);
  if (document.fonts) document.fonts.ready.then(build);
})();
