<?php

use App\Models\Conversation;
use App\Services\PresenceService;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Schema;

Broadcast::channel('staff.presence', function ($user) {
    if (! PresenceService::canTrack($user)) {
        return false;
    }

    return ['id' => $user->id];
});

Broadcast::channel('online', function ($user) {
    if (! $user->isActive() || ! in_array($user->role, ['admin', 'kasir'], true)) {
        return false;
    }

    $payload = [
        'id' => $user->id,
        'name' => $user->display_name ?? $user->name,
        'role' => $user->role,
    ];

    if (Schema::hasColumn('users', 'last_login_at') && $user->last_login_at !== null) {
        $lastLogin = $user->last_login_at;
        $payload['last_login_at'] = $lastLogin instanceof \DateTimeInterface
            ? $lastLogin->format(\DateTimeInterface::ATOM)
            : (string) $lastLogin;
    }

    return $payload;
});

Broadcast::channel("conversation.{conversationId}", function ($user, int $conversationId) {
    $conversation = Conversation::find($conversationId);

    if (! $conversation) {
        return false;
    }

    return $conversation->participant_a_id === $user->id
        || $conversation->participant_b_id === $user->id;
});

Broadcast::channel('pos-cart.{userId}', function ($user, int $userId) {
    return (int) $user->id === $userId;
});
