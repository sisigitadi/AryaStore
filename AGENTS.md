# Panduan Rekayasa Agen Pengembang: AryaStore E-Commerce Engine

> **Standar Mutlak Rekayasa Sistem, Tata Kelola Repositori & Kontrak Agen AI Coding**  
> Mengikat seluruh agen pengembang (*docs-worker*, *setup-worker*, *backend-worker*, *ui-worker*, *verifier*, *catalog-auditor*)  
> Versi Kontrak: **v2.0.0 (Global E-Commerce Expansion, Technical SEO & Internationalization)**  
> Kepatuhan Standar: **RetroBOT Core v3.0 & antislop Filter**

---

## 1. STRUKTUR & PERAN BERKAS REPOSITORI

Aplikasi dibangun menggunakan arsitektur serverless **Google Apps Script (GAS) + Google Sheets Database** yang dikemas ke dalam struktur file modular:

```
d:\Projects\Website E-commerce\
 ├── prd.md               # Sumber kebenaran tunggal spesifikasi produk & living context v2.0
 ├── design.md            # Token visual, palet warna, tipografi editorial, & kepatuhan antislop v2.0
 ├── AGENTS.md            # Kontrak rekayasa agen, konvensi teknis, & panduan operasional (file ini)
 ├── README.md            # Dokumentasi arsitektur, panduan konfigurasi deploy & operasional toko
 ├── robots.txt           # Kebijakan perayapan bot mesin pencari & deklarasi peta situs
 ├── sitemap.xml          # Indeks XML sitemap seluruh URL produk, kategori & halaman statis
 ├── setup.gs             # Migrasi skema database 10 sheet & injeksi data awal (idempotent seed)
 ├── code.gs              # Server-side API endpoints, pemetaan indeks kolom, & LockService mutex
 └── index.html           # Single Page Application (Storefront + RBAC Admin Dashboard)
```

---

## 2. STANDAR REKAYASA SISTEM & GOOGLE APPS SCRIPT (GAS CONVENTIONS)

Seluruh agen yang menulis atau memodifikasi kode wajib mematuhi aturan deterministik berikut:

### 2.1 Pemetaan Kolom Berbasis Indeks Numerik Nol (Zero-Based Index Mapping v2.0)
- **Larangan Keras**: DILARANG KERAS mengakses nilai kolom menggunakan string nama header (contoh: `row['name']` atau `row['Harga']`).
- **Aturan Mutlak**: Seluruh pembacaan data baris array dua dimensi wajib menggunakan konstanta indeks numerik berbasis nol (`row[COL_PRODUCTS.NAME]`):

