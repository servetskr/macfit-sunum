// MACFit Üye Masası — ekran ve iş mantığı. Masaüstünde (Electron) ve webde (demo) aynı kod çalışır.
const $ = (s, k = document) => k.querySelector(s);
const $$ = (s, k = document) => [...k.querySelectorAll(s)];
const GUN = 864e5;
const WEB = window.masa.ortam === 'web';

// ---------------- yardımcılar ----------------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tarihAl = (x) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) ? new Date(+x.slice(0, 4), +x.slice(5, 7) - 1, +x.slice(8, 10)) : new Date(x);
const gunBas = (x) => { const d = tarihAl(x); d.setHours(0, 0, 0, 0); return d.getTime(); };
const bugunBas = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const gunFarki = (x) => Math.round((gunBas(x) - bugunBas()) / GUN);
const bugunMu = (x) => x && gunFarki(x) === 0;
const ymd = (d) => d.toLocaleDateString('sv-SE');
const tarihYaz = (x) => tarihAl(x).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: tarihAl(x).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
const saatYaz = (x) => new Date(x).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const sadeceSaat = (x) => new Date(x).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
const TL = (n) => Number(n || 0).toLocaleString('tr-TR') + ' TL';
const telNorm = (t) => (t || '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');
const cepMi = (t) => /^5\d{9}$/.test(telNorm(t));
const telYaz = (t) => { const n = telNorm(t); return n.length === 10 ? `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}` : t; };
const basHarf = (ad) => ad.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr');
const kopya = (o) => JSON.parse(JSON.stringify(o));
const svg = (id) => `<svg class="ik"><use href="#${id}"/></svg>`;
const kalan = (k) => (k.uyelik ? gunFarki(k.uyelik.bitis) : null);
const pasifGun = (k) => (k.sonGiris ? -gunFarki(k.sonGiris) : null);
function dogumKalan(k) {
  if (!k.dogum) return null;
  const d = tarihAl(k.dogum), b = new Date(bugunBas());
  let t = new Date(b.getFullYear(), d.getMonth(), d.getDate());
  if (t < b) t = new Date(b.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((t - b) / GUN);
}
const yas = (k) => { if (!k.dogum) return null; const d = tarihAl(k.dogum), b = new Date(); let y = b.getFullYear() - d.getFullYear(); if (b < new Date(b.getFullYear(), d.getMonth(), d.getDate())) y--; return y; };
const araZamani = (k) => k.ara && new Date(k.ara.zaman).getTime() <= Date.now();
const gunMetni = (g) => g === 0 ? 'bugün' : g === 1 ? 'yarın' : g === -1 ? 'dün' : g > 0 ? `${g} gün sonra` : `${-g} gün önce`;

// ---------------- sabitler ----------------
const VARSAYILAN_AYARLAR = {
  sube: 'Eskişehir',
  gunlukHedef: 30,
  paketler: [
    { ad: 'Aylık', ay: 1, fiyat: 2400 }, { ad: '3 Aylık', ay: 3, fiyat: 6300 }, { ad: '6 Aylık', ay: 6, fiyat: 11400 },
    { ad: 'Yıllık', ay: 12, fiyat: 19900 }, { ad: 'Öğrenci Yıllık', ay: 12, fiyat: 14900 }
  ],
  otomasyon: { dogum: true, y30: true, y7: true, doldu: true, pasif: true, aday: true },
  sablonlar: {
    dogum: 'İyi ki doğdun {ad}! 🎉 MACFit {sube} ailesi olarak yeni yaşının sağlık ve enerji dolu geçmesini dileriz. Hediyemiz: bu hafta getireceğin bir arkadaşına 1 hafta ücretsiz giriş.',
    y30: 'Merhaba {ad}, MACFit {sube} üyeliğin {bitis} tarihinde bitiyor. Şimdi yenilersen sana özel erken yenileme fiyatı geçerli. Bilgi için bu mesaja yanıt vermen yeterli.',
    y7: 'Merhaba {ad}, MACFit {sube} üyeliğin {kalan}. Antrenman ritmin bozulmasın, yenilemek ister misin? “Evet” yazman yeterli, ekibimiz seni arasın.',
    doldu: 'Merhaba {ad}, seni MACFit {sube}\'de özledik! Geri dönüşüne özel ilk ay %20 indirim tanımladık. İlgilenirsen bu mesaja yanıt ver, seni arayalım.',
    pasif: 'Merhaba {ad}, {pasif} gündür seni salonda göremedik. Programını birlikte yeniden planlayalım mı? Antrenörlerimizle ücretsiz bir değerlendirme ayarlayabiliriz.',
    aday: 'Merhaba {ad}, MACFit {sube}\'ye gösterdiğin ilgi için teşekkürler! Seni ücretsiz deneme dersine davet ediyoruz. Hangi gün ve saat sana uygun?',
    teklif: 'Merhaba {ad}, konuştuğumuz üyelik seçenekleri:\n{paketler}\nKayıt için şubemize uğrayabilir ya da bu mesaja yanıt verebilirsin. MACFit {sube}',
    genel: 'Merhaba {ad}, MACFit {sube}\'den yazıyorum.',
    yenileme: 'Merhaba {ad}, MACFit {sube}\'den yazıyorum. Üyeliğini yenilemekle ilgili konuştuklarımızı özetliyorum:'
  },
  kampanyalar: [
    { id: 'karacuma', ad: 'Kara Cuma', bas: '11-20', bit: '11-30', kitle: 'dolan', metin: 'Merhaba {ad}, MACFit {sube}\'de Kara Cuma başladı: yıllık üyelikte %30 indirim, 30 Kasım\'a kadar. Seni yeniden aramızda görmek isteriz. Detay için bu mesaja yanıt ver.' },
    { id: 'yilbasi', ad: 'Yeni yıl, yeni sen', bas: '12-15', bit: '01-07', kitle: 'aday', metin: 'Merhaba {ad}, yeni yıl hedeflerine MACFit {sube} ile başla! Ocak sonuna kadar kayıtlarda ilk ay hediye. Ücretsiz deneme dersi için yanıt ver.' },
    { id: 'sevgili', ad: 'Partnerinle gel', bas: '02-01', bit: '02-14', kitle: 'uye', metin: 'Merhaba {ad}, 14 Şubat\'a özel: partnerini MACFit {sube}\'ye getir, ona 1 ay %50 indirim, sana 2 hafta uzatma. Detay için yanıt ver.' },
    { id: 'yaz', ad: 'Yaza hazırlık', bas: '04-01', bit: '05-31', kitle: 'tumu', metin: 'Merhaba {ad}, yaza 8 hafta kaldı! MACFit {sube}\'de 8 haftalık dönüşüm programı başlıyor: ölçüm, beslenme planı ve grup dersleri bir arada. Yer ayırmak için yanıt ver.' },
    { id: 'ogrenci', ad: 'Okula dönüş', bas: '09-01', bit: '09-30', kitle: 'aday', metin: 'Merhaba {ad}, öğrencilere özel yıllık üyelik MACFit {sube}\'de! Eylül boyunca öğrenci belgesiyle ek %10 indirim. Detay için yanıt ver.' },
    { id: 'erken', ad: 'Erken yenileme', bas: null, bit: null, kitle: 'yenileme', metin: 'Merhaba {ad}, üyeliğin {bitis} tarihinde bitiyor. Bitişten önce yenileyenlere 1 ay ek süre hediye! Bilgi için yanıt ver.' }
  ]
};

const SONUC = {
  uye: [
    { tus: '1', d: 'ulasilamadi', ad: 'Ulaşılamadı', alt: 'Açmadı · meşgul' },
    { tus: '2', d: 'tekrar_ara', ad: 'Tekrar ara', alt: 'Saat ver', zaman: true },
    { tus: '3', d: 'yeniledi', ad: 'Yeniledi', alt: 'Paket seç', paket: true, iyi: true },
    { tus: '4', d: 'dusunecek', ad: 'Düşünecek', alt: 'Hatırlatma kur', zaman: true },
    { tus: '5', d: 'yenilemeyecek', ad: 'Yenilemeyecek', alt: 'Nedenini yaz', notZorunlu: true, kotu: true },
    { tus: '6', d: 'dondurma', ad: 'Dondurma istedi', alt: 'Şubeye iletilir' },
    { tus: '8', d: 'yanlis', ad: 'Yanlış numara', alt: 'Numara hatalı', kotu: true }
  ],
  aday: [
    { tus: '1', d: 'ulasilamadi', ad: 'Ulaşılamadı', alt: 'Açmadı · meşgul' },
    { tus: '2', d: 'tekrar_ara', ad: 'Tekrar ara', alt: 'Saat ver', zaman: true },
    { tus: '3', d: 'deneme', ad: 'Deneme dersi', alt: 'Randevu ver', zaman: true, iyi: true },
    { tus: '4', d: 'teklif', ad: 'Teklif istedi', alt: 'WhatsApp\'tan fiyat', wa: 'teklif' },
    { tus: '5', d: 'ilgilenmiyor', ad: 'İlgilenmiyor', alt: 'Nedenini yaz', notZorunlu: true, kotu: true },
    { tus: '7', d: 'kayit', ad: 'Kayıt oldu', alt: 'Paket seç', paket: true, iyi: true },
    { tus: '8', d: 'yanlis', ad: 'Yanlış numara', alt: 'Numara hatalı', kotu: true }
  ]
};
const ETIKET = { oto: 'Otomatik mesaj', yanit: 'Yanıt', not: 'Not', ekle: 'Kayıt', izin: 'İleti izni' };
[...SONUC.uye, ...SONUC.aday].forEach(s => { ETIKET[s.d] = s.ad; });
const ARAMA_SONUCLARI = new Set([...SONUC.uye, ...SONUC.aday].map(s => s.d));
const ULASILAN = new Set([...ARAMA_SONUCLARI].filter(d => !['ulasilamadi', 'yanlis'].includes(d)));

const GORUNUMLER = [
  { id: 'bugun', ad: 'Bugün aranacaklar', kisa: 'Bugün', ikon: 'i-telefon' },
  { id: 'yenileme', ad: 'Yenilemesi yaklaşan', kisa: 'Yenileme', ikon: 'i-yenile', grup: 'Üyeler' },
  { id: 'dolan', ad: 'Süresi dolan', kisa: 'Dolan', ikon: 'i-geri', grup: 'Üyeler' },
  { id: 'pasif', ad: 'Salona gelmeyen', kisa: 'Gelmeyen', ikon: 'i-uyku', grup: 'Üyeler' },
  { id: 'dogum', ad: 'Doğum günü', kisa: 'Doğum günü', ikon: 'i-pasta', grup: 'Üyeler' },
  { id: 'aday', ad: 'Potansiyel üyeler', kisa: 'Adaylar', ikon: 'i-yildiz', grup: 'Satış' },
  { id: 'tumu', ad: 'Tüm kişiler', kisa: 'Tümü', ikon: 'i-kisiler', grup: 'Satış' }
];
const ANA_SONUC = { uye: ['yeniledi', 'dusunecek', 'tekrar_ara', 'ulasilamadi'], aday: ['kayit', 'deneme', 'teklif', 'tekrar_ara', 'ulasilamadi'] };

const ASAMA = { yeni: 'Yeni aday', deneme: 'Deneme dersi', teklif: 'Teklif verildi', kayit: 'Üye oldu', kayip: 'Kaybedildi' };

const KURALLAR = [
  { id: 'dogum', ad: 'Doğum günü kutlaması', ne: 'Doğum günü sabahı kutlama ve hediye. Yanıt personele düşmez.', yanitAra: false,
    uyar: (k) => dogumKalan(k) === 0 ? 'dogum-' + new Date().getFullYear() : null },
  { id: 'y30', ad: 'Yenileme · 30 gün kala', ne: 'Üyeliğin bitmesine 8–30 gün kala erken yenileme daveti.', yanitAra: true,
    uyar: (k) => k.tur === 'uye' && kalan(k) >= 8 && kalan(k) <= 30 ? 'y30-' + k.uyelik.bitis : null },
  { id: 'y7', ad: 'Yenileme · son hafta', ne: 'Bitişe 7 gün kala. Yanıt gelmezse 2 gün sonra personel arar.', yanitAra: true, yanitsizGun: 2,
    uyar: (k) => k.tur === 'uye' && kalan(k) >= 0 && kalan(k) <= 7 ? 'y7-' + k.uyelik.bitis : null },
  { id: 'doldu', ad: 'Geri kazanım', ne: 'Üyelik bittikten 3–30 gün sonra dönüş teklifi. Yanıt yoksa 2 gün sonra personel arar.', yanitAra: true, yanitsizGun: 2,
    uyar: (k) => k.tur === 'uye' && kalan(k) <= -3 && kalan(k) >= -30 ? 'doldu-' + k.uyelik.bitis : null },
  { id: 'pasif', ad: 'Seni özledik', ne: '14 gündür salona gelmeyen aktif üyelere motivasyon mesajı.', yanitAra: true,
    uyar: (k) => k.tur === 'uye' && kalan(k) >= 0 && pasifGun(k) >= 14 ? 'pasif-' + (k.sonGiris || '').slice(0, 10) : null },
  { id: 'aday', ad: 'Aday karşılama', ne: 'Yeni potansiyel üyeye ilk mesaj ve deneme dersi daveti. Yanıt yoksa ertesi gün personel arar.', yanitAra: true, yanitsizGun: 1,
    uyar: (k) => k.tur === 'aday' && k.aday?.asama === 'yeni' ? 'aday-' + k.id : null }
];
const kuralBul = (id) => KURALLAR.find(x => x.id === id) || (id?.startsWith('kamp-') ? { id, ad: 'Kampanya', yanitAra: true } : { id, ad: id, yanitAra: false });

const KITLE = {
  tumu: { ad: 'Herkes', f: (k) => true },
  uye: { ad: 'Aktif üyeler', f: (k) => k.tur === 'uye' && kalan(k) >= 0 },
  aday: { ad: 'Potansiyel üyeler', f: (k) => k.tur === 'aday' && !['kayip', 'kayit'].includes(k.aday?.asama) },
  dolan: { ad: 'Süresi dolanlar (son 180 gün)', f: (k) => k.tur === 'uye' && kalan(k) < 0 && kalan(k) >= -180 },
  yenileme: { ad: 'Yenilemesi yaklaşanlar (60 gün)', f: (k) => k.tur === 'uye' && kalan(k) >= 0 && kalan(k) <= 60 }
};

// ---------------- durum ----------------
const durum = {
  sekme: 'gorusme', kartId: null,
  db: null, ayarlar: null, gorunum: 'bugun', filtre: 'hepsi', seciliId: null, arama: '', gorunenler: [],
  cagriBas: null, sayacTimer: null, bekleyen: null, geriAl: null, ekran: 'liste'
};
const kisiler = () => durum.db.kisiler.filter(k => !k.silindi);
const secili = () => durum.db.kisiler.find(k => k.id === durum.seciliId);

let yazZaman = null;
function kaydetDb() {
  durum.db.ayarlar = durum.ayarlar;
  durum.db.guncelleme = new Date().toISOString();
  clearTimeout(yazZaman);
  yazZaman = setTimeout(() => window.masa.dbYaz(durum.db), 150);
}

async function baslat() {
  let db = await window.masa.veriAl();
  if (!db || !Array.isArray(db.kisiler)) db = demoVeri();
  durum.db = db;
  durum.ayarlar = { ...kopya(VARSAYILAN_AYARLAR), ...(db.ayarlar || {}) };
  durum.ayarlar.sablonlar = { ...VARSAYILAN_AYARLAR.sablonlar, ...(durum.ayarlar.sablonlar || {}) };
  durum.ayarlar.otomasyon = { ...VARSAYILAN_AYARLAR.otomasyon, ...(durum.ayarlar.otomasyon || {}) };
  if (!Array.isArray(durum.db.kampanyaKuyruk)) durum.db.kampanyaKuyruk = [];
  durum.db.kisiler.forEach(k => {
    k.mesajlar = k.mesajlar || []; k.gecmis = k.gecmis || [];
    for (const m of k.mesajlar) if (m.metin === '(Şablon mesaj gönderildi)') m.metin = doldur(durum.ayarlar.sablonlar[m.kural], k);
  });
  kaydetDb();
  window.masa.degisince((y) => { if (y?.kisiler) { durum.db = y; ciz(); } });
  document.body.classList.toggle('web', WEB);
  $('#demoSerit').hidden = !WEB;
  ciz();
  setInterval(() => { cizKenar(); if (durum.gorunum === 'bugun') cizListe(); }, 30000);
}

// ---------------- listeler ----------------
function gorunumListesi(id) {
  const K = kisiler();
  switch (id) {
    case 'bugun': return K.filter(araZamani).sort((a, b) => new Date(a.ara.zaman) - new Date(b.ara.zaman));
    case 'yenileme': return K.filter(k => k.tur === 'uye' && kalan(k) >= 0 && kalan(k) <= 30).sort((a, b) => kalan(a) - kalan(b));
    case 'dolan': return K.filter(k => k.tur === 'uye' && kalan(k) < 0 && kalan(k) >= -90).sort((a, b) => kalan(b) - kalan(a));
    case 'dogum': return K.filter(k => { const g = dogumKalan(k); return g != null && g <= 7; }).sort((a, b) => dogumKalan(a) - dogumKalan(b));
    case 'pasif': return K.filter(k => k.tur === 'uye' && kalan(k) >= 0 && pasifGun(k) >= 14).sort((a, b) => pasifGun(b) - pasifGun(a));
    case 'aday': { const s = { yeni: 0, deneme: 1, teklif: 2 }; return K.filter(k => k.tur === 'aday' && !['kayip', 'kayit'].includes(k.aday?.asama)).sort((a, b) => (s[a.aday.asama] ?? 9) - (s[b.aday.asama] ?? 9) || new Date(b.kayit) - new Date(a.kayit)); }
    default: return [...K].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  }
}

function filtrele(liste) {
  const f = durum.filtre;
  return f === 'hepsi' ? liste : liste.filter(k => k.tur === f);
}

function rozet(k, g) {
  switch (g) {
    case 'bugun': { const t = new Date(k.ara.zaman); return bugunMu(t) ? [sadeceSaat(t), 'vurgu'] : [`${-gunFarki(t)} gün`, 'uyari']; }
    case 'yenileme': { const x = kalan(k); return [x === 0 ? 'Bugün' : `${x} gün`, x <= 7 ? 'uyari' : 'notr']; }
    case 'dolan': return [`${-kalan(k)} gün önce`, 'notr'];
    case 'dogum': { const x = dogumKalan(k); return [x === 0 ? 'Bugün' : x === 1 ? 'Yarın' : `${x} gün`, x === 0 ? 'vurgu' : 'notr']; }
    case 'pasif': return [`${pasifGun(k)} gün`, 'notr'];
    case 'aday': return [ASAMA[k.aday.asama], 'notr'];
    default: return [k.tur === 'uye' ? (kalan(k) < 0 ? 'Eski üye' : 'Üye') : 'Aday', 'notr'];
  }
}

function altBilgi(k, g) {
  if (g === 'bugun' && k.ara) return esc(k.ara.neden);
  if (k.tur === 'uye') {
    const x = kalan(k);
    const b = x < 0 ? `${-x} gün önce doldu` : x === 0 ? 'bugün bitiyor' : `${x} gün kaldı`;
    return `${esc(k.uyelik.paket)} · ${b}${g === 'pasif' ? '' : ''}`;
  }
  return `${esc(k.aday?.ilgi || 'İlgi belirtilmedi')} · ${esc(k.kaynak || '')}`;
}

// ---------------- çizim ----------------
function ciz() { cizKenar(); cizListe(); cizKart(); cizSayac(); }

function cizKenar() {
  $('#sube').textContent = durum.ayarlar.sube;
  let grup = null;
  $('#gorunumler').innerHTML = GORUNUMLER.map(g => {
    const n = gorunumListesi(g.id).length;
    const ust = g.grup && g.grup !== grup ? `<div class="grup">${g.grup}</div>` : '';
    grup = g.grup || grup;
    return `${ust}<button class="gorunum ${g.id === durum.gorunum ? 'secili' : ''} ${g.id === 'bugun' ? 'birincil' : ''}" data-gorunum="${g.id}">${svg(g.ikon)}<span>${g.ad}</span><span class="say ${g.id === 'bugun' && n ? 'dikkat' : ''}">${n || ''}</span></button>`;
  }).join('');
  $$('#altNav [data-gorunum]').forEach(b => {
    b.classList.toggle('secili', b.dataset.gorunum === durum.gorunum);
    const n = gorunumListesi(b.dataset.gorunum).length;
    const s = $('.say', b); if (s) { s.textContent = n; s.hidden = !n || b.dataset.gorunum !== 'bugun'; }
  });
  const bugunku = kisiler().flatMap(k => k.gecmis.filter(g => bugunMu(g.t)));
  const aranan = bugunku.filter(g => ARAMA_SONUCLARI.has(g.d)).length;
  const ulasilan = bugunku.filter(g => ULASILAN.has(g.d)).length;
  const satis = bugunku.filter(g => ['yeniledi', 'kayit'].includes(g.d));
  const ciro = satis.reduce((t, g) => t + (Number(g.tutar) || 0), 0);
  const hedef = durum.ayarlar.gunlukHedef || 30;
  $('#gunHedef').textContent = `${aranan}/${hedef} arama`;
  $('#gunBar').style.width = Math.min(100, aranan / hedef * 100) + '%';
  $('#gunSayilar').textContent = `${ulasilan} ulaşıldı · ${satis.length} satış · ${TL(ciro)}`;
  const kuyruk = otoKuyruk().length;
  $$('.oto-say').forEach(x => { x.textContent = kuyruk; x.hidden = !kuyruk; });
}

function cizListe() {
  const q = durum.arama.trim().toLocaleLowerCase('tr');
  let liste, baslik;
  if (q) {
    const qn = q.replace(/\D/g, '');
    liste = kisiler().filter(k => k.ad.toLocaleLowerCase('tr').includes(q) || (qn.length >= 3 && telNorm(k.telefon).includes(qn.replace(/^0/, ''))));
    baslik = 'Arama sonuçları';
  } else {
    liste = filtrele(gorunumListesi(durum.gorunum));
    baslik = GORUNUMLER.find(g => g.id === durum.gorunum).ad;
  }
  durum.gorunenler = liste;
  $('#listeBaslik').textContent = baslik;
  $('#listeSay').textContent = liste.length;
  $$('#filtre button').forEach(b => b.classList.toggle('secili', b.dataset.f === durum.filtre));
  if (!liste.find(k => k.id === durum.seciliId) && !(durum.ekran === 'detay' && secili())) durum.seciliId = liste[0]?.id || null;
  const g = q ? 'tumu' : durum.gorunum;
  $('#liste').innerHTML = liste.map(k => {
    const [r, renk] = rozet(k, g);
    return `<button class="satir ${k.id === durum.seciliId ? 'secili' : ''}" data-id="${k.id}">
      <span class="av">${esc(basHarf(k.ad))}</span>
      <span class="satir-orta"><span class="ad">${esc(k.ad)}</span><span class="alt">${altBilgi(k, g)}</span></span>
      <span class="rozet r-${renk}">${esc(r)}</span></button>`;
  }).join('') || `<div class="liste-bos"><b>${q ? 'Eşleşen kişi yok' : durum.gorunum === 'bugun' ? 'Bugünlük bu kadar' : 'Burada kimse yok'}</b><span>${durum.gorunum === 'bugun' && !q ? 'Yanıtlar ve geri aramalar zamanı gelince buraya düşer.' : ''}</span></div>`;
  $('#liste .secili')?.scrollIntoView({ block: 'nearest' });
}

function bilgi(et, deger, alt = '', cls = '') {
  return `<div class="bilgi ${cls}"><dt>${et}</dt><dd>${deger}${alt ? `<small>${alt}</small>` : ''}</dd></div>`;
}

function sekmeSec(s) {
  durum.sekme = s;
  $$('.sekmeler [data-sekme]').forEach(b => b.classList.toggle('secili', b.dataset.sekme === s));
  $$('[data-sekme-ic]').forEach(x => { x.hidden = x.dataset.sekmeIc !== s; });
}

function cizKart() {
  const k = secili();
  $('#bos').hidden = !!k; $('#kart').hidden = !k;
  document.body.dataset.ekran = k && durum.ekran === 'detay' ? 'detay' : 'liste';
  if (!k) return;
  const uye = k.tur === 'uye';
  if (durum.kartId !== k.id) { durum.kartId = k.id; sekmeSec('gorusme'); }
  $('#kAvatar').textContent = basHarf(k.ad);
  $('#kAd').textContent = k.ad;

  // tek satırlık durum
  let nokta = 'notr', metin;
  if (uye) {
    const x = kalan(k);
    metin = `${esc(k.uyelik.paket)} üyelik · ` + (x < 0 ? `${-x} gün önce bitti` : x === 0 ? 'bugün bitiyor' : `${x} gün kaldı`);
    nokta = x < 0 ? 'kapali' : x <= 30 ? 'uyari' : 'aktif';
  } else {
    metin = `Potansiyel üye · ${ASAMA[k.aday?.asama] || 'Yeni'}`;
    nokta = 'aday';
  }
  if (dogumKalan(k) === 0) metin += ' · bugün doğum günü';
  $('#kEtiketler').innerHTML = `<i class="nokta n-${nokta}"></i>${metin}`;

  $('#eAra').disabled = !k.telefon;

  const n = $('#kNeden');
  if (k.ara) {
    n.hidden = false;
    const gelen = araZamani(k);
    n.className = 'neden ' + (gelen ? 'simdi' : '');
    n.innerHTML = `<b>${gelen ? 'Neden aranıyor' : 'Planlı arama · ' + saatYaz(k.ara.zaman)}</b><span>${esc(k.ara.neden)}</span>`;
  } else n.hidden = true;

  const b = [];
  if (uye) {
    const x = kalan(k);
    b.push(bilgi('Paket', esc(k.uyelik.paket), TL(k.uyelik.tutar)));
    b.push(bilgi('Bitiş', tarihYaz(k.uyelik.bitis), x < 0 ? `${-x} gün önce` : x === 0 ? 'bugün' : `${x} gün sonra`, x <= 7 ? 'uyari' : ''));
    b.push(bilgi('Son giriş', k.sonGiris ? (s => s[0].toLocaleUpperCase('tr') + s.slice(1))(gunMetni(gunFarki(k.sonGiris))) : '—', '', pasifGun(k) >= 14 ? 'uyari' : ''));
  } else {
    b.push(bilgi('İlgi', esc(k.aday?.ilgi || '—')));
    b.push(bilgi('Kaynak', esc(k.kaynak || '—')));
    b.push(bilgi('Deneme dersi', k.aday?.randevu ? saatYaz(k.aday.randevu) : '—'));
  }
  b.push(bilgi('Doğum günü', k.dogum ? tarihAl(k.dogum).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '—', k.dogum ? `${yas(k)} yaş` : ''));
  $('#kBilgi').innerHTML = b.join('');

  // görüşme sonuçları: ana seçenekler + diğerleri
  const ana = ANA_SONUC[k.tur];
  const tum = SONUC[k.tur];
  $('#sonuclar').innerHTML = tum.filter(s => ana.includes(s.d)).sort((x, y) => ana.indexOf(x.d) - ana.indexOf(y.d))
    .map(s => `<button class="sonuc ${s.iyi ? 'iyi' : ''}" data-sonuc="${s.d}"><b>${s.ad}</b><small>${s.alt}</small><kbd>${s.tus}</kbd></button>`).join('');
  $('#digerSonuclar').innerHTML = '<span>Diğer:</span>' + tum.filter(s => !ana.includes(s.d)).map(s => `<button data-sonuc="${s.d}">${s.ad}</button>`).join('');
  $('#kNotlar').textContent = k.notlar || '';
  $('#kNotlar').hidden = !k.notlar;

  // mesajlar
  const m = k.mesajlar.slice().reverse();
  $('#otoSay').textContent = m.length || '';
  $('#kMesajlar').innerHTML = m.map((x) => {
    const i = k.mesajlar.indexOf(x);
    const y = x.yanit;
    return `<li><div class="mesaj"><div class="mesaj-ust"><b>${esc(x.kuralAd || kuralBul(x.kural).ad)}</b><small>${saatYaz(x.t)}</small></div><p>${esc(x.metin)}</p></div>
      ${y ? `<div class="yanit ${y.tur}"><p>${esc(y.metin)}</p><small>${y.tur === 'olumlu' ? 'Olumlu' : 'Olumsuz'} · ${saatYaz(y.t)}</small></div>`
        : `<div class="yanit-bekle"><span>Yanıt bekleniyor</span><button data-yanit="${i}" data-tur="olumlu">Olumlu yanıt geldi</button><button data-yanit="${i}" data-tur="olumsuz">Olumsuz</button></div>`}</li>`;
  }).join('') || `<li class="bos-satir">Henüz otomatik mesaj gönderilmedi.${k.izin ? '' : ' İleti izni olmadığı için gönderilmez.'}</li>`;

  // geçmiş
  $('#gecmisSay').textContent = k.gecmis.length || '';
  $('#kGecmis').innerHTML = k.gecmis.slice().reverse().map(g => `<li class="g-${g.d}"><i></i><div><b>${ETIKET[g.d] || g.d}</b><small>${saatYaz(g.t)}${g.zaman ? ' → ' + saatYaz(g.zaman) : ''}</small>${g.not ? `<p>${esc(g.not)}</p>` : ''}</div></li>`).join('') || '<li class="bos-satir">Kayıt yok.</li>';

  // alt bilgi
  $('#kTel').textContent = k.telefon ? telYaz(k.telefon) : 'Telefon yok';
  $('#kTelTur').textContent = '';
  $('#kIzin').textContent = k.izin ? 'İleti izni var' : 'İleti izni yok';
  $('#kIzin').className = 'izin ' + (k.izin ? 'var' : 'yok');
  $('#kMeta').textContent = [k.kaynak, k.kayit ? 'kayıt ' + tarihYaz(k.kayit) : ''].filter(Boolean).join(' · ');
}

function cizSayac() {
  const s = $('#sure');
  if (!durum.cagriBas) { s.hidden = true; return; }
  s.hidden = false;
  const sn = Math.floor((Date.now() - durum.cagriBas) / 1000);
  $('#sureMetin').textContent = `${String(Math.floor(sn / 60)).padStart(2, '0')}:${String(sn % 60).padStart(2, '0')}`;
}

// ---------------- seçim / gezinme ----------------
function sec(id, detay = true) {
  durum.seciliId = id; $('#not').value = '';
  if (detay && mobil()) { durum.ekran = 'detay'; window.scrollTo(0, 0); $('#detay').scrollTop = 0; }
  cizListe(); cizKart();
}
const mobil = () => window.matchMedia('(max-width: 820px)').matches;
function listeyeDon() { durum.ekran = 'liste'; cizKart(); }
function kaydir(d) {
  const i = durum.gorunenler.findIndex(k => k.id === durum.seciliId);
  const y = durum.gorunenler[Math.max(0, Math.min(durum.gorunenler.length - 1, i + d))];
  if (y) sec(y.id, false);
}
function gorunumSec(id) {
  durum.gorunum = id; durum.seciliId = null; durum.arama = ''; $('#ara').value = ''; durum.ekran = 'liste';
  kapat('menuModal'); ciz();
}

// ---------------- arama ve sonuç ----------------
function aramaBaslat() {
  const k = secili(); if (!k?.telefon) return;
  if (WEB) bildir('Demo: arama başlatılmaz, süre sayacı çalışıyor');
  else if (mobil()) window.masa.urlAc('tel:0' + telNorm(k.telefon));
  else { window.masa.kopyala(telYaz(k.telefon)); bildir(`${telYaz(k.telefon)} kopyalandı · telefondan ara`); }
  durum.cagriBas = Date.now();
  clearInterval(durum.sayacTimer);
  durum.sayacTimer = setInterval(cizSayac, 1000);
  cizSayac();
}
function aramaBitir() { durum.cagriBas = null; clearInterval(durum.sayacTimer); cizSayac(); }

function sonucSec(d) {
  const k = secili(); if (!k) return;
  const s = SONUC[k.tur].find(x => x.d === d); if (!s) return;
  const not = $('#not').value.trim();
  if (s.notZorunlu && !not) { $('#not').focus(); bildir('Önce nedenini nota yaz, sonra tekrar bas'); return; }
  if (s.zaman) return zamanSor(s, not);
  if (s.paket) return paketSor(s, not);
  if (s.wa) return waAc(s.wa, { d, not });
  uygula({ d, not });
}

function uyelikYaz(k, p, tutar) {
  const yenileme = k.tur === 'uye' && k.uyelik && kalan(k) >= 0;
  const bas = yenileme ? tarihAl(k.uyelik.bitis) : new Date(bugunBas());
  const bit = new Date(bas); bit.setMonth(bit.getMonth() + p.ay);
  k.uyelik = { paket: p.ad, ay: p.ay, tutar, baslangic: ymd(bas), bitis: ymd(bit) };
}

function uygula({ d, not, zaman, paket, tutar, wa }) {
  const k = secili(); if (!k) return;
  const once = kopya(k);
  const t = new Date().toISOString();
  const sure = durum.cagriBas ? Math.round((Date.now() - durum.cagriBas) / 1000) : null;
  const sonraki = (saat, gun = 1) => { const x = new Date(); x.setDate(x.getDate() + gun); x.setHours(saat, 0, 0, 0); return x.toISOString(); };
  let ekNot = '';
  switch (d) {
    case 'ulasilamadi':
      k.deneme = (k.deneme || 0) + 1;
      k.ara = k.deneme >= 3 ? null : { neden: `Ulaşılamadı · ${k.deneme}. deneme`, zaman: new Date(Date.now() + 2 * 3600e3).toISOString() };
      if (k.deneme >= 3) ekNot = '3 denemede ulaşılamadı, arama listesinden çıktı';
      break;
    case 'tekrar_ara': k.ara = { neden: 'Tekrar aranacak', zaman }; break;
    case 'dusunecek': k.ara = { neden: 'Düşünecekti, karar için ara', zaman }; break;
    case 'yeniledi': uyelikYaz(k, paket, tutar); k.ara = null; ekNot = `${paket.ad} · ${TL(tutar)} · yeni bitiş ${tarihYaz(k.uyelik.bitis)}`; break;
    case 'yenilemeyecek': case 'dondurma': k.ara = null; break;
    case 'yanlis': k.ara = null; k.yanlisNumara = true; break;
    case 'deneme': k.aday.asama = 'deneme'; k.aday.randevu = zaman; k.ara = { neden: 'Deneme dersi sonrası ara', zaman: new Date(new Date(zaman).getTime() + 16 * 3600e3).toISOString() }; ekNot = 'Randevu: ' + saatYaz(zaman); break;
    case 'teklif': k.aday.asama = 'teklif'; k.ara = { neden: 'Teklif sonrası karar', zaman: sonraki(11) }; break;
    case 'ilgilenmiyor': k.aday.asama = 'kayip'; k.ara = null; break;
    case 'kayit': k.tur = 'uye'; k.aday.asama = 'kayit'; uyelikYaz(k, paket, tutar); k.sonGiris = t; k.ara = null; ekNot = `${paket.ad} · ${TL(tutar)}`; break;
  }
  if (d !== 'ulasilamadi') k.deneme = 0;
  if (wa) k.wa = wa;
  k.durum = d;
  const notSon = [ekNot, not, sure ? `(görüşme ${Math.floor(sure / 60)} dk ${sure % 60} sn)` : ''].filter(Boolean).join(' · ');
  if (not) k.notlar = k.notlar ? k.notlar + '\n' + not : not;
  k.gecmis.push({ t, d, not: notSon, zaman: zaman || null, paket: paket?.ad, tutar: tutar ?? undefined });
  kaydetDb();
  aramaBitir();
  $('#not').value = '';
  if (document.activeElement?.id === 'not') document.activeElement.blur();
  durum.geriAl = once;
  const i = durum.gorunenler.findIndex(x => x.id === k.id);
  cizKenar(); cizListe();
  if (!durum.gorunenler.find(x => x.id === k.id)) {
    const s = durum.gorunenler[Math.min(i, durum.gorunenler.length - 1)];
    durum.seciliId = s ? s.id : k.id;
    if (mobil()) durum.ekran = 'liste';
    cizListe();
  }
  cizKart();
  bildir(`${k.ad}: ${ETIKET[d]}`, true);
}

function geriAl() {
  const o = durum.geriAl; if (!o) return;
  const i = durum.db.kisiler.findIndex(k => k.id === o.id);
  if (i < 0) return;
  durum.db.kisiler[i] = o; durum.geriAl = null; durum.seciliId = o.id;
  kaydetDb(); ciz(); bildir('Geri alındı');
}

let bildirimZaman = null;
function bildir(metin, geriAlinabilir) {
  const b = $('#bildirim');
  b.innerHTML = `<span>${esc(metin)}</span>${geriAlinabilir ? '<button id="geriAlDugme">Geri al <kbd>Z</kbd></button>' : ''}`;
  b.hidden = false;
  if (geriAlinabilir) $('#geriAlDugme').onclick = geriAl;
  clearTimeout(bildirimZaman);
  bildirimZaman = setTimeout(() => { b.hidden = true; }, 5000);
}

// ---------------- zaman seçimi ----------------
function zamanSecenekleri(d) {
  const s = new Date();
  const saat = (h, m = 0, gun = 0) => { const x = new Date(); x.setDate(x.getDate() + gun); x.setHours(h, m, 0, 0); return x; };
  const ileri = (dk) => new Date(s.getTime() + dk * 60000);
  if (d === 'deneme') {
    const l = [];
    if (saat(18) > ileri(60)) l.push(['Bugün 18:00', saat(18)]);
    l.push(['Yarın 07:30', saat(7, 30, 1)], ['Yarın 18:00', saat(18, 0, 1)], ['Yarın 19:30', saat(19, 30, 1)]);
    const cmt = saat(11); cmt.setDate(cmt.getDate() + ((6 - cmt.getDay() + 7) % 7 || 7)); l.push(['Cumartesi 11:00', cmt]);
    return l;
  }
  const l = [['1 saat sonra', ileri(60)], ['3 saat sonra', ileri(180)]];
  l.push(saat(18) > ileri(30) ? ['Bugün 18:00', saat(18)] : ['Yarın 10:00', saat(10, 0, 1)]);
  l.push(['Yarın 14:00', saat(14, 0, 1)], ['3 gün sonra', saat(11, 0, 3)], ['1 hafta sonra', saat(11, 0, 7)]);
  return l;
}
function zamanSor(s, not) {
  durum.bekleyen = { d: s.d, not, zaman: null };
  $('#zamanBaslik').textContent = s.d === 'deneme' ? 'Deneme dersi ne zaman?' : s.d === 'dusunecek' ? 'Ne zaman tekrar soralım?' : 'Ne zaman tekrar arayalım?';
  const l = zamanSecenekleri(s.d);
  $('#hizliZaman').innerHTML = l.map(([ad, z], i) => `<button data-z="${z.toISOString()}" class="${i === 0 ? 'secili' : ''}">${ad}<small>${saatYaz(z)}</small></button>`).join('');
  durum.bekleyen.zaman = l[0][1].toISOString();
  $('#zamanElle').value = '';
  ac('zamanModal');
}

// ---------------- paket seçimi ----------------
function paketSor(s, not) {
  const k = secili();
  durum.bekleyen = { d: s.d, not };
  $('#paketBaslik').textContent = s.d === 'kayit' ? `${k.ad} · yeni üyelik` : `${k.ad} · üyelik yenileme`;
  const onceki = k.uyelik?.paket;
  const ps = durum.ayarlar.paketler;
  let i = Math.max(0, ps.findIndex(p => p.ad === onceki));
  if (s.d === 'kayit') i = ps.findIndex(p => p.ad === 'Yıllık');
  $('#paketler').innerHTML = ps.map((p, j) => `<button class="${j === i ? 'secili' : ''}" data-paket="${j}"><b>${esc(p.ad)}</b><span>${TL(p.fiyat)}</span><small>${p.ay} ay</small></button>`).join('');
  durum.bekleyen.paket = ps[i];
  $('#paketTutar').value = ps[i].fiyat;
  paketOzet();
  ac('paketModal');
}
function paketOzet() {
  const k = secili(), p = durum.bekleyen?.paket; if (!k || !p) return;
  const yenileme = durum.bekleyen.d === 'yeniledi' && k.uyelik && kalan(k) >= 0;
  const bas = yenileme ? tarihAl(k.uyelik.bitis) : new Date(bugunBas());
  const bit = new Date(bas); bit.setMonth(bit.getMonth() + p.ay);
  $('#paketBilgi').textContent = `${yenileme ? 'Mevcut bitişten devam eder' : 'Bugünden başlar'} · yeni bitiş ${bit.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

// ---------------- WhatsApp ----------------
function doldur(metin, k) {
  const x = kalan(k);
  return String(metin || '')
    .replaceAll('{ad}', k.ad.split(' ')[0])
    .replaceAll('{sube}', durum.ayarlar.sube)
    .replaceAll('{bitis}', k.uyelik ? tarihAl(k.uyelik.bitis).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '')
    .replaceAll('{gun}', x != null ? Math.max(0, x) : '')
    .replaceAll('{kalan}', x == null ? '' : x <= 0 ? 'bugün bitiyor' : x === 1 ? 'yarın bitiyor' : `${x} gün sonra bitiyor`)
    .replaceAll('{pasif}', pasifGun(k) ?? '')
    .replaceAll('{paket}', k.uyelik?.paket || '')
    .replaceAll('{paketler}', durum.ayarlar.paketler.map(p => `• ${p.ad}: ${TL(p.fiyat)}`).join('\n'));
}
function waAc(sablon, bekleyen = null) {
  const k = secili(); if (!k) return;
  durum.bekleyen = bekleyen;
  const no = k.wa || (cepMi(k.telefon) ? telYaz(k.telefon) : '');
  $('#waNo').value = no;
  const anahtar = sablon || (k.tur === 'uye' && kalan(k) <= 30 ? 'yenileme' : 'genel');
  $('#waMetin').value = doldur(durum.ayarlar.sablonlar[anahtar], k);
  $('#waAciklama').textContent = WEB ? 'Demo: WhatsApp açılmaz, mesaj kişinin geçmişine kaydedilir.'
    : no ? (bekleyen ? `Sonuç “${ETIKET[bekleyen.d]}” olarak kaydedilecek ve WhatsApp sohbeti açılacak.` : 'WhatsApp sohbeti bu mesajla açılacak; göndermeden önce düzenleyebilirsin.')
    : 'Bu numara sabit hat. Görüşmede alınan cep numarasını yaz.';
  ac('waModal');
  setTimeout(() => (no ? $('#waMetin') : $('#waNo')).focus(), 30);
}
function waGonder() {
  const no = telNorm($('#waNo').value);
  if (!/^5\d{9}$/.test(no)) { $('#waNo').focus(); bildir('Geçerli bir cep numarası yaz (05xx…)'); return; }
  const metin = $('#waMetin').value;
  const k = secili();
  kapat('waModal');
  if (!WEB) window.masa.urlAc(`whatsapp://send?phone=90${no}&text=${encodeURIComponent(metin)}`);
  if (durum.bekleyen) { const b = durum.bekleyen; durum.bekleyen = null; uygula({ ...b, not: [b.not, 'WhatsApp: ' + metin.split('\n')[0]].filter(Boolean).join(' · '), wa: telYaz(no) }); }
  else if (k) { k.gecmis.push({ t: new Date().toISOString(), d: 'not', not: 'WhatsApp mesajı: ' + metin.split('\n')[0] }); kaydetDb(); cizKart(); bildir(WEB ? 'Demo: mesaj kaydedildi' : 'WhatsApp açıldı'); }
}

// ---------------- otomasyon ----------------
function otoKuyruk() {
  const q = [];
  const kamp = new Map((durum.ayarlar.kampanyalar || []).map(c => [c.id, c]));
  for (const k of kisiler()) {
    if (!k.izin || k.yanlisNumara || !cepMi(k.telefon)) continue;
    const gitti = new Set(k.mesajlar.map(m => m.dongu));
    for (const kr of KURALLAR) {
      if (!durum.ayarlar.otomasyon[kr.id]) continue;
      const dongu = kr.uyar(k);
      if (dongu && !gitti.has(dongu) && !q.some(x => x.dongu === dongu)) q.push({ k, kural: kr, dongu, metin: doldur(durum.ayarlar.sablonlar[kr.id], k) });
    }
  }
  for (const x of durum.db.kampanyaKuyruk) {
    const k = durum.db.kisiler.find(y => y.id === x.kisiId), c = kamp.get(x.kampId);
    if (!k || !c || k.silindi || k.mesajlar.some(m => m.dongu === x.dongu)) continue;
    q.push({ k, kural: { id: 'kamp-' + c.id, ad: 'Kampanya · ' + c.ad, yanitAra: true }, dongu: x.dongu, metin: doldur(c.metin, k), kamp: true });
  }
  return q;
}

function mesajGonder(x) {
  const { k, kural, dongu, metin } = x;
  const t = new Date().toISOString();
  k.mesajlar.push({ t, kural: kural.id, kuralAd: kural.ad, dongu, metin, yanit: null });
  k.gecmis.push({ t, d: 'oto', not: kural.ad });
  if (kural.yanitsizGun && !k.ara) k.ara = { neden: `${kural.ad}: mesaja yanıt yok`, zaman: new Date(Date.now() + kural.yanitsizGun * GUN).toISOString(), oto: true };
  if (x.kamp) durum.db.kampanyaKuyruk = durum.db.kampanyaKuyruk.filter(y => y.dongu !== dongu);
  if (WEB) yanitSimule(k.id, k.mesajlar.length - 1, kural);
}

const SIM_OLUMLU = {
  dogum: ['Çok teşekkür ederim 🙏', 'Ne güzel, teşekkürler!'], y30: ['Yıllığa geçersem indirim var mı?', 'Bilgi alabilir miyim?'],
  y7: ['Evet, yenilemek istiyorum', 'Arayabilirsiniz'], doldu: ['Aslında dönmeyi düşünüyordum', 'Fiyat ne kadar?'],
  pasif: ['Haklısınız, bu hafta geliyorum', 'Program konusunda yardım isterim'], aday: ['Deneme dersine gelmek isterim', 'Hafta içi akşam uygunum'], kamp: ['Detay alabilir miyim?', 'İlgileniyorum, arayın lütfen']
};
const SIM_OLUMSUZ = ['Teşekkürler, şimdilik düşünmüyorum', 'Başka şehre taşındım', 'Şu an yoğunum, sonra dönerim'];
function yanitSimule(id, i, kural) {
  const r = Math.random();
  if (r > 0.6) return;
  setTimeout(() => {
    const k = durum.db.kisiler.find(x => x.id === id); if (!k) return;
    const anahtar = kural.id.startsWith('kamp-') ? 'kamp' : kural.id;
    const olumlu = r < 0.42 || anahtar === 'dogum';
    const l = olumlu ? SIM_OLUMLU[anahtar] : SIM_OLUMSUZ;
    yanitKaydet(k, i, olumlu ? 'olumlu' : 'olumsuz', l[Math.floor(Math.random() * l.length)]);
    bildir(`${k.ad} yanıt verdi: ${olumlu ? 'olumlu' : 'olumsuz'}`);
  }, 1800 + Math.random() * 5000);
}

function yanitKaydet(k, i, tur, metin) {
  const m = k.mesajlar[i]; if (!m || m.yanit) return;
  const t = new Date().toISOString();
  m.yanit = { t, tur, metin: metin || (tur === 'olumlu' ? 'İlgileniyor' : 'İlgilenmiyor') };
  k.gecmis.push({ t, d: 'yanit', not: `${tur === 'olumlu' ? 'Olumlu' : 'Olumsuz'} yanıt: ${m.yanit.metin}` });
  const kr = kuralBul(m.kural);
  if (tur === 'olumlu' && kr.yanitAra) k.ara = { neden: `Mesaja olumlu yanıt: “${m.yanit.metin}”`, zaman: t };
  if (tur === 'olumsuz' && k.ara?.oto) k.ara = null;
  kaydetDb(); ciz();
  if (!$('#otoModal').hidden) cizOto();
}

function cizOto() {
  const q = otoKuyruk();
  $('#kurallar').innerHTML = KURALLAR.map(kr => {
    const n = q.filter(x => x.kural.id === kr.id).length;
    return `<div class="kural ${durum.ayarlar.otomasyon[kr.id] ? 'acik' : ''}">
      <label class="anahtar"><input type="checkbox" data-kural="${kr.id}" ${durum.ayarlar.otomasyon[kr.id] ? 'checked' : ''}><i></i></label>
      <div class="kural-ic"><b>${kr.ad}<span class="kural-say">${n ? n + ' bekliyor' : ''}</span></b><span>${kr.ne}</span>
      <details><summary>Mesaj şablonu</summary><textarea data-sablon="${kr.id}" rows="3">${esc(durum.ayarlar.sablonlar[kr.id])}</textarea></details></div></div>`;
  }).join('');
  $('#kuyrukSay').textContent = q.length;
  $('#kuyruk').innerHTML = q.map((x, i) => `<li><div><b>${esc(x.k.ad)}</b><small>${esc(x.kural.ad)}</small><p>${esc(x.metin)}</p></div><button class="duz" data-gonder="${i}">${WEB ? 'Gönder' : 'WhatsApp\'ta aç'}</button></li>`).join('')
    || '<li class="soluk">Bugün gönderilecek mesaj kalmadı.</li>';
  $('#tumunuGonder').hidden = !WEB || !q.length;
  $('#otoNot').textContent = WEB
    ? 'Demo: mesajlar simüle edilir; bir kısmına birkaç saniye içinde yanıt gelir. Olumlu yanıtlar “Bugün aranacaklar”a düşer.'
    : 'Toplu otomatik gönderim için WhatsApp Business API bağlantısı gerekir. Bağlantı kurulana kadar her mesaj tek tıkla WhatsApp\'ta hazır açılır.';
}

// ---------------- kampanyalar ----------------
function kampTarih(mmdd, yil) { const [m, d] = mmdd.split('-').map(Number); return new Date(yil, m - 1, d); }
function kampDurum(c) {
  if (!c.bas) return ['Sürekli', 'lime', 0];
  const b = new Date(bugunBas()), y = b.getFullYear();
  for (const yy of [y - 1, y]) {
    const bas = kampTarih(c.bas, yy); let bit = kampTarih(c.bit, yy); if (bit < bas) bit = kampTarih(c.bit, yy + 1);
    if (b >= bas && b <= bit) return ['Aktif', 'lime', 0];
  }
  let bas = kampTarih(c.bas, y); if (bas < b) bas = kampTarih(c.bas, y + 1);
  const g = Math.round((bas - b) / GUN);
  return [g <= 30 ? `${g} gün sonra başlıyor` : 'Planlandı', g <= 30 ? 'turuncu' : 'gri', g];
}
function kampDonem(c) {
  if (!c.bas) return 'Yıl boyu';
  const f = (x) => kampTarih(x, 2026).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return `${f(c.bas)} – ${f(c.bit)}`;
}
function kampKitle(c) { return kisiler().filter(KITLE[c.kitle].f); }
function kampIstat(c) {
  const kid = 'kamp-' + c.id;
  let gonderilen = 0, olumlu = 0, donusum = 0;
  for (const k of kisiler()) {
    const m = k.mesajlar.filter(x => x.kural === kid);
    if (!m.length) continue;
    gonderilen++;
    if (m.some(x => x.yanit?.tur === 'olumlu')) olumlu++;
    const ilk = Math.min(...m.map(x => new Date(x.t).getTime()));
    if (k.gecmis.some(g => ['yeniledi', 'kayit'].includes(g.d) && new Date(g.t).getTime() >= ilk)) donusum++;
  }
  return { gonderilen, olumlu, donusum };
}
function cizKamp() {
  const yil = new Date().getFullYear();
  const l = durum.ayarlar.kampanyalar.map(c => ({ c, d: kampDurum(c) })).sort((a, b) => a.d[2] - b.d[2]);
  $('#kampListe').innerHTML = l.map(({ c, d }) => {
    const kitle = kampKitle(c), izinli = kitle.filter(k => k.izin && cepMi(k.telefon));
    const dongu = `kamp-${c.id}-${yil}`;
    const bekleyen = durum.db.kampanyaKuyruk.filter(x => x.kampId === c.id).length;
    const ist = kampIstat(c);
    return `<div class="kamp">
      <div class="kamp-ust"><div><b>${esc(c.ad)}</b><small>${kampDonem(c)} · ${KITLE[c.kitle].ad}</small></div><span class="rozet r-${d[1]}">${d[0]}</span></div>
      <textarea data-kamp-metin="${c.id}" rows="3">${esc(c.metin)}</textarea>
      <div class="kamp-alt">
        <span class="kamp-sayi"><b>${izinli.length}</b> kişiye gidebilir${kitle.length > izinli.length ? ` <small>(${kitle.length - izinli.length} kişi izinsiz)</small>` : ''}</span>
        <span class="kamp-sayi">Gönderilen <b>${ist.gonderilen}</b> · Olumlu <b>${ist.olumlu}</b> · Dönüşüm <b>${ist.donusum}</b></span>
        <button class="ana-dugme" data-kamp-gonder="${c.id}" ${izinli.every(k => k.mesajlar.some(m => m.dongu === dongu)) || bekleyen ? 'disabled' : ''}>${bekleyen ? `${bekleyen} mesaj kuyrukta` : 'Kitleye gönder'}</button>
      </div></div>`;
  }).join('');
}
function kampGonder(id) {
  const c = durum.ayarlar.kampanyalar.find(x => x.id === id); if (!c) return;
  const dongu = `kamp-${c.id}-${new Date().getFullYear()}`;
  const hedef = kampKitle(c).filter(k => k.izin && cepMi(k.telefon) && !k.yanlisNumara && !k.mesajlar.some(m => m.dongu === dongu));
  for (const k of hedef) if (!durum.db.kampanyaKuyruk.some(x => x.kisiId === k.id && x.dongu === dongu)) durum.db.kampanyaKuyruk.push({ kisiId: k.id, kampId: c.id, dongu });
  kaydetDb(); cizKamp(); cizKenar();
  bildir(`${c.ad}: ${hedef.length} mesaj otomasyon kuyruğuna eklendi`);
  kapat('kampModal'); cizOto(); ac('otoModal');
}

// ---------------- panel ----------------
function cizPanel() {
  const K = kisiler(), simdi = Date.now(), g30 = simdi - 30 * GUN;
  const uye = K.filter(k => k.tur === 'uye');
  const aktif = uye.filter(k => kalan(k) >= 0);
  const yaklasan = aktif.filter(k => kalan(k) <= 30);
  const son30 = K.flatMap(k => k.gecmis.filter(g => new Date(g.t).getTime() >= g30).map(g => ({ ...g, k })));
  const yenileyen = son30.filter(g => g.d === 'yeniledi');
  const kayit = son30.filter(g => g.d === 'kayit');
  const kaybedilen = son30.filter(g => g.d === 'yenilemeyecek').length + uye.filter(k => kalan(k) < 0 && kalan(k) >= -30 && !k.ara).length;
  const oran = yenileyen.length + kaybedilen ? Math.round(yenileyen.length / (yenileyen.length + kaybedilen) * 100) : 0;
  const ciro = [...yenileyen, ...kayit].reduce((t, g) => t + (Number(g.tutar) || 0), 0);
  const oto = son30.filter(g => g.d === 'oto').length;
  const yanit = son30.filter(g => g.d === 'yanit');
  const olumlu = yanit.filter(g => g.not.startsWith('Olumlu')).length;
  const aranan = son30.filter(g => ARAMA_SONUCLARI.has(g.d)).length;
  const aday = K.filter(k => k.tur === 'aday' || k.aday);
  const huni = [
    ['Potansiyel üye', aday.length],
    ['Ulaşılan', aday.filter(k => k.gecmis.some(g => ULASILAN.has(g.d) || g.d === 'yanit')).length],
    ['Deneme dersi', aday.filter(k => k.gecmis.some(g => g.d === 'deneme')).length],
    ['Teklif', aday.filter(k => k.gecmis.some(g => g.d === 'teklif')).length],
    ['Üye oldu', aday.filter(k => k.aday?.asama === 'kayit').length]
  ];
  const kart = (et, deger, alt) => `<div class="pkart"><span>${et}</span><b>${deger}</b>${alt ? `<small>${alt}</small>` : ''}</div>`;
  const en = huni[0][1] || 1;
  const yanitOran = oto ? Math.round(olumlu / oto * 100) : 0;
  $('#panelIc').innerHTML = `
    <div class="pkartlar">
      ${kart('Aktif üye', aktif.length, `${yaklasan.length} kişinin süresi 30 gün içinde bitiyor`)}
      ${kart('Yenileme oranı', '%' + oran, 'Son 30 gün')}
      ${kart('Satış', TL(ciro), `Son 30 gün · ${yenileyen.length + kayit.length} işlem`)}
      ${kart('Otomasyon', '%' + yanitOran, `${oto} mesajın ${olumlu} tanesine olumlu yanıt`)}
    </div>
    <div class="rapor-iki">
      <div><h3>Aday hunisi</h3>
        <table class="huni">${huni.map(([a, n]) => `<tr><td>${a}</td><td class="cubuk"><i style="width:${Math.round(n / en * 100)}%"></i></td><td>${n}</td></tr>`).join('')}</table></div>
      <div><h3>Önümüzdeki 30 gün bitecek üyelikler</h3>
        <div class="takvim">${Array.from({ length: 30 }, (_, i) => { const n = aktif.filter(k => kalan(k) === i).length; return `<span title="${gunMetni(i)}: ${n} üyelik"><i style="height:${n ? Math.min(100, 22 + n * 26) : 0}%"></i></span>`; }).join('')}</div>
        <div class="takvim-alt"><span>Bugün</span><span>30 gün sonra</span></div></div>
    </div>`;
}

// ---------------- kişi ekleme / içe aktarma ----------------
function yeniKisi(v) {
  const k = {
    id: (v.tur === 'uye' ? 'u-' : 'a-') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ad: v.ad, telefon: v.telefon || '', tur: v.tur, cinsiyet: v.cinsiyet || '', dogum: v.dogum || '', izin: !!v.izin,
    kaynak: v.kaynak || 'Elle eklendi', kayit: new Date().toISOString(),
    ara: null, deneme: 0, durum: null, notlar: v.notlar || '', mesajlar: [], gecmis: [{ t: new Date().toISOString(), d: 'ekle', not: v.kaynak || 'Elle eklendi' }]
  };
  if (v.tur === 'uye') {
    const p = durum.ayarlar.paketler.find(x => x.ad === v.paket) || durum.ayarlar.paketler[0];
    const bit = v.bitis ? tarihAl(v.bitis) : (() => { const x = new Date(bugunBas()); x.setMonth(x.getMonth() + p.ay); return x; })();
    const bas = new Date(bit); bas.setMonth(bas.getMonth() - p.ay);
    k.uyelik = { paket: p.ad, ay: p.ay, tutar: p.fiyat, baslangic: ymd(bas), bitis: ymd(bit) };
    k.sonGiris = new Date().toISOString();
  } else k.aday = { asama: 'yeni', ilgi: v.ilgi || '', randevu: null };
  return k;
}
function ekleAc() {
  $('#yPaket').innerHTML = durum.ayarlar.paketler.map(p => `<option>${esc(p.ad)}</option>`).join('');
  ['#yAd', '#yTel', '#yDogum', '#yBitis', '#yIlgi', '#yNot'].forEach(s => { $(s).value = ''; });
  $('#yIzin').checked = true;
  turSec(durum.filtre === 'uye' ? 'uye' : 'aday');
  ac('ekleModal'); setTimeout(() => $('#yAd').focus(), 30);
}
function turSec(t) {
  $$('#yTur button').forEach(b => b.classList.toggle('secili', b.dataset.tur === t));
  $('#yUyeAlan').hidden = t !== 'uye'; $('#yAdayAlan').hidden = t !== 'aday';
}
function ekleKaydet() {
  const ad = $('#yAd').value.trim(), tel = $('#yTel').value.trim();
  if (!ad) { $('#yAd').focus(); return; }
  if (tel && telNorm(tel).length !== 10) { $('#yTel').focus(); bildir('Telefonu 0 ile başlayan 11 hane yaz'); return; }
  const ayni = tel && kisiler().find(k => telNorm(k.telefon) === telNorm(tel));
  if (ayni) { bildir(`Bu numara zaten kayıtlı: ${ayni.ad}`); return; }
  const tur = $('#yTur .secili').dataset.tur;
  const k = yeniKisi({ ad, telefon: tel ? telYaz(tel) : '', tur, dogum: $('#yDogum').value, izin: $('#yIzin').checked, paket: $('#yPaket').value, bitis: $('#yBitis').value, ilgi: $('#yIlgi').value.trim(), kaynak: $('#yKaynak').value, notlar: $('#yNot').value.trim() });
  durum.db.kisiler.push(k);
  kaydetDb(); kapat('ekleModal');
  durum.gorunum = 'tumu'; durum.filtre = 'hepsi'; durum.arama = ''; $('#ara').value = '';
  ciz(); sec(k.id);
  bildir(`${ad} eklendi${tur === 'aday' && k.izin ? ' · karşılama mesajı otomasyon kuyruğunda' : ''}`);
}

function iceAktar() {
  const metin = $('#iceMetin').value.trim();
  if (!metin) { $('#iceMetin').focus(); return; }
  const satirlar = metin.split(/\r?\n/).filter(x => x.trim());
  const ayirac = satirlar[0].includes('\t') ? '\t' : satirlar[0].includes(';') ? ';' : ',';
  let bas = satirlar[0].toLocaleLowerCase('tr').split(ayirac).map(x => x.trim());
  const baslikVar = bas.includes('ad') || bas.includes('telefon');
  if (!baslikVar) bas = ['ad', 'telefon', 'tur', 'dogum', 'paket', 'bitis'];
  const mevcut = new Set(kisiler().map(k => telNorm(k.telefon)).filter(Boolean));
  let eklenen = 0, atlanan = 0;
  for (const s of satirlar.slice(baslikVar ? 1 : 0)) {
    const h = s.split(ayirac).map(x => x.trim()); const v = {}; bas.forEach((b, i) => { v[b] = h[i] || ''; });
    if (!v.ad) { atlanan++; continue; }
    const tn = telNorm(v.telefon);
    if (tn && mevcut.has(tn)) { atlanan++; continue; }
    const tur = /aday|potansiyel/i.test(v.tur) ? 'aday' : (v.paket || v.bitis || /üye|uye/i.test(v.tur)) ? 'uye' : 'aday';
    const tarih = (x) => { const m = (x || '').match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : ''; };
    durum.db.kisiler.push(yeniKisi({ ad: v.ad, telefon: tn.length === 10 ? telYaz(tn) : '', tur, dogum: tarih(v.dogum), paket: v.paket, bitis: tarih(v.bitis), izin: !/hayır|hayir|yok|0/i.test(v.izin || ''), kaynak: 'İçe aktarıldı' }));
    if (tn) mevcut.add(tn);
    eklenen++;
  }
  kaydetDb(); kapat('iceModal'); ciz();
  bildir(`${eklenen} kişi eklendi${atlanan ? `, ${atlanan} satır atlandı (boş ad ya da kayıtlı numara)` : ''}`);
}

// ---------------- modallar ----------------
const MODALLAR = ['zamanModal', 'paketModal', 'waModal', 'otoModal', 'kampModal', 'panelModal', 'ekleModal', 'iceModal', 'menuModal', 'yardimModal'];
function ac(id) { $('#' + id).hidden = false; document.body.classList.add('modal-acik'); }
function kapat(id) { $('#' + id).hidden = true; if (!modalAcik()) document.body.classList.remove('modal-acik'); }
const modalAcik = () => MODALLAR.some(m => !$('#' + m).hidden);

// ---------------- olaylar ----------------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-sekme],[data-gorunum],[data-id],[data-sonuc],[data-kapat],[data-z],[data-paket],[data-yanit],[data-gonder],[data-kamp-gonder],[data-f],[data-tur]');
  if (!t) { if (e.target.classList.contains('modal')) { const m = e.target.id; kapat(m); durum.bekleyen = null; } return; }
  if (t.dataset.sekme) sekmeSec(t.dataset.sekme);
  else if (t.dataset.gorunum) gorunumSec(t.dataset.gorunum);
  else if (t.dataset.id) sec(t.dataset.id);
  else if (t.dataset.sonuc) sonucSec(t.dataset.sonuc);
  else if (t.dataset.kapat) { kapat(t.dataset.kapat); durum.bekleyen = null; }
  else if (t.dataset.z) { $$('#hizliZaman button').forEach(b => b.classList.toggle('secili', b === t)); durum.bekleyen.zaman = t.dataset.z; $('#zamanElle').value = ''; }
  else if (t.dataset.paket) { $$('#paketler button').forEach(b => b.classList.toggle('secili', b === t)); const p = durum.ayarlar.paketler[+t.dataset.paket]; durum.bekleyen.paket = p; $('#paketTutar').value = p.fiyat; paketOzet(); }
  else if (t.dataset.yanit) { const k = secili(); if (k) { yanitKaydet(k, +t.dataset.yanit, t.dataset.tur, ''); bildir(t.dataset.tur === 'olumlu' ? 'Olumlu yanıt kaydedildi · arama listesine eklendi' : 'Olumsuz yanıt kaydedildi'); } }
  else if (t.dataset.gonder) { const x = otoKuyruk()[+t.dataset.gonder]; if (x) { if (!WEB) window.masa.urlAc(`whatsapp://send?phone=90${telNorm(x.k.telefon)}&text=${encodeURIComponent(x.metin)}`); mesajGonder(x); kaydetDb(); cizOto(); ciz(); } }
  else if (t.dataset.kampGonder) kampGonder(t.dataset.kampGonder);
  else if (t.dataset.f) { durum.filtre = t.dataset.f; durum.seciliId = null; ciz(); }
  else if (t.dataset.tur && t.closest('#yTur')) turSec(t.dataset.tur);
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.kural) { durum.ayarlar.otomasyon[t.dataset.kural] = t.checked; kaydetDb(); cizOto(); cizKenar(); }
  if (t.dataset.sablon) { durum.ayarlar.sablonlar[t.dataset.sablon] = t.value; kaydetDb(); cizOto(); }
  if (t.dataset.kampMetin) { const c = durum.ayarlar.kampanyalar.find(x => x.id === t.dataset.kampMetin); if (c) { c.metin = t.value; kaydetDb(); } }
});

