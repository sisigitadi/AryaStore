# Product Requirements Document (PRD): AryaStore E-Commerce Engine

> **Spesifikasi Resmi Platform Global Fashion & Apparel E-Commerce Terpadu (Storefront & RBAC Admin Dashboard)**  
> Versi Dokumen: **v2.0.0 (Global E-Commerce Expansion, Technical SEO & Internationalization)**  
> Arsitektur Target: **Serverless Google Apps Script + Google Sheets Database**  
> Standar Kepatuhan: **RetroBOT Core v3.0 & antislop Filter**

---

## ZONA ATAS: SPESIFIKASI KEBUTUHAN PRODUK (BLUEPRINT v2.0)

### 1. Identitas & Ruang Lingkup Produk

#### 1.1 Profil Sistem & Brand

- **Nama Resmi Brand / Toko**: **AryaStore** (Modern Minimalist Fashion & Curated Apparel).
- **Domain Publikasi / Basis URL**: `https://sisigitadi.github.io/AryaStore/`
- **Tujuan Utama**: Menyediakan platform e-commerce fashion kurasi tingkat global dengan storefront editorial berkonversi tinggi, checkout WhatsApp multibahasa, konversi nilai tukar multi-valas dunia, perhitungan ongkir otomatis berbasis zona geografis dan bobot pakaian, verifikasi bukti pembayaran mandiri via Google Drive, integrasi eksternal marketplace, generator hangtag barcode gudang (@media print), pelacak analitik digital multi-platform dengan Consent Mode v2, serta panel operasional internal berbasis peran (RBAC dengan autentikasi PIN).
- **Dukungan Bahasa Ganda (Bilingual i18n)**: Antarmuka mendukung penuh **Bahasa Indonesia (ID)** dan **Bahasa Inggris (EN)** yang dapat dialihkan secara instan melalui sakelar ringkas di navbar maupun drawer menu seluler.

#### 1.2 Target Pengguna & Matriks Hak Akses (RBAC Berbasis PIN)

Sistem melayani dua segmen pengguna secara terpisah:

1. **Pelanggan Publik Global (Storefront Shoppers)**:
   - Menjelajahi katalog busana minimalis dengan filter multi-atribut (Kategori: Outerwear, Tops, Bottoms, Footwear, Accessories; Slider Harga Maksimal; Chip Ukuran XS hingga 5XL; dan Filter Badge Koleksi).
   - Memilih varian warna editorial dan ukuran dengan pengecekan ketersediaan stok fisik langsung (*real-time*).
   - Memilih mata uang preferensi dari 8 valuta dunia (`IDR`, `USD`, `EUR`, `SGD`, `MYR`, `JPY`, `GBP`, `AUD`) dengan konversi harga otomatis.
   - Mengalkulasi estimasi biaya pengiriman berdasarkan zona alamat dan berat kumulatif pakaian (gram) serta memantau bilah progres bebas ongkir (Free Shipping Threshold, default Rp 1.500.000).
   - Membaca deskripsi dwibahasa dan mengakses tautan toko resmi di Shopee, Tokopedia, atau TikTok Shop bila ingin berbelanja lewat marketplace rekanan.
   - Menyimpan koleksi busana favorit ke Wishlist lokal (*client-side localStorage*) tanpa perlu proses registrasi akun yang rumit.
   - Melakukan checkout via WhatsApp dengan format draf pesan pesanan dwibahasa yang rapi dan terstruktur.
   - Melacak status pesanan (*order tracking*), mengunggah bukti pembayaran struk transfer langsung ke Google Drive, dan mengajukan permohonan penukaran ukuran (*size exchange return*).
2. **Tim Operasional Internal (RBAC Berbasis PIN)**:
   Autentikasi panel admin diamankan dengan PIN numerik yang divalidasi ke lembar kerja `Settings`:
   - **Super Admin (PIN Default: `9999`)**: Akses penuh ke seluruh menu (Ringkasan KPI, Manajemen Produk & Varian SKU, Manajemen Pesanan & Ongkir Manual, Analisis Konversi Funnel, Manajer Kupon Promo, Direktori Pelanggan, Editor Kampanye Flash Sale & Bundling, Antrean Retur & Refund, Log Audit Keamanan, Ekspor Feed Produk CSV, Panel Diagnostik Piksel, dan Konfigurasi Pengaturan Global).
   - **Store Manager (PIN Default: `8888`)**: Akses ke operasional katalog dan pemenuhan pesanan (Katalog Produk, Stok Varian SKU, Manajemen Pesanan & Ongkir, Editor Kampanye Flash Sale & Bundling, Ekspor Feed Produk CSV, serta Cetak Hangtag Barcode Massal).
   - **Customer Service (PIN Default: `7777`)**: Akses ke layanan purna jual (Manajemen Pesanan, Verifikasi Bukti Transfer, Antrean Retur & Refund, dan Direktori Pelanggan).

---

### 2. Tujuh Fitur Utama v2.0 & Tiga Add-On Strategis

