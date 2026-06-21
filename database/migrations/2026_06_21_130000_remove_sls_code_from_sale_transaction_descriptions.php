<?php

use App\Models\Transaction;
use App\Services\SaleTransactionSyncService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $service = app(SaleTransactionSyncService::class);

        Transaction::query()
            ->whereNotNull('sale_id')
            ->with('sale')
            ->each(function (Transaction $transaction) use ($service): void {
                if (! $transaction->sale) {
                    return;
                }

                $transaction->update([
                    'description' => $service->description($transaction->sale),
                ]);
            });
    }

    public function down(): void
    {
        // Tidak dapat dikembalikan karena kode SLS tidak lagi disimpan di keterangan.
    }
};
