<?php

use App\Models\WhatsappChatId;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        WhatsappChatId::query()->each(function (WhatsappChatId $contact) {
            if (! is_array($contact->action_keys) || $contact->action_keys === []) {
                return;
            }

            $contact->update([
                'action_keys' => WhatsappChatId::normalizeActionKeys($contact->action_keys),
            ]);
        });
    }

    public function down(): void
    {
        //
    }
};
