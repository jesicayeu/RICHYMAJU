<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\Transaction;
use App\Support\Audit;
use Illuminate\Support\Str;

class SaleTransactionSyncService
{
    public function syncFromSale(Sale $sale): ?Transaction
    {
        if ($sale->payment_status !== 'lunas') {
            return null;
        }

        $existing = Transaction::query()->where('sale_id', $sale->id)->first();

        if ($existing) {
            $before = $existing->toArray();
            $existing->update([
                'amount' => (int) $sale->total_amount,
                'description' => $this->description($sale),
                'ui_status' => 'selesai',
                'occurred_at' => $sale->paid_at ?? $sale->occurred_at,
            ]);
            Audit::record($existing, 'edit', $before, $existing->fresh()->toArray(), 'Transaksi penjualan disinkronkan.');

            return $existing->fresh();
        }

        $transaction = Transaction::create([
            'code' => 'TRX-'.now()->format('Ymd').'-'.Str::upper(Str::random(6)),
            'user_id' => $sale->user_id,
            'sale_id' => $sale->id,
            'type' => 'pemasukan',
            'amount' => (int) $sale->total_amount,
            'description' => $this->description($sale),
            'ui_status' => 'selesai',
            'occurred_at' => $sale->paid_at ?? $sale->occurred_at,
            'verification_status' => 'disetujui',
            'verified_at' => now(),
        ]);

        Audit::record($transaction, 'tambah', [], $transaction->toArray(), 'Transaksi otomatis dari penjualan POS.');

        return $transaction;
    }

    public function removeForSale(Sale $sale): void
    {
        $transaction = Transaction::query()->where('sale_id', $sale->id)->first();

        if (! $transaction) {
            return;
        }

        $before = $transaction->toArray();
        Audit::record($transaction, 'hapus', $before, [], 'Transaksi penjualan dihapus bersama penjualan.');
        $transaction->delete();
    }

    private function description(Sale $sale): string
    {
        $method = match ($sale->payment_method) {
            'barcode' => 'QRIS',
            default => 'Tunai',
        };

        return "Penjualan POS {$sale->code} ({$method})";
    }
}
