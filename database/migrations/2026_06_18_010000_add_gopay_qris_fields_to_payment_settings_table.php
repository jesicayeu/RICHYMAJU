<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('payment_settings', 'gopay_phone')) {
                $table->text('gopay_phone')->nullable()->after('dana_static_qris_payload');
            }
            if (! Schema::hasColumn('payment_settings', 'gopay_account_holder')) {
                $table->text('gopay_account_holder')->nullable()->after('gopay_phone');
            }
            if (! Schema::hasColumn('payment_settings', 'gopay_static_qris_payload')) {
                $table->longText('gopay_static_qris_payload')->nullable()->after('gopay_account_holder');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            $columns = ['gopay_static_qris_payload', 'gopay_account_holder', 'gopay_phone'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('payment_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
