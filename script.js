(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1) Scroll-reveal — [data-reveal] elemanları görünüme girince aç, bir kez */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 90}ms`;
      io.observe(el);
    });
  }

  /* 2) Kart kataloğu rayı — aktif sahneyi işaretle (scrollspy) */
  const railLinks = document.querySelectorAll(".catalog-rail a");
  const scenes = document.querySelectorAll("[data-scene]");
  if (railLinks.length && scenes.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const link = document.querySelector(`.catalog-rail a[href="#${entry.target.id}"]`);
          if (!link) return;
          railLinks.forEach((l) => l.classList.remove("is-active"));
          link.classList.add("is-active");
        });
      },
      { threshold: 0, rootMargin: "-45% 0px -45% 0px" }
    );
    scenes.forEach((s) => spy.observe(s));
  }

  /* 3) Sahne rayı — gövde (body) arka planı, HER uygulama sahnesi arasında
        sürekli akan tek bir renk rayı üzerinde scroll'a bağlı geçiş yapar.
        Her sahnenin KENDİ rengi vardır ve kendi boyunca sabit kalır (giriş ve
        çıkış durakları aynı renkte olduğu için erken/geç sızma olmaz); geçiş
        yalnızca iki sahne arasındaki bandın kendi yüksekliğinde gerçekleşir.
        Aynı geçiş bantları, yıldız dokusunu ve şiirsel satırı da yerel
        ilerlemeyle görünür kılar. Hareket azaltma tercih edilirse ray devre
        dışı kalır, sahneler zaten kendi opak zeminlerini taşıdığı için
        görsel bir sorun oluşmaz. */
  /* Hareket azaltma tercih edilirse bant metnini ZORLA görünür kılmıyoruz:
     bandın kendi arka planı yoktur (gövde rengi geçişi devre dışı kalınca
     kağıt rengi kalır), bu yüzden açık renkli metni orada göstermek okunaksız
     olurdu. Şiirsel satır dekoratif olduğundan (aria-hidden), sessizce
     gizli kalması tercih edildi — asıl içerik zaten her sahnenin kendi
     başlığında değişmeden duruyor. */
  const transitions = document.querySelectorAll(".scene-transition");

  /* Sıra: Ayet → İngilizce → KPSS → Ehliyet → Rüya Kâtibi. İlk dördü artık kendi
     marka renginin açık tonu (tek dramatik gündüz→gece anı yalnızca Ehliyet'ten
     Rüya'ya geçişte yaşanır). Renkler style.css'teki --scene-bg değerleriyle
     birebir eşleşir. */
  const SCENES = [
    { id: "ayet-kartlari", rgb: [121, 180, 148] },
    { id: "ingilizce-kelime-kartlari", rgb: [149, 168, 230] },
    { id: "kpss-tarih-notlari", rgb: [227, 188, 118] },
    { id: "ehliyet-sinavi-2026", rgb: [240, 163, 126] },
    { id: "ruya-katibi", rgb: [18, 17, 28] },
  ];
  const PAPER = [239, 234, 224];
  const lerp = (a, b, t) => a + (b - a) * t;

  const heroEl = document.querySelector(".hero");
  const studioEl = document.getElementById("hakkimda");
  const stops = [];
  if (heroEl) stops.push({ el: heroEl, edge: "center", rgb: PAPER });
  SCENES.forEach((scene) => {
    const el = document.getElementById(scene.id);
    if (!el) return;
    stops.push({ el, edge: "top", rgb: scene.rgb });
    stops.push({ el, edge: "bottom", rgb: scene.rgb });
  });
  if (studioEl) stops.push({ el: studioEl, edge: "top", rgb: PAPER });

  if (stops.length > 1 && !reduceMotion) {
    let ticking = false;
    const update = () => {
      const viewportY = window.scrollY + window.innerHeight / 2;
      const positions = stops.map((s) => {
        const rect = s.el.getBoundingClientRect();
        const offset = s.edge === "top" ? 0 : s.edge === "bottom" ? rect.height : rect.height / 2;
        return window.scrollY + rect.top + offset;
      });

      let rgb = stops[0].rgb;
      if (viewportY <= positions[0]) {
        rgb = stops[0].rgb;
      } else if (viewportY >= positions[positions.length - 1]) {
        rgb = stops[stops.length - 1].rgb;
      } else {
        for (let i = 0; i < stops.length - 1; i++) {
          if (viewportY >= positions[i] && viewportY <= positions[i + 1]) {
            const span = positions[i + 1] - positions[i];
            const t = span > 0 ? (viewportY - positions[i]) / span : 0;
            rgb = [0, 1, 2].map((c) => Math.round(lerp(stops[i].rgb[c], stops[i + 1].rgb[c], t)));
            break;
          }
        }
      }
      document.body.style.setProperty("--scene-bg", `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);

      /* Bandın viewport'tan k��sa ya da uzun olmasından bağımsız çalışan
         genel ilerleme: 0 = bant viewport altından yeni giriyor,
         1 = bant viewport üstünden tamamen çıktı. Eski formül yalnızca bant
         viewport'tan UZUN olduğunda (total>0) anlamlıydı; bant kısaltılınca
         (70vh<100vh) payda hep negatif kalıp ilerleme sıfırda kilitleniyordu
         ve metin hiç görünmüyordu. */
      transitions.forEach((t) => {
        const rect = t.getBoundingClientRect();
        const vh = window.innerHeight;
        let p = (vh - rect.top) / (vh + rect.height);
        p = Math.min(1, Math.max(0, p));
        const textP = Math.min(1, Math.max(0, (p - 0.25) / 0.35));
        t.style.setProperty("--tw-star-p", p.toFixed(3));
        t.style.setProperty("--tw-text-p", textP.toFixed(3));
      });
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* 3b) Karşılama anı — hero başlığındaki vurgu kelimesi sayfa yüklenince bir kez,
         harf harf ışıklanarak açılır, küçük bir nokta işaretçisi harfleri takip eder.
         Sonunda normal İtalik aksan rengine yerleşir. Yalnızca bir kez oynar. */
  const spotlightWord = document.getElementById("spotlight-word");
  if (spotlightWord && !reduceMotion) {
    const text = spotlightWord.textContent;
    spotlightWord.textContent = "";
    const dot = document.createElement("span");
    dot.className = "spotlight-dot";
    dot.setAttribute("aria-hidden", "true");

    const letters = [...text].map((ch) => {
      const span = document.createElement("span");
      span.className = "lt";
      span.textContent = ch;
      spotlightWord.appendChild(span);
      return span;
    });
    spotlightWord.appendChild(dot);

    let i = 0;
    const step = () => {
      if (i > 0) letters[i - 1].classList.remove("is-lit");
      if (i >= letters.length) {
        dot.classList.remove("is-active");
        return;
      }
      const current = letters[i];
      if (current.textContent.trim() !== "") {
        current.classList.add("is-lit");
        dot.classList.add("is-active");
        const wordRect = spotlightWord.getBoundingClientRect();
        const r = current.getBoundingClientRect();
        dot.style.left = `${r.left - wordRect.left + r.width / 2 - 3}px`;
        dot.style.top = `${r.top - wordRect.top - 8}px`;
      }
      i++;
      setTimeout(step, 90);
    };
    setTimeout(step, 850);
  }

  /* DENEME 1) Kağıt uçak — iz BIRAKMAZ. Sayfa boyunca kıvrılarak iner, metnin
     bazen önünden bazen arkasından geçer; "Hakkımda" bölümündeki e-posta
     satırına ulaşınca tam üzerine konar ve orada sabit kalır (bir daha
     hareket etmez). Pozisyon JS ile eğri üzerinde hesaplanıp transform ile
     uygulanıyor. */
  const plane = document.getElementById("paper-plane");
  const landingTarget = document.querySelector(".contact-list a");
  if (plane && landingTarget && !reduceMotion && window.innerWidth > 900) {
    let segments = [];
    let scrollRange = 1;
    const PLANE_HALF = 25; // .paper-plane genişliği 50px

    const buildSegments = (width, endX, endY) => {
      // Az sayıda, uzun mesafeli dönüş (yavaş his) + her dönüşte rastgele
      // menzil: bazen tam kenara, bazen sadece ortaya yakın bir yere gider —
      // hep aynı "en sağ / en sol" tekrarı olmasın diye.
      const marginX = Math.max(48, width * 0.07);
      const edgeRight = width - marginX;
      const edgeLeft = marginX;
      const center = width / 2;
      const segCount = Math.max(2, Math.round(endY / 1800));
      const points = [[edgeRight, 60]];
      let onRight = true;
      for (let i = 1; i <= segCount; i++) {
        onRight = !onRight;
        const isLast = i === segCount;
        const y = isLast ? endY : 60 + ((endY - 60) * i) / segCount;
        const reach = 0.35 + Math.random() * 0.65;
        const x = isLast ? endX : onRight ? center + (edgeRight - center) * reach : center - (center - edgeLeft) * reach;
        points.push([x, y]);
      }
      const segs = [];
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p3 = points[i];
        const midY = (p0[1] + p3[1]) / 2;
        segs.push({ p0, p1: [p0[0], midY], p2: [p3[0], midY], p3 });
      }
      return segs;
    };

    const bezierPoint = (s, t) => {
      const mt = 1 - t;
      const x = mt * mt * mt * s.p0[0] + 3 * mt * mt * t * s.p1[0] + 3 * mt * t * t * s.p2[0] + t * t * t * s.p3[0];
      const y = mt * mt * mt * s.p0[1] + 3 * mt * mt * t * s.p1[1] + 3 * mt * t * t * s.p2[1] + t * t * t * s.p3[1];
      return [x, y];
    };

    const emailEl = landingTarget.querySelector("span") || landingTarget;
    let targetX = 0;
    let targetY = 0;
    const rebuildFlight = () => {
      const width = window.innerWidth;
      const rect = emailEl.getBoundingClientRect();
      targetX = rect.left + window.scrollX + rect.width / 2;
      targetY = rect.bottom + window.scrollY + 20;
      segments = buildSegments(width, targetX, targetY);
      scrollRange = Math.max(200, targetY - window.innerHeight * 0.6);
      landed = false;
      updatePlanePosition();
    };

    let landed = false;
    let planeTicking = false;
    const updatePlanePosition = () => {
      if (!segments.length) return;
      const g = Math.min(1, Math.max(0, window.scrollY / scrollRange));

      if (g >= 1) {
        if (!landed) {
          plane.style.transform = `translate(${(targetX - PLANE_HALF).toFixed(1)}px, ${(targetY - PLANE_HALF).toFixed(1)}px) rotate(-10deg)`;
          plane.style.zIndex = "50";
          landed = true;
        }
        planeTicking = false;
        return;
      }
      landed = false;

      const raw = g * segments.length;
      const idx = Math.min(segments.length - 1, Math.floor(raw));
      const localT = Math.min(1, Math.max(0, raw - idx));
      const seg = segments[idx];
      const [x, y] = bezierPoint(seg, localT);
      const [x2, y2] = bezierPoint(seg, Math.min(1, localT + 0.02));
      const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
      plane.style.transform = `translate(${(x - PLANE_HALF).toFixed(1)}px, ${(y - PLANE_HALF).toFixed(1)}px) rotate(${(angle + 42).toFixed(1)}deg)`;
      // "3B" hissi: her segmentte önden/arkadan geçiş almaşık olsun.
      plane.style.zIndex = idx % 2 === 0 ? "50" : "2";
      planeTicking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!planeTicking) {
          requestAnimationFrame(updatePlanePosition);
          planeTicking = true;
        }
      },
      { passive: true }
    );

    rebuildFlight();
    window.addEventListener("resize", rebuildFlight);
    // Görseller yüklendikçe e-posta satırının konumu değişebilir; birkaç kez yeniden hesapla.
    setTimeout(rebuildFlight, 500);
    setTimeout(rebuildFlight, 1500);
    window.addEventListener("load", rebuildFlight);
  }

  /* DENEME 3) İmleç ışık halesi — fareyi (yalnızca ince imleçli cihazlarda) takip eder. */
  const cursorGlow = document.getElementById("cursor-glow");
  if (cursorGlow && !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let glowX = 0;
    let glowY = 0;
    let glowTicking = false;
    const updateGlow = () => {
      cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px)`;
      glowTicking = false;
    };
    window.addEventListener(
      "mousemove",
      (e) => {
        glowX = e.clientX;
        glowY = e.clientY;
        cursorGlow.classList.add("is-active");
        if (!glowTicking) {
          requestAnimationFrame(updateGlow);
          glowTicking = true;
        }
      },
      { passive: true }
    );
    document.addEventListener("mouseleave", () => cursorGlow.classList.remove("is-active"));
  }

  /* DENEME 2) Rüya Kâtibi geçişinde kayan yıldız — bandın kendisi görünüme
     girince bir kez oynar. */
  const ruyaTransition = transitions[transitions.length - 1];
  if (ruyaTransition && ruyaTransition.querySelector(".shooting-star") && !reduceMotion && "IntersectionObserver" in window) {
    const starIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ruyaTransition.classList.add("is-shooting");
            starIO.disconnect();
          }
        });
      },
      { threshold: 0.45 }
    );
    starIO.observe(ruyaTransition);
  }

  /* 4) Telefon vitrinleri — yalnızca ince imleçli (fare) cihazlarda hafif eğim */
  if (window.matchMedia("(pointer: fine)").matches && !reduceMotion) {
    document.querySelectorAll(".phone-stack .frame").forEach((frame) => {
      const stack = frame.closest(".phone-stack");
      stack.addEventListener("mousemove", (e) => {
        const r = stack.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        frame.style.setProperty("--tiltX", `${(py * -5).toFixed(2)}deg`);
        frame.style.setProperty("--tiltY", `${(px * 5).toFixed(2)}deg`);
      });
      stack.addEventListener("mouseleave", () => {
        frame.style.setProperty("--tiltX", "0deg");
        frame.style.setProperty("--tiltY", "0deg");
      });
    });
  }
})();
