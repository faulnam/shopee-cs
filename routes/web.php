<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('admin.login');
});

use App\Http\Controllers\DashboardController;

Route::get('/login', [DashboardController::class, 'loginForm'])->name('admin.login');
Route::post('/login', [DashboardController::class, 'login']);
Route::post('/logout', [DashboardController::class, 'logout'])->name('admin.logout');

Route::middleware(['admin_auth'])->prefix('dashboard')->name('dashboard.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('index');
    
    Route::get('/settings', [DashboardController::class, 'settings'])->name('settings');
    Route::post('/settings', [DashboardController::class, 'updateSettings']);
    
    Route::get('/products', [DashboardController::class, 'products'])->name('products');
    Route::put('/products/{product}', [DashboardController::class, 'updateProduct'])->name('products.update');
    Route::delete('/products/{product}', [DashboardController::class, 'deleteProduct'])->name('products.destroy');
    
    Route::get('/prompt', [DashboardController::class, 'prompt'])->name('prompt');
    Route::post('/prompt', [DashboardController::class, 'updatePrompt']);
    
    Route::get('/conversations', [DashboardController::class, 'conversations'])->name('conversations');
    Route::get('/conversations/{conversation}', [DashboardController::class, 'showConversation'])->name('conversations.show');
    
    Route::get('/extension', [DashboardController::class, 'extension'])->name('extension');
    Route::get('/extension/download', [DashboardController::class, 'downloadExtension'])->name('extension.download');
});
