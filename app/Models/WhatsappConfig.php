<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappConfig extends Model
{
    protected $fillable = [
        'operation',
        'session',
        'default_text',
    ];

    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'operation' => 'sendText',
        ]);
    }
}
