// content_script.js
// Jalan di halaman Shopee Seller Center webchat.
// Fitur: Auto-reply + Auto-cycle ke semua chat yang belum dibalas.

const SELECTORS = {
  // Chat area (percakapan yang sedang dibuka)
  chatMessage: '[data-testid="chat-message"], [data-cy="webchat-message-receive"], [data-cy="webchat-message-send"], .message-item, .chat-message, div[class*="message-bubble"], div[class*="message-content"]',   
  messageText: '.message-text, pre, span, p, div[dir="auto"]',                   
  buyerBubbleClass: 'is-buyer, [class*="receive"]',                    
  chatInput: '[data-testid="chat-input"], textarea, [contenteditable="true"]',         
  sendButton: '[data-testid="chat-send-btn"], button[type="submit"], [aria-label*="send"], [aria-label*="kirim"], button i[class*="send"]',     
  customerName: '.nickname, [data-testid="chat-header-title"], [data-cy="webchat-header-name"], [class*="header-title"]',
  imageMessage: 'img.message-image, [data-testid="image-message"], [data-cy="webchat-message-image"], img[class*="image"]',
  orderMessage: '.order-card, [data-testid="order-card"], [data-cy="webchat-message-order"], [class*="order-card"]',
  
  // Sidebar chat list (daftar percakapan di sebelah kiri)
  chatListItem: '.shopee-chat__chat-list__chat-item, [class*="chat-item"], [class*="conversation-item"], [data-cy*="chat-item"]',
  chatListUnread: '.shopee-chat__chat-list__chat-item--unread, [class*="unread"], [class*="badge"]',
  chatListPreview: '.shopee-chat__chat-list__chat-item__latest-msg, [class*="latest-msg"], [class*="preview"]',
  chatListName: '.shopee-chat__chat-list__chat-item__nickname, [class*="nickname"]',
};

let lastProcessedMessage = null;
let isProcessing = false;
let repliedConversations = new Set(); // Track percakapan yang sudah dibalas per sesi
let autoCycleInterval = null;

// Human Handover Logic
let lastHumanActivityTime = 0;

// Cek apakah extension context masih valid
function isExtensionContextValid() {
  try {
    return !!chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

document.addEventListener('keydown', (e) => {
  if (!isProcessing && e.target.closest(SELECTORS.chatInput)) {
    lastHumanActivityTime = Date.now();
  }
}, true);

document.addEventListener('click', (e) => {
  if (!isProcessing && e.target.closest(SELECTORS.sendButton)) {
    lastHumanActivityTime = Date.now();
    setTimeout(() => {
      const history = extractChatHistory();
      const latest = getLatestCustomerMessage(history);
      if (latest) lastProcessedMessage = latest.text;
    }, 500);
  }
}, true);

function isHumanHandoverActive() {
  return (Date.now() - lastHumanActivityTime) < 60000;
}

function log(payload) {
  if (!isExtensionContextValid()) return;
  try {
    chrome.runtime.sendMessage({ type: "LOG_EVENT", payload });
  } catch (e) {
    console.log("[ShopeeCSBot]", payload);
  }
}

async function getSettings() {
  if (!isExtensionContextValid()) {
    console.warn("[ShopeeCSBot] Extension context invalidated.");
    return null;
  }
  try {
    const settings = await chrome.storage.local.get([
      'autoReplyEnabled', 'toneType', 'customTone', 'replySpeed', 'extraContext'
    ]);
    return {
      autoReplyEnabled: settings.autoReplyEnabled ?? false,
      toneType: settings.toneType ?? 'ramah',
      customTone: settings.customTone ?? '',
      replySpeed: settings.replySpeed ?? 'normal',
      extraContext: settings.extraContext ?? '',
    };
  } catch (e) {
    console.warn("[ShopeeCSBot] Gagal membaca settings:", e.message);
    return null;
  }
}

function extractChatHistory() {
  const nodes = document.querySelectorAll(SELECTORS.chatMessage);
  return Array.from(nodes).map((el) => {
    const isCustomer = el.classList.contains(SELECTORS.buyerBubbleClass) || el.getAttribute('data-cy') === 'webchat-message-receive';
    
    let textNode = el.querySelector('.message-text, pre, [dir="auto"]') || el;
    let text = textNode.innerText || textNode.textContent || "";
    text = text.trim();
    
    // Hapus timestamp seperti "13:27" di akhir teks jika ada
    text = text.replace(/\s*\n?\d{1,2}:\d{2}$/, '').trim();
    
    if (el.querySelector(SELECTORS.imageMessage)) {
      text = "[Pelanggan mengirim Gambar/Foto]";
    }
    if (el.querySelector(SELECTORS.orderMessage)) {
      text = "[Pelanggan membagikan detail Pesanan/Order]";
    }

    return { sender: isCustomer ? "customer" : "bot", text };
  }).filter((m) => m.text.length > 0);
}

function getLatestCustomerMessage(history) {
  // Fitur Rangkum: Gabungkan SEMUA pesan customer terakhir yang belum dibalas bot
  let combinedText = [];
  
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].sender === "customer") {
      combinedText.unshift(history[i].text);
    } else {
      break; // Berhenti ketika menemukan pesan dari bot
    }
  }

  if (combinedText.length > 0) {
    // Gabungkan dengan pemisah koma/spasi agar AI membacanya sebagai satu pertanyaan utuh
    return { text: combinedText.join(" | ") };
  }
  
  return null;
}

