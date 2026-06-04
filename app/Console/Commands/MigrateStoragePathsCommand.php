<?php

namespace App\Console\Commands;

use App\Services\StoragePathMigrationService;
use Illuminate\Console\Command;

class MigrateStoragePathsCommand extends Command
{
    protected $signature = 'app:migrate-storage-paths';

    protected $description = 'Ubah path file di database dari enkripsi kunci teks menjadi plain text (gdrive:…).';

    public function handle(StoragePathMigrationService $migration): int
    {
        $result = $migration->migrateAllToPlain();

        $this->info("Selesai. {$result['migrated']} path diperbarui, {$result['failed']} gagal didekripsi.");

        if ($result['failed'] > 0) {
            $this->warn('Path yang gagal masih terenkripsi dengan kunci teks lama. Pasang kembali kunci teks lama lalu jalankan perintah ini lagi.');
        }

        return $result['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
