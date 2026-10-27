// Web demosu için veri katmanı: masaüstündeki window.masa yoksa tarayıcıda (localStorage) çalışır.
// Demo modunda arama ve WhatsApp gerçekten açılmaz; otomatik mesaj yanıtları simüle edilir.
if (!window.masa) {
  const ANAHTAR = 'macfit-uye-masasi-v1';
  window.masa = {
    ortam: 'web',
    veriAl: async () => { try { return JSON.parse(localStorage.getItem(ANAHTAR)); } catch { return null; } },
    dbYaz: async (db) => { try { localStorage.setItem(ANAHTAR, JSON.stringify(db)); } catch {} return true; },
    urlAc: async () => false,
    klasorAc: async () => false,
    kopyala: async (m) => { try { await navigator.clipboard.writeText(m); } catch {} return true; },
    degisince: () => {},
    sifirla: () => { try { localStorage.removeItem(ANAHTAR); } catch {} location.reload(); }
  };
}
