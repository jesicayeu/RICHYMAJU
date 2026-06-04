<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('debts')) {
            Schema::table('debts', function (Blueprint $table) {
                $table->text('party_name')->change();
                $table->text('item_name')->change();
            });
        }

        if (Schema::hasTable('stock_movements')) {
            Schema::table('stock_movements', function (Blueprint $table) {
                $table->dropIndex(['item_name']);
            });

            Schema::table('stock_movements', function (Blueprint $table) {
                $table->text('item_name')->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('stock_movements')) {
            Schema::table('stock_movements', function (Blueprint $table) {
                $table->string('item_name')->change();
                $table->index('item_name');
            });
        }

        if (Schema::hasTable('debts')) {
            Schema::table('debts', function (Blueprint $table) {
                $table->string('party_name')->change();
                $table->string('item_name')->change();
            });
        }
    }
};