```javascript
const COL_PRODUCTS = {
  ID: 0,
  NAME: 1,
  CATEGORY: 2,
  BASE_PRICE: 3,
  BADGE: 4,
  DESCRIPTION: 5,
  IMAGE_URL: 6,
  CREATED_AT: 7,
  NAME_EN: 8,
  DESCRIPTION_EN: 9,
  WEIGHT_GRAM: 10,
  MARKETPLACE_LINKS_JSON: 11,
  COLOR_IMAGES_JSON: 12
};

const COL_VARIANTS = {
  VARIANT_ID: 0,
  PRODUCT_ID: 1,
  SKU: 2,
  COLOR: 3,
  SIZE: 4,
  STOCK: 5,
  IMAGE_URL: 6
};

const COL_CAMPAIGNS = {
  CAMPAIGN_ID: 0,
  BANNER_TITLE: 1,
  BANNER_DESC: 2,
  ENDS_AT: 3,
  IS_ACTIVE: 4,
  BUNDLE_ITEMS_JSON: 5,
  NORMAL_PRICE: 6,
  BUNDLE_PRICE: 7
};

const COL_ORDERS = {
  INVOICE_NO: 0,
  CREATED_AT: 1,
  CUSTOMER_ID: 2,
  CUSTOMER_NAME: 3,
  WHATSAPP_NO: 4,
  ITEMS_JSON: 5,
  SUBTOTAL: 6,
  COUPON_CODE: 7,
  COUPON_DISCOUNT: 8,
  SHIPPING_METHOD: 9,
  SHIPPING_COST: 10,
  GRAND_TOTAL: 11,
  PAYMENT_PROOF_URL: 12,
  STATUS: 13,
  SHIPPING_ZONE: 14,
  CURRENCY_CODE: 15,
  EXCHANGE_RATE: 16,
  UTM_SOURCE: 17
};

const COL_CUSTOMERS = {
  CUSTOMER_ID: 0,
  NAME: 1,
  WHATSAPP_NO: 2,
  TOTAL_ORDERS: 3,
  TOTAL_SPENT: 4,
  CREATED_AT: 5,
  NOTES: 6
};

const COL_COUPONS = {
  CODE: 0,
  DISCOUNT_TYPE: 1,
  DISCOUNT_VALUE: 2,
  MIN_SPEND: 3,
  DESCRIPTION: 4,
  IS_ACTIVE: 5
};

const COL_RETURNS = {
  RETURN_ID: 0,
  INVOICE_NO: 1,
  CUSTOMER_NAME: 2,
  REASON: 3,
  REQUESTED_SIZE: 4,
  STATUS: 5,
  ADMIN_NOTES: 6
};

const COL_AUDIT_LOGS = {
  TIMESTAMP: 0,
  ACTOR_ROLE: 1,
  MODULE: 2,
  ACTION_DETAIL: 3
};

const COL_EVENT_LOGS = {
  TIMESTAMP: 0,
  EVENT_NAME: 1,
  PAYLOAD_JSON: 2
};

const COL_SETTINGS = {
  KEY: 0,
  VALUE: 1,
  DESCRIPTION: 2
};
```

### 2.2 Penomoran Sekuensial Anti-Tabrakan (Sequential Mutex ID Generation)
- Pembuatan nomor Invoice (`INV-YYYYMM-XXX`) dan nomor Retur (`RTR-YYYYMM-XXX`) WAJIB dilindungi oleh penguncian transaksi:
  ```javascript
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Batas waktu tunggu maksimal 10 detik
    // Eksekusi pencarian nilai maksimum (MAX + 1) pada periode YYYYMM berjalan
    // Tulis baris baru ke sheet
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  ```

### 2.3 Standar Pembacaan & Penulisan Database (I/O Optimization)
- **Pembacaan Data**: Gunakan `sheet.getDataRange().getDisplayValues()` agar format string angka, harga, dan tanggal tersaji stabil tanpa pergeseran zona waktu.
- **Penulisan Data**: Setiap fungsi yang melakukan mutasi (`appendRow`, `setValue`, `setValues`) wajib ditutup dengan panggilan `SpreadsheetApp.flush()` sebelum mengembalikan respons.
- **Format Tanggal Standar**: Format waktu resmi adalah Waktu Indonesia Barat (WIB / Asia/Jakarta):
  ```javascript
  Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  ```

### 2.4 Aturan Migrasi Aman di `setup.gs` (Safe Migration Standards v2.0)
1. **Nama Tab Lembar Kerja**: DILARANG menggunakan karakter garis bawah (*underscore*). Nama tab resmi:
   `Products`, `ProductVariants`, `CampaignsAndBundles`, `Orders`, `Customers`, `Coupons`, `Returns`, `AuditLogs`, `EventLogs`, `Settings`.
2. **Idempotensi**: Fungsi setup dapat dijalankan berulang kali tanpa merusak data yang telah ada.
   - Cek eksistensi lembar kerja dengan `ss.getSheetByName(tabName)`.
   - DILARANG memanggil `sheet.clear()` pada lembar kerja yang sudah berisi data produksi.
   - Tambahkan baris header hanya jika lembar kerja baru dibuat atau dalam kondisi kosong.
