/* Vaultify sayfası: "Dağınık masa → düzenli klasörler". "Düzenle" (ya da bölüm ekrana gelince bir kez
   kendiliğinden) belgeleri sırayla data-folder'daki klasöre uçurur, klasör sayacı artar; en sonda Araç
   klasörünün zili sallanır ve hatırlatıcı bildirimi düşer. "Yeniden dağıt" masayı eski hâline getirir. */
(() => {
  "use strict";
  const demo = document.querySelector(".desk-demo");
  if (!demo) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const docs = [...demo.querySelectorAll(".dd-doc")];
  const folders = Object.fromEntries([...demo.querySelectorAll(".dd-folder")].map((f) => [f.dataset.folder, f]));
  const toast = demo.querySelector(".dd-toast");
  const goBtn = demo.querySelector(".dd-go");
  const resetBtn = demo.querySelector(".dd-reset");
  let state = "messy"; // messy → busy → done
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, reduceMotion ? 0 : ms));

  const organize = () => {
    if (state !== "messy") return;
    state = "busy";
    goBtn.disabled = true;
    docs.forEach((doc, i) => later(() => {
      const folder = folders[doc.dataset.folder];
      const a = doc.getBoundingClientRect();
      const b = folder.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      doc.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg) scale(.25)`;
      later(() => {
        doc.style.opacity = "0";
        const count = folder.querySelector("b");
        count.textContent = Number(count.textContent) + 1;
        folder.classList.add("is-pulse");
        later(() => folder.classList.remove("is-pulse"), 300);
      }, 800);
    }, i * 260));
    const end = docs.length * 260 + 1100;
    later(() => folders.arac.classList.add("is-ringing"), end);
    later(() => {
      toast.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("is-in")));
      state = "done";
      goBtn.hidden = true;
      goBtn.disabled = false;
      resetBtn.hidden = false;
    }, end + 500);
  };

  const scatter = () => {
    timers.forEach(clearTimeout);
    timers = [];
    docs.forEach((doc) => { doc.style.transform = ""; doc.style.opacity = ""; });
    Object.values(folders).forEach((f) => {
      f.querySelector("b").textContent = "0";
      f.classList.remove("is-ringing", "is-pulse");
    });
    toast.classList.remove("is-in");
    toast.hidden = true;
    state = "messy";
    resetBtn.hidden = true;
    goBtn.hidden = false;
  };

  goBtn.addEventListener("click", organize);
  resetBtn.addEventListener("click", scatter);

  // Bölüm ekrana gelince bir kez kendiliğinden düzenlenir.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      setTimeout(organize, reduceMotion ? 0 : 900);
    }, { threshold: 0.5 });
    io.observe(demo.querySelector(".dd-stage"));
  }
})();
