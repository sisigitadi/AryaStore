# 🛍️ AryaStore : Global Fashion & Apparel E-Commerce Engine

> **Editorial Minimalist Fashion Storefront & Operational RBAC Admin Dashboard v2.0**  
> Dibangun dengan arsitektur serverless **Google Apps Script (GAS) + Google Sheets Database** dan dapat dijalankan langsung sebagai Single Page Application (SPA) di **GitHub Pages**.  
> Kepatuhan Standar: **RetroBOT Core v3.0** & **antislop Filter**

🌐 **Demo Live:** [https://sisigitadi.github.io/AryaStore/](https://sisigitadi.github.io/AryaStore/)  
📦 **Repositori:** [https://github.com/sisigitadi/AryaStore](https://github.com/sisigitadi/AryaStore)

---

## 🚀 Pembaruan Rilis v2.2.0 (Strict Inventory Governance, Web-Style Admin Navigation & SKU Variant Lifecycle)

1. **Navigasi Konsol Web Tanpa Tab Geser (Web-Style Admin Navigation)**:
   - **Eliminasi Total Tab Geser Mobile**: Menghilangkan tab strip geser horizontal pada perangkat layar sentuh, digantikan dengan selektor modul dropdown berbasis web yang bersih (`#mobile-admin-tab-select`) dan selalu terlihat tanpa harus menggulir atau menggeser layar ke samping.
   - **Bilah Samping Vertikal Desktop**: Pada resolusi tablet/desktop (`md:`), navigasi ditampilkan sebagai bilah menu samping vertikal berpenanda panah status aktif dan penomoran modul yang rapi.
   - **Sinkronisasi Otomatis**: Penggantian modul lewat tombol sidebar maupun dropdown mobile selalu sinkron secara reaktif ke panel konten dan pemfilteran hak akses peran (Super Admin, Store Manager, Customer Service).

2. **Tata Kelola Inventaris Ketat (Ready, Menipis, Habis & Anti-Overselling)**:
   - **Kalkulasi Total Stok Varian**: Total ketersediaan produk dihitung otomatis dari akumulasi seluruh SKU varian aktif (`p.variants`).
   - **Lencana Status Inventaris**:
     - *Ready Stock (> 5 unit)*: Lencana hijau zamrud pada tabel konsol dan etalase toko.
     - *Stok Menipis (1 - 5 unit)*: Lencana amber peringatan pada kartu katalog dan modal detail produk.
     - *Stok Habis (0 unit)*: Lencana merah tebal *STOK HABIS* (*SOLD OUT*), foto produk otomatis diberi efek visual desaturasi (grayscale), tombol tambah ke tas dinonaktifkan (*disabled cursor-not-allowed*), dan kuantitas stepper dikunci.
   - **Proteksi Penjualan Berlebih (Anti-Overselling)**:
     - Keranjang belanja membatasi penambahan barang sesuai batas stok fisik maksimal per SKU.
     - Validasi transaksi ketat pada backend (`createOrder`) dengan mutex lock: pesanan ditolak otomatis jika stok fisik tidak mencukupi.
     - Pengurangan stok seketika (*instant decrement*): begitu invoice dibuat, stok varian di database dan memori browser langsung berkurang dan etalase toko segera menampilkan status terkini tanpa perlu muat ulang halaman.

3. **Manajemen Siklus Hidup Katalog & Matriks Varian SKU Lengkap**:
   - **Filter & Pencarian Inventaris Admin**: Bilah pencarian instan berdasarkan nama artikel, SKU, atau kategori, serta tombol filter cepat: *Semua*, *Ready Stock*, *Stok Menipis (<= 5)*, dan *Stok Habis (0)*.
   - **Matriks Varian SKU Terbuka (Expandable Variant Accordion)**: Tombol *[▾ X SKU]* membuka sub-tabel varian per produk yang menampilkan kode SKU, warna, ukuran, foto varian, dan status ketersediaan.
   - **Pembaruan Stok Langsung (Inline Stock Editor)**: Operator dapat langsung mengetikkan angka stok baru di kolom input tabel dan sistem menyimpannya via `updateVariantStock` dengan tanda centang sukses instan.
   - **CRUD Varian & Produk Lengkap**:
     - *Tambah SKU Baru*: Modal `#admin-variant-modal` dengan validasi keunikan SKU.
     - *Edit Varian*: Mengubah warna, ukuran, foto varian, dan stok fisik secara terpadu.
     - *Hapus Varian*: Menghapus SKU varian tertentu (`deleteVariant`) dengan konfirmasi keamanan.
     - *Hapus Produk*: Menghapus artikel busana (`deleteProduct`) sekaligus membersihkan seluruh baris varian SKU terkait secara bersih.

---

## 🚀 Pembaruan Rilis v2.1.0 (Strict RBAC, Dynamic Storefront CMS & Mobile Ergonomics)

1. **Tata Kelola Otorisasi Ketat (RBAC v2.1)**:
   - **Super Admin (9999)**: Akses menyeluruh 11 modul, manajemen rahasia API kurir, PIN otorisasi, reset database, pembatalan pesanan, dan ongkir manual.
   - **Store Manager (8888)**: Kurasi katalog produk, foto varian warna, pesanan, bundling, diskon, dan manajemen konten etalase (CMS).
   - **Customer Service (7777)**: Penanganan langsung pesanan, pelacakan resi, retur, dan direktori pelanggan (ongkir manual dan opsi pembatalan terkunci demi kepatuhan SOP).
   - **Akuntabilitas Operator & Kunci Sesi**: Setiap aksi login mencatat nama petugas di `AuditLogs` (`Role (Operator Name)`), serta dilengkapi auto-lock inaktivitas 30 menit.
2. **Dynamic Storefront CMS (Zero Dead Content)**:
   - Seluruh teks hero, judul lookbook, deskripsi, CTA, pengumuman atas, 4 kartu nilai kepercayaan (Trust Bar), dan profil studio dapat diubah langsung dari Admin Console Tab 8.
   - Unggah foto editorial lookbook utama langsung ke Google Drive publik via `uploadHeroImage`.
   - Sinkronisasi dwi-bahasa real-time (ID/EN) saat pelanggan mengganti bahasa toko.
3. **Optimalisasi Ergonomi Mobile**:
   - Bebas auto-zoom iOS Safari (input teks 16px pada mobile).
   - Touch target minimal 44x44px di seluruh kontrol interaktif.
   - Navigasi admin horizontal scrollable pill bar pada layar sentuh.

## ✨ Fitur Utama (v2.0.0 Global Expansion)

### 🛍️ Storefront Pelanggan Global
1. **Desain Editorial Mode Berkelas**: Tipografi serif kontemporer berpadu sans-serif modern dengan palet warna natural (#FAFAF9, #1C1917, #A8A29E, dan aksen terracotta #C2410C), bersih tanpa elemen generik kecerdasan buatan.
2. **Dukungan Dwibahasa Penuh (ID & EN Bilingual)**: Pengalihan bahasa instan tanpa memuat ulang halaman (*client-side i18n dictionary*), dilengkapi deskripsi busana bahasa Inggris alami.
3. **Konversi Multi-Valas 8 Mata Uang Dunia**: Mendukung IDR, USD, SGD, MYR, EUR, AUD, GBP, dan JPY dengan kalkulasi nilai tukar otomatis di seluruh katalog, modal produk, kartu bundling, dan keranjang.
4. **Katalog 19 Busana Terverifikasi Visual**: 19 artikel pakaian terkurasi dalam 5 kategori (Outerwear, Tops, Bottoms, Footwear, Accessories) dengan 73 varian SKU ukuran XS s.d. 5XL dan bobot gram riil.
5. **Flash Sale Countdown & 2 Paket Bundling Busana**: Penghitung waktu mundur live dan kartu outfit bundling kombinasi (Atelier Monochrome Set & Urban Terracotta Duo) dengan tombol aksi cepat `+ Ambil Paket Bundle`.
6. **Multi-Attribute Filter & Pencarian Lengkap**: Filter instan berdasarkan kategori, slider batas harga, chip ukuran pakaian XS-5XL, badge koleksi, serta pengurutan harga dan rilisan terbaru.
7. **Mesin Ekspedisi Hibrida (Live Carrier RajaOngkir Komerce, Biteship & Fallback Matriks Otomatis)**:
   - Pencarian tujuan otomatis (*typeahead lookup*) untuk kota/kecamatan/kode pos domestik dan negara internasional.
   - Pilihan 4 mode operasional: `AUTO`, `RAJAONGKIR`, `BITESHIP`, dan `MATRIX`.
   - Live real-time rate calculator untuk kurir terkemuka (JNE, SiCepat, J&T, POS, TIKI, Anteraja, Paxel, DHL, FedEx, dll).
   - Fallback cerdas tanpa jeda (*seamless fallback*) ke matriks zona & berat jika API pihak ketiga belum diatur atau kuota habis.
   - Bilah progres bebas ongkir (*Free Shipping Progress Bar*) dinamis menuju ambang belanja gratis ongkir (default Rp 1.500.000).
8. **Slide-Over Cart Drawer & WhatsApp Checkout**:
   - Validasi kupon promo aktif (`WELCOME10`, `HEMAT50K`, `GLOBALSHIP`).
   - Generator draf pesan pemesanan otomatis dwibahasa ke WhatsApp merchant dengan nomor invoice unik sekuensial (`INV-YYYYMM-XXX`).
9. **Tautan Toko Marketplace & Media Sosial**: Akses cepat ke toko resmi di Shopee, Tokopedia, dan TikTok Shop per-produk, serta tautan kanal Instagram, TikTok, YouTube, Pinterest, dan WhatsApp.
10. **Generator Barcode SKU & Kode QR Produk**:
    - Barcode Code128 1D berbasis SVG murni untuk identifikasi SKU gudang.
    - Kode QR 2D interaktif yang langsung membuka deep-link produk.
    - Fitur Cetak Label Hangtag Fisik (@media print) berukuran standar industri 50mm x 90mm.
11. **Pelacak Pesanan & Bukti Bayar Mandiri**: Pencarian status transaksi via invoice dan WhatsApp, formulir unggah struk transfer ke Google Drive, serta pengajuan tukar ukuran (*size exchange* / refund `RTR-YYYYMM-XXX`).
12. **Hosting Foto Produk & Galeri Varian Warna Google Drive (Live Color Swapping)**:
    - Pengelola toko dapat mengunggah foto produk utama dan foto varian warna berbeda langsung ke Google Drive via fungsi `uploadProductImage` dengan kompresi otomatis di sisi klien.
    - Pada kartu katalog dan modal detail produk, memilih warna swatch langsung menukar foto produk utama ke foto warna yang sesuai secara halus (fade 150ms), dilengkapi deretan thumbnail foto warna.
13. **Header Sticky Terpadu & Aksesibilitas Kontrol Permanen**:
    - Kontainer sticky terpadu (`sticky top-0 z-40`) yang menempel kokoh pada viewport saat digulir ke posisi mana pun di halaman, dilengkapi elevasi bayangan dinamis (`shadow-md`).
    - Pemilih Valas (8 mata uang dunia) dan tombol Tas Belanja tetap dapat diakses secara instan oleh pelanggan di seluruh perangkat (desktop dan ponsel) tanpa perlu repot menggulir kembali ke atas (*zero scroll back*).
14. **Sistem Animasi Mikro & Interaksi Taktil Proporsional (MOTION 2)**:
    - Efek elevasi kartu produk (*card lift -3px*), zoom foto produk halus (*scale 105%*), dan bilah aksi cepat (*quick view*) saat kursor berada di atas kartu.
    - Animasi kemunculan bertahap (*smooth scroll reveal*) dengan `IntersectionObserver` saat kartu busana memasuki layar.
    - Umpan balik taktil pop (*badge bounce pop*) pada ikon tas belanja dan wishlist saat item ditambahkan, serta animasi slide-in pada notifikasi toast.
    - Animasi transisi dialog modal lembut (*scale & fade enter*) dan laci keranjang belanja (*smooth drawer slide*).

### 🛡️ Dashboard Admin (RBAC Berbasis PIN)
1. **Role-Based Access Control (RBAC)**:
   - **Super Admin** (PIN: `9999`): Akses penuh ke seluruh menu dan pengaturan global.
   - **Store Manager** (PIN: `8888`): Akses katalog produk, stok varian SKU, pesanan, kampanye, dan ekspor feed katalog.
   - **Customer Service** (PIN: `7777`): Akses pemrosesan pesanan, bukti transfer, antrean retur, dan direktori pelanggan.
2. **Ringkasan KPI 4 Metrik**: Total Pendapatan, Total Pesanan, Unit Terjual, dan Jumlah Pelanggan.
3. **Manajemen Pesanan & Konfirmasi Ongkir Manual**: Input biaya ongkos kirim manual secara inline yang langsung mengkalkulasi ulang *Grand Total*, pratinjau bukti transfer gambar, dan progresi status bertahap.
4. **Analisis Penjualan, Corong Konversi & Atribusi UTM**:
   - Grafik batang corong konversi 4 tahap (*Product Views* -> *Add to Cart* -> *WA Checkout* -> *Order Completed*).
   - Analisis sumber trafik dan efektivitas iklan (*UTM Source*, *Campaign*, *gclid*, *fbclid*, *ttclid*).
5. **Ekspor Feed Katalog Produk CSV**: Ekspor satu-klik untuk 3 saluran iklan utama: **Google Merchant Center CSV**, **Meta Catalog CSV**, dan **TikTok Catalog CSV**.
6. **Panel Diagnostik Piksel Langsung (Live Diagnostics)**: Panel pemantau status koneksi piksel iklan dan rekaman 10 aktivitas event pelacakan real-time.
7. **Manajemen Foto & Galeri Varian Warna Google Drive**: Input foto utama dan deretan foto warna pakaian per produk (`+ Tambah Foto Warna Lain`) yang langsung diunggah ke Google Drive dan dinormalisasi ke URL Google CDN berkecepatan tinggi.
8. **Modul Operasional Lengkap**: Manajemen Kupon, Direktori Pelanggan, Editor Kampanye & Bundling, Antrean Retur/Refund, Cetak Hangtag Massal, dan System Audit Log.

---

## 📈 Technical SEO & Tracking Integrations

- **Aset SEO Lengkap**: `robots.txt` ramah perayap, `sitemap.xml` XML sitemap index dengan anotasi `xhtml:link` hreflang untuk seluruh artikel dan bahasa, URL kanonikal, dan tag OpenGraph / Twitter Cards.
- **Data Terstruktur Schema.org (JSON-LD)**: Menyediakan skema `Organization`, `WebSite` dengan SearchAction, `ItemList`, dan skema dinamis `Product` / `Offer`.
- **Integrasi Piksel Iklan Terpadu**:
  - Google Analytics 4 (`GA4_MEASUREMENT_ID`)
  - Google Ads Conversion & Remarketing (`GOOGLE_ADS_ID`, `GOOGLE_ADS_CONVERSION_LABEL`)
  - Google Tag Manager (`GTM_ID`)
  - Meta / Facebook Pixel (`META_PIXEL_ID`)
  - TikTok Pixel (`TIKTOK_PIXEL_ID`)
- **Google Consent Mode v2**: Banner persetujuan cookie ramping dengan status default `denied` hingga disetujui pengunjung.

---

## 📁 Struktur Berkas Repositori

```
AryaStore/
├── index.html        # Single Page Application (Storefront Global + Dashboard Admin RBAC)
├── code.gs           # All-in-One Server-Side Backend API (32+ endpoint GAS, LockService, Google Drive)
├── setup.gs          # Skrip inisialisasi skema 10 sheet & injeksi 19 produk terkurasi (idempotent seed)
├── PRD.md            # Product Requirements Document 2-Zona v2.0 (Blueprint & Living Context)
├── design.md         # Sistem desain visual, token warna editorial, dan kepatuhan antislop v2.0
├── AGENTS.md         # Panduan rekayasa sistem, kontrak pengembang, dan konvensi teknis v2.0
├── robots.txt        # Kebijakan perayapan mesin pencari & pointer ke sitemap
├── sitemap.xml       # Indeks peta situs XML produk, bundling & halaman statis
└── README.md         # Dokumentasi arsitektur, panduan konfigurasi & panduan deploy (file ini)
```

---

## 🚀 Panduan Deployment ke Google Apps Script (100% Serverless Gratis)

Aplikasi ini dapat dipublikasikan menggunakan backend serverless Google Sheets & Google Apps Script:

### 1. Buat Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.new).
2. Beri nama spreadsheet: **AryaStore Database**.

### 2. Buka Apps Script Editor
1. Klik menu **Extensions (Ekstensi)** > **Apps Script**.
2. Beri nama proyek: **AryaStore Engine**.

### 3. Salin Kode Proyek
1. Buka file **`Code.gs`**, hapus isinya, dan tempelkan seluruh isi dari [`code.gs`](./code.gs).
2. Klik tanda **`+`** di samping *Files* > pilih **Script**, beri nama **`setup`**, lalu tempelkan isi dari [`setup.gs`](./setup.gs).
3. Klik tanda **`+`** di samping *Files* > pilih **HTML**, beri nama **`index`**, lalu tempelkan seluruh isi dari [`index.html`](./index.html).
4. Tekan **`Ctrl + S`** untuk menyimpan proyek.

### 4. Inisialisasi Database (1-Click)
- Pilih fungsi **`setupDatabase`** dari dropdown fungsi di bilah atas Apps Script, lalu klik **Run (Jalankan)**.
- Izinkan otorisasi akses akun Google Anda.
- Spreadsheet Anda otomatis terisi 10 sheet lengkap beserta 19 artikel fashion terkurasi awal, varian ukuran XS s.d. 5XL, paket bundling, kupon diskon, dan seluruh parameter pengaturan toko.

### 5. Deploy sebagai Web App Publik
1. Klik tombol **Deploy** di pojok kanan atas > pilih **New deployment**.
2. Klik ikon gerigi > pilih **Web app**.
3. Atur konfigurasi:
   - **Execute as**: `Me (email-anda@gmail.com)`
   - **Who has access**: `Anyone` (agar dapat diakses pelanggan umum).
4. Klik **Deploy** dan salin **Web App URL** Anda.

---

## ⚙️ Konfigurasi Toko, Integrasi Ekspedisi & Piksel Iklan (Admin Settings)

Setelah masuk ke Dashboard Admin menggunakan PIN Super Admin (`9999`), Anda dapat mengonfigurasi parameter sistem pada tab **Pengaturan**:
1. **Nomor WhatsApp**: Ubah `WA_NUMBER` dengan nomor tujuan transaksi (format internasional tanpa tanda plus, contoh: `6281234567890`).
2. **Integrasi Ekspedisi Live (RajaOngkir & Biteship)**:
   - **Mode Ekspedisi (`SHIPPING_PROVIDER`)**: Pilih salah satu dari 4 opsi:
     - `AUTO` (Rekomendasi): Memprioritaskan tarif live RajaOngkir atau Biteship, dengan fallback otomatis ke Matriks Zona jika kunci API belum disetel atau koneksi gagal.
     - `RAJAONGKIR`: Khusus live rate Komerce RajaOngkir v2.
     - `BITESHIP`: Khusus live rate Biteship v1.
     - `MATRIX`: Murni kalkulasi tabel zona & berat tanpa memerlukan API key eksternal.
   - **Setup RajaOngkir (Komerce API v2)**:
     - Daftar akun di `komerce.id` atau `rajaongkir.com` dan salin API Key Anda.
     - Masukkan API Key ke kolom `RAJAONGKIR_API_KEY`.
     - Masukkan ID Kecamatan asal pengiriman ke `RAJAONGKIR_ORIGIN_ID` (default: `17470` untuk Jakarta Selatan).
     - Atur kurir domestik (`RAJAONGKIR_COURIERS_DOMESTIC`) dan internasional (`RAJAONGKIR_COURIERS_INTL`).
     - Tekan tombol **"Uji Koneksi RajaOngkir"** untuk memvalidasi status koneksi server.
   - **Setup Biteship API v1**:
     - Daftar di `biteship.com`, buka menu Integrasi/API, dan salin Secret Key / API Key Anda.
     - Masukkan API Key ke kolom `BITESHIP_API_KEY`.
     - Masukkan kode pos gudang asal ke `BITESHIP_ORIGIN_POSTAL_CODE` (default: `12190`).
     - Tentukan daftar kurir aktif di `BITESHIP_COURIERS`.
     - Tekan tombol **"Uji Koneksi Biteship"** untuk memvalidasi integrasi.
   - **Editor Matriks Tarif Zona (`SHIPPING_RATES_JSON`)**:
     - Kolom editor JSON langsung untuk mengubah tarif flat dan tarif per-kg 8 zona domestik dan 8 zona internasional secara fleksibel.
     - Atur batas belanja bebas ongkir pada `FREE_SHIPPING_THRESHOLD_IDR` (default: Rp 1.500.000).
3. **Piksel Pelacak Digital**: Masukkan ID akun Anda untuk GA4, Google Ads, GTM, Meta Pixel, atau TikTok Pixel. Tag pelacak akan aktif secara otomatis.
4. **Mata Uang & Kurs**: Perbarui nilai tukar valuta asing pada kolom `CURRENCY_RATES_JSON`.
5. **Marketplace & Sosial**: Isi tautan toko Shopee, Tokopedia, TikTok Shop, serta akun Instagram dan media sosial brand Anda.
6. **Folder Google Drive Foto Produk**: Sesuaikan `DRIVE_PRODUCTS_FOLDER_NAME` (default: `ARYASTORE_PRODUCTS`) untuk menentukan nama folder Google Drive penampung foto katalog produk dan galeri varian warna pakaian.

---

## 🎨 Palet Warna & Tipografi

- **Paper / Base**: `#FAFAF9` (Stone-50, Off-white bernuansa kertas hangat)
- **Surface / Card**: `#FFFFFF` (Pure White dengan garis batas hairline)
- **Ink / Primary Text**: `#1C1917` (Stone-900, Charcoal elegan kontras tinggi)
- **Accent**: `#C2410C` (Terracotta / Orange-700 hangat bernada kerajinan kriya)
- **Accent Hover**: `#9A3412` (Terracotta lebih pekat saat disentuh)
- **Typography**: Display serif `Playfair Display` berpadu dengan UI sans-serif `Plus Jakarta Sans`.
- **Dial Desain**: **ENERGY 2 / RHYTHM 2 / MOTION 1** (Estetika majalah mode tenang, teratur, dan responsif).

---

## 📄 Lisensi & Hak Cipta

Dikelola secara independen oleh **AryaStore**. Kepatuhan standar rekayasa sistem RetroBOT v3.0 dan antislop.
