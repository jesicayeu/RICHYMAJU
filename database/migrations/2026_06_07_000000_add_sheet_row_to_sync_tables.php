<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedInteger('sheet_row')->nullable()->after('verification_note');
        });

        Schema::table('debts', function (Blueprint $table) {
            $table->unsignedInteger('sheet_row')->nullable()->after('verification_note');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->unsignedInteger('sheet_row')->nullable()->after('occurred_at');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('sheet_row');
        });

        Schema::table('debts', function (Blueprint $table) {
            $table->dropColumn('sheet_row');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropColumn('sheet_row');
        });
    }
};
