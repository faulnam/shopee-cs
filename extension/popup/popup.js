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

async function fetchPrompts() {
  try {
    const res = await fetch("https://shopee.cs.norapade.my.id/api/prompts", {
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
  isAutoReplyEnabled = !!settings.autoReplyEnabled;
  toneTypeSelect.value = settings.toneType || "1";
  customToneInput.value = settings.customTone || "";
  replySpeedSelect.value = settings.replySpeed || "normal";
  extraContextInput.value = settings.extraContext || "";
  toggleCustomTone();
  updateButtonUI();
}

async function init() {
  await fetchPrompts();
  await loadSettings();
}

init();

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
      console.log(`[ShopeeSync] API gagal atau tidak mendapat produk. Jatuh kembali ke DOM Scraping otomatis dengan pagination.`);
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
          let container = el;
          for (let i = 0; i < 8; i++) {
            if (!container.parentElement) break;
            if (container.parentElement.tagName === 'BODY' || container.parentElement.tagName === 'MAIN') break;
            container = container.parentElement;
            if ((container.innerText || "").match(/Rp\s?[\d.,]+/) && container.innerText.length < 1500) break;
          }

          const fullText = container.innerText || "";
          if (fullText.length > 2000) return;

          const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

          let nama_produk = "";
          for (const line of lines) {
            const l = line.trim();
            // Skip UI labels that are prefixes
            if (l.match(/^(SKU Induk|ID Produk|Model ID|Kode Variasi|Batas Maks|Lihat Semua)/i)) continue;
            
            // Skip Exact UI labels (case insensitive)
            const exactSkip = ["produk", "harga", "stok", "performa", "aksi", "semua", "live", "perlu tindakan", "sedang ditinjau shopee", "belum ditampilkan", "analisis produk", "ubah", "iklankan", "lainnya", "beranda", "pesanan saya", "produk saya", "tambah produk baru", "optimasi ai", "produk potensial", "habis"];
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

            nama_produk = l;
            break;
          }

          if (!nama_produk) return;

          let harga_normal = 0;
          const priceMatch = fullText.match(/Rp\s?([\d.,]+)/);
          if (priceMatch) {
            harga_normal = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
          }

          let stok = 0;
          const stockMatch = fullText.match(/(?:stok|stock|habis)[:\s]*(\d+)/i);
          if (stockMatch) {
            stok = parseInt(stockMatch[1], 10) || 0;
          } else if (fullText.toLowerCase().includes('habis')) {
            stok = 0;
          } else {
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

          let sku = "";
          const skuMatch = fullText.match(/SKU[^:]*:\s*(.+)/i);
          if (skuMatch) sku = skuMatch[1].split('\n')[0].trim();

          let jumlah_terjual = 0;
          const soldMatch = fullText.match(/Penjualan\s+(\d+)/i);
          if (soldMatch) jumlah_terjual = parseInt(soldMatch[1], 10) || 0;

          const isParent = fullText.includes("ID Produk:");
          
          // Gunakan ID unik untuk mencegah duplikasi (karena nama produk bisa sama)
          let uniqueId = "";
          if (isParent) {
              const idm = fullText.match(/ID Produk:\s*(\d+)/i);
              uniqueId = idm ? "P_" + idm[1] : "P_" + nama_produk;
          } else {
              const idm = fullText.match(/Model ID:\s*(\d+)/i);
              uniqueId = idm ? "V_" + idm[1] : "V_" + nama_produk;
          }
          
          if (seenIds.has(uniqueId)) return;
          seenIds.add(uniqueId);
          
          if (isParent) {
            const newProduct = {
              shopee_id: uniqueId,
              nama_produk: nama_produk,
              sku: sku || undefined,
              harga_normal: harga_normal,
              harga_diskon: null,
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
              lastParentProduct.varian_tersedia.push({
                nama: nama_produk,
                harga: harga_normal,
                stok: stok,
                sku: sku || undefined
              });
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
              
              let harga_normal = 0;
              const priceMatch = rowText.match(/Rp\s?([\d.,]+)/);
              if (priceMatch) harga_normal = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.')) || 0;
              
              let stok = 0;
              if (cells[2]) stok = parseInt(cells[2].innerText.replace(/[^0-9]/g, ''), 10) || 0;
              
              allProducts.push({
                shopee_id: "P_" + nama_produk,
                nama_produk,
                harga_normal,
                harga_diskon: null,
                stok,
                jumlah_terjual: 0,
                kategori: "Katalog Shopee",
                deskripsi_singkat: "",
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
        const allBtns = Array.from(document.querySelectorAll('button'));
        
        let nextBtn = null;
        for (const btn of allBtns) {
            // Abaikan tombol yang disabled
            if (btn.disabled || btn.classList.contains('disabled') || btn.getAttribute('disabled') !== null) continue;
            
            const parentText = btn.parentElement ? (btn.parentElement.innerText || "") : "";
            
            // Cek apakah tombol ini berada di dekat teks indikator halaman (contoh: "1 / 2")
            if (parentText.match(/\d+\s*\/\s*\d+/)) {
                // Biasanya tombol Next adalah tombol terakhir di container pagination
                const siblingBtns = btn.parentElement.querySelectorAll('button');
                if (siblingBtns.length >= 2 && siblingBtns[siblingBtns.length - 1] === btn) {
                    nextBtn = btn;
                    break;
                }
                
                // Atau mencari ikon panah kanan
                if (btn.innerHTML.includes('right') || btn.innerHTML.includes('M10 5L15 10L10 15')) {
                    nextBtn = btn;
                    break;
                }
            }
        }

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

  // Kirim ke backend Laravel
  try {
    const res = await fetch("https://shopee.cs.norapade.my.id/api/products/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer 1|L70K2sZN7LpBhUDiBYcqFKglwqzU0Kuo4ZdlTDbR753469dc" },
      body: JSON.stringify({ products: allProducts }),
    });
    if (!res.ok) return { success: false, error: `Gagal mengirim ke server (Error ${res.status}). Pastikan backend berjalan dan URL di extension benar.` };
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
