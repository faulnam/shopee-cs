const toneTypeSelect = document.getElementById("toneType");
const customToneContainer = document.getElementById("customToneContainer");
const customToneInput = document.getElementById("customTone");
const replySpeedSelect = document.getElementById("replySpeed");
const extraContextInput = document.getElementById("extraContext");
const mainToggleBtn = document.getElementById("mainToggleBtn");
const statusMsg = document.getElementById("statusMsg");

let isAutoReplyEnabled = false;

function toggleCustomTone() {
  if (toneTypeSelect.value === "custom") {
    customToneContainer.style.display = "block";
  } else {
    customToneContainer.style.display = "none";
  }
}

toneTypeSelect.addEventListener("change", toggleCustomTone);

function updateButtonUI() {
  if (isAutoReplyEnabled) {
    mainToggleBtn.textContent = "BERHENTIKAN AUTO-REPLY";
    mainToggleBtn.className = "btn-stop";
  } else {
    mainToggleBtn.textContent = "MULAI AUTO-REPLY";
    mainToggleBtn.className = "btn-start";
  }
}

async function loadSettings() {
  const settings = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  isAutoReplyEnabled = !!settings.autoReplyEnabled;
  toneTypeSelect.value = settings.toneType || "ramah";
  customToneInput.value = settings.customTone || "";
  replySpeedSelect.value = settings.replySpeed || "normal";
  extraContextInput.value = settings.extraContext || "";
  toggleCustomTone();
  updateButtonUI();
}

async function toggleAutoReply() {
  isAutoReplyEnabled = !isAutoReplyEnabled;
  updateButtonUI();
  
  await chrome.runtime.sendMessage({
    type: "SET_SETTINGS",
    payload: {
      autoReplyEnabled: isAutoReplyEnabled,
      toneType: toneTypeSelect.value,
      customTone: customToneInput.value.trim(),
      replySpeed: replySpeedSelect.value,
      extraContext: extraContextInput.value.trim(),
    },
  });

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
async function syncProductsInjected() {
  const allProducts = [];
  let totalPages = 1;
  const pageSize = 20;
  let usedMethod = "api";

  try {
    // === METODE 1: Shopee Internal API (dengan pagination) ===
    const apiEndpoints = [
      `/api/v3/product/search_product/?page_number=1&page_size=${pageSize}&source=seller_center&sort_by=ctime&sort_direction=2`,
      `/api/v3/product/search_product_v2/?page_number=1&page_size=${pageSize}&source=seller_center`,
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
          } catch (e) { console.error(`Gagal fetch halaman ${page}:`, e); }
        }
        break;
      } catch (e) { continue; }
    }

    // === METODE 2: Fallback DOM Scraping ===
    if (!apiWorked || allProducts.length === 0) {
      usedMethod = "dom";
      const seenNames = new Set();

      // --- Strategi 2a: Cari elemen TERDALAM yang mengandung "ID Produk:" (paling akurat) ---
      // Kita hanya ambil elemen paling spesifik, bukan parent-parentnya yang juga mengandung teks sama
      const allElems = document.querySelectorAll('*');
      const productMarkers = [];
      allElems.forEach(el => {
        const text = el.innerText || "";
        if (!text.includes("ID Produk:")) return;
        // Skip jika ada child yang juga mengandung "ID Produk:" (artinya ini parent, bukan elemen terdalam)
        const childHasMarker = Array.from(el.children).some(child => (child.innerText || "").includes("ID Produk:"));
        if (childHasMarker) return;
        productMarkers.push(el);
      });

      productMarkers.forEach(el => {
        // el adalah elemen terdalam yang mengandung "ID Produk:"
        // Cari elemen yang mengandung "ID Produk:" — ini pasti baris produk Shopee

        // Naik ke container terdekat yang memuat seluruh baris produk
        let container = el;
        for (let i = 0; i < 8; i++) {
          if (!container.parentElement) break;
          container = container.parentElement;
          // Berhenti jika container sudah cukup besar (mengandung harga Rp)
          if ((container.innerText || "").match(/Rp\s?[\d.,]+/)) break;
        }

        const fullText = container.innerText || "";
        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Cari nama produk: baris pertama yang bukan SKU/ID/Model/checkbox/header
        let nama_produk = "";
        for (const line of lines) {
          if (line.match(/^(SKU|ID Produk|Model ID|Produk|Harga|Stok|Performa|Akt|Live|Semua|Perlu)/i)) continue;
          if (line.match(/^(Ubah|Iklankan|Lainnya|Fix|Penjualan|Kunjungan|Masalah)/i)) continue;
          if (line.match(/^\d+$/) || line.length < 3) continue;
          if (line.match(/Rp\s?[\d.,]+/)) continue;
          nama_produk = line;
          break;
        }

        if (!nama_produk || seenNames.has(nama_produk)) return;
        seenNames.add(nama_produk);

        // Cari harga
        let harga_normal = 0;
        const priceMatch = fullText.match(/Rp\s?([\d.,]+)/);
        if (priceMatch) {
          harga_normal = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
        }

        // Cari stok (angka di dekat kata "Stok" atau angka besar standalone)
        let stok = 0;
        const stockMatch = fullText.match(/(?:stok|stock)[:\s]*(\d+)/i);
        if (stockMatch) {
          stok = parseInt(stockMatch[1], 10) || 0;
        } else {
          // Cari angka standalone yang bukan ID dan bukan harga
          for (const line of lines) {
            if (line.match(/^(\d{1,5})$/) && !line.match(/ID/) && parseInt(line) < 100000) {
              const num = parseInt(line, 10);
              if (num > 0 && num < 100000 && num !== harga_normal) {
                stok = num;
                break;
              }
            }
          }
        }

        // Cari SKU
        let sku = "";
        const skuMatch = fullText.match(/SKU[^:]*:\s*(.+)/i);
        if (skuMatch) sku = skuMatch[1].split('\n')[0].trim();

        // Cari jumlah terjual
        let jumlah_terjual = 0;
        const soldMatch = fullText.match(/Penjualan\s+(\d+)/i);
        if (soldMatch) jumlah_terjual = parseInt(soldMatch[1], 10) || 0;

        allProducts.push({
          sku,
          nama_produk,
          harga_normal,
          harga_diskon: null,
          stok,
          jumlah_terjual,
          kategori: "Katalog Shopee",
          deskripsi_singkat: "",
        });
      });

      // --- Strategi 2b: Fallback table row jika 2a gagal ---
      if (allProducts.length === 0) {
        const productRows = document.querySelectorAll('table tbody tr');
        productRows.forEach(row => {
          try {
            const cells = row.querySelectorAll('td');
            if (cells.length < 3) return;
            const productCell = cells[0] || cells[1];
            const nameEl = productCell.querySelector('a, [class*="name"], .product-name') || productCell;
            const nama_produk = nameEl ? nameEl.innerText.split('\n')[0].trim() : "";
            if (!nama_produk || nama_produk.length < 3 || seenNames.has(nama_produk)) return;
            // Harus ada harga Rp di baris ini, kalau tidak maka ini bukan baris produk
            const rowText = row.innerText || "";
            if (!rowText.match(/Rp\s?[\d.,]+/)) return;
            seenNames.add(nama_produk);
            let harga_normal = 0;
            const priceMatch = rowText.match(/Rp\s?([\d.,]+)/);
            if (priceMatch) harga_normal = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
            let stok = 0;
            if (cells[2]) stok = parseInt(cells[2].innerText.replace(/[^0-9]/g, ''), 10) || 0;
            allProducts.push({ nama_produk, harga_normal, harga_diskon: null, stok, jumlah_terjual: 0, kategori: "Katalog Shopee", deskripsi_singkat: "" });
          } catch (e) { /* skip */ }
        });
      }
    }
  } catch (e) {
    return { success: false, error: "Gagal mengambil data produk: " + e.message };
  }

  if (allProducts.length === 0) {
    return { success: false, error: "Tidak menemukan produk. Pastikan Anda berada di halaman Produk Saya dan produk sudah dimuat." };
  }

  // Kirim ke backend Laravel
  try {
    const res = await fetch("https://shopee.cs.norapadel.my.id/api/products/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer 1|L70K2sZN7LpBhUDiBYcqFKglwqzU0Kuo4ZdlTDbR753469dc" },
      body: JSON.stringify({ products: allProducts }),
    });
    if (!res.ok) return { success: false, error: `Gagal mengirim ke server (Error ${res.status}). Pastikan php artisan serve berjalan.` };
    const data = await res.json();
    return { success: true, count: allProducts.length, pages: totalPages, method: usedMethod, message: data.message };
  } catch (e) {
    return { success: false, error: "Gagal terhubung ke server backend: " + e.message + ". Pastikan php artisan serve berjalan." };
  }
}

