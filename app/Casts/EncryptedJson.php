<?php

namespace App\Casts;

use App\Services\EncryptionService;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/** @implements CastsAttributes<array<string, mixed>|null, array<string, mixed>|null> */
class EncryptedJson implements CastsAttributes
{
    public function get(Model $model, string $key, mixed $value, array $attributes): ?array
    {
        if ($value === null || $value === '') {
            return null;
        }

        $encryption = app(EncryptionService::class);

        if (is_string($value) && $encryption->isEncrypted($value)) {
            $json = $encryption->tryDecryptText($value);

            if ($json === null) {
                return null;
            }
        } else {
            $json = is_string($value) ? $value : json_encode($value);
        }

        if ($json === null || $json === '') {
            return null;
        }

        /** @var array<string, mixed>|null $decoded */
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        $json = json_encode($value, JSON_THROW_ON_ERROR);

        return app(EncryptionService::class)->encryptText($json);
    }
}
