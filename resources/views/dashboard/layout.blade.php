<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Shopee CS Bot</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #121212;
            color: #e0e0e0;
        }
        
        .sidebar-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 8px;
            color: #a0a0a0;
            transition: all 0.2s;
            font-weight: 500;
        }
        
        .sidebar-link:hover {
            background-color: #1e1e1e;
            color: #fff;
        }
        
        .sidebar-link.active {
            background-color: #ee4d2d20;
            color: #ee4d2d;
            border-left: 3px solid #ee4d2d;
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #121212; 
        }
        ::-webkit-scrollbar-thumb {
            background: #333; 
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #444; 
        }
    </style>
</head>
<body class="flex h-screen overflow-hidden">

    <!-- Sidebar -->
    <aside class="w-64 bg-[#181818] border-r border-[#2a2a2a] flex flex-col">
        <div class="h-16 flex items-center px-6 border-b border-[#2a2a2a]">
            <div class="w-8 h-8 bg-[#ee4d2d] rounded-md flex items-center justify-center mr-3">
                <i data-lucide="bot" class="text-white w-5 h-5"></i>
            </div>
            <span class="text-lg font-bold text-white tracking-wide">CS Bot Admin</span>
        </div>

        <nav class="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            <a href="{{ route('dashboard.index') }}" class="sidebar-link {{ request()->routeIs('dashboard.index') ? 'active' : '' }}">
                <i data-lucide="layout-dashboard" class="w-5 h-5"></i> Overview
            </a>
            <a href="{{ route('dashboard.settings') }}" class="sidebar-link {{ request()->routeIs('dashboard.settings') ? 'active' : '' }}">
                <i data-lucide="settings" class="w-5 h-5"></i> Pengaturan Toko
            </a>
            <a href="{{ route('dashboard.products') }}" class="sidebar-link {{ request()->routeIs('dashboard.products') ? 'active' : '' }}">
                <i data-lucide="package" class="w-5 h-5"></i> Produk
            </a>
            <a href="{{ route('dashboard.prompt') }}" class="sidebar-link {{ request()->routeIs('dashboard.prompt') ? 'active' : '' }}">
                <i data-lucide="terminal-square" class="w-5 h-5"></i> System Prompt
            </a>
            <a href="{{ route('dashboard.conversations') }}" class="sidebar-link {{ request()->routeIs('dashboard.conversations*') ? 'active' : '' }}">
                <i data-lucide="message-square" class="w-5 h-5"></i> Riwayat Chat
            </a>
            <a href="{{ route('dashboard.extension') }}" class="sidebar-link {{ request()->routeIs('dashboard.extension*') ? 'active' : '' }}">
                <i data-lucide="puzzle" class="w-5 h-5"></i> Ekstensi Chrome
            </a>
        </nav>

        <div class="p-4 border-t border-[#2a2a2a]">
            <form action="{{ route('admin.logout') }}" method="POST">
                @csrf
                <button type="submit" class="flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 w-full transition-colors text-sm font-medium">
                    <i data-lucide="log-out" class="w-4 h-4"></i> Logout
                </button>
            </form>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#121212]">
        
        <!-- Header -->
        <header class="h-16 bg-[#181818] border-b border-[#2a2a2a] flex items-center justify-between px-8">
            <h1 class="text-xl font-semibold text-white">@yield('title', 'Dashboard')</h1>
            <div class="flex items-center gap-4 text-sm text-gray-400">
                <span class="flex items-center gap-2">
                    <span class="relative flex h-3 w-3">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    System Online
                </span>
            </div>
        </header>

        <!-- Page Content -->
        <div class="flex-1 overflow-auto p-8">
            <div class="max-w-6xl mx-auto">
                @if(session('success'))
                    <div class="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
                        <i data-lucide="check-circle" class="w-5 h-5 mt-0.5 flex-shrink-0"></i>
                        <div>{{ session('success') }}</div>
                    </div>
                @endif
                
                @if(session('error'))
                    <div class="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
                        <i data-lucide="alert-circle" class="w-5 h-5 mt-0.5 flex-shrink-0"></i>
                        <div>{{ session('error') }}</div>
                    </div>
                @endif

                @yield('content')
            </div>
        </div>
    </main>

    <!-- Initialize Icons -->
    <script>
        lucide.createIcons();
    </script>
    
    @stack('scripts')
</body>
</html>
