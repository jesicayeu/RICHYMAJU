<?php

namespace App\Models;

use App\Casts\EncryptedJson;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

class WhatsappChatId extends Model
{
    public const TRIGGER_OPTIONS = [
        'transaksi_kasir' => 'Tombol CRUD Transaksi — Kasir',
        'transaksi_pemilik' => 'Tombol CRUD Transaksi — Pemilik Toko',
        'stok_kasir' => 'Tombol CRUD Stok Barang — Kasir',
        'stok_pemilik' => 'Tombol CRUD Stok Barang — Pemilik Toko',
        'utang_kasir' => 'Tombol CRUD Utang — Kasir',
        'utang_pemilik' => 'Tombol CRUD Utang — Pemilik Toko',
        'chat_kasir' => 'Tombol Chat Kasir',
        'chat_pemilik' => 'Tombol Chat Pemilik',
    ];

    /** @var array<string, string> */
    private const LEGACY_TRIGGER_MAP = [
        'kasir_transaksi' => 'transaksi_kasir',
        'admin_transaksi' => 'transaksi_pemilik',
        'kasir_stok' => 'stok_kasir',
        'admin_stok' => 'stok_pemilik',
        'kasir_utang' => 'utang_kasir',
        'admin_utang' => 'utang_pemilik',
        'kasir_chat' => 'chat_kasir',
        'admin_chat' => 'chat_pemilik',
    ];

    /** @var array<string, array<int, string>> */
    private const LEGACY_EXPAND_MAP = [
        'transaksi' => ['transaksi_kasir', 'transaksi_pemilik'],
        'stok' => ['stok_kasir', 'stok_pemilik'],
        'utang' => ['utang_kasir', 'utang_pemilik'],
    ];

    protected $fillable = [
        'user_id',
        'chat_id',
        'label',
        'action_keys',
    ];

    protected function casts(): array
    {
        return [
            'chat_id' => EncryptedString::class,
            'label' => EncryptedString::class,
            'action_keys' => EncryptedJson::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @param array<int, string> $keys */
    public static function normalizeActionKeys(array $keys): array
    {
        $normalized = [];

        foreach ($keys as $key) {
            if (isset(self::LEGACY_EXPAND_MAP[$key])) {
                $normalized = array_merge($normalized, self::LEGACY_EXPAND_MAP[$key]);

                continue;
            }

            $mapped = self::LEGACY_TRIGGER_MAP[$key] ?? $key;

            if (isset(self::LEGACY_EXPAND_MAP[$mapped])) {
                $normalized = array_merge($normalized, self::LEGACY_EXPAND_MAP[$mapped]);
            } else {
                $normalized[] = $mapped;
            }
        }

        return array_values(array_unique($normalized));
    }

  /** @return Collection<int, self> */
    public static function allMatchingTrigger(string $contactTrigger): Collection
    {
        $normalizedTrigger = self::normalizeActionKeys([$contactTrigger]);

        return self::query()
            ->with('user:id,phone,name,display_name,role')
            ->get()
            ->filter(function (self $contact) use ($normalizedTrigger) {
                $keys = self::normalizeActionKeys($contact->action_keys ?? []);

                return $normalizedTrigger !== []
                    && array_intersect($normalizedTrigger, $keys) !== [];
            })
            ->values();
    }

    /** @param array<int, string> $keys */
    public static function resolveTriggerLabels(array $keys): string
    {
        $labels = array_map(
            fn (string $key) => self::TRIGGER_OPTIONS[$key] ?? $key,
            self::normalizeActionKeys($keys),
        );

        return implode(', ', $labels) ?: '—';
    }
}
