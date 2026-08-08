@extends('dashboard.layout')

@section('title', 'Overview')

@section('content')
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    
    <div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-gray-400 font-medium">Status Auto-Reply</h3>
            <div class="p-2 bg-[#ee4d2d]/10 rounded-lg text-[#ee4d2d]">
                <i data-lucide="bot" class="w-5 h-5"></i>
            </div>
        </div>
        <div class="flex items-end gap-3">
            <span class="text-3xl font-bold {{ $stats['auto_reply_status'] ? 'text-green-500' : 'text-gray-500' }}">
                {{ $stats['auto_reply_status'] ? 'ON' : 'OFF' }}
            </span>
        </div>
    </div>

    <div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-gray-400 font-medium">Total Produk</h3>
            <div class="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <i data-lucide="package" class="w-5 h-5"></i>
            </div>
        </div>
        <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-white">{{ $stats['total_products'] }}</span>
            <span class="text-sm text-gray-500">/ {{ $stats['active_products'] }} aktif</span>
        </div>
    </div>

    <div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-gray-400 font-medium">Total Percakapan</h3>
            <div class="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                <i data-lucide="users" class="w-5 h-5"></i>
            </div>
        </div>
        <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-white">{{ $stats['total_conversations'] }}</span>
        </div>
    </div>

    <div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-gray-400 font-medium">Total Pesan</h3>
            <div class="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <i data-lucide="message-square" class="w-5 h-5"></i>
            </div>
        </div>
        <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-white">{{ $stats['total_messages'] }}</span>
        </div>
    </div>

</div>

<div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-8 text-center max-w-2xl mx-auto mt-12">
    <div class="w-16 h-16 bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-4">
        <i data-lucide="rocket" class="w-8 h-8 text-gray-400"></i>
    </div>
    <h2 class="text-xl font-semibold text-white mb-2">Selamat Datang di Dashboard!</h2>
    <p class="text-gray-400 mb-6">
        Kelola semua pengaturan bot AI, lihat produk yang sudah disinkronisasi dari Shopee, dan pantau percakapan dengan customer dari satu tempat.
    </p>
    <div class="flex justify-center gap-4">
        <a href="{{ route('dashboard.settings') }}" class="bg-[#2a2a2a] hover:bg-[#333] text-white px-6 py-2.5 rounded-lg font-medium transition-colors border border-[#444]">
            Atur Toko
        </a>
        <a href="{{ route('dashboard.extension') }}" class="bg-[#ee4d2d] hover:bg-[#d73f21] text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            Download Ekstensi
        </a>
    </div>
</div>
@endsection
