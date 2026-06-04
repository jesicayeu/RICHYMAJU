<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->string('client_id')->nullable()->after('id');
            $table->text('client_secret')->nullable()->after('client_id');
            $table->string('folder_transactions')->nullable()->after('client_secret');
            $table->string('folder_stocks')->nullable()->after('folder_transactions');
            $table->string('folder_debts')->nullable()->after('folder_stocks');
            $table->string('folder_chat')->nullable()->after('folder_debts');
        });
    }

    public function down(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->dropColumn([
                'client_id',
                'client_secret',
                'folder_transactions',
                'folder_stocks',
                'folder_debts',
                'folder_chat',
            ]);
        });
    }
};
