const serverEnvSelect = document.getElementById("serverEnv");
const customServerContainer = document.getElementById("customServerContainer");
const customServerInput = document.getElementById("customServerUrl");
const toneTypeSelect = document.getElementById("toneType");
const customToneContainer = document.getElementById("customToneContainer");
const customToneInput = document.getElementById("customTone");
const replySpeedSelect = document.getElementById("replySpeed");
const extraContextInput = document.getElementById("extraContext");
const mainToggleBtn = document.getElementById("mainToggleBtn");
const statusMsg = document.getElementById("statusMsg");

let isAutoReplyEnabled = false;

function toggleCustomServer() {
  if (serverEnvSelect && serverEnvSelect.value === "custom") {
    customServerContainer.style.display = "block";
  } else if (customServerContainer) {
    customServerContainer.style.display = "none";
  }
}

function getBackendBaseUrl() {
  const env = serverEnvSelect ? serverEnvSelect.value : "https://shopee.cs.norapadel.my.id";
  let url = env === "custom" ? ((customServerInput ? customServerInput.value.trim() : "") || "http://127.0.0.1:8000") : env;
  return url.replace(/\/+$/, '');
}

if (serverEnvSelect) {
  serverEnvSelect.addEventListener("change", () => {
    toggleCustomServer();
    saveSettingsNow();
    fetchPrompts();
  });
}

if (customServerInput) {
  customServerInput.addEventListener("blur", () => {
    saveSettingsNow();
    fetchPrompts();
  });
}

function toggleCustomTone() {
  if (toneTypeSelect.value === "custom") {
    customToneContainer.style.display = "block";
  } else {
    customToneContainer.style.display = "none";
  }
}

toneTypeSelect.addEventListener("change", () => {
  toggleCustomTone();
  saveSettingsNow();
});

replySpeedSelect.addEventListener("change", saveSettingsNow);
extraContextInput.addEventListener("blur", saveSettingsNow);
customToneInput.addEventListener("blur", saveSettingsNow);

function updateButtonUI() {
  if (isAutoReplyEnabled) {
    mainToggleBtn.textContent = "BERHENTIKAN AUTO-REPLY";
    mainToggleBtn.className = "btn-stop";
  } else {
    mainToggleBtn.textContent = "MULAI AUTO-REPLY";
    mainToggleBtn.className = "btn-start";
  }
}

