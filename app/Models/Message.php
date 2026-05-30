<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['conversation_id', 'sender_id', 'body', 'attachment_path', 'attachment_original_name', 'context_type', 'context_id', 'read_at'])]
class Message extends Model
{
    protected $appends = ['attachment_url'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    protected function attachmentUrl(): Attribute
    {
        return Attribute::get(fn () => $this->attachment_path ? asset('storage/'.$this->attachment_path) : null);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
