<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['participant_a_id', 'participant_b_id', 'last_message_at'])]
class Conversation extends Model
{
    protected function casts(): array
    {
        return ['last_message_at' => 'datetime'];
    }

    public function participantA(): BelongsTo
    {
        return $this->belongsTo(User::class, 'participant_a_id');
    }

    public function participantB(): BelongsTo
    {
        return $this->belongsTo(User::class, 'participant_b_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function otherParticipant(User $user): ?User
    {
        if ($this->participant_a_id === $user->id) {
            return $this->relationLoaded('participantB')
                ? $this->getRelation('participantB')
                : $this->participantB()->first();
        }

        return $this->relationLoaded('participantA')
            ? $this->getRelation('participantA')
            : $this->participantA()->first();
    }
}
