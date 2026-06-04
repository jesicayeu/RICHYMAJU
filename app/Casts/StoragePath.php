<?php

namespace App\Casts;

use App\Services\EncryptionService;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;

/**
 * Path penyimpanan file (gdrive:… atau lokal). Disimpan tanpa enkripsi kunci teks
 * agar mengubah kunci enkrip teks tidak memutus tampilan gambar.
 * Isi file tetap dienkripsi dengan kunci file di Google Drive / storage.
 *
 * @implements CastsAttributes<string|null, string|null>
 */
class StoragePath implements CastsAttributes
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

        return $encryption->tryDecryptText((string) $value);
    }

    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }
}
