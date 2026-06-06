<?php

namespace App\Models;

use App\Models\Concerns\HasAdminVerification;
use App\Casts\EncryptedInteger;
use App\Casts\EncryptedString;
use App\Casts\StoragePath;
use App\Services\GoogleDriveService;
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
    use HasAdminVerification;

    protected $appends = ['evidence_url'];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'verified_at' => 'datetime',
            'code' => EncryptedString::class,
            'type' => EncryptedString::class,
            'amount' => EncryptedInteger::class,
            'description' => EncryptedString::class,
            'ui_status' => EncryptedString::class,
            'evidence_path' => StoragePath::class,
            'verification_status' => EncryptedString::class,
            'verification_note' => EncryptedString::class,
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
        return Attribute::get(fn () => app(GoogleDriveService::class)->url($this->evidence_path));
    }
}
