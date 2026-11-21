# Sistem Desain Visual & Token Desain: AryaStore

> **Panduan Resmi Sistem Desain Antarmuka (Design System & Tokens)**  
> Estetika: **Editorial Minimalist Fashion**  
> Dials: **ENERGY 2 / RHYTHM 2 / MOTION 1**  
> Kepatuhan Standar: **RetroBOT v3.0 & antislop Core Filter**

---

## BAGIAN A: STRATEGI & ANATOMI KONVERSI EDITORIAL

### 1. Karakter Visual & Filosofi Produk
Platform **AryaStore** mengusung filosofi desain editorial busana kontemporer. Antarmuka dirancang menyerupai majalah mode cetak kelas atas (*high-fashion lookbook*) yang dipadukan dengan kepraktisan digital modern.

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

### 1. Palet Warna Resmi (Color Tokens)

Sistem warna menggunakan palet netral hangat (*warm stone*) yang dipadukan dengan aksen terracotta terbakar (*burnt terracotta*). Menghilangkan gradasi ungu/biru generik khas kecerdasan buatan.

```
[#FAFAF9] Base Background (Warm Paper / Stone 50)
 ├── [#FFFFFF] Surface / Card Background
 ├── [#E7E5E4] Border & Divider (Stone 200)
 ├── [#A8A29E] Muted Border & Subtle Icon (Stone 400)
 ├── [#78716C] Secondary Text (Stone 500)
 ├── [#1C1917] Primary Text & Button Dark (Stone 900)
 └── [#C2410C] Primary Accent (Burnt Terracotta / Orange 700)
      ├── [#9A3412] Accent Hover (Orange 800)
      └── [#FFF7ED] Accent Subtle Surface (Orange 50)
```

#### Spesifikasi Nilai Hex Warna:
- **Latar Belakang Dasar (`--bg-base`)**: `#FAFAF9` (Stone-50). Memberikan sensasi kertas cetak majalah fashion yang hangat, jauh dari kesan putih silau rumah sakit.
- **Latar Permukaan Kartu & Modal (`--bg-surface`)**: `#FFFFFF` (Pure White). Digunakan pada kartu produk, panel modal, dan drawer keranjang dengan pembatas garis rambut (*hairline border*).
- **Teks Utama (`--text-primary`)**: `#1C1917` (Stone-900 / Deep Charcoal). Kontras tinggi rasio 13.8:1 terhadap latar belakang dasar, melampaui standar aksesibilitas WCAG AAA.
- **Teks Sekunder (`--text-secondary`)**: `#78716C` (Stone-500). Digunakan pada deskripsi material, tanggal pesanan, dan teks bantuan form (rasio kontras 4.7:1, lolos WCAG AA).
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
- **Subheading & Section Header**: `font-sans text-xs uppercase tracking-widest font-semibold text-stone-500` (11px s.d. 12px).
- **Body Regular**: `font-sans text-sm font-normal text-stone-800 leading-relaxed` (14px).
- **Body Small / Data Table**: `font-sans text-xs font-normal text-stone-600 leading-normal` (12px).
- **Micro Label / Badge**: `font-sans text-[11px] font-medium tracking-wider uppercase` (10px s.d. 11px).

> **Kepatuhan Aturan antislop R-02**: Seluruh teks antarmuka dan salinan promosi dilarang menggunakan tanda pisah panjang (*em dash* / U+2014). Gunakan tanda titik dua (`:`), tanda koma (`,`), atau tanda kurung (`()`) sebagai pengganti pemisah klausa.

### 3. Geometri Komponen & Sudut Lengkung (Border Radius Formula)

Sesuai dengan standar antislop untuk menghindari tombol kapsul generik (*pill buttons*):
- **Radius Tombol Utama & Input Form**: `rounded-sm` (2px) hingga `rounded` (4px). Potongan sudut tegas mencerminkan presisi jahitan busana formal.
- **Radius Kartu & Panel Modal**: `rounded-md` (6px). Memberikan lengkungan yang sangat halus tanpa kehilangan bentuk geometris yang rapi.
- **Larangan Khusus**: DILARANG menerapkan `rounded-full` pada tombol tindakan utama (seperti tombol Checkout, Tambah ke Keranjang, atau Login PIN). `rounded-full` hanya diizinkan untuk lingkaran pemilih warna (*color swatches*) berukuran 24x24px.

### 4. Sistem Bayangan & Garis Tepi (Shadows & Borders)
- Menghindari bayangan tebal dan kabur (*large diffuse floating shadows*).
- Mengutamakan garis batas tipis 1px (`border border-stone-200`).
- Bayangan interaksi dibatasi pada elevasi mikro:
  - `shadow-sm`: `0 1px 2px 0 rgba(28, 25, 23, 0.04)` untuk kartu katalog.
  - `shadow-lg`: `0 10px 25px -5px rgba(28, 25, 23, 0.08)` untuk slide-over keranjang dan modal dialog agar kontras terhadap backdrop gelap tipis (`bg-stone-900/40 backdrop-blur-none`).

