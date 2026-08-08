<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Setting;
use App\Services\OpenRouterService;
use App\Services\ProductMatcherService;
use App\Services\PromptBuilderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReplyController extends Controller
{
    public function __construct(
        private PromptBuilderService $promptBuilder,
        private OpenRouterService $ai,
        private ProductMatcherService $productMatcher,
    ) {}

    public function reply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_message' => 'required|string|max:2000',
            'chat_history' => 'array',
            'chat_history.*.sender' => 'in:customer,bot',
            'chat_history.*.text' => 'string',
            'conversation_id' => 'required|string|max:255',
            'tone' => 'nullable|string|max:255',
            'customer_name' => 'nullable|string|max:255',
            'extra_context' => 'nullable|string|max:2000',
        ]);

        $settings = Setting::first();

        if (!$settings || !$settings->auto_reply_enabled) {
            return response()->json(['reply' => null, 'message' => 'Auto-reply sedang nonaktif.']);
        }

        $relevantProducts = $this->productMatcher
            ->findRelevant($validated['customer_message'])
            ->map(fn($p) => $p->toPromptArray())
            ->values()
            ->all();

        $prompt = $this->promptBuilder->build([
            'store_name' => $settings->store_name,
            'store_category' => $settings->store_category,
            'store_policy' => $settings->store_policy,
            'tone' => $validated['tone'] ?? $settings->tone,
            'products' => $relevantProducts,
            'chat_history' => $validated['chat_history'] ?? [],
            'customer_message' => $validated['customer_message'],
            'customer_name' => $validated['customer_name'] ?? 'Pelanggan',
            'extra_context' => $validated['extra_context'] ?? '',
        ]);

        $reply = $this->ai->generateReply($prompt);

        if ($reply === '') {
            return response()->json(['reply' => null, 'message' => 'AI gagal generate balasan.'], 502);
        }

        $conversation = Conversation::firstOrCreate(
            ['platform_chat_id' => $validated['conversation_id']]
        );

        Message::create([
            'conversation_id' => $conversation->id,
            'sender' => 'customer',
            'text' => $validated['customer_message'],
        ]);

        Message::create([
            'conversation_id' => $conversation->id,
            'sender' => 'bot',
            'text' => $reply,
        ]);

        return response()->json(['reply' => $reply]);
    }
}
