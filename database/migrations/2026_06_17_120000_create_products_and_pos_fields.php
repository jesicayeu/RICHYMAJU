<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->id();
                $table->text('barcode');
                $table->text('name');
                $table->text('unit');
                $table->text('sell_price');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->index('is_active');
            });
        }

        Schema::table('sales', function (Blueprint $table) {
            if (! Schema::hasColumn('sales', 'payment_method')) {
                $table->text('payment_method')->nullable()->after('payment_status');
            }
            if (! Schema::hasColumn('sales', 'payment_barcode')) {
                $table->text('payment_barcode')->nullable()->after('payment_method');
            }
            if (! Schema::hasColumn('sales', 'paid_at')) {
                $table->dateTime('paid_at')->nullable()->after('payment_barcode');
            }
        });

        Schema::table('sale_items', function (Blueprint $table) {
            if (! Schema::hasColumn('sale_items', 'product_id')) {
                $table->foreignId('product_id')->nullable()->after('sale_id')->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('sale_items', 'barcode')) {
                $table->text('barcode')->nullable()->after('product_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            if (Schema::hasColumn('sale_items', 'barcode')) {
                $table->dropColumn('barcode');
            }
            if (Schema::hasColumn('sale_items', 'product_id')) {
                $table->dropConstrainedForeignId('product_id');
            }
        });

        Schema::table('sales', function (Blueprint $table) {
            $columns = ['paid_at', 'payment_barcode', 'payment_method'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('sales', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::dropIfExists('products');
    }
};
