/**
 * ================================================================================
 * ARYASTORE E-COMMERCE ENGINE - DATABASE SETUP & SAFE MIGRATION SCRIPT
 * ================================================================================
 * File: setup.gs
 * Target: Google Apps Script + Google Sheets
 * Standard: RetroBOT v3.0 Database Architecture & Non-Destructive Safe Migration
 * 
 * Capabilities:
 * 1. Sheet tab names strictly without underscores ('Products', 'ProductVariants', etc.)
 * 2. Idempotent initialization: creates missing sheets, never calls clear() on existing data
 * 3. Schema synchronization: dynamically appends any missing columns at the rightmost position
 * 4. Comprehensive idempotent seed data (9 fashion items, XS-5XL variants, bundles, coupons, settings)
 * 5. Automatic SpreadsheetApp.flush() on all write transactions
 * 6. Google Sheets custom menu (onOpen) for one-click setup, status check, and seed migration
 * ================================================================================
 */

// ================================================================================
// 1. COLUMN INDEX CONSTANTS (Zero-Based Mapping for All 10 Entities)
// ================================================================================

var COL_PRODUCTS = {
  ID: 0,
  NAME: 1,
  CATEGORY: 2,
  BASE_PRICE: 3,
  BADGE: 4,
  DESCRIPTION: 5,
  IMAGE_URL: 6,
  CREATED_AT: 7
};

