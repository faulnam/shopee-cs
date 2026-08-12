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
            'HTTP-Referer' => config('app.url'),
            'X-Title' => config('app.name'),
        ])->withoutVerifying()->timeout(60)->post(rtrim($baseUrl, '/') . '/chat/completions', [
            'model' => config('services.openrouter.model', 'deepseek/deepseek-chat'),
            'stream' => false,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => 'Berikan balasan CS sesuai instruksi di atas. PENTING: Jika Anda merekomendasikan suatu produk, Anda WAJIB menyertakan kode `[SEND_PRODUCT: nama_produk_dari_json]` di akhir kalimat Anda agar sistem bisa mengirimkannya secara otomatis (Misal: "Kakak bisa cek yang ini ya: [SEND_PRODUCT: Tas Sekolah]"). Output HANYA teks balasan polos untuk dikirim ke chat! Jangan gunakan format JSON! Jangan gunakan markdown, Jangan ada penjelasan tambahan. Jika balasan dibungkus kurung kurawal, hapus!'],
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

        $body = $response->body();
        $body = preg_replace('/data:\s*\[DONE\].*$/s', '', $body);
        $body = trim($body);
        
        $json = json_decode($body, true);
        
        if (!$json) {
            Log::error('OpenRouter JSON parse failed', ['body' => $response->body()]);
            return '';
        }

        $content = $json['choices'][0]['message']['content'] ?? '';
        $reasoningContent = $json['choices'][0]['message']['reasoning_content'] ?? '';

        if (empty(trim($content)) && !empty($reasoningContent)) {
            $content = $this->extractReplyFromReasoning($reasoningContent);
        }
        
        // Strip out <think> tags if any leaked into the content
        $content = preg_replace('/<think>.*?<\/think>/s', '', $content);
        
        // Clean curly braces and JSON formatting if AI ignored instructions
        $content = trim($content);
        if (str_starts_with($content, '{') && str_ends_with($content, '}')) {
            // Attempt to extract inner value if it returned JSON like {"reply": "Halo"}
            $aiJson = json_decode($content, true);
            if (is_array($aiJson)) {
                // Get the first string value in the json object
                foreach ($aiJson as $val) {
                    if (is_string($val)) {
                        $content = $val;
                        break;
                    }
                }
            } else {
                // Just strip braces if it's not valid json but wrapped in braces
                $content = trim($content, "{}");
            }
        }
        
        // Final cleanup of markdown quotes or bolding just in case
        $content = str_replace(['**', '*'], '', $content);

        return trim($content);
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
