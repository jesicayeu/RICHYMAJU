<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_chat_ids', function (Blueprint $table) {
            $table->json('action_keys')->nullable()->after('label');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_chat_ids', function (Blueprint $table) {
            $table->dropColumn('action_keys');
        });
    }
};
