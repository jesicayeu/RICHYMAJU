<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_whatsapp_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->string('waha_message_id', 120);
            $table->string('waha_message_id_serialized', 255)->nullable();
            $table->timestamps();

            $table->index('waha_message_id');
            $table->index('waha_message_id_serialized');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_whatsapp_deliveries');
    }
};
