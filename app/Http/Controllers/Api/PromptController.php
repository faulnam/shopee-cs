<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prompt;

class PromptController extends Controller
{
    public function index()
    {
        return response()->json(Prompt::select('id', 'name')->get());
    }
}
