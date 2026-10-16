/* KPSS Tarih Notları sayfası.
   1. Yıl çarkı: bir yıl seçilince büyük yıl sayarak döner, uygulamadaki iki kart deftere harf harf yazılır.
      Bölüm ekrana ilk geldiğinde 1453 kendiliğinden yazılır.
   2. Günün sorusu: kart bilgilerinden kurulmuş 5 sorudan biri, güne göre seçilir.
   Metinler uygulamanın kartlarından birebir alındı (kpss_tarih_tum_kartlar.json). */
(() => {
  "use strict";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // [yıl, konu, yıl kartı, hap bilgi]
  const YEARS = [
    [552, "İslamiyet Öncesi Türk Tarihi", "I. Kök Türk Devleti 552 yılında Bumin Kağan tarafından kurulmuştur.", "Bumin Kağan, Avar egemenliğine son vererek bağımsızlığını kazanmıştır."],
    [751, "İlk Türk-İslam Devletleri", "Talas Savaşı 751 yılında Abbasiler ile Çin arasında yapılmıştır.", "Talas Savaşı sonrasında Türklerin İslamiyet'i kabulü hızlanmıştır."],
    [1071, "İlk Türk-İslam Devletleri", "Malazgirt Savaşı 1071 yılında Büyük Selçuklular ile Bizans arasında yapılmıştır.", "Malazgirt Zaferi, Anadolu'nun kapılarını Türklere açmıştır."],
    [1299, "Osmanlı Kuruluş Dönemi", "Osmanlı Beyliği'nin kuruluş tarihi geleneksel olarak 1299 kabul edilir.", "Osmanlı Beyliği'nin ilk merkezi Söğüt'tür."],
    [1453, "Osmanlı Yükselme Dönemi", "İstanbul 29 Mayıs 1453'te fethedilmiştir.", "İstanbul'un fethi Bizans İmparatorluğu'na son vermiştir."],
    [1517, "Osmanlı Yükselme Dönemi", "Ridaniye Savaşı 1517 yılında Memlüklerle yapılmıştır.", "Ridaniye Zaferi ile Memlük Devleti yıkılmıştır."],
    [1699, "XVII. Yüzyıl (Duraklama)", "Karlofça Antlaşması 1699 yılında imzalanmıştır.", "Karlofça Antlaşması Osmanlı'nın ilk büyük toprak kaybı antlaşmasıdır."],
    [1839, "XIX. Yüzyıl (Dağılma)", "Tanzimat Fermanı 3 Kasım 1839'da ilan edilmiştir.", "Tanzimat Fermanı Gülhane Parkı'nda okunmuştur."],
    [1876, "XIX. Yüzyıl (Dağılma)", "I. Meşrutiyet 23 Aralık 1876'da ilan edilmiştir.", "I. Meşrutiyet ile halk ilk kez yönetime temsilcileri aracılığıyla katılmıştır."],
    [1919, "Kurtuluş Savaşı Hazırlık Dönemi", "Mustafa Kemal 19 Mayıs 1919'da Samsun'a çıkmıştır.", "19 Mayıs 1919 Milli Mücadele'nin fiilen başladığı tarih kabul edilir."],
    [1920, "Kurtuluş Savaşı Hazırlık Dönemi", "Türkiye Büyük Millet Meclisi 23 Nisan 1920'de Ankara'da açılmıştır.", "Mustafa Kemal 23 Nisan 1920'de açılan TBMM'nin ilk başkanı seçilmiştir."],
    [1923, "Atatürk İnkılapları", "Cumhuriyet 29 Ekim 1923'te ilan edilmiştir.", "İsmet İnönü Türkiye Cumhuriyeti'nin ilk başbakanı olmuştur."],
  ];
  const START = 4; // 1453

  const wheel = document.querySelector(".year-wheel");
  if (wheel) {
    const strip = wheel.querySelector(".tn-strip");
    const yearEl = wheel.querySelector(".yw-year");
    const topicEl = wheel.querySelector(".nb-topic");
    const mainEl = wheel.querySelector(".nb-main");
    const hapEl = wheel.querySelector(".nb-hap");
    const srEl = wheel.querySelector(".yw-sr");
    const prev = wheel.querySelector(".tn-step.prev");
    const next = wheel.querySelector(".tn-step.next");
    const buttons = YEARS.map(([year], i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tn-year";
      b.textContent = year;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => select(i));
      strip.append(b);
      return b;
    });
    let current = -1;
    let token = 0;

    // Büyük yıl, eski yıldan yenisine sayarak döner.
    const countTo = (from, to, my) => {
      if (reduceMotion || from === to) { yearEl.textContent = to; return; }
      const t0 = performance.now();
      const step = (now) => {
        if (my !== token) return;
        const p = Math.min(1, (now - t0) / 600);
        const e = 1 - (1 - p) ** 3;
        yearEl.textContent = Math.round(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    // Defter: harf harf, imleçle.
    const write = async (el, text, my) => {
      if (reduceMotion) { el.textContent = text; return true; }
      const caret = document.createElement("span");
      caret.className = "nb-caret";
      for (let i = 1; i <= text.length; i++) {
        if (my !== token) return false;
        el.textContent = text.slice(0, i);
        el.append(caret);
        await sleep(text[i - 1] === " " ? 10 : 22);
      }
      caret.remove();
      return true;
    };

    async function select(i) {
      if (i < 0 || i >= YEARS.length || i === current) return;
      const my = ++token;
      const [year, topic, main, hap] = YEARS[i];
      const from = current < 0 ? YEARS[0][0] : YEARS[current][0];
      current = i;
      buttons.forEach((b, j) => b.setAttribute("aria-pressed", j === i ? "true" : "false"));
      buttons[i].scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
      prev.disabled = i === 0;
      next.disabled = i === YEARS.length - 1;
      srEl.textContent = `${year}. ${main} ${hap}`;
      countTo(from, year, my);
      topicEl.textContent = topic;
      mainEl.textContent = "";
      hapEl.textContent = "";
      if (await write(mainEl, main, my)) await write(hapEl, hap, my);
    }

    prev.addEventListener("click", () => select(current - 1));
    next.addEventListener("click", () => select(current + 1));
    strip.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      select(current + (e.key === "ArrowRight" ? 1 : -1));
      buttons[current].focus({ preventScroll: true });
    });

    // Bölüm görünene kadar bekle; sonra çark ilk yıldan 1453'e dönsün ve yazılsın.
    yearEl.textContent = YEARS[0][0];
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        select(START);
      }, { threshold: 0.35 });
      io.observe(wheel);
    } else {
      select(START);
    }
  }

  // [soru, şıklar, doğru şık sırası, açıklama]
  const QUESTIONS = [
    ["Osmanlı Devleti'nin ilk anayasası hangisidir?", ["Tanzimat Fermanı", "Kanun-i Esasi", "Islahat Fermanı", "Sened-i İttifak"], 1,
      "Kanun-i Esasi Osmanlı Devleti'nin ilk anayasasıdır. Kanun-i Esasi 1876 yılında yürürlüğe girmiştir."],
    ["Malazgirt Savaşı'nda Büyük Selçuklu ordusuna kim komuta etmiştir?", ["Tuğrul Bey", "Melikşah", "Alp Arslan", "Çağrı Bey"], 2,
      "Malazgirt Savaşı'nda Büyük Selçuklu ordusuna Alp Arslan komuta etmiştir. Malazgirt Zaferi, Anadolu'nun kapılarını Türklere açmıştır."],
    ["Osmanlı Beyliği'nin ilk merkezi neresidir?", ["Söğüt", "Bursa", "İznik", "Edirne"], 0,
      "Osmanlı Beyliği'nin ilk merkezi Söğüt'tür."],
    ["Osmanlı'nın ilk büyük toprak kaybı antlaşması hangisidir?", ["Pasarofça", "Küçük Kaynarca", "Zitvatorok", "Karlofça"], 3,
      "Karlofça Antlaşması Osmanlı'nın ilk büyük toprak kaybı antlaşmasıdır. Karlofça Antlaşması 1699 yılında imzalanmıştır."],
    ["Tanzimat Fermanı nerede okunmuştur?", ["Topkapı Sarayı", "Gülhane Parkı", "Dolmabahçe Sarayı", "Ayasofya"], 1,
      "Tanzimat Fermanı Gülhane Parkı'nda okunmuştur. Tanzimat Fermanı Mustafa Reşit Paşa tarafından okunmuştur."],
  ];
  const card = document.querySelector(".dq-card");
  if (!card) return;
  const [text, options, answer, explanation] = QUESTIONS[Math.floor(Date.now() / 86400000) % QUESTIONS.length];
  card.querySelector(".dq-text").textContent = text;
  card.querySelector(".dq-right").textContent = options[answer];
  card.querySelector(".dq-exp").textContent = explanation;
  const box = card.querySelector(".dq-options");
  const buttons = options.map((label, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", () => {
      const right = i === answer;
      card.classList.add(right ? "is-right" : "is-missed");
      b.classList.add(right ? "is-correct" : "is-wrong");
      buttons[answer].classList.add("is-correct");
      buttons.forEach((x) => { x.disabled = true; });
      card.querySelector(".dq-note").hidden = false;
    });
    box.append(b);
    return b;
  });
})();
