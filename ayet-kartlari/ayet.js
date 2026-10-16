/* Ayet Kartları sayfası: "Günün ayeti". Bölüm görününce tezhip çerçevesi çizilir (ayet.css); ayet güne göre
   seçilir, "Bir ayet daha" ile kart yavaşça döner ve öbür yüzde sıradaki ayet görünür.
   Mealler uygulamanın kendi verisinden (Diyanet meali, assets/cards.json) birebir alındı. */
(() => {
  "use strict";
  const section = document.querySelector(".tezhip");
  if (!section) return;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // [meal, kart başlığı]
  const VERSES = [
    ["Şüphesiz güçlükle beraber bir kolaylık vardır.", "İnşirâh Suresi 5. Ayet"],
    ["Onlar, inananlar ve kalpleri Allah'ı anmakla huzura kavuşanlardır. Biliniz ki, kalpler ancak Allah'ı anmakla huzur bulur.", "Ra'd Suresi 28. Ayet"],
    ["Öyleyse yalnız beni anın ki ben de sizi anayım. Bana şükredin, sakın nankörlük etmeyin.", "Bakara Suresi 152. Ayet"],
    ["Ey iman edenler! Sabrederek ve namaz kılarak Allah'tan yardım dileyin. Şüphe yok ki Allah sabredenlerle beraberdir.", "Bakara Suresi 153. Ayet"],
    ["Rabbin seni terk etmedi, sana darılmadı da.", "Duhâ Suresi 3. Ayet"],
    ["Şüphesiz, Rabbin sana verecek ve sen de hoşnut olacaksın.", "Duhâ Suresi 5. Ayet"],
    ["De ki: \"Ey kendilerinin aleyhine aşırı giden kullarım! Allah'ın rahmetinden ümidinizi kesmeyin. Şüphesiz Allah bütün günahları affeder. Çünkü O, çok bağışlayandır, çok merhamet edendir.\"", "Zümer Suresi 53. Ayet"],
    ["Gerçek hükümdar olan Allah yücedir. Sana vahyedilmesi tamamlanmadan önce Kur'an'ı okumakta acele etme. \"Rabbim! İlmimi arttır\" de.", "Tâ-Hâ Suresi 114. Ayet"],
    ["Kullarım, beni senden sorarlarsa, (bilsinler ki), gerçekten ben (onlara çok) yakınım. Bana dua edince, dua edenin duasına cevap veririm. O halde, doğru yolu bulmaları için benim davetime uysunlar, bana iman etsinler.", "Bakara Suresi 186. Ayet"],
    ["Andolsun, insanı biz yarattık ve nefsinin ona verdiği vesveseyi de biz biliriz. Çünkü biz ona şah damarından daha yakınız.", "Kaf Suresi 16. Ayet"],
    ["Gevşemeyin, hüzünlenmeyin. Eğer (gerçekten) iman etmiş kimseler iseniz üstün olan sizlersiniz.", "Âl-i İmrân Suresi 139. Ayet"],
    ["O halde Rabbinizin hangi nimetlerini yalanlıyorsunuz?", "Rahmân Suresi 13. Ayet"],
  ];

  const card = section.querySelector(".tz-card");
  const faces = [section.querySelector(".tz-face.front"), section.querySelector(".tz-face.back")];
  const more = section.querySelector(".tz-more");
  let index = Math.floor(Date.now() / 86400000) % VERSES.length;
  let shown = 0; // görünen yüz: 0 ön, 1 arka

  const fill = (face, [meal, ref]) => {
    face.querySelector(".tz-meal").textContent = meal;
    face.querySelector(".tz-ref").textContent = ref;
  };
  fill(faces[0], VERSES[index]);
  faces[1].setAttribute("aria-hidden", "true");

  more.addEventListener("click", () => {
    index = (index + 1) % VERSES.length;
    const next = 1 - shown;
    fill(faces[next], VERSES[index]);
    faces[next].removeAttribute("aria-hidden");
    faces[shown].setAttribute("aria-hidden", "true");
    card.classList.toggle("is-turned", next === 1);
    shown = next;
    if (!reduceMotion) {
      more.disabled = true;
      setTimeout(() => { more.disabled = false; }, 1600);
    }
  });

  // Çerçeve, bölüm ekrana gelince çizilir.
  if (reduceMotion || !("IntersectionObserver" in window)) {
    section.classList.add("is-drawn");
    return;
  }
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    section.classList.add("is-drawn");
  }, { threshold: 0.4 });
  io.observe(section);
})();
