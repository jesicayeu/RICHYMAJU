<?php

namespace App\Services;

use App\Casts\EncryptedDecimal;
use App\Casts\EncryptedInteger;
use App\Casts\EncryptedJson;
use App\Casts\EncryptedString;
use App\Models\AuditLog;
use App\Models\Debt;
use App\Models\Message;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WhatsappActionTemplate;
use App\Models\WhatsappChatId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class DatabaseReencryptionService
{
    public function __construct(
        private EncryptionService $encryption,
        private GoogleDriveService $drive,
        private StoragePathMigrationService $storagePaths,
    ) {}

    /**
     * @return array{text_records: int, file_records: int}
     */
    public function reencryptAll(): array
    {
        if (! $this->encryption->isReady('text')) {
            throw new \RuntimeException('Kunci enkripsi teks belum dikonfigurasi di halaman Enkrip.');
        }

        if (! $this->encryption->isReady('file')) {
            throw new \RuntimeException('Kunci enkripsi file belum dikonfigurasi di halaman Enkrip.');
        }

        $this->storagePaths->migrateAllToPlain();

        $textRecords = 0;

        foreach ([
            Transaction::class,
            Debt::class,
            StockMovement::class,
            Message::class,
            AuditLog::class,
            User::class,
            WhatsappActionTemplate::class,
            WhatsappChatId::class,
        ] as $modelClass) {
            /** @var class-string<Model> $modelClass */
            $modelClass::query()->each(function (Model $model) use (&$textRecords, $modelClass) {
                if ($this->reencryptModelAttributes($model)) {
                    $textRecords++;
                    $this->log("Teks: {$modelClass} #{$model->getKey()}");
                }
            });
        }

        $fileRecords = $this->reencryptStoredFiles();

        return [
            'text_records' => $textRecords,
            'file_records' => $fileRecords,
        ];
    }

    private function reencryptModelAttributes(Model $model): bool
    {
        $dirty = false;

        foreach ($model->getCasts() as $attribute => $cast) {
            if (! in_array($cast, [
                EncryptedString::class,
                EncryptedJson::class,
                EncryptedInteger::class,
                EncryptedDecimal::class,
            ], true)) {
                continue;
            }

            $value = $model->getAttribute($attribute);

            if ($value === null || $value === '') {
                continue;
            }

            $model->setAttribute($attribute, $value);
            $dirty = true;
        }

        if ($dirty) {
            $model->saveQuietly();
        }

        return $dirty;
    }

    private function reencryptStoredFiles(): int
    {
        $count = 0;

        User::query()->whereNotNull('avatar_path')->each(function (User $user) use (&$count) {
            if ($this->reencryptFilePath($user->avatar_path)) {
                $count++;
                $this->log("File: User #{$user->id} avatar");
            }
        });

        Transaction::query()->whereNotNull('evidence_path')->each(function (Transaction $model) use (&$count) {
            if ($this->reencryptFilePath($model->evidence_path)) {
                $count++;
                $this->log("File: Transaction #{$model->id} evidence");
            }
        });

        Debt::query()->whereNotNull('evidence_path')->each(function (Debt $model) use (&$count) {
            if ($this->reencryptFilePath($model->evidence_path)) {
                $count++;
                $this->log("File: Debt #{$model->id} evidence");
            }
        });

        Message::query()->whereNotNull('attachment_path')->each(function (Message $model) use (&$count) {
            if ($this->reencryptFilePath($model->attachment_path)) {
                $count++;
                $this->log("File: Message #{$model->id} attachment");
            }
        });

        return $count;
    }

    private function reencryptFilePath(?string $path): bool
    {
        if (! filled($path)) {
            return false;
        }

        try {
            if ($this->drive->isDrivePath($path)) {
                [, $contents] = $this->drive->download($path);
                $this->drive->replaceContents($path, $contents);

                return true;
            }

            if (! Storage::disk('public')->exists($path)) {
                return false;
            }

            $raw = Storage::disk('public')->get($path);
            $plain = $this->encryption->tryDecryptBytes($raw) ?? $raw;
            Storage::disk('public')->put($path, $this->encryption->encryptBytes($plain));

            return true;
        } catch (\Throwable $e) {
            $this->log("Gagal file [{$path}]: {$e->getMessage()}");

            return false;
        }
    }

    private function log(string $message): void
    {
        if (app()->runningInConsole()) {
            echo $message.PHP_EOL;
        }
    }
}
