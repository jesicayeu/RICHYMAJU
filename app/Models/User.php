<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Casts\EncryptedString;
use App\Casts\StoragePath;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use App\Services\GoogleDriveService;
use App\Services\PresenceService;
use Illuminate\Support\Facades\Cache;

#[Fillable(['username', 'name', 'display_name', 'email', 'phone', 'password', 'role', 'status', 'avatar_path'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    protected $appends = ['avatar_url'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'password' => 'hashed',
            'name' => EncryptedString::class,
            'display_name' => EncryptedString::class,
            'phone' => EncryptedString::class,
            'avatar_path' => StoragePath::class,
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isActive(): bool
    {
        return $this->status === 'aktif';
    }

    /** Akun admin/kasir yang tampil di Kelola Akun (bukan soft delete). */
    public function scopeManagedAccounts(Builder $query): Builder
    {
        return $query->whereIn('role', ['admin', 'kasir']);
    }

    /** @return list<int> */
    public static function managedAccountIds(): array
    {
        return static::query()
            ->managedAccounts()
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /** @return list<int> */
    public static function activeManagedAccountIds(): array
    {
        return static::query()
            ->managedAccounts()
            ->where('status', 'aktif')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function debts(): HasMany
    {
        return $this->hasMany(Debt::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function whatsappAccount(): HasOne
    {
        return $this->hasOne(WhatsappAccount::class);
    }

    public function whatsappChatIds(): HasMany
    {
        return $this->hasMany(WhatsappChatId::class);
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::get(fn () => $this->avatar_path
            ? app(GoogleDriveService::class)->url($this->avatar_path)
            : null);
    }

    public function isOnline(): bool
    {
        return PresenceService::canTrack($this) && Cache::has($this->onlineCacheKey());
    }

    public function markOnline(int $ttlSeconds = PresenceService::ONLINE_TTL_SECONDS): void
    {
        PresenceService::markOnline($this, $ttlSeconds);
    }

    public function markOffline(): void
    {
        PresenceService::markOffline($this);
    }

    /**
     * @return array<string, mixed>
     */
    public function presencePayload(): array
    {
        return [
            'id' => $this->id,
            'is_online' => $this->isOnline(),
            'last_login_at' => $this->formatDateTime($this->last_login_at),
            'last_seen_at' => $this->formatDateTime($this->last_seen_at),
        ];
    }

    protected function formatDateTime(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format(\DateTimeInterface::ATOM);
        }

        return (string) $value;
    }

    /**
     * @return array<string, mixed>
     */
    public function toChatArray(): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'name' => $this->name,
            'display_name' => $this->display_name,
            'role' => $this->role,
            'avatar_url' => $this->avatar_url,
            ...$this->presencePayload(),
        ];
    }

    public function onlineCacheKey(): string
    {
        return 'chat-online:'.$this->id;
    }
}