### 5. Respon Interaksi & Status Komponen (Component States)

Setiap elemen interaktif wajib memiliki 5 keadaan terdefinisi:
1. **Keadaan Normal (Default)**: Tampilan kontras sesuai hierarki visual.
2. **Keadaan Sentuh (Hover)**: Perubahan warna latar yang halus (`transition-colors duration-150`). Tombol gelap `#1C1917` berubah menjadi `#292524`; tombol terracotta `#C2410C` berubah menjadi `#9A3412`.
3. **Keadaan Tekan (Active)**: Reduksi skala mikro (`active:scale-[0.99]`) memberikan umpan balik taktil.
4. **Keadaan Fokus Keyboard (`:focus-visible`)**: Cincin fokus tegas `ring-2 ring-stone-900 ring-offset-2 ring-offset-stone-50` untuk memastikan navigasi tabulasi ramah aksesibilitas.
5. **Keadaan Memuat & Dinonaktifkan (Loading / Disabled)**: Opasitas 50%, kursor `cursor-not-allowed`, teks tombol digantikan oleh spinner SVG berputar halus, mencegah pengiriman berulang (*anti-double-submit*).

---

## BAGIAN C: PANDUAN IMPLEMENTASI STOREFRONT & DASHBOARD

### 1. Tata Letak Storefront (Halaman Depan Toko)
- **Header Tetap (Sticky Header)**: Ketinggian 64px dengan latar belakang `#FAFAF9` bergaris pembatas bawah tipis. Terdiri dari teks logo brand di sebelah kiri, navigasi kategori di tengah (pada desktop), dan aksi cepat (Wishlist, Keranjang, Lacak Pesanan) di sebelah kanan.
- **Hero Lookbook Section**: Gambar rasio 16:9 atau 21:9 dengan overlay teks editorial yang proporsional, menampilkan tajuk koleksi utama.
- **Flash Sale & Bundle Block**:
  - Penanda waktu hitung mundur digital dengan kotak satuan Jam, Menit, dan Detik.
  - Kartu bundling busana menampilkan foto kombinasi produk, harga normal yang dicoret halus, harga paket hemat, dan tombol instan `+ Ambil Bundle`.
- **Bilah Filter Multi-Atribut**:
  - Filter kategori berbentuk tombol tab horizontal yang mudah digeser pada layar sentuh.
  - Chip ukuran pakaian berderet rapat (`XS`, `S`, `M`, `L`, `XL`, `XXL`, `3XL`, `4XL`, `5XL`) dengan indikasi aktif yang kontras.
  - Slider harga responsif yang memperbarui teks batas nominal secara langsung.
- **Grid Produk**:
  - Mobile: 2 kolom (`grid-cols-2 gap-3`).
  - Tablet/Desktop: 4 kolom (`sm:grid-cols-3 lg:grid-cols-4 gap-6`).
  - Foto produk berasio 3:4 (rasio standar potret mode pakaian).
  - Teks nama produk, kategori, dan harga tersaji utuh tanpa pemotongan teks gantung.

### 2. Tata Letak Admin Dashboard (Panel Operasional)
- **Struktur Antarmuka**: Sidebar navigasi tetap di sebelah kiri (pada layar lebar) atau drawer menu (pada layar ponsel), dipadukan dengan area kerja utama yang responsif.
- **Ringkasan KPI (4-Card Metric Grid)**:
  - Kartu metrik bergaris pembatas rapi dengan nilai angka tebal dan label deskriptif berbahasa Indonesia.
- **Tabel Pesanan & Varian SKU (Fluid Table Typography)**:
  - Menyesuaikan ukuran layar dengan pembungkusan teks multi-tier (*multi-tier wrap*) pada informasi invoice dan nama pelanggan.
  - DILARANG menggunakan pemotongan teks dengan elipsis (`...`) pada nomor invoice (`INV-YYYYMM-XXX`) maupun kode SKU.
  - Kolom input ongkir manual tersaji secara *inline* sehingga operator toko dapat langsung memperbarui nominal dan menekan tombol simpan dengan cepat.
- **Visualisasi Corong Konversi (CSS-Only Conversion Funnel)**:
  - Diagram batang horizontal murni menggunakan CSS Flexbox dengan label tahapan: Kunjungan Produk, Tambah ke Keranjang, Checkout WhatsApp, dan Pembayaran Selesai.

---

## BAGIAN D: CHECKLIST KEPATUHAN DELIVERY GATE (ANTISLOP AUDIT)

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
  - Teks nomor invoice dan SKU tidak pernah terpotong elipsis.
  - Kontras teks memenuhi syarat minimum rasio 4.5:1 (WCAG AA).