Platform versi 2.0 memperkenalkan 7 pilar kapabilitas e-commerce global serta 3 add-on terpadu:

#### 2.1 Fitur 1: Multi-Currency (IDR, USD, SGD, MYR, EUR, AUD, GBP, JPY)

- Mendukung 8 mata uang dunia dengan nilai tukar yang dapat disinkronkan atau disetel secara fleksibel di lembar kerja `Settings` via `CURRENCY_RATES_JSON`.
- Konversi harga berjalan instan di sisi browser pengguna tanpa reload halaman, berlaku konsisten pada katalog, modal produk, kartu bundling, dan keranjang belanja.

#### 2.2 Fitur 2: Storefront Dwibahasa Penuh (ID & EN Bilingual i18n)

- Kamus terjemahan lokal (*client-side i18n dictionary*) mencakup seluruh elemen antarmuka: navigasi, tombol filter, form checkout, notifikasi modal, dan pesan status pesanan.
- Data produk memuat nama dan deskripsi ganda (`name_en`, `description_en`) sehingga pembeli internasional memperoleh pengalaman berbelanja yang alami.
- Preferensi bahasa tersimpan di `localStorage` dan dapat ditentukan via parameter URL (contoh: `?lang=en`).

#### 2.3 Fitur 3: Mesin Ekspedisi Hibrida (Live Carrier RajaOngkir Komerce, Biteship, Fallback Matriks Otomatis & Editor Tarif Admin)

Platform mengintegrasikan arsitektur pengiriman hibrida multi-penyedia yang fleksibel dan tangguh:
- **4 Mode Penyedia Ekspedisi (`SHIPPING_PROVIDER`)**:
  1. `AUTO`: Mode cerdas otomatis yang memprioritaskan kalkulasi tarif live kurir (RajaOngkir Komerce v2 atau Biteship v1) dengan fallback otomatis tanpa henti (*fail-safe zero downtime*) ke Matriks Zona jika kuota API habis, kunci belum diatur, atau terjadi gangguan jaringan.
  2. `RAJAONGKIR`: Mode kurir live khusus menggunakan API Komerce RajaOngkir v2 (mendukung JNE, SiCepat, J&T, POS, TIKI, Anteraja untuk domestik dan POS, JNE, TIKI untuk internasional).
  3. `BITESHIP`: Mode kurir live khusus menggunakan Biteship API v1 (mendukung JNE, J&T, SiCepat, Paxel, Anteraja, POS, DHL, TLX, Rayspeed).
  4. `MATRIX`: Mode tarif zona dan berat lokal murni (`SHIPPING_RATES_JSON`), beroperasi 100% tanpa memerlukan API key eksternal.
- **Tiga Endpoint Backend API Khusus Pengiriman**:
  1. `searchShippingDestination(query, type)`: Pencarian tujuan berbasis ketikan (*typeahead search*) untuk kota/kecamatan/kode pos domestik atau negara internasional.
  2. `calculateLiveShippingRates(destination, weightGram, items)`: Mengalkulasi opsi kurir, jenis layanan, estimasi waktu pengiriman (ETD), dan ongkos kirim secara real-time.
  3. `testShippingProvider(provider, apiKey, originId)`: Uji diagnostik koneksi langsung dari panel Admin Settings ke server RajaOngkir atau Biteship.
- **Bilah Progres Bebas Ongkir (Free Shipping Bar)**: Menampilkan progres belanja secara visual menuju batas gratis ongkir domestik (default Rp 1.500.000).
- **Editor Matriks Tarif Langsung di Admin**: Formatted JSON editor pada Admin Settings untuk menyesuaikan tarif flat dan per-kg setiap zona geografis tanpa perlu menyentuh skrip kode.

#### 2.4 Fitur 4: Integrasi Marketplace Eksternal & Tautan Media Sosial

- Setiap artikel produk menyimpan tautan khusus ke Shopee, Tokopedia, dan TikTok Shop di kolom `marketplace_links_json` dengan fallback ke tautan toko utama.
- Bilah footer memuat tautan resmi ke Instagram, TikTok, YouTube, Pinterest, dan WhatsApp, serta tombol "Pengaturan Cookie".

#### 2.5 Fitur 5: Generator Barcode Ganda (2D QR + 1D Code128) & Hangtag Siap Cetak

- **Barcode Code128 1D**: Dihasilkan secara client-side untuk memvisualisasikan kode SKU varian pakaian guna pemindaian cepat pemindai optik gudang.
- **Kode QR 2D**: Menghubungkan pembeli langsung ke URL deep-link produk di toko online (`?product=PRD-XXX`).
- **Layout Hangtag Standar Industri (@media print)**: Desain kartu pakaian 50mm x 90mm memuat logo brand, nama produk, kode SKU, warna, ukuran, harga resmi, serta QR code dan barcode yang siap dicetak pada kertas kartu atau printer label termal.

#### 2.6 Fitur 6: SEO Teknis & Router Deep-Link

