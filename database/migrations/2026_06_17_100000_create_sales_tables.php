<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sales')) {
            Schema::create('sales', function (Blueprint $table) {
                $table->id();
                $table->text('code');
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->text('customer_name')->nullable();
                $table->text('total_amount');
                $table->text('payment_status');
                $table->text('notes')->nullable();
                $table->dateTime('occurred_at');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('sale_items')) {
            Schema::create('sale_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
                $table->text('item_name');
                $table->text('quantity');
                $table->text('unit');
                $table->text('price');
                $table->text('subtotal');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
    }
};
