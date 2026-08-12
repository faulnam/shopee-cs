<?php

namespace App\Services;

class PromptBuilderService
{
    /**
     * Bangun system prompt final dari template markdown + data dinamis.
     *
     * @param array{
     *   store_name: string,
     *   store_category: ?string,
     *   store_policy: ?string,
     *   tone: string,
     *   products: array,
     *   chat_history: array,
     *   customer_message: string,
     *   customer_name?: string,
     *   extra_context?: string
     * } $data
     */
    public function build(array $data): string
    {
        // $data['tone'] is now the ID of the prompt
        $promptId = $data['tone'];
        $prompt = \App\Models\Prompt::find($promptId);
        
        // Fallback to the first prompt or a default message if not found
        if ($prompt) {
            $template = $prompt->content;
        } else {
            $firstPrompt = \App\Models\Prompt::first();
            $template = $firstPrompt ? $firstPrompt->content : 'Gagal memuat prompt.';
        }

        $replacements = [
            '{store_name}' => $data['store_name'],
            '{store_category}' => $data['store_category'] ?? '-',
            '{store_policy}' => $data['store_policy'] ?? '-',
            '{tone}' => $data['tone'],
            '{product_list_json}' => json_encode(
                $data['products'],
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
            '{chat_history}' => $this->formatHistory($data['chat_history']),
            '{customer_message}' => $data['customer_message'],
            '{customer_name}' => $data['customer_name'] ?? 'Pelanggan',
            '{extra_context}' => $data['extra_context'] ?? '',
        ];

        return strtr($template, $replacements);
    }

    private function formatHistory(array $history): string
    {
        if (empty($history)) {
            return '(Belum ada riwayat sebelumnya)';
        }

        $lines = array_map(function (array $msg) {
            $sender = ($msg['sender'] ?? '') === 'customer' ? 'Customer' : 'CS';
            $text = $msg['text'] ?? '';
            return "{$sender}: {$text}";
        }, $history);

        return implode("\n", $lines);
    }
}
