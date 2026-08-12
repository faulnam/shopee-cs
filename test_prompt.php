<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$builder = app(App\Services\PromptBuilderService::class);
$data = [
    'store_name' => 'Toko Keren',
    'store_category' => 'Fashion',
    'store_policy' => 'No Return',
    'tone' => App\Models\Prompt::first()->id, // usually tone corresponds to prompt ID now in the updated logic
    'products' => [
        [
            'nama_produk' => 'Tas Sekolah',
            'harga_normal' => 50000,
            'stok' => 100,
            'link_produk' => 'https://shopee.co.id/product/0/12345'
        ]
    ],
    'chat_history' => [],
    'customer_message' => 'beli tas'
];

echo $builder->build($data);
