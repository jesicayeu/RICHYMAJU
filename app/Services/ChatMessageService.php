<?php

namespace App\Services;

use App\Events\MessageDeleted;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Facades\Log;
use Throwable;

class ChatMessageService
{
    public function __construct(
        private GoogleDriveService $drive,
    ) {}

    public function delete(Message $message): void
    {
        $conversationId = (int) $message->conversation_id;
        $messageId = (int) $message->id;

        if ($message->attachment_path) {
            $this->drive->delete($message->attachment_path);
        }

        $message->delete();

        $conversation = Conversation::find($conversationId);
        if ($conversation) {
            $latest = $conversation->messages()->latest()->first();
            $conversation->update([
                'last_message_at' => $latest?->created_at,
            ]);
        }

        try {
            MessageDeleted::dispatch($conversationId, $messageId);
        } catch (Throwable $e) {
            Log::warning('Broadcast MessageDeleted gagal.', [
                'conversation_id' => $conversationId,
                'message_id' => $messageId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
