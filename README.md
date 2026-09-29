# Grab2Text

Linux sistem tepsisinde çalışan ekran OCR aracı. Varsayılan kısayol **Super (⌘) + Sol Shift + 1**. Kısayola basıp ekranın bir bölümünü sürükleyerek seçin; bulunan metin panoya kopyalanır.

Wayland oturumlarında uygulama XWayland ile açılır ve ekranı KWin üzerinden kendi seçim ekranına bellekte alır. KWin yetkisi için uygulama `~/.local/share/applications/grab2text.desktop` dosyasını oluşturur.

## Çalıştırma

- Node.js ve npm kurun.
- Sistem OCR motoru olarak `tesseract` kurun. Türkçe OCR modeli projeyle birlikte gelir ve İngilizce modeliyle beraber kullanılır.
- Proje klasöründe `npm install` ve ardından `npm start` çalıştırın.

Tepsi menüsünden ayarlar, son 50 öğelik geçmiş, sistemle başlat ve tamamen kapat seçeneklerine ulaşılır. OCR için ekran kırpımı bellekte işlenir ve diske yazılmaz. Geçmiş metinleri uygulamanın kullanıcı ayarlarında saklanır.
