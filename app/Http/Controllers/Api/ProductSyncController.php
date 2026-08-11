<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductSyncController extends Controller
{
    /**
     * Sinkronisasi data produk dari Shopee via Chrome Extension
     */
    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'products' => 'required|array',
            'products.*.shopee_id' => 'nullable|string',
            'products.*.sku' => 'nullable|string|max:255',
            'products.*.nama_produk' => 'required|string|max:500',
            'products.*.harga_normal' => 'required|numeric',
            'products.*.harga_diskon' => 'nullable|numeric',
            'products.*.stok' => 'required|integer',
            'products.*.varian_tersedia' => 'nullable|array',
            'products.*.deskripsi_singkat' => 'nullable|string|max:1000',
            'products.*.kategori' => 'nullable|string|max:255',
            'products.*.jumlah_terjual' => 'nullable|integer',
            'products.*.link_produk' => 'nullable|string|max:1000',
        ]);

        $syncedCount = 0;
        
        // Kita gunakan nama produk sebagai key jika SKU kosong (Shopee kadang tidak mewajibkan SKU)
        foreach ($validated['products'] as $productData) {
            
            // Jangan buat link default berupa search keyword karena akan terdeteksi SPAM oleh Shopee
            Product::updateOrCreate(
                // Kriteria pencarian
                [
                    'shopee_id' => $productData['shopee_id'] ?? ('P_' . $productData['nama_produk'])
                ],
                // Data yang diupdate/dibuat
                [
                    'sku' => $productData['sku'] ?? null,
                    'nama_produk' => $productData['nama_produk'],
                    'harga_normal' => $productData['harga_normal'],
                    'harga_diskon' => $productData['harga_diskon'] ?? null,
                    'stok' => $productData['stok'],
                    'varian_tersedia' => $productData['varian_tersedia'] ?? [],
                    'deskripsi_singkat' => $productData['deskripsi_singkat'] ?? '',
                    'kategori' => $productData['kategori'] ?? 'Umum',
                    'jumlah_terjual' => $productData['jumlah_terjual'] ?? 0,
                    'link_produk' => $productData['link_produk'],
                ]
            );
            $syncedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "$syncedCount produk berhasil disinkronisasi."
        ]);
    }
}
