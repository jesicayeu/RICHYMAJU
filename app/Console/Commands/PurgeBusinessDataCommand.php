<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PurgeBusinessDataCommand extends Command
{
    protected $signature = 'app:purge-business-data {--force : Tanpa konfirmasi}';

    protected $description = 'Hapus semua data transaksi, utang, stok, chat, audit, dan notifikasi (akun tetap ada).';

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('Semua data operasional akan dihapus. Akun pengguna tidak diubah. Lanjutkan?')) {
            $this->info('Dibatalkan.');

            return self::SUCCESS;
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        foreach (['messages', 'conversations', 'audit_logs', 'debts', 'transactions', 'stock_movements', 'notifications'] as $table) {
            DB::table($table)->truncate();
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $disk = Storage::disk('public');
        foreach (['chat', 'transactions', 'debts', 'evidence'] as $directory) {
            if ($disk->exists($directory)) {
                $disk->deleteDirectory($directory);
            }
        }

        $this->info('Data operasional berhasil dihapus. Kelola Akun tidak terpengaruh.');

        return self::SUCCESS;
    }
}
