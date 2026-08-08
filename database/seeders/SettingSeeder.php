<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        Setting::firstOrCreate([], [
            'store_name' => 'Toko Saya',
            'store_category' => 'Fashion & Aksesoris',
            'store_policy' => "Jam operasional CS: 09.00 - 21.00 WIB\nRetur diterima maksimal 3 hari setelah barang diterima\nPengiriman via JNE, J&T, SiCepat\nPembayaran: Shopee Pay, transfer bank, COD",
            'tone' => 'ramah dan hangat',
            'auto_reply_enabled' => true,
        ]);
    }
}
