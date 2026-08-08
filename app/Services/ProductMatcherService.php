<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Collection;

class ProductMatcherService
{
    /**
     * Cari produk relevan dengan pesan customer + history,
     * biar gak perlu kirim SEMUA produk ke prompt (hemat token).
     *
     * Strategi MVP: keyword matching sederhana di nama_produk, kategori, deskripsi.
     * Nanti bisa di-upgrade ke full-text search / vector search (embedding) kalau
     * jumlah produk sudah besar.
     */
    public function findRelevant(string $customerMessage, int $limit = 15): Collection
    {
        $keywords = $this->extractKeywords($customerMessage);

        $query = Product::query()->where('stok', '>', 0);

        if (!empty($keywords)) {
            $query->where(function ($q) use ($keywords) {
                foreach ($keywords as $kw) {
                    $q->orWhere('nama_produk', 'like', "%{$kw}%")
                      ->orWhere('kategori', 'like', "%{$kw}%")
                      ->orWhere('deskripsi_singkat', 'like', "%{$kw}%");
                }
            });
        }

        $results = $query->orderByDesc('jumlah_terjual')->limit($limit)->get();

        // Fallback: kalau keyword matching gak nemu apa-apa, kasih produk terlaris
        // biar AI tetap punya konteks buat jawab pertanyaan umum ("apa aja produknya min?")
        if ($results->isEmpty()) {
            $results = Product::where('stok', '>', 0)
                ->orderByDesc('jumlah_terjual')
                ->limit($limit)
                ->get();
        }

        return $results;
    }

    private function extractKeywords(string $message): array
    {
        $stopwords = ['yang', 'ada', 'gak', 'ga', 'min', 'kak', 'saya', 'mau', 'apa', 'itu', 'ini', 'dan', 'atau', 'buat', 'untuk', 'ya', 'nya'];

        $words = preg_split('/\s+/', mb_strtolower(preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $message)));

        return array_values(array_filter($words, function ($w) use ($stopwords) {
            return mb_strlen($w) >= 3 && !in_array($w, $stopwords);
        }));
    }
}
