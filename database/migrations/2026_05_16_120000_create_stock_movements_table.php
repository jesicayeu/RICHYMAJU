<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('stock_movements')) {
            return;
        }

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('item_name');
            $table->string('type', 10);
            $table->decimal('quantity', 12, 2);
            $table->string('unit', 30);
            $table->string('status', 20)->default('diproses');
            $table->text('notes')->nullable();
            $table->dateTime('occurred_at');
            $table->timestamps();
            $table->index(['type', 'status', 'occurred_at']);
            $table->index('item_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