3. **Sinkronisasi Kolom Baru**: Jika skema menambahkan kolom baru pada versi 2.0 (seperti `name_en`, `description_en`, `weight_gram`, `marketplace_links_json` pada `Products`, serta `shipping_zone`, `currency_code`, `exchange_rate`, `utm_source` pada `Orders`), letakkan kolom baru selalu pada posisi paling kanan (*rightmost append*).
4. **Data Awal (Seed Data Baseline 19 Produk)**:
   - Injeksi 19 artikel busana berestetika tinggi (5 Kategori: Outerwear, Tops, Bottoms, Footwear, Accessories).
   - Matriks varian lengkap ukuran XS s.d. 5XL dan warna editorial.
   - 2 paket bundling busana (Casual Minimalist Set & Formal Monochrome Set).
   - Contoh kupon promo (`WELCOME10`, `HEMAT50K`, `GLOBALSHIP`).
   - Parameter konfigurasi sistem bawaan lengkap.
5. **Menu Akses Cepat**: Sediakan fungsi `onOpen()` yang menambahkan menu kustom di Google Sheets: `🛍️ AryaStore > Inisialisasi Database`.

### 2.5 Standar Konfigurasi Sistem Baru & Keamanan `getPublicConfig()`
Lembar kerja `Settings` pada v2.0 memuat kunci konfigurasi komprehensif:

| Kunci Konfigurasi | Nilai Default | Penjelasan |
|---|---|---|
| `BRAND_NAME` | `AryaStore` | Nama resmi toko & brand |
| `WA_NUMBER` | `6281234567890` | Nomor WhatsApp resmi pemesanan |
| `CURRENCY_PREFIX` | `Rp ` | Format prefiks mata uang dasar |
| `DEFAULT_LANGUAGE` | `id` | Bahasa default antarmuka (`id` / `en`) |
| `DEFAULT_CURRENCY` | `IDR` | Mata uang default dasar |
| `CURRENCY_AUTO_SYNC` | `TRUE` | Sakelar sinkronisasi nilai tukar valas |
| `CURRENCY_RATES_JSON` | `{"IDR":1,"USD":0.000063,"EUR":0.000058,"SGD":0.000085,"MYR":0.00028,"JPY":0.0098,"GBP":0.000050,"AUD":0.000096}` | Nilai tukar 8 valuta dunia |
| `FREE_SHIPPING_THRESHOLD_IDR` | `500000` | Ambang gratis ongkir domestik (Rp 500.000) |
| `SHIPPING_RATES_JSON` | `{"zones":{"JABODETABEK":{"flat":15000,"perKg":10000},"JAWA_BALI":{"flat":25000,"perKg":15000},"LUAR_JAWA":{"flat":45000,"perKg":25000},"INTERNATIONAL_SEA":{"flat":150000,"perKg":80000},"INTERNATIONAL_GLOBAL":{"flat":350000,"perKg":200000}}}` | Tarif ongkir zona & berat |
| `MARKETPLACE_LINKS_JSON` | `{"shopee":"https://shopee.co.id/aryastore","tokopedia":"https://tokopedia.com/aryastore","tiktokshop":"https://tiktok.com/@aryastore"}` | Tautan resmi e-commerce eksternal |
| `SOCIAL_LINKS_JSON` | `{"instagram":"https://instagram.com/aryastore.id","tiktok":"https://tiktok.com/@aryastore","facebook":"https://facebook.com/aryastore","youtube":"https://youtube.com/@aryastore","pinterest":"https://pinterest.com/aryastore","whatsapp":"https://wa.me/6281234567890"}` | Tautan saluran media sosial |
| `STORE_BASE_URL` | `https://sisigitadi.github.io/AryaStore` | URL basis publikasi toko |
| `SEO_TITLE` | `AryaStore - Modern Minimalist Fashion & Curated Apparel` | Judul global SEO |
| `SEO_DESCRIPTION` | `AryaStore menghadirkan koleksi busana minimalis kontemporer berkualitas tinggi dengan kurasi bahan premium, potongan presisi, dan pengiriman ke seluruh dunia.` | Deskripsi global SEO |
| `SEO_KEYWORDS` | `fashion minimalis, apparel indonesia, aryastore, baju pria wanita, jaket premium, outerwear, belanja baju online` | Kata kunci global SEO |
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

