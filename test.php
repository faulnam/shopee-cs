<?php
$ch = curl_init('http://127.0.0.1:8000/api/reply');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['customer_message' => 'halo kak', 'conversation_id' => 'test1234']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Authorization: Bearer 1|L70K2sZN7LpBhUDiBYcqFKglwqzU0Kuo4ZdlTDbR753469dc']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
echo curl_exec($ch);
