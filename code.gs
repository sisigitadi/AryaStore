/**
 * ================================================================================
 * ARYASTORE E-COMMERCE ENGINE - SERVER-SIDE BACKEND API (v2.0.0)
 * ================================================================================
 * File: code.gs
 * Target: Google Apps Script Web App (Serverless V8 Engine)
 * Standard: RetroBOT v3.0 & antislop Delivery Gate
 * Version: v2.0.0 (Global E-Commerce Expansion, Technical SEO & Internationalization)
 * 
 * Core Architectural Guarantees:
 * 1. Zero-based numeric index constants for all 10 sheets (strict v2.0 column layout)
 * 2. Sequential Mutex ID Generation (INV-YYYYMM-XXX and RTR-YYYYMM-XXX) via LockService (10s lock)
 * 3. getDisplayValues() on all sheet reads, SpreadsheetApp.flush() on all writes
 * 4. Backend-driven search, multi-attribute filtering, sorting, and pagination
 * 5. Full RBAC authorization matrix (Super Admin, Store Manager, Customer Service)
 * 6. Google Drive storage integration for payment proofs and per-color product images
 * 7. Real-time conversion funnel telemetry and audit logging
 * 8. getPublicConfig() secure configuration endpoint (strict PIN and secret redaction)
 * 9. Multi-currency, bilingual metadata, international shipping, and UTM attribution support
 * 10. Live Shipping Integration: RajaOngkir (Komerce v2) + Biteship v1 + Editable Zone Matrix
 * 11. Google Drive Product Image Upload & Multi-Color Gallery support (lh3 direct embed)
 * ================================================================================
 */

// ================================================================================
// 1. COLUMN INDEX CONSTANTS (Zero-Based Mapping for 10 Sheets v2.0)
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
  UTM_SOURCE: 17
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

var SHEET_NAMES = {
  PRODUCTS: 'Products',
  VARIANTS: 'ProductVariants',
  CAMPAIGNS: 'CampaignsAndBundles',
  ORDERS: 'Orders',
  CUSTOMERS: 'Customers',
  COUPONS: 'Coupons',
  RETURNS: 'Returns',
  AUDIT_LOGS: 'AuditLogs',
  EVENT_LOGS: 'EventLogs',
  SETTINGS: 'Settings'
};

var SCHEMA_DEFINITIONS = {
  Products: {
    headers: ['id', 'name', 'category', 'base_price', 'badge', 'description', 'image_url', 'created_at', 'name_en', 'description_en', 'weight_gram', 'marketplace_links_json', 'color_images_json'],
    colMap: COL_PRODUCTS
  },
  ProductVariants: {
    headers: ['variant_id', 'product_id', 'sku', 'color', 'size', 'stock', 'image_url'],
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
      'status',
      'shipping_zone',
      'currency_code',
      'exchange_rate',
      'utm_source'
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
// 2. WEB APP ENTRY POINT (doGet)
// ================================================================================

/**
 * Serves the Single Page Application HTML interface.
 */
function doGet(e) {
  var htmlOutput;
  try {
    var template = HtmlService.createTemplateFromFile('index');
    htmlOutput = template.evaluate();
  } catch (err) {
    htmlOutput = HtmlService.createHtmlOutput(
      '<!DOCTYPE html><html><head><title>AryaStore</title></head><body>' +
      '<h2>AryaStore E-Commerce Engine</h2>' +
      '<p>Gagal memuat file index.html: ' + err.toString() + '</p>' +
      '</body></html>'
    );
  }

  return htmlOutput
    .setTitle('AryaStore | Modern Minimalist Fashion & Curated Apparel')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ================================================================================
// 3. CORE INTERNAL UTILITIES
// ================================================================================

/**
 * Formats current date and time in Asia/Jakarta (WIB) timezone.
 */
function getTimestamp() {
  if (typeof Utilities !== 'undefined' && Utilities.formatDate) {
    return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  }
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Safely accesses the active Google Spreadsheet.
 */
function getSpreadsheet() {
  if (typeof SpreadsheetApp !== 'undefined') {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
  return null;
}

/**
 * Reads all rows from a sheet as display strings (skipping header).
 */
function getSheetDisplayRows(sheetName) {
  var ss = getSpreadsheet();
  if (!ss) return [];
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getDisplayValues();
}

/**
 * Writes an entry into the AuditLogs sheet.
 */
function logAudit(actorRole, moduleName, actionDetail) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName(SHEET_NAMES.AUDIT_LOGS);
    if (!sheet) return;
    sheet.appendRow([
      getTimestamp(),
      actorRole || 'System',
      moduleName || 'GENERAL',
      actionDetail || ''
    ]);
  } catch (err) {
    if (typeof Logger !== 'undefined') {
      Logger.log('Audit log failure: ' + err.toString());
    }
  }
}

/**
 * Reads all configuration parameters into a key-value dictionary.
 */
function loadSettingsDictionary() {
  var rows = getSheetDisplayRows(SHEET_NAMES.SETTINGS);
  var dict = {};
  for (var i = 0; i < rows.length; i++) {
    var key = rows[i][COL_SETTINGS.KEY];
    var val = rows[i][COL_SETTINGS.VALUE];
    if (key) {
      dict[key] = val;
    }
  }
  return dict;
}

/**
 * Normalizes Indonesian WhatsApp phone numbers to standard international format (628...).
 */
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  var cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.indexOf('08') === 0) {
    return '62' + cleaned.substring(1);
  }
  if (cleaned.indexOf('8') === 0) {
    return '62' + cleaned;
  }
  return cleaned;
}

// ================================================================================
// 4. PUBLIC STOREFRONT API ENDPOINTS
// ================================================================================

/**
 * Returns safe public storefront configuration parameters.
 * STRICTLY redacts and filters out administrative PINs, private API keys, and internal folder names.
 */
function getPublicConfig() {
  try {
    var dict = loadSettingsDictionary();

    var publicKeys = [
      'BRAND_NAME',
      'WA_NUMBER',
      'CURRENCY_PREFIX',
      'DEFAULT_LANGUAGE',
      'DEFAULT_CURRENCY',
      'CURRENCY_AUTO_SYNC',
      'CURRENCY_RATES_JSON',
      'FREE_SHIPPING_THRESHOLD_IDR',
      'SHIPPING_RATES_JSON',
      'MARKETPLACE_LINKS_JSON',
      'SOCIAL_LINKS_JSON',
      'STORE_BASE_URL',
      'SEO_TITLE',
      'SEO_DESCRIPTION',
      'SEO_KEYWORDS',
      'GA4_MEASUREMENT_ID',
      'GOOGLE_ADS_ID',
      'GOOGLE_ADS_CONVERSION_LABEL',
      'GTM_ID',
      'META_PIXEL_ID',
      'TIKTOK_PIXEL_ID',
      'SHIPPING_METHODS',
      'SHIPPING_PROVIDER'
    ];

    var publicConfig = {};
    for (var i = 0; i < publicKeys.length; i++) {
      var k = publicKeys[i];
      if (dict[k] !== undefined) {
        publicConfig[k] = dict[k];
      }
    }

    publicConfig['SHIPPING_PROVIDER'] = dict['SHIPPING_PROVIDER'] || 'AUTO';
    publicConfig['RAJAONGKIR_CONFIGURED'] = Boolean(dict['RAJAONGKIR_API_KEY'] && String(dict['RAJAONGKIR_API_KEY']).trim() !== '');
    publicConfig['BITESHIP_CONFIGURED'] = Boolean(dict['BITESHIP_API_KEY'] && String(dict['BITESHIP_API_KEY']).trim() !== '');

    // Explicit security purge to prevent any secret leak
    delete publicConfig['PIN_SUPER_ADMIN'];
    delete publicConfig['PIN_STORE_MANAGER'];
    delete publicConfig['PIN_CUSTOMER_SERVICE'];
    delete publicConfig['DRIVE_FOLDER_NAME'];
    delete publicConfig['DRIVE_PRODUCTS_FOLDER_NAME'];
    delete publicConfig['RAJAONGKIR_API_KEY'];
    delete publicConfig['BITESHIP_API_KEY'];

    return {
      success: true,
      config: publicConfig
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal memuat konfigurasi publik: ' + err.toString(),
      config: {}
    };
  }
}

/**
 * Returns filtered, searched, sorted, and paginated product catalog items.
 * Joins ProductVariants to calculate aggregate inventory and available sizes.
 * Supports bilingual attributes (name_en, description_en), weight, marketplace links,
 * and multi-color image gallery mappings.
 */
function getProducts(filters) {
  try {
    filters = filters || {};
    var search = (filters.search || '').trim().toLowerCase();
    var category = filters.category || 'All';
    var maxPrice = filters.maxPrice ? parseFloat(filters.maxPrice) : 0;
    var size = filters.size || 'All';
    var badge = filters.badge || 'All';
    var sortBy = filters.sortBy || 'newest';
    var page = parseInt(filters.page, 10) || 1;
    var limit = parseInt(filters.limit, 10) || 12;

    var productRows = getSheetDisplayRows(SHEET_NAMES.PRODUCTS);
    var variantRows = getSheetDisplayRows(SHEET_NAMES.VARIANTS);

    var variantsByProduct = {};
    for (var v = 0; v < variantRows.length; v++) {
      var vRow = variantRows[v];
      var pId = vRow[COL_VARIANTS.PRODUCT_ID];
      if (!variantsByProduct[pId]) {
        variantsByProduct[pId] = [];
      }
      var stockNum = parseInt(vRow[COL_VARIANTS.STOCK], 10) || 0;
      var vImg = vRow.length > COL_VARIANTS.IMAGE_URL ? (vRow[COL_VARIANTS.IMAGE_URL] || '') : '';
      variantsByProduct[pId].push({
        variant_id: vRow[COL_VARIANTS.VARIANT_ID],
        product_id: pId,
        sku: vRow[COL_VARIANTS.SKU],
        color: vRow[COL_VARIANTS.COLOR],
        size: vRow[COL_VARIANTS.SIZE],
        stock: stockNum,
        image_url: vImg
      });
    }

    var filtered = [];

    for (var i = 0; i < productRows.length; i++) {
      var row = productRows[i];
      var prodId = row[COL_PRODUCTS.ID];
      var prodName = row[COL_PRODUCTS.NAME];
      var prodCat = row[COL_PRODUCTS.CATEGORY];
      var basePrice = parseFloat(row[COL_PRODUCTS.BASE_PRICE]) || 0;
      var prodBadge = row[COL_PRODUCTS.BADGE];
      var prodDesc = row[COL_PRODUCTS.DESCRIPTION];
      var prodImage = row[COL_PRODUCTS.IMAGE_URL];
      var prodCreatedAt = row[COL_PRODUCTS.CREATED_AT];
      var prodNameEn = row[COL_PRODUCTS.NAME_EN] || prodName;
      var prodDescEn = row[COL_PRODUCTS.DESCRIPTION_EN] || prodDesc;
      var weightGram = parseInt(row[COL_PRODUCTS.WEIGHT_GRAM], 10) || 300;

      var marketplaceLinks = {};
      try {
        var mpRaw = row[COL_PRODUCTS.MARKETPLACE_LINKS_JSON];
        if (mpRaw) marketplaceLinks = JSON.parse(mpRaw);
      } catch (e) {
        marketplaceLinks = {};
      }

      var colorImages = {};
      try {
        var ciRaw = row.length > COL_PRODUCTS.COLOR_IMAGES_JSON ? row[COL_PRODUCTS.COLOR_IMAGES_JSON] : '';
        if (ciRaw) colorImages = JSON.parse(ciRaw);
      } catch (e) {
        colorImages = {};
      }

      var prodVariants = variantsByProduct[prodId] || [];

      var totalStock = 0;
      var availableSizes = [];
      var colorsList = [];

      for (var j = 0; j < prodVariants.length; j++) {
        var vr = prodVariants[j];
        totalStock += vr.stock;
        if (vr.stock > 0 && availableSizes.indexOf(vr.size) === -1) {
          availableSizes.push(vr.size);
        }
        if (colorsList.indexOf(vr.color) === -1) {
          colorsList.push(vr.color);
        }
      }

      if (category !== 'All' && category !== 'Semua' && prodCat.toLowerCase() !== category.toLowerCase()) {
        continue;
      }

      if (maxPrice > 0 && basePrice > maxPrice) {
        continue;
      }

      if (badge !== 'All' && badge !== 'Semua' && prodBadge.toLowerCase() !== badge.toLowerCase()) {
        continue;
      }

      if (size !== 'All' && size !== 'Semua') {
        var sizeMatch = false;
        for (var k = 0; k < prodVariants.length; k++) {
          if (prodVariants[k].size.toUpperCase() === size.toUpperCase() && prodVariants[k].stock > 0) {
            sizeMatch = true;
            break;
          }
        }
        if (!sizeMatch) continue;
      }

      if (search) {
        var searchHaystack = (prodName + ' ' + prodDesc + ' ' + prodCat + ' ' + prodBadge + ' ' + prodNameEn + ' ' + prodDescEn).toLowerCase();
        if (searchHaystack.indexOf(search) === -1) {
          continue;
        }
      }

      filtered.push({
        id: prodId,
        name: prodName,
        name_en: prodNameEn,
        category: prodCat,
        base_price: basePrice,
        badge: prodBadge,
        description: prodDesc,
        description_en: prodDescEn,
        weight_gram: weightGram,
        marketplace_links: marketplaceLinks,
        marketplace_links_json: row[COL_PRODUCTS.MARKETPLACE_LINKS_JSON] || '{}',
        color_images: colorImages,
        color_images_json: (row.length > COL_PRODUCTS.COLOR_IMAGES_JSON ? row[COL_PRODUCTS.COLOR_IMAGES_JSON] : '') || '{}',
        image_url: prodImage,
        created_at: prodCreatedAt,
        total_stock: totalStock,
        available_sizes: availableSizes,
        colors: colorsList,
        variants_count: prodVariants.length
      });
    }

    if (sortBy === 'price_asc') {
      filtered.sort(function(a, b) { return a.base_price - b.base_price; });
    } else if (sortBy === 'price_desc') {
      filtered.sort(function(a, b) { return b.base_price - a.base_price; });
    } else {
      filtered.sort(function(a, b) {
        if (b.created_at && a.created_at) {
          return b.created_at.localeCompare(a.created_at);
        }
        return b.id.localeCompare(a.id);
      });
    }

    var totalCount = filtered.length;
    var totalPages = Math.ceil(totalCount / limit) || 1;
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;

    var startIndex = (page - 1) * limit;
    var pagedProducts = filtered.slice(startIndex, startIndex + limit);

    return {
      success: true,
      products: pagedProducts,
      totalCount: totalCount,
      page: page,
      totalPages: totalPages,
      limit: limit
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengambil katalog produk: ' + err.toString(),
      products: [],
      totalCount: 0
    };
  }
}

/**
 * Returns full details of a specific product and all its variant stock units including color images.
 */
function getProductDetail(productId) {
  try {
    if (!productId) {
      return { success: false, message: 'ID Produk diperlukan' };
    }

    var productRows = getSheetDisplayRows(SHEET_NAMES.PRODUCTS);
    var product = null;

    for (var i = 0; i < productRows.length; i++) {
      var row = productRows[i];
      if (row[COL_PRODUCTS.ID] === productId) {
        var mp = {};
        try {
          if (row[COL_PRODUCTS.MARKETPLACE_LINKS_JSON]) mp = JSON.parse(row[COL_PRODUCTS.MARKETPLACE_LINKS_JSON]);
        } catch (e) { mp = {}; }

        var ci = {};
        try {
          var rawCi = row.length > COL_PRODUCTS.COLOR_IMAGES_JSON ? row[COL_PRODUCTS.COLOR_IMAGES_JSON] : '';
          if (rawCi) ci = JSON.parse(rawCi);
        } catch (e) { ci = {}; }

        product = {
          id: row[COL_PRODUCTS.ID],
          name: row[COL_PRODUCTS.NAME],
          name_en: row[COL_PRODUCTS.NAME_EN] || row[COL_PRODUCTS.NAME],
          category: row[COL_PRODUCTS.CATEGORY],
          base_price: parseFloat(row[COL_PRODUCTS.BASE_PRICE]) || 0,
          badge: row[COL_PRODUCTS.BADGE],
          description: row[COL_PRODUCTS.DESCRIPTION],
          description_en: row[COL_PRODUCTS.DESCRIPTION_EN] || row[COL_PRODUCTS.DESCRIPTION],
          weight_gram: parseInt(row[COL_PRODUCTS.WEIGHT_GRAM], 10) || 300,
          marketplace_links: mp,
          marketplace_links_json: row[COL_PRODUCTS.MARKETPLACE_LINKS_JSON] || '{}',
          color_images: ci,
          color_images_json: (row.length > COL_PRODUCTS.COLOR_IMAGES_JSON ? row[COL_PRODUCTS.COLOR_IMAGES_JSON] : '') || '{}',
          image_url: row[COL_PRODUCTS.IMAGE_URL],
          created_at: row[COL_PRODUCTS.CREATED_AT]
        };
        break;
      }
    }

    if (!product) {
      return { success: false, message: 'Produk dengan ID ' + productId + ' tidak ditemukan' };
    }

    var variantRows = getSheetDisplayRows(SHEET_NAMES.VARIANTS);
    var variants = [];
    var totalStock = 0;

    for (var j = 0; j < variantRows.length; j++) {
      var vRow = variantRows[j];
      if (vRow[COL_VARIANTS.PRODUCT_ID] === productId) {
        var stock = parseInt(vRow[COL_VARIANTS.STOCK], 10) || 0;
        totalStock += stock;
        var vImg = vRow.length > COL_VARIANTS.IMAGE_URL ? (vRow[COL_VARIANTS.IMAGE_URL] || '') : '';
        variants.push({
          variant_id: vRow[COL_VARIANTS.VARIANT_ID],
          product_id: productId,
          sku: vRow[COL_VARIANTS.SKU],
          color: vRow[COL_VARIANTS.COLOR],
          size: vRow[COL_VARIANTS.SIZE],
          stock: stock,
          image_url: vImg
        });
      }
    }

    product.total_stock = totalStock;

    return {
      success: true,
      product: product,
      variants: variants
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengambil detail produk: ' + err.toString()
    };
  }
}

/**
 * Returns all currently active promotional banners and outfit bundling sets.
 */
function getActiveCampaigns() {
  try {
    var rows = getSheetDisplayRows(SHEET_NAMES.CAMPAIGNS);
    var activeCampaigns = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var isActive = String(row[COL_CAMPAIGNS.IS_ACTIVE]).toUpperCase() === 'TRUE';
      if (!isActive) continue;

      var bundleItems = [];
      try {
        var jsonStr = row[COL_CAMPAIGNS.BUNDLE_ITEMS_JSON];
        if (jsonStr) {
          bundleItems = JSON.parse(jsonStr);
        }
      } catch (e) {
        bundleItems = [];
      }

      activeCampaigns.push({
        campaign_id: row[COL_CAMPAIGNS.CAMPAIGN_ID],
        banner_title: row[COL_CAMPAIGNS.BANNER_TITLE],
        banner_desc: row[COL_CAMPAIGNS.BANNER_DESC],
        ends_at: row[COL_CAMPAIGNS.ENDS_AT],
        is_active: true,
        bundle_items: bundleItems,
        normal_price: parseFloat(row[COL_CAMPAIGNS.NORMAL_PRICE]) || 0,
        bundle_price: parseFloat(row[COL_CAMPAIGNS.BUNDLE_PRICE]) || 0,
        savings: (parseFloat(row[COL_CAMPAIGNS.NORMAL_PRICE]) || 0) - (parseFloat(row[COL_CAMPAIGNS.BUNDLE_PRICE]) || 0)
      });
    }

    return {
      success: true,
      campaigns: activeCampaigns
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengambil kampanye aktif: ' + err.toString(),
      campaigns: []
    };
  }
}

