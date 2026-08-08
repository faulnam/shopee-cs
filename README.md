D:\laragonzo\www\shopee-cs>curl -X POST http://127.0.0.1:8000/api/reply -H "Content-Type: application/json" -H "Authorization: Bearer 1|L70K2sZN7LpBhUDiBYcqFKglwqzU0Kuo4ZdlTDbR753469dc" -d "{\"customer_message\": \"halo min\", \"chat_history\": [], \"conversation_id\": \"test-123\"}"
{"reply":null,"message":"AI gagal generate balasan."}

# Shopee CS Auto-Reply Bot — MVP

Project ini terdiri dari 2 bagian:
1. **`extension/`** — Chrome Extension (Manifest V3), baca chat di Shopee Seller Center & auto-reply
2. **`backend/`** — Source code Laravel (Services, Controllers, Models, Migrations) yang perlu digabung ke project Laravel baru

> ⚠️ File-file di folder `backend/` BUKAN project Laravel yang utuh (tidak ada folder `vendor/`, `artisan`, dll). Ini cuma source code custom yang perlu kamu tempel ke project Laravel fresh. Ikuti langkah di bawah.

---

## 🚀 Setup Backend Laravel

### 1. Buat project Laravel baru
```bash
composer create-project laravel/laravel shopee-cs-backend
cd shopee-cs-backend
composer require laravel/sanctum
php artisan install:api
```

### 2. Copy semua file dari folder `backend/` project ini ke project Laravel barumu
- `app/Http/Controllers/Api/ReplyController.php` → ke path yang sama
- `app/Services/*.php` → ke path yang sama (buat folder `Services` kalau belum ada)
- `app/Models/*.php` → ke path yang sama
- `database/migrations/*.php` → ke path yang sama
- `database/seeders/SettingSeeder.php` → ke path yang sama
- `resources/prompts/system_prompt.md` → ke path yang sama (buat folder `prompts` kalau belum ada)
- `routes/api.php` → **gabungkan** isinya ke `routes/api.php` yang sudah ada (jangan ditimpa penuh kalau sudah ada isi lain)

### 3. Tambahkan config OpenRouter
Buka `config/services.php`, tambahkan array berikut (isi lengkapnya ada di `backend/config/services.openrouter.snippet.php`):
```php
'openrouter' => [
    'key' => env('OPENROUTER_API_KEY'),
    'model' => env('OPENROUTER_MODEL', 'deepseek/deepseek-chat'),
],
```

### 4. Setup `.env`
Isi koneksi database seperti biasa, lalu tambahkan (lihat `backend/.env.example.snippet`):
```
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=deepseek/deepseek-chat
```

### 5. Migrate & seed database
```bash
php artisan migrate
php artisan db:seed --class=SettingSeeder
```

### 6. Buat API token untuk extension
Cara paling cepat lewat Tinker:
```bash
php artisan tinker
```
```php
$user = \App\Models\User::factory()->create(['email' => 'admin@toko.com']);
$token = $user->createToken('extension-token')->plainTextToken;
echo $token; // simpan token ini, dipakai di popup extension
```

### 7. Jalankan server
```bash
php artisan serve
```
Endpoint akan tersedia di `http://127.0.0.1:8000/api/reply` (kalau mau dites dari extension yang jalan di browser beneran, deploy ke domain publik dengan HTTPS, karena Shopee Seller Center pakai HTTPS dan browser akan blokir mixed content / CORS kalau backend masih localhost).

### 8. Import produk (4 file Shopee)
Belum dibuatkan otomatis — ini nunggu kamu share contoh format 4 file export Shopee kamu (boleh cuma header/sample-nya), biar importer-nya presisi. Sementara ini, kamu bisa isi tabel `products` manual dulu lewat Tinker/seeder buat testing.

---

## 🧩 Setup Chrome Extension

### 1. Siapkan icon
Folder `extension/icons/` masih kosong — taruh 3 file PNG di sana:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

### 2. Load extension ke Chrome
1. Buka `chrome://extensions`
2. Aktifkan **Developer mode** (pojok kanan atas)
3. Klik **Load unpacked**
4. Pilih folder `extension/`

### 3. Konfigurasi lewat popup
1. Klik icon extension di toolbar Chrome
2. Isi **Backend URL** (contoh: `https://yourdomain.com/api/reply`)
3. Isi **API Token** (dari langkah "Buat API token" di atas)
4. Nyalakan toggle **Auto-reply**
5. Klik **Simpan**

