<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if ($this->hasIndex('products', 'products_barcode_unique')) {
                    $table->dropUnique(['barcode']);
                }
            });

            Schema::table('products', function (Blueprint $table) {
                $table->text('barcode')->change();
                $table->text('name')->change();
                $table->text('unit')->change();
                $table->text('sell_price')->change();
            });
        }

        if (Schema::hasTable('sales')) {
            Schema::table('sales', function (Blueprint $table) {
                if ($this->hasIndex('sales', 'sales_code_unique')) {
                    $table->dropUnique(['code']);
                }
                if ($this->hasIndex('sales', 'sales_payment_barcode_unique')) {
                    $table->dropUnique(['payment_barcode']);
                }
                if ($this->hasIndex('sales', 'sales_payment_status_occurred_at_index')) {
                    $table->dropIndex(['payment_status', 'occurred_at']);
                }
            });

            Schema::table('sales', function (Blueprint $table) {
                $table->text('code')->change();
                $table->text('customer_name')->nullable()->change();
                $table->text('total_amount')->change();
                $table->text('payment_status')->change();
                if (Schema::hasColumn('sales', 'payment_method')) {
                    $table->text('payment_method')->change();
                }
                if (Schema::hasColumn('sales', 'payment_barcode')) {
                    $table->text('payment_barcode')->nullable()->change();
                }
            });
        }

        if (Schema::hasTable('sale_items')) {
            Schema::table('sale_items', function (Blueprint $table) {
                $table->text('item_name')->change();
                $table->text('quantity')->change();
                $table->text('unit')->change();
                $table->text('price')->change();
                $table->text('subtotal')->change();
                if (Schema::hasColumn('sale_items', 'barcode')) {
                    $table->text('barcode')->nullable()->change();
                }
            });
        }
    }

    public function down(): void
    {
        // Kolom terenkripsi tidak aman dikembalikan ke tipe asli tanpa dekripsi penuh.
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $indexes = Schema::getIndexes($table);

        foreach ($indexes as $index) {
            if (($index['name'] ?? null) === $indexName) {
                return true;
            }
        }

        return false;
    }
};