- **Penanganan Deep-Link Cerdas**: Parameter URL `?product=PRD-001&lang=en&cur=USD` secara otomatis menerapkan bahasa, mata uang, dan membuka modal detail produk yang bersangkutan.
- **Tag Meta Lengkap**: Canonical URL, alternate hreflang (`id`, `en`, `x-default`), OpenGraph, Twitter Cards, dan structured data Schema.org (`Organization`, `WebSite`, `ItemList`, `Product`, `BreadcrumbList`).

#### 2.7 Fitur 7: Piksel Iklan Multi-Platform & Consent Mode v2

- Integrasi siap pakai untuk Google Analytics 4, Google Ads Conversion & Remarketing, Google Tag Manager, Meta Pixel (Facebook/Instagram), dan TikTok Pixel.
- **Google Consent Mode v2**: Banner persetujuan cookie minimalis dengan status default `denied` hingga pengunjung memilih `Setuju` atau `Hanya Esensial`.

#### 2.8 Tiga Add-On Strategis Terintegrasi

1. **Atribusi UTM & Jejak Klik Iklan**: Menangkap parameter `utm_source`, `utm_medium`, `utm_campaign`, `gclid`, `fbclid`, dan `ttclid` dari URL pengunjung, menyimpannya ke sesi, dan melampirkannya pada pesanan dan event telemetri.
2. **Ekspor Feed Katalog Produk CSV**: Tombol satu-klik pada admin untuk mengekspor 19 produk ke 3 format feed katalog resmi: **Google Merchant Center CSV**, **Meta Product Catalog CSV**, dan **TikTok Catalog CSV**.
3. **Panel Diagnostik Piksel Langsung (Live Diagnostics)**: Panel visual pada menu Pengaturan Admin yang menampilkan status keterhubungan setiap piksel analitik beserta tabel 10 aktivitas pelacakan event terkini.

#### 2.9 Fitur Tambahan: Penyimpanan Foto Produk & Galeri Varian Warna di Google Drive (Live Color Swapping)

- **Upload Mandiri ke Google Drive (`uploadProductImage`)**: Pengelola toko dapat mengunggah foto produk utama dan galeri foto warna berbeda langsung dari modal produk dan varian di Admin Dashboard. Gambar dikompresi di peramban klien sebelum diunggah ke folder Google Drive (`DRIVE_PRODUCTS_FOLDER_NAME`, default `ARYASTORE_PRODUCTS`).
- **Tautan Gambar CDN Langsung Google**: Gambar tersimpan publik dan menghasilkan tautan langsung Google CDN: `https://lh3.googleusercontent.com/d/<ID>=w1000` dengan fallback thumbnail.
- **Interaktivitas Pratinjau Warna di Storefront**:
  - Pada kartu produk katalog: Mengklik chip indikator warna langsung menukar foto produk pada kartu tersebut untuk mempratinjau warna pakaian yang dipilih.
  - Pada modal detail produk: Memilih warna swatch secara dinamis menukar foto utama dengan foto varian warna yang dipilih dengan transisi fade halus 150ms (`MOTION 1`), dilengkapi deretan thumbnail foto warna (*color thumbnail strip*) di bawah foto utama.
  - Pada keranjang belanja: Item keranjang otomatis menampilkan foto warna yang dipilih pembeli.

#### 2.10 Fitur Tambahan: Header Sticky Terpadu & Sistem Animasi Mikro Proporsional (MOTION 2)

- **Header Sticky Viewport-Locked**: Seluruh baris atas (Announcement Bar, Valas Selector, Language Switcher) dan bilah navigasi utama terkunci rapi di posisi `top: 0` (`sticky top-0 z-40`) tanpa terputus saat digulir ke bawah, diperkuat dengan `overflow-x: clip` pada dokumen.
- **Aksesibilitas Kontrol Tanpa Hambat (*Zero Scroll Back*)**: Pelanggan dapat mengubah mata uang 8 valuta dan memeriksa keranjang belanja kapan saja secara instan dari posisi scroll mana pun di seluruh perangkat.
- **Sistem Animasi Mikro Proporsional**:
  - Efek elevasi kartu produk (*hover translateY -3px*, *box-shadow*, dan *image scale 105%*).
  - Kemunculan gulir halus (*smooth scroll reveal*) via `IntersectionObserver` pada katalog produk dan kartu bundling.
  - Umpan balik taktil pop (*badge bounce pop*) pada ikon tas belanja dan wishlist saat mutasi kuantitas.
  - Transisi masuk dialog modal (*scale & translateY enter*) serta transisi laci keranjang (*smooth drawer slide*).
  - Tautan hak cipta terverifikasi di footer menuju `https://sigitadi.id` (&copy; 2026 sigitadi.id).

---

### 3. Arsitektur Data & Struktur Lembar Kerja (Google Sheets v2.0)

Seluruh data transaksi dan katalog disimpan dalam satu Google Spreadsheet dengan 10 tab lembar kerja mandiri tanpa karakter garis bawah (*underscore*):

