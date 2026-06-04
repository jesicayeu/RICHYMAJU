<?php

namespace App\Casts;

use App\Services\EncryptionService;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** @implements CastsAttributes<int|null, int|string|null> */
class EncryptedInteger implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $encryption = app(EncryptionService::class);

        if (! $encryption->isEncrypted($value)) {
            return is_numeric($value) ? (int) $value : null;
        }

        $decrypted = $encryption->tryDecryptText((string) $value);

        return $decrypted !== null && is_numeric($decrypted) ? (int) $decrypted : null;
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return app(EncryptionService::class)->encryptText((string) (int) $value);
    }
}