function getConversationIdFromUrl() {
  const match = window.location.href.match(/conversation[_-]?id=([\w-]+)/i);
  if (match) return match[1];

  // Fallback if URL doesn't contain conversation_id (common in SPAs like Shopee Webchat)
  const customerName = getCustomerName();
  // Create a unique ID based on customer name so each user has their own chat history
  return "chat_" + customerName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
}

function getCustomerName() {
  const el = document.querySelector(SELECTORS.customerName);
  let name = el ? el.innerText.trim() : "";
  
  if (!name || name === "Kakak") {
      // Fallback: cari di dalam item chat yang sedang aktif di sebelah kiri
      const activeChatItem = document.querySelector('.shopee-chat__chat-list__chat-item--active [class*="nickname"], [class*="chat-item"][class*="active"] [class*="nickname"]');
      if (activeChatItem && activeChatItem.innerText.trim().length > 0) {
          name = activeChatItem.innerText.trim();
      } else {
          // Fallback kedua: cari elemen teks tebal di header chat tengah
          const header = document.querySelector('[class*="header"] [class*="name"], [class*="header"] span, .conversation-header span');
          if (header && header.innerText.length > 0) {
              name = header.innerText.trim();
          }
      }
  }
  
  // Shopee webchat punya tab default 'Semua Chat' tanpa percakapan terpilih
  if (name.includes("Belum Dibalas") || name.includes("Semua Chat")) {
      name = "Tanpa Nama";
  }
  
  return name || "Kakak";
}

async function sendToBackend(settings, customerMessage, history, conversationId, customerName) {
  const backendUrl = "http://127.0.0.1:8000/api/reply";
  const apiToken = "1|L70K2sZN7LpBhUDiBYcqFKglwqzU0Kuo4ZdlTDbR753469dc";
  
  const requestTone = settings.toneType === 'custom' ? settings.customTone : settings.toneType;

  const res = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      customer_message: customerMessage,
      chat_history: history.slice(-10),
      conversation_id: conversationId,
      tone: requestTone,
      customer_name: customerName,
      extra_context: settings.extraContext || "",
    }),
  });

  if (!res.ok) {
    throw new Error(`Backend error: ${res.status}`);
  }

  const data = await res.json();
  return data.reply;
}

