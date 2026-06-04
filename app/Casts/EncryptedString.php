<?php

namespace App\Casts;

use App\Services\EncryptionService;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** @implements CastsAttributes<string|null, string|null> */
class EncryptedString implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $encryption = app(EncryptionService::class);

        if (! $encryption->isEncrypted($value)) {
            return (string) $value;
        }

        $decrypted = $encryption->tryDecryptText($value);

        return $decrypted ?? '[Gagal didekripsi — periksa kunci teks]';
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return app(EncryptionService::class)->encryptText((string) $value);
    }
}
