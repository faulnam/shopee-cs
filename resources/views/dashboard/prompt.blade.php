@extends('dashboard.layout')

@section('title', 'System Prompt AI')

@section('content')
<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
    <!-- Sidebar Prompt List -->
    <div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
        <div class="p-4 border-b border-[#2a2a2a] flex justify-between items-center bg-[#181818]">
            <h2 class="text-sm font-semibold text-white">Gaya Bahasa</h2>
            <a href="{{ route('dashboard.prompt') }}" class="text-[#ee4d2d] hover:text-[#d73f21] p-1 bg-[#ee4d2d10] rounded" title="Buat Baru">
                <i data-lucide="plus" class="w-4 h-4"></i>
            </a>
        </div>
        <div class="flex-1 overflow-y-auto">
            @foreach($prompts as $p)
                <a href="{{ route('dashboard.prompt', ['id' => $p->id]) }}" 
                   class="block p-4 border-b border-[#2a2a2a] hover:bg-[#252525] transition-colors {{ ($selectedPrompt && $selectedPrompt->id == $p->id) ? 'bg-[#2a2a2a] border-l-2 border-l-[#ee4d2d]' : '' }}">
                    <div class="text-sm font-medium text-white">{{ $p->name }}</div>
                </a>
            @endforeach
            @if($prompts->isEmpty())
                <div class="p-4 text-xs text-gray-500 text-center">Belum ada gaya bahasa</div>
            @endif
        </div>
    </div>

    <!-- Editor -->
    <div class="md:col-span-3 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
        <div class="p-4 border-b border-[#2a2a2a] bg-[#181818] flex justify-between items-center">
            <h2 class="text-sm font-semibold text-white">
                {{ $selectedPrompt ? 'Edit: ' . $selectedPrompt->name : 'Buat Gaya Bahasa Baru' }}
            </h2>
            @if($selectedPrompt)
            <form action="{{ route('dashboard.prompt.delete', $selectedPrompt->id) }}" method="POST" onsubmit="return confirm('Hapus gaya bahasa ini?');">
                @csrf
                @method('DELETE')
                <button type="submit" class="text-red-400 hover:text-red-300 text-xs flex items-center gap-1">
                    <i data-lucide="trash-2" class="w-3 h-3"></i> Hapus
                </button>
            </form>
            @endif
        </div>

        <form action="{{ route('dashboard.prompt') }}" method="POST" class="flex flex-col flex-1">
            @csrf
            <input type="hidden" name="id" value="{{ $selectedPrompt ? $selectedPrompt->id : '' }}">
            
            <div class="p-4 border-b border-[#2a2a2a]">
                <label class="block text-xs font-medium text-gray-400 mb-1">Nama Gaya Bahasa (Contoh: Ramah, Formal, Excited)</label>
                <input type="text" name="name" value="{{ old('name', $selectedPrompt ? $selectedPrompt->name : '') }}" 
                       class="w-full bg-[#121212] border border-[#333] text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#ee4d2d]" required>
            </div>

            <div class="flex-1 p-0 relative">
                <textarea name="prompt_content" spellcheck="false" 
                          class="absolute inset-0 w-full h-full bg-[#121212] text-gray-300 font-mono text-sm p-4 focus:outline-none focus:ring-1 focus:ring-[#ee4d2d] leading-relaxed resize-none"
                          style="tab-size: 4;"
                          required>{{ old('prompt_content', $selectedPrompt ? $selectedPrompt->content : '') }}</textarea>
            </div>

            <div class="p-4 bg-[#181818] flex items-center justify-between border-t border-[#2a2a2a]">
                <div class="text-xs text-gray-400 truncate max-w-lg">
                    <span class="font-medium text-[#ee4d2d]">Variabel wajib:</span> {store_name}, {product_list_json}, {chat_history}, {customer_message}
                </div>
                
                <button type="submit" class="bg-[#ee4d2d] hover:bg-[#d73f21] text-white font-medium rounded-lg px-6 py-2 text-sm flex items-center gap-2 transition-colors">
                    <i data-lucide="save" class="w-4 h-4"></i> Simpan
                </button>
            </div>
        </form>
    </div>
</div>
@endsection
