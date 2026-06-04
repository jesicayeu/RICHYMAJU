<?php

namespace App\Console\Commands;

use App\Services\DatabaseReencryptionService;
use Illuminate\Console\Command;

class EncryptExistingDataCommand extends Command
{
    protected $signature = 'app:encrypt-existing-data';

    protected $description = 'Enkripsi ulang seluruh data database dan file dengan kunci dari halaman Enkrip.';

    public function handle(DatabaseReencryptionService $reencryption): int
    {
        try {
            $result = $reencryption->reencryptAll();
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info("Selesai. {$result['text_records']} record teks dan {$result['file_records']} file diperbarui.");

        return self::SUCCESS;
    }
}
