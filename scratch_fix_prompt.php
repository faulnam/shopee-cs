<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$p = App\Models\Prompt::first();
$p->content = str_replace(['{norapadel}', '{sport/olahraga}'], ['{store_name}', '{store_category}'], $p->content);

// Also fix the few-shot examples to make the AI output the actual link instead of the word [link_produk]
$p->content = str_replace('[link_produk]', 'https://shopee.co.id/product/...', $p->content);

// Remove the rule that says "Jangan sertakan link" just in case the AI misunderstands it
$p->content = preg_replace('/- \*\*SANGAT PENTING soal Link:\*\* Jika `link_produk` kosong.*?\n/', '', $p->content);

$p->save();
echo "Prompt fixed.\n";
