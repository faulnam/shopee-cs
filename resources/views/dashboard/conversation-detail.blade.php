@extends('dashboard.layout')

@section('title', 'Detail Percakapan')

@section('content')
<div class="mb-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
        <a href="{{ route('dashboard.conversations') }}" class="p-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors">
            <i data-lucide="arrow-left" class="w-5 h-5"></i>
        </a>
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
            Chat dengan {{ $conversation->customer_name ?: 'Customer' }}
        </h2>
    </div>
    <div class="text-sm text-gray-500 bg-[#1e1e1e] px-4 py-2 rounded-lg border border-[#2a2a2a]">
        ID: <span class="font-mono text-gray-300">{{ $conversation->platform_chat_id }}</span>
    </div>
</div>

<div class="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto shadow-xl">
    
    <!-- Chat Area -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
        
        <div class="text-center">
            <span class="px-3 py-1 bg-[#121212] border border-[#2a2a2a] rounded-full text-xs text-gray-500">
                Percakapan Dimulai: {{ $conversation->created_at->format('d M Y, H:i') }}
            </span>
        </div>

        @forelse($messages as $msg)
            @if($msg->sender === 'customer')
                <!-- Customer Bubble (Left) -->
                <div class="flex items-end gap-2 max-w-[85%]">
                    <div class="w-8 h-8 rounded-full bg-[#333] flex-shrink-0 flex items-center justify-center text-gray-300 font-bold text-xs">
                        {{ substr($conversation->customer_name ?: 'C', 0, 1) }}
                    </div>
                    <div class="flex flex-col gap-1">
                        <div class="bg-[#2a2a2a] border border-[#333] text-white px-4 py-3 rounded-2xl rounded-bl-sm whitespace-pre-wrap leading-relaxed shadow-sm">{{ $msg->text }}</div>
                        <span class="text-[10px] text-gray-500 ml-1">{{ $msg->created_at->format('H:i') }}</span>
                    </div>
                </div>
            @else
                <!-- Bot Bubble (Right) -->
                <div class="flex items-end justify-end gap-2 max-w-[85%] ml-auto">
                    <div class="flex flex-col gap-1 items-end">
                        <div class="bg-[#ee4d2d] text-white px-4 py-3 rounded-2xl rounded-br-sm whitespace-pre-wrap leading-relaxed shadow-sm">{{ $msg->text }}</div>
                        <span class="text-[10px] text-gray-500 mr-1 flex items-center gap-1">
                            <i data-lucide="bot" class="w-3 h-3"></i> {{ $msg->created_at->format('H:i') }}
                        </span>
                    </div>
                </div>
            @endif
        @empty
            <div class="text-center text-gray-500 italic mt-10">Belum ada pesan.</div>
        @endforelse
    </div>
</div>
@endsection
