# Panduan Rekayasa Agen Pengembang: AryaStore E-Commerce Engine

> **Standar Mutlak Rekayasa Sistem, Tata Kelola Repositori & Kontrak Agen AI Coding**  
> Mengikat seluruh agen pengembang (*docs-worker*, *setup-worker*, *backend-worker*, *ui-worker*, *verifier*)  
> Kepatuhan Standar: **RetroBOT Core v3.0 & antislop Filter**

---

## 1. STRUKTUR & PERAN BERKAS REPOSITORI

Aplikasi dibangun menggunakan arsitektur serverless **Google Apps Script (GAS) + Google Sheets Database** yang dikemas ke dalam struktur file yang bersih dan modular:

```
d:\Projects\Website E-commerce\
 ├── prd.md               # Sumber kebenaran tunggal spesifikasi produk & living context
 ├── design.md            # Token visual, palet warna, tipografi editorial, & kepatuhan antislop
 ├── AGENTS.md            # Kontrak rekayasa agen, konvensi teknis, & panduan operasional (file ini)
 ├── setup.gs             # Migrasi skema database 10 sheet & injeksi data awal (idempotent seed)
 ├── code.gs              # Server-side API endpoints, pemetaan indeks kolom, & LockService mutex
 └── index.html           # Single Page Application (Storefront + RBAC Admin Dashboard)
```

---

## 2. STANDAR REKAYASA SISTEM & GOOGLE APPS SCRIPT (GAS CONVENTIONS)

Seluruh agen yang menulis atau memodifikasi kode wajib mematuhi aturan deterministik berikut:

### 2.1 Pemetaan Kolom Berbasis Indeks Numerik Nol (Zero-Based Index Mapping)
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
    CREATED_AT: 7
  };

  const COL_VARIANTS = {
    VARIANT_ID: 0,
    PRODUCT_ID: 1,
    SKU: 2,
    COLOR: 3,
    SIZE: 4,
    STOCK: 5
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
    STATUS: 13
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

### 2.4 Aturan Migrasi Aman di `setup.gs` (Safe Migration Standards)
1. **Nama Tab Lembar Kerja**: DILARANG menggunakan karakter garis bawah (*underscore*). Nama tab resmi:
   `Products`, `ProductVariants`, `CampaignsAndBundles`, `Orders`, `Customers`, `Coupons`, `Returns`, `AuditLogs`, `EventLogs`, `Settings`.
2. **Idempotensi**: Fungsi setup dapat dijalankan berulang kali tanpa merusak data yang telah ada.
   - Cek eksistensi lembar kerja dengan `ss.getSheetByName(tabName)`.
   - DILARANG memanggil `sheet.clear()` pada lembar kerja yang sudah berisi data produksi.
   - Tambahkan baris header hanya jika lembar kerja baru dibuat atau dalam kondisi kosong.
3. **Sinkronisasi Kolom Baru**: Jika skema menambahkan kolom baru pada versi berikutnya, letakkan kolom baru selalu pada posisi paling kanan (*rightmost append*).
4. **Data Awal (Seed Data)**: Masukkan 9 artikel busana berestetika tinggi, matriks varian lengkap ukuran XS s.d. 5XL, 2 paket bundling busana, contoh kupon promo (`WELCOME10`, `HEMAT50K`), dan parameter pengaturan sistem bawaan.
5. **Menu Akses Cepat**: Sediakan fungsi `onOpen()` yang menambahkan menu kustom di Google Sheets: `🛍️ AryaStore > Inisialisasi Database`.

### 2.5 Penyimpanan Bukti Pembayaran Menggunakan Google Drive
- Bukti transfer diunggah oleh pelanggan dalam bentuk string Base64 dari modal pelacakan pesanan.
- Backend menerima string Base64, mengekstrak data biner (Blob), dan membuat file gambar di Google Drive menggunakan `DriveApp`.
- Folder penampung dicari berdasarkan nama yang tersimpan di sheet `Settings` (default: `ARYASTORE_PAYMENTS`). Jika folder belum ada, sistem membuatnya otomatis.
- File diatur hak akses publik (*Anyone with link can view*) dan tautan web-nya dicatat ke kolom `payment_proof_url` pada sheet `Orders`.

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
3. **Kepatuhan Tanda Pisah (antislop R-02)**: Seluruh string teks dalam bahasa Indonesia dilarang menggunakan karakter *em dash* (U+2014). Gunakan tanda titik dua, tanda koma, atau tanda kurung.

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
