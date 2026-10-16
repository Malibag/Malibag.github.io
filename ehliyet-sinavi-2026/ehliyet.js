/* Ehliyet Sınavı 2026 sayfası. Giriş: lamba kırmızı → sarı → yeşil yanar, perde kalkar (dokunma,
   tuş ya da kaydırma bekletmeden geçer). İşaretler: dokununca levha dönüp anlamını gösterir.
   Mini test: cevap seçilince doğru/yanlış ve kısa açıklama görünür; üç soru bitince skor çıkar. */
(() => {
  "use strict";
  const root = document.documentElement;

  // 1. Giriş (yalnız <head>'deki satır .signal-on koyduysa; azaltılmış harekette hiç gösterilmez).
  const intro = document.querySelector(".signal-intro");
  if (intro && root.classList.contains("signal-on")) {
    const timers = [];
    const skipEvents = ["pointerdown", "keydown", "wheel", "touchstart"];
    let going = false;
    const go = () => {
      if (going) return;
      going = true;
      timers.forEach(clearTimeout);
      skipEvents.forEach((type) => removeEventListener(type, go));
      intro.dataset.phase = "green";
      setTimeout(() => root.classList.add("signal-go"), 350);
      setTimeout(() => root.classList.remove("signal-on", "signal-go"), 1700);
    };
    scrollTo(0, 0);
    timers.push(setTimeout(() => { intro.dataset.phase = "amber"; }, 800));
    timers.push(setTimeout(go, 1500));
    skipEvents.forEach((type) => addEventListener(type, go, { passive: true }));
  }

  // 2. Levhalar.
  document.querySelectorAll(".sign").forEach((sign) => {
    sign.addEventListener("click", () => {
      sign.setAttribute("aria-pressed", sign.getAttribute("aria-pressed") === "true" ? "false" : "true");
    });
  });

  // 3. Mini test.
  const quiz = document.querySelector(".mini-quiz");
  if (!quiz) return;
  const items = [...quiz.querySelectorAll(".q")];
  const score = quiz.querySelector(".quiz-score");
  let answered = 0;
  let correct = 0;
  items.forEach((q) => {
    const options = [...q.querySelectorAll("button[data-key]")];
    options.forEach((option) => option.addEventListener("click", () => {
      if (q.classList.contains("is-done")) return;
      const right = option.dataset.key === q.dataset.answer;
      q.classList.add("is-done", right ? "is-right" : "is-missed");
      option.classList.add(right ? "is-correct" : "is-wrong");
      q.querySelector(`button[data-key="${q.dataset.answer}"]`).classList.add("is-correct");
      options.forEach((b) => { b.disabled = true; });
      q.querySelector(".q-note").hidden = false;
      answered += 1;
      if (right) correct += 1;
      if (answered === items.length && score) {
        score.querySelector(".score-n").textContent = correct;
        score.hidden = false;
      }
    }));
  });
})();
