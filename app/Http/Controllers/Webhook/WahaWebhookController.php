<?php

namespace App\Http\Controllers\Webhook;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WhatsappWebhook;
use App\Services\WhatsappIntegrationService;
use App\Services\WhatsappWebhookHandler;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class WahaWebhookController extends Controller
{
    public function __invoke(
        Request $request,
        User $user,
        WhatsappWebhookHandler $handler,
        WhatsappIntegrationService $integration,
    ): Response {
        $account = $user->whatsappAccount;

        if (! $account) {
            $integration->ensureWebhookRegistered();
            $account = $user->fresh()?->whatsappAccount;
        }

        if (! $account) {
            return response('Account not found', 404);
        }

        $payload = $request->getContent();
        $signature = $request->header('X-Hub-Signature-256')
            ?? $request->header('X-Hmac-Signature')
            ?? $request->header('X-Signature');

        $webhooks = $account->webhooks()->where('is_active', true)->get();

        if ($webhooks->isNotEmpty()) {
            $valid = $webhooks->contains(function (WhatsappWebhook $webhook) use ($payload, $signature) {
                if (! $webhook->hmac_key) {
                    return true;
                }

                if (! $signature) {
                    return false;
                }

                $expected = hash_hmac('sha256', $payload, $webhook->hmac_key);

                return hash_equals($expected, $signature)
                    || hash_equals('sha256='.$expected, $signature);
            });

            if (! $valid) {
                Log::warning('WAHA webhook HMAC verification failed', ['user_id' => $user->id]);

                return response('Invalid signature', 401);
            }
        }

        Log::info('WAHA webhook received', [
            'user_id' => $user->id,
            'event' => $request->input('event'),
            'session' => $request->input('session'),
        ]);

        try {
            $handler->handle($request);
        } catch (\Throwable $e) {
            Log::error('WAHA webhook handler gagal.', [
                'user_id' => $user->id,
                'event' => $request->input('event'),
                'error' => $e->getMessage(),
            ]);
        }

        return response('OK', 200);
    }
}
