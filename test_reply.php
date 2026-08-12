<?php
$ch = curl_init('http://127.0.0.1:8000/api/reply');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer 1|L70K2sZN7LpBhUDiBYcqFKglwqzU0Kuo4ZdlTDbR753469dc'
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'customer_message' => 'beli tas sekolah',
    'chat_history' => [],
    'conversation_id' => 'test_2',
    'tone' => '1',
    'customer_name' => 'Budi'
]));
$response = curl_exec($ch);
echo "Response:\n$response\n";
