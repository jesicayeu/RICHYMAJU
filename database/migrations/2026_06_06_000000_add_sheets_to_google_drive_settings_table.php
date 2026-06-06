<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->string('sheet_transactions')->nullable()->after('folder_profile');
            $table->string('sheet_stocks')->nullable()->after('sheet_transactions');
            $table->string('sheet_debts')->nullable()->after('sheet_stocks');
        });
    }

    public function down(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->dropColumn(['sheet_transactions', 'sheet_stocks', 'sheet_debts']);
        });
    }
};