#### Aturan Keamanan Mutlak `getPublicConfig()`
Fungsi endpoint publik `getPublicConfig()` yang dipanggil oleh antarmuka browser (`index.html`) **WAJIB MENYARING DAN MENIADAKAN** kunci PIN otorisasi, kunci rahasia API eksternal, dan nama folder Google Drive internal:
- **DILARANG KERAS**: Membocorkan `PIN_SUPER_ADMIN`, `PIN_STORE_MANAGER`, `PIN_CUSTOMER_SERVICE`, `RAJAONGKIR_API_KEY`, `BITESHIP_API_KEY`, `DRIVE_FOLDER_NAME`, atau `DRIVE_PRODUCTS_FOLDER_NAME` ke respon publik.
- **FLAG BOOLEAN STATUS**: Untuk keperluan antarmuka storefront mengetahui ketersediaan integrasi live carrier tanpa mengekspos API key, sertakan boolean `RAJAONGKIR_CONFIGURED: !!settings.RAJAONGKIR_API_KEY` dan `BITESHIP_CONFIGURED: !!settings.BITESHIP_API_KEY`.
- **HANYA KIRIM**: Parameter publik seperti nama brand, nomor WA, opsi bahasa, nilai tukar valas, ambang gratis ongkir, tarif zona pengiriman, tautan marketplace/sosial, tag SEO, ID pelacak analitik, serta mode ekspedisi `SHIPPING_PROVIDER`.

### 2.6 Penyimpanan Bukti Pembayaran Menggunakan Google Drive
- Bukti transfer diunggah oleh pelanggan dalam bentuk string Base64 dari modal pelacakan pesanan.
- Backend menerima string Base64, mengekstrak data biner (Blob), dan membuat file gambar di Google Drive menggunakan `DriveApp`.
- Folder penampung dicari berdasarkan nama yang tersimpan di sheet `Settings` (default: `ARYASTORE_PAYMENTS`). Jika folder belum ada, sistem membuatnya otomatis.
- File diatur hak akses publik (*Anyone with link can view*) dan tautan web-nya dicatat ke kolom `payment_proof_url` pada sheet `Orders`.

### 2.7 Penyimpanan Foto Produk & Galeri Varian Warna di Google Drive (`uploadProductImage`)
- **Endpoint Backend**: `uploadProductImage(base64Data, mimeType, fileName, productId, colorLabel, role)`
  - Hanya dapat diakses oleh peran berwenang (`Super Admin` atau `Store Manager`).
  - Menerima gambar yang dikompresi di sisi klien (maksimal 1200px lebar, format JPEG/WebP) untuk menghemat ruang Google Drive dan bandwidth kuota GAS.
  - Menyimpan file ke folder `DRIVE_PRODUCTS_FOLDER_NAME` (default: `ARYASTORE_PRODUCTS`). Jika folder belum ada, sistem membuatnya secara otomatis.
  - Mengatur hak akses file menjadi publik (*Anyone with link can view*) dan mengembalikan tautan gambar langsung Google CDN: `https://lh3.googleusercontent.com/d/<ID>=w1000` dengan fallback URL `https://drive.google.com/thumbnail?id=<ID>&sz=w1000`.
- **Struktur Kolom Galeri Warna**:
  - Kolom `color_images_json` (`COL_PRODUCTS[12]`): Menyimpan peta objek JSON `{ [namaWarna]: urlGambarDrive }`.
  - Kolom `image_url` pada `ProductVariants` (`COL_VARIANTS[6]`): Menyimpan URL foto khusus untuk SKU varian bersangkutan.
- **Interaktivitas Storefront (Live Color Swapping)**:
  - Pada kartu produk katalog: chip indikator warna interaktif memungkinkan pratinjau foto warna lain secara langsung pada kartu produk.
  - Pada modal detail produk (`#product-detail-modal`): memilih warna swatch secara dinamis memperbarui foto utama ke foto warna tersebut dengan transisi fade 150ms (`MOTION 1`), dilengkapi deretan thumbnail foto warna (*thumbnail strip*) di bawah foto utama.
  - Pada keranjang belanja: item yang ditambahkan ke keranjang menyimpan foto warna yang dipilih.

