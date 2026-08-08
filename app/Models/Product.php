<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'sku',
        'nama_produk',
        'harga_normal',
        'harga_diskon',
        'stok',
        'varian_tersedia',
        'deskripsi_singkat',
        'kategori',
        'rating',
        'jumlah_terjual',
        'link_produk',
    ];

    protected $casts = [
        'varian_tersedia' => 'array',
        'harga_normal' => 'decimal:2',
        'harga_diskon' => 'decimal:2',
        'rating' => 'decimal:1',
    ];

    /**
     * Format ringkas buat dikirim ke prompt AI (hemat token).
     */
    public function toPromptArray(): array
    {
        return [
            'nama_produk' => $this->nama_produk,
            'harga_normal' => (float) $this->harga_normal,
            'harga_diskon' => $this->harga_diskon ? (float) $this->harga_diskon : null,
            'stok' => $this->stok,
            'varian_tersedia' => $this->varian_tersedia,
            'deskripsi_singkat' => $this->deskripsi_singkat,
            'kategori' => $this->kategori,
            'rating' => $this->rating,
            'jumlah_terjual' => $this->jumlah_terjual,
            'link_produk' => $this->link_produk,
        ];
    }
}