// =========================================================================
// INJECT & SEND - Mengetik dan mengirim balasan di chat
// =========================================================================
function injectAndSend(replyText, speedOption) {
  return new Promise((resolve) => {
    let attempts = 0;
    
    // Polling setiap 500ms (maks 10 kali / 5 detik) untuk menunggu loading UI chat selesai
    const findInputInterval = setInterval(() => {
      const inputBox = document.querySelector(SELECTORS.chatInput);
      const sendButton = document.querySelector(SELECTORS.sendButton);

      if (inputBox || attempts >= 10) {
        clearInterval(findInputInterval);
        
        if (!inputBox) {
          log({ level: "error", message: "Input box tidak ditemukan (Loading chat terlalu lama)." });
          isProcessing = false; // Pastikan status dikembalikan agar tidak stuck
          resolve(false);
          return;
        }

        inputBox.focus();
        document.execCommand("insertText", false, replyText);

        let baseDelay = 1000;
        let randomAdd = 1000;
        if (speedOption === 'fast') {
            baseDelay = 500;
            randomAdd = 500; // 0.5-1 dtk
        } else if (speedOption === 'slow') {
            baseDelay = 2000;
            randomAdd = 2000; // 2-4 dtk
        }
        
        const finalDelay = baseDelay + Math.random() * randomAdd;
        
        setTimeout(() => {
          if (sendButton) {
            sendButton.click();
          } else {
            const enterEvent = new KeyboardEvent('keydown', {
              bubbles: true, cancelable: true, keyCode: 13, key: 'Enter', code: 'Enter'
            });
            inputBox.dispatchEvent(enterEvent);
          }
          // isProcessing = false; // Dihapus, akan dihandle oleh try...finally di handleNewMessages
          resolve(true);
        }, finalDelay);
      }
      attempts++;
    }, 500);
  });
}

async function sendProductCard(keyword) {
  console.log("[ShopeeCSBot] Memulai pengiriman kartu produk untuk:", keyword);
  
  // 1. Klik tab "PRODUK"
  const tabs = Array.from(document.querySelectorAll('div, span, button'));
  const produkTab = tabs.find(el => el.innerText && el.innerText.trim() === 'PRODUK');
  if (produkTab) {
      simulateClick(produkTab);
      await new Promise(r => setTimeout(r, 500));
  }
  
  // 2. Klik tab "Semua" di dalam panel Produk
  const subTabs = Array.from(document.querySelectorAll('div, span, button'));
  const semuaTab = subTabs.find(el => el.innerText && el.innerText.trim() === 'Semua' && el.children.length === 0);
  if (semuaTab) {
      simulateClick(semuaTab);
      await new Promise(r => setTimeout(r, 1000));
  }
  
  // 3. Ketik di "Cari Nama Produk"
  const searchInput = document.querySelector('input[placeholder*="Cari Nama Produk"]');
  if (searchInput) {
      searchInput.focus();
      // Hapus value lama (simulasi hapus manual)
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Ketik value baru menggunakan document.execCommand untuk React
      searchInput.focus();
      document.execCommand('insertText', false, keyword);
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Tunggu hasil pencarian muncul
      await new Promise(r => setTimeout(r, 2000));
  } else {
      console.warn("[ShopeeCSBot] Kolom pencarian produk tidak ditemukan!");
      return;
  }
  
  // 4. Klik tombol "Kirim"
  const allKirim = Array.from(document.querySelectorAll('button, span, div'))
      .filter(el => el.innerText && el.innerText.trim() === 'Kirim' && el.children.length === 0);
  
  if (allKirim.length > 0) {
      console.log(`[ShopeeCSBot] Ditemukan ${allKirim.length} tombol Kirim. Mengklik maksimal 3 produk unik.`);
      let count = 0;
      const clickedY = new Set();
      
      for (let btn of allKirim) {
          if (count >= 1) break; // Hanya kirim 1 produk saja
          const rect = btn.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue; // Elemen tersembunyi
          
          const yPos = Math.round(rect.top);
          
          // Cek apakah ada tombol lain di baris (Y) yang sama yang sudah diklik
          let isDuplicate = false;
          for (let prevY of clickedY) {
              if (Math.abs(prevY - yPos) < 15) { // Toleransi 15px
                  isDuplicate = true;
                  break;
              }
          }
          
          if (!isDuplicate) {
              simulateClick(btn);
              clickedY.add(yPos);
              count++;
              await new Promise(r => setTimeout(r, 800)); // jeda antar kirim
          }
      }
  } else {
      console.warn("[ShopeeCSBot] Tombol Kirim tidak ditemukan untuk pencarian ini.");
  }
}

