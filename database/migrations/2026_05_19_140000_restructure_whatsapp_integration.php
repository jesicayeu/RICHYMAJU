<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_settings', function (Blueprint $table) {
            $table->id();
            $table->string('host_url')->nullable();
            $table->text('api_key')->nullable();
            $table->string('connection_status')->default('belum_terhubung');
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_configs', function (Blueprint $table) {
            $table->id();
            $table->string('operation')->default('sendText');
            $table->string('session')->nullable();
            $table->text('default_text')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_chat_ids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('chat_id', 80);
            $table->string('label')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'chat_id']);
        });

        Schema::create('whatsapp_action_templates', function (Blueprint $table) {
            $table->id();
            $table->string('action_key', 60)->unique();
            $table->text('body')->nullable();
            $table->timestamps();
        });

        Schema::create('whatsapp_template_variables', function (Blueprint $table) {
            $table->id();
            $table->string('var_name', 80);
            $table->string('var_name_alt', 80)->nullable();
            $table->string('db_table', 80);
            $table->string('db_column', 80);
            $table->string('data_label')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_template_variables');
        Schema::dropIfExists('whatsapp_action_templates');
        Schema::dropIfExists('whatsapp_chat_ids');
        Schema::dropIfExists('whatsapp_configs');
        Schema::dropIfExists('whatsapp_settings');
    }
};