async function fetchPrompts() {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/prompts`, {
      headers: { "Authorization": "Bearer 1|L70K2sZN7LpBhUDiBYcqFKglwqzU0Kuo4ZdlTDbR753469dc", "Accept": "application/json" }
    });
    if (!res.ok) throw new Error("Gagal ambil prompts");
    const prompts = await res.json();
    
    toneTypeSelect.innerHTML = "";
    prompts.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      toneTypeSelect.appendChild(opt);
    });
    
    // Custom fallback if needed
    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "Custom...";
    toneTypeSelect.appendChild(customOpt);

  } catch (e) {
    console.warn("Gagal fetch prompts, menggunakan fallback:", e);
    toneTypeSelect.innerHTML = `
      <option value="1">Default (Ramah)</option>
      <option value="custom">Custom...</option>
    `;
  }
}

async function loadSettings() {
  const settings = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  if (!settings) return;
  isAutoReplyEnabled = !!settings.autoReplyEnabled;
  if (serverEnvSelect) serverEnvSelect.value = settings.serverEnv || "https://shopee.cs.norapadel.my.id";
  if (customServerInput) customServerInput.value = settings.customServerUrl || "http://127.0.0.1:8000";
  toneTypeSelect.value = settings.toneType || "1";
  customToneInput.value = settings.customTone || "";
  replySpeedSelect.value = settings.replySpeed || "normal";
  extraContextInput.value = settings.extraContext || "";
  toggleCustomServer();
  toggleCustomTone();
  updateButtonUI();
}

async function saveSettingsNow() {
  await chrome.runtime.sendMessage({
    type: "SET_SETTINGS",
    payload: {
      autoReplyEnabled: isAutoReplyEnabled,
      serverEnv: serverEnvSelect ? serverEnvSelect.value : "https://shopee.cs.norapadel.my.id",
      customServerUrl: customServerInput ? customServerInput.value.trim() : "http://127.0.0.1:8000",
      toneType: toneTypeSelect.value,
      customTone: customToneInput.value.trim(),
      replySpeed: replySpeedSelect.value,
      extraContext: extraContextInput.value.trim(),
    },
  });
}

async function init() {
  await loadSettings();
  await fetchPrompts();
}

init();

async function toggleAutoReply() {
  isAutoReplyEnabled = !isAutoReplyEnabled;
  updateButtonUI();
  await saveSettingsNow();

  if (isAutoReplyEnabled) {
    statusMsg.textContent = "Auto-Reply AKTIF ✓";
    statusMsg.style.color = "green";
  } else {
    statusMsg.textContent = "Auto-Reply DIMATIKAN";
    statusMsg.style.color = "#dc3545";
  }
  
  setTimeout(() => (statusMsg.textContent = ""), 2000);
}

// =========================================================================
// SYNC PRODUK SHOPEE
// =========================================================================

const syncBtn = document.getElementById("syncBtn");
const syncStatusMsg = document.getElementById("syncStatusMsg");

/**
 * Fungsi yang akan di-inject langsung ke halaman Shopee.
 * Mengambil semua produk via API internal Shopee (dengan pagination otomatis),
 * lalu mengirimkan ke backend Laravel.
 */
async function syncProductsInjected(backendBaseUrl = "https://shopee.cs.norapadel.my.id") {
  const allProducts = [];
  let totalPages = 1;
  const pageSize = 20;
  let usedMethod = "api";

  // Helper parsing nominal Rupiah (DENGAN BATAS MAKSIMAL 100 JUTA AGAR TIDAK KETUKAR MODEL ID / ID PRODUK)
  function parseShopeePrice(str) {
    if (!str) return 0;
    if (typeof str === 'string' && (str.includes("ID") || str.includes("SKU") || str.includes("Batas") || str.includes("Kunjungan") || str.includes("Penjualan"))) {
      return 0;
    }
    const clean = String(str).replace(/[^0-9.,]/g, '').trim();
    if (!clean) return 0;
    let normalized = clean;
    if (normalized.includes('.') && normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (normalized.includes('.')) {
      normalized = normalized.replace(/\./g, '');
    } else if (normalized.includes(',')) {
      const parts = normalized.split(',');
      if (parts[1] && parts[1].length === 3) {
        normalized = normalized.replace(/,/g, '');
      } else {
        normalized = normalized.replace(',', '.');
      }
    }
    const val = parseFloat(normalized) || 0;
    // Nilai harga di atas 100 juta dipastikan adalah Model ID atau ID Produk (BUKAN HARGA!)
    if (val >= 100000000) return 0;
    return val;
  }

  // Helper ekstraksi harga dari DOM container/row (UNIVERSAL & AKURAT)
  function extractPriceFromContainer(container) {
    let harga_normal = 0;
    let harga_diskon = null;

    if (!container) return { harga_normal: 0, harga_diskon: null };

    const fullText = container.innerText || "";
    const allMatches = [...fullText.matchAll(/Rp\s?([\d.,]+)/gi)];
    const validPrices = [];

    for (const match of allMatches) {
      const priceVal = parseShopeePrice(match[1]);
      if (priceVal > 0 && priceVal < 100000000 && !validPrices.includes(priceVal)) {
        validPrices.push(priceVal);
      }
    }

    if (validPrices.length >= 2) {
      // Ada 2 harga atau lebih (misal harga promo Rp15.000 dan harga coret Rp30.000)
      validPrices.sort((a, b) => a - b);
      harga_diskon = validPrices[0];
      harga_normal = validPrices[validPrices.length - 1];
    } else if (validPrices.length === 1) {
      // Hanya ada 1 harga normal
      harga_normal = validPrices[0];
      harga_diskon = null;
    } else {
      // Fallback selector elemen harga
      const priceDisplay = container.querySelector('[class*="ListViewPriceDisplay"], [class*="PriceDisplay"], [class*="priceNormal"], [class*="price-normal"]');
      if (priceDisplay) {
        const pMatch = (priceDisplay.innerText || "").match(/Rp\s?([\d.,]+)/);
        if (pMatch) {
          harga_normal = parseShopeePrice(pMatch[1]);
        }
      }
    }

    if (harga_normal >= 100000000) harga_normal = 0;
    if (harga_diskon && (harga_diskon >= 100000000 || (harga_normal > 0 && harga_diskon >= harga_normal))) {
      harga_diskon = null;
    }

    return { harga_normal, harga_diskon };
  }

  // Helper parsing produk dari API internal Shopee
  function parseApiProduct(item) {
    try {
      const nama = item.name || item.item_name || item.product_name || "";
      if (!nama) return null;

      const normalizeApiPrice = (val) => {
        if (!val || isNaN(val)) return 0;
        const num = Number(val);
        if (num >= 100000000) {
          return Math.round(num / 100000);
        }
        return num;
      };

      let rawNormalPrice = item.price || item.original_price || item.normal_price || item.price_before_discount || item.price_info?.original_price || 0;
      let rawDiscountPrice = item.discount_price || item.promotion_price || item.campaign_price || item.current_price || item.price_info?.current_price || item.price_info?.campaign_price || item.price_info?.promotion_price || null;

      // Jika ada model/variasi dan rawNormalPrice masih 0
      const models = item.models || item.model_list || item.tier_variation_models || [];
      if ((!rawNormalPrice || rawNormalPrice === 0) && models.length > 0) {
        rawNormalPrice = models[0].price || models[0].original_price || models[0].normal_price || models[0].price_before_discount || models[0].price_info?.original_price || 0;
        if (!rawDiscountPrice) {
          rawDiscountPrice = models[0].discount_price || models[0].promotion_price || models[0].campaign_price || models[0].current_price || models[0].price_info?.current_price || null;
        }
      }

      let hargaNormal = normalizeApiPrice(rawNormalPrice);
      let hargaDiskon = rawDiscountPrice ? normalizeApiPrice(rawDiscountPrice) : null;

      if (hargaNormal === 0 && hargaDiskon && hargaDiskon > 0) {
        hargaNormal = hargaDiskon;
        hargaDiskon = null;
      }

      if (hargaDiskon && hargaNormal > 0 && hargaDiskon > hargaNormal) {
        const temp = hargaNormal;
        hargaNormal = hargaDiskon;
        hargaDiskon = temp;
      } else if (hargaDiskon && hargaDiskon >= hargaNormal) {
        hargaDiskon = null;
      }

      const cleanApiVars = [];
      if (Array.isArray(item.variations)) {
        item.variations.forEach(v => {
          cleanApiVars.push({
            nama: v.name || v.tier_variation_name || String(v),
            harga: v.price ? normalizeApiPrice(v.price) : hargaNormal,
            stok: v.stock || 0,
            sku: v.sku || undefined
          });
        });
      }

      return {
        sku: item.item_sku || item.sku || "",
        nama_produk: nama,
        harga_normal: hargaNormal,
        harga_diskon: hargaDiskon,
        stok: item.stock || item.total_stock || item.stock_info?.total_available_stock || 0,
        varian_tersedia: cleanApiVars,
        deskripsi_singkat: (item.description || item.item_description || "").substring(0, 500),
        kategori: item.category_name || item.category?.display_name || "Katalog Shopee",
        jumlah_terjual: item.sold || item.historical_sold || item.sales || 0,
        link_produk: item.item_id ? `https://shopee.co.id/product/${item.shop_id || 0}/${item.item_id}` : "",
      };
    } catch (e) { return null; }
  }

  // Helper untuk mencari container produk per baris secara presisi (tidak bablas ke seluruh tabel)
  function findItemContainer(el, isModelOnly) {
    let container = el;
    let curr = el;
    
    for (let i = 0; i < 20; i++) {
      if (!curr.parentElement) break;
      const p = curr.parentElement;
      if (p.tagName === 'BODY' || p.tagName === 'MAIN' || p.tagName === 'HTML' || p.id === 'app') break;
      
      const pText = p.innerText || "";
      const idCount = (pText.match(/ID Produk:/g) || []).length;
      const modelCount = (pText.match(/Model ID:/g) || []).length;

      // JANGAN PERNAH naik ke parent yang memuat lebih dari 1 ID Produk (karena itu sudah level seluruh tabel)
      if (idCount > 1) {
        break;
      }

      // Jika marker ini variasi (hanya Model ID), jangan naik ke parent yang memuat variasi lain (modelCount > 1)
      if (isModelOnly && modelCount > 1) {
        break;
      }

      curr = p;
      container = curr;

      // Jika container ini sudah memuat harga Rp dan nama produk, dan parent berikutnya sudah memuat produk/variasi lain
      if (container.innerText.includes("Rp") && (container.innerText.includes("Stok") || container.innerText.includes("Habis") || container.innerText.includes("Penjualan"))) {
        const nextParent = curr.parentElement;
        if (nextParent) {
          const nextIdCount = (nextParent.innerText.match(/ID Produk:/g) || []).length;
          const nextModelCount = (nextParent.innerText.match(/Model ID:/g) || []).length;
          if (nextIdCount > 1 || (isModelOnly && nextModelCount > 1)) {
            break;
          }
        }
      }
    }

    return container;
  }

  // Helper ekstraksi nama produk/variasi dari container yang sudah terisolasi
  function extractProductName(container, isParent) {
    if (!container) return "";
    
    if (isParent) {
      const nameEl = container.querySelector(
        'a[class*="name"], a[class*="title"], [class*="product-name"], [class*="product_name"], [class*="productName"], [class*="item-name"], [class*="itemName"], .product-title, [class*="title-text"]'
      );
      if (nameEl && nameEl.innerText.trim().length >= 2) {
        const txt = nameEl.innerText.split('\n')[0].trim();
        if (txt && !txt.match(/^(SKU|ID Produk|Model ID)/i)) {
          return txt;
        }
      }
    }

    const lines = (container.innerText || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const exactSkip = [
      "produk", "harga", "stok", "performa", "aksi", "semua", "live", "perlu tindakan",
      "sedang ditinjau shopee", "belum ditampilkan", "analisis produk", "ubah", "iklankan",
      "lainnya", "beranda", "pesanan saya", "produk saya", "tambah produk baru",
      "optimasi ai", "produk potensial", "habis", "trafik untuk produk baru dibatasi",
      "optimalkan", "fix", "masalah konten perlu diperbaiki", "terapkan", "atur ulang"
    ];

    for (const line of lines) {
      const l = line.trim();
      if (l.match(/^(SKU Induk|ID Produk|Model ID|Kode Variasi|Batas Maks|Lihat Semua|Penjualan|Kunjungan|Trafik|Optimalkan|Perbaiki)/i)) continue;
      
      let skipExact = false;
      for (const skip of exactSkip) {
        if (l.toLowerCase() === skip || l.toLowerCase().startsWith(skip + " (") || l.toLowerCase().match(new RegExp(`^${skip}\\s*\\d+$`))) {
          skipExact = true;
          break;
        }
      }
      if (skipExact) continue;

      if (l.match(/^\d+$/) || l.length < 2) continue;
      if (l.match(/Rp\s?[\d.,]+/)) continue;
      if (l.match(/penjualan\s*\d+/i)) continue;
      if (l.match(/kunjungan\s*\d+/i)) continue;
      if (l.match(/\d+\s*hari/i)) continue;

      return l;
    }
    return "";
  }

  // Helper pencarian tombol Halaman Berikutnya (Pagination)
  function findNextPageButton() {
    // 1. Selector standar Shopee Pager
    const explicitNext = document.querySelector(
      'button.shopee-pager__button-next:not([disabled]):not(.disabled), button.eds-pager__button-next:not([disabled]):not(.disabled), button[class*="pager__button-next"]:not([disabled]):not(.disabled), button[class*="pagination-next"]:not([disabled]):not(.disabled), [class*="pagination"] button[class*="next"]:not([disabled]):not(.disabled)'
    );
    if (explicitNext && !explicitNext.disabled && explicitNext.offsetParent !== null) {
      return explicitNext;
    }

    // 2. Cari tombol di dekat teks "1 / 2" (Top pager)
    const allBtns = Array.from(document.querySelectorAll('button:not([disabled])')).filter(b => !b.disabled && !b.classList.contains('disabled') && b.offsetParent !== null);
    for (const btn of allBtns) {
      const parentText = btn.parentElement ? (btn.parentElement.innerText || "") : "";
      if (parentText.match(/\d+\s*\/\s*\d+/)) {
        const siblingBtns = Array.from(btn.parentElement.querySelectorAll('button:not([disabled])'));
        if (siblingBtns.length >= 2 && siblingBtns[siblingBtns.length - 1] === btn) {
          return btn;
        }
      }
    }

    // 3. Cari tombol nomor halaman berikutnya (misal sedang di 1, cari nomor '2')
    const activePageEl = document.querySelector('.shopee-pager__item--active, [class*="pager__item--active"], [class*="page-item active"], [class*="active-page"]');
    if (activePageEl) {
      const currentPageNum = parseInt(activePageEl.innerText.trim(), 10);
      if (currentPageNum > 0) {
        const nextPageNum = currentPageNum + 1;
        const allPageItems = Array.from(document.querySelectorAll('.shopee-pager__item, [class*="pager__item"], [class*="page-item"], [class*="page-number"]'));
        for (const item of allPageItems) {
          if (item.innerText.trim() === String(nextPageNum)) {
            return item;
          }
        }
      }
    }

    return null;
  }

  try {
    // === METODE 1: Shopee Internal API (dengan pagination) ===
    const apiEndpoints = [
      `/api/v3/product/search_product/?page_number=1&page_size=${pageSize}&source=seller_center&sort_by=ctime&sort_direction=2`,
      `/api/v3/product/search_product_v2/?page_number=1&page_size=${pageSize}&source=seller_center`,
      `/api/v3/product/get_product_list?page_number=1&page_size=${pageSize}`,
      `/api/v3/mps/get_product_list?page_number=1&page_size=${pageSize}`,
      `/api/mydata/product/get_product_list?offset=0&limit=${pageSize}&need_statistic=true`,
    ];

    let apiWorked = false;

    for (const endpoint of apiEndpoints) {
      try {
        const testRes = await fetch(endpoint, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!testRes.ok) continue;
        const testData = await testRes.json();
        
        const items = testData?.data?.items || testData?.data?.list || testData?.data?.product_list || testData?.items || [];
        const totalCount = testData?.data?.total || testData?.data?.total_count || testData?.total || items.length;
        
        if (items.length === 0 && totalCount === 0) continue;
        
        apiWorked = true;
        totalPages = Math.ceil(totalCount / pageSize);
        console.log(`[ShopeeSync] API Berhasil: ${endpoint}. Ditemukan ${totalCount} produk total, ${totalPages} halaman.`);
        
        items.forEach(item => {
          const product = parseApiProduct(item);
          if (product) allProducts.push(product);
        });

        for (let page = 2; page <= totalPages; page++) {
          const pageEndpoint = endpoint
            .replace(/page_number=\d+/, `page_number=${page}`)
            .replace(/offset=\d+/, `offset=${(page - 1) * pageSize}`);
          
          try {
            const pageRes = await fetch(pageEndpoint, { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } });
            if (!pageRes.ok) continue;
            const pageData = await pageRes.json();
            const pageItems = pageData?.data?.items || pageData?.data?.list || pageData?.data?.product_list || pageData?.items || [];
            pageItems.forEach(item => { const p = parseApiProduct(item); if (p) allProducts.push(p); });
          } catch (e) { console.error(`[ShopeeSync] Gagal fetch halaman ${page}:`, e); }
        }
        break;
      } catch (e) { continue; }
    }

    // === METODE 2: Fallback DOM Scraping ===
    if (!apiWorked || allProducts.length === 0) {
      console.log(`[ShopeeSync] API gagal atau tidak mendapat produk. Menggunakan DOM Scraping otomatis dengan pagination.`);
      usedMethod = "dom";
      const seenIds = new Set();
      let hasNextPage = true;
      let pageCount = 0;
      let lastParentProduct = null;

      while (hasNextPage && pageCount < 20) {
        pageCount++;
        console.log(`[ShopeeSync] Scraping halaman ${pageCount}...`);

        if (pageCount > 1) {
          // Tunggu Shopee merender produk halaman berikutnya
          await new Promise(r => setTimeout(r, 2500));
        }

        let itemsScrapedThisPage = 0;

        // --- Strategi 2a: Cari elemen TERDALAM yang mengandung "ID Produk:" atau "Model ID:" ---
        const allElems = document.querySelectorAll('*');
        const productMarkers = [];
        allElems.forEach(el => {
          const text = el.innerText || "";
          if (!text.includes("ID Produk:") && !text.includes("Model ID:")) return;
          // Skip jika ada child yang juga mengandung teks marker
          const childHasMarker = Array.from(el.children).some(child => {
              const childText = child.innerText || "";
              return childText.includes("ID Produk:") || childText.includes("Model ID:");
          });
          if (childHasMarker) return;
          productMarkers.push(el);
        });

        productMarkers.forEach(el => {
          const elText = el.innerText || "";
          const hasProductId = elText.includes("ID Produk:");
          const hasModelId = elText.includes("Model ID:");
          const isModelOnly = !hasProductId && hasModelId;
          
          // Dapatkan container yang hanya milik produk/variasi ini
          const container = findItemContainer(el, isModelOnly);
          const fullText = container.innerText || "";
          
          // Dapatkan nama produk / nama variasi
          const nama_item = extractProductName(container, !isModelOnly);
          if (!nama_item) return;

          // Ekstraksi harga normal dan harga diskon (jika ada harga coret)
          const { harga_normal, harga_diskon } = extractPriceFromContainer(container);

          let stok = 0;
          const stockMatch = fullText.match(/stok[:\s]*(\d+)/i);
          if (stockMatch) {
            stok = parseInt(stockMatch[1], 10) || 0;
          } else if (fullText.match(/\b0\s*habis\b/i) || fullText.match(/\bhabis\b/i)) {
            const m = fullText.match(/(\d+)\s*habis/i);
            stok = m ? parseInt(m[1], 10) : 0;
          } else {
            const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            for (const line of lines) {
              if (line.match(/^(\d{1,5})$/) && !line.match(/ID/) && parseInt(line) < 100000) {
                const num = parseInt(line, 10);
                if (num >= 0 && num < 100000 && num !== harga_normal && num !== harga_diskon) {
                  stok = num;
                  break;
                }
              }
            }
          }

          let sku = "";
          const skuMatch = fullText.match(/SKU[^:]*:\s*(.+)/i);
          if (skuMatch) sku = skuMatch[1].split('\n')[0].trim();

          let jumlah_terjual = 0;
          const soldMatch = fullText.match(/Penjualan\s+(\d+)/i);
          if (soldMatch) jumlah_terjual = parseInt(soldMatch[1], 10) || 0;

          const isParent = !isModelOnly && hasProductId;
          
          // Gunakan ID unik untuk mencegah duplikasi
          let uniqueId = "";
          if (isParent) {
              const idm = fullText.match(/ID Produk:\s*(\d+)/i);
              uniqueId = idm ? "P_" + idm[1] : "P_" + nama_item;
          } else {
              const idm = fullText.match(/Model ID:\s*(\d+)/i);
              uniqueId = idm ? "V_" + idm[1] : "V_" + nama_item;
          }
          
          if (seenIds.has(uniqueId)) return;
          seenIds.add(uniqueId);
          
          if (isParent) {
            const newProduct = {
              shopee_id: uniqueId,
              nama_produk: nama_item,
              sku: sku || undefined,
              harga_normal: harga_normal,
              harga_diskon: harga_diskon,
              stok: stok,
              jumlah_terjual: jumlah_terjual,
              kategori: "Katalog Shopee",
              deskripsi_singkat: "",
              link_produk: `https://shopee.co.id/product/0/${uniqueId.replace(/^(P|V)_/, '')}`,
              varian_tersedia: []
            };
            
            allProducts.push(newProduct);
            lastParentProduct = newProduct;
            itemsScrapedThisPage++;
          } else {
            // It's a variation
            if (lastParentProduct) {
              const vNormal = harga_normal > 0 ? harga_normal : (lastParentProduct.harga_normal || (harga_diskon || 0));
              const vDiskon = (harga_diskon && harga_diskon > 0 && harga_diskon < vNormal) ? harga_diskon : null;
              const vFinal = vDiskon || vNormal;

              lastParentProduct.varian_tersedia.push({
                nama: nama_item,
                harga: vFinal,
                harga_normal: vNormal,
                harga_diskon: vDiskon,
                stok: stok,
                sku: sku || undefined
              });

              // Jika harga parent masih 0, perbarui dengan harga variasi ini
              if (lastParentProduct.harga_normal === 0 && vNormal > 0) {
                lastParentProduct.harga_normal = vNormal;
                lastParentProduct.harga_diskon = vDiskon;
              }
              itemsScrapedThisPage++;
            }
          }
        });

        // --- Strategi 2b: Fallback table row jika 2a gagal ---
        if (itemsScrapedThisPage === 0) {
          const productRows = document.querySelectorAll('table tbody tr');
          productRows.forEach(row => {
            try {
              const cells = row.querySelectorAll('td');
              if (cells.length < 3) return;
              const productCell = cells[0] || cells[1];
              const nameEl = productCell.querySelector('a, [class*="name"], .product-name') || productCell;
              const nama_produk = nameEl ? nameEl.innerText.split('\n')[0].trim() : "";
              if (!nama_produk || nama_produk.length < 3 || seenIds.has(nama_produk)) return;
              
              const rowText = row.innerText || "";
              if (!rowText.match(/Rp\s?[\d.,]+/)) return;
              
              seenIds.add(nama_produk);
              
              const { harga_normal, harga_diskon } = extractPriceFromContainer(row);
              
              let stok = 0;
              if (cells[2]) stok = parseInt(cells[2].innerText.replace(/[^0-9]/g, ''), 10) || 0;
              
              allProducts.push({
                shopee_id: "P_" + nama_produk,
                nama_produk,
                harga_normal,
                harga_diskon,
                stok,
                jumlah_terjual: 0,
                kategori: "Katalog Shopee",
                deskripsi_singkat: "",
                link_produk: "https://shopee.co.id",
                varian_tersedia: []
              });
              itemsScrapedThisPage++;
            } catch (e) { /* skip */ }
          });
        }

        if (itemsScrapedThisPage === 0) {
            console.log("[ShopeeSync] Tidak ada produk baru di halaman ini. Selesai scraping DOM.");
            break;
        }

        // --- Coba cari tombol "Next" untuk ke halaman berikutnya ---
        hasNextPage = false;
        const nextBtn = findNextPageButton();

        if (nextBtn) {
            console.log("[ShopeeSync] Menemukan tombol Next, pindah ke halaman berikutnya...");
            nextBtn.click();
            hasNextPage = true;
        } else {
            console.log("[ShopeeSync] Tombol Next tidak ditemukan atau sedang di halaman terakhir.");
        }
      } // end while loop
    }
  } catch (e) {
    return { success: false, error: "Gagal mengambil data produk: " + e.message };
  }

  if (allProducts.length === 0) {
    return { success: false, error: "Tidak menemukan produk. Pastikan Anda berada di halaman Produk Saya dan produk sudah dimuat." };
  }

  // Sanitasi payload agar semua key terdefinisi secara lengkap & harga terbebas dari Model ID
  const sanitizedProducts = [];
  for (const p of allProducts) {
    let nama = String(p.nama_produk || "").trim();
    if (!nama || nama.length < 2) continue;
    nama = nama.replace(/^(SKU Induk|ID Produk|Model ID|Kode Variasi):?\s*/i, '').trim();
    if (!nama) continue;

    let hNormal = Number(p.harga_normal) || 0;
    let hDiskon = (p.harga_diskon && Number(p.harga_diskon) > 0) ? Number(p.harga_diskon) : null;

    if (hNormal >= 100000000 || hNormal < 0) hNormal = 0;
    if (hDiskon && (hDiskon >= 100000000 || hDiskon < 0)) hDiskon = null;

    // Bersihkan variasi terlebih dahulu
    const cleanVariations = [];
    if (Array.isArray(p.varian_tersedia)) {
      for (const v of p.varian_tersedia) {
        const vNama = typeof v === 'string' ? v.trim() : (v.nama ? String(v.nama).trim() : "");
        if (!vNama) continue;
        
        let vNormal = typeof v === 'object' ? (Number(v.harga_normal || v.harga) || 0) : 0;
        let vDiskon = typeof v === 'object' && v.harga_diskon ? Number(v.harga_diskon) : null;
        
        if (vNormal >= 100000000 || vNormal < 0) vNormal = 0;
        if (vDiskon && (vDiskon >= 100000000 || vDiskon < 0)) vDiskon = null;

        if (vDiskon !== null && vNormal > 0 && vDiskon >= vNormal) {
          vDiskon = null;
        }

        const vFinal = (vDiskon && vDiskon > 0) ? vDiskon : (vNormal > 0 ? vNormal : 0);

        cleanVariations.push({
          nama: vNama,
          harga: vFinal,
          harga_normal: vNormal > 0 ? vNormal : vFinal,
          harga_diskon: vDiskon,
          stok: typeof v === 'object' ? (parseInt(v.stok, 10) || 0) : 0,
          sku: typeof v === 'object' && v.sku ? String(v.sku) : undefined
        });
      }
    }

    // Jika harga parent masih 0 tapi ada variasi dengan harga valid, gunakan harga variasi
    if (hNormal <= 0 && cleanVariations.length > 0) {
      for (const cv of cleanVariations) {
        if (cv.harga_normal > 0 || cv.harga > 0) {
          hNormal = cv.harga_normal > 0 ? cv.harga_normal : cv.harga;
          hDiskon = cv.harga_diskon;
          break;
        }
      }
    }

    // Update variasi yang harga 0 dengan harga parent
    cleanVariations.forEach(cv => {
      if (cv.harga_normal <= 0 && hNormal > 0) {
        cv.harga_normal = hNormal;
        cv.harga = cv.harga_diskon || hNormal;
      }
    });

    if (hNormal === 0 && hDiskon && hDiskon > 0) {
      hNormal = hDiskon;
      hDiskon = null;
    }

    if (hDiskon !== null && hNormal > 0 && hDiskon >= hNormal) {
      hDiskon = null;
    }

    sanitizedProducts.push({
      shopee_id: String(p.shopee_id || `P_${nama}`),
      sku: p.sku ? String(p.sku) : null,
      nama_produk: nama,
      harga_normal: hNormal,
      harga_diskon: hDiskon,
      stok: parseInt(p.stok, 10) || 0,
      varian_tersedia: cleanVariations,
      deskripsi_singkat: String(p.deskripsi_singkat || ""),
      kategori: String(p.kategori || "Katalog Shopee"),
      jumlah_terjual: parseInt(p.jumlah_terjual, 10) || 0,
      link_produk: String(p.link_produk || `https://shopee.co.id`),
    });
  }

  // Kirim ke backend Laravel
  try {
    const cleanBaseUrl = (backendBaseUrl || "https://shopee.cs.norapadel.my.id").replace(/\/+$/, '');
    const res = await fetch(`${cleanBaseUrl}/api/products/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": "Bearer 1|L70K2sZN7LpBhUDiBYcqFKglwqzU0Kuo4ZdlTDbR753469dc" },
      body: JSON.stringify({ products: sanitizedProducts }),
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.message || errData.error || await res.text().catch(() => "") || "Unknown error";
        return { success: false, error: `Gagal mengirim (Error ${res.status}): ${errMsg}` };
    }
    const data = await res.json();
    
    let variationsCount = 0;
    allProducts.forEach(p => {
        if (p.varian_tersedia && p.varian_tersedia.length > 0) {
            variationsCount += p.varian_tersedia.length;
        }
    });
    
    return { success: true, count: allProducts.length, variations: variationsCount, pages: totalPages, method: usedMethod, message: data.message };
  } catch (e) {
    return { success: false, error: "Gagal terhubung ke server backend: " + e.message + ". Pastikan backend berjalan dan URL di extension benar." };
  }
}

async function triggerSync() {
  syncBtn.disabled = true;
  syncBtn.textContent = "⏳ SINKRONISASI BERJALAN...";
  syncStatusMsg.textContent = "Mengambil data produk dari Shopee...";
  syncStatusMsg.style.color = "#555";

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url.includes("seller.shopee.co.id")) {
      throw new Error("Buka halaman Shopee Seller Center terlebih dahulu.");
    }

    const baseUrl = getBackendBaseUrl();
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: syncProductsInjected,
      args: [baseUrl]
    });

    const response = results[0]?.result;

    if (response && response.success) {
      syncStatusMsg.style.display = "block";
      syncStatusMsg.style.color = "green";
      
      let varianText = (response.variations && response.variations > 0) ? ` dan ${response.variations} variasi` : "";
      syncStatusMsg.innerHTML = `✓ Berhasil sinkronisasi ${response.count} produk${varianText} (via ${response.method === "api" ? "API" : "halaman"})!`;
      
      setTimeout(() => {
        syncStatusMsg.style.display = "none";
      }, 5000);
    } else {
      syncStatusMsg.style.display = "block";
      syncStatusMsg.style.color = "#dc3545";
      syncStatusMsg.innerHTML = `❌ Gagal: ${response?.error || 'Error tidak diketahui'}`;
    }
  } catch (error) {
    syncBtn.disabled = false;
    syncBtn.textContent = "SINKRONISASI PRODUK SHOPEE";
    syncStatusMsg.style.display = "block";
    syncStatusMsg.style.color = "#dc3545";
    syncStatusMsg.innerHTML = `❌ Error: ${error.message}`;
  } finally {
    if (syncBtn.disabled) {
        syncBtn.disabled = false;
        syncBtn.textContent = "SINKRONISASI PRODUK SHOPEE";
    }
  }
}

mainToggleBtn.addEventListener("click", toggleAutoReply);
syncBtn.addEventListener("click", triggerSync);
document.addEventListener("DOMContentLoaded", loadSettings);