// =========================================================================
// HANDLE NEW MESSAGES - Proses pesan baru di percakapan yang sedang dibuka
// =========================================================================
async function handleNewMessages() {
  if (isProcessing || isHumanHandoverActive()) return false;
  isProcessing = true; // Langsung kunci state di awal fungsi (sync) untuk mencegah race condition
  
  try {
    if (!isExtensionContextValid()) return false;

    const settings = await getSettings();
    if (!settings || !settings.autoReplyEnabled) return false;

    const history = extractChatHistory();
    const latest = getLatestCustomerMessage(history);

    if (!latest || latest.text === lastProcessedMessage) return false;

    // Cek apakah pesan terakhir di history sudah dari bot (artinya sudah dibalas)
    if (history.length > 0 && history[history.length - 1].sender === 'bot') {
      lastProcessedMessage = latest.text;
      return false; // Sudah dibalas
    }

    lastProcessedMessage = latest.text;

    const conversationId = getConversationIdFromUrl();
    const customerName = getCustomerName();
    
    const reply = await sendToBackend(settings, latest.text, history, conversationId, customerName);
    if (reply) {
      let textToType = reply;
      let productKeyword = null;
      
      const productMatch = reply.match(/\[SEND_PRODUCT:\s*(.+?)\]/i);
      if (productMatch) {
          productKeyword = productMatch[1].trim();
          textToType = reply.replace(productMatch[0], '').trim();
      }

      if (textToType.length > 0) {
          const success = await injectAndSend(textToType, settings.replySpeed || 'normal');
          if (!success) {
             return false;
          }
      } else {
          await new Promise(r => setTimeout(r, 1000));
      }
      
      if (productKeyword) {
          await sendProductCard(productKeyword);
      }

      // Tandai percakapan ini sudah dibalas
      repliedConversations.add(conversationId);
      log({ level: "info", message: `Balasan terkirim ke ${customerName}`, reply });
      return true;
    } else {
      return false;
    }
  } catch (err) {
    log({ level: "error", message: "Gagal memproses balasan", error: String(err) });
    return false;
  } finally {
    isProcessing = false; // Pastikan lock selalu dilepas pada akhirnya
  }
}

// =========================================================================
// AUTO-CYCLE - Otomatis pindah ke chat yang belum dibalas
// =========================================================================

function findUnrepliedChatItems() {
  const unreplied = [];

  // Gunakan Data-CY spesifik dari React Shopee berdasarkan screenshot
  const chatRoots = document.querySelectorAll('[data-cy="webchat-conversation-cell-root"]');
  
  if (chatRoots.length > 0) {
    chatRoots.forEach(root => {
      // Cari badge (angka merah) di dalam row ini
      let isUnread = false;
      const potentialBadges = root.querySelectorAll('div, span');
      
      for (let el of potentialBadges) {
        const className = (el.className || '').toString().toLowerCase();
        const text = el.innerText ? el.innerText.trim() : '';
        
        let isBadge = className.includes('unread') || className.includes('badge') || className.includes('notify');
        
        if (text.match(/^\d+$/) && text.length < 4) {
          const style = window.getComputedStyle(el);
          // Cek warna merah Shopee (#EE4D2D -> rgb(238, 77, 45))
          if (style.backgroundColor.includes('238, 77, 45') || 
              style.backgroundColor.includes('255, 66, 79') ||
              style.color.includes('238, 77, 45')) {
              isBadge = true;
          }
        }
        
        if (isBadge && (text === '' || text.match(/^\d+$/))) {
            isUnread = true;
            break;
        }
      }

      // Biasanya kalau sudah diklik/dibuka, Shopee otomatis menghilangkan badge merahnya.
      // Jadi kalau ada badge, berarti pasti belum dibaca.
      if (isUnread) {
        unreplied.push(root);
      }
    });
  } else {
    // Fallback jika Shopee menghilangkan atribut data-cy di masa depan
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.closest('header') || el.closest('[class*="header"]') || el.closest('[class*="navbar"]')) return;
      
      const className = (el.className || '').toString().toLowerCase();
      const text = el.innerText ? el.innerText.trim() : '';
      let isBadge = className.includes('badge') || className.includes('unread-count');
      
      if (!isBadge && text.match(/^\d+$/) && text.length < 3) {
         const style = window.getComputedStyle(el);
         if (style.backgroundColor === 'rgb(238, 77, 45)' || style.backgroundColor === 'rgb(255, 66, 79)') {
             isBadge = true;
         }
      }

      if (isBadge) {
         const container = el.closest('div[role="rowgroup"], div[role="button"], li, [class*="item"]');
         if (container && !unreplied.includes(container)) {
            unreplied.push(container);
         }
      }
    });
  }

  return unreplied;
}

