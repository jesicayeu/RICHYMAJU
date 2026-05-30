<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class PresenceService
{
    public const ONLINE_TTL_SECONDS = 45;

    public static function canTrack(?User $user): bool
    {
        return $user !== null
            && $user->isActive()
            && in_array($user->role, ['admin', 'kasir'], true);
    }

    public static function markOnline(User $user, int $ttlSeconds = self::ONLINE_TTL_SECONDS): void
    {
        if (! self::canTrack($user)) {
            return;
        }

        Cache::put($user->onlineCacheKey(), true, now()->addSeconds($ttlSeconds));
    }

    public static function markOffline(User $user): void
    {
        Cache::forget($user->onlineCacheKey());

        $user->forceFill(['last_seen_at' => now()->startOfMinute()])->saveQuietly();
    }

    public static function recordLogin(User $user): void
    {
        if (! self::canTrack($user)) {
            return;
        }

        $user->forceFill(['last_login_at' => now()->startOfMinute()])->saveQuietly();
        self::markOnline($user);
    }
}
