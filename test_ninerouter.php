<?php
$ch = curl_init('http://localhost:20128/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer sk-de9b6f8adb37c1a2-qlkcrd-260e6d19'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => 'openai/gpt-4o-mini',
    'messages' => [['role' => 'user', 'content' => 'Hello']]
]));
$response = curl_exec($ch);
if (curl_errno($ch)) {
    echo "cURL Error: " . curl_error($ch) . "\n";
} else {
    echo "Response: " . $response . "\n";
    echo "HTTP Status: " . curl_getinfo($ch, CURLINFO_HTTP_CODE) . "\n";
}
