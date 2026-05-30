<?php

namespace App\Services;

use App\Models\User;
use App\Models\WhatsappActionTemplate;
use App\Models\WhatsappChatId;
use App\Models\WhatsappConfig;
use App\Models\WhatsappSetting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class WhatsappNotificationService
{
    public function __construct(
        private WahaService $waha,
        private WhatsappTemplateVariableResolver $resolver,
    ) {}

    /** @param array<string, mixed> $extra */
    public function dispatch(string $actionType, User $actor, ?Model $record = null, array $extra = [], ?User $recipient = null): void
    {
        try {
            $settings = WhatsappSetting::current();
            if ($settings->connection_status !== 'terhubung') {
                Log::info('WhatsApp notifikasi dilewati: WAHA belum terhubung.', compact('actionType'));

                return;
            }

            $config = WhatsappConfig::current();
            if (! $config->session) {
                Log::info('WhatsApp notifikasi dilewati: session belum dikonfigurasi.', compact('actionType'));

                return;
            }

            $actionKey = WhatsappActionTemplate::buildActionKey($actor->id, $actionType);
            $template = WhatsappActionTemplate::query()->where('action_key', $actionKey)->first();

            if (! $template || trim((string) $template->body) === '') {
                Log::info('WhatsApp notifikasi dilewati: template tidak ditemukan.', [
                    'action_type' => $actionType,
                    'action_key' => $actionKey,
                ]);

                return;
            }

            $contactTrigger = $this->contactTriggerFor($actionType, $actor);
            if (! $contactTrigger) {
                return;
            }

            $contacts = WhatsappChatId::query()
                ->whereJsonContains('action_keys', $contactTrigger)
                ->get();

            if ($contacts->isEmpty()) {
                Log::info('WhatsApp notifikasi dilewati: tidak ada kontak.', [
                    'action_type' => $actionType,
                    'contact_trigger' => $contactTrigger,
                ]);

                return;
            }

            $body = $this->resolver->renderFromContext(
                $template->body ?? '',
                $actionType,
                $record,
                $actor,
                $recipient,
                $extra,
            );

            $this->waha->useSettings($settings);

            foreach ($contacts as $contact) {
                try {
                    $this->waha->sendText($config->session, $contact->chat_id, $body);
                } catch (RuntimeException $e) {
                    Log::warning('Gagal kirim WhatsApp notifikasi.', [
                        'contact_id' => $contact->id,
                        'action_type' => $actionType,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            Log::error('WhatsApp notifikasi gagal diproses.', [
                'action_type' => $actionType,
                'actor_id' => $actor->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function contactTriggerFor(string $actionType, User $actor): ?string
    {
        $roleSuffix = $actor->role === 'admin' ? 'pemilik' : 'kasir';

        if (str_starts_with($actionType, 'transaksi_')) {
            return 'transaksi_'.$roleSuffix;
        }

        if (str_starts_with($actionType, 'stok_')) {
            return 'stok_'.$roleSuffix;
        }

        if (str_starts_with($actionType, 'utang_')) {
            return 'utang_'.$roleSuffix;
        }

        if ($actionType === 'kirim_chat') {
            return $actor->role === 'admin' ? 'chat_pemilik' : 'chat_kasir';
        }

        return null;
    }
}
