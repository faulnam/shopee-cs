<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class DashboardController extends Controller
{
    // =========================================================================
    // LOGIN
    // =========================================================================

    public function loginForm()
    {
        if (session('admin_authenticated')) {
            return redirect()->route('dashboard.index');
        }
        return view('dashboard.login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $adminUser = env('ADMIN_USERNAME', 'admin');
        $adminPass = env('ADMIN_PASSWORD', 'admin123');

        if ($request->username === $adminUser && $request->password === $adminPass) {
            session(['admin_authenticated' => true]);
            return redirect()->route('dashboard.index');
        }

        return back()->withErrors(['credentials' => 'Username atau password salah.']);
    }

    public function logout()
    {
        session()->forget('admin_authenticated');
        return redirect()->route('admin.login');
    }

    // =========================================================================
    // DASHBOARD INDEX
    // =========================================================================

    public function index()
    {
        $stats = [
            'total_products' => Product::count(),
            'active_products' => Product::where('stok', '>', 0)->count(),
            'total_conversations' => Conversation::count(),
            'total_messages' => Message::count(),
            'auto_reply_status' => Setting::first()?->auto_reply_enabled ?? false,
        ];

        return view('dashboard.index', compact('stats'));
    }

    // =========================================================================
    // SETTINGS
    // =========================================================================

    public function settings()
    {
        $settings = Setting::first() ?? new Setting();
        return view('dashboard.settings', compact('settings'));
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'store_name' => 'required|string|max:255',
            'store_category' => 'nullable|string|max:255',
            'store_policy' => 'nullable|string|max:5000',
            'tone' => 'required|string|max:255',
            'auto_reply_enabled' => 'nullable|boolean',
        ]);

        $validated['auto_reply_enabled'] = $request->has('auto_reply_enabled');

        Setting::updateOrCreate(['id' => 1], $validated);

        return back()->with('success', 'Pengaturan berhasil disimpan!');
    }

    // =========================================================================
    // PRODUCTS
    // =========================================================================

    public function products()
    {
        $products = Product::orderByDesc('updated_at')->paginate(20);
        return view('dashboard.products', compact('products'));
    }

    public function updateProduct(Request $request, Product $product)
    {
        $validated = $request->validate([
            'nama_produk' => 'required|string|max:500',
            'harga_normal' => 'required|numeric|min:0',
            'harga_diskon' => 'nullable|numeric|min:0',
            'stok' => 'required|integer|min:0',
            'kategori' => 'nullable|string|max:255',
            'deskripsi_singkat' => 'nullable|string|max:1000',
            'link_produk' => 'nullable|string|max:1000',
        ]);

        $product->update($validated);

        return back()->with('success', "Produk \"{$product->nama_produk}\" berhasil diupdate!");
    }

    public function deleteProduct(Product $product)
    {
        $name = $product->nama_produk;
        $product->delete();

        return back()->with('success', "Produk \"{$name}\" berhasil dihapus!");
    }

    public function truncateProducts()
    {
        Product::truncate();
        return back()->with('success', 'Semua data produk berhasil dibersihkan!');
    }

    // =========================================================================
    // SYSTEM PROMPT
    // =========================================================================

    public function prompt(\Illuminate\Http\Request $request)
    {
        $prompts = \App\Models\Prompt::all();
        $selectedPrompt = null;
        
        if ($request->has('id')) {
            $selectedPrompt = \App\Models\Prompt::find($request->id);
        } else if ($prompts->count() > 0) {
            $selectedPrompt = $prompts->first();
        }

        return view('dashboard.prompt', compact('prompts', 'selectedPrompt'));
    }

    public function updatePrompt(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'id' => 'nullable|exists:prompts,id',
            'name' => 'required|string|max:255',
            'prompt_content' => 'required|string',
        ]);

        if ($request->id) {
            $prompt = \App\Models\Prompt::find($request->id);
            $prompt->update(['name' => $request->name, 'content' => $request->prompt_content]);
            $msg = 'Gaya Bahasa berhasil diupdate!';
        } else {
            \App\Models\Prompt::create(['name' => $request->name, 'content' => $request->prompt_content]);
            $msg = 'Gaya Bahasa baru berhasil dibuat!';
        }

        return redirect()->route('dashboard.prompt')->with('success', $msg);
    }
    
    public function deletePrompt(\App\Models\Prompt $prompt)
    {
        $prompt->delete();
        return redirect()->route('dashboard.prompt')->with('success', 'Gaya Bahasa dihapus!');
    }

    // =========================================================================
    // CONVERSATIONS
    // =========================================================================

    public function conversations()
    {
        $conversations = Conversation::withCount('messages')
            ->orderByDesc('updated_at')
            ->paginate(20);

        return view('dashboard.conversations', compact('conversations'));
    }

    public function showConversation(Conversation $conversation)
    {
        $messages = $conversation->messages()->orderBy('created_at')->get();
        return view('dashboard.conversation-detail', compact('conversation', 'messages'));
    }

    // =========================================================================
    // EXTENSION DOWNLOAD
    // =========================================================================

    public function extension()
    {
        $manifestPath = base_path('extension/manifest.json');
        $manifest = File::exists($manifestPath) ? json_decode(File::get($manifestPath), true) : null;

        return view('dashboard.extension', compact('manifest'));
    }

    public function downloadExtension()
    {
        $extensionPath = base_path('extension');

        if (!File::isDirectory($extensionPath)) {
            return back()->with('error', 'Folder extension tidak ditemukan di server.');
        }

        $zipFileName = 'shopee-cs-extension.zip';
        $tempZipPath = storage_path("app/{$zipFileName}");

        // Hapus zip lama jika ada
        if (File::exists($tempZipPath)) {
            File::delete($tempZipPath);
        }

        $zip = new ZipArchive();
        if ($zip->open($tempZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return back()->with('error', 'Gagal membuat file zip.');
        }

        $files = File::allFiles($extensionPath);
        foreach ($files as $file) {
            $relativePath = $file->getRelativePathname();
            $zip->addFile($file->getRealPath(), $relativePath);
        }

        // Tambahkan subfolder kosong juga
        $directories = File::directories($extensionPath);
        foreach ($directories as $dir) {
            $relativePath = basename($dir) . '/';
            $zip->addEmptyDir($relativePath);
        }

        $zip->close();

        return response()->download($tempZipPath, $zipFileName)->deleteFileAfterSend(true);
    }
}
