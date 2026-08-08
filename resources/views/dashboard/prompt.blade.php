@extends('dashboard.layout')

@section('title', 'System Prompt AI')

@section('content')
<div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden">
    <div class="p-6 border-b border-[#2a2a2a]">
        <h2 class="text-lg font-semibold text-white">Edit System Prompt</h2>
        <p class="text-gray-400 text-sm mt-1">Ini adalah instruksi dasar (otak) dari AI. Anda bisa memodifikasinya untuk mengubah cara kerja AI secara fundamental.</p>
    </div>

    <form action="{{ route('dashboard.prompt') }}" method="POST" class="flex flex-col">
        @csrf
        
        <div class="p-0 border-b border-[#2a2a2a]">
            <!-- Simple code editor look using a textarea -->
            <textarea name="prompt_content" rows="25" spellcheck="false" 
                      class="w-full bg-[#121212] text-gray-300 font-mono text-sm p-6 focus:outline-none focus:ring-1 focus:ring-[#ee4d2d] leading-relaxed resize-y"
                      style="tab-size: 4;"
                      required>{{ old('prompt_content', $promptContent) }}</textarea>
        </div>

        <div class="p-6 bg-[#181818] flex items-center justify-between">
            <div class="text-sm text-gray-400">
                <span class="font-medium text-[#ee4d2d]">Penting:</span> Jangan ubah teks yang berada di dalam tanda kurung kurawal seperti <code>{store_name}</code> atau <code>{product_list_json}</code> karena itu adalah variabel sistem.
            </div>
            
            <button type="submit" class="bg-[#ee4d2d] hover:bg-[#d73f21] text-white font-medium rounded-lg px-6 py-2.5 flex items-center gap-2 transition-colors whitespace-nowrap">
                <i data-lucide="save" class="w-4 h-4"></i> Simpan Prompt
            </button>
        </div>
    </form>
</div>
@endsection
