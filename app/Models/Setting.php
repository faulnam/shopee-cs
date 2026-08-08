<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'store_name',
        'store_category',
        'store_policy',
        'tone',
        'auto_reply_enabled',
    ];

    protected $casts = [
        'auto_reply_enabled' => 'boolean',
    ];
}
