# Sistem Desain Visual & Token Desain: AryaStore

> **Panduan Resmi Sistem Desain Antarmuka (Design System & Tokens v2.0)**  
> Estetika: **Editorial Minimalist Fashion**  
> Dials: **ENERGY 2 / RHYTHM 2 / MOTION 1**  
> Kepatuhan Standar: **RetroBOT v3.0 & antislop Core Filter**

---

## BAGIAN A: STRATEGI & ANATOMI KONVERSI EDITORIAL

### 1. Karakter Visual & Filosofi Produk
Platform **AryaStore** mengusung filosofi desain editorial busana kontemporer. Antarmuka dirancang menyerupai majalah mode cetak kelas atas (*high-fashion lookbook*) yang dipadukan dengan kepraktisan transaksi global modern.

Prinsip panduan visual:
- **Ketegasan Ruang (Intentional Whitespace)**: Elemen katalog diberikan ruang bernapas yang lega untuk menonjolkan detail material pakaian.
- **Tipografi Kontras Tinggi**: Perpaduan tipografi serif klasik yang elegan pada judul utama dengan sans-serif modern yang sangat mudah dibaca pada data dan label navigasi.
- **Tujuan Tunggal Setiap Warna**: Warna aksen terracotta (#C2410C) dibatasi secara ketat hanya untuk tindakan berkonversi tinggi (*Call to Action* utama, badge eksklusif, dan penanda status krusial), menghindari kejenuhan warna.
- **Kenyamanan di Seluruh Ukuran Layar**: Grid adaptif 2 kolom pada layar ponsel dan 4 kolom pada layar komputer meja, memastikan navigasi satu tangan yang nyaman di ponsel.

### 2. Kalibrasi Dial Desain (Dials Calibration)

| Parameter Dial | Level | Karakteristik & Penerapan Konkret |
|---|---|---|
| **ENERGY** | **2 (Subtle & Restrained)** | Nuansa tenang, berwibawa, dan elegan. Menghindari banner heboh atau gradasi warna mencolok. Seluruh daya tarik berakar pada fotografi produk busana dan tipografi tajam. Warna aksen hangat hanya hadir pada momen interaksi penting. |
| **RHYTHM** | **2 (Balanced Pacing)** | Irama tata letak teratur dengan kelipatan spasi 8px. Jarak antar kartu katalog seragam, pembagian seksi halaman konsisten, dan struktur tabel pesanan rapi dengan padding yang lapang. |
| **MOTION** | **1 (Snappy & Purposeful)** | Animasi transisi instan dan fungsional (durasi 150ms sampai 250ms dengan kurva `cubic-bezier(0.2, 0, 0, 1)`). Digunakan secara fungsional pada geser keranjang (*drawer slide*), munculnya modal dialog (*fade-in*), dan indikator muat (*spinner*). Tanpa efek pantulan (*bouncy*) yang tidak perlu. |

---

## BAGIAN B: SISTEM TOKEN VISUAL & ATURAN ANTI-AI

### 1. Palet Warna Resmi (Color Tokens v2.0)

Sistem warna menggunakan palet netral hangat (*warm stone*) yang dipadukan dengan aksen terracotta terbakar (*burnt terracotta*). Menghilangkan gradasi ungu/biru generik khas kecerdasan buatan.

```
[#FAFAF9] Base Background (Warm Paper / Stone 50)
 ├── [#FFFFFF] Surface / Card Background
 ├── [#E7E5E4] Border & Divider (Stone 200)
 ├── [#A8A29E] Muted Border & Subtle Icon (Stone 400)
 ├── [#78716C] Secondary Text (Stone 500)
 ├── [#57534E] High-Contrast Micro Labels (Stone 600 - WCAG AA Lock)
 ├── [#1C1917] Primary Text & Button Dark (Stone 900)
 └── [#C2410C] Primary Accent (Burnt Terracotta / Orange 700)
      ├── [#9A3412] Accent Hover (Orange 800)
      └── [#FFF7ED] Accent Subtle Surface (Orange 50)
```

#### Spesifikasi Nilai Hex Warna & Kunci Kontras Teks (WCAG AA Lock):
- **Latar Belakang Dasar (`--bg-base`)**: `#FAFAF9` (Stone-50). Memberikan sensasi kertas cetak majalah fashion yang hangat, jauh dari kesan putih silau rumah sakit.
- **Latar Permukaan Kartu & Modal (`--bg-surface`)**: `#FFFFFF` (Pure White). Digunakan pada kartu produk, panel modal, dan drawer keranjang dengan pembatas garis rambut (*hairline border*).
- **Teks Utama (`--text-primary`)**: `#1C1917` (Stone-900 / Deep Charcoal). Kontras tinggi rasio 13.8:1 terhadap latar belakang dasar, melampaui standar aksesibilitas WCAG AAA.
- **Teks Sekunder (`--text-secondary`)**: `#78716C` (Stone-500). Digunakan pada deskripsi material, tanggal pesanan, dan teks bantuan form (rasio kontras 4.7:1, lolos WCAG AA).
- **Kunci Kontras Label Mikro 11px-12px (`--text-micro-lock`)**: `#57534E` (Stone-600). Digunakan khusus untuk teks berukuran 10px hingga 12px (badge kategori, indikator stok, label form kecil) pada latar `#FAFAF9` untuk mengunci rasio kontras tinggi 6.8:1, menjamin kepatuhan mutlak WCAG AA pada tipografi kecil.
- **Garis Pembatas Halus (`--border-subtle`)**: `#E7E5E4` (Stone-200). Garis batas 1px bersih tanpa bayangan kabur berlebih.
- **Garis Pembatas Fokus / Ikon (`--border-focus`)**: `#A8A29E` (Stone-400). Digunakan pada border elemen interaktif yang sedang aktif atau dipilih.
- **Warna Aksen Utama (`--accent-primary`)**: `#C2410C` (Terracotta / Orange-700). Warna hangat alami yang melambangkan keahlian kriya busana (*craftsmanship*). Diterapkan pada tombol checkout, tombol tambah bundle, dan badge edisi terbatas.
- **Aksen Saat Disentuh (`--accent-hover`)**: `#9A3412` (Orange-800). Respon visual tombol ketika kursor berada di atasnya.
- **Warna Status Fungsional**:
  - **Berhasil / Selesai (`--status-success`)**: `#166534` (Teks Green-800) di atas `#DCFCE7` (Latar Green-100).
  - **Peringatan / Stok Menipis (`--status-warning`)**: `#854D0E` (Teks Amber-800) di atas `#FEF9C3` (Latar Amber-100).
  - **Bahaya / Stok Habis / Dibatalkan (`--status-danger`)**: `#991B1B` (Teks Red-800) di atas `#FEE2E2` (Latar Red-100).

### 2. Sistem Tipografi (Typography Hierarchy)

Perpaduan tipografi mengedepankan keterbacaan tinggi dan karakter editorial yang kuat:

```
Display & Judul Utama: 'Playfair Display', Georgia, serif
Teks Konten, Label & UI: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif
Angka Finansial & Kode SKU: 'Plus Jakarta Sans', tabular-nums
```

#### Skala Ukuran Tipografi:
- **Display 1 (Hero Title)**: `font-serif text-3xl sm:text-5xl font-normal tracking-tight leading-tight` (36px s.d. 48px).
- **Heading 1 (Section Title)**: `font-serif text-2xl sm:text-3xl font-medium tracking-tight` (24px s.d. 30px).
- **Heading 2 (Card / Modal Title)**: `font-serif text-lg sm:text-xl font-medium leading-snug` (18px s.d. 20px).
- **Subheading & Section Header**: `font-sans text-xs uppercase tracking-widest font-semibold text-stone-600` (11px s.d. 12px).
- **Body Regular**: `font-sans text-sm font-normal text-stone-800 leading-relaxed` (14px).
- **Body Small / Data Table**: `font-sans text-xs font-normal text-stone-600 leading-normal` (12px).
- **Micro Label / Badge**: `font-sans text-[11px] font-medium tracking-wider uppercase text-stone-600` (10px s.d. 11px).

> **Kepatuhan Aturan antislop R-02**: Seluruh teks antarmuka dan salinan promosi dilarang menggunakan tanda pisah panjang (*em dash* / U+2014). Gunakan tanda titik dua (`:`), tanda koma (`,`), atau tanda kurung (`()`) sebagai pengganti pemisah klausa.

### 3. Standar Sentuh Seluler & Ergonomi Interaksi (Mobile Ergonomics)
- **Target Sentuh Minimum 44x44px**: Seluruh elemen yang dapat diklik atau disentuh pada perangkat bergerak (tombol navigasi, chip ukuran baju, switcher bahasa/valas, tombol kuantitas keranjang, penutup modal) wajib memiliki luas tap area minimal 44x44 piksel (`min-h-[44px] min-w-[44px] flex items-center justify-center`).
- **Geometri Sudut Tegas (Border Radius)**:
  - Tombol dan Input: `rounded-sm` (2px) hingga `rounded` (4px).
  - Kartu & Modal: `rounded-md` (6px).
  - DILARANG menerapkan bentuk kapsul lonjong (`rounded-full`) pada tombol aksi utama. Bentuk lingkaran hanya diizinkan untuk lingkaran warna baju (color swatches).

---

## BAGIAN C: KOMPONEN GLOBAL & FITUR EXPANSION v2.0

### 1. Pengalih Bahasa & Mata Uang Ringkas (Language & Currency Switchers)
- **Komponen Pengalih Bahasa (ID / EN)**:
  - Sakelar 2 opsi ringkas berbasis tombol segmen (`id` / `en`).
  - Mengubah seluruh label antarmuka secara instan melalui kamus terjemahan lokal (*client-side i18n dictionary*).
  - Menyimpan preferensi ke `localStorage` browser.
- **Komponen Pengalih Mata Uang (Currency Switcher)**:
  - Menu pilihan ringkas untuk 8 mata uang dunia: `IDR` (Rp), `USD` ($), `EUR` (€), `SGD` (S$), `MYR` (RM), `JPY` (¥), `GBP` (£), `AUD` (A$).
  - Mengonversi nominal harga produk dan total belanja secara dinamis sesuai nilai tukar pada konfigurasi sistem.

### 2. Laci Navigasi Seluler (Mobile Menu Drawer)
- Menghadirkan laci navigasi samping (*slide-over drawer*) yang mulus dari sisi kiri layar pada perangkat ponsel.
- Memuat navigasi kategori koleksi, switcher bahasa & valas, tautan pelacakan pesanan, serta tautan kanal media sosial dan marketplace eksternal.

### 3. Estimator Tarif Ongkir Domestik & Internasional (Shipping Rate Estimator)
- **Kartu Estimasi Cepat**: Menyediakan kalkulator tarif pengiriman sebelum checkout berdasarkan zona penerima dan total berat pesanan dalam gram.
- **Bilah Progres Bebas Ongkir (Free Shipping Bar)**:
  - Menampilkan progres belanja menuju batas gratis ongkir (contoh: batas Rp 500.000).
  - Menampilkan pesan dinamis: "Tambahkan Rp XX.XXX lagi untuk mendapatkan Bebas Ongkir!".

### 4. Bilah Kanal Marketplace & Sosial (Marketplace & Social Link Strip)
- Bilah minimalis pada footer dan menu drawer yang menampilkan tautan resmi ke toko Shopee, Tokopedia, dan TikTok Shop AryaStore.
- Dilengkapi lencana ikon tajam untuk saluran Instagram, TikTok, Facebook, YouTube, dan Pinterest.

### 5. Kartu Hangtag Busana Ganda (Dual QR + Code128 Barcode Hangtag)
Fitur cetak label pakaian fisik untuk manajemen gudang dan identitas produk:
- **Layout Hangtag Standar Industri**: Rasio proporsional 50mm x 90mm dengan border hairline presisi.
- **Informasi Produk Lengkap**: Nama brand AryaStore, kode SKU varian, nama artikel busana, ukuran (`XS` s.d. `5XL`), warna pakaian, dan harga resmi.
- **Elemen Identifikasi Ganda**:
  - **Kode QR Interaktif**: Menghubungkan pembeli langsung ke halaman detail produk di website toko.
  - **Barcode Code128**: Menampilkan representasi visual barcode SKU untuk pemindaian instan oleh pemindai optik (*optical scanner*) di gudang.
- **Aturan Cetak (@media print rules)**:
  ```css
  @media print {
    body * {
      visibility: hidden;
    }
    #hangtag-print-area, #hangtag-print-area * {
      visibility: visible;
    }
    #hangtag-print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 50mm;
      height: 90mm;
      padding: 4mm;
      page-break-inside: avoid;
      background: #FFFFFF !important;
      color: #000000 !important;
      border: 1px dashed #78716C;
    }
    .no-print {
      display: none !important;
    }
  }
  ```

### 6. Banner Persetujuan Cookie Minimalis (Cookie Consent Banner)
- Banner ramping non-intrusif di bagian bawah layar (*bottom strip*) dengan latar belakang `#1C1917` dan teks kontras `#FAFAF9`.
- Menyampaikan pesan privasi ringkas dan tombol persetujuan tegas `Setuju` serta tautan kebijakan privasi.
- Menyimpan status persetujuan di `localStorage` agar tidak muncul berulang kali.

---

## BAGIAN D: CHECKLIST KEPATUHAN DELIVERY GATE (ANTISLOP AUDIT v2.0)

Sebelum menyerahkan berkas antarmuka ke tahap akhir, lakukan audit terhadap 4 blok standar antislop:

- [x] **Blok 1 (Eliminasi AI Slop Klise)**:
  - Bebas dari tanda pisah panjang (*em dash* / U+2014).
  - Bebas dari testimoni palsu atau foto profil buatan.
  - Bebas dari tombol kapsul lonjong (*pill-shaped buttons*) pada aksi utama.
  - Bebas dari gradasi ungu-ke-biru neon (*generic blue-purple gradient*).
- [x] **Blok 2 (Uji Tujuan Visual / Purpose-Gated Styles)**:
  - Setiap warna aksen (#C2410C) memiliki alasan konversi yang jelas.
  - Setiap garis pembatas memperjelas pemisahan hierarki informasi.
- [x] **Blok 3 (Kesesuaian Dial)**:
  - ENERGY 2: Ketenangan visual terjaga, estetika editorial majalah busana.
  - RHYTHM 2: Harmoni jarak 8px konsisten di seluruh seksi antarmuka.
  - MOTION 1: Animasi geser dan fade yang cepat (150-250ms), tanpa efek membal.
- [x] **Blok 4 (Standar Keahlian Kriya / Craftsmanship Locks)**:
  - Seluruh tombol memiliki keadaan loading spinner dan pencegah klik ganda.
  - Target sentuh seluler berukuran minimal 44x44px.
  - Teks nomor invoice dan SKU tidak pernah terpotong elipsis.
  - Kontras teks kecil 11px-12px memenuhi standar minimum rasio 4.5:1 (Stone-600 #57534E memiliki rasio 6.8:1).
