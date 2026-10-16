/* İngilizce Kelime Kartları sayfası.
   1. Başlıktaki kelimeler kart gibi döner (üstüne gelince / dokununca); açılışta bir kez kendiliğinden döner.
   2. 5 kartlık deste: karta dokununca anlamı görünür; biliyorsanız sağa, bilmiyorsanız sola kaydırılır
      (ya da düğmeler / ok tuşları). Sonunda skor çıkar. Kelimeler uygulamanın kendi verisinden alındı. */
(() => {
  "use strict";
  const root = document.documentElement;
  const en = root.lang === "en";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. Başlık kartları. İngilizce görünümde ön ve arka yüz yer değiştirir.
  const words = [...document.querySelectorAll(".flip-word")];
  words.forEach((word) => {
    if (en) {
      const front = word.querySelector(".fw-front");
      const back = word.querySelector(".fw-back");
      [front.textContent, back.textContent] = [back.textContent, front.textContent];
    }
    word.addEventListener("click", () => word.classList.toggle("is-flipped"));
  });
  if (!reduceMotion && words.length) {
    words.forEach((word, i) => setTimeout(() => word.classList.add("is-flipped"), 900 + i * 300));
    words.forEach((word, i) => setTimeout(() => word.classList.remove("is-flipped"), 3100 + i * 300));
  }

  // 2. Deste. [kelime, seviye, tür, anlam, örnek (EN), örnek (TR)]
  const POOL = [
    ["journey", "A2", "n", "yolculuk", "The journey to the coast takes two hours.", "Sahile yolculuk iki saat sürüyor."],
    ["brave", "A2", "adj", "cesur", "The firefighter is brave.", "İtfaiyeci cesur."],
    ["passenger", "A2", "n", "yolcu", "Each passenger needs a valid ticket.", "Her yolcunun geçerli bir bilete ihtiyacı var."],
    ["helpful", "A2", "adj", "yardımsever", "My neighbor is always helpful.", "Komşum her zaman yardımsever."],
    ["medal", "A2", "n", "madalya", "He won a gold medal at the games.", "Oyunlarda altın bir madalya kazandı."],
    ["disappear", "A2", "v", "kaybolmak", "The sun disappears at night.", "Güneş geceleri kaybolur."],
    ["curious", "B1", "adj", "meraklı", "The children were curious about the old house.", "Çocuklar eski ev hakkında meraklıydı."],
    ["habit", "B1", "n", "alışkanlık", "Reading before bed is a good habit.", "Yatmadan önce okumak iyi bir alışkanlıktır."],
    ["nightmare", "B1", "n", "kabus", "The traffic today was a real nightmare.", "Bugünkü trafik gerçek bir kabustu."],
    ["solution", "B1", "n", "çözüm", "We need to find a solution to this problem.", "Bu soruna bir çözüm bulmamız gerekiyor."],
    ["impressive", "B1", "adj", "etkileyici", "Her performance was really impressive.", "Performansı gerçekten etkileyiciydi."],
    ["opponent", "B1", "n", "rakip", "She easily beat her opponent in the final.", "Finalde rakibini kolayca yendi."],
    ["achievement", "B1", "n", "başarı", "Winning the award was a great achievement.", "Ödülü kazanmak büyük bir başarıydı."],
    ["versatile", "B1", "adj", "çok yönlü", "She is a versatile actress.", "Çok yönlü bir aktris."],
    ["solidarity", "B2", "n", "dayanışma", "Workers showed solidarity during the strike.", "İşçiler grev sırasında dayanışma gösterdi."],
    ["indispensable", "B2", "adj", "vazgeçilmez", "Her experience makes her indispensable to the team.", "Deneyimi onu takım için vazgeçilmez kılıyor."],
    ["scapegoat", "B2", "n", "günah keçisi", "He was made the scapegoat for the team's loss.", "Takımın kaybı için günah keçisi ilan edildi."],
    ["pungent", "B2", "adj", "keskin (koku/tat)", "The pungent smell of garlic filled the kitchen.", "Sarımsağın keskin kokusu mutfağı doldurdu."],
    ["prerequisite", "B2", "n", "ön koşul", "A degree is a prerequisite for this position.", "Bu pozisyon için diploma bir ön koşuldur."],
    ["turnout", "B2", "n", "katılım oranı", "Voter turnout was high this year.", "Bu yıl seçmen katılım oranı yüksekti."],
  ];
  const L = en
    ? { tap: "Tap to see the meaning", n: "noun", adj: "adjective", v: "verb" }
    : { tap: "Anlamı için dokunun", n: "isim", adj: "sıfat", v: "fiil" };
  const PLAN = ["A2", "A2", "B1", "B1", "B2"]; // kolaydan zora

  const game = document.querySelector(".word-game");
  if (!game) return;
  const deck = game.querySelector(".deck");
  const actions = game.querySelector(".game-actions");
  const result = game.querySelector(".game-result");
  const countEl = game.querySelector(".g-i");
  const used = new Set();
  let cards = [];
  let current = 0;
  let known = 0;

  const pickRound = () => PLAN.map((level) => {
    let options = POOL.filter((w) => w[1] === level && !used.has(w[0]));
    if (!options.length) {
      POOL.filter((w) => w[1] === level).forEach((w) => used.delete(w[0]));
      options = POOL.filter((w) => w[1] === level && !used.has(w[0]));
    }
    const word = options[Math.floor(Math.random() * options.length)];
    used.add(word[0]);
    return word;
  });

  const makeCard = ([word, level, pos, meaning, exEn, exTr]) => {
    const card = document.createElement("div");
    card.className = "wcard";
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${word} — ${L.tap}`);
    card.innerHTML =
      `<div class="wc-face"><span class="wc-level">${level}</span><span class="wc-word" lang="en">${word}</span>` +
      `<span class="wc-pos">${L[pos]}</span><span class="wc-tap">${L.tap}</span></div>` +
      `<div class="wc-back"><span class="wc-meaning">${meaning}</span><p class="wc-ex" lang="en">${exEn}</p><p class="wc-ex-tr">${exTr}</p></div>`;
    return card;
  };

  const layout = () => {
    cards.forEach((card, i) => {
      const d = i - current;
      card.classList.toggle("is-top", d === 0);
      card.classList.toggle("is-next", d === 1);
      card.classList.toggle("is-after", d === 2);
      card.classList.toggle("is-hidden", d > 2);
      card.tabIndex = d === 0 ? 0 : -1;
    });
    countEl.textContent = Math.min(current + 1, cards.length);
  };

  const start = () => {
    deck.textContent = "";
    cards = pickRound().map(makeCard);
    [...cards].reverse().forEach((card) => deck.append(card)); // ilk kart en üstte
    current = 0;
    known = 0;
    deck.hidden = false;
    actions.hidden = false;
    result.hidden = true;
    layout();
  };

  const decide = (isKnown) => {
    const top = cards[current];
    if (!top) return;
    top.classList.remove("is-top", "lean-yes", "lean-no");
    top.classList.add(isKnown ? "is-out-right" : "is-out-left");
    if (isKnown) known += 1;
    current += 1;
    if (current < cards.length) {
      layout();
      if (deck.contains(document.activeElement)) cards[current].focus({ preventScroll: true });
      return;
    }
    setTimeout(() => {
      deck.hidden = true;
      actions.hidden = true;
      result.querySelector(".g-known").textContent = known;
      result.hidden = false;
    }, reduceMotion ? 0 : 380);
  };

  // Sürükleme: kısa dokunuş kartı çevirir, 90 px'ten uzun sürükleme karar verir.
  let drag = null;
  deck.addEventListener("pointerdown", (e) => {
    const top = cards[current];
    if (!top || !top.contains(e.target)) return;
    drag = { card: top, x: e.clientX, dx: 0, moved: false };
    top.setPointerCapture(e.pointerId);
    top.classList.add("is-dragging");
  });
  deck.addEventListener("pointermove", (e) => {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    if (Math.abs(drag.dx) > 6) drag.moved = true;
    drag.card.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 18}deg)`;
    drag.card.classList.toggle("lean-yes", drag.dx > 40);
    drag.card.classList.toggle("lean-no", drag.dx < -40);
  });
  const endDrag = () => {
    if (!drag) return;
    const { card, dx, moved } = drag;
    drag = null;
    card.classList.remove("is-dragging");
    card.style.transform = "";
    if (Math.abs(dx) > 90) decide(dx > 0);
    else {
      card.classList.remove("lean-yes", "lean-no");
      if (!moved) card.classList.toggle("is-flipped");
    }
  };
  deck.addEventListener("pointerup", endDrag);
  deck.addEventListener("pointercancel", endDrag);
  deck.addEventListener("keydown", (e) => {
    const top = cards[current];
    if (!top || e.target !== top) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); top.classList.toggle("is-flipped"); }
    if (e.key === "ArrowRight") decide(true);
    if (e.key === "ArrowLeft") decide(false);
  });
  game.querySelector(".g-btn.yes").addEventListener("click", () => decide(true));
  game.querySelector(".g-btn.no").addEventListener("click", () => decide(false));
  game.querySelector(".g-again").addEventListener("click", start);
  start();
})();
