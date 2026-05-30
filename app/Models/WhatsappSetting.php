<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappSetting extends Model
{
    protected $fillable = [
        'host_url',
        'api_key',
        'connection_status',
        'last_checked_at',
    ];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'last_checked_at' => 'datetime',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'host_url' => config('waha.base_url'),
            'connection_status' => 'belum_terhubung',
        ]);
    }
}
