<?php

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_movements') || Schema::hasColumn('stock_movements', 'product_id')) {
            return;
        }

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->index('product_id');
        });

        $productsByName = Product::query()
            ->get()
            ->keyBy(fn (Product $product) => mb_strtolower(trim((string) $product->name)));

        StockMovement::query()
            ->whereNull('product_id')
            ->orderBy('id')
            ->chunkById(100, function ($movements) use ($productsByName) {
                foreach ($movements as $movement) {
                    $key = mb_strtolower(trim((string) $movement->item_name));

                    if ($key === '' || ! $productsByName->has($key)) {
                        continue;
                    }

                    $movement->update(['product_id' => $productsByName->get($key)->id]);
                }
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('stock_movements') || ! Schema::hasColumn('stock_movements', 'product_id')) {
            return;
        }

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('product_id');
        });
    }
};
