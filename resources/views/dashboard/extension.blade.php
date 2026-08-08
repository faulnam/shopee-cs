@extends('dashboard.layout')

@section('title', 'Ekstensi Chrome')

@section('content')
<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    
    <!-- Left Column: Download & Info -->
    <div class="space-y-6">
        <div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden p-8 text-center shadow-lg relative">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ee4d2d] to-orange-400"></div>
            
            <div class="w-24 h-24 bg-[#2a2a2a] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-[#333]">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg" alt="Chrome" class="w-12 h-12 opacity-80">
            </div>
            
            <h2 class="text-2xl font-bold text-white mb-2">Ekstensi Shopee CS Bot</h2>
            <p class="text-gray-400 mb-8">
                Versi: <span class="font-mono text-white bg-[#333] px-2 py-0.5 rounded">{{ $manifest['version'] ?? '1.0' }}</span>
            </p>
            
            <a href="{{ route('dashboard.extension.download') }}" class="inline-flex items-center justify-center gap-2 w-full bg-[#ee4d2d] hover:bg-[#d73f21] text-white font-medium rounded-xl px-6 py-4 transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(238,77,45,0.4)]">
                <i data-lucide="download" class="w-5 h-5"></i>
                Download Extension (.zip)
            </a>
            
            <div class="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-left">
                <div class="flex items-start gap-3">
                    <i data-lucide="info" class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"></i>
                    <p class="text-sm text-blue-200 leading-relaxed">
                        Ekstensi ini sudah terkonfigurasi secara otomatis untuk terhubung dengan server ini (<code class="bg-blue-900/50 px-1 rounded">{{ request()->getHost() }}</code>). Anda tinggal install dan pakai!
                    </p>
                </div>
            </div>
        </div>
        
        <div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <i data-lucide="key" class="w-5 h-5 text-[#ee4d2d]"></i> Token Akses API
            </h3>
            <p class="text-sm text-gray-400 mb-4">
                Ekstensi menggunakan token statis (hardcoded) yang ada di file <code>content_script.js</code> untuk mengakses API server. Jika Anda merubah token di database, pastikan untuk men-download ulang ekstensi.
            </p>
            <div class="bg-[#121212] border border-[#333] p-4 rounded-lg flex items-center justify-between">
                <code class="text-[#ee4d2d] text-sm">1|L70K2sZN7LpBhUDiBYcq...</code>
                <span class="text-xs text-gray-500">Token Aktif</span>
            </div>
        </div>
    </div>

    <!-- Right Column: Tutorial -->
    <div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div class="p-6 border-b border-[#2a2a2a] bg-[#181818]">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <i data-lucide="help-circle" class="w-5 h-5 text-gray-400"></i> Cara Install Ekstensi
            </h3>
        </div>
        
        <div class="p-6">
            <div class="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#333] before:to-transparent">
                
                <!-- Step 1 -->
                <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#2a2a2a] group-[.is-active]:bg-[#ee4d2d] text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow md:mx-auto z-10">1</div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-[#333] bg-[#121212]">
                        <h4 class="font-bold text-white mb-1">Download & Ekstrak</h4>
                        <p class="text-sm text-gray-400">Klik tombol download di samping. Setelah didownload, ekstrak file <code>.zip</code> tersebut ke sebuah folder di komputer Anda.</p>
                    </div>
                </div>
                
                <!-- Step 2 -->
                <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border border-[#444] bg-[#2a2a2a] text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow md:mx-auto z-10">2</div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-[#333] bg-[#121212]">
                        <h4 class="font-bold text-white mb-1">Buka Halaman Ekstensi</h4>
                        <p class="text-sm text-gray-400">Buka tab baru di Chrome dan ketik <code class="text-[#ee4d2d]">chrome://extensions/</code> di URL bar.</p>
                    </div>
                </div>
                
                <!-- Step 3 -->
                <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border border-[#444] bg-[#2a2a2a] text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow md:mx-auto z-10">3</div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-[#333] bg-[#121212]">
                        <h4 class="font-bold text-white mb-1">Developer Mode</h4>
                        <p class="text-sm text-gray-400">Aktifkan <strong>Developer mode</strong> (tombol toggle di pojok kanan atas layar).</p>
                    </div>
                </div>

                <!-- Step 4 -->
                <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div class="flex items-center justify-center w-10 h-10 rounded-full border border-[#444] bg-[#2a2a2a] text-white font-bold shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow md:mx-auto z-10">4</div>
                    <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-[#333] bg-[#121212]">
                        <h4 class="font-bold text-white mb-1">Load Unpacked</h4>
                        <p class="text-sm text-gray-400">Klik tombol <strong>Load unpacked</strong> di kiri atas, lalu pilih folder hasil ekstrak dari langkah pertama tadi.</p>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>
@endsection