/**
 * Validates a coupon code against minimum spend rules and returns calculated discount.
 */
function validateCoupon(code, subtotal) {
  try {
    if (!code) {
      return { success: false, valid: false, message: 'Kode kupon wajib diisi' };
    }

    var cleanCode = String(code).trim().toUpperCase();
    subtotal = parseFloat(subtotal) || 0;

    var rows = getSheetDisplayRows(SHEET_NAMES.COUPONS);
    var matchedCoupon = null;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var cCode = String(row[COL_COUPONS.CODE]).trim().toUpperCase();
      if (cCode === cleanCode) {
        matchedCoupon = {
          code: cCode,
          discount_type: row[COL_COUPONS.DISCOUNT_TYPE],
          discount_value: parseFloat(row[COL_COUPONS.DISCOUNT_VALUE]) || 0,
          min_spend: parseFloat(row[COL_COUPONS.MIN_SPEND]) || 0,
          description: row[COL_COUPONS.DESCRIPTION],
          is_active: String(row[COL_COUPONS.IS_ACTIVE]).toUpperCase() === 'TRUE'
        };
        break;
      }
    }

    if (!matchedCoupon) {
      return { success: true, valid: false, message: 'Kode kupon ' + cleanCode + ' tidak ditemukan' };
    }

    if (!matchedCoupon.is_active) {
      return { success: true, valid: false, message: 'Kupon promo sudah tidak aktif' };
    }

    if (subtotal < matchedCoupon.min_spend) {
      var deficit = matchedCoupon.min_spend - subtotal;
      return {
        success: true,
        valid: false,
        message: 'Minimal pembelanjaan untuk kupon ini adalah Rp ' + matchedCoupon.min_spend.toLocaleString('id-ID') + ' (kurang Rp ' + deficit.toLocaleString('id-ID') + ')'
      };
    }

    var discountAmount = 0;
    if (matchedCoupon.discount_type === 'PERCENT') {
      discountAmount = Math.round((subtotal * matchedCoupon.discount_value) / 100);
    } else {
      discountAmount = matchedCoupon.discount_value;
    }

    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    return {
      success: true,
      valid: true,
      coupon: {
        code: matchedCoupon.code,
        discount_type: matchedCoupon.discount_type,
        discount_value: matchedCoupon.discount_value,
        min_spend: matchedCoupon.min_spend,
        description: matchedCoupon.description,
        discount_amount: discountAmount
      }
    };
  } catch (err) {
    return {
      success: false,
      valid: false,
      message: 'Gagal memvalidasi kupon: ' + err.toString()
    };
  }
}

/**
 * Creates an order, deducts variant stock, records customer history,
 * and generates a unique sequential invoice ID protected by a 10-second LockService mutex.
 * Supports shipping zone, calculated shipping fee, currency, exchange rate, and UTM attribution.
 */
function createOrder(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!payload) {
      return { success: false, message: 'Data pesanan kosong' };
    }

    var customerName = (payload.customer_name || '').trim();
    var rawPhone = (payload.whatsapp_no || '').trim();
    var cleanPhone = normalizePhoneNumber(rawPhone);

    if (!customerName || !cleanPhone) {
      return { success: false, message: 'Nama pelanggan dan nomor WhatsApp wajib diisi' };
    }

    var items = payload.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, message: 'Keranjang belanja Anda masih kosong' };
    }

    var ss = getSpreadsheet();
    if (!ss) {
      return { success: false, message: 'Spreadsheet database tidak dapat diakses' };
    }

    var ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    var variantsSheet = ss.getSheetByName(SHEET_NAMES.VARIANTS);
    var customersSheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);

    if (!ordersSheet || !variantsSheet || !customersSheet) {
      return { success: false, message: 'Struktur sheet transaksi belum lengkap' };
    }

    // 1. Verify and deduct inventory for each item
    var variantDataRange = variantsSheet.getDataRange();
    var variantValues = variantDataRange.getDisplayValues();

    for (var it = 0; it < items.length; it++) {
      var item = items[it];
      var requestedQty = parseInt(item.quantity, 10) || 1;
      var skuToFind = item.sku;
      var foundRowIndex = -1;
      var currentStock = 0;

      for (var vr = 1; vr < variantValues.length; vr++) {
        if (variantValues[vr][COL_VARIANTS.SKU] === skuToFind) {
          foundRowIndex = vr + 1;
          currentStock = parseInt(variantValues[vr][COL_VARIANTS.STOCK], 10) || 0;
          break;
        }
      }

      if (foundRowIndex === -1) {
        return {
          success: false,
          message: 'Varian barang dengan SKU ' + skuToFind + ' tidak ditemukan di sistem'
        };
      }

      if (currentStock < requestedQty) {
        return {
          success: false,
          message: 'Stok tidak mencukupi untuk item ' + item.name + ' (' + skuToFind + '). Tersisa: ' + currentStock + ' unit.'
        };
      }

      var updatedStock = currentStock - requestedQty;
      variantsSheet.getRange(foundRowIndex, COL_VARIANTS.STOCK + 1).setValue(updatedStock);
      variantValues[foundRowIndex - 1][COL_VARIANTS.STOCK] = updatedStock;
    }

    // 2. Sequential Mutex ID Generation for Invoice (INV-YYYYMM-XXX)
    var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMM');
    var targetPrefix = 'INV-' + nowStr + '-';
    var maxSeq = 0;

    var orderLastRow = ordersSheet.getLastRow();
    if (orderLastRow > 1) {
      var invoiceValues = ordersSheet.getRange(2, COL_ORDERS.INVOICE_NO + 1, orderLastRow - 1, 1).getDisplayValues();
      for (var rowIdx = 0; rowIdx < invoiceValues.length; rowIdx++) {
        var existingInv = String(invoiceValues[rowIdx][0]).trim();
        if (existingInv.indexOf(targetPrefix) === 0) {
          var seqNum = parseInt(existingInv.substring(targetPrefix.length), 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }

    var nextInvoiceSeq = maxSeq + 1;
    var invoiceNo = targetPrefix + ('000' + nextInvoiceSeq).slice(-3);

    // 3. Customer Directory lookup or insertion
    var customerLastRow = customersSheet.getLastRow();
    var customerId = '';
    var existingCustomerRowIdx = -1;

    if (customerLastRow > 1) {
      var custValues = customersSheet.getRange(2, 1, customerLastRow - 1, customersSheet.getLastColumn()).getDisplayValues();
      for (var c = 0; c < custValues.length; c++) {
        var storedPhone = normalizePhoneNumber(custValues[c][COL_CUSTOMERS.WHATSAPP_NO]);
        if (storedPhone === cleanPhone) {
          customerId = custValues[c][COL_CUSTOMERS.CUSTOMER_ID];
          existingCustomerRowIdx = c + 2;
          break;
        }
      }
    }

    var subtotal = parseFloat(payload.subtotal) || 0;
    var couponDiscount = parseFloat(payload.coupon_discount) || 0;
    var shippingCost = parseFloat(payload.shipping_cost) || 0;
    var grandTotal = Math.max(0, subtotal - couponDiscount + shippingCost);
    var timestamp = getTimestamp();

    if (existingCustomerRowIdx > 0) {
      var currentOrderCount = parseInt(customersSheet.getRange(existingCustomerRowIdx, COL_CUSTOMERS.TOTAL_ORDERS + 1).getValue(), 10) || 0;
      customersSheet.getRange(existingCustomerRowIdx, COL_CUSTOMERS.TOTAL_ORDERS + 1).setValue(currentOrderCount + 1);
    } else {
      var newCustSeq = Math.max(1, customerLastRow);
      customerId = 'CST-' + ('000' + newCustSeq).slice(-3);
      customersSheet.appendRow([
        customerId,
        customerName,
        cleanPhone,
        1,
        0,
        timestamp,
        payload.notes || ''
      ]);
    }

    // 4. Append Order record (full 18-column schema v2.0)
    var shippingZone = payload.shipping_zone || 'JABODETABEK';
    var currencyCode = payload.currency_code || 'IDR';
    var exchangeRate = parseFloat(payload.exchange_rate) || 1;
    var utmSource = payload.utm_source || 'direct';

    var newOrderRow = [
      invoiceNo,
      timestamp,
      customerId,
      customerName,
      cleanPhone,
      JSON.stringify(items),
      subtotal,
      payload.coupon_code || '',
      couponDiscount,
      payload.shipping_method || 'Reguler (JNE/J&T)',
      shippingCost,
      grandTotal,
      '', // payment_proof_url initially empty
      'Menunggu Pembayaran',
      shippingZone,
      currencyCode,
      exchangeRate,
      utmSource
    ];

    ordersSheet.appendRow(newOrderRow);
    SpreadsheetApp.flush();

    logAudit('Customer', 'Orders', 'Pesanan baru berhasil dibuat: ' + invoiceNo + ' (' + currencyCode + ' ' + grandTotal + ') oleh ' + customerName);
    logEvent('wa_checkout', {
      invoice_no: invoiceNo,
      grand_total: grandTotal,
      currency: currencyCode,
      utm_source: utmSource
    });

    return {
      success: true,
      invoice_no: invoiceNo,
      customer_id: customerId,
      grand_total: grandTotal,
      shipping_cost: shippingCost,
      status: 'Menunggu Pembayaran',
      message: 'Pesanan berhasil dibuat dengan nomor invoice ' + invoiceNo
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal memproses pesanan: ' + err.toString()
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Searches and returns order status and line items for self-service customer tracking.
 */
function lookupOrder(invoiceNo, whatsappNo) {
  try {
    if (!invoiceNo || !whatsappNo) {
      return { success: false, message: 'Nomor invoice dan nomor WhatsApp wajib diisi' };
    }

    var cleanInv = String(invoiceNo).trim().toUpperCase();
    var cleanPhone = normalizePhoneNumber(whatsappNo);

    var orderRows = getSheetDisplayRows(SHEET_NAMES.ORDERS);
    var foundOrder = null;

    for (var i = 0; i < orderRows.length; i++) {
      var row = orderRows[i];
      var rInv = String(row[COL_ORDERS.INVOICE_NO]).trim().toUpperCase();
      var rPhone = normalizePhoneNumber(row[COL_ORDERS.WHATSAPP_NO]);

      if (rInv === cleanInv) {
        if (rPhone !== cleanPhone) {
          return {
            success: false,
            message: 'Nomor WhatsApp tidak cocok dengan nomor yang terdaftar pada invoice ' + cleanInv
          };
        }

        var parsedItems = [];
        try {
          parsedItems = JSON.parse(row[COL_ORDERS.ITEMS_JSON]);
        } catch (e) {
          parsedItems = [];
        }

        foundOrder = {
          invoice_no: row[COL_ORDERS.INVOICE_NO],
          created_at: row[COL_ORDERS.CREATED_AT],
          customer_id: row[COL_ORDERS.CUSTOMER_ID],
          customer_name: row[COL_ORDERS.CUSTOMER_NAME],
          whatsapp_no: row[COL_ORDERS.WHATSAPP_NO],
          items: parsedItems,
          subtotal: parseFloat(row[COL_ORDERS.SUBTOTAL]) || 0,
          coupon_code: row[COL_ORDERS.COUPON_CODE],
          coupon_discount: parseFloat(row[COL_ORDERS.COUPON_DISCOUNT]) || 0,
          shipping_method: row[COL_ORDERS.SHIPPING_METHOD],
          shipping_cost: parseFloat(row[COL_ORDERS.SHIPPING_COST]) || 0,
          grand_total: parseFloat(row[COL_ORDERS.GRAND_TOTAL]) || 0,
          payment_proof_url: row[COL_ORDERS.PAYMENT_PROOF_URL],
          status: row[COL_ORDERS.STATUS],
          shipping_zone: row[COL_ORDERS.SHIPPING_ZONE] || 'DOMESTIK',
          currency_code: row[COL_ORDERS.CURRENCY_CODE] || 'IDR',
          exchange_rate: parseFloat(row[COL_ORDERS.EXCHANGE_RATE]) || 1,
          utm_source: row[COL_ORDERS.UTM_SOURCE] || 'direct'
        };
        break;
      }
    }

    if (!foundOrder) {
      return { success: false, message: 'Pesanan dengan nomor invoice ' + cleanInv + ' tidak ditemukan' };
    }

    var returnRows = getSheetDisplayRows(SHEET_NAMES.RETURNS);
    var returnList = [];

    for (var r = 0; r < returnRows.length; r++) {
      var retRow = returnRows[r];
      if (String(retRow[COL_RETURNS.INVOICE_NO]).trim().toUpperCase() === cleanInv) {
        returnList.push({
          return_id: retRow[COL_RETURNS.RETURN_ID],
          reason: retRow[COL_RETURNS.REASON],
          requested_size: retRow[COL_RETURNS.REQUESTED_SIZE],
          status: retRow[COL_RETURNS.STATUS],
          admin_notes: retRow[COL_RETURNS.ADMIN_NOTES]
        });
      }
    }

    return {
      success: true,
      order: foundOrder,
      returns: returnList
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mencari pesanan: ' + err.toString()
    };
  }
}

/**
 * Uploads a base64-encoded payment proof receipt to Google Drive,
 * sets public view permissions, and saves direct embed lh3 URL to the Orders sheet.
 */
function uploadPaymentProof(invoiceNo, base64Data, mimeType, fileName) {
  try {
    if (!invoiceNo || !base64Data) {
      return { success: false, message: 'Nomor invoice dan file bukti pembayaran wajib disediakan' };
    }

    var cleanInv = String(invoiceNo).trim().toUpperCase();

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    if (!ordersSheet) return { success: false, message: 'Sheet Orders tidak ditemukan' };

    var lastRow = ordersSheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Data pesanan kosong' };

    var invoiceValues = ordersSheet.getRange(2, COL_ORDERS.INVOICE_NO + 1, lastRow - 1, 1).getDisplayValues();
    var targetRowIndex = -1;

    for (var i = 0; i < invoiceValues.length; i++) {
      if (String(invoiceValues[i][0]).trim().toUpperCase() === cleanInv) {
        targetRowIndex = i + 2;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: 'Pesanan ' + cleanInv + ' tidak ditemukan' };
    }

    var cleanBase64 = base64Data;
    if (cleanBase64.indexOf(',') > -1) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    mimeType = mimeType || 'image/jpeg';
    fileName = fileName || ('bukti_bayar_' + cleanInv + '.jpg');

    var decodedBytes;
    try {
      decodedBytes = Utilities.base64Decode(cleanBase64);
    } catch (e) {
      return { success: false, message: 'Format base64 gambar tidak valid' };
    }

    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    var settings = loadSettingsDictionary();
    var folderName = settings['DRIVE_FOLDER_NAME'] || 'ARYASTORE_PAYMENTS';

    if (typeof DriveApp !== 'undefined') {
      var folderIterator = DriveApp.getFoldersByName(folderName);
      var targetFolder = folderIterator.hasNext() ? folderIterator.next() : DriveApp.createFolder(folderName);

      var driveFile = targetFolder.createFile(blob);
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileId = driveFile.getId();
      var directEmbedUrl = 'https://lh3.googleusercontent.com/d/' + fileId + '=w1200';

      ordersSheet.getRange(targetRowIndex, COL_ORDERS.PAYMENT_PROOF_URL + 1).setValue(directEmbedUrl);
      ordersSheet.getRange(targetRowIndex, COL_ORDERS.STATUS + 1).setValue('Bukti Diupload');
      SpreadsheetApp.flush();

      logAudit('Customer', 'Orders', 'Bukti transfer diunggah untuk invoice ' + cleanInv + ' (Drive File ID: ' + fileId + ')');

      return {
        success: true,
        fileId: fileId,
        url: directEmbedUrl,
        driveViewUrl: driveFile.getUrl(),
        status: 'Bukti Diupload',
        message: 'Bukti pembayaran berhasil diunggah. Tim admin akan segera memverifikasi pembayaran Anda.'
      };
    } else {
      var simulatedUrl = 'https://drive.google.com/file/d/simulated_' + cleanInv + '/view';
      ordersSheet.getRange(targetRowIndex, COL_ORDERS.PAYMENT_PROOF_URL + 1).setValue(simulatedUrl);
      ordersSheet.getRange(targetRowIndex, COL_ORDERS.STATUS + 1).setValue('Bukti Diupload');
      SpreadsheetApp.flush();

      return {
        success: true,
        fileId: 'simulated_' + cleanInv,
        url: simulatedUrl,
        status: 'Bukti Diupload',
        message: 'Bukti pembayaran tercatat (Mode Simulasi).'
      };
    }
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengunggah bukti pembayaran: ' + err.toString()
    };
  }
}

/**
 * Uploads a product or variant color photograph directly to Google Drive (folder ARYASTORE_PRODUCTS).
 * Returns direct embeddable lh3.googleusercontent.com URLs for reliable cross-origin rendering.
 * Protected by RBAC (Super Admin, Store Manager).
 * 
 * @param {string} base64Data
 * @param {string} mimeType
 * @param {string} fileName
 * @param {string} productId
 * @param {string} colorLabel
 * @param {string} role
 */
function uploadProductImage(base64Data, mimeType, fileName, productId, colorLabel, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager'])) {
      return { success: false, message: 'Otorisasi ditolak. Pengunggahan foto produk hanya untuk Admin/Manager.' };
    }

    if (!base64Data) {
      return { success: false, message: 'Data foto base64 wajib disertakan' };
    }

    var cleanBase64 = base64Data;
    if (cleanBase64.indexOf(',') > -1) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    mimeType = mimeType || 'image/jpeg';
    var ext = mimeType.indexOf('png') > -1 ? '.png' : (mimeType.indexOf('webp') > -1 ? '.webp' : '.jpg');
    var safeColor = (colorLabel || 'main').toLowerCase().replace(/[^a-z0-9]/g, '_');
    var autoName = (productId || 'PRD') + '_' + safeColor + '_' + new Date().getTime() + ext;
    fileName = fileName || autoName;

    var decodedBytes;
    try {
      decodedBytes = Utilities.base64Decode(cleanBase64);
    } catch (e) {
      return { success: false, message: 'Format base64 gambar tidak valid' };
    }

    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

    var settings = loadSettingsDictionary();
    var folderName = settings['DRIVE_PRODUCTS_FOLDER_NAME'] || 'ARYASTORE_PRODUCTS';

    if (typeof DriveApp !== 'undefined') {
      var folderIterator = DriveApp.getFoldersByName(folderName);
      var targetFolder = folderIterator.hasNext() ? folderIterator.next() : DriveApp.createFolder(folderName);

      var driveFile = targetFolder.createFile(blob);
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileId = driveFile.getId();

      var directImageUrl = 'https://lh3.googleusercontent.com/d/' + fileId + '=w1000';
      var directThumbUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';

      logAudit(role, 'Products', 'Foto produk baru diunggah ke Google Drive: ' + fileName + ' (ID: ' + fileId + ', Warna: ' + (colorLabel || 'Utama') + ')');

      return {
        success: true,
        fileId: fileId,
        imageUrl: directImageUrl,
        thumbnailUrl: directThumbUrl,
        driveViewUrl: driveFile.getUrl(),
        message: 'Foto berhasil diunggah ke Google Drive (' + folderName + ').'
      };
    } else {
      var simId = 'sim_prod_' + (productId || 'PRD') + '_' + new Date().getTime();
      var simUrl = 'https://lh3.googleusercontent.com/d/' + simId + '=w1000';
      return {
        success: true,
        fileId: simId,
        imageUrl: simUrl,
        thumbnailUrl: simUrl,
        driveViewUrl: 'https://drive.google.com/file/d/' + simId + '/view',
        message: 'Foto tercatat (Mode Simulasi).'
      };
    }
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengunggah foto produk: ' + err.toString()
    };
  }
}

