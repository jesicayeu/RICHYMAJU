<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\WhatsappActionTemplate;
use App\Services\EncryptionService;
use App\Services\WhatsappDefaultTemplateFactory;
use Illuminate\Console\Command;

class SeedWhatsappMessageTemplatesCommand extends Command
{
    protected $signature = 'whatsapp:seed-message-templates
                            {--force : Timpa template yang sudah ada untuk action_key yang sama}';

    protected $description = 'Buat template pesan WhatsApp untuk setiap aksi (terenkripsi kunci teks)';

    public function handle(EncryptionService $encryption): int
    {
        if (! $encryption->isReady('text')) {
            $this->error('Kunci teks belum dikonfigurasi di halaman Enkrip.');

            return self::FAILURE;
        }

        $users = User::query()
            ->whereIn('role', ['admin', 'kasir'])
            ->where('status', 'aktif')
            ->orderBy('name')
            ->get(['id', 'name', 'display_name', 'role']);

        if ($users->isEmpty()) {
            $this->error('Tidak ada akun admin/kasir aktif.');

            return self::FAILURE;
        }

        $definitions = WhatsappDefaultTemplateFactory::allForUsers($users);
        $created = 0;
        $skipped = 0;
        $updated = 0;

        foreach ($definitions as $data) {
            $existing = WhatsappActionTemplate::findByActionKey($data['action_key']);

            if ($existing && ! $this->option('force')) {
                $skipped++;

                continue;
            }

            if ($existing) {
                $existing->update([
                    'title' => $data['title'],
                    'body' => $data['body'],
                ]);
                $updated++;

                continue;
            }

            WhatsappActionTemplate::create($data);
            $created++;
        }

        $this->info("Selesai: {$created} dibuat, {$updated} diperbarui, {$skipped} dilewati.");
        $this->line('Total di database: '.WhatsappActionTemplate::count());

        return self::SUCCESS;
    }
}
