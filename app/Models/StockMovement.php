<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'code',
    'user_id',
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
            'quantity' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function audits(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }
}
