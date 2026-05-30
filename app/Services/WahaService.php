<?php

namespace App\Services;

use App\Models\WhatsappAccount;
use App\Models\WhatsappSetting;
use App\Models\WhatsappWebhook;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class WahaService
{
    protected ?string $baseUrl = null;

    protected ?string $apiKey = null;

    public function useSettings(?WhatsappSetting $settings = null): self
    {
        $settings ??= WhatsappSetting::current();

        $this->baseUrl = $settings->host_url
            ? rtrim($settings->host_url, '/')
            : rtrim((string) config('waha.base_url'), '/');

        $this->apiKey = $settings->api_key ?: config('waha.api_key');

        return $this;
    }

    protected function client(): PendingRequest
    {
        $this->useSettings();

        $client = Http::baseUrl($this->baseUrl ?? '')
            ->timeout(30)
            ->acceptJson();

        if ($this->apiKey) {
            $client = $client->withHeaders(['X-Api-Key' => $this->apiKey]);
        }

        return $client;
    }

    public function testConnection(): array
    {
        $response = $this->client()->get('/api/sessions');

        if ($response->status() === 401) {
            throw new RuntimeException('API key WAHA tidak valid (401 Unauthorized).');
        }

        $this->ensureSuccess($response);

        return [
            'ok' => true,
            'sessions' => $response->json() ?? [],
        ];
    }

    public function listSessions(): array
    {
        return $this->client()->get('/api/sessions')->json() ?? [];
    }

    public function getSession(string $sessionName): ?array
    {
        $response = $this->client()->get("/api/sessions/{$sessionName}");

        if ($response->status() === 404) {
            return null;
        }

        $this->ensureSuccess($response);

        return $response->json();
    }

    public function createSession(string $sessionName, array $config = []): array
    {
        $payload = [
            'name' => $sessionName,
            'config' => $config,
        ];

        $response = $this->client()->post('/api/sessions', $payload);
        $this->ensureSuccess($response, [200, 201]);

        return $response->json();
    }

    public function updateSession(string $sessionName, array $config): array
    {
        $existing = $this->getSession($sessionName) ?? ['name' => $sessionName];

        $payload = array_merge($existing, [
            'name' => $sessionName,
            'config' => array_merge($existing['config'] ?? [], $config),
        ]);

        $response = $this->client()->put("/api/sessions/{$sessionName}", $payload);
        $this->ensureSuccess($response);

        return $response->json();
    }

    public function startSession(string $sessionName): array
    {
        $response = $this->client()->post("/api/sessions/{$sessionName}/start");
        $this->ensureSuccess($response);

        return $response->json();
    }

    public function stopSession(string $sessionName): void
    {
        $response = $this->client()->post("/api/sessions/{$sessionName}/stop");
        $this->ensureSuccess($response);
    }

    public function deleteSession(string $sessionName): void
    {
        $response = $this->client()->delete("/api/sessions/{$sessionName}");
        $this->ensureSuccess($response, [200, 204]);
    }

    public function getQrCodeBase64(string $sessionName): ?string
    {
        $response = $this->client()
            ->withHeaders(['Accept' => 'application/json'])
            ->get("/api/{$sessionName}/auth/qr");

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();

        if (isset($data['data'])) {
            return $data['data'];
        }

        if (isset($data['qr'])) {
            return $data['qr'];
        }

        return is_string($data) ? $data : null;
    }

    public function sendText(string $sessionName, string $chatId, string $text): array
    {
        $response = $this->client()->post('/api/sendText', [
            'session' => $sessionName,
            'chatId' => $chatId,
            'text' => $text,
        ]);
        $this->ensureSuccess($response);

        return $response->json();
    }

    public function mapWahaStatus(?string $wahaStatus): string
    {
        return match ($wahaStatus) {
            'WORKING' => 'terhubung',
            'SCAN_QR_CODE' => 'scan_qr',
            'FAILED' => 'gagal',
            'STARTING', 'STOPPED' => 'belum_terhubung',
            default => 'belum_terhubung',
        };
    }

    public function syncAccountStatus(WhatsappAccount $account): WhatsappAccount
    {
        $session = $this->getSession($account->waha_session_name);

        if (! $session) {
            $account->update(['status' => 'belum_terhubung', 'phone' => null]);

            return $account->fresh();
        }

        $wahaStatus = $session['status'] ?? null;
        $phone = $session['me']['id'] ?? $session['me']['phone'] ?? null;

        if (is_string($phone) && str_contains($phone, '@')) {
            $phone = explode('@', $phone)[0];
        }

        $account->update([
            'status' => $this->mapWahaStatus($wahaStatus),
            'phone' => $phone,
        ]);

        return $account->fresh();
    }

    public function syncWebhooksToSession(WhatsappAccount $account): void
    {
        $webhooks = $account->webhooks()
            ->where('is_active', true)
            ->get()
            ->map(fn (WhatsappWebhook $w) => $w->toWahaConfig())
            ->values()
            ->all();

        $this->updateSession($account->waha_session_name, [
            'webhooks' => $webhooks,
        ]);
    }

    public function ensureSession(WhatsappAccount $account): void
    {
        $session = $this->getSession($account->waha_session_name);

        if (! $session) {
            $this->createSession($account->waha_session_name, [
                'metadata' => [
                    'user.id' => (string) $account->user_id,
                ],
            ]);
        } else {
            $status = $session['status'] ?? 'STOPPED';
            if (in_array($status, ['STOPPED', 'FAILED'], true)) {
                $this->startSession($account->waha_session_name);
            }
        }
    }

    protected function ensureSuccess(Response $response, ?array $allowed = null): void
    {
        $ok = $allowed !== null
            ? in_array($response->status(), $allowed, true)
            : $response->successful();

        if (! $ok) {
            throw new RuntimeException(
                'WAHA API error: '.$response->status().' - '.$response->body()
            );
        }
    }
}
