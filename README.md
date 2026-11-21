# 🛍️ AryaStore : Fashion & Apparel E-Commerce Engine

> **Editorial Minimalist Fashion Storefront & Operational Admin Dashboard**  
> Dibangun dengan arsitektur serverless **Google Apps Script (GAS) + Google Sheets Database** dan dapat dijalankan langsung sebagai Single Page Application (SPA) di **GitHub Pages**.  
> Kepatuhan Standar: **RetroBOT Core v3.0** & **antislop Filter**

🌐 **Demo Live:** [https://aryastore.sigitadi.id/](https://sisigitadi.github.io/AryaStore/)  
📦 **Repositori:** [https://github.com/sisigitadi/AryaStore](https://github.com/sisigitadi/AryaStore)

---

## ✨ Fitur Utama

### 🛍️ Storefront Pelanggan
- **Editorial Hero & Curated Collection**: Desain lookbook majalah mode kontemporer beresolusi tinggi dengan tipografi elegan.
- **Real-Time Flash Sale Countdown & Bundles**: Penghitung waktu mundur live dan kartu outfit bundling kombinasi dengan tombol aksi cepat `+ Ambil Paket Bundle`.
- **Pencarian & Multi-Attribute Filtering**: Filter instan berdasarkan kategori, rentang harga (slider), ketersediaan ukuran (`XS` s.d. `5XL`), label badge, dan pengurutan harga/terbaru.
- **Modal Detail Produk & Matriks Varian**: Pemilih warna swatch interaktif, pengecekan ketersediaan stok aktual per ukuran, tombol Tambah ke Keranjang, dan toggle Wishlist.
- **Panduan Ukuran (Size Guide Modal)**: Tabel ukuran lingkar dada, panjang badan, dan pinggang untuk akurasi fitting pelanggan.
- **Slide-Over Cart Drawer & WhatsApp Checkout**:
  - Validasi kupon promo aktif (`WELCOME10` diskon 10%, `HEMAT50K` diskon Rp 50.000).
  - Pilihan metode pengiriman (*Reguler*, *Express*, *Same Day*).
  - Generator pesan pemesanan otomatis ke WhatsApp merchant dengan nomor invoice unik (`INV-YYYYMM-XXX`).
- **Pelacak Pesanan & Bukti Bayar Mandiri**: Pencarian status pesanan berdasarkan nomor invoice & nomor WhatsApp, upload foto bukti transfer, serta formulir pengajuan retur / tukar ukuran (`RTR-YYYYMM-XXX`).

### 🛡️ Dashboard Admin (RBAC Berbasis PIN)
- **Role-Based Access Control (RBAC)**:
  - **Super Admin** (PIN: `9999`): Akses penuh ke seluruh 10 modul sistem.
  - **Store Manager** (PIN: `8888`): Akses katalog produk, stok varian, pesanan, kupon, dan pelanggan.
  - **Customer Service** (PIN: `7777`): Akses pemrosesan pesanan, bukti transfer, dan antrean retur/refund.
- **4 Kartu Ringkasan KPI**: Total Pendapatan, Total Pesanan, Unit Terjual, dan Jumlah Pelanggan.
- **Manajemen Pesanan & Konfirmasi Ongkir Manual**: Input ongkos kirim manual oleh admin yang langsung mengkalkulasi ulang *Grand Total*, pratinjau bukti bayar, dan progresi alur status pesanan.
- **Sales Analytics & 4-Stage Conversion Funnel**: Visualisasi grafik corong konversi (*Product Views* -> *Add to Cart* -> *WA Checkout* -> *Paid & Completed*) menggunakan CSS murni serta fitur ekspor riwayat pesanan ke CSV.
- **Modul Tambahan**: Manajemen Kupon, Direktori Pelanggan, Editor Kampanye & Bundling, Antrean Retur/Refund, dan System Audit Log.

---

## 📁 Struktur Berkas

```
AryaStore/
├── index.html        # Single Page Application (Storefront + Dashboard Admin RBAC)
├── code.gs           # All-in-One Server-Side Backend API (32 endpoint GAS, LockService, Google Drive)
├── setup.gs          # Skrip inisialisasi skema 10 sheet & injeksi data awal (idempotent seed)
├── PRD.md            # Product Requirements Document 2-Zona (Blueprint & Living Context)
├── design.md         # Sistem desain visual, token warna editorial, dan kepatuhan antislop
├── AGENTS.md         # Panduan rekayasa sistem, kontrak pengembang, dan konvensi teknis
└── serve.js          # Utilitas server lokal mandiri berbasis Node.js
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
2. Klik tanda **`+`** di samping *Files* > pilih **HTML**, beri nama **`index`**, lalu tempelkan seluruh isi dari [`index.html`](./index.html).
3. Tekan **`Ctrl + S`** untuk menyimpan proyek.

### 4. Inisialisasi Database (1-Click)
- Pilih fungsi **`setupDatabase`** dari dropdown fungsi di bilah atas Apps Script, lalu klik **Run (Jalankan)**.
- Izinkan otorisasi akses akun Google Anda.
- Spreadsheet Anda otomatis terisi 10 sheet lengkap beserta 9 artikel fashion awal, varian ukuran XS s.d. 5XL, kupon diskon, dan pengaturan toko.

### 5. Deploy sebagai Web App Publik
1. Klik tombol **Deploy** di pojok kanan atas > pilih **New deployment**.
2. Klik ikon gerigi > pilih **Web app**.
3. Atur konfigurasi:
   - **Execute as**: `Me (email-anda@gmail.com)`
   - **Who has access**: `Anyone` (agar dapat diakses pelanggan umum).
4. Klik **Deploy** dan salin **Web App URL** Anda.

---

## 💻 Menjalankan Secara Lokal

```bash
# Jalankan server lokal Node.js
node serve.js

# Buka di browser
http://127.0.0.1:3456/
```

---

## 🎨 Palet Warna & Tipografi

- **Paper / Base**: `#FAFAF9` (Off-white bernuansa hangat)
- **Ink / Primary**: `#1C1917` (Charcoal hitam elegan)
- **Accent**: `#C2410C` (Terracotta hangat untuk aksi penting & badge)
- **Border / Divider**: `#E7E5E4` (Garis pemisah halus)
- **Tipografi**: *Playfair Display* (Editorial Serif) & *Plus Jakarta Sans* (Clean UI Sans)

---

## 📄 Lisensi & Pembuat

Dirancang dan dibangun oleh **Sigit Adi** ([sigitadi.id](https://sigitadi.id)).  
Hak cipta dilindungi undang-undang.