function parseApiProduct(item) {
  try {
    const nama = item.name || item.item_name || item.product_name || "";
    if (!nama) return null;
    const price = item.price || item.original_price || item.price_info?.original_price || 0;
    const normalizedPrice = price > 100000 ? Math.round(price / 100000) : price;
    const discountPrice = item.discount_price || item.price_info?.current_price || null;
    const normalizedDiscount = discountPrice ? (discountPrice > 100000 ? Math.round(discountPrice / 100000) : discountPrice) : null;
    return {
      sku: item.item_sku || item.sku || "",
      nama_produk: nama,
      harga_normal: normalizedPrice,
      harga_diskon: normalizedDiscount,
      stok: item.stock || item.total_stock || item.stock_info?.total_available_stock || 0,
      varian_tersedia: item.variations?.map(v => v.name) || item.tier_variation?.map(v => v.name) || [],
      deskripsi_singkat: (item.description || item.item_description || "").substring(0, 500),
      kategori: item.category_name || item.category?.display_name || "Katalog Shopee",
      jumlah_terjual: item.sold || item.historical_sold || item.sales || 0,
      link_produk: item.item_id ? `https://shopee.co.id/product/${item.shop_id}/${item.item_id}` : "",
    };
  } catch (e) { return null; }
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

    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: syncProductsInjected,
    });

    const response = results[0]?.result;

    if (response && response.success) {
      const methodInfo = response.method === "api" ? " (via API)" : " (via halaman)";
      const pageInfo = response.pages > 1 ? ` dari ${response.pages} halaman` : "";
      syncStatusMsg.textContent = `✅ Berhasil sinkronisasi ${response.count} produk${pageInfo}${methodInfo}!`;
      syncStatusMsg.style.color = "green";
    } else if (response) {
      syncStatusMsg.textContent = `❌ Gagal: ${response.error}`;
      syncStatusMsg.style.color = "#dc3545";
    } else {
      syncStatusMsg.textContent = "❌ Gagal: Tidak ada respon dari halaman.";
      syncStatusMsg.style.color = "#dc3545";
    }
  } catch (error) {
    syncStatusMsg.textContent = "❌ Error: " + error.message;
    syncStatusMsg.style.color = "#dc3545";
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = "SINKRONISASI PRODUK SHOPEE";
    setTimeout(() => {
      if (syncStatusMsg.textContent.includes("Berhasil")) syncStatusMsg.textContent = "";
    }, 8000);
  }
}

mainToggleBtn.addEventListener("click", toggleAutoReply);
syncBtn.addEventListener("click", triggerSync);
document.addEventListener("DOMContentLoaded", loadSettings);
