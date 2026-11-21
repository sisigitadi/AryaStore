/**
 * ================================================================================
 * ARYASTORE E-COMMERCE ENGINE - SERVER-SIDE BACKEND API
 * ================================================================================
 * File: code.gs
 * Target: Google Apps Script Web App (Serverless V8 Engine)
 * Standard: RetroBOT v3.0 & antislop Delivery Gate
 * 
 * Core Architectural Guarantees:
 * 1. Zero-based numeric index constants for all 10 sheets (no header-string lookups)
 * 2. Sequential Mutex ID Generation (INV-YYYYMM-XXX and RTR-YYYYMM-XXX) via LockService (10s lock)
 * 3. getDisplayValues() on all sheet reads, SpreadsheetApp.flush() on all writes
 * 4. Backend-driven search, multi-attribute filtering, sorting, and pagination
 * 5. Full RBAC authorization matrix (Super Admin, Store Manager, Customer Service)
 * 6. Google Drive storage integration for manual payment proof receipts
 * 7. Real-time conversion funnel telemetry and audit logging
 * ================================================================================
 */

// ================================================================================
// 1. COLUMN INDEX CONSTANTS (Zero-Based Mapping for 10 Sheets)
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
    .setTitle('AryaStore | Editorial Fashion E-Commerce')
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
    // Audit logging should never interrupt primary transactions
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
 * Returns filtered, searched, sorted, and paginated product catalog items.
 * Joins ProductVariants to calculate aggregate inventory and available sizes.
 * 
 * @param {Object} filters
 *   filters.search {string} - Substring match in name or description
 *   filters.category {string} - 'All', 'Outerwear', 'Tops', 'Bottoms', 'Footwear', 'Accessories'
 *   filters.maxPrice {number} - Maximum price filter
 *   filters.size {string} - Required available size (XS to 5XL)
 *   filters.badge {string} - 'All', 'New Arrival', 'Best Seller', 'Limited Edition'
 *   filters.sortBy {string} - 'newest', 'price_asc', 'price_desc'
 *   filters.page {number} - Page number (1-based, default 1)
 *   filters.limit {number} - Items per page (default 12)
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
    if (productRows.length === 0) {
      try {
        setupDatabase();
        productRows = getSheetDisplayRows(SHEET_NAMES.PRODUCTS);
      } catch (err) {}
    }
    var variantRows = getSheetDisplayRows(SHEET_NAMES.VARIANTS);

    // Build variant index mapped by product_id
    var variantsByProduct = {};
    for (var v = 0; v < variantRows.length; v++) {
      var vRow = variantRows[v];
      var pId = vRow[COL_VARIANTS.PRODUCT_ID];
      if (!variantsByProduct[pId]) {
        variantsByProduct[pId] = [];
      }
      var stockNum = parseInt(vRow[COL_VARIANTS.STOCK], 10) || 0;
      variantsByProduct[pId].push({
        variant_id: vRow[COL_VARIANTS.VARIANT_ID],
        product_id: pId,
        sku: vRow[COL_VARIANTS.SKU],
        color: vRow[COL_VARIANTS.COLOR],
        size: vRow[COL_VARIANTS.SIZE],
        stock: stockNum
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

      var prodVariants = variantsByProduct[prodId] || [];

      // Calculate total stock and distinct sizes with available inventory
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

      // 1. Category filter
      if (category !== 'All' && category !== 'Semua' && prodCat.toLowerCase() !== category.toLowerCase()) {
        continue;
      }

      // 2. Max price filter
      if (maxPrice > 0 && basePrice > maxPrice) {
        continue;
      }

      // 3. Badge filter
      if (badge !== 'All' && badge !== 'Semua' && prodBadge.toLowerCase() !== badge.toLowerCase()) {
        continue;
      }

      // 4. Size filter (must have stock > 0 for this specific size)
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

      // 5. Text search filter
      if (search) {
        var searchHaystack = (prodName + ' ' + prodDesc + ' ' + prodCat + ' ' + prodBadge).toLowerCase();
        if (searchHaystack.indexOf(search) === -1) {
          continue;
        }
      }

      filtered.push({
        id: prodId,
        name: prodName,
        category: prodCat,
        base_price: basePrice,
        badge: prodBadge,
        description: prodDesc,
        image_url: prodImage,
        created_at: prodCreatedAt,
        total_stock: totalStock,
        available_sizes: availableSizes,
        colors: colorsList,
        variants_count: prodVariants.length
      });
    }

    // Sorting
    if (sortBy === 'price_asc') {
      filtered.sort(function(a, b) { return a.base_price - b.base_price; });
    } else if (sortBy === 'price_desc') {
      filtered.sort(function(a, b) { return b.base_price - a.base_price; });
    } else {
      // Default: newest first (descending by created_at or id)
      filtered.sort(function(a, b) {
        if (b.created_at && a.created_at) {
          return b.created_at.localeCompare(a.created_at);
        }
        return b.id.localeCompare(a.id);
      });
    }

    // Pagination
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
 * Returns full details of a specific product and all its variant stock units.
 * 
 * @param {string} productId
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
        product = {
          id: row[COL_PRODUCTS.ID],
          name: row[COL_PRODUCTS.NAME],
          category: row[COL_PRODUCTS.CATEGORY],
          base_price: parseFloat(row[COL_PRODUCTS.BASE_PRICE]) || 0,
          badge: row[COL_PRODUCTS.BADGE],
          description: row[COL_PRODUCTS.DESCRIPTION],
          image_url: row[COL_PRODUCTS.IMAGE_URL],
          created_at: row[COL_PRODUCTS.CREATED_AT]
        };
        break;
      }
    }

    if (!product) {
      return { success: false, message: 'Produk dengan ID ' + productId + ' tidak ditemukan' };
    }

    // Retrieve corresponding variants
    var variantRows = getSheetDisplayRows(SHEET_NAMES.VARIANTS);
    var variants = [];
    var totalStock = 0;

    for (var j = 0; j < variantRows.length; j++) {
      var vRow = variantRows[j];
      if (vRow[COL_VARIANTS.PRODUCT_ID] === productId) {
        var stock = parseInt(vRow[COL_VARIANTS.STOCK], 10) || 0;
        totalStock += stock;
        variants.push({
          variant_id: vRow[COL_VARIANTS.VARIANT_ID],
          product_id: productId,
          sku: vRow[COL_VARIANTS.SKU],
          color: vRow[COL_VARIANTS.COLOR],
          size: vRow[COL_VARIANTS.SIZE],
          stock: stock
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
    if (rows.length === 0) {
      try {
        setupDatabase();
        rows = getSheetDisplayRows(SHEET_NAMES.CAMPAIGNS);
      } catch (err) {}
    }
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
 * 
 * @param {string} code
 * @param {number} subtotal
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

    // Guardrail: discount cannot exceed order subtotal
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
 * 
 * @param {Object} payload
 *   payload.customer_name {string}
 *   payload.whatsapp_no {string}
 *   payload.items {Array} - [{ product_id, sku, name, color, size, quantity, price, subtotal }]
 *   payload.subtotal {number}
 *   payload.coupon_code {string} (optional)
 *   payload.coupon_discount {number} (optional)
 *   payload.shipping_method {string}
 *   payload.shipping_cost {number} (optional, default 0)
 *   payload.notes {string} (optional)
 */
function createOrder(payload) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire mutex with 10 seconds timeout to prevent race conditions
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
    var variantValues = variantDataRange.getDisplayValues(); // 0 is header

    for (var it = 0; it < items.length; it++) {
      var item = items[it];
      var requestedQty = parseInt(item.quantity, 10) || 1;
      var skuToFind = item.sku;
      var foundRowIndex = -1;
      var currentStock = 0;

      for (var vr = 1; vr < variantValues.length; vr++) {
        if (variantValues[vr][COL_VARIANTS.SKU] === skuToFind) {
          foundRowIndex = vr + 1; // 1-based row index in sheet
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

      // Decrement stock
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
          existingCustomerRowIdx = c + 2; // 1-based row index
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
      // Increment existing customer order count
      var currentOrderCount = parseInt(customersSheet.getRange(existingCustomerRowIdx, COL_CUSTOMERS.TOTAL_ORDERS + 1).getValue(), 10) || 0;
      customersSheet.getRange(existingCustomerRowIdx, COL_CUSTOMERS.TOTAL_ORDERS + 1).setValue(currentOrderCount + 1);
    } else {
      // Create new customer ID (CST-XXX)
      var newCustSeq = Math.max(1, customerLastRow);
      customerId = 'CST-' + ('000' + newCustSeq).slice(-3);
      customersSheet.appendRow([
        customerId,
        customerName,
        cleanPhone,
        1,
        0, // total_spent updated when order status reaches 'Selesai'
        timestamp,
        payload.notes || ''
      ]);
    }

    // 4. Append Order record
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
      'Menunggu Pembayaran'
    ];

    ordersSheet.appendRow(newOrderRow);

    // 5. Commit all writes immediately
    SpreadsheetApp.flush();

    // 6. Telemetry and audit logging
    logAudit('Customer', 'Orders', 'Pesanan baru berhasil dibuat: ' + invoiceNo + ' oleh ' + customerName + ' (' + cleanPhone + ')');
    logEvent('wa_checkout', {
      invoice_no: invoiceNo,
      grand_total: grandTotal,
      customer_id: customerId
    });

    return {
      success: true,
      invoice_no: invoiceNo,
      customer_id: customerId,
      grand_total: grandTotal,
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
 * Requires matching invoice number and phone number for security.
 * 
 * @param {string} invoiceNo
 * @param {string} whatsappNo
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
          status: row[COL_ORDERS.STATUS]
        };
        break;
      }
    }

    if (!foundOrder) {
      return { success: false, message: 'Pesanan dengan nomor invoice ' + cleanInv + ' tidak ditemukan' };
    }

    // Check if any returns were submitted for this invoice
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
 * sets public view permissions, and saves the image URL to the Orders sheet.
 * 
 * @param {string} invoiceNo
 * @param {string} base64Data - Raw or data-URI base64 string
 * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'
 * @param {string} fileName - Optional filename
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
        targetRowIndex = i + 2; // 1-based index
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, message: 'Pesanan ' + cleanInv + ' tidak ditemukan' };
    }

    // Strip Data URI scheme if present
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

    // Save to Google Drive
    var settings = loadSettingsDictionary();
    var folderName = settings['DRIVE_FOLDER_NAME'] || 'ARYA_ECOMMERCE_PAYMENTS';
    var targetFolder;

    if (typeof DriveApp !== 'undefined') {
      var folderIterator = DriveApp.getFoldersByName(folderName);
      if (folderIterator.hasNext()) {
        targetFolder = folderIterator.next();
      } else {
        targetFolder = DriveApp.createFolder(folderName);
      }

      var driveFile = targetFolder.createFile(blob);
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileUrl = driveFile.getUrl();

      // Write URL and update status to 'Bukti Diupload'
      ordersSheet.getRange(targetRowIndex, COL_ORDERS.PAYMENT_PROOF_URL + 1).setValue(fileUrl);
      ordersSheet.getRange(targetRowIndex, COL_ORDERS.STATUS + 1).setValue('Bukti Diupload');

      SpreadsheetApp.flush();

      logAudit('Customer', 'Orders', 'Bukti transfer diunggah untuk invoice ' + cleanInv + ' (Drive File ID: ' + driveFile.getId() + ')');

      return {
        success: true,
        url: fileUrl,
        status: 'Bukti Diupload',
        message: 'Bukti pembayaran berhasil diunggah. Tim admin akan segera memverifikasi pembayaran Anda.'
      };
    } else {
      // Fallback simulation mode
      var simulatedUrl = 'https://drive.google.com/file/d/simulated_' + cleanInv + '/view';
      ordersSheet.getRange(targetRowIndex, COL_ORDERS.PAYMENT_PROOF_URL + 1).setValue(simulatedUrl);
      ordersSheet.getRange(targetRowIndex, COL_ORDERS.STATUS + 1).setValue('Bukti Diupload');
      SpreadsheetApp.flush();

      return {
        success: true,
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
 * Submits a size exchange or return request, generating sequential RTR-YYYYMM-XXX ID via mutex.
 * 
 * @param {Object} payload
 *   payload.invoice_no {string}
 *   payload.customer_name {string}
 *   payload.reason {string}
 *   payload.requested_size {string}
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

    // Sequential Mutex ID Generation for Return (RTR-YYYYMM-XXX)
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
 * Logs a storefront telemetry event for the 4-stage conversion funnel.
 * 
 * @param {string} eventName - 'product_view', 'add_to_cart', 'wa_checkout', 'order_completed'
 * @param {Object|string} eventData
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
// 5. RBAC & ADMIN DASHBOARD ENDPOINTS
// ================================================================================

/**
 * Authenticates admin operator using 4-digit PIN stored in Settings.
 * Returns role name and authorized capabilities upon match.
 * 
 * @param {string} pin
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

/**
 * Checks if the caller role is authorized to perform the given action.
 */
function verifyRoleAuthorization(role, allowedRoles) {
  if (!role) return false;
  if (role === 'Super Admin') return true; // Super Admin has unrestricted access
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

      // Count revenue for completed transactions
      if (status === 'Selesai' || status === 'Diproses' || status === 'Dikirim') {
        totalRevenue += grandTotal;
      }

      // Sum units sold
      if (status === 'Selesai') {
        try {
          var items = JSON.parse(row[COL_ORDERS.ITEMS_JSON]);
          for (var it = 0; it < items.length; it++) {
            unitsSold += (parseInt(items[it].quantity, 10) || 1);
          }
        } catch (e) {}
      }

      // Keep up to 10 latest orders for table preview
      if (recentOrders.length < 10) {
        recentOrders.push({
          invoice_no: row[COL_ORDERS.INVOICE_NO],
          created_at: row[COL_ORDERS.CREATED_AT],
          customer_name: row[COL_ORDERS.CUSTOMER_NAME],
          whatsapp_no: row[COL_ORDERS.WHATSAPP_NO],
          grand_total: grandTotal,
          status: status,
          payment_proof_url: row[COL_ORDERS.PAYMENT_PROOF_URL]
        });
      }
    }

    // Count variants with low stock (< 5 units)
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
 * 
 * @param {Object} filters
 *   filters.status {string} - 'All' or specific status
 *   filters.search {string} - Substring search across invoice, customer, phone
 *   filters.page {number}
 *   filters.limit {number}
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

    for (var i = rows.length - 1; i >= 0; i--) { // Newest orders first
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
        status: rStatus
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
 * Automatically recalculates grand total when manual ongkir is adjusted.
 * Updates customer total spend when order status transitions to 'Selesai'.
 * Restores variant inventory when order status transitions to 'Dibatalkan'.
 * 
 * @param {string} invoiceNo
 * @param {string} newStatus - 'Menunggu Pembayaran', 'Bukti Diupload', 'Diproses', 'Dikirim', 'Selesai', 'Dibatalkan'
 * @param {number|string} manualOngkir - Optional new shipping fee
 * @param {string} notes - Optional administrative notes
 * @param {string} role - Authenticated caller role
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

    // 1. Recalculate shipping cost if provided
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

    // 2. Update status if valid
    var statusChanged = false;
    if (newStatus && newStatus !== oldStatus) {
      ordersSheet.getRange(targetRowIdx, COL_ORDERS.STATUS + 1).setValue(newStatus);
      statusChanged = true;

      // When transitioning to 'Selesai', credit customer total_spent
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

      // When transitioning to 'Dibatalkan', restore inventory stock
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
 * Creates a new fashion catalog product.
 * 
 * @param {Object} productData
 * @param {string} role
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

    sheet.appendRow([
      newId,
      productData.name,
      productData.category,
      parseFloat(productData.base_price) || 0,
      productData.badge || 'None',
      productData.description || '',
      productData.image_url || 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80',
      timestamp
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
 * Modifies an existing fashion catalog product.
 * 
 * @param {Object} productData
 * @param {string} role
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
 * Creates a new variant SKU record for a product.
 * 
 * @param {Object} variantData
 * @param {string} role
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
      parseInt(variantData.stock, 10) || 0
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
 * Updates stock quantity, color, or size of an existing variant.
 * 
 * @param {Object} variantData
 * @param {string} role
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
 * 
 * @param {Object} couponData
 * @param {string} role
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

    // Check duplicate
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
 * 
 * @param {Object} couponData
 * @param {string} role
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
 * 
 * @param {Object} campaignData
 * @param {string} role
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
 * 
 * @param {Object} campaignData
 * @param {string} role
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

    for (var i = rows.length - 1; i >= 0; i--) { // Newest first
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
 * 
 * @param {string} returnId
 * @param {string} newStatus - 'Diajukan', 'Disetujui', 'Ditolak', 'Selesai'
 * @param {string} adminNotes
 * @param {string} role
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

    // Reverse to present newest logs at the top
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
 * Stage 1: Product Views
 * Stage 2: Add to Cart
 * Stage 3: WhatsApp Checkout
 * Stage 4: Order Completed & Paid
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

    // Complement with actual orders count if telemetry is sparse
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

    // Default minimum counts to avoid divide-by-zero during initial launch
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
 * Generates an RFC 4180-compliant CSV string of all order records for administrative export.
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
      'URL Bukti Bayar'
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
        r[COL_ORDERS.PAYMENT_PROOF_URL]
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
    var filename = 'rekap_pesanan_arya_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss') + '.csv';

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
 * PIN credentials are exclusively returned to authenticated Super Admin callers.
 * 
 * @param {string} role
 */
function getSettings(role) {
  try {
    var dict = loadSettingsDictionary();

    // Security gate: redact PIN secrets unless caller is Super Admin
    if (role !== 'Super Admin') {
      delete dict['PIN_SUPER_ADMIN'];
      delete dict['PIN_STORE_MANAGER'];
      delete dict['PIN_CUSTOMER_SERVICE'];
    }

    // Parse shipping methods JSON if present
    var parsedShipping = [];
    if (dict['SHIPPING_METHODS']) {
      try {
        parsedShipping = JSON.parse(dict['SHIPPING_METHODS']);
      } catch (e) {
        parsedShipping = [
          { id: 'REG', name: 'Reguler (JNE/J&T)', note: 'Ongkir manual via konfirmasi admin WA' },
          { id: 'EXP', name: 'Express (SiCepat/Paxel)', note: 'Ongkir manual via konfirmasi admin WA' },
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
 * Updates global system configuration parameters.
 * Strictly restricted to Super Admin role.
 * 
 * @param {Object} newSettings - Key-value map of configuration changes
 * @param {string} role
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
        // Append new key if not present
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
// 8. DATABASE SETUP & 1-CLICK MIGRATION ENGINE
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
