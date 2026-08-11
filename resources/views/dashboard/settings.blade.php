@extends('dashboard.layout')

@section('title', 'Pengaturan Toko')

@section('content')
<div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden">
    <div class="p-6 border-b border-[#2a2a2a]">
        <h2 class="text-lg font-semibold text-white">Identitas & Kebijakan Toko</h2>
        <p class="text-gray-400 text-sm mt-1">Data ini digunakan oleh AI untuk memberikan konteks jawaban yang akurat.</p>
    </div>

    <form action="{{ route('dashboard.settings') }}" method="POST" class="p-6">
        @csrf
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Nama Toko</label>
                <input type="text" name="store_name" value="{{ old('store_name', $settings->store_name) }}" 
                       class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#ee4d2d]" required>
                @error('store_name') <span class="text-red-400 text-xs mt-1 block">{{ $message }}</span> @enderror
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Kategori Toko</label>
                <input type="text" name="store_category" value="{{ old('store_category', $settings->store_category) }}" placeholder="Contoh: Sepatu Olahraga, Kosmetik"
                       class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#ee4d2d]">
            </div>
        </div>

        <div class="mb-6">
            <label class="block text-sm font-medium text-gray-300 mb-2">Kebijakan Toko (Retur, Pengiriman, dll)</label>
            <textarea name="store_policy" rows="5" class="w-full bg-[#121212] border border-[#333] text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#ee4d2d]" placeholder="Tuliskan kebijakan pengembalian barang, jam buka, dll...">{{ old('store_policy', $settings->store_policy) }}</textarea>
        </div>

        <div class="mb-8 p-4 bg-[#2a2a2a] rounded-lg border border-[#333] hidden">
            <!-- Tone is now managed in Extension & Prompt settings, we keep this hidden for backward compatibility -->
            <input type="hidden" name="tone" value="{{ old('tone', $settings->tone) }}">
        </div>

        <div class="border-t border-[#2a2a2a] pt-6 flex items-center justify-between">
            <label class="flex items-center cursor-pointer">
                <div class="relative">
                    <input type="checkbox" name="auto_reply_enabled" value="1" class="sr-only" {{ old('auto_reply_enabled', $settings->auto_reply_enabled) ? 'checked' : '' }}>
                    <div class="block bg-[#333] w-14 h-8 rounded-full toggle-bg transition-colors"></div>
                    <div class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform"></div>
                </div>
                <div class="ml-3 text-sm font-medium text-gray-300">
                    Aktifkan Bot Auto-Reply
                </div>
            </label>
            
            <button type="submit" class="bg-[#ee4d2d] hover:bg-[#d73f21] text-white font-medium rounded-lg px-6 py-2.5 flex items-center gap-2 transition-colors">
                <i data-lucide="save" class="w-4 h-4"></i> Simpan Pengaturan
            </button>
        </div>
    </form>
</div>

@push('scripts')
<style>
    input:checked ~ .toggle-bg {
        background-color: #ee4d2d;
    }
    input:checked ~ .dot {
        transform: translateX(100%);
    }
</style>
@endpush
@endsection