$('#zamanElle').addEventListener('change', (e) => {
  if (!e.target.value || !durum.bekleyen) return;
  $$('#hizliZaman button').forEach(b => b.classList.remove('secili'));
  durum.bekleyen.zaman = new Date(e.target.value).toISOString();
});
$('#zamanTamam').onclick = () => { const b = durum.bekleyen; if (!b) return; kapat('zamanModal'); durum.bekleyen = null; uygula(b); };
$('#paketTamam').onclick = () => {
  const b = durum.bekleyen; if (!b?.paket) return;
  const tutar = parseFloat(String($('#paketTutar').value).replace(/\./g, '').replace(',', '.'));
  if (!tutar) { $('#paketTutar').focus(); return; }
  kapat('paketModal'); durum.bekleyen = null; uygula({ ...b, tutar });
};
$('#waGonder').onclick = waGonder;
$('#eAra').onclick = aramaBaslat;
$('#eWa').onclick = () => waAc(null);
$('#eKopya').onclick = $('#kTel').onclick = () => { const k = secili(); if (k?.telefon) { window.masa.kopyala(telYaz(k.telefon)); bildir('Numara kopyalandı'); } };
$('#kIzin').onclick = () => { const k = secili(); if (!k) return; k.izin = !k.izin; k.gecmis.push({ t: new Date().toISOString(), d: 'izin', not: k.izin ? 'İleti izni verildi' : 'İleti izni geri alındı' }); kaydetDb(); ciz(); };
$('#geri').onclick = listeyeDon;
$('#ara').addEventListener('input', (e) => { durum.arama = e.target.value; cizListe(); if (!mobil()) cizKart(); });
$$('[data-ac]').forEach(b => b.addEventListener('click', () => {
  const m = b.dataset.ac;
  MODALLAR.forEach(x => { if (x !== m) $('#' + x).hidden = true; });
  if (m === 'otoModal') cizOto();
  if (m === 'kampModal') cizKamp();
  if (m === 'panelModal') cizPanel();
  if (m === 'ekleModal') return ekleAc();
  if (m === 'iceModal') $('#iceMetin').value = '';
  ac(m);
}));
$('#tumunuGonder').onclick = () => {
  const q = otoKuyruk(); if (!q.length) return;
  q.forEach(mesajGonder); kaydetDb(); cizOto(); ciz();
  bildir(`${q.length} otomatik mesaj gönderildi · yanıtlar birkaç saniye içinde düşer`);
};
$('#yKaydet').onclick = ekleKaydet;
$('#iceTamam').onclick = iceAktar;
$('#iceDosya').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) $('#iceMetin').value = await f.text(); });
$('#demoSifirla').onclick = () => { if (confirm('Demo verisi baştan oluşturulsun mu? Yaptığın değişiklikler silinir.')) window.masa.sifirla(); };
$('#klasorAc').onclick = () => window.masa.klasorAc();
$('#klasorAc').hidden = WEB;
$('#demoSifirla').hidden = !WEB;