// Fungsi untuk mensimulasikan klik native React yang sangat agresif
function simulateClick(element) {
  if (!element) return;
  try {
    const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    events.forEach(eventType => {
      element.dispatchEvent(new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        buttons: 1
      }));
    });
    element.click(); // Standard click as fallback
  } catch(e) {
    console.error("Gagal click element", e);
  }
}

function aggressiveClick(element) {
  // Klik elemen itu sendiri
  simulateClick(element);
  // Klik parent-parentnya (maksimal 4 level ke atas) untuk memastikan event listener React terpicu
  let current = element.parentElement;
  let count = 0;
  while (current && count < 4) {
    simulateClick(current);
    current = current.parentElement;
    count++;
  }
}

/**
 * Fungsi utama auto-cycle:
 * Mencari chat belum dibalas → klik → tunggu load → balas → pindah
 */
async function autoCycleUnrepliedChats() {
  if (isProcessing || isHumanHandoverActive()) return;
  if (!isExtensionContextValid()) return;

  const settings = await getSettings();
  if (!settings || !settings.autoReplyEnabled) return;

  // Cari chat yang belum dibalas di sidebar
  const unrepliedItems = findUnrepliedChatItems();
  
  if (unrepliedItems.length === 0) {
    // Tidak ada chat yang belum dibalas, cek percakapan saat ini saja
    return;
  }

  console.log(`[ShopeeCSBot] Ditemukan ${unrepliedItems.length} chat belum dibalas, memproses...`);

  // Ambil item pertama yang belum dibalas
  const targetItem = unrepliedItems[0];
  
  // Klik agresif pada target dan semua parent-nya
  aggressiveClick(targetItem);
  
  log({ level: "info", message: `Auto-cycle: Membuka percakapan belum dibalas (${unrepliedItems.length} tersisa)` });

  // Tunggu UI termuat (dipercepat menjadi 1 detik)
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Reset lastProcessedMessage agar handleNewMessages() bisa berjalan
  lastProcessedMessage = null;

  // Proses pesan baru di percakapan ini
  await handleNewMessages();
}

// =========================================================================
// MUTATION OBSERVER + AUTO-CYCLE INTERVAL
// =========================================================================

// Observer untuk mendeteksi perubahan DOM (pesan baru masuk di chat yang sedang dibuka)
const observer = new MutationObserver(() => {
  handleNewMessages();
});

observer.observe(document.body, { childList: true, subtree: true });

// Auto-cycle: cek setiap 3 detik agar sangat responsif
let processingTimeout = null;
autoCycleInterval = setInterval(async () => {
  // Reset stuck state jika isProcessing terlalu lama (> 15 detik)
  if (isProcessing && !processingTimeout) {
    processingTimeout = setTimeout(() => {
      console.warn("[ShopeeCSBot] Resetting stuck state.");
      isProcessing = false;
      processingTimeout = null;
    }, 15000);
  }

  // Pengecekan URL diletakkan di dalam interval agar support Single Page Application (SPA)
  if (window.location.href.includes('webchat') || window.location.href.includes('chat')) {
    if (!isProcessing) {
      if (processingTimeout) { clearTimeout(processingTimeout); processingTimeout = null; }
      await autoCycleUnrepliedChats();
    }
  }
}, 3000); // 3 detik interval (Cepat)

console.log("[ShopeeCSBot] Auto-cycle aktif. Mengecek chat belum dibalas setiap 3 detik (di halaman webchat).");

// Listen for settings changes (saat user toggle auto-reply on/off)
if (isExtensionContextValid()) {
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.autoReplyEnabled) {
        if (!changes.autoReplyEnabled.newValue) {
          // Auto-reply dimatikan, hentikan auto-cycle
          console.log("[ShopeeCSBot] Auto-reply dimatikan.");
          repliedConversations.clear();
        } else {
          console.log("[ShopeeCSBot] Auto-reply diaktifkan. Mulai memantau chat...");
          repliedConversations.clear();
          lastProcessedMessage = null;
        }
      }
    });
  } catch (e) {
    // Ignore if context invalid
  }
}

log({ level: "info", message: "Content script aktif di halaman Seller Center." });