```
Google Spreadsheet (AryaStore Database Engine)
 ├── Products               # 13 Kolom (0..12): Ditambahkan kolom 8..12 di sebelah kanan
 ├── ProductVariants        # 7 Kolom (0..6): Matriks SKU, varian warna, ukuran XS-5XL, stok & foto
 ├── CampaignsAndBundles    # 8 Kolom (0..7): Flash sale timer & paket bundling pakaian
 ├── Orders                 # 18 Kolom (0..17): Ditambahkan kolom 14..17 di sebelah kanan
 ├── Customers              # 7 Kolom (0..6): Buku kontak pelanggan & akumulasi belanja
 ├── Coupons                # 6 Kolom (0..5): Kode promo diskon persen & nominal tetap
 ├── Returns                # 7 Kolom (0..6): Pengajuan tukar ukuran / refund & keputusan admin
 ├── AuditLogs              # 4 Kolom (0..3): Jejak audit aktivitas operator internal
 ├── EventLogs              # 3 Kolom (0..2): Telemetri corong konversi & analitik pengunjung
 └── Settings               # 3 Kolom (0..2): 23+ parameter konfigurasi sistem, SEO & pelacak
```

#### 3.1 Pemetaan Kolom Berbasis Indeks Nol (Zero-Based Index Mapping v2.0)

1. **`Products`** (Katalog Busana Utama)
   - Indeks 0: `id` (String, format `PRD-001` s.d. `PRD-019`)
   - Indeks 1: `name` (String, nama artikel dalam Bahasa Indonesia)
   - Indeks 2: `category` (Enum: `Outerwear`, `Tops`, `Bottoms`, `Footwear`, `Accessories`)
   - Indeks 3: `base_price` (Number, harga dasar dalam IDR)
   - Indeks 4: `badge` (Enum: `New Arrival`, `Best Seller`, `Limited Edition`, `None`)
   - Indeks 5: `description` (String, deskripsi material & fitting dalam Bahasa Indonesia)
   - Indeks 6: `image_url` (String, URL gambar resolusi tinggi Unsplash terkurasi)
   - Indeks 7: `created_at` (String, format `YYYY-MM-DD HH:mm:ss`)
   - **Indeks 8 (Baru v2.0)**: `name_en` (String, nama artikel dalam Bahasa Inggris)
   - **Indeks 9 (Baru v2.0)**: `description_en` (String, deskripsi dalam Bahasa Inggris)
   - **Indeks 10 (Baru v2.0)**: `weight_gram` (Number, bobot pakaian riil dalam gram)
   - **Indeks 11 (Baru v2.0)**: `marketplace_links_json` (String JSON, tautan Shopee, Tokopedia, dan TikTok Shop)
   - **Indeks 12 (Baru v2.0)**: `color_images_json` (String JSON, peta foto per warna produk `{ [namaWarna]: urlGambarDrive }`)

2. **`ProductVariants`** (Matriks SKU, Warna, Ukuran, Stok & Foto Varian)
   - Indeks 0: `variant_id` (String, format `VAR-0001`)
   - Indeks 1: `product_id` (String, merujuk ke `Products.id`)
   - Indeks 2: `sku` (String, kode unik stok, contoh `COAT-CML-M`)
   - Indeks 3: `color` (String, label warna busana)
   - Indeks 4: `size` (Enum: `XS`, `S`, `M`, `L`, `XL`, `XXL`, `3XL`, `4XL`, `5XL`)
   - Indeks 5: `stock` (Number, jumlah stok fisik tersedia)
   - **Indeks 6 (Baru v2.0)**: `image_url` (String, URL gambar foto spesifik untuk SKU varian warna tersebut)

3. **`Orders`** (Transaksi & Pengiriman Global)
   - Indeks 0: `invoice_no` (String, format unik `INV-YYYYMM-XXX`)
   - Indeks 1: `created_at` (String, format `YYYY-MM-DD HH:mm:ss`)
   - Indeks 2: `customer_id` (String, format `CST-001`)
   - Indeks 3: `customer_name` (String, nama lengkap penerima)
   - Indeks 4: `whatsapp_no` (String, nomor kontak WhatsApp)
   - Indeks 5: `items_json` (String JSON array rincian produk, SKU, varian, qty, dan harga)
   - Indeks 6: `subtotal` (Number, total belanja dalam IDR sebelum diskon)
   - Indeks 7: `coupon_code` (String, kode promo yang diterapkan)
   - Indeks 8: `coupon_discount` (Number, nominal potongan kupon dalam IDR)
   - Indeks 9: `shipping_method` (String, metode/ekspedisi pengiriman)
   - Indeks 10: `shipping_cost` (Number, ongkir terhitung atau disesuaikan admin)
   - Indeks 11: `grand_total` (Number, `subtotal - coupon_discount + shipping_cost`)
   - Indeks 12: `payment_proof_url` (String, URL gambar bukti transfer di Google Drive)
   - Indeks 13: `status` (Enum: `Menunggu Pembayaran`, `Bukti Diupload`, `Diproses`, `Dikirim`, `Selesai`, `Dibatalkan`)
   - **Indeks 14 (Baru v2.0)**: `shipping_zone` (String, zona alamat domestik atau internasional)
   - **Indeks 15 (Baru v2.0)**: `currency_code` (String, kode mata uang saat checkout)
   - **Indeks 16 (Baru v2.0)**: `exchange_rate` (Number, nilai konversi kurs valas terhadap IDR)
   - **Indeks 17 (Baru v2.0)**: `utm_source` (String, parameter sumber atribusi pemasaran)