var COL_VARIANTS = {
  VARIANT_ID: 0,
  PRODUCT_ID: 1,
  SKU: 2,
  COLOR: 3,
  SIZE: 4,
  STOCK: 5
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
  STATUS: 13
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
// 2. MASTER SCHEMA DEFINITIONS (The 10 Non-Underscored Sheets)
// ================================================================================

var SCHEMA_DEFINITIONS = {
  Products: {
    headers: ['id', 'name', 'category', 'base_price', 'badge', 'description', 'image_url', 'created_at'],
    colMap: COL_PRODUCTS
  },
  ProductVariants: {
    headers: ['variant_id', 'product_id', 'sku', 'color', 'size', 'stock'],
    colMap: COL_VARIANTS
  },
  CampaignsAndBundles: {
    headers: ['campaign_id', 'banner_title', 'banner_desc', 'ends_at', 'is_active', 'bundle_items_json', 'normal_price', 'bundle_price'],
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
      'status'
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
 * Returns formatted timestamp in Asia/Jakarta timezone.
 * Falls back safely to standard ISO string if run outside GAS.
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
// 4. MAIN SETUP & MIGRATION FUNCTION (Idempotent)
// ================================================================================

/**
 * Initializes all 10 required database sheets, verifies/appends headers,
 * synchronizes missing columns at the rightmost position without data loss,
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

    // 2. If completely empty, write headers and format header style
    if (lastRow === 0 || lastCol === 0) {
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      formatHeaderRow(sheet, schema.headers.length);
      migrationReport.push(sheetName + ': Lembar kerja dibuat dan header diinisialisasi.');
    } else {
      // 3. Synchronize any missing columns at the rightmost position
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
        migrationReport.push(sheetName + ': Skema sudah sinkron.');
      }
    }
  }

  // 4. Run idempotent seeding
  var seedResult = seedDatabase();

  // 5. Commit all writes
  SpreadsheetApp.flush();

  // 6. Log audit entry for migration
  logSystemAudit('Super Admin', 'SYSTEM_MIGRATION', 'setupDatabase executed successfully. ' + migrationReport.join(' | '));

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
// 5. IDEMPOTENT SEED DATA ENGINE
// ================================================================================

/**
 * Seeds initial demo data for all entities idempotently.
 * Checks for existing unique keys before inserting to guarantee zero duplication.
 */
function seedDatabase() {
  var ss = getSpreadsheet();
  if (!ss) return { success: false, message: 'Spreadsheet not accessible' };

  var results = {
    settingsAdded: 0,
    productsAdded: 0,
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
  // A. Seed Settings (Store Configuration & RBAC PINs)
  // ----------------------------------------------------------------------------
  var settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet) {
    var existingKeys = getExistingColumnValues(settingsSheet, 0); // Key is at index 0

    var defaultSettings = [
      {
        key: 'WA_NUMBER',
        value: '6281234567890',
        description: 'Nomor WhatsApp admin tujuan penerimaan order dan konfirmasi transfer (format 62...)'
      },
      {
        key: 'BRAND_NAME',
        value: 'AryaStore',
        description: 'Nama merek resmi yang ditampilkan pada storefront, invoice, dan notifikasi WhatsApp'
      },
      {
        key: 'PIN_SUPER_ADMIN',
        value: '9999',
        description: 'PIN otentikasi Super Admin (akses penuh seluruh modul dan pengaturan sistem)'
      },
      {
        key: 'PIN_STORE_MANAGER',
        value: '8888',
        description: 'PIN otentikasi Store Manager (katalog produk, stok varian SKU, dan operasional pesanan)'
      },
      {
        key: 'PIN_CUSTOMER_SERVICE',
        value: '7777',
        description: 'PIN otentikasi Customer Service (verifikasi transfer, status pesanan, dan penanganan retur)'
      },
      {
        key: 'SHIPPING_METHODS',
        value: JSON.stringify([
          { id: 'REG', name: 'Reguler (JNE/J&T)', estimated_days: '2-3 Hari Kerja', note: 'Ongkir manual via konfirmasi admin WA' },
          { id: 'EXP', name: 'Express (SiCepat/Paxel)', estimated_days: '1-2 Hari Kerja', note: 'Ongkir manual via konfirmasi admin WA' },
          { id: 'STORE', name: 'Ambil di Toko', estimated_days: 'Hari Kerja Toko (10.00 - 20.00)', note: 'Bebas biaya ongkos kirim' }
        ]),
        description: 'Daftar metode ekspedisi pengiriman yang aktif di cart checkout'
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
  // B. Seed 9 Fashion Items (Across 5 Categories: Outerwear, Tops, Bottoms, Footwear, Accessories)
  // ----------------------------------------------------------------------------
  var productsSheet = ss.getSheetByName('Products');
  var variantsSheet = ss.getSheetByName('ProductVariants');

  if (productsSheet && variantsSheet) {
    var existingProductIds = getExistingColumnValues(productsSheet, 0);
    var existingVariantIds = getExistingColumnValues(variantsSheet, 0);

    var sampleProducts = [
      {
        id: 'PRD-001',
        name: 'Oversized Wool Trench Coat',
        category: 'Outerwear',
        base_price: 899000,
        badge: 'Best Seller',
        description: 'Mantel trench siluet oversized berbahan premium wool blend dengan lining satin lembut. Tahan angin dan memberikan struktur siluet editorial yang elegan untuk layering.',
        image_url: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        variants: [
          { sku: 'WTC-CG-XS', color: 'Charcoal Grey', size: 'XS', stock: 6 },
          { sku: 'WTC-CG-S',  color: 'Charcoal Grey', size: 'S',  stock: 12 },
          { sku: 'WTC-CG-M',  color: 'Charcoal Grey', size: 'M',  stock: 18 },
          { sku: 'WTC-CG-L',  color: 'Charcoal Grey', size: 'L',  stock: 14 },
          { sku: 'WTC-CG-XL', color: 'Charcoal Grey', size: 'XL', stock: 8 },
          { sku: 'WTC-CT-S',  color: 'Camel Tan',     size: 'S',  stock: 10 },
          { sku: 'WTC-CT-M',  color: 'Camel Tan',     size: 'M',  stock: 15 },
          { sku: 'WTC-CT-L',  color: 'Camel Tan',     size: 'L',  stock: 9 },
          { sku: 'WTC-CT-XL', color: 'Camel Tan',     size: 'XL', stock: 5 }
        ]
      },
      {
        id: 'PRD-002',
        name: 'Structured Boxy Blazer',
        category: 'Outerwear',
        base_price: 649000,
        badge: 'New Arrival',
        description: 'Blazer siluet boxy kontemporer dengan potongan bahu berstruktur tegas, saku welt tersembunyi, dan kancing tanduk tunggal. Fleksibel untuk formal maupun smart-casual.',
        image_url: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        variants: [
          { sku: 'SBB-BK-S',   color: 'Midnight Black', size: 'S',   stock: 8 },
          { sku: 'SBB-BK-M',   color: 'Midnight Black', size: 'M',   stock: 16 },
          { sku: 'SBB-BK-L',   color: 'Midnight Black', size: 'L',   stock: 12 },
          { sku: 'SBB-BK-XL',  color: 'Midnight Black', size: 'XL',  stock: 7 },
          { sku: 'SBB-BK-XXL', color: 'Midnight Black', size: 'XXL', stock: 4 },
          { sku: 'SBB-HG-S',   color: 'Heather Grey',   size: 'S',   stock: 6 },
          { sku: 'SBB-HG-M',   color: 'Heather Grey',   size: 'M',   stock: 11 },
          { sku: 'SBB-HG-L',   color: 'Heather Grey',   size: 'L',   stock: 8 }
        ]
      },
      {
        id: 'PRD-003',
        name: 'Heavyweight Cotton Boxy Tee',
        category: 'Tops',
        base_price: 189000,
        badge: 'Best Seller',
        description: 'Kaos boxy fit dari 100% combed cotton 240 GSM. Kerah rib tebal anti-melar dengan jahitan ganda kokoh dan drape kain yang jatuh rapi dan tegap di tubuh.',
        image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        variants: [
          // Full inclusive sizing matrix: XS to 5XL
          { sku: 'HCT-VB-XS',  color: 'Vintage Black', size: 'XS',  stock: 10 },
          { sku: 'HCT-VB-S',   color: 'Vintage Black', size: 'S',   stock: 25 },
          { sku: 'HCT-VB-M',   color: 'Vintage Black', size: 'M',   stock: 35 },
          { sku: 'HCT-VB-L',   color: 'Vintage Black', size: 'L',   stock: 30 },
          { sku: 'HCT-VB-XL',  color: 'Vintage Black', size: 'XL',  stock: 20 },
          { sku: 'HCT-VB-XXL', color: 'Vintage Black', size: 'XXL', stock: 12 },
          { sku: 'HCT-VB-3XL', color: 'Vintage Black', size: '3XL', stock: 8 },
          { sku: 'HCT-VB-4XL', color: 'Vintage Black', size: '4XL', stock: 6 },
          { sku: 'HCT-VB-5XL', color: 'Vintage Black', size: '5XL', stock: 3 }, // Low-stock indicator (<5)
          { sku: 'HCT-BW-S',   color: 'Bone White',    size: 'S',   stock: 20 },
          { sku: 'HCT-BW-M',   color: 'Bone White',    size: 'M',   stock: 28 },
          { sku: 'HCT-BW-L',   color: 'Bone White',    size: 'L',   stock: 22 },
          { sku: 'HCT-BW-XL',  color: 'Bone White',    size: 'XL',  stock: 15 },
          { sku: 'HCT-SG-M',   color: 'Sage Green',    size: 'M',   stock: 18 },
          { sku: 'HCT-SG-L',   color: 'Sage Green',    size: 'L',   stock: 14 }
        ]
      },
      {
        id: 'PRD-004',
        name: 'Relaxed Linen Camp Collar Shirt',
        category: 'Tops',
        base_price: 299000,
        badge: 'None',
        description: 'Kemeja santai kerah terbuka (camp collar) dari serat linen murni Prancis yang sejuk dan breathable. Memberikan tekstur alami berkelas untuk iklim tropis.',
        image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        variants: [
          { sku: 'LCS-NF-S',   color: 'Natural Flax', size: 'S',   stock: 9 },
          { sku: 'LCS-NF-M',   color: 'Natural Flax', size: 'M',   stock: 16 },
          { sku: 'LCS-NF-L',   color: 'Natural Flax', size: 'L',   stock: 12 },
          { sku: 'LCS-NF-XL',  color: 'Natural Flax', size: 'XL',  stock: 7 },
          { sku: 'LCS-TC-M',   color: 'Terracotta',   size: 'M',   stock: 14 },
          { sku: 'LCS-TC-L',   color: 'Terracotta',   size: 'L',   stock: 10 }
        ]
      },
      {
        id: 'PRD-005',
        name: 'Wide-Leg Pleated Trousers',
        category: 'Bottoms',
        base_price: 389000,
        badge: 'Best Seller',
        description: 'Celana panjang potongan wide-leg dengan lipit ganda depan (double pleats) dan pinggang elastis tersembunyi. Dibuat dari kain poly-viscose yang mengalir elegan.',
        image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        variants: [
          { sku: 'WPT-DC-XS',  color: 'Deep Charcoal', size: 'XS',  stock: 5 },
          { sku: 'WPT-DC-S',   color: 'Deep Charcoal', size: 'S',   stock: 14 },
          { sku: 'WPT-DC-M',   color: 'Deep Charcoal', size: 'M',   stock: 22 },
          { sku: 'WPT-DC-L',   color: 'Deep Charcoal', size: 'L',   stock: 18 },
          { sku: 'WPT-DC-XL',  color: 'Deep Charcoal', size: 'XL',  stock: 10 },
          { sku: 'WPT-DC-XXL', color: 'Deep Charcoal', size: 'XXL', stock: 6 },
          { sku: 'WPT-KC-S',   color: 'Khaki Cream',   size: 'S',   stock: 12 },
          { sku: 'WPT-KC-M',   color: 'Khaki Cream',   size: 'M',   stock: 16 },
          { sku: 'WPT-KC-L',   color: 'Khaki Cream',   size: 'L',   stock: 11 }
        ]
      },
      {
        id: 'PRD-006',
        name: 'Raw Selvedge Straight Denim',
        category: 'Bottoms',
        base_price: 529000,
        badge: 'Limited Edition',
        description: 'Celana denim tenun selvedge 14 oz unwashed dengan pinggiran tenun merah klasik. Potongan straight-leg abadi yang akan membentuk garis fade unik personal.',
        image_url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        variants: [
          { sku: 'RSD-IN-XS',  color: 'Indigo Raw', size: 'XS',  stock: 4 },
          { sku: 'RSD-IN-S',   color: 'Indigo Raw', size: 'S',   stock: 12 },
          { sku: 'RSD-IN-M',   color: 'Indigo Raw', size: 'M',   stock: 20 },
          { sku: 'RSD-IN-L',   color: 'Indigo Raw', size: 'L',   stock: 16 },
          { sku: 'RSD-IN-XL',  color: 'Indigo Raw', size: 'XL',  stock: 9 },
          { sku: 'RSD-IN-XXL', color: 'Indigo Raw', size: 'XXL', stock: 5 }
        ]
      },
      {
        id: 'PRD-007',
        name: 'Minimalist Derby Leather Shoes',
        category: 'Footwear',
        base_price: 749000,
        badge: 'New Arrival',
        description: 'Sepatu derby kulit sapi asli (full-grain leather) dengan sol luar karet lug anti-slip dan bantalan insole ortopedik empuk untuk kenyamanan melangkah sepanjang hari.',
        image_url: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        variants: [
          { sku: 'DLS-BK-S',  color: 'Matte Black', size: 'S',  stock: 6 },
          { sku: 'DLS-BK-M',  color: 'Matte Black', size: 'M',  stock: 10 },
          { sku: 'DLS-BK-L',  color: 'Matte Black', size: 'L',  stock: 14 },
          { sku: 'DLS-BK-XL', color: 'Matte Black', size: 'XL', stock: 12 },
          { sku: 'DLS-BR-M',  color: 'Espresso',    size: 'M',  stock: 8 },
          { sku: 'DLS-BR-L',  color: 'Espresso',    size: 'L',  stock: 9 }
        ]
      },
      {
        id: 'PRD-008',
        name: 'Canvas & Leather Weekender Tote',
        category: 'Accessories',
        base_price: 329000,
        badge: 'None',
        description: 'Tas jinjing serbaguna dari kanvas katun tebal 16 oz dengan aksen kulit sapi asli, kompartemen laptop 15 inci empuk, dan penutup ritsleting logam YKK.',
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        variants: [
          { sku: 'CWT-OL-OS', color: 'Olive Green', size: 'All Size', stock: 18 },
          { sku: 'CWT-BG-OS', color: 'Sand Beige',  size: 'All Size', stock: 15 }
        ]
      },
      {
        id: 'PRD-009',
        name: 'Wool Blend Knit Beanie',
        category: 'Accessories',
        base_price: 149000,
        badge: 'None',
        description: 'Topi kupluk rajut rib tenun halus dari campuran wol merino yang hangat tanpa rasa gatal. Desain lipatan fleksibel menyesuaikan bentuk kepala secara nyaman.',
        image_url: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=800&q=80',
        created_at: now,
        variants: [
          { sku: 'WKB-BK-OS', color: 'Raven Black',  size: 'All Size', stock: 24 },
          { sku: 'WKB-OM-OS', color: 'Oatmeal',      size: 'All Size', stock: 20 },
          { sku: 'WKB-BO-OS', color: 'Burnt Orange', size: 'All Size', stock: 14 }
        ]
      }
    ];

    var variantCounter = 1;

    for (var p = 0; p < sampleProducts.length; p++) {
      var prod = sampleProducts[p];
      if (existingProductIds.indexOf(prod.id) === -1) {
        productsSheet.appendRow([
          prod.id,
          prod.name,
          prod.category,
          prod.base_price,
          prod.badge,
          prod.description,
          prod.image_url,
          prod.created_at
        ]);
        results.productsAdded++;
      }

      // Add product variants
      for (var v = 0; v < prod.variants.length; v++) {
        var vData = prod.variants[v];
        var variantId = 'VAR-' + ('000' + variantCounter).slice(-4);
        variantCounter++;

        if (existingVariantIds.indexOf(variantId) === -1) {
          variantsSheet.appendRow([
            variantId,
            prod.id,
            vData.sku,
            vData.color,
            vData.size,
            vData.stock
          ]);
          results.variantsAdded++;
        }
      }
    }
  }

  // ----------------------------------------------------------------------------
  // C. Seed 2 Outfit Bundles & Campaigns
  // ----------------------------------------------------------------------------
  var campaignSheet = ss.getSheetByName('CampaignsAndBundles');
  if (campaignSheet) {
    var existingCampaignIds = getExistingColumnValues(campaignSheet, 0);

    var sampleCampaigns = [
      {
        campaign_id: 'CMP-001',
        banner_title: 'Koleksi Minimalis Kota (Urban Layer Set)',
        banner_desc: 'Paduan sempurna trench coat wol, kaos katun boxy tebal, dan celana wide-leg lipit ganda. Tampil rapi seketika dengan potongan harga spesial paket bundle.',
        ends_at: '2026-12-31 23:59:59',
        is_active: 'TRUE',
        bundle_items_json: JSON.stringify([
          { product_id: 'PRD-001', name: 'Oversized Wool Trench Coat', quantity: 1, base_price: 899000 },
          { product_id: 'PRD-003', name: 'Heavyweight Cotton Boxy Tee', quantity: 1, base_price: 189000 },
          { product_id: 'PRD-005', name: 'Wide-Leg Pleated Trousers', quantity: 1, base_price: 389000 }
        ]),
        normal_price: 1477000,
        bundle_price: 1239000
      },
      {
        campaign_id: 'CMP-002',
        banner_title: 'Setelan Tailored Kontemporer (Modern Tailoring Set)',
        banner_desc: 'Kombinasi modern berstruktur tajam: blazer boxy berstruktur, kemeja santai linen kerah terbuka, dan celana selvedge denim straight-leg klasik.',
        ends_at: '2026-12-31 23:59:59',
        is_active: 'TRUE',
        bundle_items_json: JSON.stringify([
          { product_id: 'PRD-002', name: 'Structured Boxy Blazer', quantity: 1, base_price: 649000 },
          { product_id: 'PRD-004', name: 'Relaxed Linen Camp Collar Shirt', quantity: 1, base_price: 299000 },
          { product_id: 'PRD-006', name: 'Raw Selvedge Straight Denim', quantity: 1, base_price: 529000 }
        ]),
        normal_price: 1477000,
        bundle_price: 1249000
      }
    ];

    for (var c = 0; c < sampleCampaigns.length; c++) {
      var camp = sampleCampaigns[c];
      if (existingCampaignIds.indexOf(camp.campaign_id) === -1) {
        campaignSheet.appendRow([
          camp.campaign_id,
          camp.banner_title,
          camp.banner_desc,
          camp.ends_at,
          camp.is_active,
          camp.bundle_items_json,
          camp.normal_price,
          camp.bundle_price
        ]);
        results.campaignsAdded++;
      }
    }
  }

  // ----------------------------------------------------------------------------
  // D. Seed Sample Coupons (WELCOME10 & HEMAT50K)
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
        total_orders: 2,
        total_spent: 1029200,
        created_at: now,
        notes: 'Pelanggan reguler menyukai warna monokrom gelap'
      },
      {
        customer_id: 'CST-002',
        name: 'Siti Rahma',
        whatsapp_no: '6281898765432',
        total_orders: 1,
        total_spent: 674000,
        created_at: now,
        notes: 'Membeli blazer untuk acara formal'
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
  // F. Seed Sample Orders
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
            product_id: 'PRD-003',
            name: 'Heavyweight Cotton Boxy Tee',
            sku: 'HCT-VB-L',
            color: 'Vintage Black',
            size: 'L',
            quantity: 2,
            price: 189000,
            subtotal: 378000
          }
        ]),
        subtotal: 378000,
        coupon_code: 'WELCOME10',
        coupon_discount: 37800,
        shipping_method: 'Reguler (JNE/J&T)',
        shipping_cost: 15000,
        grand_total: 355200,
        payment_proof_url: '',
        status: 'Selesai'
      },
      {
        invoice_no: 'INV-202611-002',
        created_at: now,
        customer_id: 'CST-002',
        customer_name: 'Siti Rahma',
        whatsapp_no: '6281898765432',
        items_json: JSON.stringify([
          {
            product_id: 'PRD-002',
            name: 'Structured Boxy Blazer',
            sku: 'SBB-BK-M',
            color: 'Midnight Black',
            size: 'M',
            quantity: 1,
            price: 649000,
            subtotal: 649000
          }
        ]),
        subtotal: 649000,
        coupon_code: '',
        coupon_discount: 0,
        shipping_method: 'Express (SiCepat/Paxel)',
        shipping_cost: 25000,
        grand_total: 674000,
        payment_proof_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
        status: 'Bukti Diupload'
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
          ord.status
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
      reason: 'Ukuran L terlalu longgar di bahu, ingin mengajukan tukar size ke M',
      requested_size: 'M',
      status: 'Diajukan',
      admin_notes: 'Menunggu konfirmasi penerimaan barang di gudang'
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
      'Inisialisasi skema database 10 sheet dan pemuatan seed data awal berhasil'
    ]);
    results.auditLogsAdded++;
  }

  // ----------------------------------------------------------------------------
  // I. Seed Conversion Funnel Events (Telemetry Data for Funnel Visualization)
  // ----------------------------------------------------------------------------
  var eventSheet = ss.getSheetByName('EventLogs');
  if (eventSheet && eventSheet.getLastRow() <= 1) {
    var funnelEvents = [
      // Stage 1: Product Views (8 views)
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-001', session_id: 'SES-01', referrer: 'hero' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-003', session_id: 'SES-02', referrer: 'catalog' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-002', session_id: 'SES-03', referrer: 'bundle' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-005', session_id: 'SES-04', referrer: 'catalog' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-006', session_id: 'SES-05', referrer: 'denim' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-003', session_id: 'SES-06', referrer: 'catalog' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-007', session_id: 'SES-07', referrer: 'featured' }) },
      { name: 'product_view', payload: JSON.stringify({ product_id: 'PRD-001', session_id: 'SES-08', referrer: 'catalog' }) },

      // Stage 2: Add to Cart (4 adds)
      { name: 'add_to_cart', payload: JSON.stringify({ product_id: 'PRD-003', sku: 'HCT-VB-L', qty: 2, session_id: 'SES-02' }) },
      { name: 'add_to_cart', payload: JSON.stringify({ product_id: 'PRD-002', sku: 'SBB-BK-M', qty: 1, session_id: 'SES-03' }) },
      { name: 'add_to_cart', payload: JSON.stringify({ product_id: 'PRD-005', sku: 'WPT-DC-M', qty: 1, session_id: 'SES-04' }) },
      { name: 'add_to_cart', payload: JSON.stringify({ product_id: 'PRD-001', sku: 'WTC-CG-M', qty: 1, session_id: 'SES-08' }) },

      // Stage 3: WA Checkout Triggered (2 checkouts)
      { name: 'wa_checkout', payload: JSON.stringify({ invoice_no: 'INV-202611-001', grand_total: 355200, session_id: 'SES-02' }) },
      { name: 'wa_checkout', payload: JSON.stringify({ invoice_no: 'INV-202611-002', grand_total: 674000, session_id: 'SES-03' }) },

      // Stage 4: Paid & Completed (1 paid)
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
// 6. HEALTH & STATUS CHECK FUNCTION
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
 * Adds a custom menu to execute database setup, seed migration, and health checks easily.
 */
function onOpen() {
  if (typeof SpreadsheetApp === 'undefined') return;

  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Fashion E-Commerce Admin')
    .addItem('Jalankan Inisialisasi / Migrasi Database', 'menuSetupDatabase')
    .addItem('Muat Ulang Seed Data (Aman & Idempoten)', 'menuSeedDatabase')
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
      'Database dan skema tabel telah berhasil disinkronkan.\n' +
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
      'Data seed idempoten telah dimuat:\n' +
      '- Produk Ditambahkan: ' + res.productsAdded + '\n' +
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
    var msg = 'Status Database: ' + (status.isHealthy ? 'SEHAT (Lengkap 10 Sheet)' : 'PERLU PERBAIKAN') + '\n\n';
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
