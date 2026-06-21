<?php

namespace App\Models;

use App\Casts\EncryptedDecimal;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'code',
    'user_id',
    'product_id',
    'item_name',
    'type',
    'quantity',
    'unit',
    'status',
    'notes',
    'occurred_at',
])]
class StockMovement extends Model
{
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'code' => EncryptedString::class,
            'item_name' => EncryptedString::class,
            'type' => EncryptedString::class,
            'quantity' => EncryptedDecimal::class,
            'unit' => EncryptedString::class,
            'status' => EncryptedString::class,
            'notes' => EncryptedString::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function audits(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }
}