---

## ZONA BAWAH: MASTER CONTEXT & LOGIKA SISTEM TERKINI (LIVING CONTEXT v2.0)

### 1. Status Arsitektur Aktif

- **Runtime Target**: Google Apps Script Web App (Serverless V8 Engine).
- **Database Engine**: Google Sheets Database (10 Tab Mandiri tanpa underscore).
- **Frontend Architecture**: Single Page Application terpadu di dalam `index.html` (HTML5, Tailwind CSS via CDN, Vanilla JavaScript modular, Lucide Icons SVG, inline Code128 SVG generator, inline QRCode.js).
- **Status Integrasi**:
  - Sinkronisasi skema aman (safe rightmost-append) aktif tanpa pernah menghapus data lama.
  - Endpoint `getPublicConfig()` menyaring parameter publik dan melindungi PIN rahasia.

### 2. Matriks 19 Produk Busana Terverifikasi Visual (Baseline Catalog v2.0)

| ID | Nama (ID) | Name (EN) | Kategori | Harga (IDR) | Berat | Badge | Konten Foto Terverifikasi |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `PRD-001` | Mantel Wol Terstruktur Atelier | Atelier Structured Wool Coat | Outerwear | Rp 1.250.000 | 920g | Best Seller | Mantel wol camel berstruktur dengan tali pinggang (`photo-1539533018447-63fcce2678e3`) |
| `PRD-002` | Kemeja Linen Santai Minimalis | Minimalist Relaxed Linen Shirt | Tops | Rp 420.000 | 300g | New Arrival | Kemeja kancing putih tulang bahan linen sejuk (`photo-1603252109303-2751441dd157`) |
| `PRD-003` | Celana Lipit Wide-Leg Atelier | Pleated Wide-Leg Trousers | Bottoms | Rp 580.000 | 460g | Best Seller | Celana lipit pasir krem potongan wide-leg (`photo-1517445312882-bc9910d016b7`) |
| `PRD-004` | Sepatu Bot Kulit Heritage Minimalis | Minimalist Leather Heritage Boots | Footwear | Rp 1.150.000 | 1120g | Limited Edition | Sepatu bot kulit espresso cap-toe sol karet (`photo-1608256246200-53e635b5b65f`) |
| `PRD-005` | Kaos Katun Tebal Oversized | Heavyweight Cotton Oversized Tee | Tops | Rp 240.000 | 250g | Best Seller | Kaos oblong putih combed 240 GSM kerah tebal (`photo-1581655353564-df123a1eb820`) |
| `PRD-006` | Blazer Single-Breasted Terstruktur | Tailored Single-Breasted Blazer | Outerwear | Rp 980.000 | 780g | New Arrival | Blazer biru dongker single-breasted potongan rapi (`photo-1507679799987-c73779587ccf`) |
| `PRD-007` | Celana Jeans Selvedge Potongan Lurus | Raw Selvedge Straight Cut Jeans | Bottoms | Rp 650.000 | 540g | Limited Edition | Celana denim selvedge 14 oz indigo klasik (`photo-1542272604-787c3835535d`) |
| `PRD-008` | Tas Tote Kanvas Atelier | Canvas Atelier Weekender Tote | Accessories | Rp 350.000 | 450g | Best Seller | Tas tote kanvas cokelat pasir tali anyaman (`photo-1544816155-12df9643f363`) |
| `PRD-009` | Kupluk Rajut Wol Merino | Merino Wool Ribbed Beanie | Accessories | Rp 180.000 | 180g | None | Topi kupluk rajut wol merino espresso hangat (`photo-1576871337632-b9aef4c17ab9`) |
| `PRD-010` | Jaket Bomber Terracotta Atelier | Atelier Terracotta Bomber Jacket | Outerwear | Rp 720.000 | 760g | New Arrival | Jaket bomber twill matte warna terracotta hangat (`photo-1591047139829-d91aecb6caea`) |
| `PRD-011` | Jaket Denim Kerah Sherpa Studio | Studio Sherpa Collar Denim Jacket | Outerwear | Rp 790.000 | 860g | Limited Edition | Jaket trucker denim berkerah sherpa krem (`photo-1543076447-215ad9ba6923`) |
| `PRD-012` | Sweater Turtleneck Rajut Merino | Merino Ribbed Turtleneck Sweater | Tops | Rp 640.000 | 420g | Best Seller | Sweater kerah tinggi rib merino hitam pekat (`photo-1623183949963-0557c9532763`) |
| `PRD-013` | Pullover Crewneck Katun Atelier | Atelier Cotton Crewneck Pullover | Tops | Rp 480.000 | 410g | None | Sweatshirt crewneck katun French terry putih (`photo-1620799140408-edc6dcb6d633`) |
| `PRD-014` | Celana Twill 5-Pocket Minimalis | Minimalist 5-Pocket Twill Pants | Bottoms | Rp 490.000 | 450g | New Arrival | Celana panjang 5-pocket twill slate navy (`photo-1624378439575-d8705ad7ae80`) |
| `PRD-015` | Celana Utility Tapered Santai | Relaxed Utility Tapered Trousers | Bottoms | Rp 440.000 | 420g | None | Celana tapered berkantong utility warna clay (`photo-1594633312681-425c7b97ccd1`) |
| `PRD-016` | Sepatu Derby Kulit Full-Grain | Full-Grain Leather Derby Shoes | Footwear | Rp 950.000 | 1050g | Best Seller | Sepatu derby kulit full-grain cognac formal (`photo-1614252235316-8c857d38b5f4`) |
| `PRD-017` | Sneakers Kanvas Low-Top Minimalis | Minimalist Low-Top Canvas Sneakers | Footwear | Rp 590.000 | 950g | New Arrival | Sneakers low-top putih bersih kanvas katun (`photo-1499321889027-736489e2f5a5`) |
| `PRD-018` | Kacamata Hitam Bingkai Tipis Atelier | Atelier Minimalist Round Sunglasses | Accessories | Rp 320.000 | 190g | New Arrival | Kacamata bulat kawat emas tipis lensa UV400 (`photo-1511499767150-a48a237f0083`) |
| `PRD-019` | Topi Twill Katun Minimalis | Structured Cotton Twill Cap | Accessories | Rp 210.000 | 185g | None | Topi 6-panel washed cotton twill abu arang (`photo-1521369909029-2afed882baee`) |