/**
 * Submits a size exchange or return request, generating sequential RTR-YYYYMM-XXX ID via mutex.
 */
function submitReturn(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!payload || !payload.invoice_no || !payload.reason) {
      return { success: false, message: 'Nomor invoice dan alasan pengajuan retur wajib diisi' };
    }

    var cleanInv = String(payload.invoice_no).trim().toUpperCase();

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var returnsSheet = ss.getSheetByName(SHEET_NAMES.RETURNS);
    if (!returnsSheet) return { success: false, message: 'Sheet Returns tidak ditemukan' };

    var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMM');
    var targetPrefix = 'RTR-' + nowStr + '-';
    var maxSeq = 0;

    var lastRow = returnsSheet.getLastRow();
    if (lastRow > 1) {
      var returnValues = returnsSheet.getRange(2, COL_RETURNS.RETURN_ID + 1, lastRow - 1, 1).getDisplayValues();
      for (var i = 0; i < returnValues.length; i++) {
        var existingRtr = String(returnValues[i][0]).trim();
        if (existingRtr.indexOf(targetPrefix) === 0) {
          var seqNum = parseInt(existingRtr.substring(targetPrefix.length), 10);
          if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
          }
        }
      }
    }

    var nextSeq = maxSeq + 1;
    var returnId = targetPrefix + ('000' + nextSeq).slice(-3);

    returnsSheet.appendRow([
      returnId,
      cleanInv,
      payload.customer_name || 'Pelanggan',
      payload.reason || '',
      payload.requested_size || '-',
      'Diajukan',
      'Menunggu peninjauan admin'
    ]);

    SpreadsheetApp.flush();
    logAudit('Customer', 'Returns', 'Pengajuan retur baru: ' + returnId + ' untuk invoice ' + cleanInv);

    return {
      success: true,
      return_id: returnId,
      status: 'Diajukan',
      message: 'Pengajuan retur ' + returnId + ' berhasil dicatat. Tim kami akan segera menghubungi Anda.'
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengajukan retur: ' + err.toString()
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Logs a storefront telemetry event for the 4-stage conversion funnel and ad attribution.
 */
function logEvent(eventName, eventData) {
  try {
    var ss = getSpreadsheet();
    if (!ss) return { success: false };
    var sheet = ss.getSheetByName(SHEET_NAMES.EVENT_LOGS);
    if (!sheet) return { success: false };

    var payloadStr = typeof eventData === 'string' ? eventData : JSON.stringify(eventData || {});

    sheet.appendRow([
      getTimestamp(),
      eventName || 'unknown',
      payloadStr
    ]);

    SpreadsheetApp.flush();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ================================================================================
// 5. LIVE SHIPPING INTEGRATION ENDPOINTS (RajaOngkir + Biteship + Matrix)
// ================================================================================

/**
 * Searches shipping destinations across RajaOngkir Komerce or Biteship API with safe matrix fallback.
 */
function searchShippingDestination(query, destinationType, providerPref) {
  try {
    query = (query || '').trim();
    if (!query) {
      return { success: true, provider: 'NONE', destinations: [] };
    }

    destinationType = destinationType || 'domestic';
    providerPref = providerPref || 'AUTO';

    var settings = loadSettingsDictionary();
    var rajaKey = (settings['RAJAONGKIR_API_KEY'] || '').trim();
    var biteshipKey = (settings['BITESHIP_API_KEY'] || '').trim();
    var globalPref = settings['SHIPPING_PROVIDER'] || 'AUTO';

    if (providerPref === 'AUTO') {
      providerPref = globalPref;
    }

    var canUseRaja = (providerPref === 'RAJAONGKIR' || providerPref === 'AUTO') && rajaKey !== '';
    if (canUseRaja && typeof UrlFetchApp !== 'undefined') {
      try {
        var rajaUrl = destinationType === 'international'
          ? 'https://rajaongkir.komerce.id/api/v1/destination/international-destination?search=' + encodeURIComponent(query) + '&limit=10'
          : 'https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=' + encodeURIComponent(query) + '&limit=10';

        var resp = UrlFetchApp.fetch(rajaUrl, {
          method: 'get',
          headers: { 'key': rajaKey },
          muteHttpExceptions: true
        });

        if (resp.getResponseCode() === 200) {
          var json = JSON.parse(resp.getContentText());
          var items = json.data || [];
          var mapped = [];

          for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var label = it.label || (it.subdistrict_name ? (it.subdistrict_name + ', ' + it.city_name + ', ' + it.province_name) : (it.country_name || it.name));
            mapped.push({
              id: String(it.id || it.subdistrict_id || it.city_id || it.code),
              label: label,
              postalCode: it.zip_code || it.postal_code || '',
              countryCode: destinationType === 'international' ? (it.code || it.country_code || 'INTL') : 'ID',
              provider: 'RAJAONGKIR'
            });
          }

          if (mapped.length > 0) {
            return {
              success: true,
              provider: 'RAJAONGKIR',
              destinations: mapped
            };
          }
        }
      } catch (errRaja) {
        if (typeof Logger !== 'undefined') Logger.log('RajaOngkir search error: ' + errRaja.toString());
      }
    }

    var canUseBiteship = (providerPref === 'BITESHIP' || providerPref === 'AUTO') && biteshipKey !== '';
    if (canUseBiteship && typeof UrlFetchApp !== 'undefined') {
      try {
        var countryFilter = destinationType === 'international' ? 'ALL' : 'ID';
        var biteUrl = 'https://api.biteship.com/v1/maps/areas?countries=' + countryFilter + '&input=' + encodeURIComponent(query) + '&type=single';

        var respBite = UrlFetchApp.fetch(biteUrl, {
          method: 'get',
          headers: { 'Authorization': 'Bearer ' + biteshipKey },
          muteHttpExceptions: true
        });

        if (respBite.getResponseCode() === 200) {
          var jsonBite = JSON.parse(respBite.getContentText());
          var areas = jsonBite.areas || [];
          var mappedBite = [];

          for (var j = 0; j < areas.length; j++) {
            var ar = areas[j];
            mappedBite.push({
              id: String(ar.id),
              label: ar.name,
              postalCode: String(ar.postal_code || ''),
              countryCode: ar.country_code || (destinationType === 'international' ? 'INTL' : 'ID'),
              provider: 'BITESHIP'
            });
          }

          if (mappedBite.length > 0) {
            return {
              success: true,
              provider: 'BITESHIP',
              destinations: mappedBite
            };
          }
        }
      } catch (errBite) {
        if (typeof Logger !== 'undefined') Logger.log('Biteship search error: ' + errBite.toString());
      }
    }

    var matrixDestinations = [];
    if (destinationType === 'international') {
      var intlCatalog = [
        { id: 'SG', label: 'Singapura (Singapore)', postalCode: '048581', countryCode: 'SG' },
        { id: 'MY', label: 'Malaysia (Kuala Lumpur)', postalCode: '50088', countryCode: 'MY' },
        { id: 'AU', label: 'Australia (Sydney, NSW)', postalCode: '2000', countryCode: 'AU' },
        { id: 'JP', label: 'Jepang (Tokyo)', postalCode: '100-0001', countryCode: 'JP' },
        { id: 'US', label: 'Amerika Serikat (California / New York)', postalCode: '90001', countryCode: 'US' },
        { id: 'GB', label: 'Inggris Raya (London)', postalCode: 'EC1A 1BB', countryCode: 'GB' },
        { id: 'AE', label: 'Uni Emirat Arab (Dubai)', postalCode: '00000', countryCode: 'AE' },
        { id: 'DE', label: 'Jerman (Berlin)', postalCode: '10115', countryCode: 'DE' }
      ];

      for (var k = 0; k < intlCatalog.length; k++) {
        var itl = intlCatalog[k];
        if (itl.label.toLowerCase().indexOf(query.toLowerCase()) > -1 || itl.countryCode.toLowerCase().indexOf(query.toLowerCase()) > -1) {
          matrixDestinations.push({
            id: itl.id,
            label: itl.label,
            postalCode: itl.postalCode,
            countryCode: itl.countryCode,
            provider: 'MATRIX'
          });
        }
      }
    } else {
      var domCatalog = [
        { id: '17470', label: 'Jakarta Selatan, DKI Jakarta', postalCode: '12190', countryCode: 'ID' },
        { id: '17460', label: 'Jakarta Pusat, DKI Jakarta', postalCode: '10110', countryCode: 'ID' },
        { id: '17450', label: 'Jakarta Barat, DKI Jakarta', postalCode: '11470', countryCode: 'ID' },
        { id: '17480', label: 'Jakarta Timur, DKI Jakarta', postalCode: '13330', countryCode: 'ID' },
        { id: '17490', label: 'Jakarta Utara, DKI Jakarta', postalCode: '14240', countryCode: 'ID' },
        { id: '17500', label: 'Kota Bandung, Jawa Barat', postalCode: '40111', countryCode: 'ID' },
        { id: '17600', label: 'Kota Surabaya, Jawa Timur', postalCode: '60111', countryCode: 'ID' },
        { id: '17700', label: 'Kota Semarang, Jawa Tengah', postalCode: '50111', countryCode: 'ID' },
        { id: '17800', label: 'Kota Yogyakarta, DI Yogyakarta', postalCode: '55111', countryCode: 'ID' },
        { id: '17900', label: 'Kota Medan, Sumatera Utara', postalCode: '20111', countryCode: 'ID' },
        { id: '18000', label: 'Kota Denpasar, Bali', postalCode: '80111', countryCode: 'ID' },
        { id: '18100', label: 'Kota Makassar, Sulawesi Selatan', postalCode: '90111', countryCode: 'ID' },
        { id: '18200', label: 'Kota Palembang, Sumatera Selatan', postalCode: '30111', countryCode: 'ID' },
        { id: '18300', label: 'Kota Balikpapan, Kalimantan Timur', postalCode: '76111', countryCode: 'ID' }
      ];

      for (var d = 0; d < domCatalog.length; d++) {
        var ctd = domCatalog[d];
        if (ctd.label.toLowerCase().indexOf(query.toLowerCase()) > -1 || ctd.postalCode.indexOf(query) > -1) {
          matrixDestinations.push({
            id: ctd.id,
            label: ctd.label,
            postalCode: ctd.postalCode,
            countryCode: ctd.countryCode,
            provider: 'MATRIX'
          });
        }
      }
    }

    return {
      success: true,
      provider: 'MATRIX',
      destinations: matrixDestinations
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mencari destinasi pengiriman: ' + err.toString(),
      destinations: []
    };
  }
}

/**
 * Calculates live shipping rates using RajaOngkir, Biteship, or Matrix fallback.
 * Applies domestic Free Shipping threshold rules cleanly.
 */
function calculateLiveShippingRates(payload) {
  try {
    payload = payload || {};
    var destinationType = payload.destinationType || 'domestic';
    var destinationId = payload.destinationId || '';
    var destinationPostalCode = payload.destinationPostalCode || '';
    var countryCode = payload.countryCode || (destinationType === 'international' ? 'SG' : 'ID');
    var weightGram = Math.max(200, parseInt(payload.weightGram, 10) || 500);
    var subtotalIDR = parseFloat(payload.subtotalIDR) || 0;
    var providerPref = payload.providerPref || 'AUTO';
    var items = payload.items || [];

    var settings = loadSettingsDictionary();
    var rajaKey = (settings['RAJAONGKIR_API_KEY'] || '').trim();
    var biteshipKey = (settings['BITESHIP_API_KEY'] || '').trim();
    var globalPref = settings['SHIPPING_PROVIDER'] || 'AUTO';
    var freeThreshold = parseFloat(settings['FREE_SHIPPING_THRESHOLD_IDR']) || 500000;

    if (providerPref === 'AUTO') {
      providerPref = globalPref;
    }

    var isDomestic = destinationType !== 'international' && (countryCode === 'ID' || !countryCode);
    var isFreeShipping = isDomestic && (subtotalIDR >= freeThreshold);

    var canUseRaja = (providerPref === 'RAJAONGKIR' || providerPref === 'AUTO') && rajaKey !== '' && destinationId !== '';
    if (canUseRaja && typeof UrlFetchApp !== 'undefined') {
      try {
        var originId = settings['RAJAONGKIR_ORIGIN_ID'] || '17470';
        var couriers = isDomestic
          ? (settings['RAJAONGKIR_COURIERS_DOMESTIC'] || 'jne:sicepat:jnt:pos:tiki:anteraja')
          : (settings['RAJAONGKIR_COURIERS_INTL'] || 'pos:jne:tiki');

        var calcUrl = isDomestic
          ? 'https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost'
          : 'https://rajaongkir.komerce.id/api/v1/calculate/international-cost';

        var formBody = 'origin=' + encodeURIComponent(originId) +
          '&destination=' + encodeURIComponent(destinationId) +
          '&weight=' + encodeURIComponent(weightGram) +
          '&courier=' + encodeURIComponent(couriers);

        var resp = UrlFetchApp.fetch(calcUrl, {
          method: 'post',
          headers: {
            'key': rajaKey,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          payload: formBody,
          muteHttpExceptions: true
        });

        if (resp.getResponseCode() === 200) {
          var rajaData = JSON.parse(resp.getContentText());
          var rawList = rajaData.data || [];
          var rates = [];

          for (var i = 0; i < rawList.length; i++) {
            var courierGroup = rawList[i];
            var cCode = courierGroup.code || courierGroup.courier_code || 'COURIER';
            var cName = courierGroup.name || courierGroup.courier_name || cCode.toUpperCase();
            var costs = courierGroup.costs || [];

            for (var c = 0; c < costs.length; c++) {
              var sCost = costs[c];
              var service = sCost.service || sCost.service_name || 'Standard';
              var priceVal = 0;
              var etdVal = '-';

              if (sCost.cost && sCost.cost.length > 0) {
                priceVal = parseFloat(sCost.cost[0].value) || 0;
                etdVal = sCost.cost[0].etd ? (sCost.cost[0].etd + ' Hari') : '-';
              } else if (sCost.price) {
                priceVal = parseFloat(sCost.price) || 0;
                etdVal = sCost.etd ? (sCost.etd + ' Hari') : '-';
              }

              rates.push({
                id: 'ro_' + cCode + '_' + service.replace(/\s+/g, '_'),
                courierCode: cCode,
                courierName: cName,
                serviceName: service,
                etd: etdVal,
                costIDR: priceVal,
                effectiveCostIDR: isFreeShipping ? 0 : priceVal,
                isFreeShipping: isFreeShipping,
                provider: 'RAJAONGKIR'
              });
            }
          }

          if (rates.length > 0) {
            return {
              success: true,
              source: 'RAJAONGKIR',
              isFreeShipping: isFreeShipping,
              weightGram: weightGram,
              rates: rates
            };
          }
        }
      } catch (errRajaCalc) {
        if (typeof Logger !== 'undefined') Logger.log('RajaOngkir calc error: ' + errRajaCalc.toString());
      }
    }

    var canUseBiteship = (providerPref === 'BITESHIP' || providerPref === 'AUTO') && biteshipKey !== '';
    if (canUseBiteship && typeof UrlFetchApp !== 'undefined') {
      try {
        var biteOriginPostal = settings['BITESHIP_ORIGIN_POSTAL_CODE'] || '12190';
        var biteCouriers = settings['BITESHIP_COURIERS'] || 'jne,jnt,sicepat,paxel,anteraja,pos,dhl,tlx,rayspeed';

        var biteItems = [];
        if (items && items.length > 0) {
          for (var itm = 0; itm < items.length; itm++) {
            var it = items[itm];
            biteItems.push({
              name: it.name_en || it.name || 'Fashion Apparel',
              description: 'Apparel Garment',
              value: parseFloat(it.price) || 100000,
              quantity: parseInt(it.quantity, 10) || 1,
              weight: parseInt(it.weight_gram, 10) || 300
            });
          }
        } else {
          biteItems.push({
            name: 'Fashion Garment',
            description: 'Apparel Garment',
            value: subtotalIDR || 100000,
            quantity: 1,
            weight: weightGram
          });
        }

        var biteBody = {
          origin_postal_code: parseInt(biteOriginPostal, 10) || 12190,
          couriers: biteCouriers,
          items: biteItems
        };

        if (destinationPostalCode && destinationPostalCode.length >= 5) {
          biteBody.destination_postal_code = parseInt(destinationPostalCode, 10);
        } else if (destinationId && destinationId.length > 10) {
          biteBody.destination_area_id = destinationId;
        }

        var respBite = UrlFetchApp.fetch('https://api.biteship.com/v1/rates/couriers', {
          method: 'post',
          headers: {
            'Authorization': 'Bearer ' + biteshipKey,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify(biteBody),
          muteHttpExceptions: true
        });

        if (respBite.getResponseCode() === 200) {
          var biteJson = JSON.parse(respBite.getContentText());
          var pricing = biteJson.pricing || [];
          var bRates = [];

          for (var p = 0; p < pricing.length; p++) {
            var pr = pricing[p];
            var pPrice = parseFloat(pr.price) || 0;
            bRates.push({
              id: 'bs_' + pr.company + '_' + (pr.courier_service_code || pr.courier_service_name).replace(/\s+/g, '_'),
              courierCode: pr.company,
              courierName: pr.courier_name,
              serviceName: pr.courier_service_name,
              etd: pr.duration || '-',
              costIDR: pPrice,
              effectiveCostIDR: isFreeShipping ? 0 : pPrice,
              isFreeShipping: isFreeShipping,
              provider: 'BITESHIP'
            });
          }

          if (bRates.length > 0) {
            return {
              success: true,
              source: 'BITESHIP',
              isFreeShipping: isFreeShipping,
              weightGram: weightGram,
              rates: bRates
            };
          }
        }
      } catch (errBiteCalc) {
        if (typeof Logger !== 'undefined') Logger.log('Biteship calc error: ' + errBiteCalc.toString());
      }
    }

    var matrixRatesJson = settings['SHIPPING_RATES_JSON'] || '';
    var zoneMatrix = null;
    try {
      if (matrixRatesJson) zoneMatrix = JSON.parse(matrixRatesJson);
    } catch (e) {
      zoneMatrix = null;
    }

    if (!zoneMatrix || !zoneMatrix.zones) {
      zoneMatrix = {
        zones: {
          JABODETABEK: { flat: 15000, perKg: 10000 },
          JAWA_BALI: { flat: 25000, perKg: 15000 },
          LUAR_JAWA: { flat: 45000, perKg: 25000 },
          INTERNATIONAL_SEA: { flat: 150000, perKg: 80000 },
          INTERNATIONAL_GLOBAL: { flat: 350000, perKg: 200000 }
        }
      };
    }

    var weightKg = Math.max(1, Math.ceil(weightGram / 1000));
    var matrixRates = [];

    if (destinationType === 'international') {
      var isSea = ['SG', 'MY', 'TH', 'VN', 'PH'].indexOf(countryCode.toUpperCase()) > -1;
      var intlCfg = isSea ? zoneMatrix.zones.INTERNATIONAL_SEA : zoneMatrix.zones.INTERNATIONAL_GLOBAL;
      var baseIntlCost = (intlCfg.flat || 200000) + Math.max(0, weightKg - 1) * (intlCfg.perKg || 100000);

      matrixRates = [
        {
          id: 'mat_intl_ems',
          courierCode: 'POS_EMS',
          courierName: 'Pos Indonesia Express Mail Service (EMS)',
          serviceName: 'Express Air Mail',
          etd: isSea ? '3-5 Hari Kerja' : '5-8 Hari Kerja',
          costIDR: baseIntlCost,
          effectiveCostIDR: baseIntlCost,
          isFreeShipping: false,
          provider: 'MATRIX'
        },
        {
          id: 'mat_intl_aramex',
          courierCode: 'ARAMEX',
          courierName: 'Aramex International Priority',
          serviceName: 'Priority Express',
          etd: isSea ? '2-4 Hari Kerja' : '4-7 Hari Kerja',
          costIDR: baseIntlCost + 50000,
          effectiveCostIDR: baseIntlCost + 50000,
          isFreeShipping: false,
          provider: 'MATRIX'
        },
        {
          id: 'mat_intl_dhl',
          courierCode: 'DHL',
          courierName: 'DHL Express Worldwide',
          serviceName: 'Worldwide Express Air',
          etd: isSea ? '2-3 Hari Kerja' : '3-5 Hari Kerja',
          costIDR: baseIntlCost + 150000,
          effectiveCostIDR: baseIntlCost + 150000,
          isFreeShipping: false,
          provider: 'MATRIX'
        }
      ];
    } else {
      var domCfg = zoneMatrix.zones.JABODETABEK;
      if (destinationId === '18000' || destinationId === '17500' || destinationId === '17600' || destinationId === '17700' || destinationId === '17800') {
        domCfg = zoneMatrix.zones.JAWA_BALI;
      } else if (destinationId === '17900' || destinationId === '18100' || destinationId === '18200' || destinationId === '18300') {
        domCfg = zoneMatrix.zones.LUAR_JAWA;
      }

      var baseDomCost = (domCfg.flat || 15000) + Math.max(0, weightKg - 1) * (domCfg.perKg || 10000);

      matrixRates = [
        {
          id: 'mat_dom_jne_reg',
          courierCode: 'JNE',
          courierName: 'JNE Express',
          serviceName: 'Reguler (REG)',
          etd: '2-3 Hari Kerja',
          costIDR: baseDomCost,
          effectiveCostIDR: isFreeShipping ? 0 : baseDomCost,
          isFreeShipping: isFreeShipping,
          provider: 'MATRIX'
        },
        {
          id: 'mat_dom_sicepat_reg',
          courierCode: 'SICEPAT',
          courierName: 'SiCepat Ekspres',
          serviceName: 'SiUntung Reguler',
          etd: '2-3 Hari Kerja',
          costIDR: baseDomCost,
          effectiveCostIDR: isFreeShipping ? 0 : baseDomCost,
          isFreeShipping: isFreeShipping,
          provider: 'MATRIX'
        },
        {
          id: 'mat_dom_jnt_ez',
          courierCode: 'JNT',
          courierName: 'J&T Express',
          serviceName: 'EZ Reguler',
          etd: '2-3 Hari Kerja',
          costIDR: baseDomCost,
          effectiveCostIDR: isFreeShipping ? 0 : baseDomCost,
          isFreeShipping: isFreeShipping,
          provider: 'MATRIX'
        },
        {
          id: 'mat_dom_jne_yes',
          courierCode: 'JNE',
          courierName: 'JNE Express',
          serviceName: 'Yakin Esok Sampai (YES)',
          etd: '1 Hari Kerja (Next Day)',
          costIDR: baseDomCost + 15000,
          effectiveCostIDR: isFreeShipping ? 15000 : (baseDomCost + 15000),
          isFreeShipping: isFreeShipping,
          provider: 'MATRIX'
        },
        {
          id: 'mat_dom_store_pickup',
          courierCode: 'STORE',
          courierName: 'AryaStore Studio Pickup',
          serviceName: 'Ambil di Studio Langsung',
          etd: 'Jam Kerja Studio (10.00-20.00)',
          costIDR: 0,
          effectiveCostIDR: 0,
          isFreeShipping: true,
          provider: 'MATRIX'
        }
      ];
    }

    return {
      success: true,
      source: 'MATRIX',
      fallbackReason: 'Menggunakan perhitungan matriks zona internal toko.',
      isFreeShipping: isFreeShipping,
      weightGram: weightGram,
      rates: matrixRates
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal menghitung ongkir: ' + err.toString(),
      rates: []
    };
  }
}

/**
 * Tests live API connection to RajaOngkir Komerce or Biteship API.
 * Strictly requires Super Admin authorization.
 */
function testShippingProvider(provider, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin'])) {
      return { success: false, message: 'Otorisasi ditolak. Pengujian provider ekspedisi hanya untuk Super Admin.' };
    }

    provider = (provider || 'RAJAONGKIR').toUpperCase();
    var settings = loadSettingsDictionary();

    if (provider === 'RAJAONGKIR') {
      var rajaKey = (settings['RAJAONGKIR_API_KEY'] || '').trim();
      if (!rajaKey) {
        return {
          success: false,
          provider: 'RAJAONGKIR',
          message: 'RAJAONGKIR_API_KEY belum dikonfigurasi pada menu Pengaturan Toko.'
        };
      }

      if (typeof UrlFetchApp === 'undefined') {
        return {
          success: true,
          provider: 'RAJAONGKIR',
          statusCode: 200,
          latencyMs: 120,
          message: 'Koneksi RajaOngkir Komerce tervalidasi (Mode Simulasi).'
        };
      }

      var startRaja = new Date().getTime();
      var respRaja = UrlFetchApp.fetch('https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=Jakarta&limit=1', {
        headers: { 'key': rajaKey },
        muteHttpExceptions: true
      });
      var latencyRaja = new Date().getTime() - startRaja;
      var statusRaja = respRaja.getResponseCode();

      if (statusRaja === 200) {
        return {
          success: true,
          provider: 'RAJAONGKIR',
          statusCode: statusRaja,
          latencyMs: latencyRaja,
          message: 'Koneksi RajaOngkir Komerce v2 berhasil terhubung (' + latencyRaja + ' ms).'
        };
      } else {
        return {
          success: false,
          provider: 'RAJAONGKIR',
          statusCode: statusRaja,
          latencyMs: latencyRaja,
          message: 'HTTP ' + statusRaja + ': ' + respRaja.getContentText().substring(0, 150)
        };
      }
    } else if (provider === 'BITESHIP') {
      var biteshipKey = (settings['BITESHIP_API_KEY'] || '').trim();
      if (!biteshipKey) {
        return {
          success: false,
          provider: 'BITESHIP',
          message: 'BITESHIP_API_KEY belum dikonfigurasi pada menu Pengaturan Toko.'
        };
      }

      if (typeof UrlFetchApp === 'undefined') {
        return {
          success: true,
          provider: 'BITESHIP',
          statusCode: 200,
          latencyMs: 140,
          message: 'Koneksi Biteship API tervalidasi (Mode Simulasi).'
        };
      }

      var startBite = new Date().getTime();
      var respBite = UrlFetchApp.fetch('https://api.biteship.com/v1/maps/areas?countries=ID&input=Jakarta&type=single', {
        headers: { 'Authorization': 'Bearer ' + biteshipKey },
        muteHttpExceptions: true
      });
      var latencyBite = new Date().getTime() - startBite;
      var statusBite = respBite.getResponseCode();

      if (statusBite === 200) {
        return {
          success: true,
          provider: 'BITESHIP',
          statusCode: statusBite,
          latencyMs: latencyBite,
          message: 'Koneksi Biteship API v1 berhasil terhubung (' + latencyBite + ' ms).'
        };
      } else {
        return {
          success: false,
          provider: 'BITESHIP',
          statusCode: statusBite,
          latencyMs: latencyBite,
          message: 'HTTP ' + statusBite + ': ' + respBite.getContentText().substring(0, 150)
        };
      }
    }

    return {
      success: false,
      message: 'Provider pengiriman tidak dikenal: ' + provider
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal menguji provider ekspedisi: ' + err.toString()
    };
  }
}

// ================================================================================
// 6. RBAC & ADMIN DASHBOARD ENDPOINTS
// ================================================================================

/**
 * Authenticates admin operator using 4-digit PIN stored in Settings.
 */
function adminLogin(pin) {
  try {
    if (!pin) {
      return { success: false, message: 'PIN otentikasi wajib diisi' };
    }

    var cleanPin = String(pin).trim();
    var settings = loadSettingsDictionary();

    var pinSuperAdmin = settings['PIN_SUPER_ADMIN'] || '9999';
    var pinStoreManager = settings['PIN_STORE_MANAGER'] || '8888';
    var pinCustomerService = settings['PIN_CUSTOMER_SERVICE'] || '7777';

    var role = null;
    var permissions = [];

    if (cleanPin === pinSuperAdmin) {
      role = 'Super Admin';
      permissions = ['ALL'];
    } else if (cleanPin === pinStoreManager) {
      role = 'Store Manager';
      permissions = ['PRODUCTS', 'VARIANTS', 'ORDERS', 'CAMPAIGNS'];
    } else if (cleanPin === pinCustomerService) {
      role = 'Customer Service';
      permissions = ['ORDERS', 'RETURNS', 'CUSTOMERS'];
    }

    if (!role) {
      logAudit('System', 'Security', 'Percobaan login admin gagal dengan PIN tidak dikenal');
      return { success: false, message: 'PIN otentikasi salah. Akses ditolak.' };
    }

    logAudit(role, 'Auth', 'Login admin berhasil sebagai ' + role);

    return {
      success: true,
      role: role,
      permissions: permissions,
      message: 'Login berhasil sebagai ' + role
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal melakukan otentikasi: ' + err.toString()
    };
  }
}

function verifyRoleAuthorization(role, allowedRoles) {
  if (!role) return false;
  if (role === 'Super Admin') return true;
  for (var i = 0; i < allowedRoles.length; i++) {
    if (allowedRoles[i] === role) return true;
  }
  return false;
}

/**
 * Retrieves executive KPI summary metrics, recent orders, and status tallies.
 */
function getAdminDashboard() {
  try {
    var orderRows = getSheetDisplayRows(SHEET_NAMES.ORDERS);
    var customerRows = getSheetDisplayRows(SHEET_NAMES.CUSTOMERS);
    var variantRows = getSheetDisplayRows(SHEET_NAMES.VARIANTS);

    var totalRevenue = 0;
    var totalOrders = orderRows.length;
    var unitsSold = 0;
    var totalCustomers = customerRows.length;
    var lowStockCount = 0;

    var statusCounts = {
      'Menunggu Pembayaran': 0,
      'Bukti Diupload': 0,
      'Diproses': 0,
      'Dikirim': 0,
      'Selesai': 0,
      'Dibatalkan': 0
    };

    var recentOrders = [];

    for (var i = 0; i < orderRows.length; i++) {
      var row = orderRows[i];
      var status = row[COL_ORDERS.STATUS];
      var grandTotal = parseFloat(row[COL_ORDERS.GRAND_TOTAL]) || 0;

      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }

      if (status === 'Selesai' || status === 'Diproses' || status === 'Dikirim') {
        totalRevenue += grandTotal;
      }

      if (status === 'Selesai') {
        try {
          var items = JSON.parse(row[COL_ORDERS.ITEMS_JSON]);
          for (var it = 0; it < items.length; it++) {
            unitsSold += (parseInt(items[it].quantity, 10) || 1);
          }
        } catch (e) {}
      }

      if (recentOrders.length < 10) {
        recentOrders.push({
          invoice_no: row[COL_ORDERS.INVOICE_NO],
          created_at: row[COL_ORDERS.CREATED_AT],
          customer_name: row[COL_ORDERS.CUSTOMER_NAME],
          whatsapp_no: row[COL_ORDERS.WHATSAPP_NO],
          grand_total: grandTotal,
          status: status,
          payment_proof_url: row[COL_ORDERS.PAYMENT_PROOF_URL],
          shipping_zone: row[COL_ORDERS.SHIPPING_ZONE] || 'DOMESTIK',
          currency_code: row[COL_ORDERS.CURRENCY_CODE] || 'IDR'
        });
      }
    }

    for (var v = 0; v < variantRows.length; v++) {
      var stock = parseInt(variantRows[v][COL_VARIANTS.STOCK], 10) || 0;
      if (stock < 5) {
        lowStockCount++;
      }
    }

    return {
      success: true,
      kpis: {
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        unitsSold: unitsSold,
        totalCustomers: totalCustomers,
        lowStockCount: lowStockCount
      },
      statusCounts: statusCounts,
      recentOrders: recentOrders
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal memuat ringkasan KPI: ' + err.toString()
    };
  }
}

/**
 * Returns filtered and searched orders for Order Manager module.
 */
function getOrders(filters) {
  try {
    filters = filters || {};
    var status = filters.status || 'All';
    var search = (filters.search || '').trim().toLowerCase();
    var page = parseInt(filters.page, 10) || 1;
    var limit = parseInt(filters.limit, 10) || 20;

    var rows = getSheetDisplayRows(SHEET_NAMES.ORDERS);
    var filtered = [];

    for (var i = rows.length - 1; i >= 0; i--) {
      var row = rows[i];
      var rStatus = row[COL_ORDERS.STATUS];
      var rInv = row[COL_ORDERS.INVOICE_NO];
      var rCust = row[COL_ORDERS.CUSTOMER_NAME];
      var rPhone = row[COL_ORDERS.WHATSAPP_NO];

      if (status !== 'All' && status !== 'Semua' && rStatus.toLowerCase() !== status.toLowerCase()) {
        continue;
      }

      if (search) {
        var haystack = (rInv + ' ' + rCust + ' ' + rPhone).toLowerCase();
        if (haystack.indexOf(search) === -1) {
          continue;
        }
      }

      var items = [];
      try {
        items = JSON.parse(row[COL_ORDERS.ITEMS_JSON]);
      } catch (e) {}

      filtered.push({
        invoice_no: rInv,
        created_at: row[COL_ORDERS.CREATED_AT],
        customer_id: row[COL_ORDERS.CUSTOMER_ID],
        customer_name: rCust,
        whatsapp_no: rPhone,
        items: items,
        subtotal: parseFloat(row[COL_ORDERS.SUBTOTAL]) || 0,
        coupon_code: row[COL_ORDERS.COUPON_CODE],
        coupon_discount: parseFloat(row[COL_ORDERS.COUPON_DISCOUNT]) || 0,
        shipping_method: row[COL_ORDERS.SHIPPING_METHOD],
        shipping_cost: parseFloat(row[COL_ORDERS.SHIPPING_COST]) || 0,
        grand_total: parseFloat(row[COL_ORDERS.GRAND_TOTAL]) || 0,
        payment_proof_url: row[COL_ORDERS.PAYMENT_PROOF_URL],
        status: rStatus,
        shipping_zone: row[COL_ORDERS.SHIPPING_ZONE] || 'DOMESTIK',
        currency_code: row[COL_ORDERS.CURRENCY_CODE] || 'IDR',
        exchange_rate: parseFloat(row[COL_ORDERS.EXCHANGE_RATE]) || 1,
        utm_source: row[COL_ORDERS.UTM_SOURCE] || 'direct'
      });
    }

    var totalCount = filtered.length;
    var totalPages = Math.ceil(totalCount / limit) || 1;
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;

    var startIndex = (page - 1) * limit;
    var paged = filtered.slice(startIndex, startIndex + limit);

    return {
      success: true,
      orders: paged,
      totalCount: totalCount,
      page: page,
      totalPages: totalPages
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengambil data pesanan: ' + err.toString(),
      orders: [],
      totalCount: 0
    };
  }
}

/**
 * Updates order workflow status and/or manual shipping cost (ongkir).
 */
function updateOrderStatus(invoiceNo, newStatus, manualOngkir, notes, role) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager', 'Customer Service'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran Anda tidak diizinkan mengubah status pesanan.' };
    }

    if (!invoiceNo) {
      return { success: false, message: 'Nomor invoice wajib diisi' };
    }

    var cleanInv = String(invoiceNo).trim().toUpperCase();

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var ordersSheet = ss.getSheetByName(SHEET_NAMES.ORDERS);
    var variantsSheet = ss.getSheetByName(SHEET_NAMES.VARIANTS);
    var customersSheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);

    var lastRow = ordersSheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Data pesanan kosong' };

    var rows = ordersSheet.getRange(2, 1, lastRow - 1, ordersSheet.getLastColumn()).getDisplayValues();
    var targetRowIdx = -1;
    var orderData = null;

    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][COL_ORDERS.INVOICE_NO]).trim().toUpperCase() === cleanInv) {
        targetRowIdx = i + 2;
        orderData = rows[i];
        break;
      }
    }

    if (targetRowIdx === -1 || !orderData) {
      return { success: false, message: 'Pesanan ' + cleanInv + ' tidak ditemukan' };
    }

    var oldStatus = orderData[COL_ORDERS.STATUS];
    var subtotal = parseFloat(orderData[COL_ORDERS.SUBTOTAL]) || 0;
    var couponDiscount = parseFloat(orderData[COL_ORDERS.COUPON_DISCOUNT]) || 0;
    var currentOngkir = parseFloat(orderData[COL_ORDERS.SHIPPING_COST]) || 0;
    var grandTotal = parseFloat(orderData[COL_ORDERS.GRAND_TOTAL]) || 0;

    var hasOngkirUpdate = false;
    if (manualOngkir !== undefined && manualOngkir !== null && String(manualOngkir).trim() !== '') {
      var newOngkirVal = parseFloat(manualOngkir);
      if (!isNaN(newOngkirVal) && newOngkirVal >= 0) {
        currentOngkir = newOngkirVal;
        grandTotal = Math.max(0, subtotal - couponDiscount + currentOngkir);
        ordersSheet.getRange(targetRowIdx, COL_ORDERS.SHIPPING_COST + 1).setValue(currentOngkir);
        ordersSheet.getRange(targetRowIdx, COL_ORDERS.GRAND_TOTAL + 1).setValue(grandTotal);
        hasOngkirUpdate = true;
      }
    }

    var statusChanged = false;
    if (newStatus && newStatus !== oldStatus) {
      ordersSheet.getRange(targetRowIdx, COL_ORDERS.STATUS + 1).setValue(newStatus);
      statusChanged = true;

      if (newStatus === 'Selesai' && oldStatus !== 'Selesai') {
        var customerId = orderData[COL_ORDERS.CUSTOMER_ID];
        if (customersSheet && customerId) {
          var cLastRow = customersSheet.getLastRow();
          if (cLastRow > 1) {
            var cRows = customersSheet.getRange(2, 1, cLastRow - 1, customersSheet.getLastColumn()).getDisplayValues();
            for (var c = 0; c < cRows.length; c++) {
              if (cRows[c][COL_CUSTOMERS.CUSTOMER_ID] === customerId) {
                var cRowIdx = c + 2;
                var currentSpent = parseFloat(cRows[c][COL_CUSTOMERS.TOTAL_SPENT]) || 0;
                customersSheet.getRange(cRowIdx, COL_CUSTOMERS.TOTAL_SPENT + 1).setValue(currentSpent + grandTotal);
                break;
              }
            }
          }
        }
        logEvent('order_completed', { invoice_no: cleanInv, grand_total: grandTotal });
      }

      if (newStatus === 'Dibatalkan' && oldStatus !== 'Dibatalkan') {
        try {
          var items = JSON.parse(orderData[COL_ORDERS.ITEMS_JSON]);
          if (variantsSheet && Array.isArray(items)) {
            var vLastRow = variantsSheet.getLastRow();
            if (vLastRow > 1) {
              var vRows = variantsSheet.getRange(2, 1, vLastRow - 1, variantsSheet.getLastColumn()).getDisplayValues();
              for (var it = 0; it < items.length; it++) {
                var itSku = items[it].sku;
                var itQty = parseInt(items[it].quantity, 10) || 1;
                for (var v = 0; v < vRows.length; v++) {
                  if (vRows[v][COL_VARIANTS.SKU] === itSku) {
                    var vRowIdx = v + 2;
                    var curStk = parseInt(vRows[v][COL_VARIANTS.STOCK], 10) || 0;
                    variantsSheet.getRange(vRowIdx, COL_VARIANTS.STOCK + 1).setValue(curStk + itQty);
                    break;
                  }
                }
              }
            }
          }
        } catch (e) {}
      }
    }

    SpreadsheetApp.flush();

    var actionSummary = 'Pesanan ' + cleanInv + ' diperbarui: ';
    if (statusChanged) actionSummary += 'Status ' + oldStatus + ' -> ' + newStatus + '. ';
    if (hasOngkirUpdate) actionSummary += 'Ongkir diatur Rp ' + currentOngkir.toLocaleString('id-ID') + ' (Grand Total Rp ' + grandTotal.toLocaleString('id-ID') + '). ';

    logAudit(role || 'Admin', 'Orders', actionSummary);

    return {
      success: true,
      invoice_no: cleanInv,
      status: newStatus || oldStatus,
      shipping_cost: currentOngkir,
      grand_total: grandTotal,
      message: 'Pesanan ' + cleanInv + ' berhasil diperbarui'
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal memperbarui status pesanan: ' + err.toString()
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Creates a new fashion catalog product (full 13 columns v2.0 including color_images_json).
 */
function addProduct(productData, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran tidak berwenang menambah produk.' };
    }

    if (!productData || !productData.name || !productData.category) {
      return { success: false, message: 'Nama dan kategori produk wajib diisi' };
    }

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.PRODUCTS);
    if (!sheet) return { success: false, message: 'Sheet Products tidak ditemukan' };

    var lastRow = sheet.getLastRow();
    var nextSeq = Math.max(1, lastRow);
    var newId = 'PRD-' + ('000' + nextSeq).slice(-3);

    var timestamp = getTimestamp();
    var mpJson = typeof productData.marketplace_links === 'object'
      ? JSON.stringify(productData.marketplace_links)
      : (productData.marketplace_links_json || '{}');

    var colorImagesJson = typeof productData.color_images === 'object'
      ? JSON.stringify(productData.color_images)
      : (productData.color_images_json || '{}');

    sheet.appendRow([
      newId,
      productData.name,
      productData.category,
      parseFloat(productData.base_price) || 0,
      productData.badge || 'None',
      productData.description || '',
      productData.image_url || 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=800&q=80',
      timestamp,
      productData.name_en || productData.name,
      productData.description_en || productData.description || '',
      parseInt(productData.weight_gram, 10) || 300,
      mpJson,
      colorImagesJson
    ]);

    SpreadsheetApp.flush();
    logAudit(role, 'Products', 'Produk baru ditambahkan: ' + newId + ' (' + productData.name + ')');

    return {
      success: true,
      product_id: newId,
      message: 'Produk berhasil ditambahkan'
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal menambah produk: ' + err.toString()
    };
  }
}

