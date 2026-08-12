@extends('dashboard.layout')

@section('title', 'Manajemen Produk')

@section('content')
<div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-140px)]">
    <div class="p-6 border-b border-[#2a2a2a] flex justify-between items-center bg-[#181818] z-10 sticky top-0">
        <div>
            <h2 class="text-lg font-semibold text-white">Daftar Produk</h2>
            <p class="text-gray-400 text-sm mt-1">Data produk yang disinkronkan dari Shopee. AI akan menggunakan data ini.</p>
        </div>
        <span class="text-sm px-3 py-1 bg-[#2a2a2a] rounded-full text-gray-300 border border-[#333]">
            Total: {{ $products->total() }} Produk
        </span>
    </div>

    <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-sm text-gray-400">
            <thead class="text-xs text-gray-500 uppercase bg-[#181818] border-b border-[#2a2a2a] sticky top-0">
                <tr>
                    <th scope="col" class="px-6 py-4 font-medium">SKU / Nama Produk</th>
                    <th scope="col" class="px-6 py-4 font-medium">Kategori</th>
                    <th scope="col" class="px-6 py-4 font-medium text-right">Harga</th>
                    <th scope="col" class="px-6 py-4 font-medium text-center">Stok</th>
                    <th scope="col" class="px-6 py-4 font-medium text-right">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-[#2a2a2a]">
                @forelse($products as $product)
                <tr class="hover:bg-[#252525] transition-colors group">
                    <td class="px-6 py-4">
                        <div class="flex flex-col">
                            <span class="text-sm font-medium text-white mb-1" title="{{ $product->nama_produk }}">{{ Str::limit($product->nama_produk, 50) }}</span>
                            <div class="flex items-center gap-3">
                                <span class="text-xs text-gray-500 font-mono flex items-center gap-1">
                                    <i data-lucide="tag" class="w-3 h-3"></i> {{ $product->sku ?: 'No SKU' }}
                                </span>
                                @if(is_array($product->varian_tersedia) && count($product->varian_tersedia) > 0)
                                <span class="px-2 py-0.5 rounded-full bg-[#ee4d2d20] text-[#ee4d2d] text-xs font-medium border border-[#ee4d2d30]">
                                    {{ count($product->varian_tersedia) }} Variasi
                                </span>
                                @endif
                                @if($product->link_produk)
                                <a href="{{ $product->link_produk }}" target="_blank" class="text-blue-400 hover:underline inline-flex items-center gap-1 text-xs">
                                    <i data-lucide="external-link" class="w-3 h-3"></i>
                                </a>
                                @endif
                            </div>
                            
                            @if(is_array($product->varian_tersedia) && count($product->varian_tersedia) > 0)
                            <div class="mt-3 hidden group-hover:block bg-[#1a1a1a] rounded-lg border border-[#333] p-3 shadow-lg absolute z-50">
                                <p class="text-xs font-semibold text-gray-400 mb-2">Detail Variasi:</p>
                                <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    @foreach($product->varian_tersedia as $var)
                                    <div class="flex justify-between items-center text-sm bg-[#121212] p-2 rounded border border-[#2a2a2a] gap-4">
                                        <div class="flex items-center gap-2">
                                            <span class="w-2 h-2 rounded-full bg-[#ee4d2d]"></span>
                                            <span class="text-gray-300">{{ is_string($var) ? $var : ($var['nama'] ?? 'Unknown') }}</span>
                                        </div>
                                        <div class="flex gap-4 text-xs">
                                            <span class="text-gray-400">Stok: <span class="text-white">{{ is_array($var) ? ($var['stok'] ?? 0) : '-' }}</span></span>
                                            <span class="text-[#ee4d2d] font-medium whitespace-nowrap">Rp {{ number_format(is_array($var) ? ($var['harga'] ?? 0) : 0, 0, ',', '.') }}</span>
                                        </div>
                                    </div>
                                    @endforeach
                                </div>
                            </div>
                            @endif
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 bg-[#2a2a2a] rounded text-xs text-gray-300">{{ $product->kategori ?: 'Uncategorized' }}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        @if($product->harga_diskon)
                            <div class="text-[#ee4d2d] font-medium">Rp {{ number_format($product->harga_diskon, 0, ',', '.') }}</div>
                            <div class="text-xs text-gray-500 line-through">Rp {{ number_format($product->harga_normal, 0, ',', '.') }}</div>
                        @else
                            <div class="text-white font-medium">Rp {{ number_format($product->harga_normal, 0, ',', '.') }}</div>
                        @endif
                    </td>
                    <td class="px-6 py-4 text-center">
                        @php
                            $totalStok = $product->stok;
                            if(is_array($product->varian_tersedia) && count($product->varian_tersedia) > 0) {
                                $totalStok = collect($product->varian_tersedia)->sum(function($var) {
                                    return is_array($var) ? ($var['stok'] ?? 0) : 0;
                                });
                                $totalStok = max($totalStok, $product->stok);
                            }
                        @endphp
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium {{ $totalStok > 10 ? 'bg-green-500/10 text-green-500' : ($totalStok > 0 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500') }}">
                            <span class="w-1.5 h-1.5 rounded-full {{ $totalStok > 10 ? 'bg-green-500' : ($totalStok > 0 ? 'bg-yellow-500' : 'bg-red-500') }}"></span>
                            {{ $totalStok }} Unit
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button onclick="editProduct({{ $product->id }})" class="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg transition-colors" title="Edit Data">
                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                            </button>
                            <form action="{{ route('dashboard.products.destroy', $product->id) }}" method="POST" class="inline" onsubmit="return confirm('Yakin ingin menghapus produk ini?');">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Hapus Produk">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </form>
                        </div>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center">
                        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2a2a] mb-4">
                            <i data-lucide="package-x" class="w-6 h-6 text-gray-400"></i>
                        </div>
                        <h3 class="text-sm font-medium text-white mb-1">Belum Ada Produk</h3>
                        <p class="text-xs text-gray-500">Sinkronkan produk dari Shopee Seller Center menggunakan ekstensi Chrome.</p>
                    </td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
    
    @if($products->hasPages())
    <div class="p-4 border-t border-[#2a2a2a] bg-[#181818]">
        {{ $products->links() }}
    </div>
    @endif
</div>

<!-- Modal Edit Produk (Sederhana pakai Vanilla JS & hidden class) -->
<div id="editModal" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden z-50 items-center justify-center">
    <div class="bg-[#1e1e1e] border border-[#333] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="p-6 border-b border-[#2a2a2a] flex justify-between items-center sticky top-0 bg-[#1e1e1e] z-10">
            <h3 class="text-lg font-semibold text-white">Edit Produk</h3>
            <button onclick="closeEditModal()" class="text-gray-400 hover:text-white">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        
        <form id="editForm" method="POST" action="" class="p-6">
            @csrf
            @method('PUT')
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Nama Produk</label>
                    <input type="text" name="nama_produk" id="edit_nama" class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-[#ee4d2d] focus:outline-none" required>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-1">Harga Normal</label>
                        <input type="number" name="harga_normal" id="edit_harga_normal" class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-[#ee4d2d] focus:outline-none" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-1">Harga Diskon</label>
                        <input type="number" name="harga_diskon" id="edit_harga_diskon" class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-[#ee4d2d] focus:outline-none">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-1">Stok</label>
                        <input type="number" name="stok" id="edit_stok" class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-[#ee4d2d] focus:outline-none" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-1">Kategori</label>
                        <input type="text" name="kategori" id="edit_kategori" class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-[#ee4d2d] focus:outline-none">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Link Produk</label>
                    <input type="text" name="link_produk" id="edit_link" class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-[#ee4d2d] focus:outline-none">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1">Deskripsi Singkat</label>
                    <textarea name="deskripsi_singkat" id="edit_deskripsi" rows="3" class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-2 focus:border-[#ee4d2d] focus:outline-none"></textarea>
                </div>
            </div>

            <div class="mt-8 flex justify-end gap-3">
                <button type="button" onclick="closeEditModal()" class="px-5 py-2.5 rounded-lg border border-[#444] text-gray-300 hover:bg-[#333] transition-colors">Batal</button>
                <button type="submit" class="px-5 py-2.5 rounded-lg bg-[#ee4d2d] text-white hover:bg-[#d73f21] font-medium transition-colors">Simpan Perubahan</button>
            </div>
        </form>
    </div>
</div>

@push('scripts')
<script>
    function editProduct(product) {
        document.getElementById('edit_nama').value = product.nama_produk;
        document.getElementById('edit_harga_normal').value = product.harga_normal;
        document.getElementById('edit_harga_diskon').value = product.harga_diskon || '';
        document.getElementById('edit_stok').value = product.stok;
        document.getElementById('edit_kategori').value = product.kategori || '';
        document.getElementById('edit_link').value = product.link_produk || '';
        document.getElementById('edit_deskripsi').value = product.deskripsi_singkat || '';
        
        document.getElementById('editForm').action = '/dashboard/products/' + product.id;
        
        const modal = document.getElementById('editModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeEditModal() {
        const modal = document.getElementById('editModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
</script>
<style>
    /* Styling for laravel pagination links */
    nav[aria-label="Pagination Navigation"] {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    nav[aria-label="Pagination Navigation"] p {
        color: #9ca3af;
    }
    nav[aria-label="Pagination Navigation"] a, nav[aria-label="Pagination Navigation"] span {
        background: #2a2a2a !important;
        border-color: #333 !important;
        color: #fff !important;
    }
    nav[aria-label="Pagination Navigation"] span[aria-current="page"] span {
        background: #ee4d2d !important;
        border-color: #ee4d2d !important;
    }
</style>
@endpush
@endsection
