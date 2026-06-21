<?php

namespace App\Services;

use App\Models\MessageWhatsappDelivery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsappWebhookHandler
{
    public function __construct(
        private ChatMessageService $chatMessages,
    ) {}

    public function handle(Request $request): void
    {
        $event = (string) $request->input('event', '');

        if ($event !== 'message.revoked') {
            return;
        }

        $payload = $request->input('payload');

        if (! is_array($payload)) {
            return;
        }

        $candidateIds = $this->extractRevokedMessageIds($payload);

        if ($candidateIds === []) {
            Log::info('WAHA message.revoked tanpa ID pesan yang dikenali.', [
                'payload_keys' => array_keys($payload),
            ]);

            return;
        }

        $delivery = MessageWhatsappDelivery::findByWahaIds($candidateIds);

        if (! $delivery) {
            Log::info('WAHA message.revoked tidak cocok dengan pesan chat.', [
                'candidate_ids' => $candidateIds,
            ]);

            return;
        }

        $message = $delivery->message()->first();

        if (! $message) {
            $delivery->delete();

            return;
        }

        Log::info('Menghapus pesan chat karena notifikasi WhatsApp dihapus.', [
            'message_id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'waha_ids' => $candidateIds,
        ]);

        $this->chatMessages->delete($message);
    }

    /**
     * @return list<string>
     */
    private function extractRevokedMessageIds(array $payload): array
    {
        $ids = [];

        foreach (['revokedMessageId', 'messageId'] as $key) {
            if (! empty($payload[$key]) && is_string($payload[$key])) {
                $ids[] = $payload[$key];
            }
        }

        foreach (['before', 'after'] as $section) {
            $item = $payload[$section] ?? null;

            if (! is_array($item)) {
                continue;
            }

            $ids = array_merge($ids, $this->extractIdsFromMessageObject($item));
        }

        return collect($ids)
            ->map(fn ($id) => trim((string) $id))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    private function extractIdsFromMessageObject(array $item): array
    {
        $ids = [];

        $id = $item['id'] ?? null;

        if (is_string($id)) {
            $ids[] = $id;
        } elseif (is_array($id)) {
            if (! empty($id['id']) && is_string($id['id'])) {
                $ids[] = $id['id'];
            }

            if (! empty($id['_serialized']) && is_string($id['_serialized'])) {
                $ids[] = $id['_serialized'];

                $short = MessageWhatsappDelivery::shortIdFromSerialized($id['_serialized']);
                if ($short) {
                    $ids[] = $short;
                }
            }
        }

        $dataId = $item['_data']['id'] ?? null;

        if (is_array($dataId)) {
            if (! empty($dataId['id']) && is_string($dataId['id'])) {
                $ids[] = $dataId['id'];
            }

            if (! empty($dataId['_serialized']) && is_string($dataId['_serialized'])) {
                $ids[] = $dataId['_serialized'];

                $short = MessageWhatsappDelivery::shortIdFromSerialized($dataId['_serialized']);
                if ($short) {
                    $ids[] = $short;
                }
            }
        }

        return $ids;
    }
}
