<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsappAccount extends Model
{
    protected $fillable = [
        'user_id',
        'waha_session_name',
        'phone',
        'status',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    public static function sessionNameForUser(User $user): string
    {
        return 'user-'.$user->id;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function webhooks(): HasMany
    {
        return $this->hasMany(WhatsappWebhook::class);
    }
}