### 4. ⚠️ WAJIB: Sesuaikan selector DOM
Buka `extension/content_script.js`, cari bagian `SELECTORS` di paling atas:
```js
const SELECTORS = {
  chatMessage: '[data-testid="chat-message"]',
  messageText: '.message-text',
  buyerBubbleClass: 'is-buyer',
  chatInput: '[data-testid="chat-input"]',
  sendButton: '[data-testid="chat-send-btn"]',
};
```
Ini **placeholder**. Buka halaman webchat Shopee Seller Center asli, klik kanan → **Inspect** pada bubble chat, input box, dan tombol kirim, lalu ganti selector di atas sesuai struktur HTML yang sebenarnya. Tanpa langkah ini, extension tidak akan bisa membaca/mengirim chat.

---

## 🔄 Alur Kerja Sistem

```
Customer chat masuk di Shopee Seller Center
        ↓
content_script.js (MutationObserver) mendeteksi pesan baru
        ↓
Extension kirim POST ke {backendUrl} dengan Bearer token
        ↓
Laravel: ReplyController → ProductMatcherService (cari produk relevan)
        ↓
Laravel: PromptBuilderService (isi template system_prompt.md)
        ↓
Laravel: OpenRouterService → panggil DeepSeek via OpenRouter
        ↓
Balasan AI disimpan ke DB (conversations + messages) & dikirim balik ke extension
        ↓
content_script.js suntik teks ke chatbox & klik kirim otomatis
```

---

## 📌 Langkah Selanjutnya
- [ ] Share sample 4 file Shopee → dibuatkan `ProductImportService` + Artisan command import
- [ ] Deploy backend ke server/hosting dengan domain HTTPS
- [ ] Sesuaikan `SELECTORS` di `content_script.js` dengan DOM Shopee asli
- [ ] Buat dashboard admin sederhana (edit tone, store_policy, on/off auto-reply, lihat log chat) — saat ini masih via Tinker/DB langsung
- [ ] Tambahkan rate-limiting / delay tambahan biar pola auto-reply tidak mudah terdeteksi sebagai bot


Untuk melakukan pengetesan (testing) extension ini secara penuh, Anda memiliki dua pilihan cara, dari yang paling riil hingga yang paling praktis:

### Pilihan 1: Test Langsung di Shopee (Sangat Direkomendasikan)
Karena extension ini memang dirancang khusus untuk membaca tampilan (DOM) dari Shopee Seller Center, cara terbaik mengujinya adalah langsung di situs aslinya.

1. **Login ke Seller Center:** Kunjungi `seller.shopee.co.id` dan login menggunakan akun Shopee Anda. (Semua akun Shopee pada dasarnya bisa mengakses Seller Center tanpa syarat khusus).
2. **Siapkan Akun Pembeli (Dummy):** Gunakan HP Anda dengan akun Shopee yang berbeda, atau minta bantuan teman/keluarga untuk **mengirimkan pesan (chat)** ke toko Shopee Anda.
3. **Mulai Testing:** 
   - Buka menu Webchat / Obrolan di Seller Center di laptop Anda.
   - Nyalakan extension kita (Klik "Mulai Auto-Reply").
   - Suruh akun pembeli tadi mengirim pesan, misalnya: *"Halo min, barang ini ready?"*
   - Tunggu beberapa detik (sesuai setting Kecepatan Balas), dan lihat bagaimana extension otomatis mengetik dan mengirimkan balasannya!

### Pilihan 2: Test Backend Saja (Tanpa Perlu Buka Shopee)
Jika Anda hanya ingin melihat kecerdasan AI dalam menjawab berdasarkan *prompt* yang sudah kita buat tanpa harus membuka Shopee, Anda bisa menggunakan perintah `curl` di terminal Anda (seperti yang Anda lakukan di awal percakapan kita tadi).

Pastikan `php artisan serve` sedang berjalan, lalu buka terminal/Git Bash biasa (bukan di dalam tinker), dan jalankan:

```bash
curl -X POST http://127.0.0.1:8000/api/reply \
-H "Content-Type: application/json" \
-H "Authorization: Bearer 1|L70K2sZN7LpBhUDiBYcqFKglwqzU0Kuo4ZdlTDbR753469dc" \
-d '{
  "customer_message": "min, ada promo apa hari ini?",
  "chat_history": [],
  "conversation_id": "test-123",
  "customer_name": "Budi",
  "tone": "ramah",
  "extra_context": "Diskon 50% untuk semua sepatu"
}'
```
*(Perintah di atas mensimulasikan pengiriman pesan persis seperti yang dilakukan oleh extension Anda).*

**Saran Saya:**
Cobalah **Pilihan 1** karena ini akan menguji fungsionalitas UI Extension, Jeda Mengetik, dan integrasinya secara keseluruhan, yang pastinya akan sangat memuaskan melihatnya bekerja otomatis di layar Anda!"# shopee-cs" 
