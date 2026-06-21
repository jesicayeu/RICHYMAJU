<?php

namespace App\Services;

use App\Models\User;
use App\Models\WhatsappAccount;
use App\Models\WhatsappConfig;
use App\Models\WhatsappWebhook;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class WhatsappIntegrationService
{
    public function __construct(
        private WahaService $waha,
    ) {}

    public function ensureWebhookRegistered(): void
    {
        try {
            $owner = $this->webhookOwner();
            $session = WhatsappConfig::current()->session;

            if (! $owner || ! $session) {
                return;
            }

            $account = $this->ensureAccount($owner, $session);
            $this->ensureRevokeWebhook($account);
            $this->waha->syncWebhooksToSession($account);
        } catch (Throwable $e) {
            Log::warning('Gagal mendaftarkan webhook WhatsApp chat.', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function ensureAccount(User $owner, string $sessionName): WhatsappAccount
    {
        return WhatsappAccount::updateOrCreate(
            ['user_id' => $owner->id],
            ['waha_session_name' => $sessionName],
        );
    }

    public function ensureRevokeWebhook(WhatsappAccount $account): WhatsappWebhook
    {
        $url = rtrim((string) config('waha.webhook_base_url'), '/').'/'.$account->user_id;
        $events = ['message.revoked'];

        $webhook = $account->webhooks()
            ->where('url', $url)
            ->first();

        if ($webhook) {
            $currentEvents = collect($webhook->events ?? [])->filter()->values()->all();
            $mergedEvents = collect($currentEvents)
                ->merge($events)
                ->unique()
                ->values()
                ->all();

            $webhook->update([
                'events' => $mergedEvents,
                'is_active' => true,
            ]);

            return $webhook->fresh();
        }

        return $account->webhooks()->create([
            'url' => $url,
            'events' => $events,
            'hmac_key' => Str::random(40),
            'retries_policy' => 'constant',
            'delay_seconds' => 2,
            'attempts' => 15,
            'is_active' => true,
        ]);
    }

    private function webhookOwner(): ?User
    {
        return User::query()
            ->where('role', 'admin')
            ->where('status', 'aktif')
            ->orderBy('id')
            ->first();
    }
}