/**
 * Modifies an existing fashion catalog product (supports v2.0 fields including color_images_json).
 */
function updateProduct(productData, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran tidak berwenang mengedit produk.' };
    }

    if (!productData || !productData.id) {
      return { success: false, message: 'ID produk wajib disertakan' };
    }

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.PRODUCTS);
    if (!sheet) return { success: false, message: 'Sheet Products tidak ditemukan' };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Katalog kosong' };

    var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
    var targetRowIdx = -1;

    for (var i = 0; i < rows.length; i++) {
      if (rows[i][COL_PRODUCTS.ID] === productData.id) {
        targetRowIdx = i + 2;
        break;
      }
    }

    if (targetRowIdx === -1) {
      return { success: false, message: 'Produk ' + productData.id + ' tidak ditemukan' };
    }

    if (productData.name !== undefined) sheet.getRange(targetRowIdx, COL_PRODUCTS.NAME + 1).setValue(productData.name);
    if (productData.category !== undefined) sheet.getRange(targetRowIdx, COL_PRODUCTS.CATEGORY + 1).setValue(productData.category);
    if (productData.base_price !== undefined) sheet.getRange(targetRowIdx, COL_PRODUCTS.BASE_PRICE + 1).setValue(parseFloat(productData.base_price) || 0);
    if (productData.badge !== undefined) sheet.getRange(targetRowIdx, COL_PRODUCTS.BADGE + 1).setValue(productData.badge);
    if (productData.description !== undefined) sheet.getRange(targetRowIdx, COL_PRODUCTS.DESCRIPTION + 1).setValue(productData.description);
    if (productData.image_url !== undefined) sheet.getRange(targetRowIdx, COL_PRODUCTS.IMAGE_URL + 1).setValue(productData.image_url);
    if (productData.name_en !== undefined) sheet.getRange(targetRowIdx, COL_PRODUCTS.NAME_EN + 1).setValue(productData.name_en);
    if (productData.description_en !== undefined) sheet.getRange(targetRowIdx, COL_PRODUCTS.DESCRIPTION_EN + 1).setValue(productData.description_en);
    if (productData.weight_gram !== undefined) sheet.getRange(targetRowIdx, COL_PRODUCTS.WEIGHT_GRAM + 1).setValue(parseInt(productData.weight_gram, 10) || 300);
    if (productData.marketplace_links !== undefined || productData.marketplace_links_json !== undefined) {
      var mpJson = typeof productData.marketplace_links === 'object'
        ? JSON.stringify(productData.marketplace_links)
        : (productData.marketplace_links_json || '{}');
      sheet.getRange(targetRowIdx, COL_PRODUCTS.MARKETPLACE_LINKS_JSON + 1).setValue(mpJson);
    }
    if (productData.color_images !== undefined || productData.color_images_json !== undefined) {
      var ciJson = typeof productData.color_images === 'object'
        ? JSON.stringify(productData.color_images)
        : (productData.color_images_json || '{}');
      sheet.getRange(targetRowIdx, COL_PRODUCTS.COLOR_IMAGES_JSON + 1).setValue(ciJson);
    }

    SpreadsheetApp.flush();
    logAudit(role, 'Products', 'Produk diperbarui: ' + productData.id);

    return {
      success: true,
      message: 'Produk ' + productData.id + ' berhasil diperbarui'
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengedit produk: ' + err.toString()
    };
  }
}

