@extends('dashboard.layout')

@section('title', 'Riwayat Chat')

@section('content')
<div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-140px)]">
    <div class="p-6 border-b border-[#2a2a2a] flex justify-between items-center bg-[#181818] z-10 sticky top-0">
        <div>
            <h2 class="text-lg font-semibold text-white">Log Percakapan</h2>
            <p class="text-gray-400 text-sm mt-1">Riwayat percakapan antara bot AI dan customer.</p>
        </div>
    </div>

    <div class="overflow-x-auto flex-1">
        <table class="w-full text-left text-sm text-gray-400">
            <thead class="text-xs text-gray-500 uppercase bg-[#181818] border-b border-[#2a2a2a] sticky top-0">
                <tr>
                    <th scope="col" class="px-6 py-4 font-medium">Customer</th>
                    <th scope="col" class="px-6 py-4 font-medium">Platform ID</th>
                    <th scope="col" class="px-6 py-4 font-medium text-center">Jumlah Pesan</th>
                    <th scope="col" class="px-6 py-4 font-medium">Chat Terakhir</th>
                    <th scope="col" class="px-6 py-4 font-medium text-right">Aksi</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-[#2a2a2a]">
                @forelse($conversations as $conv)
                <tr class="hover:bg-[#222] transition-colors">
                    <td class="px-6 py-4">
                        <div class="font-medium text-white flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-[#ee4d2d]/20 text-[#ee4d2d] flex items-center justify-center font-bold text-xs uppercase">
                                {{ substr($conv->customer_name ?: '?', 0, 1) }}
                            </div>
                            {{ $conv->customer_name ?: 'Tanpa Nama' }}
                        </div>
                    </td>
                    <td class="px-6 py-4 font-mono text-xs">
                        {{ $conv->platform_chat_id }}
                    </td>
                    <td class="px-6 py-4 text-center">
                        <span class="px-2 py-1 bg-[#2a2a2a] rounded-full text-xs border border-[#333]">{{ $conv->messages_count }}</span>
                    </td>
                    <td class="px-6 py-4 text-xs">
                        {{ $conv->updated_at->diffForHumans() }}
                        <div class="text-gray-500">{{ $conv->updated_at->format('d M Y, H:i') }}</div>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <a href="{{ route('dashboard.conversations.show', $conv) }}" class="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#444] text-white rounded text-xs font-medium transition-colors">
                            <i data-lucide="eye" class="w-3 h-3"></i> Lihat Detail
                        </a>
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center justify-center">
                            <i data-lucide="message-square-dashed" class="w-12 h-12 mb-3 text-[#333]"></i>
                            <p>Belum ada riwayat percakapan.</p>
                        </div>
                    </td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
    
    @if($conversations->hasPages())
    <div class="p-4 border-t border-[#2a2a2a] bg-[#181818]">
        {{ $conversations->links() }}
    </div>
    @endif
</div>
@endsection
