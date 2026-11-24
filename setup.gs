/**
 * ================================================================================
 * ARYASTORE E-COMMERCE ENGINE - DATABASE SETUP & SAFE MIGRATION SCRIPT v2.0
 * ================================================================================
 * File: setup.gs
 * Target: Google Apps Script + Google Sheets
 * Standard: RetroBOT v3.0 Database Architecture & Non-Destructive Safe Migration v2.0
 * 
 * Capabilities:
 * 1. Sheet tab names strictly without underscores ('Products', 'ProductVariants', etc.)
 * 2. Idempotent initialization: creates missing sheets, never calls clear() on existing data
 * 3. Safe rightmost-append column migration: if an existing sheet has fewer header columns
 *    than SCHEMA_DEFINITIONS[tabName].headers.length, appends only missing columns on the right
 * 4. Comprehensive idempotent seed data:
 *    - 19 curated editorial fashion articles across 5 categories (Outerwear, Tops, Bottoms, Footwear, Accessories)
 *    - 73 variant SKUs covering inclusive sizing (XS to 5XL) and editorial color swatches
 *    - 2 verified outfit bundles (BND-001, BND-002) with verified image URLs and item manifests
 *    - Promo coupons: WELCOME10, HEMAT50K, GLOBALSHIP
 *    - Sample customers, multi-currency international orders with UTM attribution, and returns
 *    - Complete v2.0 Settings: Brand, WA, Multi-currency rates, Domestic 8-zone + International 8-zone rates,
 *      Marketplace links, Social links, SEO metadata, and Ads Pixels
 * 5. Automatic SpreadsheetApp.flush() on all write transactions
 * 6. Google Sheets custom menu (onOpen) with '🛍️ AryaStore > Inisialisasi Database'
 * ================================================================================
 */

// ================================================================================
// 1. COLUMN INDEX CONSTANTS (Zero-Based Mapping for All 10 Entities v2.0)
// ================================================================================