/**
 * Creates a new variant SKU record for a product (full 7 columns including image_url).
 */
function addVariant(variantData, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran tidak berwenang menambah varian.' };
    }

    if (!variantData || !variantData.product_id || !variantData.sku) {
      return { success: false, message: 'Product ID dan SKU varian wajib diisi' };
    }

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.VARIANTS);
    if (!sheet) return { success: false, message: 'Sheet ProductVariants tidak ditemukan' };

    var lastRow = sheet.getLastRow();
    var nextSeq = Math.max(1, lastRow);
    var newVariantId = 'VAR-' + ('0000' + nextSeq).slice(-4);

    sheet.appendRow([
      newVariantId,
      variantData.product_id,
      variantData.sku,
      variantData.color || 'Standar',
      variantData.size || 'M',
      parseInt(variantData.stock, 10) || 0,
      variantData.image_url || ''
    ]);

    SpreadsheetApp.flush();
    logAudit(role, 'ProductVariants', 'Varian baru ditambahkan: ' + newVariantId + ' (SKU: ' + variantData.sku + ')');

    return {
      success: true,
      variant_id: newVariantId,
      message: 'Varian berhasil ditambahkan'
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal menambah varian: ' + err.toString()
    };
  }
}

/**
 * Updates stock quantity, color, size, or image_url of an existing variant.
 */
function updateVariant(variantData, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran tidak berwenang mengedit varian.' };
    }

    if (!variantData || (!variantData.variant_id && !variantData.sku)) {
      return { success: false, message: 'ID Varian atau SKU wajib disertakan' };
    }

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.VARIANTS);
    if (!sheet) return { success: false, message: 'Sheet ProductVariants tidak ditemukan' };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Daftar varian kosong' };

    var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
    var targetRowIdx = -1;

    for (var i = 0; i < rows.length; i++) {
      if (
        (variantData.variant_id && rows[i][COL_VARIANTS.VARIANT_ID] === variantData.variant_id) ||
        (variantData.sku && rows[i][COL_VARIANTS.SKU] === variantData.sku)
      ) {
        targetRowIdx = i + 2;
        break;
      }
    }

    if (targetRowIdx === -1) {
      return { success: false, message: 'Varian SKU tidak ditemukan' };
    }

    if (variantData.color !== undefined) sheet.getRange(targetRowIdx, COL_VARIANTS.COLOR + 1).setValue(variantData.color);
    if (variantData.size !== undefined) sheet.getRange(targetRowIdx, COL_VARIANTS.SIZE + 1).setValue(variantData.size);
    if (variantData.stock !== undefined) sheet.getRange(targetRowIdx, COL_VARIANTS.STOCK + 1).setValue(parseInt(variantData.stock, 10) || 0);
    if (variantData.image_url !== undefined) sheet.getRange(targetRowIdx, COL_VARIANTS.IMAGE_URL + 1).setValue(variantData.image_url);

    SpreadsheetApp.flush();
    logAudit(role, 'ProductVariants', 'Varian SKU ' + (variantData.sku || variantData.variant_id) + ' diperbarui');

    return {
      success: true,
      message: 'Varian berhasil diperbarui'
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal mengedit varian: ' + err.toString()
    };
  }
}

/**
 * Returns all promo coupons.
 */
function getCoupons() {
  try {
    var rows = getSheetDisplayRows(SHEET_NAMES.COUPONS);
    var list = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      list.push({
        code: row[COL_COUPONS.CODE],
        discount_type: row[COL_COUPONS.DISCOUNT_TYPE],
        discount_value: parseFloat(row[COL_COUPONS.DISCOUNT_VALUE]) || 0,
        min_spend: parseFloat(row[COL_COUPONS.MIN_SPEND]) || 0,
        description: row[COL_COUPONS.DESCRIPTION],
        is_active: String(row[COL_COUPONS.IS_ACTIVE]).toUpperCase() === 'TRUE'
      });
    }

    return { success: true, coupons: list };
  } catch (err) {
    return { success: false, message: 'Gagal mengambil kupon: ' + err.toString(), coupons: [] };
  }
}

/**
 * Creates a new promotional coupon code.
 */
function addCoupon(couponData, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran tidak berwenang menambah kupon.' };
    }

    if (!couponData || !couponData.code) {
      return { success: false, message: 'Kode kupon wajib diisi' };
    }

    var cleanCode = String(couponData.code).trim().toUpperCase();

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.COUPONS);
    if (!sheet) return { success: false, message: 'Sheet Coupons tidak ditemukan' };

    var existingCodes = [];
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      existingCodes = sheet.getRange(2, COL_COUPONS.CODE + 1, lastRow - 1, 1).getDisplayValues().map(function(r) { return r[0].toUpperCase(); });
    }

    if (existingCodes.indexOf(cleanCode) > -1) {
      return { success: false, message: 'Kode kupon ' + cleanCode + ' sudah pernah dibuat' };
    }

    sheet.appendRow([
      cleanCode,
      couponData.discount_type || 'PERCENT',
      parseFloat(couponData.discount_value) || 0,
      parseFloat(couponData.min_spend) || 0,
      couponData.description || '',
      couponData.is_active === false ? 'FALSE' : 'TRUE'
    ]);

    SpreadsheetApp.flush();
    logAudit(role, 'Coupons', 'Kupon promo baru ditambahkan: ' + cleanCode);

    return { success: true, message: 'Kupon ' + cleanCode + ' berhasil ditambahkan' };
  } catch (err) {
    return { success: false, message: 'Gagal menambah kupon: ' + err.toString() };
  }
}

/**
 * Modifies an existing promotional coupon code.
 */
function updateCoupon(couponData, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran tidak berwenang mengedit kupon.' };
    }

    if (!couponData || !couponData.code) {
      return { success: false, message: 'Kode kupon wajib disertakan' };
    }

    var cleanCode = String(couponData.code).trim().toUpperCase();

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.COUPONS);
    if (!sheet) return { success: false, message: 'Sheet Coupons tidak ditemukan' };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Daftar kupon kosong' };

    var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
    var targetRowIdx = -1;

    for (var i = 0; i < rows.length; i++) {
      if (rows[i][COL_COUPONS.CODE].toUpperCase() === cleanCode) {
        targetRowIdx = i + 2;
        break;
      }
    }

    if (targetRowIdx === -1) {
      return { success: false, message: 'Kupon ' + cleanCode + ' tidak ditemukan' };
    }

    if (couponData.discount_type !== undefined) sheet.getRange(targetRowIdx, COL_COUPONS.DISCOUNT_TYPE + 1).setValue(couponData.discount_type);
    if (couponData.discount_value !== undefined) sheet.getRange(targetRowIdx, COL_COUPONS.DISCOUNT_VALUE + 1).setValue(parseFloat(couponData.discount_value) || 0);
    if (couponData.min_spend !== undefined) sheet.getRange(targetRowIdx, COL_COUPONS.MIN_SPEND + 1).setValue(parseFloat(couponData.min_spend) || 0);
    if (couponData.description !== undefined) sheet.getRange(targetRowIdx, COL_COUPONS.DESCRIPTION + 1).setValue(couponData.description);
    if (couponData.is_active !== undefined) sheet.getRange(targetRowIdx, COL_COUPONS.IS_ACTIVE + 1).setValue(couponData.is_active ? 'TRUE' : 'FALSE');

    SpreadsheetApp.flush();
    logAudit(role, 'Coupons', 'Kupon ' + cleanCode + ' diperbarui');

    return { success: true, message: 'Kupon ' + cleanCode + ' berhasil diperbarui' };
  } catch (err) {
    return { success: false, message: 'Gagal memperbarui kupon: ' + err.toString() };
  }
}

/**
 * Returns all registered customers in the Customer Directory.
 */
function getCustomers() {
  try {
    var rows = getSheetDisplayRows(SHEET_NAMES.CUSTOMERS);
    var list = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      list.push({
        customer_id: row[COL_CUSTOMERS.CUSTOMER_ID],
        name: row[COL_CUSTOMERS.NAME],
        whatsapp_no: row[COL_CUSTOMERS.WHATSAPP_NO],
        total_orders: parseInt(row[COL_CUSTOMERS.TOTAL_ORDERS], 10) || 0,
        total_spent: parseFloat(row[COL_CUSTOMERS.TOTAL_SPENT]) || 0,
        created_at: row[COL_CUSTOMERS.CREATED_AT],
        notes: row[COL_CUSTOMERS.NOTES]
      });
    }

    return { success: true, customers: list };
  } catch (err) {
    return { success: false, message: 'Gagal mengambil direktori pelanggan: ' + err.toString(), customers: [] };
  }
}

/**
 * Returns all campaigns and bundle sets (including inactive ones) for Admin management.
 */
function getCampaigns() {
  try {
    var rows = getSheetDisplayRows(SHEET_NAMES.CAMPAIGNS);
    var list = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var items = [];
      try {
        items = JSON.parse(row[COL_CAMPAIGNS.BUNDLE_ITEMS_JSON]);
      } catch (e) {}

      list.push({
        campaign_id: row[COL_CAMPAIGNS.CAMPAIGN_ID],
        banner_title: row[COL_CAMPAIGNS.BANNER_TITLE],
        banner_desc: row[COL_CAMPAIGNS.BANNER_DESC],
        ends_at: row[COL_CAMPAIGNS.ENDS_AT],
        is_active: String(row[COL_CAMPAIGNS.IS_ACTIVE]).toUpperCase() === 'TRUE',
        bundle_items: items,
        normal_price: parseFloat(row[COL_CAMPAIGNS.NORMAL_PRICE]) || 0,
        bundle_price: parseFloat(row[COL_CAMPAIGNS.BUNDLE_PRICE]) || 0
      });
    }

    return { success: true, campaigns: list };
  } catch (err) {
    return { success: false, message: 'Gagal mengambil kampanye: ' + err.toString(), campaigns: [] };
  }
}

/**
 * Creates a new flash sale banner or outfit bundle set.
 */
function addCampaign(campaignData, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran tidak berwenang menambah kampanye.' };
    }

    if (!campaignData || !campaignData.banner_title) {
      return { success: false, message: 'Judul kampanye wajib diisi' };
    }

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.CAMPAIGNS);
    if (!sheet) return { success: false, message: 'Sheet CampaignsAndBundles tidak ditemukan' };

    var lastRow = sheet.getLastRow();
    var nextSeq = Math.max(1, lastRow);
    var newId = 'CMP-' + ('000' + nextSeq).slice(-3);

    var itemsJson = typeof campaignData.bundle_items === 'string'
      ? campaignData.bundle_items
      : JSON.stringify(campaignData.bundle_items || []);

    sheet.appendRow([
      newId,
      campaignData.banner_title,
      campaignData.banner_desc || '',
      campaignData.ends_at || '2026-12-31 23:59:59',
      campaignData.is_active === false ? 'FALSE' : 'TRUE',
      itemsJson,
      parseFloat(campaignData.normal_price) || 0,
      parseFloat(campaignData.bundle_price) || 0
    ]);

    SpreadsheetApp.flush();
    logAudit(role, 'Campaigns', 'Kampanye bundling baru ditambahkan: ' + newId);

    return { success: true, campaign_id: newId, message: 'Kampanye berhasil dibuat' };
  } catch (err) {
    return { success: false, message: 'Gagal membuat kampanye: ' + err.toString() };
  }
}

/**
 * Modifies an existing flash sale banner or outfit bundle set.
 */
function updateCampaign(campaignData, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran tidak berwenang mengedit kampanye.' };
    }

    if (!campaignData || !campaignData.campaign_id) {
      return { success: false, message: 'ID kampanye wajib disertakan' };
    }

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.CAMPAIGNS);
    if (!sheet) return { success: false, message: 'Sheet CampaignsAndBundles tidak ditemukan' };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Daftar kampanye kosong' };

    var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
    var targetRowIdx = -1;

    for (var i = 0; i < rows.length; i++) {
      if (rows[i][COL_CAMPAIGNS.CAMPAIGN_ID] === campaignData.campaign_id) {
        targetRowIdx = i + 2;
        break;
      }
    }

    if (targetRowIdx === -1) {
      return { success: false, message: 'Kampanye ' + campaignData.campaign_id + ' tidak ditemukan' };
    }

    if (campaignData.banner_title !== undefined) sheet.getRange(targetRowIdx, COL_CAMPAIGNS.BANNER_TITLE + 1).setValue(campaignData.banner_title);
    if (campaignData.banner_desc !== undefined) sheet.getRange(targetRowIdx, COL_CAMPAIGNS.BANNER_DESC + 1).setValue(campaignData.banner_desc);
    if (campaignData.ends_at !== undefined) sheet.getRange(targetRowIdx, COL_CAMPAIGNS.ENDS_AT + 1).setValue(campaignData.ends_at);
    if (campaignData.is_active !== undefined) sheet.getRange(targetRowIdx, COL_CAMPAIGNS.IS_ACTIVE + 1).setValue(campaignData.is_active ? 'TRUE' : 'FALSE');
    if (campaignData.bundle_items !== undefined) {
      var itemsStr = typeof campaignData.bundle_items === 'string' ? campaignData.bundle_items : JSON.stringify(campaignData.bundle_items);
      sheet.getRange(targetRowIdx, COL_CAMPAIGNS.BUNDLE_ITEMS_JSON + 1).setValue(itemsStr);
    }
    if (campaignData.normal_price !== undefined) sheet.getRange(targetRowIdx, COL_CAMPAIGNS.NORMAL_PRICE + 1).setValue(parseFloat(campaignData.normal_price) || 0);
    if (campaignData.bundle_price !== undefined) sheet.getRange(targetRowIdx, COL_CAMPAIGNS.BUNDLE_PRICE + 1).setValue(parseFloat(campaignData.bundle_price) || 0);

    SpreadsheetApp.flush();
    logAudit(role, 'Campaigns', 'Kampanye ' + campaignData.campaign_id + ' diperbarui');

    return { success: true, message: 'Kampanye berhasil diperbarui' };
  } catch (err) {
    return { success: false, message: 'Gagal memperbarui kampanye: ' + err.toString() };
  }
}

