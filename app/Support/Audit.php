<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class Audit
{
    public static function record(Model $model, string $action, array $before = [], array $after = [], ?string $note = null): void
    {
        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => $model::class,
            'auditable_id' => $model->getKey(),
            'action' => $action,
            'before_json' => $before ?: null,
            'after_json' => $after ?: null,
            'note' => $note,
            'created_at' => now(),
        ]);
    }
}
