/* Deneme 1 — lamba girişi. İpe basınca .scene'in data-lamp-state değeri değişir; ışık ve kartın
   açılıp kapanma sırasını lamp.css'teki geçiş gecikmeleri yönetir (zamanlayıcı yok). Burada yalnızca
   ipin çekilmesi ve lamba başlığının sallanması (Web Animations API) ile erişilebilirlik durumları var. */
(() => {
  "use strict";
  const scene = document.querySelector(".scene");
  const cord = document.getElementById("lamp-cord");
  const shade = document.getElementById("lamp-shade");
  const card = document.getElementById("login-card");
  const form = document.getElementById("login-form");
  const status = document.getElementById("login-status");
  const forgot = document.getElementById("forgot-link");
  if (!scene || !cord || !card) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const LABELS = { on: "Lambayı kapat", off: "Lambayı aç" };
  // İp ~10 px aşağı iner (~90 ms), esneyerek ~160 ms'de geri döner; başlık ~3° sallanıp durur.
  const CORD_PULL = {
    keyframes: [
      { transform: "translateY(0)" },
      { transform: "translateY(10px)", offset: 0.36, easing: "cubic-bezier(0.3, 0, 0.6, 1)" },
      { transform: "translateY(-3px)", offset: 0.72 },
      { transform: "translateY(0)" },
    ],
    options: { duration: 250, easing: "ease-out" },
  };
  const SHADE_SWAY = {
    keyframes: [
      { transform: "rotate(0deg)" },
      { transform: "rotate(3deg)" },
      { transform: "rotate(-2deg)" },
      { transform: "rotate(1deg)" },
      { transform: "rotate(0deg)" },
    ],
    options: { duration: 700, easing: "ease-out" },
  };

  let cordAnim = null;
  let swayAnim = null;

  const setLamp = (on) => {
    scene.dataset.lampState = on ? "on" : "off";
    cord.setAttribute("aria-label", on ? LABELS.on : LABELS.off);
    cord.setAttribute("aria-pressed", String(on));
    card.inert = !on; // kapalıyken kart klavyeyle de erişilemez; form değerleri korunur
  };

  cord.addEventListener("click", () => {
    if (!reduceMotion.matches) {
      // Hızlı art arda basışlarda önceki hareket iptal edilip yenisi baştan başlar.
      cordAnim?.cancel();
      swayAnim?.cancel();
      cordAnim = cord.animate(CORD_PULL.keyframes, CORD_PULL.options);
      if (shade) swayAnim = shade.animate(SHADE_SWAY.keyframes, SHADE_SWAY.options);
    }
    setLamp(scene.dataset.lampState !== "on");
  });

  // Sunucu olmayan bir tasarım denemesi: form gerçek bir form gibi doğrulanır ve Enter ile gönderilir,
  // ama bilgiler hiçbir yere gönderilmez; alanlar sıfırlanmaz.
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    status.textContent = "Bu bir tasarım denemesi: bilgiler hiçbir yere gönderilmedi.";
  });
  forgot?.addEventListener("click", (e) => {
    e.preventDefault();
    status.textContent = "Deneme sayfası: parola sıfırlama bulunmuyor.";
  });

  setLamp(false);
})();