/**
 * Returns all submitted size exchange and return requests.
 */
function getReturns() {
  try {
    var rows = getSheetDisplayRows(SHEET_NAMES.RETURNS);
    var list = [];

    for (var i = rows.length - 1; i >= 0; i--) {
      var row = rows[i];
      list.push({
        return_id: row[COL_RETURNS.RETURN_ID],
        invoice_no: row[COL_RETURNS.INVOICE_NO],
        customer_name: row[COL_RETURNS.CUSTOMER_NAME],
        reason: row[COL_RETURNS.REASON],
        requested_size: row[COL_RETURNS.REQUESTED_SIZE],
        status: row[COL_RETURNS.STATUS],
        admin_notes: row[COL_RETURNS.ADMIN_NOTES]
      });
    }

    return { success: true, returns: list };
  } catch (err) {
    return { success: false, message: 'Gagal mengambil daftar retur: ' + err.toString(), returns: [] };
  }
}

/**
 * Updates status and administrative decision notes for a return request.
 */
function updateReturn(returnId, newStatus, adminNotes, role) {
  try {
    if (!verifyRoleAuthorization(role, ['Super Admin', 'Store Manager', 'Customer Service'])) {
      return { success: false, message: 'Otorisasi ditolak. Peran tidak berwenang memperbarui retur.' };
    }

    if (!returnId) {
      return { success: false, message: 'ID Retur wajib disertakan' };
    }

    var cleanId = String(returnId).trim().toUpperCase();

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.RETURNS);
    if (!sheet) return { success: false, message: 'Sheet Returns tidak ditemukan' };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Daftar retur kosong' };

    var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
    var targetRowIdx = -1;

    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][COL_RETURNS.RETURN_ID]).trim().toUpperCase() === cleanId) {
        targetRowIdx = i + 2;
        break;
      }
    }

    if (targetRowIdx === -1) {
      return { success: false, message: 'Pengajuan retur ' + cleanId + ' tidak ditemukan' };
    }

    if (newStatus) sheet.getRange(targetRowIdx, COL_RETURNS.STATUS + 1).setValue(newStatus);
    if (adminNotes !== undefined) sheet.getRange(targetRowIdx, COL_RETURNS.ADMIN_NOTES + 1).setValue(adminNotes);

    SpreadsheetApp.flush();
    logAudit(role, 'Returns', 'Retur ' + cleanId + ' diubah ke status ' + newStatus + ' (' + (adminNotes || '') + ')');

    return { success: true, message: 'Status retur ' + cleanId + ' berhasil diperbarui' };
  } catch (err) {
    return { success: false, message: 'Gagal memperbarui retur: ' + err.toString() };
  }
}

/**
 * Returns latest 100 chronological audit log activities.
 */
function getAuditLogs() {
  try {
    var rows = getSheetDisplayRows(SHEET_NAMES.AUDIT_LOGS);
    var list = [];

    var startIdx = Math.max(0, rows.length - 100);
    for (var i = rows.length - 1; i >= startIdx; i--) {
      var row = rows[i];
      list.push({
        timestamp: row[COL_AUDIT_LOGS.TIMESTAMP],
        actor_role: row[COL_AUDIT_LOGS.ACTOR_ROLE],
        module: row[COL_AUDIT_LOGS.MODULE],
        action_detail: row[COL_AUDIT_LOGS.ACTION_DETAIL]
      });
    }

    return { success: true, logs: list };
  } catch (err) {
    return { success: false, message: 'Gagal mengambil audit log: ' + err.toString(), logs: [] };
  }
}

/**
 * Computes the 4-Stage Conversion Funnel and conversion ratios from EventLogs telemetry.
 */
function getConversionFunnel() {
  try {
    var rows = getSheetDisplayRows(SHEET_NAMES.EVENT_LOGS);

    var countViews = 0;
    var countCart = 0;
    var countCheckout = 0;
    var countPaid = 0;

    for (var i = 0; i < rows.length; i++) {
      var eventName = rows[i][COL_EVENT_LOGS.EVENT_NAME];
      if (eventName === 'product_view' || eventName === 'page_view') {
        countViews++;
      } else if (eventName === 'add_to_cart') {
        countCart++;
      } else if (eventName === 'wa_checkout') {
        countCheckout++;
      } else if (eventName === 'order_completed') {
        countPaid++;
      }
    }

    var orderRows = getSheetDisplayRows(SHEET_NAMES.ORDERS);
    if (countCheckout === 0 && orderRows.length > 0) {
      countCheckout = orderRows.length;
    }
    if (countPaid === 0) {
      for (var o = 0; o < orderRows.length; o++) {
        if (orderRows[o][COL_ORDERS.STATUS] === 'Selesai') {
          countPaid++;
        }
      }
    }

    var baseViews = Math.max(countViews, 1);
    var rateCart = Math.round((countCart / baseViews) * 100);
    var rateCheckout = countCart > 0 ? Math.round((countCheckout / countCart) * 100) : 0;
    var ratePaid = countCheckout > 0 ? Math.round((countPaid / countCheckout) * 100) : 0;
    var rateOverall = Math.round((countPaid / baseViews) * 100);

    return {
      success: true,
      stages: [
        { key: 'views', label: '1. Lihat Katalog / Produk', count: countViews, rate: 100 },
        { key: 'cart', label: '2. Tambah ke Keranjang', count: countCart, rate: rateCart },
        { key: 'checkout', label: '3. Checkout WhatsApp', count: countCheckout, rate: rateCheckout },
        { key: 'paid', label: '4. Pembayaran Selesai', count: countPaid, rate: ratePaid }
      ],
      conversionRates: {
        cartFromViews: rateCart,
        checkoutFromCart: rateCheckout,
        paidFromCheckout: ratePaid,
        overallConversion: rateOverall
      }
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal menghitung funnel konversi: ' + err.toString()
    };
  }
}

/**
 * Generates an RFC 4180-compliant CSV string of all order records including v2.0 fields.
 */
function exportOrdersCSV() {
  try {
    var rows = getSheetDisplayRows(SHEET_NAMES.ORDERS);
    var headers = [
      'No Invoice',
      'Tanggal',
      'ID Pelanggan',
      'Nama Pelanggan',
      'WhatsApp',
      'Subtotal',
      'Kode Kupon',
      'Diskon Kupon',
      'Metode Pengiriman',
      'Ongkos Kirim',
      'Grand Total',
      'Status Pesanan',
      'URL Bukti Bayar',
      'Zona Pengiriman',
      'Mata Uang',
      'Nilai Tukar',
      'UTM Source'
    ];

    var csvLines = [headers.join(',')];

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var fields = [
        r[COL_ORDERS.INVOICE_NO],
        r[COL_ORDERS.CREATED_AT],
        r[COL_ORDERS.CUSTOMER_ID],
        r[COL_ORDERS.CUSTOMER_NAME],
        r[COL_ORDERS.WHATSAPP_NO],
        r[COL_ORDERS.SUBTOTAL],
        r[COL_ORDERS.COUPON_CODE],
        r[COL_ORDERS.COUPON_DISCOUNT],
        r[COL_ORDERS.SHIPPING_METHOD],
        r[COL_ORDERS.SHIPPING_COST],
        r[COL_ORDERS.GRAND_TOTAL],
        r[COL_ORDERS.STATUS],
        r[COL_ORDERS.PAYMENT_PROOF_URL],
        r[COL_ORDERS.SHIPPING_ZONE] || 'DOMESTIK',
        r[COL_ORDERS.CURRENCY_CODE] || 'IDR',
        r[COL_ORDERS.EXCHANGE_RATE] || '1',
        r[COL_ORDERS.UTM_SOURCE] || 'direct'
      ];

      var escapedFields = fields.map(function(val) {
        var str = String(val || '');
        if (str.indexOf(',') > -1 || str.indexOf('"') > -1 || str.indexOf('\n') > -1) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });

      csvLines.push(escapedFields.join(','));
    }

    var csvContent = csvLines.join('\r\n');
    var filename = 'rekap_pesanan_aryastore_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss') + '.csv';

    return {
      success: true,
      csv: csvContent,
      filename: filename
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal membuat file ekspor CSV: ' + err.toString()
    };
  }
}

/**
 * Reads global system settings.
 * PIN credentials and private carrier API keys are exclusively returned to authenticated Super Admin callers.
 */
function getSettings(role) {
  try {
    var dict = loadSettingsDictionary();

    if (role !== 'Super Admin') {
      delete dict['PIN_SUPER_ADMIN'];
      delete dict['PIN_STORE_MANAGER'];
      delete dict['PIN_CUSTOMER_SERVICE'];
      delete dict['RAJAONGKIR_API_KEY'];
      delete dict['BITESHIP_API_KEY'];
      delete dict['DRIVE_FOLDER_NAME'];
      delete dict['DRIVE_PRODUCTS_FOLDER_NAME'];
    }

    var parsedShipping = [];
    if (dict['SHIPPING_METHODS']) {
      try {
        parsedShipping = JSON.parse(dict['SHIPPING_METHODS']);
      } catch (e) {
        parsedShipping = [
          { id: 'REG', name: 'Reguler (JNE/J&T)', note: 'Ongkir dihitung otomatis berdasarkan zona/kurir' },
          { id: 'EXP', name: 'Express (SiCepat/Paxel)', note: 'Ongkir dihitung otomatis berdasarkan zona/kurir' },
          { id: 'STORE', name: 'Ambil di Toko', note: 'Bebas biaya ongkos kirim' }
        ];
      }
    }

    return {
      success: true,
      settings: dict,
      shippingMethods: parsedShipping
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal memuat pengaturan: ' + err.toString(),
      settings: {}
    };
  }
}

/**
 * Updates global system configuration parameters. Strictly restricted to Super Admin.
 */
function updateSettings(newSettings, role) {
  try {
    if (role !== 'Super Admin') {
      return { success: false, message: 'Otorisasi ditolak. Hanya Super Admin yang berhak mengubah konfigurasi sistem.' };
    }

    if (!newSettings || typeof newSettings !== 'object') {
      return { success: false, message: 'Data konfigurasi baru kosong' };
    }

    var ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };
    var sheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
    if (!sheet) return { success: false, message: 'Sheet Settings tidak ditemukan' };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Sheet Settings kosong' };

    var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getDisplayValues();
    var keysToUpdate = Object.keys(newSettings);
    var updatedCount = 0;

    for (var k = 0; k < keysToUpdate.length; k++) {
      var key = keysToUpdate[k];
      var newVal = String(newSettings[key]);

      var foundIdx = -1;
      for (var r = 0; r < rows.length; r++) {
        if (rows[r][COL_SETTINGS.KEY] === key) {
          foundIdx = r + 2;
          break;
        }
      }

      if (foundIdx > 0) {
        sheet.getRange(foundIdx, COL_SETTINGS.VALUE + 1).setValue(newVal);
        updatedCount++;
      } else {
        sheet.appendRow([key, newVal, 'Parameter konfigurasi kustom']);
        updatedCount++;
      }
    }

    SpreadsheetApp.flush();
    logAudit('Super Admin', 'Settings', 'Konfigurasi sistem diperbarui (' + updatedCount + ' parameter)');

    return {
      success: true,
      updatedCount: updatedCount,
      message: 'Konfigurasi sistem berhasil disimpan'
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal memperbarui pengaturan: ' + err.toString()
    };
  }
}

// ================================================================================
// 7. EMBEDDED DATABASE SETUP & SAFE MIGRATION ENGINE (v2.0 Idempotent)
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

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow === 0 || lastCol === 0) {
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      sheet.getRange(1, 1, 1, schema.headers.length)
        .setFontWeight('bold')
        .setBackground('#F5F5F4')
        .setFontColor('#1C1917')
        .setHorizontalAlignment('left');
      sheet.setFrozenRows(1);
      migrationReport.push(sheetName + ': Lembar kerja dibuat dan header diinisialisasi.');
    } else {
      var existingHeaders = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
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

  var seedResult = seedDatabase();
  SpreadsheetApp.flush();
  logAudit('Super Admin', 'SYSTEM_MIGRATION', 'setupDatabase executed successfully. ' + migrationReport.join(' | '));

  return {
    success: true,
    timestamp: getTimestamp(),
    migrationReport: migrationReport,
    seedResult: seedResult
  };
}

/**
 * Seeds all 19 products, 73 variants, 2 bundles, coupons, and v2.0 Settings idempotently.
 */
