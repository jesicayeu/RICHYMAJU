<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products') || Schema::hasColumn('products', 'buy_price')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->text('buy_price')->nullable()->after('sell_price');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('products') || ! Schema::hasColumn('products', 'buy_price')) {
            return;
        }

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('buy_price');
        });
    }
};
