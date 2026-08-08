<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Shopee CS Bot</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #121212;
            color: #e0e0e0;
        }
    </style>
</head>
<body class="h-screen flex items-center justify-center">
    
    <div class="bg-[#1e1e1e] p-8 rounded-xl shadow-2xl w-full max-w-md border border-[#333]">
        <div class="text-center mb-8">
            <div class="w-16 h-16 bg-[#ee4d2d] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </div>
            <h1 class="text-2xl font-bold text-white">Shopee CS Bot</h1>
            <p class="text-gray-400 mt-2">Login to manage your extension</p>
        </div>

        @if($errors->any())
            <div class="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6 text-sm">
                {{ $errors->first() }}
            </div>
        @endif

        <form action="{{ route('admin.login') }}" method="POST">
            @csrf
            <div class="mb-5">
                <label class="block text-sm font-medium text-gray-400 mb-1">Username</label>
                <input type="text" name="username" class="w-full bg-[#2a2a2a] border border-[#444] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#ee4d2d] transition-colors" required autofocus>
            </div>
            
            <div class="mb-8">
                <label class="block text-sm font-medium text-gray-400 mb-1">Password</label>
                <input type="password" name="password" class="w-full bg-[#2a2a2a] border border-[#444] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#ee4d2d] transition-colors" required>
            </div>

            <button type="submit" class="w-full bg-[#ee4d2d] hover:bg-[#d73f21] text-white font-medium rounded-lg px-4 py-3 transition-colors">
                Login
            </button>
        </form>
    </div>

</body>
</html>
