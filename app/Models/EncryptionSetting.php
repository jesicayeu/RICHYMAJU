<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EncryptionSetting extends Model
{
    public const KEY_TYPES = [
        'aes-256-gcm' => 'AES-256-GCM',
        'aes-256-cbc' => 'AES-256-CBC',
        'aes-128-gcm' => 'AES-128-GCM',
    ];

    protected $fillable = [
        'text_key',
        'text_key_type',
        'file_key',
        'file_key_type',
    ];

    protected function casts(): array
    {
        return [
            'text_key' => 'encrypted',
            'file_key' => 'encrypted',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'text_key_type' => 'aes-256-gcm',
            'file_key_type' => 'aes-256-gcm',
        ]);
    }
}
