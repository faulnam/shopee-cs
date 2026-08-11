<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->post('/reply', [\App\Http\Controllers\Api\ReplyController::class, 'reply']);
Route::middleware('auth:sanctum')->post('/products/sync', [\App\Http\Controllers\Api\ProductSyncController::class, 'sync']);
Route::middleware('auth:sanctum')->get('/prompts', [\App\Http\Controllers\Api\PromptController::class, 'index']);