var COL_PRODUCTS = {
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

var COL_VARIANTS = {
  VARIANT_ID: 0,
  PRODUCT_ID: 1,
  SKU: 2,
  COLOR: 3,
  SIZE: 4,
  STOCK: 5,
  IMAGE_URL: 6
};

var COL_CAMPAIGNS = {
  CAMPAIGN_ID: 0,
  BANNER_TITLE: 1,
  BANNER_DESC: 2,
  ENDS_AT: 3,
  IS_ACTIVE: 4,
  BUNDLE_ITEMS_JSON: 5,
  NORMAL_PRICE: 6,
  BUNDLE_PRICE: 7
};

var COL_ORDERS = {
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
  UTM_SOURCE: 17,
  TRACKING_NUMBER: 18,
  SHIPPING_STATUS: 19,
  SHIPPED_AT: 20,
  SHIPPING_NOTES: 21
};

var COL_CUSTOMERS = {
  CUSTOMER_ID: 0,
  NAME: 1,
  WHATSAPP_NO: 2,
  TOTAL_ORDERS: 3,
  TOTAL_SPENT: 4,
  CREATED_AT: 5,
  NOTES: 6
};

var COL_COUPONS = {
  CODE: 0,
  DISCOUNT_TYPE: 1,
  DISCOUNT_VALUE: 2,
  MIN_SPEND: 3,
  DESCRIPTION: 4,
  IS_ACTIVE: 5
};

var COL_RETURNS = {
  RETURN_ID: 0,
  INVOICE_NO: 1,
  CUSTOMER_NAME: 2,
  REASON: 3,
  REQUESTED_SIZE: 4,
  STATUS: 5,
  ADMIN_NOTES: 6
};

var COL_AUDIT_LOGS = {
  TIMESTAMP: 0,
  ACTOR_ROLE: 1,
  MODULE: 2,
  ACTION_DETAIL: 3
};

var COL_EVENT_LOGS = {
  TIMESTAMP: 0,
  EVENT_NAME: 1,
  PAYLOAD_JSON: 2
};

var COL_SETTINGS = {
  KEY: 0,
  VALUE: 1,
  DESCRIPTION: 2
};

// ================================================================================
// 2. MASTER SCHEMA DEFINITIONS (The 10 Non-Underscored Sheets v2.0)
// ================================================================================

var SCHEMA_DEFINITIONS = {
  Products: {
    headers: [
      'id',
      'name',
      'category',
      'base_price',
      'badge',
      'description',
      'image_url',
      'created_at',
      'name_en',
      'description_en',
      'weight_gram',
      'marketplace_links_json',
      'color_images_json'
    ],
    colMap: COL_PRODUCTS
  },
  ProductVariants: {
    headers: ['variant_id', 'product_id', 'sku', 'color', 'size', 'stock', 'image_url'],
    colMap: COL_VARIANTS
  },
  CampaignsAndBundles: {
    headers: [
      'campaign_id',
      'banner_title',
      'banner_desc',
      'ends_at',
      'is_active',
      'bundle_items_json',
      'normal_price',
      'bundle_price'
    ],
    colMap: COL_CAMPAIGNS
  },
  Orders: {
    headers: [
      'invoice_no',
      'created_at',
      'customer_id',
      'customer_name',
      'whatsapp_no',
      'items_json',
      'subtotal',
      'coupon_code',
      'coupon_discount',
      'shipping_method',
      'shipping_cost',
      'grand_total',
      'payment_proof_url',
      'status',
      'shipping_zone',
      'currency_code',
      'exchange_rate',
      'utm_source',
      'tracking_number',
      'shipping_status',
      'shipped_at',
      'shipping_notes'
    ],
    colMap: COL_ORDERS
  },
  Customers: {
    headers: ['customer_id', 'name', 'whatsapp_no', 'total_orders', 'total_spent', 'created_at', 'notes'],
    colMap: COL_CUSTOMERS
  },
  Coupons: {
    headers: ['code', 'discount_type', 'discount_value', 'min_spend', 'description', 'is_active'],
    colMap: COL_COUPONS
  },
  Returns: {
    headers: ['return_id', 'invoice_no', 'customer_name', 'reason', 'requested_size', 'status', 'admin_notes'],
    colMap: COL_RETURNS
  },
  AuditLogs: {
    headers: ['timestamp', 'actor_role', 'module', 'action_detail'],
    colMap: COL_AUDIT_LOGS
  },
  EventLogs: {
    headers: ['timestamp', 'event_name', 'payload_json'],
    colMap: COL_EVENT_LOGS
  },
  Settings: {
    headers: ['key', 'value', 'description'],
    colMap: COL_SETTINGS
  }
};

// ================================================================================
// 3. HELPER UTILITIES
// ================================================================================

/**
 * Returns formatted timestamp in Asia/Jakarta timezone (WIB).
 * Falls back safely to ISO string if run outside GAS.
 */
function getTimestamp() {
  if (typeof Utilities !== 'undefined' && Utilities.formatDate) {
    return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  }
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Safely retrieves the active Spreadsheet instance.
 */
function getSpreadsheet() {
  if (typeof SpreadsheetApp !== 'undefined') {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
  return null;
}

// ================================================================================
// 4. MAIN SETUP & MIGRATION FUNCTION (Safe Rightmost-Append Migration)
// ================================================================================

/**
 * Initializes all 10 required database sheets, verifies/appends headers,
 * synchronizes missing columns strictly at the rightmost position without data loss,
 * and executes idempotent seeding.
 */
function setupDatabase() {
  var ss = getSpreadsheet();
  if (!ss) {
    throw new Error('SpreadsheetApp tidak tersedia. Pastikan script ini dijalankan di dalam Google Sheets container.');
  }

  var sheetNames = Object.keys(SCHEMA_DEFINITIONS);
  var migrationReport = [];

  for (var i = 0; i < sheetNames.length; i++) {
    var sheetName = sheetNames[i];
    var schema = SCHEMA_DEFINITIONS[sheetName];
    var sheet = ss.getSheetByName(sheetName);

    // 1. Create sheet if missing
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    // 2. If completely empty, write full expected headers
    if (lastRow === 0 || lastCol === 0) {
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      formatHeaderRow(sheet, schema.headers.length);
      migrationReport.push(sheetName + ': Lembar kerja dibuat dan header diinisialisasi (' + schema.headers.length + ' kolom).');
    } else {
      // 3. Safe rightmost-append: compare existing header row with schema
      var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var missingHeaders = [];

      for (var h = 0; h < schema.headers.length; h++) {
        var expectedCol = schema.headers[h];
        if (existingHeaders.indexOf(expectedCol) === -1) {
          missingHeaders.push(expectedCol);
        }
      }

      if (missingHeaders.length > 0) {
        var startCol = lastCol + 1;
        sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
        sheet.getRange(1, startCol, 1, missingHeaders.length)
          .setFontWeight('bold')
          .setBackground('#F5F5F4')
          .setFontColor('#1C1917');
        migrationReport.push(sheetName + ': Menambahkan kolom baru (' + missingHeaders.join(', ') + ') di posisi kanan.');
      } else {
        migrationReport.push(sheetName + ': Skema sudah sinkron (' + lastCol + ' kolom).');
      }
    }
  }

  // 4. Run idempotent seeding
  var seedResult = seedDatabase();

  // 5. Commit all writes
  SpreadsheetApp.flush();

  // 6. Log audit entry for migration
  logSystemAudit('Super Admin', 'SYSTEM_MIGRATION', 'setupDatabase v2.0 executed successfully. ' + migrationReport.join(' | '));

  return {
    success: true,
    timestamp: getTimestamp(),
    migrationReport: migrationReport,
    seedResult: seedResult
  };
}

/**
 * Formats the header row with clean, high-contrast Editorial styling.
 */
function formatHeaderRow(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange
    .setFontWeight('bold')
    .setBackground('#F5F5F4')
    .setFontColor('#1C1917')
    .setHorizontalAlignment('left');

  sheet.setFrozenRows(1);
}

// ================================================================================
// 5. IDEMPOTENT SEED DATA ENGINE (Baseline 19 Produk & Konfigurasi v2.0)
// ================================================================================

/**
 * Seeds initial data for all 10 entities idempotently.
 * Checks for existing unique keys before inserting to guarantee zero duplication.
 */
function seedDatabase() {
  var ss = getSpreadsheet();
  if (!ss) return { success: false, message: 'Spreadsheet not accessible' };

  var results = {
    settingsAdded: 0,
    productsAdded: 0,
    productsUpdated: 0,
    variantsAdded: 0,
    campaignsAdded: 0,
    couponsAdded: 0,
    customersAdded: 0,
    ordersAdded: 0,
    returnsAdded: 0,
    auditLogsAdded: 0,
    eventLogsAdded: 0
  };

  var now = getTimestamp();

  // ----------------------------------------------------------------------------
  // A. Seed Settings (Comprehensive Configuration & RBAC PINs v2.0)
  // ----------------------------------------------------------------------------
  var settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet) {
    var existingKeys = getExistingColumnValues(settingsSheet, 0);

    var defaultSettings = [
      {
        key: 'BRAND_NAME',
        value: 'AryaStore',
        description: 'Nama resmi toko dan merek apparel yang ditampilkan pada storefront, invoice, dan notifikasi'
      },
      {
        key: 'WA_NUMBER',
        value: '6281234567890',
        description: 'Nomor WhatsApp resmi admin tujuan penerimaan order dan konfirmasi transfer (format 62...)'
      },
      {
        key: 'CURRENCY_PREFIX',
        value: 'Rp ',
        description: 'Format prefiks mata uang dasar IDR'
      },
      {
        key: 'DEFAULT_LANGUAGE',
        value: 'id',
        description: 'Bahasa default antarmuka storefront dan notifikasi (id / en)'
      },
      {
        key: 'DEFAULT_CURRENCY',
        value: 'IDR',
        description: 'Mata uang default dasar transaksi'
      },
      {
        key: 'CURRENCY_AUTO_SYNC',
        value: 'TRUE',
        description: 'Sakelar sinkronisasi nilai tukar valas otomatis'
      },
      {
        key: 'CURRENCY_RATES_JSON',
        value: JSON.stringify({
          IDR: 1,
          USD: 0.000063,
          EUR: 0.000058,
          SGD: 0.000085,
          MYR: 0.00028,
          JPY: 0.0098,
          GBP: 0.000050,
          AUD: 0.000096
        }),
        description: 'Nilai tukar 8 valuta dunia terhadap IDR'
      },
      {
        key: 'FREE_SHIPPING_THRESHOLD_IDR',
        value: '1500000',
        description: 'Ambang batas belanja gratis ongkir domestik (Rp 1.500.000)'
      },
      {
        key: 'SHIPPING_RATES_JSON',
        value: JSON.stringify({
          zones: {
            JABODETABEK: { flat: 15000, perKg: 10000, label_id: 'Jabodetabek', label_en: 'Greater Jakarta', group: 'DOMESTIC' },
            JAWA_BARAT: { flat: 20000, perKg: 12000, label_id: 'Jawa Barat & Banten', label_en: 'West Java & Banten', group: 'DOMESTIC' },
            JAWA_TENGAH_DIY: { flat: 22000, perKg: 13000, label_id: 'Jawa Tengah & DIY', label_en: 'Central Java & Yogyakarta', group: 'DOMESTIC' },
            JAWA_TIMUR: { flat: 25000, perKg: 15000, label_id: 'Jawa Timur', label_en: 'East Java', group: 'DOMESTIC' },
            BALI_NTB_NTT: { flat: 35000, perKg: 20000, label_id: 'Bali, NTB & NTT', label_en: 'Bali & Nusa Tenggara', group: 'DOMESTIC' },
            SUMATERA: { flat: 40000, perKg: 22000, label_id: 'Sumatera', label_en: 'Sumatra', group: 'DOMESTIC' },
            KALIMANTAN: { flat: 45000, perKg: 25000, label_id: 'Kalimantan', label_en: 'Kalimantan / Borneo', group: 'DOMESTIC' },
            SULAWESI_MALUKU_PAPUA: { flat: 55000, perKg: 30000, label_id: 'Sulawesi, Maluku & Papua', label_en: 'Eastern Indonesia', group: 'DOMESTIC' },
            JAWA_BALI: { flat: 25000, perKg: 15000, label_id: 'Jawa & Bali (Reguler)', label_en: 'Java & Bali (Standard)', group: 'DOMESTIC' },
            LUAR_JAWA: { flat: 45000, perKg: 25000, label_id: 'Luar Jawa (Reguler)', label_en: 'Outer Islands (Standard)', group: 'DOMESTIC' },
            SINGAPORE: { flat: 120000, perKg: 70000, label_id: 'Singapura', label_en: 'Singapore', group: 'INTERNATIONAL' },
            MALAYSIA: { flat: 130000, perKg: 75000, label_id: 'Malaysia', label_en: 'Malaysia', group: 'INTERNATIONAL' },
            SOUTHEAST_ASIA: { flat: 180000, perKg: 95000, label_id: 'Asia Tenggara (TH/PH/VN)', label_en: 'Southeast Asia (TH/PH/VN)', group: 'INTERNATIONAL' },
            EAST_ASIA: { flat: 250000, perKg: 130000, label_id: 'Asia Timur (JP/KR/TW/HK)', label_en: 'East Asia (JP/KR/TW/HK)', group: 'INTERNATIONAL' },
            AUSTRALIA_NZ: { flat: 280000, perKg: 150000, label_id: 'Australia & Selandia Baru', label_en: 'Australia & New Zealand', group: 'INTERNATIONAL' },
            EUROPE: { flat: 320000, perKg: 180000, label_id: 'Eropa (UK/DE/FR/NL)', label_en: 'Europe (UK/DE/FR/NL)', group: 'INTERNATIONAL' },
            NORTH_AMERICA: { flat: 350000, perKg: 200000, label_id: 'Amerika Utara (US/CA)', label_en: 'North America (US/CA)', group: 'INTERNATIONAL' },
            REST_OF_WORLD: { flat: 400000, perKg: 250000, label_id: 'Seluruh Dunia Lainnya', label_en: 'Rest of the World', group: 'INTERNATIONAL' },
            INTERNATIONAL_SEA: { flat: 150000, perKg: 80000, label_id: 'Asia Tenggara (Ekspres)', label_en: 'Southeast Asia Express', group: 'INTERNATIONAL' },
            INTERNATIONAL_GLOBAL: { flat: 350000, perKg: 200000, label_id: 'Internasional Global', label_en: 'Global International', group: 'INTERNATIONAL' }
          }
        }),
        description: 'Matriks tarif ongkos kirim lengkap 8 zona domestik dan 8 zona internasional'
      },
      {
        key: 'MARKETPLACE_LINKS_JSON',
        value: JSON.stringify({
          shopee: 'https://shopee.co.id/aryastore',
          tokopedia: 'https://tokopedia.com/aryastore',
          tiktokshop: 'https://tiktok.com/@aryastore'
        }),
        description: 'Tautan resmi toko ke marketplace eksternal Shopee, Tokopedia, dan TikTok Shop'
      },
      {
        key: 'SOCIAL_LINKS_JSON',
        value: JSON.stringify({
          instagram: 'https://instagram.com/aryastore.id',
          tiktok: 'https://tiktok.com/@aryastore',
          facebook: 'https://facebook.com/aryastore',
          youtube: 'https://youtube.com/@aryastore',
          pinterest: 'https://pinterest.com/aryastore',
          whatsapp: 'https://wa.me/6281234567890'
        }),
        description: 'Tautan resmi saluran media sosial AryaStore'
      },
      {
        key: 'STORE_BASE_URL',
        value: 'https://sisigitadi.github.io/AryaStore',
        description: 'URL basis kanonikal publikasi toko'
      },
      {
        key: 'SEO_TITLE',
        value: 'AryaStore - Modern Minimalist Fashion & Curated Apparel',
        description: 'Judul global mesin pencari dan OpenGraph'
      },
      {
        key: 'SEO_DESCRIPTION',
        value: 'AryaStore menghadirkan koleksi busana minimalis kontemporer berkualitas tinggi dengan kurasi bahan premium, potongan presisi, dan pengiriman ke seluruh dunia.',
        description: 'Deskripsi global mesin pencari dan OpenGraph'
      },
      {
        key: 'SEO_KEYWORDS',
        value: 'fashion minimalis, apparel indonesia, aryastore, baju pria wanita, jaket premium, outerwear, belanja baju online',
        description: 'Kata kunci global meta SEO'
      },
      {
        key: 'GA4_MEASUREMENT_ID',
        value: 'G-XXXXXXXXXX',
        description: 'ID Google Analytics 4'
      },
      {
        key: 'GOOGLE_ADS_ID',
        value: 'AW-XXXXXXXXXX',
        description: 'ID Google Ads Remarketing'
      },
      {
        key: 'GOOGLE_ADS_CONVERSION_LABEL',
        value: 'XXXXXXXXXXXXX',
        description: 'Label konversi Google Ads Checkout'
      },
      {
        key: 'GTM_ID',
        value: 'GTM-XXXXXXX',
        description: 'ID Wadah Google Tag Manager'
      },
      {
        key: 'META_PIXEL_ID',
        value: '123456789012345',
        description: 'ID Meta / Facebook Pixel'
      },
      {
        key: 'TIKTOK_PIXEL_ID',
        value: 'CXXXXXXXXXXXXXXXXX',
        description: 'ID TikTok Pixel'
      },
      {
        key: 'PIN_SUPER_ADMIN',
        value: '9999',
        description: 'PIN otorisasi Super Admin (akses penuh seluruh modul dan pengaturan sistem - RAHASIA)'
      },
      {
        key: 'PIN_STORE_MANAGER',
        value: '8888',
        description: 'PIN otorisasi Store Manager (katalog produk, stok varian SKU, dan operasional pesanan - RAHASIA)'
      },
      {
        key: 'PIN_CUSTOMER_SERVICE',
        value: '7777',
        description: 'PIN otorisasi Customer Service (verifikasi transfer, status pesanan, dan penanganan retur - RAHASIA)'
      },
      {
        key: 'DRIVE_FOLDER_NAME',
        value: 'ARYASTORE_PAYMENTS',
        description: 'Nama folder Google Drive tempat penampungan bukti transfer pembayaran'
      },
      {
        key: 'DRIVE_PRODUCTS_FOLDER_NAME',
        value: 'ARYASTORE_PRODUCTS',
        description: 'Nama folder Google Drive penampung foto produk & varian warna'
      },
      {
        key: 'SHIPPING_METHODS',
        value: JSON.stringify([
          { id: 'REG', name: 'Reguler (JNE/J&T)', estimated_days: '2-3 Hari Kerja', note: 'Ongkir dihitung otomatis berdasarkan zona dan berat' },
          { id: 'EXP', name: 'Express (SiCepat/Paxel)', estimated_days: '1-2 Hari Kerja', note: 'Ongkir dihitung otomatis berdasarkan zona dan berat' },
          { id: 'INTL', name: 'International Shipping (DHL/FedEx)', estimated_days: '4-7 Business Days', note: 'Worldwide delivery calculated per kg' },
          { id: 'STORE', name: 'Ambil di Toko', estimated_days: 'Hari Kerja Toko (10.00 - 20.00)', note: 'Bebas biaya ongkos kirim' }
        ]),
        description: 'Daftar metode ekspedisi pengiriman yang aktif di cart checkout'
      },
      {
        key: 'SHIPPING_PROVIDER',
        value: 'AUTO',
        description: 'Mode kalkulasi ongkos kirim: AUTO (RajaOngkir lalu Biteship lalu Matrix), MATRIX, RAJAONGKIR, atau BITESHIP'
      },
      {
        key: 'RAJAONGKIR_API_KEY',
        value: '',
        description: 'Kunci API RajaOngkir Komerce v2 untuk tarif live domestik dan internasional (RAHASIA)'
      },
      {
        key: 'RAJAONGKIR_ORIGIN_ID',
        value: '17470',
        description: 'ID Lokasi Asal Toko di RajaOngkir Komerce (default 17470 untuk Jakarta Selatan)'
      },
      {
        key: 'RAJAONGKIR_COURIERS_DOMESTIC',
        value: 'jne:sicepat:jnt:pos:tiki:anteraja',
        description: 'Daftar kode kurir domestik aktif untuk RajaOngkir Komerce (dipisahkan titik dua)'
      },
      {
        key: 'RAJAONGKIR_COURIERS_INTL',
        value: 'pos:jne:tiki',
        description: 'Daftar kode kurir internasional aktif untuk RajaOngkir Komerce (dipisahkan titik dua)'
      },
      {
        key: 'BITESHIP_API_KEY',
        value: '',
        description: 'Kunci API Biteship v1 untuk tarif live kurir multi-ekspedisi dan internasional (RAHASIA)'
      },
      {
        key: 'BITESHIP_ORIGIN_POSTAL_CODE',
        value: '12190',
        description: 'Kode pos asal pengiriman toko untuk Biteship (default 12190 untuk Jakarta Selatan)'
      },
      {
        key: 'BITESHIP_COURIERS',
        value: 'jne,jnt,sicepat,paxel,anteraja,pos,dhl,tlx,rayspeed',
        description: 'Daftar kode kurir aktif untuk Biteship (dipisahkan koma)'
      },
      {
        key: 'HERO_BADGE',
        value: 'Koleksi Esensial 2026 : Volume I',
        description: 'Teks badge editorial seksi Hero Lookbook (Bahasa Indonesia)'
      },
      {
        key: 'HERO_BADGE_EN',
        value: 'Essential Collection 2026 : Volume I',
        description: 'Teks badge editorial seksi Hero Lookbook (English)'
      },
      {
        key: 'HERO_TITLE',
        value: 'Siluet Minimalis,<br>Presisi Material Abadi.',
        description: 'Judul utama headline Hero Lookbook (Bahasa Indonesia)'
      },
      {
        key: 'HERO_TITLE_EN',
        value: 'Minimalist Silhouette,<br>Timeless Precision Materials.',
        description: 'Judul utama headline Hero Lookbook (English)'
      },
      {
        key: 'HERO_DESC',
        value: 'Koleksi busana kontemporer berpotongan terstruktur untuk kenyamanan mobilitas harian dan keanggunan formal. Dirancang dengan serat pilihan berkualitas tinggi dan jahitan halus presisi.',
        description: 'Paragraf deskripsi Hero Lookbook (Bahasa Indonesia)'
      },
      {
        key: 'HERO_DESC_EN',
        value: 'Contemporary structured apparel curated for everyday mobility and formal poise. Crafted with premium natural fibres and refined tailoring.',
        description: 'Paragraf deskripsi Hero Lookbook (English)'
      },
      {
        key: 'HERO_IMAGE_URL',
        value: 'https://images.unsplash.com/photo-1613915617430-8ab0fd7c6baf?auto=format&fit=crop&w=1000&q=80',
        description: 'URL foto utama Hero Lookbook (dapat diunggah langsung ke Google Drive via admin)'
      },
      {
        key: 'HERO_CAPTION_TITLE',
        value: 'Atelier Lookbook 2026',
        description: 'Judul kartu caption foto Hero Lookbook (Bahasa Indonesia)'
      },
      {
        key: 'HERO_CAPTION_TITLE_EN',
        value: 'Atelier Lookbook 2026',
        description: 'Judul kartu caption foto Hero Lookbook (English)'
      },
      {
        key: 'HERO_CAPTION_DESC',
        value: 'Dirancang di Jakarta, dikirimkan dengan cermat ke seluruh dunia.',
        description: 'Deskripsi kartu caption foto Hero Lookbook (Bahasa Indonesia)'
      },
      {
        key: 'HERO_CAPTION_DESC_EN',
        value: 'Crafted in Jakarta, meticulously dispatched worldwide.',
        description: 'Deskripsi kartu caption foto Hero Lookbook (English)'
      },
      {
        key: 'HERO_CTA_EXPLORE',
        value: 'Jelajahi Katalog',
        description: 'Label tombol CTA jelajah katalog Hero (Bahasa Indonesia)'
      },
      {
        key: 'HERO_CTA_EXPLORE_EN',
        value: 'Explore Catalog',
        description: 'Label tombol CTA jelajah katalog Hero (English)'
      },
      {
        key: 'HERO_CTA_GUIDE',
        value: 'Panduan Ukuran (XS - 5XL)',
        description: 'Label tombol CTA panduan ukuran Hero (Bahasa Indonesia)'
      },
      {
        key: 'HERO_CTA_GUIDE_EN',
        value: 'Size Guide (XS - 5XL)',
        description: 'Label tombol CTA panduan ukuran Hero (English)'
      },
      {
        key: 'ANNOUNCEMENT_TAG',
        value: 'Koleksi Musim Terbatas',
        description: 'Tag headline pada bilah pengumuman atas (Bahasa Indonesia)'
      },
      {
        key: 'ANNOUNCEMENT_TAG_EN',
        value: 'Limited Season Drop',
        description: 'Tag headline pada bilah pengumuman atas (English)'
      },
      {
        key: 'ANNOUNCEMENT_TITLE',
        value: 'Potongan Spesial Flash Sale Berlangsung',
        description: 'Judul promo banner bilah pengumuman atas (Bahasa Indonesia)'
      },
      {
        key: 'ANNOUNCEMENT_TITLE_EN',
        value: 'Special Flash Sale Curation Now Live',
        description: 'Judul promo banner bilah pengumuman atas (English)'
      },
      {
        key: 'ATELIER_ADDRESS',
        value: 'Atelier Studio: Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan 12190',
        description: 'Alamat fisik studio atelier pada footer dan faktur'
      },
      {
        key: 'CUSTOMER_CARE_HOURS',
        value: 'Senin - Sabtu: 09.00 - 18.00 WIB',
        description: 'Jam operasional layanan pelanggan (Bahasa Indonesia)'
      },
      {
        key: 'CUSTOMER_CARE_HOURS_EN',
        value: 'Monday - Saturday: 09.00 - 18.00 WIB (UTC+7)',
        description: 'Jam operasional layanan pelanggan (English)'
      },
      {
        key: 'CUSTOMER_CARE_EMAIL',
        value: 'concierge@aryastore.id',
        description: 'Email resmi concierge atelier'
      },
      {
        key: 'FOOTER_ABOUT_TEXT',
        value: 'Studio busana kontemporer independen yang berdedikasi pada siluet minimalis, presisi material abadi, dan keanggunan berkarakter.',
        description: 'Narasi ringkas tentang brand AryaStore pada footer (Bahasa Indonesia)'
      },
      {
        key: 'FOOTER_ABOUT_TEXT_EN',
        value: 'Independent contemporary apparel studio dedicated to structured silhouettes, timeless textile precision, and quiet poise.',
        description: 'Narasi ringkas tentang brand AryaStore pada footer (English)'
      },
      {
        key: 'VALUE_PROPOSITIONS_JSON',
        value: JSON.stringify([
          {
            key: 'shipping',
            title: 'Pengiriman Seluruh Dunia',
            title_en: 'Worldwide Dispatch',
            desc: 'Layanan kurir domestik tercepat dan ekspres internasional tepercaya ke 50+ negara.',
            desc_en: 'Fast domestic logistics and trusted express worldwide delivery to 50+ destinations.'
          },
          {
            key: 'material',
            title: 'Bahan Serat Alami Pilihan',
            title_en: 'Curated Natural Fibres',
            desc: 'Wol terstruktur, linen murni bernapas, katun combed premium, dan kulit sintetis ramah lingkungan.',
            desc_en: 'Structured wool, breathable pure linen, premium combed cotton, and sustainable trims.'
          },
          {
            key: 'exchange',
            title: 'Garansi Tukar Ukuran 3 Hari',
            title_en: '3-Day Size Exchange Guarantee',
            desc: 'Ketidaksesuaian ukuran pakaian dapat ditukarkan dengan cepat melalui studio atelier kami.',
            desc_en: 'Effortless and prompt size exchanges handled directly through our atelier studio.'
          },
          {
            key: 'service',
            title: 'Layanan Personal Atelier',
            title_en: 'Dedicated Atelier Concierge',
            desc: 'Konsultasi gaya, rekomendasi ukuran, dan pelacakan langsung via WhatsApp resmi.',
            desc_en: 'Styling advice, size recommendations, and real-time tracking via official WhatsApp.'
          }
        ]),
        description: 'Konfigurasi 4 kartu keunggulan atelier (Trust Bar) dwibahasa'
      }
    ];

    for (var s = 0; s < defaultSettings.length; s++) {
      var setting = defaultSettings[s];
      if (existingKeys.indexOf(setting.key) === -1) {
        settingsSheet.appendRow([setting.key, setting.value, setting.description]);
        results.settingsAdded++;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // B. Seed 19 Fashion Products & 73 Variant SKUs (catalog-v2.json)
  // ----------------------------------------------------------------------------
  var productsSheet = ss.getSheetByName('Products');
  var variantsSheet = ss.getSheetByName('ProductVariants');

  if (productsSheet && variantsSheet) {
    var existingProductIds = getExistingColumnValues(productsSheet, 0);
    var existingVariantIds = getExistingColumnValues(variantsSheet, 0);

    var sampleProducts = [
  {
    "id": "PRD-001",
    "name": "Mantel Wol Terstruktur Atelier",
    "category": "Outerwear",
    "base_price": 1250000,
    "badge": "Best Seller",
    "description": "Mantel wol potongan terstruktur dengan kerah takik lebar, ikat pinggang senada, dan lapisan furing satin halus untuk kenyamanan maksimal.",
    "image_url": "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-01 10:00:00",
    "name_en": "Atelier Structured Wool Coat",
    "description_en": "Structured wool-blend coat tailored with wide notch lapels, a matching waist tie belt, and smooth satin lining for elevated layering.",
    "weight_gram": 920,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Mantel+Wol+Terstruktur+Atelier\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Mantel+Wol+Terstruktur+Atelier\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Mantel+Wol+Terstruktur+Atelier\"}"
  },
  {
    "id": "PRD-002",
    "name": "Kemeja Linen Santai Minimalis",
    "category": "Tops",
    "base_price": 420000,
    "badge": "New Arrival",
    "description": "Kemeja lengan panjang dari serat linen alami yang sejuk dan bernapas. Dirancang berpotongan santai dengan kancing mutiara minimalis untuk iklim tropis.",
    "image_url": "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-02 11:30:00",
    "name_en": "Minimalist Relaxed Linen Shirt",
    "description_en": "Long-sleeve button-down crafted from breathable pure flax linen. Cut in a relaxed silhouette with understated pearl buttons suited for warm climates.",
    "weight_gram": 300,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Kemeja+Linen+Santai+Minimalis\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Kemeja+Linen+Santai+Minimalis\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Kemeja+Linen+Santai+Minimalis\"}"
  },
  {
    "id": "PRD-003",
    "name": "Celana Lipit Wide-Leg Atelier",
    "category": "Bottoms",
    "base_price": 580000,
    "badge": "Best Seller",
    "description": "Celana panjang berlipit ganda dengan pinggang tinggi dan potongan wide-leg yang jatuh rapi. Menggunakan bahan katun-viscose bertekstur lembut.",
    "image_url": "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-03 14:00:00",
    "name_en": "Pleated Wide-Leg Trousers",
    "description_en": "High-waisted trousers with tailored front pleats and a fluid wide-leg drape. Woven from a soft cotton-viscose blend for clean daily movement.",
    "weight_gram": 460,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Celana+Lipit+Wide-Leg+Atelier\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Celana+Lipit+Wide-Leg+Atelier\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Celana+Lipit+Wide-Leg+Atelier\"}"
  },
  {
    "id": "PRD-004",
    "name": "Sepatu Bot Kulit Heritage Minimalis",
    "category": "Footwear",
    "base_price": 1150000,
    "badge": "Limited Edition",
    "description": "Sepatu bot semata kaki dari kulit sapi asli full-grain dengan detail cap-toe klasik, lubang tali logam tahan karat, dan sol karet anti-selip.",
    "image_url": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-04 09:15:00",
    "name_en": "Minimalist Leather Heritage Boots",
    "description_en": "Ankle-high service boots handcrafted from full-grain leather featuring classic cap-toe stitching, brushed metal eyelets, and a durable rubber outsole.",
    "weight_gram": 1120,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Sepatu+Bot+Kulit+Heritage\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Sepatu+Bot+Kulit+Heritage\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Sepatu+Bot+Kulit+Heritage\"}"
  },
  {
    "id": "PRD-005",
    "name": "Kaos Katun Tebal Oversized",
    "category": "Tops",
    "base_price": 240000,
    "badge": "Best Seller",
    "description": "Kaos potongan oversized berbahan 100% katun combed 240 GSM dengan kerah rib tebal anti-melar. Jatuh rapi di tubuh dan nyaman dikenakan sepanjang hari.",
    "image_url": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-05 16:40:00",
    "name_en": "Heavyweight Cotton Oversized Tee",
    "description_en": "Oversized crewneck tee knit from 240 GSM combed cotton with a dense ribbed neckline. Holds a clean architectural drape wash after wash.",
    "weight_gram": 250,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Kaos+Katun+Tebal+Oversized\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Kaos+Katun+Tebal+Oversized\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Kaos+Katun+Tebal+Oversized\"}"
  },
  {
    "id": "PRD-006",
    "name": "Blazer Single-Breasted Terstruktur",
    "category": "Outerwear",
    "base_price": 980000,
    "badge": "New Arrival",
    "description": "Blazer formal dan smart-casual berpotongan presisi dengan bahu berstruktur, kerah takik bersih, serta furing bernapas untuk kenyamanan kerja maupun acara malam.",
    "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-06 13:20:00",
    "name_en": "Tailored Single-Breasted Blazer",
    "description_en": "Precision-cut single-breasted blazer with structured shoulders, crisp notch lapels, and breathable lining built for modern office and evening wear.",
    "weight_gram": 780,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Blazer+Single-Breasted+Terstruktur\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Blazer+Single-Breasted+Terstruktur\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Blazer+Single-Breasted+Terstruktur\"}"
  },
  {
    "id": "PRD-007",
    "name": "Celana Jeans Selvedge Potongan Lurus",
    "category": "Bottoms",
    "base_price": 650000,
    "badge": "Limited Edition",
    "description": "Celana denim tenun selvedge 14 oz dengan jahitan kontras kokoh dan potongan lurus klasik yang membentuk karakter warna alami seiring pemakaian.",
    "image_url": "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-07 11:00:00",
    "name_en": "Raw Selvedge Straight Cut Jeans",
    "description_en": "14 oz selvedge denim crafted in a timeless straight-leg cut with durable contrast stitching designed to develop personal patina over time.",
    "weight_gram": 540,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Celana+Jeans+Selvedge+Lurus\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Celana+Jeans+Selvedge+Lurus\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Celana+Jeans+Selvedge+Lurus\"}"
  },
  {
    "id": "PRD-008",
    "name": "Tas Tote Kanvas Atelier",
    "category": "Accessories",
    "base_price": 350000,
    "badge": "Best Seller",
    "description": "Tas tote berstruktur kokoh dari kanvas katun tebal 16 oz dengan tali bahu anyaman lebar dan ruang luas untuk laptop 14 inci serta perlengkapan harian.",
    "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-08 15:30:00",
    "name_en": "Canvas Atelier Weekender Tote",
    "description_en": "Structured everyday tote sewn from heavyweight 16 oz cotton canvas with wide webbing handles and ample room for a 14-inch laptop and essentials.",
    "weight_gram": 450,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Tas+Tote+Kanvas+Atelier\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Tas+Tote+Kanvas+Atelier\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Tas+Tote+Kanvas+Atelier\"}"
  },
  {
    "id": "PRD-009",
    "name": "Kupluk Rajut Wol Merino",
    "category": "Accessories",
    "base_price": 180000,
    "badge": "None",
    "description": "Topi kupluk rajut rib dari campuran wol merino halus yang hangat tanpa rasa gatal. Lipatan ganda elastis menyesuaikan bentuk kepala secara nyaman.",
    "image_url": "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-09 08:45:00",
    "name_en": "Merino Wool Ribbed Beanie",
    "description_en": "Rib-knit cuffed beanie spun from soft merino wool blend for itch-free warmth. Flexible double-fold construction adapts comfortably to any fit.",
    "weight_gram": 180,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Kupluk+Rajut+Wol+Merino\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Kupluk+Rajut+Wol+Merino\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Kupluk+Rajut+Wol+Merino\"}"
  },
  {
    "id": "PRD-010",
    "name": "Jaket Bomber Terracotta Atelier",
    "category": "Outerwear",
    "base_price": 720000,
    "badge": "New Arrival",
    "description": "Jaket bomber minimalis berwarna terracotta hangat berbahan twill nilon matte tahan angin, dilengkapi saku ritsleting lengan dan rib elastis rapi.",
    "image_url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-10 10:15:00",
    "name_en": "Atelier Terracotta Bomber Jacket",
    "description_en": "Minimalist zip-up bomber jacket in signature warm terracotta matte nylon twill, finished with a utility sleeve pocket and structured ribbed trims.",
    "weight_gram": 760,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Jaket+Bomber+Terracotta+Atelier\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Jaket+Bomber+Terracotta+Atelier\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Jaket+Bomber+Terracotta+Atelier\"}"
  },
  {
    "id": "PRD-011",
    "name": "Jaket Denim Kerah Sherpa Studio",
    "category": "Outerwear",
    "base_price": 790000,
    "badge": "Limited Edition",
    "description": "Jaket trucker denim katun tebal dengan aksen kerah sherpa krem lembut, saku dada berkancing logam, dan pencucian indigo muda bergaya kasual terkurasi.",
    "image_url": "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-11 11:20:00",
    "name_en": "Studio Sherpa Collar Denim Jacket",
    "description_en": "Heavyweight cotton trucker denim jacket accented with a soft cream sherpa collar, chest flap pockets, and a clean light-indigo studio wash.",
    "weight_gram": 860,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Jaket+Denim+Kerah+Sherpa\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Jaket+Denim+Kerah+Sherpa\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Jaket+Denim+Kerah+Sherpa\"}"
  },
  {
    "id": "PRD-012",
    "name": "Sweater Turtleneck Rajut Merino",
    "category": "Tops",
    "base_price": 640000,
    "badge": "Best Seller",
    "description": "Sweater kerah tinggi (turtleneck) rajut rib rapat berbahan wol merino lembut. Memberikan kehangatan seimbang dan profil ramping untuk layering di bawah blazer atau mantel.",
    "image_url": "https://images.unsplash.com/photo-1623183949963-0557c9532763?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-12 09:50:00",
    "name_en": "Merino Ribbed Turtleneck Sweater",
    "description_en": "Fine-ribbed turtleneck sweater knitted from soft merino wool. Delivers balanced warmth and a clean silhouette made for layering under coats or blazers.",
    "weight_gram": 420,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Sweater+Turtleneck+Rajut+Merino\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Sweater+Turtleneck+Rajut+Merino\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Sweater+Turtleneck+Rajut+Merino\"}"
  },
  {
    "id": "PRD-013",
    "name": "Pullover Crewneck Katun Atelier",
    "category": "Tops",
    "base_price": 480000,
    "badge": "None",
    "description": "Sweatshirt crewneck polos berbahan katun French terry 340 GSM dengan jahitan bahu santai serta rib elastis pada kerah, manset, dan pinggang.",
    "image_url": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-13 13:10:00",
    "name_en": "Atelier Cotton Crewneck Pullover",
    "description_en": "Clean unbranded crewneck pullover cut from 340 GSM cotton French terry, featuring relaxed shoulders and structured ribbed cuffs and hem.",
    "weight_gram": 410,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Pullover+Crewneck+Katun+Atelier\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Pullover+Crewneck+Katun+Atelier\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Pullover+Crewneck+Katun+Atelier\"}"
  },
  {
    "id": "PRD-014",
    "name": "Celana Twill 5-Pocket Minimalis",
    "category": "Bottoms",
    "base_price": 490000,
    "badge": "New Arrival",
    "description": "Celana panjang 5-pocket berbahan katun twill tenun padat dengan paku keling tembaga halus dan potongan lurus ramping untuk gaya smart-casual.",
    "image_url": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-14 10:00:00",
    "name_en": "Minimalist 5-Pocket Twill Pants",
    "description_en": "Five-pocket straight pants tailored from dense cotton twill with understated copper rivets for a versatile smart-casual staple.",
    "weight_gram": 450,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Celana+Twill+5-Pocket+Minimalis\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Celana+Twill+5-Pocket+Minimalis\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Celana+Twill+5-Pocket+Minimalis\"}"
  },
  {
    "id": "PRD-015",
    "name": "Celana Utility Tapered Santai",
    "category": "Bottoms",
    "base_price": 440000,
    "badge": "None",
    "description": "Celana potongan tapered dengan pinggang dan pergelangan elastis, dilengkapi saku tempel depan bergaya utility dari kain katun-linen ringan yang nyaman.",
    "image_url": "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-15 14:25:00",
    "name_en": "Relaxed Utility Tapered Trousers",
    "description_en": "Tapered relaxed trousers with an elasticized waistband, ankle cuffs, and front flap utility pockets sewn in lightweight cotton-linen.",
    "weight_gram": 420,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Celana+Utility+Tapered+Santai\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Celana+Utility+Tapered+Santai\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Celana+Utility+Tapered+Santai\"}"
  },
  {
    "id": "PRD-016",
    "name": "Sepatu Derby Kulit Full-Grain",
    "category": "Footwear",
    "base_price": 950000,
    "badge": "Best Seller",
    "description": "Sepatu derby kulit sapi full-grain berwarna cokelat cognac dengan panel tekstur mikro yang halus, jahitan rapi, dan bantalan insole empuk untuk kenyamanan formal.",
    "image_url": "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-16 09:30:00",
    "name_en": "Full-Grain Leather Derby Shoes",
    "description_en": "Cognac full-grain leather derby shoes detailed with fine micro-textured vamp panels, clean tonal stitching, and a cushioned insole for all-day formal wear.",
    "weight_gram": 1050,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Sepatu+Derby+Kulit+Full-Grain\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Sepatu+Derby+Kulit+Full-Grain\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Sepatu+Derby+Kulit+Full-Grain\"}"
  },
  {
    "id": "PRD-017",
    "name": "Sneakers Kanvas Low-Top Minimalis",
    "category": "Footwear",
    "base_price": 590000,
    "badge": "New Arrival",
    "description": "Sepatu sneakers low-top putih bersih tanpa logo berlebihan, terbuat dari kanvas katun tenun rapat dengan sol karet vulkanisir fleksibel untuk padanan kasual.",
    "image_url": "https://images.unsplash.com/photo-1499321889027-736489e2f5a5?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-17 11:45:00",
    "name_en": "Minimalist Low-Top Canvas Sneakers",
    "description_en": "Clean unbranded white low-top sneakers constructed from tightly woven cotton canvas on a flexible vulcanized rubber sole for daily casual pairing.",
    "weight_gram": 950,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Sneakers+Kanvas+Low-Top+Minimalis\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Sneakers+Kanvas+Low-Top+Minimalis\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Sneakers+Kanvas+Low-Top+Minimalis\"}"
  },
  {
    "id": "PRD-018",
    "name": "Kacamata Hitam Bingkai Tipis Atelier",
    "category": "Accessories",
    "base_price": 320000,
    "badge": "New Arrival",
    "description": "Kacamata hitam berbingkai logam bulat tipis warna emas lembut dengan lensa UV400 hijau arang anti-silau. Ringan dan dilengkapi sarung pelindung kanvas.",
    "image_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-18 15:00:00",
    "name_en": "Atelier Minimalist Round Sunglasses",
    "description_en": "Slim gold-wire round sunglasses fitted with anti-glare dark slate-green UV400 lenses. Featherweight balance complete with a protective canvas sleeve.",
    "weight_gram": 190,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Kacamata+Hitam+Bingkai+Tipis\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Kacamata+Hitam+Bingkai+Tipis\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Kacamata+Hitam+Bingkai+Tipis\"}"
  },
  {
    "id": "PRD-019",
    "name": "Topi Twill Katun Minimalis",
    "category": "Accessories",
    "base_price": 210000,
    "badge": "None",
    "description": "Topi 6-panel berbahan katun twill washed berwarna abu arang dengan visor melengkung klasik dan pengait gesper belakang yang mudah disesuaikan.",
    "image_url": "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-19 16:20:00",
    "name_en": "Structured Cotton Twill Cap",
    "description_en": "Six-panel baseball cap crafted from garment-washed charcoal cotton twill with a pre-curved brim and adjustable back strap clasp.",
    "weight_gram": 185,
    "marketplace_links_json": "{\"shopee\":\"https://shopee.co.id/search?keyword=AryaStore+Topi+Twill+Katun+Minimalis\",\"tokopedia\":\"https://www.tokopedia.com/search?st=product&q=AryaStore+Topi+Twill+Katun+Minimalis\",\"tiktokshop\":\"https://www.tiktok.com/search?q=AryaStore+Topi+Twill+Katun+Minimalis\"}"
  }
];
    var sampleVariants = [
  {
    "variant_id": "VAR-0001",
    "product_id": "PRD-001",
    "sku": "COAT-CML-S",
    "color": "Camel Hangat",
    "size": "S",
    "stock": 8
  },
  {
    "variant_id": "VAR-0002",
    "product_id": "PRD-001",
    "sku": "COAT-CML-M",
    "color": "Camel Hangat",
    "size": "M",
    "stock": 14
  },
  {
    "variant_id": "VAR-0003",
    "product_id": "PRD-001",
    "sku": "COAT-CML-L",
    "color": "Camel Hangat",
    "size": "L",
    "stock": 4
  },
  {
    "variant_id": "VAR-0004",
    "product_id": "PRD-001",
    "sku": "COAT-BLK-M",
    "color": "Hitam Arang",
    "size": "M",
    "stock": 9
  },
  {
    "variant_id": "VAR-0005",
    "product_id": "PRD-001",
    "sku": "COAT-BLK-XL",
    "color": "Hitam Arang",
    "size": "XL",
    "stock": 6
  },
  {
    "variant_id": "VAR-0006",
    "product_id": "PRD-002",
    "sku": "LNSH-WHT-S",
    "color": "Putih Tulang",
    "size": "S",
    "stock": 15
  },
  {
    "variant_id": "VAR-0007",
    "product_id": "PRD-002",
    "sku": "LNSH-WHT-M",
    "color": "Putih Tulang",
    "size": "M",
    "stock": 22
  },
  {
    "variant_id": "VAR-0008",
    "product_id": "PRD-002",
    "sku": "LNSH-SKY-L",
    "color": "Biru Pucat",
    "size": "L",
    "stock": 3
  },
  {
    "variant_id": "VAR-0009",
    "product_id": "PRD-002",
    "sku": "LNSH-SKY-XL",
    "color": "Biru Pucat",
    "size": "XL",
    "stock": 11
  },
  {
    "variant_id": "VAR-0010",
    "product_id": "PRD-003",
    "sku": "PLTD-SND-S",
    "color": "Pasir Krem",
    "size": "S",
    "stock": 10
  },
  {
    "variant_id": "VAR-0011",
    "product_id": "PRD-003",
    "sku": "PLTD-SND-M",
    "color": "Pasir Krem",
    "size": "M",
    "stock": 16
  },
  {
    "variant_id": "VAR-0012",
    "product_id": "PRD-003",
    "sku": "PLTD-BLK-L",
    "color": "Hitam Arang",
    "size": "L",
    "stock": 12
  },
  {
    "variant_id": "VAR-0013",
    "product_id": "PRD-003",
    "sku": "PLTD-BLK-XXL",
    "color": "Hitam Arang",
    "size": "XXL",
    "stock": 6
  },
  {
    "variant_id": "VAR-0014",
    "product_id": "PRD-004",
    "sku": "BOOT-ESP-S",
    "color": "Cokelat Espresso",
    "size": "S",
    "stock": 4
  },
  {
    "variant_id": "VAR-0015",
    "product_id": "PRD-004",
    "sku": "BOOT-ESP-M",
    "color": "Cokelat Espresso",
    "size": "M",
    "stock": 8
  },
  {
    "variant_id": "VAR-0016",
    "product_id": "PRD-004",
    "sku": "BOOT-ESP-L",
    "color": "Cokelat Espresso",
    "size": "L",
    "stock": 7
  },
  {
    "variant_id": "VAR-0017",
    "product_id": "PRD-004",
    "sku": "BOOT-BLK-XL",
    "color": "Hitam Pekat",
    "size": "XL",
    "stock": 5
  },
  {
    "variant_id": "VAR-0018",
    "product_id": "PRD-005",
    "sku": "HTEE-WHT-XS",
    "color": "Putih Tulang",
    "size": "XS",
    "stock": 14
  },
  {
    "variant_id": "VAR-0019",
    "product_id": "PRD-005",
    "sku": "HTEE-WHT-M",
    "color": "Putih Tulang",
    "size": "M",
    "stock": 28
  },
  {
    "variant_id": "VAR-0020",
    "product_id": "PRD-005",
    "sku": "HTEE-BLK-L",
    "color": "Hitam Arang",
    "size": "L",
    "stock": 22
  },
  {
    "variant_id": "VAR-0021",
    "product_id": "PRD-005",
    "sku": "HTEE-BLK-3XL",
    "color": "Hitam Arang",
    "size": "3XL",
    "stock": 9
  },
  {
    "variant_id": "VAR-0022",
    "product_id": "PRD-005",
    "sku": "HTEE-WHT-5XL",
    "color": "Putih Tulang",
    "size": "5XL",
    "stock": 3
  },
  {
    "variant_id": "VAR-0023",
    "product_id": "PRD-006",
    "sku": "BLZR-NVY-S",
    "color": "Biru Dongker",
    "size": "S",
    "stock": 7
  },
  {
    "variant_id": "VAR-0024",
    "product_id": "PRD-006",
    "sku": "BLZR-NVY-M",
    "color": "Biru Dongker",
    "size": "M",
    "stock": 13
  },
  {
    "variant_id": "VAR-0025",
    "product_id": "PRD-006",
    "sku": "BLZR-BLK-L",
    "color": "Hitam Arang",
    "size": "L",
    "stock": 10
  },
  {
    "variant_id": "VAR-0026",
    "product_id": "PRD-006",
    "sku": "BLZR-BLK-XL",
    "color": "Hitam Arang",
    "size": "XL",
    "stock": 6
  },
  {
    "variant_id": "VAR-0027",
    "product_id": "PRD-007",
    "sku": "SLVG-IND-S",
    "color": "Indigo Klasik",
    "size": "S",
    "stock": 10
  },
  {
    "variant_id": "VAR-0028",
    "product_id": "PRD-007",
    "sku": "SLVG-IND-M",
    "color": "Indigo Klasik",
    "size": "M",
    "stock": 18
  },
  {
    "variant_id": "VAR-0029",
    "product_id": "PRD-007",
    "sku": "SLVG-BLK-4XL",
    "color": "Hitam Pekat",
    "size": "4XL",
    "stock": 4
  },
  {
    "variant_id": "VAR-0030",
    "product_id": "PRD-008",
    "sku": "TOTE-TAN-M",
    "color": "Cokelat Pasir",
    "size": "M",
    "stock": 22
  },
  {
    "variant_id": "VAR-0031",
    "product_id": "PRD-008",
    "sku": "TOTE-ECR-M",
    "color": "Ecru Natural",
    "size": "M",
    "stock": 18
  },
  {
    "variant_id": "VAR-0032",
    "product_id": "PRD-008",
    "sku": "TOTE-BLK-L",
    "color": "Hitam Arang",
    "size": "L",
    "stock": 14
  },
  {
    "variant_id": "VAR-0033",
    "product_id": "PRD-009",
    "sku": "BEAN-ESP-M",
    "color": "Cokelat Tua",
    "size": "M",
    "stock": 20
  },
  {
    "variant_id": "VAR-0034",
    "product_id": "PRD-009",
    "sku": "BEAN-OLV-M",
    "color": "Hijau Hutan",
    "size": "M",
    "stock": 16
  },
  {
    "variant_id": "VAR-0035",
    "product_id": "PRD-009",
    "sku": "BEAN-ROS-M",
    "color": "Mawar Redup",
    "size": "M",
    "stock": 12
  },
  {
    "variant_id": "VAR-0036",
    "product_id": "PRD-010",
    "sku": "BMBR-TER-S",
    "color": "Terracotta",
    "size": "S",
    "stock": 9
  },
  {
    "variant_id": "VAR-0037",
    "product_id": "PRD-010",
    "sku": "BMBR-TER-M",
    "color": "Terracotta",
    "size": "M",
    "stock": 15
  },
  {
    "variant_id": "VAR-0038",
    "product_id": "PRD-010",
    "sku": "BMBR-TER-L",
    "color": "Terracotta",
    "size": "L",
    "stock": 11
  },
  {
    "variant_id": "VAR-0039",
    "product_id": "PRD-010",
    "sku": "BMBR-BLK-XXL",
    "color": "Hitam Arang",
    "size": "XXL",
    "stock": 5
  },
  {
    "variant_id": "VAR-0040",
    "product_id": "PRD-011",
    "sku": "DNJK-LTI-S",
    "color": "Indigo Muda",
    "size": "S",
    "stock": 6
  },
  {
    "variant_id": "VAR-0041",
    "product_id": "PRD-011",
    "sku": "DNJK-LTI-M",
    "color": "Indigo Muda",
    "size": "M",
    "stock": 12
  },
  {
    "variant_id": "VAR-0042",
    "product_id": "PRD-011",
    "sku": "DNJK-LTI-L",
    "color": "Indigo Muda",
    "size": "L",
    "stock": 10
  },
  {
    "variant_id": "VAR-0043",
    "product_id": "PRD-011",
    "sku": "DNJK-IND-XL",
    "color": "Indigo Gelap",
    "size": "XL",
    "stock": 4
  },
  {
    "variant_id": "VAR-0044",
    "product_id": "PRD-012",
    "sku": "TRTL-BLK-XS",
    "color": "Hitam Pekat",
    "size": "XS",
    "stock": 7
  },
  {
    "variant_id": "VAR-0045",
    "product_id": "PRD-012",
    "sku": "TRTL-BLK-S",
    "color": "Hitam Pekat",
    "size": "S",
    "stock": 13
  },
  {
    "variant_id": "VAR-0046",
    "product_id": "PRD-012",
    "sku": "TRTL-BLK-M",
    "color": "Hitam Pekat",
    "size": "M",
    "stock": 17
  },
  {
    "variant_id": "VAR-0047",
    "product_id": "PRD-012",
    "sku": "TRTL-OAT-L",
    "color": "Oatmeal",
    "size": "L",
    "stock": 9
  },
  {
    "variant_id": "VAR-0048",
    "product_id": "PRD-013",
    "sku": "CRWN-WHT-S",
    "color": "Putih Bersih",
    "size": "S",
    "stock": 14
  },
  {
    "variant_id": "VAR-0049",
    "product_id": "PRD-013",
    "sku": "CRWN-WHT-M",
    "color": "Putih Bersih",
    "size": "M",
    "stock": 20
  },
  {
    "variant_id": "VAR-0050",
    "product_id": "PRD-013",
    "sku": "CRWN-GRY-L",
    "color": "Abu Batu",
    "size": "L",
    "stock": 15
  },
  {
    "variant_id": "VAR-0051",
    "product_id": "PRD-013",
    "sku": "CRWN-GRY-3XL",
    "color": "Abu Batu",
    "size": "3XL",
    "stock": 6
  },
  {
    "variant_id": "VAR-0052",
    "product_id": "PRD-014",
    "sku": "TWLL-SLT-S",
    "color": "Biru Slate",
    "size": "S",
    "stock": 11
  },
  {
    "variant_id": "VAR-0053",
    "product_id": "PRD-014",
    "sku": "TWLL-SLT-M",
    "color": "Biru Slate",
    "size": "M",
    "stock": 19
  },
  {
    "variant_id": "VAR-0054",
    "product_id": "PRD-014",
    "sku": "TWLL-SLT-L",
    "color": "Biru Slate",
    "size": "L",
    "stock": 14
  },
  {
    "variant_id": "VAR-0055",
    "product_id": "PRD-014",
    "sku": "TWLL-KHK-XL",
    "color": "Khaki Batu",
    "size": "XL",
    "stock": 8
  },
  {
    "variant_id": "VAR-0056",
    "product_id": "PRD-015",
    "sku": "UTLP-CLY-XS",
    "color": "Tanah Liat",
    "size": "XS",
    "stock": 8
  },
  {
    "variant_id": "VAR-0057",
    "product_id": "PRD-015",
    "sku": "UTLP-CLY-S",
    "color": "Tanah Liat",
    "size": "S",
    "stock": 14
  },
  {
    "variant_id": "VAR-0058",
    "product_id": "PRD-015",
    "sku": "UTLP-CLY-M",
    "color": "Tanah Liat",
    "size": "M",
    "stock": 16
  },
  {
    "variant_id": "VAR-0059",
    "product_id": "PRD-015",
    "sku": "UTLP-OLV-L",
    "color": "Zaitun",
    "size": "L",
    "stock": 10
  },
  {
    "variant_id": "VAR-0060",
    "product_id": "PRD-016",
    "sku": "DRBY-COG-S",
    "color": "Cokelat Cognac",
    "size": "S",
    "stock": 7
  },
  {
    "variant_id": "VAR-0061",
    "product_id": "PRD-016",
    "sku": "DRBY-COG-M",
    "color": "Cokelat Cognac",
    "size": "M",
    "stock": 12
  },
  {
    "variant_id": "VAR-0062",
    "product_id": "PRD-016",
    "sku": "DRBY-COG-L",
    "color": "Cokelat Cognac",
    "size": "L",
    "stock": 10
  },
  {
    "variant_id": "VAR-0063",
    "product_id": "PRD-016",
    "sku": "DRBY-BLK-XL",
    "color": "Hitam Pekat",
    "size": "XL",
    "stock": 6
  },
  {
    "variant_id": "VAR-0064",
    "product_id": "PRD-017",
    "sku": "SNKR-WHT-S",
    "color": "Putih Bersih",
    "size": "S",
    "stock": 11
  },
  {
    "variant_id": "VAR-0065",
    "product_id": "PRD-017",
    "sku": "SNKR-WHT-M",
    "color": "Putih Bersih",
    "size": "M",
    "stock": 18
  },
  {
    "variant_id": "VAR-0066",
    "product_id": "PRD-017",
    "sku": "SNKR-WHT-L",
    "color": "Putih Bersih",
    "size": "L",
    "stock": 14
  },
  {
    "variant_id": "VAR-0067",
    "product_id": "PRD-017",
    "sku": "SNKR-ECR-XL",
    "color": "Putih Tulang",
    "size": "XL",
    "stock": 9
  },
  {
    "variant_id": "VAR-0068",
    "product_id": "PRD-018",
    "sku": "SUNG-GLD-M",
    "color": "Emas Matte",
    "size": "M",
    "stock": 16
  },
  {
    "variant_id": "VAR-0069",
    "product_id": "PRD-018",
    "sku": "SUNG-SLV-M",
    "color": "Perak Sikat",
    "size": "M",
    "stock": 12
  },
  {
    "variant_id": "VAR-0070",
    "product_id": "PRD-018",
    "sku": "SUNG-BLK-M",
    "color": "Hitam Matte",
    "size": "M",
    "stock": 14
  },
  {
    "variant_id": "VAR-0071",
    "product_id": "PRD-019",
    "sku": "CAP-CHR-M",
    "color": "Abu Arang",
    "size": "M",
    "stock": 21
  },
  {
    "variant_id": "VAR-0072",
    "product_id": "PRD-019",
    "sku": "CAP-SND-M",
    "color": "Pasir Krem",
    "size": "M",
    "stock": 17
  },
  {
    "variant_id": "VAR-0073",
    "product_id": "PRD-019",
    "sku": "CAP-BLK-L",
    "color": "Hitam Pekat",
    "size": "L",
    "stock": 15
  }
];

    for (var p = 0; p < sampleProducts.length; p++) {
      var prod = sampleProducts[p];
      var pIndex = existingProductIds.indexOf(prod.id);

      if (pIndex === -1) {
        // Product does not exist: append full 13-column row
        productsSheet.appendRow([
          prod.id,
          prod.name,
          prod.category,
          prod.base_price,
          prod.badge,
          prod.description,
          prod.image_url,
          prod.created_at,
          prod.name_en,
          prod.description_en,
          prod.weight_gram,
          prod.marketplace_links_json,
          JSON.stringify(prod.color_images || {})
        ]);
        results.productsAdded++;
      } else {
        // Product exists: check if row has fewer than 13 columns, safely backfill v2 fields!
        var rowNum = pIndex + 2; // account for 1-based index and header row
        var productRowData = productsSheet.getRange(rowNum, 1, 1, 13).getValues()[0];

        // Check if v2 columns are blank
        if (!productRowData[COL_PRODUCTS.NAME_EN] || !productRowData[COL_PRODUCTS.WEIGHT_GRAM] || !productRowData[COL_PRODUCTS.COLOR_IMAGES_JSON]) {
          productsSheet.getRange(rowNum, COL_PRODUCTS.NAME_EN + 1, 1, 5).setValues([[
            prod.name_en,
            prod.description_en,
            prod.weight_gram,
            prod.marketplace_links_json,
            JSON.stringify(prod.color_images || {})
          ]]);
          results.productsUpdated++;
        }
      }
    }

    // Seed 73 Variants (with optional variant image_url)
    for (var v = 0; v < sampleVariants.length; v++) {
      var vData = sampleVariants[v];
      if (existingVariantIds.indexOf(vData.variant_id) === -1) {
        variantsSheet.appendRow([
          vData.variant_id,
          vData.product_id,
          vData.sku,
          vData.color,
          vData.size,
          vData.stock,
          vData.image_url || ''
        ]);
        results.variantsAdded++;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // C. Seed 2 Curated Outfit Bundles (BND-001 & BND-002)
  // ----------------------------------------------------------------------------
  var campaignSheet = ss.getSheetByName('CampaignsAndBundles');
  if (campaignSheet) {
    var existingCampaignIds = getExistingColumnValues(campaignSheet, 0);
    var sampleBundles = [
  {
    "campaign_id": "BND-001",
    "banner_title": "Atelier Monochrome Set (Mantel Wol + Celana Lipit)",
    "banner_desc": "Perpaduan mantel wol terstruktur dan celana lipit wide-leg untuk estetika formal paripurna.",
    "ends_at": "2026-12-31 23:59:59",
    "is_active": "TRUE",
    "bundle_items_json": "[{\"product_id\":\"PRD-001\",\"variant_id\":\"VAR-0002\",\"sku\":\"COAT-CML-M\",\"name\":\"Mantel Wol Terstruktur Atelier (Camel Hangat, M)\",\"name_en\":\"Atelier Structured Wool Coat (Warm Camel, M)\",\"quantity\":1,\"base_price\":1250000,\"bundle_image_url\":\"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80\"},{\"product_id\":\"PRD-003\",\"variant_id\":\"VAR-0011\",\"sku\":\"PLTD-SND-M\",\"name\":\"Celana Lipit Wide-Leg Atelier (Pasir Krem, M)\",\"name_en\":\"Pleated Wide-Leg Trousers (Sand Cream, M)\",\"quantity\":1,\"base_price\":580000,\"bundle_image_url\":\"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80\"}]",
    "normal_price": 1830000,
    "bundle_price": 1550000
  },
  {
    "campaign_id": "BND-002",
    "banner_title": "Urban Terracotta Duo (Kemeja Linen + Tas Tote Kanvas)",
    "banner_desc": "Kombinasi kemeja linen bernapas dengan tas tote kanvas atelier serbaguna untuk mobilitas harian.",
    "ends_at": "2026-12-31 23:59:59",
    "is_active": "TRUE",
    "bundle_items_json": "[{\"product_id\":\"PRD-002\",\"variant_id\":\"VAR-0007\",\"sku\":\"LNSH-WHT-M\",\"name\":\"Kemeja Linen Santai Minimalis (Putih Tulang, M)\",\"name_en\":\"Minimalist Relaxed Linen Shirt (Bone White, M)\",\"quantity\":1,\"base_price\":420000,\"bundle_image_url\":\"https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80\"},{\"product_id\":\"PRD-008\",\"variant_id\":\"VAR-0030\",\"sku\":\"TOTE-TAN-M\",\"name\":\"Tas Tote Kanvas Atelier (Cokelat Pasir, M)\",\"name_en\":\"Canvas Atelier Weekender Tote (Sand Tan, M)\",\"quantity\":1,\"base_price\":350000,\"bundle_image_url\":\"https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80\"}]",
    "normal_price": 770000,
    "bundle_price": 650000
  }
];

    for (var c = 0; c < sampleBundles.length; c++) {
      var bnd = sampleBundles[c];
      if (existingCampaignIds.indexOf(bnd.campaign_id) === -1) {
        campaignSheet.appendRow([
          bnd.campaign_id,
          bnd.banner_title,
          bnd.banner_desc,
          bnd.ends_at,
          bnd.is_active,
          bnd.bundle_items_json,
          bnd.normal_price,
          bnd.bundle_price
        ]);
        results.campaignsAdded++;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // D. Seed Sample Coupons (WELCOME10, HEMAT50K, GLOBALSHIP)
  // ----------------------------------------------------------------------------
  var couponsSheet = ss.getSheetByName('Coupons');
  if (couponsSheet) {
    var existingCoupons = getExistingColumnValues(couponsSheet, 0);

    var sampleCoupons = [
      {
        code: 'WELCOME10',
        discount_type: 'PERCENT',
        discount_value: 10,
        min_spend: 200000,
        description: 'Diskon 10% untuk pelanggan baru dengan minimal pembelanjaan Rp 200.000',
        is_active: 'TRUE'
      },
      {
        code: 'HEMAT50K',
        discount_type: 'FIXED',
        discount_value: 50000,
        min_spend: 350000,
        description: 'Potongan harga langsung Rp 50.000 untuk transaksi minimal Rp 350.000',
        is_active: 'TRUE'
      },
      {
        code: 'GLOBALSHIP',
        discount_type: 'FIXED',
        discount_value: 100000,
        min_spend: 1000000,
        description: 'Subsidi ongkos kirim Rp 100.000 untuk pesanan minimal Rp 1.000.000',
        is_active: 'TRUE'
      }
    ];

    for (var cp = 0; cp < sampleCoupons.length; cp++) {
      var coupon = sampleCoupons[cp];
      if (existingCoupons.indexOf(coupon.code) === -1) {
        couponsSheet.appendRow([
          coupon.code,
          coupon.discount_type,
          coupon.discount_value,
          coupon.min_spend,
          coupon.description,
          coupon.is_active
        ]);
        results.couponsAdded++;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // E. Seed Sample Customers
  // ----------------------------------------------------------------------------
  var customersSheet = ss.getSheetByName('Customers');
  if (customersSheet) {
    var existingCustomers = getExistingColumnValues(customersSheet, 0);

    var sampleCustomers = [
      {
        customer_id: 'CST-001',
        name: 'Dimas Pratama',
        whatsapp_no: '6281234567891',
        total_orders: 1,
        total_spent: 447000,
        created_at: now,
        notes: 'Pelanggan reguler menyukai warna monokrom gelap'
      },
      {
        customer_id: 'CST-002',
        name: 'Siti Rahma',
        whatsapp_no: '6281898765432',
        total_orders: 1,
        total_spent: 1225000,
        created_at: now,
        notes: 'Membeli mantel wol untuk musim dingin'
      },
      {
        customer_id: 'CST-003',
        name: 'Aisyah Noor',
        whatsapp_no: '6581234567',
        total_orders: 1,
        total_spent: 540000,
        created_at: now,
        notes: 'Pelanggan internasional dari Singapura'
      }
    ];

    for (var cust = 0; cust < sampleCustomers.length; cust++) {
      var customer = sampleCustomers[cust];
      if (existingCustomers.indexOf(customer.customer_id) === -1) {
        customersSheet.appendRow([
          customer.customer_id,
          customer.name,
          customer.whatsapp_no,
          customer.total_orders,
          customer.total_spent,
          customer.created_at,
          customer.notes
        ]);
        results.customersAdded++;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // F. Seed Sample Orders (18 Columns with International & UTM Attribution)
  // ----------------------------------------------------------------------------
  var ordersSheet = ss.getSheetByName('Orders');
  if (ordersSheet) {
    var existingOrders = getExistingColumnValues(ordersSheet, 0);

    var sampleOrders = [
      {
        invoice_no: 'INV-202611-001',
        created_at: now,
        customer_id: 'CST-001',
        customer_name: 'Dimas Pratama',
        whatsapp_no: '6281234567891',
        items_json: JSON.stringify([
          {
            product_id: 'PRD-005',
            name: 'Kaos Katun Tebal Oversized',
            name_en: 'Heavyweight Cotton Oversized Tee',
            variant_id: 'VAR-0019',
            sku: 'HTEE-WHT-M',
            color: 'Putih Tulang',
            size: 'M',
            quantity: 2,
            price: 240000,
            weight_gram: 250,
            subtotal: 480000
          }
        ]),
        subtotal: 480000,
        coupon_code: 'WELCOME10',
        coupon_discount: 48000,
        shipping_method: 'Reguler (JNE/J&T)',
        shipping_cost: 15000,
        grand_total: 447000,
        payment_proof_url: '',
        status: 'Selesai',
        shipping_zone: 'JABODETABEK',
        currency_code: 'IDR',
        exchange_rate: 1,
        utm_source: 'instagram',
        tracking_number: 'JNE8821049210',
        shipping_status: 'Terkirim',
        shipped_at: '20:11:2026',
        shipping_notes: 'Paket diterima langsung oleh penerima di Jakarta Selatan'
      },
      {
        invoice_no: 'INV-202611-002',
        created_at: now,
        customer_id: 'CST-002',
        customer_name: 'Siti Rahma',
        whatsapp_no: '6281898765432',
        items_json: JSON.stringify([
          {
            product_id: 'PRD-001',
            name: 'Mantel Wol Terstruktur Atelier',
            name_en: 'Atelier Structured Wool Coat',
            variant_id: 'VAR-0002',
            sku: 'COAT-CML-M',
            color: 'Camel Hangat',
            size: 'M',
            quantity: 1,
            price: 1250000,
            weight_gram: 920,
            subtotal: 1250000
          }
        ]),
        subtotal: 1250000,
        coupon_code: 'HEMAT50K',
        coupon_discount: 50000,
        shipping_method: 'Express (SiCepat/Paxel)',
        shipping_cost: 25000,
        grand_total: 1225000,
        payment_proof_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
        status: 'Bukti Diupload',
        shipping_zone: 'JAWA_BALI',
        currency_code: 'IDR',
        exchange_rate: 1,
        utm_source: 'google_ads'
      },
      {
        invoice_no: 'INV-202611-003',
        created_at: now,
        customer_id: 'CST-003',
        customer_name: 'Aisyah Noor',
        whatsapp_no: '6581234567',
        items_json: JSON.stringify([
          {
            product_id: 'PRD-002',
            name: 'Kemeja Linen Santai Minimalis',
            name_en: 'Minimalist Relaxed Linen Shirt',
            variant_id: 'VAR-0007',
            sku: 'LNSH-WHT-M',
            color: 'Putih Tulang',
            size: 'M',
            quantity: 1,
            price: 420000,
            weight_gram: 300,
            subtotal: 420000
          }
        ]),
        subtotal: 420000,
        coupon_code: '',
        coupon_discount: 0,
        shipping_method: 'International Shipping (DHL/FedEx)',
        shipping_cost: 120000,
        grand_total: 540000,
        payment_proof_url: '',
        status: 'Diproses',
        shipping_zone: 'SINGAPORE',
        currency_code: 'SGD',
        exchange_rate: 0.000085,
        utm_source: 'tiktok',
        tracking_number: '',
        shipping_status: 'Menunggu Pick-up',
        shipped_at: '',
        shipping_notes: 'Pesanan sedang dikemas di studio atelier'
      },
      {
        invoice_no: 'INV-202611-004',
        created_at: now,
        customer_id: 'CST-001',
        customer_name: 'Dimas Pratama',
        whatsapp_no: '6281234567891',
        items_json: JSON.stringify([
          {
            product_id: 'PRD-003',
            name: 'Celana Lipit Wide-Leg Atelier',
            name_en: 'Atelier Wide-Leg Pleated Trousers',
            variant_id: 'VAR-0011',
            sku: 'PLTD-SND-M',
            color: 'Pasir Krem',
            size: 'M',
            quantity: 1,
            price: 580000,
            weight_gram: 420,
            subtotal: 580000
          }
        ]),
        subtotal: 580000,
        coupon_code: '',
        coupon_discount: 0,
        shipping_method: 'SiCepat REG',
        shipping_cost: 18000,
        grand_total: 598000,
        payment_proof_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
        status: 'Dikirim',
        shipping_zone: 'JABODETABEK',
        currency_code: 'IDR',
        exchange_rate: 1,
        utm_source: 'instagram',
        tracking_number: 'SICEPAT004192883',
        shipping_status: 'Dalam Pengiriman',
        shipped_at: '23:11:2026',
        shipping_notes: 'Paket sedang dalam perjalanan menuju hub Jakarta Selatan'
      }
    ];

    for (var o = 0; o < sampleOrders.length; o++) {
      var ord = sampleOrders[o];
      if (existingOrders.indexOf(ord.invoice_no) === -1) {
        ordersSheet.appendRow([
          ord.invoice_no,
          ord.created_at,
          ord.customer_id,
          ord.customer_name,
          ord.whatsapp_no,
          ord.items_json,
          ord.subtotal,
          ord.coupon_code,
          ord.coupon_discount,
          ord.shipping_method,
          ord.shipping_cost,
          ord.grand_total,
          ord.payment_proof_url,
          ord.status,
          ord.shipping_zone,
          ord.currency_code,
          ord.exchange_rate,
          ord.utm_source,
          ord.tracking_number || '',
          ord.shipping_status || 'Belum Dikirim',
          ord.shipped_at || '',
          ord.shipping_notes || ''
        ]);
        results.ordersAdded++;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // G. Seed Sample Returns
  // ----------------------------------------------------------------------------
  var returnsSheet = ss.getSheetByName('Returns');
  if (returnsSheet) {
    var existingReturns = getExistingColumnValues(returnsSheet, 0);

    var sampleReturn = {
      return_id: 'RTR-202611-001',
      invoice_no: 'INV-202611-001',
      customer_name: 'Dimas Pratama',
      reason: 'Ukuran M terlalu pas di dada, ingin mengajukan tukar ukuran ke L',
      requested_size: 'L',
      status: 'Diajukan',
      admin_notes: 'Menunggu konfirmasi barang retur tiba di gudang'
    };

    if (existingReturns.indexOf(sampleReturn.return_id) === -1) {
      returnsSheet.appendRow([
        sampleReturn.return_id,
        sampleReturn.invoice_no,
        sampleReturn.customer_name,
        sampleReturn.reason,
        sampleReturn.requested_size,
        sampleReturn.status,
        sampleReturn.admin_notes
      ]);
      results.returnsAdded++;
    }
  }

  // ----------------------------------------------------------------------------
  // H. Seed Audit Logs
  // ----------------------------------------------------------------------------
  var auditSheet = ss.getSheetByName('AuditLogs');
  if (auditSheet && auditSheet.getLastRow() <= 1) {
    auditSheet.appendRow([
      now,
      'Super Admin',
      'SYSTEM',
      'Inisialisasi skema database 10 sheet v2.0 dan pemuatan seed data 19 produk berhasil'
    ]);
    results.auditLogsAdded++;
  }

  // ----------------------------------------------------------------------------
  // I. Seed Conversion Funnel Events (Telemetry Data for Funnel Visualization)
  // ----------------------------------------------------------------------------
  var eventSheet = ss.getSheetByName('EventLogs');
  if (eventSheet && eventSheet.getLastRow() <= 1) {
    var funnelEvents = [
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-001', session_id: 'SES-01', referrer: 'hero' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-005', session_id: 'SES-02', referrer: 'catalog' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-002', session_id: 'SES-03', referrer: 'bundle' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-003', session_id: 'SES-04', referrer: 'catalog' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-007', session_id: 'SES-05', referrer: 'denim' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-010', session_id: 'SES-06', referrer: 'bomber' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-016', session_id: 'SES-07', referrer: 'footwear' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-018', session_id: 'SES-08', referrer: 'accessories' }) },
      { name: 'add_to_cart', payload: JSON.stringify({ product_id: 'PRD-005', sku: 'HTEE-WHT-M', qty: 2, session_id: 'SES-02' }) },
      { name: 'add_to_cart', payload: JSON.stringify({ product_id: 'PRD-001', sku: 'COAT-CML-M', qty: 1, session_id: 'SES-03' }) },
      { name: 'add_to_cart', payload: JSON.stringify({ product_id: 'PRD-002', sku: 'LNSH-WHT-M', qty: 1, session_id: 'SES-04' }) },
      { name: 'wa_checkout', payload: JSON.stringify({ invoice_no: 'INV-202611-001', grand_total: 447000, session_id: 'SES-02' }) },
      { name: 'wa_checkout', payload: JSON.stringify({ invoice_no: 'INV-202611-002', grand_total: 1225000, session_id: 'SES-03' }) },
      { name: 'wa_checkout', payload: JSON.stringify({ invoice_no: 'INV-202611-003', grand_total: 540000, session_id: 'SES-04' }) },
      { name: 'order_completed', payload: JSON.stringify({ invoice_no: 'INV-202611-001', status: 'Selesai', session_id: 'SES-02' }) }
    ];

    for (var ev = 0; ev < funnelEvents.length; ev++) {
      var item = funnelEvents[ev];
      eventSheet.appendRow([
        now,
        item.name,
        item.payload
      ]);
      results.eventLogsAdded++;
    }
  }

  SpreadsheetApp.flush();
  return results;
}

/**
 * Reads existing values of a specific column to verify uniqueness.
 */
function getExistingColumnValues(sheet, colIndex) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var data = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getDisplayValues();
  var values = [];
  for (var i = 0; i < data.length; i++) {
    values.push(data[i][0]);
  }
  return values;
}

/**
 * Appends a record to AuditLogs sheet.
 */
function logSystemAudit(actorRole, moduleName, detail) {
  var ss = getSpreadsheet();
  if (!ss) return;

  var auditSheet = ss.getSheetByName('AuditLogs');
  if (auditSheet) {
    auditSheet.appendRow([
      getTimestamp(),
      actorRole || 'System',
      moduleName || 'GENERAL',
      detail || ''
    ]);
  }
}

// ================================================================================
// 6. HEALTH & STATUS CHECK FUNCTION v2.0
// ================================================================================

/**
 * Audits all 10 sheets and returns detailed status and row counts.
 */
function checkDatabaseStatus() {
  var ss = getSpreadsheet();
  if (!ss) return { error: 'Spreadsheet tidak dapat diakses' };

  var status = {
    sheets: {},
    isHealthy: true,
    totalSheets: 0,
    timestamp: getTimestamp()
  };

  var expectedSheets = Object.keys(SCHEMA_DEFINITIONS);

  for (var i = 0; i < expectedSheets.length; i++) {
    var name = expectedSheets[i];
    var sheet = ss.getSheetByName(name);

    if (!sheet) {
      status.sheets[name] = { exists: false, rowCount: 0, colCount: 0 };
      status.isHealthy = false;
    } else {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var headers = lastRow > 0 && lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0] : [];

      status.sheets[name] = {
        exists: true,
        dataRowCount: Math.max(0, lastRow - 1),
        colCount: lastCol,
        headers: headers
      };
      status.totalSheets++;
    }
  }

  return status;
}

// ================================================================================
// 7. GOOGLE SHEETS UI INTEGRATION (onOpen Menu)
// ================================================================================

/**
 * Triggered automatically when the Google Sheet is opened.
 * Adds the official AryaStore custom menu to execute database setup, seed migration, and health checks easily.
 */
function onOpen() {
  if (typeof SpreadsheetApp === 'undefined') return;

  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🛍️ AryaStore')
    .addItem('Inisialisasi Database & Skema v2.0', 'menuSetupDatabase')
    .addItem('Muat Ulang Seed Data (19 Produk & Variasi)', 'menuSeedDatabase')
    .addSeparator()
    .addItem('Periksa Status Skema Database', 'menuCheckDatabaseStatus')
    .addToUi();
}

/**
 * UI Action: Runs setupDatabase with modal alert confirmation.
 */
function menuSetupDatabase() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = setupDatabase();
    ui.alert(
      'Inisialisasi Berhasil',
      'Database dan skema tabel telah berhasil disinkronkan ke v2.0.\n' +
      'Laporan migrasi:\n- ' + res.migrationReport.join('\n- '),
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('Error Inisialisasi', err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * UI Action: Runs seedDatabase with modal alert confirmation.
 */
function menuSeedDatabase() {
  var ui = SpreadsheetApp.getUi();
  try {
    var res = seedDatabase();
    ui.alert(
      'Seed Data Berhasil',
      'Data seed idempoten v2.0 telah dimuat:\n' +
      '- Produk Ditambahkan: ' + res.productsAdded + '\n' +
      '- Produk Diperbarui (v2 columns): ' + res.productsUpdated + '\n' +
      '- Varian Ditambahkan: ' + res.variantsAdded + '\n' +
      '- Bundle Ditambahkan: ' + res.campaignsAdded + '\n' +
      '- Kupon Ditambahkan: ' + res.couponsAdded + '\n' +
      '- Pengaturan Ditambahkan: ' + res.settingsAdded + '\n' +
      '- Pesanan Ditambahkan: ' + res.ordersAdded,
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert('Error Seed Data', err.toString(), ui.ButtonSet.OK);
  }
}

/**
 * UI Action: Runs checkDatabaseStatus and displays status.
 */
function menuCheckDatabaseStatus() {
  var ui = SpreadsheetApp.getUi();
  try {
    var status = checkDatabaseStatus();
    var msg = 'Status Database: ' + (status.isHealthy ? 'SEHAT (Lengkap 10 Sheet v2.0)' : 'PERLU PERBAIKAN') + '\n\n';
    var sheetNames = Object.keys(status.sheets);

    for (var i = 0; i < sheetNames.length; i++) {
      var s = status.sheets[sheetNames[i]];
      msg += sheetNames[i] + ': ' + (s.exists ? s.dataRowCount + ' baris data (' + s.colCount + ' kolom)' : 'TIDAK DITEMUKAN') + '\n';
    }

    ui.alert('Pemeriksaan Status Skema', msg, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Error Status Check', err.toString(), ui.ButtonSet.OK);
  }
}
