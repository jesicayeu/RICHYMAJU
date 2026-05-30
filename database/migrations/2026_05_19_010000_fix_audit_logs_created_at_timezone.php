<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Nilai lama disimpan sebagai UTC oleh kolom TIMESTAMP; konversi ke waktu WIT (UTC+9).
        DB::table('audit_logs')->update([
            'created_at' => DB::raw("DATE_ADD(created_at, INTERVAL 9 HOUR)"),
        ]);

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dateTime('created_at')->useCurrent()->change();
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->timestamp('created_at')->useCurrent()->change();
        });

        DB::table('audit_logs')->update([
            'created_at' => DB::raw("DATE_SUB(created_at, INTERVAL 9 HOUR)"),
        ]);
    }
};
