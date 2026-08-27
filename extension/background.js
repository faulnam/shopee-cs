// background.js — Service Worker
// Tugas: simpan konfigurasi (backend URL, API token, on/off status),
// dan jadi jembatan komunikasi antara popup <-> content_script.

const DEFAULT_SETTINGS = {
  autoReplyEnabled: false,
  serverEnv: "https://shopee.cs.norapadel.my.id",
  customServerUrl: "http://127.0.0.1:8000",
  toneType: "ramah",
  customTone: "",
  replySpeed: "normal",
  extraContext: "",
};

// Inisialisasi default settings saat extension pertama kali diinstall
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const toSet = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (existing[key] === undefined) toSet[key] = DEFAULT_SETTINGS[key];
  }
  if (Object.keys(toSet).length) {
    await chrome.storage.local.set(toSet);
  }
});

// Listener pesan dari content_script / popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SETTINGS") {
    chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS)).then(sendResponse);
    return true; // async response
  }

  if (message.type === "SET_SETTINGS") {
    chrome.storage.local.set(message.payload).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "LOG_EVENT") {
    // Tempat gampang buat nambah logging/debugging ke console extension
    console.log("[ShopeeCSBot]", message.payload);
    sendResponse({ ok: true });
  }
});