function seedDatabase() {
  var ss = getSpreadsheet();
  if (!ss) return { success: false, message: 'Spreadsheet tidak dapat diakses' };

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

  // A. Settings v2.0 including RajaOngkir, Biteship, and Drive Product images
  var settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settingsSheet) {
    var existingKeys = getExistingColumnValues(settingsSheet, 0);

    var defaultSettings = [
      { key: 'BRAND_NAME', value: 'AryaStore', description: 'Nama resmi toko dan brand' },
      { key: 'WA_NUMBER', value: '6281234567890', description: 'Nomor WhatsApp resmi pemesanan' },
      { key: 'CURRENCY_PREFIX', value: 'Rp ', description: 'Format prefiks mata uang dasar' },
      { key: 'DEFAULT_LANGUAGE', value: 'id', description: 'Bahasa default antarmuka (id / en)' },
      { key: 'DEFAULT_CURRENCY', value: 'IDR', description: 'Mata uang default dasar' },
      { key: 'CURRENCY_AUTO_SYNC', value: 'TRUE', description: 'Sakelar sinkronisasi nilai tukar valas' },
      { key: 'CURRENCY_RATES_JSON', value: '{"IDR":1,"USD":0.000063,"EUR":0.000058,"SGD":0.000085,"MYR":0.00028,"JPY":0.0098,"GBP":0.000050,"AUD":0.000096}', description: 'Nilai tukar 8 valuta dunia' },
      { key: 'FREE_SHIPPING_THRESHOLD_IDR', value: '500000', description: 'Ambang gratis ongkir domestik (Rp 500.000)' },
      { key: 'SHIPPING_RATES_JSON', value: '{"zones":{"JABODETABEK":{"flat":15000,"perKg":10000},"JAWA_BALI":{"flat":25000,"perKg":15000},"LUAR_JAWA":{"flat":45000,"perKg":25000},"INTERNATIONAL_SEA":{"flat":150000,"perKg":80000},"INTERNATIONAL_GLOBAL":{"flat":350000,"perKg":200000}}}', description: 'Tarif ongkir zona dan berat' },
      { key: 'MARKETPLACE_LINKS_JSON', value: '{"shopee":"https://shopee.co.id/aryastore","tokopedia":"https://tokopedia.com/aryastore","tiktokshop":"https://tiktok.com/@aryastore"}', description: 'Tautan resmi e-commerce eksternal' },
      { key: 'SOCIAL_LINKS_JSON', value: '{"instagram":"https://instagram.com/aryastore.id","tiktok":"https://tiktok.com/@aryastore","facebook":"https://facebook.com/aryastore","youtube":"https://youtube.com/@aryastore","pinterest":"https://pinterest.com/aryastore","whatsapp":"https://wa.me/6281234567890"}', description: 'Tautan saluran media sosial' },
      { key: 'STORE_BASE_URL', value: 'https://sisigitadi.github.io/AryaStore', description: 'URL basis publikasi toko' },
      { key: 'SEO_TITLE', value: 'AryaStore - Modern Minimalist Fashion & Curated Apparel', description: 'Judul global SEO' },
      { key: 'SEO_DESCRIPTION', value: 'AryaStore menghadirkan koleksi busana minimalis kontemporer berkualitas tinggi dengan kurasi bahan premium, potongan presisi, dan pengiriman ke seluruh dunia.', description: 'Deskripsi global SEO' },
      { key: 'SEO_KEYWORDS', value: 'fashion minimalis, apparel indonesia, aryastore, baju pria wanita, jaket premium, outerwear, belanja baju online', description: 'Kata kunci global SEO' },
      { key: 'GA4_MEASUREMENT_ID', value: 'G-XXXXXXXXXX', description: 'ID Google Analytics 4' },
      { key: 'GOOGLE_ADS_ID', value: 'AW-XXXXXXXXXX', description: 'ID Google Ads Remarketing' },
      { key: 'GOOGLE_ADS_CONVERSION_LABEL', value: 'XXXXXXXXXXXXX', description: 'Label konversi Google Ads' },
      { key: 'GTM_ID', value: 'GTM-XXXXXXX', description: 'ID Wadah Google Tag Manager' },
      { key: 'META_PIXEL_ID', value: '123456789012345', description: 'ID Meta / Facebook Pixel' },
      { key: 'TIKTOK_PIXEL_ID', value: 'CXXXXXXXXXXXXXXXXX', description: 'ID TikTok Pixel' },
      { key: 'PIN_SUPER_ADMIN', value: '9999', description: 'PIN otorisasi Super Admin (RAHASIA)' },
      { key: 'PIN_STORE_MANAGER', value: '8888', description: 'PIN otorisasi Store Manager (RAHASIA)' },
      { key: 'PIN_CUSTOMER_SERVICE', value: '7777', description: 'PIN otorisasi Customer Service (RAHASIA)' },
      { key: 'DRIVE_FOLDER_NAME', value: 'ARYASTORE_PAYMENTS', description: 'Nama folder Google Drive bukti bayar' },
      { key: 'DRIVE_PRODUCTS_FOLDER_NAME', value: 'ARYASTORE_PRODUCTS', description: 'Nama folder Google Drive penampung foto produk & varian warna' },
      {
        key: 'SHIPPING_METHODS',
        value: JSON.stringify([
          { id: 'REG', name: 'Reguler (JNE/J&T)', note: 'Ongkir dihitung otomatis berdasarkan zona/kurir' },
          { id: 'EXP', name: 'Express (SiCepat/Paxel)', note: 'Ongkir dihitung otomatis berdasarkan zona/kurir' },
          { id: 'STORE', name: 'Ambil di Toko', note: 'Bebas biaya ongkos kirim' }
        ]),
        description: 'Daftar metode ekspedisi pengiriman bawaan'
      },
      { key: 'SHIPPING_PROVIDER', value: 'AUTO', description: 'Mode integrasi ongkir: AUTO, MATRIX, RAJAONGKIR, BITESHIP' },
      { key: 'RAJAONGKIR_API_KEY', value: '', description: 'Kunci API RajaOngkir Komerce v2 (RAHASIA)' },
      { key: 'RAJAONGKIR_ORIGIN_ID', value: '17470', description: 'ID Lokasi Asal Toko di RajaOngkir Komerce (default Jakarta Selatan)' },
      { key: 'RAJAONGKIR_COURIERS_DOMESTIC', value: 'jne:sicepat:jnt:pos:tiki:anteraja', description: 'Daftar kode kurir domestik RajaOngkir Komerce' },
      { key: 'RAJAONGKIR_COURIERS_INTL', value: 'pos:jne:tiki', description: 'Daftar kode kurir internasional RajaOngkir Komerce' },
      { key: 'BITESHIP_API_KEY', value: '', description: 'Kunci API Biteship v1 (RAHASIA)' },
      { key: 'BITESHIP_ORIGIN_POSTAL_CODE', value: '12190', description: 'Kode Pos Asal Toko untuk Biteship (default Jakarta Selatan 12190)' },
      { key: 'BITESHIP_COURIERS', value: 'jne,jnt,sicepat,paxel,anteraja,pos,dhl,tlx,rayspeed', description: 'Daftar kode kurir Biteship' }
    ];

    for (var s = 0; s < defaultSettings.length; s++) {
      var item = defaultSettings[s];
      if (existingKeys.indexOf(item.key) === -1) {
        settingsSheet.appendRow([item.key, item.value, item.description]);
        results.settingsAdded++;
      }
    }
  }

  // B. Products & Variants (19 Products, 73 Variants from catalog-v2.json)
  var productsSheet = ss.getSheetByName(SHEET_NAMES.PRODUCTS);
  var variantsSheet = ss.getSheetByName(SHEET_NAMES.VARIANTS);

  if (productsSheet && variantsSheet) {
    var existingProductIds = getExistingColumnValues(productsSheet, 0);
    var existingVariantIds = getExistingColumnValues(variantsSheet, 0);

    var canonicalProducts = [
  {
    "id": "PRD-001",
    "name": "Mantel Wol Terstruktur Atelier",
    "name_en": "Atelier Structured Wool Coat",
    "category": "Outerwear",
    "base_price": 1250000,
    "badge": "Best Seller",
    "description": "Mantel wol potongan terstruktur dengan kerah takik lebar, ikat pinggang senada, dan lapisan furing satin halus untuk kenyamanan maksimal.",
    "description_en": "Structured wool-blend coat tailored with wide notch lapels, a matching waist tie belt, and smooth satin lining for elevated layering.",
    "weight_gram": 920,
    "image_url": "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-01 10:00:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Mantel+Wol+Terstruktur+Atelier",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Mantel+Wol+Terstruktur+Atelier",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Mantel+Wol+Terstruktur+Atelier"
    },
    "variants": [
      {
        "variant_id": "VAR-0001",
        "product_id": "PRD-001",
        "sku": "COAT-CML-S",
        "color": "Camel Hangat",
        "color_en": "Warm Camel",
        "size": "S",
        "stock": 8
      },
      {
        "variant_id": "VAR-0002",
        "product_id": "PRD-001",
        "sku": "COAT-CML-M",
        "color": "Camel Hangat",
        "color_en": "Warm Camel",
        "size": "M",
        "stock": 14
      },
      {
        "variant_id": "VAR-0003",
        "product_id": "PRD-001",
        "sku": "COAT-CML-L",
        "color": "Camel Hangat",
        "color_en": "Warm Camel",
        "size": "L",
        "stock": 4
      },
      {
        "variant_id": "VAR-0004",
        "product_id": "PRD-001",
        "sku": "COAT-BLK-M",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "M",
        "stock": 9
      },
      {
        "variant_id": "VAR-0005",
        "product_id": "PRD-001",
        "sku": "COAT-BLK-XL",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "XL",
        "stock": 6
      }
    ],
    "color_images": {
      "Camel Hangat": "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=800&q=80",
      "Hitam Arang": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80"
    }
  },
  {
    "id": "PRD-002",
    "name": "Kemeja Linen Santai Minimalis",
    "name_en": "Minimalist Relaxed Linen Shirt",
    "category": "Tops",
    "base_price": 420000,
    "badge": "New Arrival",
    "description": "Kemeja lengan panjang dari serat linen alami yang sejuk dan bernapas. Dirancang berpotongan santai dengan kancing mutiara minimalis untuk iklim tropis.",
    "description_en": "Long-sleeve button-down crafted from breathable pure flax linen. Cut in a relaxed silhouette with understated pearl buttons suited for warm climates.",
    "weight_gram": 300,
    "image_url": "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-02 11:30:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Kemeja+Linen+Santai+Minimalis",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Kemeja+Linen+Santai+Minimalis",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Kemeja+Linen+Santai+Minimalis"
    },
    "variants": [
      {
        "variant_id": "VAR-0006",
        "product_id": "PRD-002",
        "sku": "LNSH-WHT-S",
        "color": "Putih Tulang",
        "color_en": "Bone White",
        "size": "S",
        "stock": 15
      },
      {
        "variant_id": "VAR-0007",
        "product_id": "PRD-002",
        "sku": "LNSH-WHT-M",
        "color": "Putih Tulang",
        "color_en": "Bone White",
        "size": "M",
        "stock": 22
      },
      {
        "variant_id": "VAR-0008",
        "product_id": "PRD-002",
        "sku": "LNSH-SKY-L",
        "color": "Biru Pucat",
        "color_en": "Pale Sky",
        "size": "L",
        "stock": 3
      },
      {
        "variant_id": "VAR-0009",
        "product_id": "PRD-002",
        "sku": "LNSH-SKY-XL",
        "color": "Biru Pucat",
        "color_en": "Pale Sky",
        "size": "XL",
        "stock": 11
      }
    ],
    "color_images": {
      "Putih Tulang": "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=800&q=80",
      "Biru Pucat": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"
    }
  },
  {
    "id": "PRD-003",
    "name": "Celana Lipit Wide-Leg Atelier",
    "name_en": "Pleated Wide-Leg Trousers",
    "category": "Bottoms",
    "base_price": 580000,
    "badge": "Best Seller",
    "description": "Celana panjang berlipit ganda dengan pinggang tinggi dan potongan wide-leg yang jatuh rapi. Menggunakan bahan katun-viscose bertekstur lembut.",
    "description_en": "High-waisted trousers with tailored front pleats and a fluid wide-leg drape. Woven from a soft cotton-viscose blend for clean daily movement.",
    "weight_gram": 460,
    "image_url": "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-03 14:00:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Celana+Lipit+Wide-Leg+Atelier",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Celana+Lipit+Wide-Leg+Atelier",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Celana+Lipit+Wide-Leg+Atelier"
    },
    "variants": [
      {
        "variant_id": "VAR-0010",
        "product_id": "PRD-003",
        "sku": "PLTD-SND-S",
        "color": "Pasir Krem",
        "color_en": "Sand Cream",
        "size": "S",
        "stock": 10
      },
      {
        "variant_id": "VAR-0011",
        "product_id": "PRD-003",
        "sku": "PLTD-SND-M",
        "color": "Pasir Krem",
        "color_en": "Sand Cream",
        "size": "M",
        "stock": 16
      },
      {
        "variant_id": "VAR-0012",
        "product_id": "PRD-003",
        "sku": "PLTD-BLK-L",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "L",
        "stock": 12
      },
      {
        "variant_id": "VAR-0013",
        "product_id": "PRD-003",
        "sku": "PLTD-BLK-XXL",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "XXL",
        "stock": 6
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-004",
    "name": "Sepatu Bot Kulit Heritage Minimalis",
    "name_en": "Minimalist Leather Heritage Boots",
    "category": "Footwear",
    "base_price": 1150000,
    "badge": "Limited Edition",
    "description": "Sepatu bot semata kaki dari kulit sapi asli full-grain dengan detail cap-toe klasik, lubang tali logam tahan karat, dan sol karet anti-selip.",
    "description_en": "Ankle-high service boots handcrafted from full-grain leather featuring classic cap-toe stitching, brushed metal eyelets, and a durable rubber outsole.",
    "weight_gram": 1120,
    "image_url": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-04 09:15:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Sepatu+Bot+Kulit+Heritage",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Sepatu+Bot+Kulit+Heritage",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Sepatu+Bot+Kulit+Heritage"
    },
    "variants": [
      {
        "variant_id": "VAR-0014",
        "product_id": "PRD-004",
        "sku": "BOOT-ESP-S",
        "color": "Cokelat Espresso",
        "color_en": "Espresso Brown",
        "size": "S",
        "stock": 4
      },
      {
        "variant_id": "VAR-0015",
        "product_id": "PRD-004",
        "sku": "BOOT-ESP-M",
        "color": "Cokelat Espresso",
        "color_en": "Espresso Brown",
        "size": "M",
        "stock": 8
      },
      {
        "variant_id": "VAR-0016",
        "product_id": "PRD-004",
        "sku": "BOOT-ESP-L",
        "color": "Cokelat Espresso",
        "color_en": "Espresso Brown",
        "size": "L",
        "stock": 7
      },
      {
        "variant_id": "VAR-0017",
        "product_id": "PRD-004",
        "sku": "BOOT-BLK-XL",
        "color": "Hitam Pekat",
        "color_en": "Matte Black",
        "size": "XL",
        "stock": 5
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-005",
    "name": "Kaos Katun Tebal Oversized",
    "name_en": "Heavyweight Cotton Oversized Tee",
    "category": "Tops",
    "base_price": 240000,
    "badge": "Best Seller",
    "description": "Kaos potongan oversized berbahan 100% katun combed 240 GSM dengan kerah rib tebal anti-melar. Jatuh rapi di tubuh dan nyaman dikenakan sepanjang hari.",
    "description_en": "Oversized crewneck tee knit from 240 GSM combed cotton with a dense ribbed neckline. Holds a clean architectural drape wash after wash.",
    "weight_gram": 250,
    "image_url": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-05 16:40:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Kaos+Katun+Tebal+Oversized",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Kaos+Katun+Tebal+Oversized",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Kaos+Katun+Tebal+Oversized"
    },
    "variants": [
      {
        "variant_id": "VAR-0018",
        "product_id": "PRD-005",
        "sku": "HTEE-WHT-XS",
        "color": "Putih Tulang",
        "color_en": "Bone White",
        "size": "XS",
        "stock": 14
      },
      {
        "variant_id": "VAR-0019",
        "product_id": "PRD-005",
        "sku": "HTEE-WHT-M",
        "color": "Putih Tulang",
        "color_en": "Bone White",
        "size": "M",
        "stock": 28
      },
      {
        "variant_id": "VAR-0020",
        "product_id": "PRD-005",
        "sku": "HTEE-BLK-L",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "L",
        "stock": 22
      },
      {
        "variant_id": "VAR-0021",
        "product_id": "PRD-005",
        "sku": "HTEE-BLK-3XL",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "3XL",
        "stock": 9
      },
      {
        "variant_id": "VAR-0022",
        "product_id": "PRD-005",
        "sku": "HTEE-WHT-5XL",
        "color": "Putih Tulang",
        "color_en": "Bone White",
        "size": "5XL",
        "stock": 3
      }
    ],
    "color_images": {
      "Putih Tulang": "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80",
      "Hitam Arang": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80"
    }
  },
  {
    "id": "PRD-006",
    "name": "Blazer Single-Breasted Terstruktur",
    "name_en": "Tailored Single-Breasted Blazer",
    "category": "Outerwear",
    "base_price": 980000,
    "badge": "New Arrival",
    "description": "Blazer formal dan smart-casual berpotongan presisi dengan bahu berstruktur, kerah takik bersih, serta furing bernapas untuk kenyamanan kerja maupun acara malam.",
    "description_en": "Precision-cut single-breasted blazer with structured shoulders, crisp notch lapels, and breathable lining built for modern office and evening wear.",
    "weight_gram": 780,
    "image_url": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-06 13:20:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Blazer+Single-Breasted+Terstruktur",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Blazer+Single-Breasted+Terstruktur",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Blazer+Single-Breasted+Terstruktur"
    },
    "variants": [
      {
        "variant_id": "VAR-0023",
        "product_id": "PRD-006",
        "sku": "BLZR-NVY-S",
        "color": "Biru Dongker",
        "color_en": "Midnight Navy",
        "size": "S",
        "stock": 7
      },
      {
        "variant_id": "VAR-0024",
        "product_id": "PRD-006",
        "sku": "BLZR-NVY-M",
        "color": "Biru Dongker",
        "color_en": "Midnight Navy",
        "size": "M",
        "stock": 13
      },
      {
        "variant_id": "VAR-0025",
        "product_id": "PRD-006",
        "sku": "BLZR-BLK-L",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "L",
        "stock": 10
      },
      {
        "variant_id": "VAR-0026",
        "product_id": "PRD-006",
        "sku": "BLZR-BLK-XL",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "XL",
        "stock": 6
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-007",
    "name": "Celana Jeans Selvedge Potongan Lurus",
    "name_en": "Raw Selvedge Straight Cut Jeans",
    "category": "Bottoms",
    "base_price": 650000,
    "badge": "Limited Edition",
    "description": "Celana denim tenun selvedge 14 oz dengan jahitan kontras kokoh dan potongan lurus klasik yang membentuk karakter warna alami seiring pemakaian.",
    "description_en": "14 oz selvedge denim crafted in a timeless straight-leg cut with durable contrast stitching designed to develop personal patina over time.",
    "weight_gram": 540,
    "image_url": "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-07 11:00:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Celana+Jeans+Selvedge+Lurus",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Celana+Jeans+Selvedge+Lurus",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Celana+Jeans+Selvedge+Lurus"
    },
    "variants": [
      {
        "variant_id": "VAR-0027",
        "product_id": "PRD-007",
        "sku": "SLVG-IND-S",
        "color": "Indigo Klasik",
        "color_en": "Classic Indigo",
        "size": "S",
        "stock": 10
      },
      {
        "variant_id": "VAR-0028",
        "product_id": "PRD-007",
        "sku": "SLVG-IND-M",
        "color": "Indigo Klasik",
        "color_en": "Classic Indigo",
        "size": "M",
        "stock": 18
      },
      {
        "variant_id": "VAR-0029",
        "product_id": "PRD-007",
        "sku": "SLVG-BLK-4XL",
        "color": "Hitam Pekat",
        "color_en": "Jet Black",
        "size": "4XL",
        "stock": 4
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-008",
    "name": "Tas Tote Kanvas Atelier",
    "name_en": "Canvas Atelier Weekender Tote",
    "category": "Accessories",
    "base_price": 350000,
    "badge": "Best Seller",
    "description": "Tas tote berstruktur kokoh dari kanvas katun tebal 16 oz dengan tali bahu anyaman lebar dan ruang luas untuk laptop 14 inci serta perlengkapan harian.",
    "description_en": "Structured everyday tote sewn from heavyweight 16 oz cotton canvas with wide webbing handles and ample room for a 14-inch laptop and essentials.",
    "weight_gram": 450,
    "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-08 15:30:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Tas+Tote+Kanvas+Atelier",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Tas+Tote+Kanvas+Atelier",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Tas+Tote+Kanvas+Atelier"
    },
    "variants": [
      {
        "variant_id": "VAR-0030",
        "product_id": "PRD-008",
        "sku": "TOTE-TAN-M",
        "color": "Cokelat Pasir",
        "color_en": "Sand Tan",
        "size": "M",
        "stock": 22
      },
      {
        "variant_id": "VAR-0031",
        "product_id": "PRD-008",
        "sku": "TOTE-ECR-M",
        "color": "Ecru Natural",
        "color_en": "Natural Ecru",
        "size": "M",
        "stock": 18
      },
      {
        "variant_id": "VAR-0032",
        "product_id": "PRD-008",
        "sku": "TOTE-BLK-L",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "L",
        "stock": 14
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-009",
    "name": "Kupluk Rajut Wol Merino",
    "name_en": "Merino Wool Ribbed Beanie",
    "category": "Accessories",
    "base_price": 180000,
    "badge": "None",
    "description": "Topi kupluk rajut rib dari campuran wol merino halus yang hangat tanpa rasa gatal. Lipatan ganda elastis menyesuaikan bentuk kepala secara nyaman.",
    "description_en": "Rib-knit cuffed beanie spun from soft merino wool blend for itch-free warmth. Flexible double-fold construction adapts comfortably to any fit.",
    "weight_gram": 180,
    "image_url": "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-09 08:45:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Kupluk+Rajut+Wol+Merino",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Kupluk+Rajut+Wol+Merino",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Kupluk+Rajut+Wol+Merino"
    },
    "variants": [
      {
        "variant_id": "VAR-0033",
        "product_id": "PRD-009",
        "sku": "BEAN-ESP-M",
        "color": "Cokelat Tua",
        "color_en": "Dark Espresso",
        "size": "M",
        "stock": 20
      },
      {
        "variant_id": "VAR-0034",
        "product_id": "PRD-009",
        "sku": "BEAN-OLV-M",
        "color": "Hijau Hutan",
        "color_en": "Forest Green",
        "size": "M",
        "stock": 16
      },
      {
        "variant_id": "VAR-0035",
        "product_id": "PRD-009",
        "sku": "BEAN-ROS-M",
        "color": "Mawar Redup",
        "color_en": "Dusty Rose",
        "size": "M",
        "stock": 12
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-010",
    "name": "Jaket Bomber Terracotta Atelier",
    "name_en": "Atelier Terracotta Bomber Jacket",
    "category": "Outerwear",
    "base_price": 720000,
    "badge": "New Arrival",
    "description": "Jaket bomber minimalis berwarna terracotta hangat berbahan twill nilon matte tahan angin, dilengkapi saku ritsleting lengan dan rib elastis rapi.",
    "description_en": "Minimalist zip-up bomber jacket in signature warm terracotta matte nylon twill, finished with a utility sleeve pocket and structured ribbed trims.",
    "weight_gram": 760,
    "image_url": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-10 10:15:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Jaket+Bomber+Terracotta+Atelier",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Jaket+Bomber+Terracotta+Atelier",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Jaket+Bomber+Terracotta+Atelier"
    },
    "variants": [
      {
        "variant_id": "VAR-0036",
        "product_id": "PRD-010",
        "sku": "BMBR-TER-S",
        "color": "Terracotta",
        "color_en": "Terracotta",
        "size": "S",
        "stock": 9
      },
      {
        "variant_id": "VAR-0037",
        "product_id": "PRD-010",
        "sku": "BMBR-TER-M",
        "color": "Terracotta",
        "color_en": "Terracotta",
        "size": "M",
        "stock": 15
      },
      {
        "variant_id": "VAR-0038",
        "product_id": "PRD-010",
        "sku": "BMBR-TER-L",
        "color": "Terracotta",
        "color_en": "Terracotta",
        "size": "L",
        "stock": 11
      },
      {
        "variant_id": "VAR-0039",
        "product_id": "PRD-010",
        "sku": "BMBR-BLK-XXL",
        "color": "Hitam Arang",
        "color_en": "Charcoal Black",
        "size": "XXL",
        "stock": 5
      }
    ],
    "color_images": {
      "Terracotta": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80",
      "Hitam Arang": "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80"
    }
  },
  {
    "id": "PRD-011",
    "name": "Jaket Denim Kerah Sherpa Studio",
    "name_en": "Studio Sherpa Collar Denim Jacket",
    "category": "Outerwear",
    "base_price": 790000,
    "badge": "Limited Edition",
    "description": "Jaket trucker denim katun tebal dengan aksen kerah sherpa krem lembut, saku dada berkancing logam, dan pencucian indigo muda bergaya kasual terkurasi.",
    "description_en": "Heavyweight cotton trucker denim jacket accented with a soft cream sherpa collar, chest flap pockets, and a clean light-indigo studio wash.",
    "weight_gram": 860,
    "image_url": "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-11 11:20:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Jaket+Denim+Kerah+Sherpa",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Jaket+Denim+Kerah+Sherpa",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Jaket+Denim+Kerah+Sherpa"
    },
    "variants": [
      {
        "variant_id": "VAR-0040",
        "product_id": "PRD-011",
        "sku": "DNJK-LTI-S",
        "color": "Indigo Muda",
        "color_en": "Light Indigo",
        "size": "S",
        "stock": 6
      },
      {
        "variant_id": "VAR-0041",
        "product_id": "PRD-011",
        "sku": "DNJK-LTI-M",
        "color": "Indigo Muda",
        "color_en": "Light Indigo",
        "size": "M",
        "stock": 12
      },
      {
        "variant_id": "VAR-0042",
        "product_id": "PRD-011",
        "sku": "DNJK-LTI-L",
        "color": "Indigo Muda",
        "color_en": "Light Indigo",
        "size": "L",
        "stock": 10
      },
      {
        "variant_id": "VAR-0043",
        "product_id": "PRD-011",
        "sku": "DNJK-IND-XL",
        "color": "Indigo Gelap",
        "color_en": "Dark Indigo",
        "size": "XL",
        "stock": 4
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-012",
    "name": "Sweater Turtleneck Rajut Merino",
    "name_en": "Merino Ribbed Turtleneck Sweater",
    "category": "Tops",
    "base_price": 640000,
    "badge": "Best Seller",
    "description": "Sweater kerah tinggi (turtleneck) rajut rib rapat berbahan wol merino lembut. Memberikan kehangatan seimbang dan profil ramping untuk layering di bawah blazer atau mantel.",
    "description_en": "Fine-ribbed turtleneck sweater knitted from soft merino wool. Delivers balanced warmth and a clean silhouette made for layering under coats or blazers.",
    "weight_gram": 420,
    "image_url": "https://images.unsplash.com/photo-1623183949963-0557c9532763?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-12 09:50:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Sweater+Turtleneck+Rajut+Merino",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Sweater+Turtleneck+Rajut+Merino",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Sweater+Turtleneck+Rajut+Merino"
    },
    "variants": [
      {
        "variant_id": "VAR-0044",
        "product_id": "PRD-012",
        "sku": "TRTL-BLK-XS",
        "color": "Hitam Pekat",
        "color_en": "Jet Black",
        "size": "XS",
        "stock": 7
      },
      {
        "variant_id": "VAR-0045",
        "product_id": "PRD-012",
        "sku": "TRTL-BLK-S",
        "color": "Hitam Pekat",
        "color_en": "Jet Black",
        "size": "S",
        "stock": 13
      },
      {
        "variant_id": "VAR-0046",
        "product_id": "PRD-012",
        "sku": "TRTL-BLK-M",
        "color": "Hitam Pekat",
        "color_en": "Jet Black",
        "size": "M",
        "stock": 17
      },
      {
        "variant_id": "VAR-0047",
        "product_id": "PRD-012",
        "sku": "TRTL-OAT-L",
        "color": "Oatmeal",
        "color_en": "Warm Oatmeal",
        "size": "L",
        "stock": 9
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-013",
    "name": "Pullover Crewneck Katun Atelier",
    "name_en": "Atelier Cotton Crewneck Pullover",
    "category": "Tops",
    "base_price": 480000,
    "badge": "None",
    "description": "Sweatshirt crewneck polos berbahan katun French terry 340 GSM dengan jahitan bahu santai serta rib elastis pada kerah, manset, dan pinggang.",
    "description_en": "Clean unbranded crewneck pullover cut from 340 GSM cotton French terry, featuring relaxed shoulders and structured ribbed cuffs and hem.",
    "weight_gram": 410,
    "image_url": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-13 13:10:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Pullover+Crewneck+Katun+Atelier",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Pullover+Crewneck+Katun+Atelier",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Pullover+Crewneck+Katun+Atelier"
    },
    "variants": [
      {
        "variant_id": "VAR-0048",
        "product_id": "PRD-013",
        "sku": "CRWN-WHT-S",
        "color": "Putih Bersih",
        "color_en": "Pure White",
        "size": "S",
        "stock": 14
      },
      {
        "variant_id": "VAR-0049",
        "product_id": "PRD-013",
        "sku": "CRWN-WHT-M",
        "color": "Putih Bersih",
        "color_en": "Pure White",
        "size": "M",
        "stock": 20
      },
      {
        "variant_id": "VAR-0050",
        "product_id": "PRD-013",
        "sku": "CRWN-GRY-L",
        "color": "Abu Batu",
        "color_en": "Stone Grey",
        "size": "L",
        "stock": 15
      },
      {
        "variant_id": "VAR-0051",
        "product_id": "PRD-013",
        "sku": "CRWN-GRY-3XL",
        "color": "Abu Batu",
        "color_en": "Stone Grey",
        "size": "3XL",
        "stock": 6
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-014",
    "name": "Celana Twill 5-Pocket Minimalis",
    "name_en": "Minimalist 5-Pocket Twill Pants",
    "category": "Bottoms",
    "base_price": 490000,
    "badge": "New Arrival",
    "description": "Celana panjang 5-pocket berbahan katun twill tenun padat dengan paku keling tembaga halus dan potongan lurus ramping untuk gaya smart-casual.",
    "description_en": "Five-pocket straight pants tailored from dense cotton twill with understated copper rivets for a versatile smart-casual staple.",
    "weight_gram": 450,
    "image_url": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-14 10:00:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Celana+Twill+5-Pocket+Minimalis",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Celana+Twill+5-Pocket+Minimalis",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Celana+Twill+5-Pocket+Minimalis"
    },
    "variants": [
      {
        "variant_id": "VAR-0052",
        "product_id": "PRD-014",
        "sku": "TWLL-SLT-S",
        "color": "Biru Slate",
        "color_en": "Slate Navy",
        "size": "S",
        "stock": 11
      },
      {
        "variant_id": "VAR-0053",
        "product_id": "PRD-014",
        "sku": "TWLL-SLT-M",
        "color": "Biru Slate",
        "color_en": "Slate Navy",
        "size": "M",
        "stock": 19
      },
      {
        "variant_id": "VAR-0054",
        "product_id": "PRD-014",
        "sku": "TWLL-SLT-L",
        "color": "Biru Slate",
        "color_en": "Slate Navy",
        "size": "L",
        "stock": 14
      },
      {
        "variant_id": "VAR-0055",
        "product_id": "PRD-014",
        "sku": "TWLL-KHK-XL",
        "color": "Khaki Batu",
        "color_en": "Stone Khaki",
        "size": "XL",
        "stock": 8
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-015",
    "name": "Celana Utility Tapered Santai",
    "name_en": "Relaxed Utility Tapered Trousers",
    "category": "Bottoms",
    "base_price": 440000,
    "badge": "None",
    "description": "Celana potongan tapered dengan pinggang dan pergelangan elastis, dilengkapi saku tempel depan bergaya utility dari kain katun-linen ringan yang nyaman.",
    "description_en": "Tapered relaxed trousers with an elasticized waistband, ankle cuffs, and front flap utility pockets sewn in lightweight cotton-linen.",
    "weight_gram": 420,
    "image_url": "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-15 14:25:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Celana+Utility+Tapered+Santai",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Celana+Utility+Tapered+Santai",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Celana+Utility+Tapered+Santai"
    },
    "variants": [
      {
        "variant_id": "VAR-0056",
        "product_id": "PRD-015",
        "sku": "UTLP-CLY-XS",
        "color": "Tanah Liat",
        "color_en": "Soft Clay",
        "size": "XS",
        "stock": 8
      },
      {
        "variant_id": "VAR-0057",
        "product_id": "PRD-015",
        "sku": "UTLP-CLY-S",
        "color": "Tanah Liat",
        "color_en": "Soft Clay",
        "size": "S",
        "stock": 14
      },
      {
        "variant_id": "VAR-0058",
        "product_id": "PRD-015",
        "sku": "UTLP-CLY-M",
        "color": "Tanah Liat",
        "color_en": "Soft Clay",
        "size": "M",
        "stock": 16
      },
      {
        "variant_id": "VAR-0059",
        "product_id": "PRD-015",
        "sku": "UTLP-OLV-L",
        "color": "Zaitun",
        "color_en": "Muted Olive",
        "size": "L",
        "stock": 10
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-016",
    "name": "Sepatu Derby Kulit Full-Grain",
    "name_en": "Full-Grain Leather Derby Shoes",
    "category": "Footwear",
    "base_price": 950000,
    "badge": "Best Seller",
    "description": "Sepatu derby kulit sapi full-grain berwarna cokelat cognac dengan panel tekstur mikro yang halus, jahitan rapi, dan bantalan insole empuk untuk kenyamanan formal.",
    "description_en": "Cognac full-grain leather derby shoes detailed with fine micro-textured vamp panels, clean tonal stitching, and a cushioned insole for all-day formal wear.",
    "weight_gram": 1050,
    "image_url": "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-16 09:30:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Sepatu+Derby+Kulit+Full-Grain",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Sepatu+Derby+Kulit+Full-Grain",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Sepatu+Derby+Kulit+Full-Grain"
    },
    "variants": [
      {
        "variant_id": "VAR-0060",
        "product_id": "PRD-016",
        "sku": "DRBY-COG-S",
        "color": "Cokelat Cognac",
        "color_en": "Cognac Brown",
        "size": "S",
        "stock": 7
      },
      {
        "variant_id": "VAR-0061",
        "product_id": "PRD-016",
        "sku": "DRBY-COG-M",
        "color": "Cokelat Cognac",
        "color_en": "Cognac Brown",
        "size": "M",
        "stock": 12
      },
      {
        "variant_id": "VAR-0062",
        "product_id": "PRD-016",
        "sku": "DRBY-COG-L",
        "color": "Cokelat Cognac",
        "color_en": "Cognac Brown",
        "size": "L",
        "stock": 10
      },
      {
        "variant_id": "VAR-0063",
        "product_id": "PRD-016",
        "sku": "DRBY-BLK-XL",
        "color": "Hitam Pekat",
        "color_en": "Matte Black",
        "size": "XL",
        "stock": 6
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-017",
    "name": "Sneakers Kanvas Low-Top Minimalis",
    "name_en": "Minimalist Low-Top Canvas Sneakers",
    "category": "Footwear",
    "base_price": 590000,
    "badge": "New Arrival",
    "description": "Sepatu sneakers low-top putih bersih tanpa logo berlebihan, terbuat dari kanvas katun tenun rapat dengan sol karet vulkanisir fleksibel untuk padanan kasual.",
    "description_en": "Clean unbranded white low-top sneakers constructed from tightly woven cotton canvas on a flexible vulcanized rubber sole for daily casual pairing.",
    "weight_gram": 950,
    "image_url": "https://images.unsplash.com/photo-1499321889027-736489e2f5a5?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-17 11:45:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Sneakers+Kanvas+Low-Top+Minimalis",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Sneakers+Kanvas+Low-Top+Minimalis",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Sneakers+Kanvas+Low-Top+Minimalis"
    },
    "variants": [
      {
        "variant_id": "VAR-0064",
        "product_id": "PRD-017",
        "sku": "SNKR-WHT-S",
        "color": "Putih Bersih",
        "color_en": "Pure White",
        "size": "S",
        "stock": 11
      },
      {
        "variant_id": "VAR-0065",
        "product_id": "PRD-017",
        "sku": "SNKR-WHT-M",
        "color": "Putih Bersih",
        "color_en": "Pure White",
        "size": "M",
        "stock": 18
      },
      {
        "variant_id": "VAR-0066",
        "product_id": "PRD-017",
        "sku": "SNKR-WHT-L",
        "color": "Putih Bersih",
        "color_en": "Pure White",
        "size": "L",
        "stock": 14
      },
      {
        "variant_id": "VAR-0067",
        "product_id": "PRD-017",
        "sku": "SNKR-ECR-XL",
        "color": "Putih Tulang",
        "color_en": "Off White",
        "size": "XL",
        "stock": 9
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-018",
    "name": "Kacamata Hitam Bingkai Tipis Atelier",
    "name_en": "Atelier Minimalist Round Sunglasses",
    "category": "Accessories",
    "base_price": 320000,
    "badge": "New Arrival",
    "description": "Kacamata hitam berbingkai logam bulat tipis warna emas lembut dengan lensa UV400 hijau arang anti-silau. Ringan dan dilengkapi sarung pelindung kanvas.",
    "description_en": "Slim gold-wire round sunglasses fitted with anti-glare dark slate-green UV400 lenses. Featherweight balance complete with a protective canvas sleeve.",
    "weight_gram": 190,
    "image_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-18 15:00:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Kacamata+Hitam+Bingkai+Tipis",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Kacamata+Hitam+Bingkai+Tipis",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Kacamata+Hitam+Bingkai+Tipis"
    },
    "variants": [
      {
        "variant_id": "VAR-0068",
        "product_id": "PRD-018",
        "sku": "SUNG-GLD-M",
        "color": "Emas Matte",
        "color_en": "Matte Gold",
        "size": "M",
        "stock": 16
      },
      {
        "variant_id": "VAR-0069",
        "product_id": "PRD-018",
        "sku": "SUNG-SLV-M",
        "color": "Perak Sikat",
        "color_en": "Brushed Silver",
        "size": "M",
        "stock": 12
      },
      {
        "variant_id": "VAR-0070",
        "product_id": "PRD-018",
        "sku": "SUNG-BLK-M",
        "color": "Hitam Matte",
        "color_en": "Matte Black",
        "size": "M",
        "stock": 14
      }
    ],
    "color_images": {}
  },
  {
    "id": "PRD-019",
    "name": "Topi Twill Katun Minimalis",
    "name_en": "Structured Cotton Twill Cap",
    "category": "Accessories",
    "base_price": 210000,
    "badge": "None",
    "description": "Topi 6-panel berbahan katun twill washed berwarna abu arang dengan visor melengkung klasik dan pengait gesper belakang yang mudah disesuaikan.",
    "description_en": "Six-panel baseball cap crafted from garment-washed charcoal cotton twill with a pre-curved brim and adjustable back strap clasp.",
    "weight_gram": 185,
    "image_url": "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=800&q=80",
    "created_at": "2026-11-19 16:20:00",
    "marketplace_links": {
      "shopee": "https://shopee.co.id/search?keyword=AryaStore+Topi+Twill+Katun+Minimalis",
      "tokopedia": "https://www.tokopedia.com/search?st=product&q=AryaStore+Topi+Twill+Katun+Minimalis",
      "tiktokshop": "https://www.tiktok.com/search?q=AryaStore+Topi+Twill+Katun+Minimalis"
    },
    "variants": [
      {
        "variant_id": "VAR-0071",
        "product_id": "PRD-019",
        "sku": "CAP-CHR-M",
        "color": "Abu Arang",
        "color_en": "Washed Charcoal",
        "size": "M",
        "stock": 21
      },
      {
        "variant_id": "VAR-0072",
        "product_id": "PRD-019",
        "sku": "CAP-SND-M",
        "color": "Pasir Krem",
        "color_en": "Sand Cream",
        "size": "M",
        "stock": 17
      },
      {
        "variant_id": "VAR-0073",
        "product_id": "PRD-019",
        "sku": "CAP-BLK-L",
        "color": "Hitam Pekat",
        "color_en": "Jet Black",
        "size": "L",
        "stock": 15
      }
    ],
    "color_images": {}
  }
];

    for (var p = 0; p < canonicalProducts.length; p++) {
      var prod = canonicalProducts[p];
      if (existingProductIds.indexOf(prod.id) === -1) {
        productsSheet.appendRow([
          prod.id,
          prod.name,
          prod.category,
          prod.base_price,
          prod.badge,
          prod.description,
          prod.image_url,
          prod.created_at || now,
          prod.name_en || prod.name,
          prod.description_en || prod.description,
          prod.weight_gram || 300,
          JSON.stringify(prod.marketplace_links || {}),
          JSON.stringify(prod.color_images || {})
        ]);
        results.productsAdded++;
      }

      for (var v = 0; v < prod.variants.length; v++) {
        var vData = prod.variants[v];
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
  }

  // C. Bundles (2 Verified Bundles from catalog-v2.json)
  var campaignSheet = ss.getSheetByName(SHEET_NAMES.CAMPAIGNS);
  if (campaignSheet) {
    var existingCampaignIds = getExistingColumnValues(campaignSheet, 0);
    var canonicalBundles = [
  {
    "campaign_id": "BND-001",
    "banner_title": "Atelier Monochrome Set (Mantel Wol + Celana Lipit)",
    "title_en": "Atelier Monochrome Set (Wool Coat + Pleated Trousers)",
    "banner_desc": "Perpaduan mantel wol terstruktur dan celana lipit wide-leg untuk estetika formal paripurna.",
    "desc_en": "A refined pairing of our structured wool coat and wide-leg pleated trousers for effortless formal tailoring.",
    "ends_at": "2026-12-31 23:59:59",
    "is_active": true,
    "normal_price": 1830000,
    "bundle_price": 1550000,
    "image_url": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    "items": [
      {
        "product_id": "PRD-001",
        "variant_id": "VAR-0002",
        "sku": "COAT-CML-M",
        "name": "Mantel Wol Terstruktur Atelier (Camel Hangat, M)",
        "name_en": "Atelier Structured Wool Coat (Warm Camel, M)",
        "quantity": 1,
        "base_price": 1250000
      },
      {
        "product_id": "PRD-003",
        "variant_id": "VAR-0011",
        "sku": "PLTD-SND-M",
        "name": "Celana Lipit Wide-Leg Atelier (Pasir Krem, M)",
        "name_en": "Pleated Wide-Leg Trousers (Sand Cream, M)",
        "quantity": 1,
        "base_price": 580000
      }
    ]
  },
  {
    "campaign_id": "BND-002",
    "banner_title": "Urban Terracotta Duo (Kemeja Linen + Tas Tote Kanvas)",
    "title_en": "Urban Terracotta Duo (Linen Shirt + Canvas Weekender Tote)",
    "banner_desc": "Kombinasi kemeja linen bernapas dengan tas tote kanvas atelier serbaguna untuk mobilitas harian.",
    "desc_en": "An everyday duo combining our breathable relaxed linen shirt with the structured canvas atelier tote.",
    "ends_at": "2026-12-31 23:59:59",
    "is_active": true,
    "normal_price": 770000,
    "bundle_price": 650000,
    "image_url": "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80",
    "items": [
      {
        "product_id": "PRD-002",
        "variant_id": "VAR-0007",
        "sku": "LNSH-WHT-M",
        "name": "Kemeja Linen Santai Minimalis (Putih Tulang, M)",
        "name_en": "Minimalist Relaxed Linen Shirt (Bone White, M)",
        "quantity": 1,
        "base_price": 420000
      },
      {
        "product_id": "PRD-008",
        "variant_id": "VAR-0030",
        "sku": "TOTE-TAN-M",
        "name": "Tas Tote Kanvas Atelier (Cokelat Pasir, M)",
        "name_en": "Canvas Atelier Weekender Tote (Sand Tan, M)",
        "quantity": 1,
        "base_price": 350000
      }
    ]
  }
];

    for (var b = 0; b < canonicalBundles.length; b++) {
      var bnd = canonicalBundles[b];
      if (existingCampaignIds.indexOf(bnd.campaign_id) === -1) {
        campaignSheet.appendRow([
          bnd.campaign_id,
          bnd.banner_title,
          bnd.banner_desc,
          bnd.ends_at,
          bnd.is_active ? 'TRUE' : 'FALSE',
          JSON.stringify(bnd.items),
          bnd.normal_price,
          bnd.bundle_price
        ]);
        results.campaignsAdded++;
      }
    }
  }

  // D. Coupons (WELCOME10, HEMAT50K, GLOBALSHIP)
  var couponsSheet = ss.getSheetByName(SHEET_NAMES.COUPONS);
  if (couponsSheet) {
    var existingCoupons = getExistingColumnValues(couponsSheet, 0);
    var sampleCoupons = [
      {
        code: 'WELCOME10',
        discount_type: 'PERCENT',
        discount_value: 10,
        min_spend: 200000,
        description: 'Diskon 10% untuk pelanggan baru dengan minimal belanja Rp 200.000',
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
        description: 'Subsidi ongkos kirim Rp 100.000 untuk transaksi internasional atau nasional di atas Rp 1.000.000',
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

  SpreadsheetApp.flush();
  return results;
}

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
