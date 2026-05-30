<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'code',
    'user_id',
    'type',
    'amount',
    'description',
    'ui_status',
    'evidence_path',
    'occurred_at',
    'verified_by',
    'verified_at',
    'verification_status',
    'verification_note',
])]
class Transaction extends Model
{
    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'verified_at' => 'datetime',
            'amount' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function audits(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable');
    }

    protected function evidenceUrl(): Attribute
    {
        return Attribute::get(fn () => $this->evidence_path ? asset('storage/'.$this->evidence_path) : null);
    }
}
