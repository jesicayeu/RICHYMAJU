<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->string('sheet_sales')->nullable()->after('folder_profile');
            $table->string('sheet_products')->nullable()->after('sheet_sales');
        });
    }

    public function down(): void
    {
        Schema::table('google_drive_settings', function (Blueprint $table) {
            $table->dropColumn(['sheet_sales', 'sheet_products']);
        });
    }
};
