<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageWhatsappDelivery extends Model
{
    protected $fillable = [
        'message_id',
        'waha_message_id',
        'waha_message_id_serialized',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    /**
     * @param  array{messageId?: string|null, messageIdSerialized?: string|null}  $sendResult
     */
    public static function recordForMessage(Message $message, array $sendResult): ?self
    {
        $shortId = trim((string) ($sendResult['messageId'] ?? ''));
        $serialized = trim((string) ($sendResult['messageIdSerialized'] ?? ''));

        if ($shortId === '' && $serialized === '') {
            return null;
        }

        if ($shortId === '' && $serialized !== '') {
            $shortId = self::shortIdFromSerialized($serialized) ?? $serialized;
        }

        return static::create([
            'message_id' => $message->id,
            'waha_message_id' => $shortId,
            'waha_message_id_serialized' => $serialized !== '' ? $serialized : null,
        ]);
    }

    public static function shortIdFromSerialized(string $serialized): ?string
    {
        $parts = explode('_', $serialized);

        if (count($parts) < 3) {
            return null;
        }

        return $parts[count($parts) - 2] ?: null;
    }

    /**
     * @param  list<string>  $candidateIds
     */
    public static function findByWahaIds(array $candidateIds): ?self
    {
        $ids = collect($candidateIds)
            ->map(fn ($id) => trim((string) $id))
            ->filter()
            ->unique()
            ->values();

        if ($ids->isEmpty()) {
            return null;
        }

        $delivery = static::query()
            ->whereIn('waha_message_id', $ids->all())
            ->orWhereIn('waha_message_id_serialized', $ids->all())
            ->first();

        if ($delivery) {
            return $delivery;
        }

        foreach ($ids as $id) {
            $delivery = static::query()
                ->where('waha_message_id_serialized', 'like', '%_'.$id.'_%')
                ->orWhere('waha_message_id_serialized', 'like', '%_'.$id)
                ->first();

            if ($delivery) {
                return $delivery;
            }
        }

        return null;
    }
}