---

## 3. KONTRAK REKAYASA ANTARMUKA PENGGUNA (`index.html`)

### 3.1 Benteng Anti-Freeze UI (Resilient Frontend Interactions)
1. **Pencegahan Submit Bawaan**: Setiap event listener formulir wajib memanggil `event.preventDefault()`.
2. **Indikator Pemuatan & Penonaktifan Tombol**:
   - Saat proses asinkron dimulai, ubah teks tombol menjadi spinner pemuatan dan setel atribut `disabled = true`.
   - Tombol WAJIB dipulihkan ke keadaan aktif baik pada blok sukses (`.withSuccessHandler()`) maupun pada blok kegagalan (`.withFailureHandler()`).
3. **Penanganan Error Bersahabat**: Dilarang menggunakan fungsi `alert()` bawaan browser. Gunakan modal dialog kustom atau notifikasi toast minimalis.

### 3.2 Dynamic Event Binding yang Aman
- **Larangan**: DILARANG melempar data objek mentah atau string panjang ke dalam atribut inline `onclick="detail('${item.name}')"`.
- **Aturan**: Pasang atribut data murni `data-id="${item.id}"` atau `data-sku="${variant.sku}"` dan tangani menggunakan delegasi event JavaScript modern.

### 3.3 Client-Side In-Memory State Caching (Navigasi Instan 0 Detik)
- Simpan data katalog produk, kategori, dan pesanan yang telah diambil di variabel state memori browser (`state.products`, `state.orders`, dll).
- Perpindahan antar-menu menggunakan data memori lokal secara instan tanpa melakukan pemanggilan jaringan berulang.
- Ketika terjadi mutasi data (tambah produk, ubah status pesanan, verifikasi pembayaran), batalkan cache terkait (*cache invalidation*) dan perbarui tampilan secara optimis.
- Sediakan tombol `Refresh Data` yang dapat diklik kapan saja oleh operator admin untuk menarik data terbaru dari server.

### 3.4 Mode Pratinjau Aman (Safe Preview Mode)
Untuk memungkinkan pengujian antarmuka secara lokal di luar iframe Google Apps Script tanpa memicu error konsol:
```javascript
const isGAS = typeof google !== 'undefined' && google.script && google.script.run;
if (!isGAS) {
  console.warn('Mode Pratinjau Lokal Aktif: google.script.run tidak terdeteksi. Menggunakan data simulasi fallback.');
}
```

---

## 4. LARANGAN & DISIPLIN KODE

1. **Dilarang Menulis Kode Separuh / Placeholder**: Seluruh file implementasi (`setup.gs`, `code.gs`, `index.html`) wajib disajikan 100% lengkap, utuh, dan siap dijalankan. DILARANG meninggalkan komentar placeholder seperti `// TODO`, `// tambahkan kode lainnya`, atau `/* ... rest of logic ... */`.
2. **Dilarang Data Tiruan Statis di Tampilan Akhir**: Seluruh kartu produk, tabel pesanan, dan metrik dashboard wajib terikat langsung dengan pemanggilan fungsi backend `google.script.run`.
3. **Kepatuhan Tanda Pisah (antislop R-02)**: Seluruh string teks dalam bahasa Indonesia maupun bahasa Inggris dilarang menggunakan karakter *em dash* (U+2014). Gunakan tanda titik dua, tanda koma, atau tanda kurung.

---

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `antislop.md` (core) and then the skill for the task:
- UI / visual: `skills/antislop-ui/SKILL.md`
- Copy & text: `skills/antislop-copywriting/SKILL.md`
- People: `skills/antislop-human/SKILL.md`
- Mobile / responsive: `skills/antislop-layoutmobile/SKILL.md`
- Code comments: `skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: download `antislop.md` again, or run `npx antislop-ai --update` if it was installed as skill folders.
<!-- antislop:end -->
