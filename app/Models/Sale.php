<?php

namespace App\Models;

use App\Casts\EncryptedInteger;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'code',
    'user_id',
    'total_amount',
    'payment_status',
    'payment_method',
    'payment_barcode',
    'paid_at',
    'notes',
    'occurred_at',
    'sheet_row',
])]
class Sale extends Model
{
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'paid_at' => 'datetime',
            'code' => EncryptedString::class,
            'total_amount' => EncryptedInteger::class,
            'payment_status' => EncryptedString::class,
            'payment_method' => EncryptedString::class,
            'payment_barcode' => EncryptedString::class,
            'notes' => EncryptedString::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function transaction(): HasOne
    {
        return $this->hasOne(Transaction::class);
    }

    public function audits(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }
}
