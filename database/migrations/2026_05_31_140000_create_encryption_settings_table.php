<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('encryption_settings', function (Blueprint $table) {
            $table->id();
            $table->text('text_key')->nullable();
            $table->string('text_key_type')->nullable();
            $table->text('file_key')->nullable();
            $table->string('file_key_type')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('encryption_settings');
    }
};