### 3. Matriks Paket Bundling Busana Terverifikasi (Bundles)

1. **`BND-001` (Atelier Monochrome Set)**:
   - Komponen: Mantel Wol Terstruktur Atelier (`PRD-001`) + Celana Lipit Wide-Leg Atelier (`PRD-003`).
   - Harga Normal: Rp 1.830.000 | **Harga Spesial Bundle: Rp 1.550.000** (Hemat Rp 280.000).
   - Foto Lookbook: `photo-1490481651871-ab68de25d43d`.
2. **`BND-002` (Urban Terracotta Duo)**:
   - Komponen: Kemeja Linen Santai Minimalis (`PRD-002`) + Tas Tote Kanvas Atelier (`PRD-008`).
   - Harga Normal: Rp 770.000 | **Harga Spesial Bundle: Rp 650.000** (Hemat Rp 120.000).
   - Foto Lookbook: `photo-1512436991641-6745cdb1723f`.

### 4. Matriks Konfigurasi Global Lengkap (`Settings` v2.0)

| Kunci Konfigurasi | Nilai Default | Penjelasan |
| --- | --- | --- |
| `BRAND_NAME` | `AryaStore` | Nama resmi brand e-commerce |
| `WA_NUMBER` | `6281234567890` | Nomor WhatsApp tujuan checkout pesanan |
| `CURRENCY_PREFIX` | `Rp` | Format prefiks mata uang dasar |
| `DEFAULT_LANGUAGE` | `id` | Bahasa default antarmuka (`id` atau `en`) |
| `DEFAULT_CURRENCY` | `IDR` | Mata uang dasar penghitungan harga |
| `CURRENCY_AUTO_SYNC` | `TRUE` | Sakelar otomatisasi kurs valuta asing |
| `CURRENCY_RATES_JSON` | `{"IDR":1,"USD":0.000063,"EUR":0.000058,"SGD":0.000085,"MYR":0.00028,"JPY":0.0098,"GBP":0.000050,"AUD":0.000096}` | Nilai tukar 8 valas dunia |
| `FREE_SHIPPING_THRESHOLD_IDR` | `1500000` | Batas belanja gratis ongkir domestik (Rp 1.500.000) |
| `SHIPPING_RATES_JSON` | `{"zones":{"JABODETABEK":{"flat":15000,"perKg":10000},"JAWA_BALI":{"flat":25000,"perKg":15000},"LUAR_JAWA":{"flat":45000,"perKg":25000},"INTERNATIONAL_SEA":{"flat":150000,"perKg":80000},"INTERNATIONAL_GLOBAL":{"flat":350000,"perKg":200000}}}` | Tarif ongkir zona geografis & berat |
| `MARKETPLACE_LINKS_JSON` | `{"shopee":"https://shopee.co.id/aryastore","tokopedia":"https://tokopedia.com/aryastore","tiktokshop":"https://tiktok.com/@aryastore"}` | Tautan akun resmi di marketplace |
| `SOCIAL_LINKS_JSON` | `{"instagram":"https://instagram.com/aryastore.id","tiktok":"https://tiktok.com/@aryastore","facebook":"https://facebook.com/aryastore","youtube":"https://youtube.com/@aryastore","pinterest":"https://pinterest.com/aryastore","whatsapp":"https://wa.me/6281234567890"}` | Saluran media sosial resmi brand |
| `STORE_BASE_URL` | `https://sisigitadi.github.io/AryaStore` | URL basis publikasi toko |
| `SEO_TITLE` | `AryaStore - Modern Minimalist Fashion & Curated Apparel` | Judul global SEO & OpenGraph |
| `SEO_DESCRIPTION` | `AryaStore menghadirkan koleksi busana minimalis kontemporer berkualitas tinggi dengan kurasi bahan premium, potongan presisi, dan pengiriman ke seluruh dunia.` | Deskripsi global meta pencarian |
| `SEO_KEYWORDS` | `fashion minimalis, apparel indonesia, aryastore, baju pria wanita, jaket premium, outerwear, belanja baju online` | Kata kunci global mesin pencari |
| `GA4_MEASUREMENT_ID` | `G-XXXXXXXXXX` | ID Google Analytics 4 |
| `GOOGLE_ADS_ID` | `AW-XXXXXXXXXX` | ID Google Ads Remarketing |
| `GOOGLE_ADS_CONVERSION_LABEL` | `XXXXXXXXXXXXX` | Label konversi Google Ads |
| `GTM_ID` | `GTM-XXXXXXX` | ID Wadah Google Tag Manager |
| `META_PIXEL_ID` | `123456789012345` | ID Meta / Facebook Pixel |
| `TIKTOK_PIXEL_ID` | `CXXXXXXXXXXXXXXXXX` | ID TikTok Pixel |
| `SHIPPING_PROVIDER` | `AUTO` | Mode ekspedisi: AUTO, RAJAONGKIR, BITESHIP, MATRIX |
| `RAJAONGKIR_API_KEY` | `""` | Kunci API Komerce RajaOngkir v2 (RAHASIA) |
| `RAJAONGKIR_ORIGIN_ID` | `17470` | ID Kecamatan asal pengiriman RajaOngkir |
| `RAJAONGKIR_COURIERS_DOMESTIC` | `jne:sicepat:jnt:pos:tiki:anteraja` | Kurir domestik RajaOngkir |
| `RAJAONGKIR_COURIERS_INTL` | `pos:jne:tiki` | Kurir internasional RajaOngkir |
| `BITESHIP_API_KEY` | `""` | Kunci API Biteship v1 (RAHASIA) |
| `BITESHIP_ORIGIN_POSTAL_CODE` | `12190` | Kode pos gudang asal Biteship |
| `BITESHIP_COURIERS` | `jne,jnt,sicepat,paxel,anteraja,pos,dhl,tlx,rayspeed` | Kurir Biteship |
| `PIN_SUPER_ADMIN` | `9999` | PIN otorisasi Super Admin (RAHASIA) |
| `PIN_STORE_MANAGER` | `8888` | PIN otorisasi Store Manager (RAHASIA) |
| `PIN_CUSTOMER_SERVICE` | `7777` | PIN otorisasi Customer Service (RAHASIA) |
| `DRIVE_FOLDER_NAME` | `ARYASTORE_PAYMENTS` | Nama folder Google Drive bukti bayar (RAHASIA) |
| `DRIVE_PRODUCTS_FOLDER_NAME` | `ARYASTORE_PRODUCTS` | Nama folder Google Drive foto produk & varian warna (RAHASIA) |
| `HERO_BADGE` | `Koleksi Esensial 2026 : Volume I` | Badge edisi koleksi hero lookbook |
| `HERO_BADGE_EN` | `Essential Collection 2026 : Volume I` | Badge edisi koleksi hero lookbook (EN) |
| `HERO_TITLE` | `Siluet Minimalis,<br>Presisi Material Abadi.` | Judul utama hero lookbook |
| `HERO_TITLE_EN` | `Minimalist Silhouettes,<br>Enduring Precision.` | Judul utama hero lookbook (EN) |
| `HERO_DESC` | `Koleksi busana kontemporer berpotongan terstruktur...` | Deskripsi editorial hero beranda |
| `HERO_DESC_EN` | `Contemporary tailored apparel designed for daily...` | Deskripsi editorial hero beranda (EN) |
| `HERO_IMAGE_URL` | `https://images.unsplash.com/photo-1613915617430-8ab0fd7c6baf...` | Foto editorial utama hero lookbook |
| `HERO_CAPTION_TITLE` | `Atelier Lookbook 2026` | Judul kartu keterangan foto hero |
| `HERO_CAPTION_TITLE_EN` | `Atelier Lookbook 2026` | Judul kartu keterangan foto hero (EN) |
| `HERO_CAPTION_DESC` | `Dirancang di Jakarta, dikirimkan dengan cermat...` | Deskripsi kartu keterangan foto hero |
| `HERO_CAPTION_DESC_EN` | `Designed in Jakarta, carefully shipped worldwide.` | Deskripsi kartu keterangan foto hero (EN) |
| `HERO_CTA_EXPLORE` | `Jelajahi Katalog` | Teks tombol jelajah katalog |
| `HERO_CTA_EXPLORE_EN` | `Explore Catalog` | Teks tombol jelajah katalog (EN) |
| `HERO_CTA_GUIDE` | `Panduan Ukuran (XS - 5XL)` | Teks tombol panduan ukuran |
| `HERO_CTA_GUIDE_EN` | `Size Guide (XS - 5XL)` | Teks tombol panduan ukuran (EN) |
| `ANNOUNCEMENT_TAG` | `Koleksi Musim Terbatas` | Tag banner pengumuman atas |
| `ANNOUNCEMENT_TAG_EN` | `Limited Seasonal Collection` | Tag banner pengumuman atas (EN) |
| `ANNOUNCEMENT_TITLE` | `Potongan Spesial Flash Sale Berlangsung` | Judul banner pengumuman berjalan |
| `ANNOUNCEMENT_TITLE_EN` | `Special Flash Sale In Progress` | Judul banner pengumuman berjalan (EN) |
| `ATELIER_ADDRESS` | `Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan 12190` | Alamat fisik studio atelier |
| `CUSTOMER_CARE_HOURS` | `Senin - Sabtu: 09.00 - 18.00 WIB` | Jam operasional concierge |
| `CUSTOMER_CARE_HOURS_EN` | `Monday - Saturday: 09:00 - 18:00 WIB` | Jam operasional concierge (EN) |
| `CUSTOMER_CARE_EMAIL` | `concierge@aryastore.id` | Email resmi layanan pelanggan |
| `FOOTER_ABOUT_TEXT` | `Studio busana kontemporer independen yang berdedikasi...` | Teks profil atelier di footer |
| `FOOTER_ABOUT_TEXT_EN` | `Independent contemporary fashion studio dedicated...` | Teks profil atelier di footer (EN) |
| `VALUE_PROPOSITIONS_JSON` | `[{"title":"Pengiriman Seluruh Dunia",...}]` | Konfigurasi 4 kartu nilai kepercayaan (Trust Bar) |

