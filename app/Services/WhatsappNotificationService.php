<?php

namespace App\Services;

use App\Models\Message;
use App\Models\MessageWhatsappDelivery;
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
            $template = WhatsappActionTemplate::findByActionKey($actionKey);

            if (! $template || trim((string) $template->body) === '') {
                Log::info('WhatsApp notifikasi dilewati: template tidak ditemukan.', [
                    'action_type' => $actionType,
                    'action_key' => $actionKey,
                ]);

                return;
            }

            $contactTrigger = WhatsappActionTemplate::contactTriggerForActionType($actionType, $actor->role);

            if (! $contactTrigger) {
                return;
            }

            $contacts = WhatsappChatId::allMatchingTrigger($contactTrigger);

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
                    $phone = $contact->user?->phone;

                    if (! $phone) {
                        Log::warning('WhatsApp notifikasi dilewati: kontak tanpa nomor HP.', [
                            'contact_id' => $contact->id,
                        ]);

                        continue;
                    }

                    $sendResult = $this->waha->sendTextToPhone($config->session, $phone, $body);
                    $contact->update(['chat_id' => $sendResult['chatId']]);

                    if ($actionType === 'kirim_chat' && $record instanceof Message) {
                        MessageWhatsappDelivery::recordForMessage($record, $sendResult);
                    }
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
}
