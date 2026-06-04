<?php

namespace App\Services;

use App\Models\Debt;
use App\Models\Message;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class StoragePathMigrationService
{
    public function __construct(
        private EncryptionService $encryption,
    ) {}

    /**
     * @return array{migrated: int, failed: int}
     */
    public function migrateAllToPlain(): array
    {
        $migrated = 0;
        $failed = 0;

        foreach ([
            [User::class, 'avatar_path'],
            [Transaction::class, 'evidence_path'],
            [Debt::class, 'evidence_path'],
            [Message::class, 'attachment_path'],
        ] as [$modelClass, $column]) {
            /** @var class-string<Model> $modelClass */
            $modelClass::query()->whereNotNull($column)->where($column, '!=', '')->each(
                function (Model $model) use ($column, &$migrated, &$failed, $modelClass) {
                    $raw = $model->getRawOriginal($column);

                    if ($raw === null || $raw === '' || ! $this->encryption->isEncrypted($raw)) {
                        return;
                    }

                    $plain = $this->encryption->tryDecryptText($raw);

                    if ($plain === null || $plain === '' || str_starts_with($plain, '[Gagal')) {
                        $failed++;

                        return;
                    }

                    $model->forceFill([$column => $plain]);
                    $model->saveQuietly();
                    $migrated++;
                },
            );
        }

        return ['migrated' => $migrated, 'failed' => $failed];
    }
}