document.addEventListener('keydown', (e) => {
  const yaziyor = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (e.key === 'Escape') {
    const acik = MODALLAR.filter(m => !$('#' + m).hidden);
    if (acik.length) { kapat(acik[acik.length - 1]); durum.bekleyen = null; return; }
    if (durum.ekran === 'detay') { listeyeDon(); return; }
    document.activeElement?.blur(); return;
  }
  if (!$('#zamanModal').hidden && e.key === 'Enter' && !yaziyor) { e.preventDefault(); $('#zamanTamam').click(); return; }
  if (!$('#paketModal').hidden && e.key === 'Enter') { e.preventDefault(); $('#paketTamam').click(); return; }
  if (!$('#waModal').hidden && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); waGonder(); return; }
  if (yaziyor || modalAcik() || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = secili();
  const s = k && SONUC[k.tur].find(x => x.tus === e.key);
  if (s) { e.preventDefault(); sonucSec(s.d); return; }
  switch (e.key.toLowerCase()) {
    case 'enter': e.preventDefault(); aramaBaslat(); break;
    case 'arrowdown': case 'j': e.preventDefault(); kaydir(1); break;
    case 'arrowup': case 'k': e.preventDefault(); kaydir(-1); break;
    case 'w': e.preventDefault(); waAc(null); break;
    case 'c': e.preventDefault(); $('#eKopya').click(); break;
    case 'n': e.preventDefault(); $('#not').focus(); break;
    case 'z': e.preventDefault(); geriAl(); break;
    case '/': e.preventDefault(); $('#ara').focus(); break;
    case 'o': e.preventDefault(); cizOto(); ac('otoModal'); break;
    case 'p': e.preventDefault(); cizPanel(); ac('panelModal'); break;
    case '?': e.preventDefault(); ac('yardimModal'); break;
  }
});
window.addEventListener('resize', () => { if (!mobil() && durum.ekran === 'detay') { durum.ekran = 'liste'; cizKart(); } });

baslat();
