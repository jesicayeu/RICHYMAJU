<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('backup_logs');
        Schema::dropIfExists('backup_settings');
    }

    public function down(): void
    {
        // Fitur backup dihapus — tidak dipulihkan.
    }
};
