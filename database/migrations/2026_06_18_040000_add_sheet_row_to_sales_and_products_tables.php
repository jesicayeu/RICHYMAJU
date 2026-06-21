<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->unsignedInteger('sheet_row')->nullable()->after('occurred_at');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('sheet_row')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('sheet_row');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('sheet_row');
        });
    }
};
