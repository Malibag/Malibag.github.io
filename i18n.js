(() => {
  "use strict";

  const common = {
    "M. Ali Bağcı · Bağımsız Mobil Uygulamalar": "M. Ali Bağcı · Independent Mobile Apps",
    "İçeriğe geç": "Skip to content",
    "Ankara / Türkiye": "Ankara / Türkiye",
    "Uygulamalar": "Apps",
    "Hakkımda": "About",
    "İletişim": "Contact",
    "Ana menü": "Main navigation",
    "← Tüm uygulamalar": "← All apps",
    "Tüm uygulamalar": "All apps",
    "Google Play’de yayında": "Available on Google Play",
    "Uygulamayı incele ↗": "Explore the app ↗",
    "Uygulamayı tanı": "Explore the app",
    "Uygulamayı tanı ↗": "Explore the app ↗",
    "HEMEN": "GET IT ON",
    "APP STORE": "APP STORE",
    "Çok yakında": "Coming soon",
    "Gizlilik Politikası ↗": "Privacy Policy ↗",
    "Destek ve iletişim ↗": "Support and contact ↗",
    "Uygulama hakkında": "ABOUT THE APP",
    "Gizlilik": "Privacy",
    "Gizlilik politikası açık biçimde yayımlanır.": "The privacy policy is published openly.",
    "Android uygulamasını Google Play üzerinden indirebilirsiniz.": "You can download the Android app from Google Play.",
    "Google Play’den indir ↗": "Download on Google Play ↗",
    "İlerleme görünümü": "Progress overview",
    "Rüya Kâtibi: Rüya Tabirleri": "Rüya Kâtibi: Dream Interpretations",
    "E-posta": "Email",
    "Bağımsız mobil uygulamalar · Türkiye": "Independent mobile apps · Türkiye"
  };

  const pages = {
    "/": {
      "Öğrenme, okuma, kişisel keşif ve belge düzeni için M. Ali Bağcı tarafından geliştirilen bağımsız mobil uygulamalar: Ayet Kartları, İngilizce Kelime Kartları, Ehliyet Sınavı 2026, KPSS Tarih Notları, Rüya Kâtibi ve Vaultify.": "Independent mobile apps by M. Ali Bağcı for learning, reading, personal discovery, and document organization: Ayet Kartları, İngilizce Kelime Kartları, Ehliyet Sınavı 2026, KPSS Tarih Notları, Rüya Kâtibi, and Vaultify.",
      "Günlük hayatı kart kart öğrenilebilir kılan bağımsız mobil uygulamalar.": "Independent mobile apps that make everyday knowledge easier to explore.",
      "Uygulama kataloğu dizini": "App catalog index",
      "Merhaba, ben M. Ali Bağcı.": "Hello, I'm M. Ali Bağcı.",
      "Fikirleri, sade ve": "I turn ideas into simple,",
      "anlamlı": "meaningful",
      "dijital": "digital",
      "ürünlere dönüştürüyorum.": "products.",
      "Günlük hayat için düşünülmüş dijital ürünler.": "Digital products thoughtfully made for everyday life.",
      "Kataloğu görüntüle ↓": "View the catalog ↓",
      "İletişime geç": "Get in touch",
      "uygulama yayında": "apps available",
      "uygulama yakında": "apps coming soon",
      "Kur’an-ı Kerim meali okumayı sade, sakin ve sürdürülebilir bir okuma deneyimine dönüştür.": "Turn reading Quran translations into a calm, simple, and sustainable habit.",
      "Okuma & keşif": "Reading & discovery",
      "Kur’an-ı Kerim mealini aceleye getirmeden, kart kart okumak için. Her kart tek bir ayete ait: istediğinde sakla, istediğinde tekrar et.": "Read Quran translations one card at a time, without rushing. Each card belongs to a single verse—save it or revisit it whenever you wish.",
      "İngilizce öğrenme yolculuğunu seviyelere ayrılmış kartlar ve kısa tekrarlarla daha düzenli getir.": "Build a more organized English-learning routine with level-based cards and short review sessions.",
      "Dil öğrenimi": "Language learning",
      "A1’den B2’ye kelime dağarcığını, örnek cümleler ve aralıklı tekrarla büyüten sade bir kart destesi.": "A clean card deck that grows your A1–B2 vocabulary through example sentences and spaced review.",
      "KPSS tarih konularına çalışmayı binlerce kısa ve odaklanmış bilgiyle hızlı tekrar edilebilir bir deneyime dönüştür.": "Turn KPSS history study into a fast, repeatable experience with thousands of concise facts.",
      "Not tekrarı": "Study notes",
      "17 konudaki 3.000 kısa bilgiyi, tek tek kartlara sığdırdım. Ezber değil, tekrarla kalıcı öğrenme için.": "3,000 concise facts across 17 topics, each presented on its own card for lasting learning through review.",
      "Ehliyet sınavına hazırlığı kısa, pratik ve konu odaklı soru kartlarıyla kolaylaştır.": "Prepare for the driving theory exam with concise, practical, topic-focused question cards.",
      "Sınav hazırlığı": "Exam preparation",
      "Sınav konularını kategori kategori ayıran soru kartlarıyla, gerçek sınav temposunda pratik yapın.": "Practice at exam pace with question cards organized by topic.",
      "Gün biterken, gerçekler yerini rüyalara bırakır.": "As the day ends, reality gives way to dreams.",
      "Yaklaşan deneyim": "Upcoming experience",
      "Rüyanın içinde saklı olanı keşfet.": "Discover what lies within your dream.",
      "Rüyanı anlat, sana açılan kartları seç ve başka bir yerde karşılaşmayacağın kadar kişisel, gizemli bir tabir deneyimi yaşa.": "Tell your dream, choose the cards revealed to you, and step into a personal, mysterious interpretation experience unlike any other.",
      "Şimdi ön kayıt olanlara, uygulama yayınlandığında": "Those who pre-register now will receive",
      "1 ay ücretsiz premium": "one free month of premium",
      "hediye ediyorum.": "when the app is released.",
      "Çok yakında · Google Play ve App Store": "Coming soon · Google Play and App Store",
      "Ön kayıt ol ↗": "Pre-register ↗",
      "Belgelerini, notlarını ve önemli tarihlerini çevrimdışı ve düzenli bir kasada bir araya getir.": "Bring documents, notes, and important dates together in one organized offline vault.",
      "Belge asistanı": "Document assistant",
      "Vaultify: Belge Asistanı": "Vaultify: Document Assistant",
      "Belgelerinizi düzenleyin, önemli tarihleri zamanında hatırlayın. Sözleşmelerinizi, poliçelerinizi, garanti belgelerinizi, araç evraklarınızı ve takip etmek istediğiniz diğer belgeleri tek yerde yönetin.": "Organize documents, track important dates, and set flexible reminders.",
      "Yakında · Yalnızca Android": "Coming soon · Android only",
      "Fikirden ekrana, her kartı tek başıma hazırlıyorum.": "From idea to screen, I build every card myself.",
      "Eğitim, okuma ve günlük yaşam için bağımsız mobil uygulamalar tasarlıyor, geliştiriyor ve yayımlıyorum. Tek kişilik bir stüdyo olarak yürütüyorum.": "I design, develop, and publish independent mobile apps for education, reading, and everyday life as a one-person studio.",
      "Yeni uygulamaları ilk sen dene.": "Be among the first to try new apps.",
      "Bundan sonra yayımlayacağım her uygulama için küçük bir kapalı test grubu oluşturuyorum. Katılmak istersen yaz, sırası gelince davet göndereyim.": "I create a small closed group for each new app I release. Get in touch if you would like an invitation when the time comes.",
      "Test grubuna katıl ↗": "Join the group ↗",
      "EYL": "SEP"
    },
    "/ayet-kartlari/": {
      "Kur’an-ı Kerim mealini sade kartlarla okuyun; kaldığınız yerden devam edin, kartları kaydedin ve okuma istatistiklerinizi takip edin.": "Read Quran translations in clean cards, continue where you left off, save cards, and follow your reading statistics.",
      "Okuma & keşif · Google Play’de yayında": "Reading & discovery · Available on Google Play",
      "Kur’an-ı Kerim mealini kartlar hâlinde, sade ve dikkatinizi dağıtmayan bir arayüzle okuyun. Günlük okumanızı sakin ve düzenli biçimde sürdürün.": "Read Quran translations as cards in a clean, distraction-free interface. Keep your daily reading calm and organized.",
      "Sakin ve düzenli bir okuma alanı.": "A calm and organized reading space.",
      "Puan, rozet veya yarışma baskısı olmadan; sade, saygılı ve huzurlu bir okuma deneyimi için tasarlandı.": "Designed for a clean, respectful, and peaceful reading experience without points, badges, or competitive pressure.",
      "Kartlarla sakin okuma": "Calm card-based reading",
      "Ayet meallerini kısa ve anlaşılır kartlar hâlinde okuyun.": "Read verse translations in concise, easy-to-follow cards.",
      "Kaldığınız yerden devam": "Continue where you left off",
      "Okuma akışınıza daha sonra aynı noktadan dönün.": "Return to the same point in your reading flow later.",
      "Kaydedin ve izleyin": "Save and follow",
      "Beğendiğiniz kartları saklayın, okuma istatistiklerinizi takip edin.": "Save the cards you value and follow your reading statistics.",
      "21 dil desteği": "Support for 21 languages",
      "Meal içeriklerini desteklenen 21 dil arasından seçin.": "Choose translation content from 21 supported languages.",
      "Meal kaynağı": "Translation source",
      "Diyanet İşleri Başkanlığı meali esas alınarak hazırlanmıştır.": "Based on the translation published by the Presidency of Religious Affairs of Türkiye.",
      "Bilgilendirme": "Notice",
      "Fetva, tefsir veya dinî hüküm verme uygulaması değildir.": "This app does not provide fatwas, exegesis, or religious rulings.",
      "Ayet Kartları ile sakin okumaya başlayın.": "Start a calm reading journey with Ayet Kartları."
    },
    "/ingilizce-kelime-kartlari/": {
      "Eğitim & dil · Google Play’de yayında": "Education & language · Available on Google Play",
      "A1’den B2’ye İngilizce kelimeleri küçük ve tamamlanabilir çalışma setleriyle öğrenin; ilerlemenizi görün ve ihtiyaç duyduklarınızı yeniden çalışın.": "Learn English vocabulary from A1 to B2 in small, achievable study sets, follow your progress, and revisit the words you need.",
      "Her gün tamamlanabilir bir kelime çalışması.": "A vocabulary session you can complete every day.",
      "Yoğun ve dağınık kelime listeleri yerine, kısa kart setleriyle düzenli ilerlemenizi sağlayan sade bir öğrenme alanı.": "A clean learning space that replaces overwhelming word lists with short card sets and steady progress.",
      "Seviyelere göre içerik": "Content by level",
      "A1, A2, B1 ve B2 seviyelerinde düzenli biçimde ilerleyin.": "Progress steadily through A1, A2, B1, and B2 levels.",
      "20 kartlık setler": "20-card sets",
      "Her oturumu küçük ve tamamlanabilir bir çalışma setine dönüştürün.": "Turn each session into a small, achievable study set.",
      "Örnek kullanımlar": "Example usage",
      "Kelimeleri yalnızca anlamıyla değil, kullanım bağlamıyla öğrenin.": "Learn words through context, not only definitions.",
      "İlerleme görünümü": "Progress overview",
      "Öğrendiğiniz ve tekrar etmek istediğiniz kelimeleri takip edin.": "Follow the words you have learned and want to review.",
      "İçerik yapısı": "Content structure",
      "3.000 kelimelik kart havuzu seviyelere ayrılmıştır.": "A pool of 3,000 vocabulary cards is organized by level.",
      "Çalışma biçimi": "Study format",
      "Kartların ardından isteğe bağlı kısa quiz sunulur.": "An optional short quiz follows each card set.",
      "Yeni kelimeleri düzenli biçimde öğrenmeye başlayın.": "Start learning new words consistently."
    },
    "/kpss-tarih-notlari/": {
      "Eğitim & tarih · Google Play’de yayında": "Education & history · Available on Google Play",
      "KPSS tarih kapsamındaki kısa bilgileri konu konu okuyun, kartlarla ilerleyin ve hangi başlıklarda ne kadar çalıştığınızı görün.": "Read concise KPSS history facts by topic, progress through cards, and see how much you have studied in each area.",
      "Tarih bilgisini küçük parçalara ayırın.": "Break history knowledge into manageable pieces.",
      "Uzun not sayfaları arasında kaybolmadan, tek bilgi taşıyan kısa kartlarla kronolojiyi ve temel bağlantıları kurmanıza yardımcı olur.": "Build chronology and key connections with concise single-fact cards instead of getting lost in long notes.",
      "3.000 kısa bilgi": "3,000 concise facts",
      "Her kart tek bir tarih bilgisini açık ve kısa biçimde sunar.": "Each card presents one history fact clearly and concisely.",
      "17 konu başlığı": "17 topics",
      "KPSS tarih kapsamını konu konu çalışın.": "Study the KPSS history curriculum topic by topic.",
      "Kart tabanlı okuma": "Card-based reading",
      "Bilgileri küçük parçalar hâlinde okuyarak tekrarınızı kolaylaştırın.": "Make review easier by reading information in small pieces.",
      "Konu bazındaki çalışma durumunuzu takip edin.": "Follow your study progress by topic.",
      "Kapsam": "Scope",
      "İçerik 17 tarih konusu etrafında düzenlenmiştir.": "The content is organized around 17 history topics.",
      "Okuma biçimi": "Reading format",
      "Kartlar tek bilgiye odaklanan kısa notlar sunar.": "Cards provide concise notes focused on one fact.",
      "KPSS tarih tekrarınızı kartlarla hızlandırın.": "Speed up your KPSS history review with cards."
    },
    "/ehliyet-sinavi-2026/": {
      "Sınav hazırlığı · Google Play’de yayında": "Exam preparation · Available on Google Play",
      "Trafik, ilk yardım, araç tekniği ve trafik adabı konularını soru kartlarıyla çalışın; öğrendiklerinizi ve ilerlemenizi tek yerde görün.": "Study traffic, first aid, vehicle mechanics, and road etiquette with question cards, and follow your learning progress in one place.",
      "Sınava düzenli ve odaklı hazırlanın.": "Prepare for the exam with focus and consistency.",
      "Konuları karışık listeler yerine kategorilere ayrılmış soru kartlarıyla çalışmanızı kolaylaştıran pratik bir hazırlık alanı.": "A practical study space with question cards organized by category instead of mixed lists.",
      "Dört temel kategori": "Four core categories",
      "Trafik, ilk yardım, araç tekniği ve trafik adabı başlıklarını ayrı çalışın.": "Study traffic, first aid, vehicle mechanics, and road etiquette separately.",
      "Soru kartları": "Question cards",
      "Bilgileri kısa ve odaklı kartlarla tekrar edin.": "Review information with concise, focused cards.",
      "Öğrenilenler alanı": "Recently learned",
      "Yeni öğrendiğiniz sorulara daha sonra yeniden dönün.": "Return to newly learned questions later.",
      "İlerleme takibi": "Progress tracking",
      "Çalışma durumunuzu konu bazında görün.": "See your study progress by topic.",
      "Amaç": "Purpose",
      "Ehliyet sınavına hazırlığı düzenli hâle getirmek için geliştirilmiştir.": "Designed to make driving theory exam preparation more organized.",
      "İçerik": "Content",
      "Sorular konu kategorilerine göre sunulur.": "Questions are presented by topic category.",
      "Ehliyet sınavına kartlarla hazırlanmaya başlayın.": "Start preparing for the driving theory exam with cards."
    },
    "/ruya-katibi/": {
      "Rüya Kâtibi: Rüya Tabirleri — M. Ali Bağcı": "Rüya Kâtibi: Dream Interpretations — M. Ali Bağcı",
      "Kişisel keşif · Çok yakında Google Play ve App Store’da": "Personal discovery · Coming soon to Google Play and the App Store",
      "Rüyanızdaki ayrıntıları anlatın, size özel açılan kartların arasından seçim yapın ve başka bir yerde karşılaşmayacağınız kişisel bir tabir deneyimine adım atın.": "Describe the details of your dream, choose from cards revealed for you, and enter a uniquely personal interpretation experience.",
      "Ön kayıt olanlara, uygulama yayınlandığında": "Pre-register now and receive",
      "1 ay ücretsiz premium": "one free month of premium",
      "hediye ediyorum.": "when the app is released.",
      "ÜCRETSİZ": "FREE",
      "Ön kayıt ol ↗": "Pre-register ↗",
      "Her rüya, kendi kartlarını açar.": "Every dream reveals its own cards.",
      "Rüyanızın sembollerini doğrudan ele vermeden, kart seçimi ve kişiselleştirme adımlarıyla merakı koruyan özgün bir yorumlama deneyimi.": "An original interpretation experience that preserves mystery through card selection and personalization without directly revealing your dream symbols.",
      "Rüyanı anlat": "Tell your dream",
      "Kişileri, nesneleri, yerleri ve duyguları kendi kelimelerinle yaz.": "Describe people, objects, places, and feelings in your own words.",
      "Kartlarını seç": "Choose your cards",
      "Rüyanın ayrıntılarına göre açılan gizemli kartlar arasından seçim yap.": "Choose from mysterious cards revealed according to the details of your dream.",
      "Kişisel tabir": "Personal interpretation",
      "Seçimlerin ve anlattığın rüya birlikte değerlendirilerek sana özel bir yorum oluşturulsun.": "Your choices and dream are considered together to create an interpretation for you.",
      "Rüya arşivi": "Dream archive",
      "Rüyalarını ve yorumlarını zaman içinde saklayıp yeniden keşfet.": "Save and rediscover your dreams and interpretations over time.",
      "Kişisel deneyim": "Personal experience",
      "Her yorum, anlatılan rüya ve seçilen kartlar etrafında şekillenir.": "Each interpretation is shaped around the dream and selected cards.",
      "Bilgilendirme": "Notice",
      "Sağlık veya psikoloji alanında teşhis ya da yönlendirme sunmaz.": "It does not provide health or psychological diagnosis or guidance.",
      "Yakında": "Coming soon",
      "Google Play ve App Store sürümleri hazırlanıyor.": "Google Play and App Store versions are in development.",
      "Rüyalarının açacağı kartları keşfet.": "Discover the cards your dreams will reveal.",
      "Çok yakında Google Play ve App Store’da. Ön kayıt olursan, yayınlandığında 1 ay premium hesabı benden.": "Coming soon to Google Play and the App Store. Pre-register to receive one month of premium when it launches."
    },
    "/vaultify/": {
      "Vaultify: Belge Asistanı — M. Ali Bağcı": "Vaultify: Document Assistant — M. Ali Bağcı",
      "Belgelerinizi düzenleyin, önemli tarihleri takip edin ve esnek hatırlatıcılar oluşturun.": "Organize documents, track important dates, and set flexible reminders.",
      "Belge asistanı · Yakında · Yalnızca Android": "Document assistant · Coming soon · Android only",
      "Vaultify: Belge Asistanı": "Vaultify: Document Assistant",
      "Belgelerinizi düzenleyin, önemli tarihleri zamanında hatırlayın. Vaultify; sözleşmelerinizi, poliçelerinizi, garanti belgelerinizi, araç evraklarınızı ve takip etmek istediğiniz diğer belgeleri tek yerde düzenlemenize yardımcı olan kişisel belge asistanıdır.": "Keep your important documents organized and stay on top of every important date with Vaultify. Vaultify is a personal document assistant designed to help you organize contracts, insurance policies, warranty documents, vehicle records, school documents, business paperwork, and other important files in one convenient place.",
      "Yakında": "Coming soon",
      "Vaultify Google Play özellik grafiği": "Vaultify Google Play feature graphic",
      "Vaultify — Belgeler düzenli, önemli tarihler takipte": "Vaultify — Documents organized, important dates tracked",
      "Esnek belge düzeni": "Flexible document organization",
      "Her belge farklıdır.": "Every document is different.",
      "Vaultify, hangi bilgilerin yer alacağını ve nasıl sıralanacağını seçmenize imkân verir. Hazır formatlardan birini kullanın veya kişisel ya da profesyonel ihtiyaçlarınıza uygun özel bir format oluşturun.": "Vaultify allows you to choose which information should be included and how it should be arranged. Use one of the available formats or create a custom format that fits your personal or professional needs.",
      "Kamera, galeri ve dosyalar": "Camera, gallery, and device files",
      "Belgelerinizi kamera, galeri veya cihaz dosyalarından ekleyin.": "Add documents from your camera, gallery, or device files.",
      "Klasörler ve özel formatlar": "Folders and custom formats",
      "Kendi klasörlerinizi kullanın; hazır belge formatlarından yararlanın veya özel formatlar oluşturun.": "Organize documents using your own folders. Use ready-made document formats or create custom formats.",
      "İhtiyacınıza uygun alanlar": "Information that fits your needs",
      "Özel bilgiler, tarihler, notlar, parasal değerler, sayılar ve birimler ekleyin.": "Add custom information, dates, notes, monetary values, numbers, and units.",
      "Esnek hatırlatıcılar": "Flexible reminders",
      "Her belge için birden fazla hatırlatıcı kurun; tam tarih ve saati ya da önemli bir tarihten önceki zamanı seçin.": "Create multiple reminders for each document. Set reminders for an exact date and time or before an important date.",
      "Kronolojik süreç notları": "Timestamped process notes",
      "Belgeyle ilgili gelişmeleri tarih-saat damgalı süreç notları olarak saklayın.": "Record timestamped process notes for ongoing document-related updates.",
      "Kapsamlı arama": "Comprehensive search",
      "Belge başlıkları, bilgi alanları ve süreç notları içerisinde arama yapın.": "Search document titles, information fields, and process notes.",
      "Yedekleme ve geri yükleme": "Backup and restore",
      "Verilerinizi yedekleyin ve gerektiğinde geri yükleyin.": "Back up your data and restore it when needed.",
      "Hesapsız, çevrimdışı ve reklamsız": "Account-free, offline, and ad-free",
      "Hesap oluşturmadan, zorunlu internet bağlantısı veya reklam olmadan kayıtlarınıza erişin.": "Use the app without creating an account. Access your records without a mandatory internet connection. Enjoy an ad-free experience.",
      "Her önemli adımı takip edin": "Track every important step",
      "Bir belgenin ne zaman gönderildiğini, teslim edildiğini, yenilendiğini veya güncellendiğini kronolojik süreç notlarıyla kaydedin.": "Add chronological process notes directly to a document. Record when a document was sent, delivered, renewed, submitted, or updated, and keep its history in one place.",
      "Verileriniz cihazınızda kalır": "Your data stays on your device",
      "Belgeleriniz ve uygulama kayıtlarınız yerel olarak saklanır. Verilerinizi ne zaman ve nereye aktaracağınıza siz karar verirsiniz.": "Vaultify does not require an account or mandatory cloud storage. Your documents and app records are stored locally on your device. You decide when and where to export or back up your data.",
      "Bilgilendirme": "Notice",
      "Vaultify kişisel düzenleme ve hatırlatma aracıdır; hukuki, mali, muhasebe, belge doğrulama veya resmî kayıt hizmeti sunmaz.": "Vaultify is a personal organization and reminder tool. It does not provide legal, financial, accounting, document verification, or official record-keeping services.",
      "Belgeleriniz düzenli, önemli tarihleriniz kontrolünüz altında.": "Your documents organized, your important dates under control.",
      "Vaultify ile belgelerinizi düzenleyin ve her önemli tarihi takip edin.": "Organize your documents and stay on top of every important date with Vaultify.",
      "Gizlilik Politikasını aç ↗": "Open the Privacy Policy ↗"
    }
  };

  const path = location.pathname.endsWith("/") ? location.pathname : `${location.pathname}/`;
  const key = path === "/" ? "/" : `/${path.split("/").filter(Boolean).pop()}/`;
  const params = new URLSearchParams(location.search);
  const requested = params.get("lang");
  if (requested === "en" || requested === "tr") localStorage.setItem("siteLanguage", requested);
  const language = requested === "en" || requested === "tr" ? requested : (localStorage.getItem("siteLanguage") || "tr");
  const dictionary = { ...common, ...(pages[key] || {}) };

  const translateText = (value) => dictionary[value] || value;
  const preserveWhitespace = (raw, translated) => `${raw.match(/^\s*/)[0]}${translated}${raw.match(/\s*$/)[0]}`;

  if (language === "en") {
    document.documentElement.lang = "en";
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.parentElement && ["SCRIPT", "STYLE"].includes(node.parentElement.tagName)) return;
      const value = node.nodeValue.trim();
      if (value && dictionary[value]) node.nodeValue = preserveWhitespace(node.nodeValue, dictionary[value]);
    });
    document.querySelectorAll("[aria-label],[alt],[title],meta[content]").forEach((element) => {
      ["aria-label", "alt", "title", "content"].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const value = element.getAttribute(attribute);
        if (dictionary[value]) element.setAttribute(attribute, dictionary[value]);
      });
    });
    const locale = document.querySelector('meta[property="og:locale"]');
    if (locale) locale.content = "en_US";
  }

  const navigation = document.querySelector(".site-nav");
  if (navigation) {
    const target = language === "en" ? "tr" : "en";
    const url = new URL(location.href);
    url.searchParams.set("lang", target);
    const switcher = document.createElement("a");
    switcher.className = "language-switch";
    switcher.href = `${url.pathname}${url.search}${url.hash}`;
    switcher.lang = target;
    switcher.hreflang = target;
    switcher.textContent = target.toUpperCase();
    switcher.setAttribute("aria-label", language === "en" ? "Türkçe görüntüle" : "View in English");
    const contact = navigation.querySelector(".nav-contact");
    navigation.insertBefore(switcher, contact || null);
  }
})();
