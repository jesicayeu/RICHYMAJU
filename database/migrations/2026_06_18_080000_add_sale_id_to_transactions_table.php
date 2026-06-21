<?php

use App\Models\Sale;
use App\Services\SaleTransactionSyncService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('transactions', 'sale_id')) {
                $table->foreignId('sale_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            }
        });

        $sync = app(SaleTransactionSyncService::class);
        Sale::query()->where('payment_status', 'lunas')->orderBy('id')->each(
            fn (Sale $sale) => $sync->syncFromSale($sale),
        );
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'sale_id')) {
                $table->dropConstrainedForeignId('sale_id');
            }
        });
    }
};
