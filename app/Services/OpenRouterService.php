<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenRouterService
{
    public function generateReply(string $systemPrompt): string
    {
        $baseUrl = config('services.openrouter.base_url', 'https://openrouter.ai/api/v1');
        
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.openrouter.key'),
            'Content-Type' => 'application/json',
            // Header berikut opsional tapi direkomendasikan OpenRouter buat attribution
            'HTTP-Referer' => config('app.url'),
            'X-Title' => config('app.name'),
        ])->withoutVerifying()->timeout(60)->post(rtrim($baseUrl, '/') . '/chat/completions', [
            'model' => config('services.openrouter.model', 'deepseek/deepseek-chat'),
            'stream' => false,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => 'Berikan balasan CS sesuai instruksi di atas. Output HANYA teks balasan, tanpa penjelasan atau format lain.'],
            ],
            'temperature' => 0.7,
            'max_tokens' => 4096,
        ]);

        if ($response->failed()) {
            Log::error('OpenRouter API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return '';
        }

        // Parse response body - handle SSE-style mixed responses
        $body = $response->body();
        
        // Strip SSE markers if present (e.g. "data: [DONE]")
        $body = preg_replace('/data:\s*\[DONE\].*$/s', '', $body);
        $body = trim($body);
        
        $json = json_decode($body, true);
        
        if (!$json) {
            Log::error('OpenRouter JSON parse failed', ['body' => $response->body()]);
            return '';
        }

        $content = $json['choices'][0]['message']['content'] ?? '';
        $reasoningContent = $json['choices'][0]['message']['reasoning_content'] ?? '';

        // Untuk model reasoning (DeepSeek V4/R1): jika content kosong tapi
        // reasoning_content ada balasannya, coba extract balasan dari situ
        if (empty(trim($content)) && !empty($reasoningContent)) {
            $content = $this->extractReplyFromReasoning($reasoningContent);
            Log::info('OpenRouter: Extracted reply from reasoning_content', [
                'extracted' => $content,
            ]);
        }

        if (empty(trim($content))) {
            Log::warning('OpenRouter Empty Content', [
                'body' => $response->body(),
            ]);
        }

        return trim($content ?? '');
    }

    /**
     * Extract the actual reply text from reasoning_content.
     * Reasoning models often embed the final reply inside their thinking process.
     */
    private function extractReplyFromReasoning(string $reasoning): string
    {
        // Cari pattern "Balasan:" atau "## Balasan" yang biasa muncul di reasoning
        // Ambil teks setelah marker tersebut
        $patterns = [
            '/##\s*Balasan\s*\n+(.*?)(?:\n```|\n---|\n##|\z)/s',
            '/\*\*Balasan:\*\*\s*(.*?)(?:\n```|\n---|\n\*\*|\z)/s',
            '/Balasan:\s*(.*?)(?:\n```|\n---|\n\*\*|\z)/s',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $reasoning, $matches)) {
                $reply = trim($matches[1]);
                if (!empty($reply) && strlen($reply) > 10) {
                    // Bersihkan dari asterisks dan markdown artifacts
                    $reply = str_replace(['**', '*'], '', $reply);
                    return $reply;
                }
            }
        }

        return '';
    }
}
