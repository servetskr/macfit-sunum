// Demo verisi: tamamen hayali kişiler. Tarihler bugüne göre üretilir, böylece demo her gün "canlı" görünür.
// Numaralar 0500 ile başlar (kullanımda olmayan hat ön eki).
function demoVeri() {
  let s = 20261027;
  const r = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const sec = (a) => a[Math.floor(r() * a.length)];
  const aralik = (a, b) => a + Math.floor(r() * (b - a + 1));

  const KADIN = ['Elif', 'Zeynep', 'Merve', 'Büşra', 'Ayşe', 'Selin', 'Ece', 'Derya', 'Gizem', 'İrem', 'Melis', 'Cansu', 'Tuğba', 'Esra', 'Pınar', 'Damla', 'Sena', 'Burcu', 'Nazlı', 'Ceren'];
  const ERKEK = ['Emre', 'Burak', 'Mehmet', 'Can', 'Mert', 'Onur', 'Kerem', 'Barış', 'Oğuz', 'Serkan', 'Tolga', 'Umut', 'Furkan', 'Hakan', 'Cem', 'Ali', 'Volkan', 'Arda', 'Kaan', 'Deniz'];
  const SOYAD = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Polat', 'Erdem', 'Tekin', 'Aksoy', 'Güneş', 'Bulut', 'Uçar', 'Ekinci', 'Sevim'];
  const PAKET = [['Aylık', 1, 2400], ['3 Aylık', 3, 6300], ['6 Aylık', 6, 11400], ['Yıllık', 12, 19900], ['Öğrenci Yıllık', 12, 14900]];
  const UYE_KAYNAK = ['Şubeye uğradı', 'Instagram reklamı', 'Arkadaş tavsiyesi', 'Web formu', 'Kurumsal anlaşma'];
  const ADAY_KAYNAK = ['Instagram reklamı', 'Web formu', 'Şubeye uğradı', 'Arkadaş tavsiyesi', 'Google arama'];
  const ILGI = ['Kilo verme', 'Kas kazanımı', 'Pilates & grup dersleri', 'Genel sağlık', 'Kardiyo & dayanıklılık', 'Yüzme', 'Kişisel antrenör'];

  const bugun = new Date(); bugun.setHours(10, 0, 0, 0);
  const an = (gun, saat = 10, dk = null) => { const d = new Date(bugun); d.setDate(d.getDate() + gun); d.setHours(saat, dk ?? aralik(0, 59), 0, 0); return d.toISOString(); };
  const ymd = (d) => d.toLocaleDateString('sv-SE');
  const gunEkle = (gun) => { const d = new Date(bugun); d.setDate(d.getDate() + gun); return d; };
  const ayEkle = (d, ay) => { const x = new Date(d); x.setMonth(x.getMonth() + ay); return x; };

  let no = 0;
  const tel = () => { no++; const n = String(no).padStart(4, '0'); return `0500 000 ${n.slice(0, 2)} ${n.slice(2)}`; };
  const kullan = new Set();
  const isim = (c) => { let a; do { a = sec(c === 'K' ? KADIN : ERKEK) + ' ' + sec(SOYAD); } while (kullan.has(a)); kullan.add(a); return a; };
  const dogum = (kalan) => {
    const d = gunEkle(kalan ?? aralik(9, 355));
    d.setFullYear(bugun.getFullYear() - aralik(19, 52));
    return ymd(d);
  };
  const id = (on) => on + '-' + Math.floor(r() * 1e9).toString(36);

  const kisiler = [];

  // --- Üyeler: [bitişe kalan gün, son girişten beri gün, doğum gününe kalan gün]
  const UYE = [
    [0, 1, null], [3, 2, null], [5, 19, null], [7, 4, null], [2, 1, 0], [6, 3, null],
    [12, 2, null], [18, 5, null], [22, 1, 3], [25, 16, null], [29, 3, null], [15, 1, null], [27, 2, null], [10, 31, null],
    [-2, 6, null], [-5, 9, null], [-11, 15, null], [-20, 25, null], [-34, 40, null], [-48, 52, null], [-70, 75, null]
  ];
  for (let i = 0; i < 26; i++) UYE.push([aralik(35, 330), i < 4 ? aralik(15, 34) : aralik(0, 7), i === 5 ? 1 : i === 9 ? 5 : i === 14 ? 6 : null]);

  for (const [kal, gelmedi, dg] of UYE) {
    const c = r() < 0.52 ? 'K' : 'E';
    const p = kal < 40 && r() < 0.45 ? sec(PAKET.slice(0, 3)) : sec(PAKET);
    const bitis = gunEkle(kal);
    const bas = ayEkle(bitis, -p[1]);
    const kayit = r() < 0.5 ? bas : ayEkle(bas, -aralik(2, 20));
    kisiler.push({
      id: id('u'), ad: isim(c), telefon: tel(), tur: 'uye', cinsiyet: c, dogum: dogum(dg), izin: r() < 0.9,
      kaynak: sec(UYE_KAYNAK), kayit: kayit.toISOString(),
      uyelik: { paket: p[0], ay: p[1], tutar: p[2], baslangic: ymd(bas), bitis: ymd(bitis) },
      sonGiris: an(-gelmedi, aralik(7, 21)), ara: null, deneme: 0, durum: null, notlar: '', mesajlar: [], gecmis: []
    });
  }

  // --- Potansiyel üyeler (adaylar)
  const ASAMA = ['yeni', 'yeni', 'yeni', 'yeni', 'yeni', 'yeni', 'yeni', 'yeni', 'yeni', 'yeni', 'deneme', 'deneme', 'deneme', 'deneme', 'deneme', 'teklif', 'teklif', 'teklif', 'teklif', 'kayip', 'kayip', 'kayip'];
  for (const asama of ASAMA) {
    const c = r() < 0.55 ? 'K' : 'E';
    const once = asama === 'yeni' ? aralik(0, 1) : aralik(3, 20);
    const k = {
      id: id('a'), ad: isim(c), telefon: tel(), tur: 'aday', cinsiyet: c, dogum: r() < 0.6 ? dogum(null) : '', izin: r() < 0.92,
      kaynak: sec(ADAY_KAYNAK), kayit: an(-once, aralik(9, 21)),
      aday: { asama, ilgi: sec(ILGI), randevu: asama === 'deneme' ? an(aralik(-2, 3), sec([7, 18, 19])) : null },
      ara: null, deneme: 0, durum: null, notlar: '', mesajlar: [], gecmis: [{ t: an(-once, 9), d: 'ekle', not: 'Kayıt: ' + '' }]
    };
    k.gecmis[0].not = 'Form/kayıt: ' + k.kaynak;
    kisiler.push(k);
  }
  for (const k of kisiler.filter(k => k.tur === 'uye')) k.gecmis.push({ t: k.kayit, d: 'ekle', not: 'Üye oldu · ' + k.uyelik.paket });

  // --- Geçmiş otomasyon ve aramalar
  const kalanGun = (k) => Math.round((new Date(k.uyelik.bitis + 'T00:00:00') - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5);
  const OLUMLU = {
    y7: ['Evet yenilemek istiyorum, fiyat ne oldu?', 'Bu hafta uğrarım, kampanya var mı?', 'Arayabilirsiniz, uygunum'],
    y30: ['Yıllığa geçersem indirim var mı?', 'Bilgi alabilir miyim?'],
    doldu: ['Aslında dönmeyi düşünüyordum', 'Fiyat bilgisi alabilir miyim?'],
    aday: ['Deneme dersine gelmek isterim', 'Fiyatları öğrenebilir miyim?', 'Hafta içi akşam uygunum']
  };
  const AD = { y7: 'Yenileme · son hafta', y30: 'Yenileme · 30 gün kala', doldu: 'Geri kazanım', aday: 'Aday karşılama', pasif: 'Seni özledik' };
  const mesaj = (k, kural, dongu, gun, yanit) => {
    const t = an(gun, aralik(9, 11));
    const m = { t, kural, kuralAd: AD[kural], dongu, metin: '(Şablon mesaj gönderildi)', yanit: null };
    k.mesajlar.push(m);
    k.gecmis.push({ t, d: 'oto', not: AD[kural] });
    if (yanit) {
      const sabah = new Date(); sabah.setHours(8, aralik(0, 50), 0, 0);
      const yt = (gun < 0 ? new Date(Math.min(sabah.getTime(), Date.now() - aralik(10, 40) * 60000)) : new Date(new Date(t).getTime() + aralik(10, 300) * 60000)).toISOString();
      m.yanit = { t: yt, tur: yanit[0], metin: yanit[1] };
      k.gecmis.push({ t: yt, d: 'yanit', not: (yanit[0] === 'olumlu' ? 'Olumlu yanıt: ' : 'Olumsuz yanıt: ') + yanit[1] });
    }
    return m;
  };
  let sayac = 0;
  for (const k of kisiler) {
    if (!k.izin) continue;
    if (k.tur === 'uye') {
      const g = kalanGun(k);
      if (g >= 0 && g <= 7) {
        const ys = sayac++ % 3;
        const m = mesaj(k, 'y7', 'y7-' + k.uyelik.bitis, -aralik(2, 3), ys === 0 ? ['olumlu', sec(OLUMLU.y7)] : null);
        k.ara = m.yanit ? { neden: `Mesaja olumlu yanıt: “${m.yanit.metin}”`, zaman: m.yanit.t } : { neden: 'Yenileme · son hafta: mesaja yanıt yok', zaman: an(0, 9, 0), oto: true };
      } else if (g >= 8 && g <= 30 && r() < 0.8) {
        const m = mesaj(k, 'y30', 'y30-' + k.uyelik.bitis, -aralik(1, 3), r() < 0.3 ? ['olumlu', sec(OLUMLU.y30)] : null);
        if (m.yanit) k.ara = { neden: `Mesaja olumlu yanıt: “${m.yanit.metin}”`, zaman: m.yanit.t };
      } else if (g < -3 && g >= -30) {
        const yn = r();
        const m = mesaj(k, 'doldu', 'doldu-' + k.uyelik.bitis, -aralik(2, 3), yn < 0.35 ? ['olumlu', sec(OLUMLU.doldu)] : yn < 0.55 ? ['olumsuz', 'Taşındım, başka şehirdeyim'] : null);
        if (m.yanit?.tur === 'olumlu') k.ara = { neden: `Mesaja olumlu yanıt: “${m.yanit.metin}”`, zaman: m.yanit.t };
        else if (!m.yanit) k.ara = { neden: 'Geri kazanım: mesaja yanıt yok', zaman: an(0, 9, 0), oto: true };
      }
    } else if (k.aday.asama === 'yeni') {
      const yn = r();
      const m = mesaj(k, 'aday', 'aday-' + k.id, 0, yn < 0.45 ? ['olumlu', sec(OLUMLU.aday)] : null);
      m.t = k.kayit; k.gecmis[k.gecmis.length - (m.yanit ? 2 : 1)].t = k.kayit;
      if (m.yanit) {
        const yz = new Date(new Date(k.kayit).getTime() + aralik(5, 90) * 60000), s8 = new Date(); s8.setHours(8, aralik(0, 40), 0, 0);
        m.yanit.t = (yz < s8 ? new Date(Math.min(s8.getTime(), Date.now() - 600000)) : yz).toISOString();
        k.gecmis[k.gecmis.length - 1].t = m.yanit.t;
        k.ara = { neden: `Mesaja olumlu yanıt: “${m.yanit.metin}”`, zaman: m.yanit.t };
      }
      else { const z = new Date(new Date(k.kayit).getTime() + 864e5); const d9 = new Date(); d9.setHours(9, 0, 0, 0); k.ara = { neden: 'Aday karşılama: mesaja yanıt yok', zaman: (z < d9 ? d9 : z).toISOString(), oto: true }; }
    } else if (k.aday.asama === 'deneme') {
      k.gecmis.push({ t: an(-aralik(3, 6), 14), d: 'deneme', not: 'Deneme dersi randevusu verildi' });
      k.durum = 'deneme';
      { const z = new Date(new Date(k.aday.randevu).getTime() + 16 * 3600e3); const d9 = new Date(); d9.setHours(9, 30, 0, 0); k.ara = { neden: 'Deneme dersi sonrası ara', zaman: (z < d9 ? d9 : z).toISOString() }; }
    } else if (k.aday.asama === 'teklif') {
      k.gecmis.push({ t: an(-aralik(1, 4), 15), d: 'teklif', not: 'Fiyat teklifi WhatsApp\'tan gönderildi' });
      k.durum = 'teklif';
      k.ara = { neden: 'Teklif sonrası karar', zaman: an(aralik(0, 1), 9, 45) };
    } else if (k.aday.asama === 'kayip') {
      k.gecmis.push({ t: an(-aralik(2, 10), 16), d: 'ilgilenmiyor', not: sec(['Fiyatı yüksek buldu', 'Eve yakın salon tercih etti', 'Şimdilik vazgeçti']) });
      k.durum = 'ilgilenmiyor';
    }
  }

  // --- Bugün yapılmış birkaç arama (günün sayıları boş görünmesin)
  const yenileyen = kisiler.find(k => k.tur === 'uye' && kalanGun(k) >= 30 && kalanGun(k) <= 40) || kisiler[30];
  yenileyen.gecmis.push({ t: an(0, 9, 12), d: 'yeniledi', not: 'Yıllık pakete geçti (görüşme 4 dk 10 sn)', paket: 'Yıllık', tutar: 19900 });
  yenileyen.durum = 'yeniledi';
  const ulasamadik = kisiler.filter(k => k.tur === 'uye' && kalanGun(k) >= 8 && kalanGun(k) <= 30 && !k.ara).slice(0, 2);
  for (const k of ulasamadik) { k.gecmis.push({ t: an(0, 9, 30), d: 'ulasilamadi', not: '' }); k.deneme = 1; k.durum = 'ulasilamadi'; k.ara = { neden: 'Ulaşılamadı · 1. deneme', zaman: an(0, 11, 30) }; }
  const dusunen = kisiler.find(k => k.tur === 'uye' && kalanGun(k) >= 8 && kalanGun(k) <= 30 && !k.ara);
  if (dusunen) { dusunen.gecmis.push({ t: an(0, 9, 48), d: 'dusunecek', not: 'Eşiyle konuşup dönecek' }); dusunen.durum = 'dusunecek'; dusunen.ara = { neden: 'Düşünecekti, karar için ara', zaman: an(1, 11, 0) }; }

  for (const k of kisiler) k.gecmis.sort((a, b) => new Date(a.t) - new Date(b.t));
  return { kisiler, kampanyaKuyruk: [], olusturma: new Date().toISOString(), demo: true };
}
