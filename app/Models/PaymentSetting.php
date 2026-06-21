<?php

namespace App\Models;

use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    protected $fillable = [
        'bank_name',
        'account_number',
        'account_holder',
        'static_qris_payload',
        'dana_phone',
        'dana_account_holder',
        'dana_static_qris_payload',
        'gopay_phone',
        'gopay_account_holder',
        'gopay_static_qris_payload',
    ];

    protected function casts(): array
    {
        return [
            'bank_name' => EncryptedString::class,
            'account_number' => EncryptedString::class,
            'account_holder' => EncryptedString::class,
            'static_qris_payload' => EncryptedString::class,
            'dana_phone' => EncryptedString::class,
            'dana_account_holder' => EncryptedString::class,
            'dana_static_qris_payload' => EncryptedString::class,
            'gopay_phone' => EncryptedString::class,
            'gopay_account_holder' => EncryptedString::class,
            'gopay_static_qris_payload' => EncryptedString::class,
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([]);
    }

    public function isConfigured(): bool
    {
        return filled($this->static_qris_payload) && filled($this->account_holder);
    }

    /**
     * @return array{
     *     merchant_name: ?string,
     *     merchant_id: ?string,
     *     provider_name: ?string,
     *     has_qris: bool
     * }
     */
    public function publicPayload(): array
    {
        return [
            'merchant_name' => $this->account_holder,
            'merchant_id' => $this->account_number,
            'provider_name' => $this->bank_name,
            'has_qris' => filled($this->static_qris_payload),
        ];
    }
}
