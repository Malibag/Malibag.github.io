/* Rüya Kâtibi — lamba girişi. Sayfa karanlık açılır; gece havası; görselde kadının yüzüne hafif ay ışığı düşer, ay seçilir.
   Yüzün ekrandaki yeri görselin object-fit: cover hesabından bulunur. İpe basınca ip aşağı inip geri
   döner ve sayfa aydınlanır (tek yönlü). Geçişleri lamba.css yönetir. */
(() => {
  "use strict";
  const root = document.documentElement;
  const img = document.querySelector(".hero-art img");
  const cord = document.getElementById("lamba-ipi");
  const hint = document.querySelector(".pull-hint");
  if (!img || !cord) { root.classList.remove("is-dark"); return; }

  // Görselde yüzün yeri ve ışık çapı (1254×1254 görselin oranı olarak).
  const FACE = { x: 0.435, y: 0.37, r: 0.12 };
  const MOON = { x: 0.285, y: 0.17, r: 0.09 };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  // Karanlıkta arkadaki bağlantılar klavyeyle de seçilemesin.
  const behind = [...document.querySelectorAll(".hero, .step-dots, main, .facts, .footer")];

  // Konumlar SAYFA koordinatıdır (katmanlar sayfanın en üstüne bağlı); genişlik kaydırma çubuğu
  // hariç alınır, böylece ip çekilince ya da kaydırınca yüzdeki ışık kaymaz.
  const place = () => {
    const box = img.getBoundingClientRect();
    const vw = root.clientWidth;
    const nw = img.naturalWidth || 1254;
    const nh = img.naturalHeight || 1254;
    const scale = Math.max(box.width / nw, box.height / nh); // object-fit: cover
    const [px, py] = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
    const w = nw * scale;
    const h = nh * scale;
    const left = box.left + scrollX + (box.width - w) * px;
    const top = box.top + scrollY + (box.height - h) * py;
    const fx = left + w * FACE.x;
    const fy = top + h * FACE.y;
    const r = w * FACE.r;
    root.style.setProperty("--fx", `${fx}px`);
    root.style.setProperty("--fy", `${fy}px`);
    root.style.setProperty("--r", `${r}px`);
    root.style.setProperty("--mx", `${left + w * MOON.x}px`);
    root.style.setProperty("--my", `${top + h * MOON.y}px`);
    root.style.setProperty("--mr", `${w * MOON.r}px`);
    // İp yüzün sağında, yüz hizasına kadar sarkar.
    const cx = Math.min(vw - 36, fx + Math.max(120, r * 1.4));
    root.style.setProperty("--cx", `${cx}px`);
    root.style.setProperty("--len", `${Math.max(140, fy)}px`);
    // Yazı ipin altında ortalanır ama ekrandan taşmaz.
    const half = (hint?.offsetWidth ?? 0) / 2 + 12;
    root.style.setProperty("--hx", `${Math.max(half, Math.min(cx, vw - half))}px`);
    // Karanlık bütün sayfayı kaplasın; önce sıfırlanır ki eski yükseklik ölçümü şişirmesin.
    root.style.setProperty("--doc-h", "0px");
    root.style.setProperty("--doc-h", `${root.scrollHeight}px`);
  };

  const setDark = (dark) => behind.forEach((el) => { el.inert = dark; });

  const lightUp = () => {
    if (root.classList.contains("is-lit")) return;
    if (!reduceMotion.matches) {
      cord.animate(
        [
          { transform: "translate(-50%, 0)" },
          { transform: "translate(-50%, 16px)", offset: 0.4, easing: "cubic-bezier(.3, 0, .6, 1)" },
          { transform: "translate(-50%, -4px)", offset: 0.75 },
          { transform: "translate(-50%, 0)" },
        ],
        { duration: 300, easing: "ease-out" }
      );
    }
    cord.setAttribute("aria-pressed", "true");
    cord.setAttribute("aria-label", root.lang === "en" ? "Light on" : "Işık açık");
    root.classList.add("is-lit");
    root.classList.remove("is-dark");
    setDark(false);
  };

  // Sayfa her zaman en üstten, karanlıkta açılır.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  scrollTo(0, 0);
  setDark(true);
  place();
  img.addEventListener("load", place);
  addEventListener("resize", place);
  // Yazı tipleri ya da görseller yüklenip sayfa uzayınca karanlık ve ışık yeniden hizalansın.
  if ("ResizeObserver" in window) new ResizeObserver(place).observe(document.body);
  cord.addEventListener("click", lightUp);
})();
