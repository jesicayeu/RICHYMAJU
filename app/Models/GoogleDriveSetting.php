<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoogleDriveSetting extends Model
{
    protected $fillable = [
        'client_id',
        'client_secret',
        'folder_transactions',
        'folder_stocks',
        'folder_debts',
        'folder_chat',
        'folder_profile',
        'sheet_transactions',
        'sheet_stocks',
        'sheet_debts',
        'refresh_token',
        'access_token',
        'token_expires_at',
        'connected_email',
        'connected_at',
    ];

    protected function casts(): array
    {
        return [
            'client_secret' => 'encrypted',
            'refresh_token' => 'encrypted',
            'access_token' => 'encrypted',
            'token_expires_at' => 'datetime',
            'connected_at' => 'datetime',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'client_id' => config('google.client_id'),
            'client_secret' => config('google.client_secret'),
            'folder_transactions' => config('google.folders.transactions'),
            'folder_stocks' => config('google.folders.stocks'),
            'folder_debts' => config('google.folders.debts'),
            'folder_chat' => config('google.folders.chat'),
            'folder_profile' => config('google.folders.profile'),
            'sheet_transactions' => config('google.sheets.transactions'),
            'sheet_stocks' => config('google.sheets.stocks'),
            'sheet_debts' => config('google.sheets.debts'),
        ]);
    }

    public function folderIdFor(string $module): ?string
    {
        return match ($module) {
            'transactions' => $this->folder_transactions,
            'stocks' => $this->folder_stocks,
            'debts' => $this->folder_debts,
            'chat' => $this->folder_chat,
            'profile' => $this->folder_profile,
            default => null,
        };
    }

    public function sheetIdFor(string $module): ?string
    {
        return match ($module) {
            'transactions' => $this->sheet_transactions,
            'stocks' => $this->sheet_stocks,
            'debts' => $this->sheet_debts,
            default => null,
        };
    }
}
