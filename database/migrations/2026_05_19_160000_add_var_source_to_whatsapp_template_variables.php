<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_template_variables', function (Blueprint $table) {
            $table->string('var_source', 20)->default('database')->after('var_name');
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_template_variables', function (Blueprint $table) {
            $table->dropColumn('var_source');
        });
    }
};
