<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->nullable()->index();
            $table->string('nama_produk');
            $table->decimal('harga_normal', 12, 2)->default(0);
            $table->decimal('harga_diskon', 12, 2)->nullable();
            $table->integer('stok')->default(0);
            $table->json('varian_tersedia')->nullable();
            $table->text('deskripsi_singkat')->nullable();
            $table->string('kategori')->nullable();
            $table->decimal('rating', 2, 1)->nullable();
            $table->integer('jumlah_terjual')->default(0);
            $table->string('link_produk')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
