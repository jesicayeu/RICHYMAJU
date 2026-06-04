<?php

namespace App\Services;

use App\Models\WhatsappAccount;
use App\Models\WhatsappSetting;
use App\Models\WhatsappWebhook;
use App\Support\WhatsappChatIdFormatter;
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

        $this->baseUrl = $this->resolveBaseUrl($settings);
        $this->apiKey = $settings->api_key ?: config('waha.api_key');

        return $this;
    }

    protected function resolveBaseUrl(WhatsappSetting $settings): string
    {
        $configured = $settings->host_url ? rtrim($settings->host_url, '/') : '';
        $internal = rtrim((string) config('waha.base_url'), '/');
        $public = rtrim((string) config('waha.public_url'), '/');

        if ($configured !== '' && $public !== '' && $configured === $public && $internal !== '') {
            return $internal;
        }

        return $configured !== '' ? $configured : $internal;
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

    public function ensureSessionWorking(string $sessionName): void
    {
        $session = $this->getSession($sessionName);

        if (! $session) {
            throw new RuntimeException("Session WhatsApp \"{$sessionName}\" tidak ditemukan.");
        }

        $status = $session['status'] ?? null;

        if ($status !== 'WORKING') {
            throw new RuntimeException(match ($status) {
                'SCAN_QR_CODE' => 'WhatsApp perlu scan QR di dashboard WAHA.',
                'FAILED' => 'Session WhatsApp gagal. Mulai ulang session di dashboard WAHA.',
                'STARTING' => 'Session WhatsApp masih menyala. Tunggu sebentar lalu coba lagi.',
                'STOPPED' => 'Session WhatsApp berhenti. Mulai session di dashboard WAHA.',
                default => 'Session WhatsApp tidak aktif (status: '.($status ?? 'tidak diketahui').').',
            });
        }
    }

    public function phoneToInternationalDigits(?string $phone): string
    {
        $chatId = WhatsappChatIdFormatter::fromPhone($phone);

        if ($chatId === null) {
            throw new RuntimeException('Nomor HP tidak valid.');
        }

        return str_replace('@c.us', '', $chatId);
    }

    public function resolveChatIdFromPhone(string $sessionName, ?string $phone): string
    {
        $digits = $this->phoneToInternationalDigits($phone);

        $response = $this->client()->get('/api/contacts/check-exists', [
            'phone' => $digits,
            'session' => $sessionName,
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('Gagal memverifikasi nomor di WhatsApp.');
        }

        $data = $response->json();

        if (! ($data['numberExists'] ?? false)) {
            throw new RuntimeException('Nomor tidak terdaftar di WhatsApp.');
        }

        if (! empty($data['chatId']) && is_string($data['chatId'])) {
            return $data['chatId'];
        }

        return $digits.'@c.us';
    }

    public function chatIdBelongsToPhone(string $sessionName, string $chatId, ?string $phone): bool
    {
        $expectedPn = WhatsappChatIdFormatter::fromPhone($phone);

        if ($expectedPn === null) {
            return false;
        }

        if ($chatId === $expectedPn) {
            return true;
        }

        if (! str_ends_with($chatId, '@lid')) {
            return false;
        }

        $lid = explode('@', $chatId)[0] ?? '';

        if ($lid === '') {
            return false;
        }

        $response = $this->client()->get("/api/{$sessionName}/lids/{$lid}");

        if (! $response->successful()) {
            return false;
        }

        return ($response->json()['pn'] ?? null) === $expectedPn;
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
        $resolvedChatId = $this->sendTextToChat($sessionName, $chatId, $text);

        return ['chatId' => $resolvedChatId];
    }

    public function sendTextToPhone(string $sessionName, ?string $phone, string $text): string
    {
        $this->ensureSessionWorking($sessionName);
        $resolvedChatId = $this->resolveChatIdFromPhone($sessionName, $phone);

        $response = $this->client()->post('/api/sendText', [
            'session' => $sessionName,
            'chatId' => $resolvedChatId,
            'text' => $text,
        ]);
        $this->ensureSuccess($response);

        return $resolvedChatId;
    }

    public function sendTextToChat(string $sessionName, string $chatId, string $text, ?string $phone = null): string
    {
        if ($phone !== null) {
            return $this->sendTextToPhone($sessionName, $phone, $text);
        }

        $this->ensureSessionWorking($sessionName);

        $response = $this->client()->post('/api/sendText', [
            'session' => $sessionName,
            'chatId' => $chatId,
            'text' => $text,
        ]);
        $this->ensureSuccess($response);

        return $chatId;
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
                'WAHA API error: '.$response->status().' - '.$this->parseErrorMessage($response)
            );
        }
    }

    protected function parseErrorMessage(Response $response): string
    {
        $json = $response->json();

        if (is_array($json)) {
            if (! empty($json['message']) && is_string($json['message'])) {
                return $json['message'];
            }

            if (! empty($json['error']) && is_string($json['error'])) {
                return $json['error'];
            }
        }

        $body = trim($response->body());

        return $body !== '' ? $body : 'Unknown error';
    }
}