#### Aturan Sanitasi Keamanan `getPublicConfig()`
Fungsi endpoint publik `getPublicConfig()` yang melayani antarmuka browser `index.html` **WAJIB MENYARING DAN MENIADAKAN** kunci PIN otorisasi (`PIN_SUPER_ADMIN`, `PIN_STORE_MANAGER`, `PIN_CUSTOMER_SERVICE`), API key pihak ketiga (`RAJAONGKIR_API_KEY`, `BITESHIP_API_KEY`), serta nama folder internal Google Drive (`DRIVE_FOLDER_NAME`, `DRIVE_PRODUCTS_FOLDER_NAME`). Sebagai pengganti kunci rahasia, sertakan boolean `RAJAONGKIR_CONFIGURED: !!settings.RAJAONGKIR_API_KEY` dan `BITESHIP_CONFIGURED: !!settings.BITESHIP_API_KEY` agar antarmuka storefront mengetahui ketersediaan integrasi kurir live secara aman.

### 5. Log Pembaruan Resmi (Version History)

- **v1.0.0 (2026-11-21)**: Perancangan fondasi awal serverless GAS + Google Sheets. Eliminasi loyalti poin dan ulasan produk, implementasi wishlist localStorage, dan sistem RBAC PIN.
- **v2.0.0 (2026-11-24)**: Ekspansi skala global. Baseline katalog 19 produk busana terverifikasi visual, dukungan bilingual (ID/EN), multi-valas 8 mata uang, mesin ekspedisi hibrida (Live RajaOngkir Komerce v2, Biteship v1, kalkulator tarif live, dan fallback matriks otomatis), penyimpanan foto produk & galeri varian warna di Google Drive dengan pergantian foto warna live di storefront, generator hangtag barcode fisik ganda (QR + Code128) dengan aturan cetak `@media print`, strip linkout marketplace eksternal, aset SEO teknis (`robots.txt`, `sitemap.xml`, OpenGraph, Schema.org), serta konfigurasi pelacak analitik digital multi-platform dengan Consent Mode v2, atribusi UTM, ekspor feed katalog CSV, dan panel diagnostik piksel langsung.
- **v2.1.0 (2026-11-24)**: Penguatan tata kelola RBAC v2.1 (Super Admin, Store Manager, Customer Service) dengan akuntabilitas nama operator dan auto-lock inaktivitas 30 menit. Implementasi Dynamic Storefront CMS untuk eliminasi 100% teks mati di beranda toko dengan pengunggah foto lookbook utama ke Google Drive publik. Audit dan revisi ergonomi mobile dengan pencegahan auto-zoom iOS Safari (16px), touch target minimal 44x44px, dan tab bar horizontal admin.
