<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('payment_settings', 'dana_phone')) {
                $table->text('dana_phone')->nullable()->after('static_qris_payload');
            }
            if (! Schema::hasColumn('payment_settings', 'dana_account_holder')) {
                $table->text('dana_account_holder')->nullable()->after('dana_phone');
            }
            if (! Schema::hasColumn('payment_settings', 'dana_static_qris_payload')) {
                $table->longText('dana_static_qris_payload')->nullable()->after('dana_account_holder');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            $columns = ['dana_static_qris_payload', 'dana_account_holder', 'dana_phone'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('payment_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
