<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('waha_session_name')->unique();
            $table->string('phone', 30)->nullable();
            $table->string('status')->default('belum_terhubung');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('whatsapp_webhooks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('whatsapp_account_id')->constrained()->cascadeOnDelete();
            $table->string('url');
            $table->json('events');
            $table->string('hmac_key')->nullable();
            $table->string('retries_policy')->default('constant');
            $table->unsignedSmallInteger('delay_seconds')->default(2);
            $table->unsignedSmallInteger('attempts')->default(15);
            $table->json('custom_headers')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('whatsapp_message_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->text('body');
            $table->json('variables')->nullable();
            $table->string('category')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_message_templates');
        Schema::dropIfExists('whatsapp_webhooks');
        Schema::dropIfExists('whatsapp_accounts');
    }
};
