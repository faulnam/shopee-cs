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

        foreach ($validated['products'] as $productData) {
            $namaProduk = trim($productData['nama_produk']);
            if (empty($namaProduk)) continue;

            $shopeeId = !empty($productData['shopee_id']) ? trim($productData['shopee_id']) : ('P_' . $namaProduk);
            $hargaNormal = (float) $productData['harga_normal'];
            $hargaDiskon = isset($productData['harga_diskon']) && $productData['harga_diskon'] !== null && $productData['harga_diskon'] !== '' ? (float) $productData['harga_diskon'] : null;

            // Jika nilai harga melebihi batas (misal Model ID terambil), abaikan
            if ($hargaNormal >= 100000000 || $hargaNormal < 0) {
                $hargaNormal = 0;
            }
            if ($hargaDiskon !== null && ($hargaDiskon >= 100000000 || $hargaDiskon < 0)) {
                $hargaDiskon = null;
            }

            // Bersihkan data variasi terlebih dahulu
            $cleanedVariations = [];
            if (isset($productData['varian_tersedia']) && is_array($productData['varian_tersedia'])) {
                foreach ($productData['varian_tersedia'] as $var) {
                    if (is_array($var)) {
                        $vNama = trim($var['nama'] ?? '');
                        if (empty($vNama)) continue;

                        $vNormal = (float)($var['harga_normal'] ?? $var['harga'] ?? 0);
                        $vDiskon = isset($var['harga_diskon']) && $var['harga_diskon'] !== null ? (float)$var['harga_diskon'] : null;

                        if ($vNormal >= 100000000 || $vNormal < 0) $vNormal = 0;
                        if ($vDiskon !== null && ($vDiskon >= 100000000 || $vDiskon < 0)) $vDiskon = null;

                        // Tentukan harga aktif untuk variasi
                        if ($vDiskon !== null && $vNormal > 0 && $vDiskon < $vNormal) {
                            $vHargaFinal = $vDiskon;
                        } else {
                            $vHargaFinal = $vNormal > 0 ? $vNormal : ($vDiskon ?? 0);
                            $vDiskon = null;
                        }

                        $cleanedVariations[] = [
                            'nama' => $vNama,
                            'harga' => $vHargaFinal,
                            'harga_normal' => $vNormal > 0 ? $vNormal : $vHargaFinal,
                            'harga_diskon' => $vDiskon,
                            'stok' => (int)($var['stok'] ?? 0),
                            'sku' => !empty($var['sku']) ? (string)$var['sku'] : null,
                        ];
                    } elseif (is_string($var) && trim($var) !== '') {
                        $cleanedVariations[] = [
                            'nama' => trim($var),
                            'harga' => $hargaNormal,
                            'harga_normal' => $hargaNormal,
                            'harga_diskon' => null,
                            'stok' => 0,
                            'sku' => null,
                        ];
                    }
                }
            }

            // Jika harga normal parent masih 0 tapi ada variasi, gunakan harga variasi pertama yang valid
            if ($hargaNormal <= 0 && count($cleanedVariations) > 0) {
                foreach ($cleanedVariations as $cv) {
                    if ($cv['harga_normal'] > 0 || $cv['harga'] > 0) {
                        $hargaNormal = $cv['harga_normal'] > 0 ? $cv['harga_normal'] : $cv['harga'];
                        $hargaDiskon = $cv['harga_diskon'];
                        break;
                    }
                }
            }

            // Jika harga normal 0 tetapi ada harga diskon, gunakan harga diskon sebagai harga normal
            if ($hargaNormal <= 0 && $hargaDiskon !== null && $hargaDiskon > 0) {
                $hargaNormal = $hargaDiskon;
                $hargaDiskon = null;
            }

            // Jika harga diskon lebih besar dari harga normal, swap agar harga_normal adalah harga coret
            if ($hargaDiskon !== null && $hargaNormal > 0 && $hargaDiskon > $hargaNormal) {
                $temp = $hargaNormal;
                $hargaNormal = $hargaDiskon;
                $hargaDiskon = $temp;
            } elseif ($hargaDiskon !== null && $hargaDiskon >= $hargaNormal) {
                $hargaDiskon = null;
            }

            // Perbarui variasi yang harganya masih 0 dengan harga induk
            foreach ($cleanedVariations as &$cv) {
                if ($cv['harga_normal'] <= 0 && $hargaNormal > 0) {
                    $cv['harga_normal'] = $hargaNormal;
                    $cv['harga'] = $cv['harga_diskon'] ?? $hargaNormal;
                }
            }
            unset($cv);

            // Batasi nilai agar tidak melampaui range decimal MySQL (max 99999999.99)
            $hargaNormal = min(99999999.99, max(0, $hargaNormal));
            if ($hargaDiskon !== null) {
                $hargaDiskon = min(99999999.99, max(0, $hargaDiskon));
            }

            // PENCEGAHAN DATA MENUMPUK (DEDUPLIKASI):
            // Cari produk yang sudah ada di database berdasarkan shopee_id ATAU nama_produk
            $existing = Product::where('shopee_id', $shopeeId)
                ->orWhere('nama_produk', $namaProduk)
                ->first();

            $saveData = [
                'shopee_id' => $shopeeId,
                'sku' => !empty($productData['sku']) ? $productData['sku'] : null,
                'nama_produk' => $namaProduk,
                'harga_normal' => $hargaNormal,
                'harga_diskon' => $hargaDiskon,
                'stok' => (int)($productData['stok'] ?? 0),
                'varian_tersedia' => $cleanedVariations,
                'deskripsi_singkat' => $productData['deskripsi_singkat'] ?? '',
                'kategori' => $productData['kategori'] ?? 'Katalog Shopee',
                'jumlah_terjual' => (int)($productData['jumlah_terjual'] ?? 0),
                'link_produk' => $productData['link_produk'] ?? null,
            ];

            if ($existing) {
                $existing->update($saveData);
                // Jika shopee_id berubah (misal sebelumnya P_nama, sekarang P_id), update shopee_id
                if ($existing->shopee_id !== $shopeeId) {
                    $existing->shopee_id = $shopeeId;
                    $existing->save();
                }
            } else {
                Product::create($saveData);
            }

            $syncedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "$syncedCount produk berhasil disinkronisasi."
        ]);
    }
}
