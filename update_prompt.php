<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$p = App\Models\Prompt::first();
$content = $p->content;

// Add the new instruction about SEND_PRODUCT
$newRule = "\n- **SANGAT PENTING soal Rekomendasi Produk:** Jika Anda merekomendasikan sebuah produk (berdasarkan data `{product_list_json}`), Anda WAJIB menyertakan kode rahasia `[SEND_PRODUCT: keyword pencarian]` di akhir kalimat Anda. Contoh: `[SEND_PRODUCT: Tas Sekolah]`. Sistem akan otomatis memunculkan Kartu Produk bergambar kepada pembeli.\n";

if (strpos($content, '[SEND_PRODUCT') === false) {
    // Insert it after `**Aturan ketat soal data produk:**`
    $content = str_replace('**Aturan ketat soal data produk:**', '**Aturan ketat soal data produk:**' . $newRule, $content);
}

// Update the few-shot examples
$content = preg_replace('/https:\/\/shopee\.co\.id\/product\/\.\./', '[SEND_PRODUCT: Tas Selempang Kulit Coklat]', $content);
$content = preg_replace('/mau kakak lihat detailnya\? https:\/\/shopee\.co\.id\/product\/0\/12345/', 'mau kakak lihat detailnya? [SEND_PRODUCT: Tas Selempang]', $content);

$p->content = $content;
$p->save();
echo "Prompt SEND_PRODUCT injected.\n";
