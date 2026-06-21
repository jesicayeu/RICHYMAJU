<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockMovement;

class ProductStockService
{
    public function availableStock(Product $product): float
    {
        return $this->sumBalance($this->movementsForProduct($product));
    }

    /**
     * @param  iterable<Product>  $products
     * @return array<int, float>
     */
    public function stockMapForProducts(iterable $products): array
    {
        $products = collect($products);

        if ($products->isEmpty()) {
            return [];
        }

        $productIds = $products->pluck('id')->all();
        $namesById = $products->mapWithKeys(
            fn (Product $product) => [$product->id => mb_strtolower(trim((string) $product->name))],
        );

        $linked = StockMovement::query()
            ->whereIn('product_id', $productIds)
            ->get()
            ->groupBy('product_id');

        $legacy = StockMovement::query()
            ->whereNull('product_id')
            ->get();

        $map = [];

        foreach ($products as $product) {
            $name = $namesById[$product->id] ?? '';
            $movements = ($linked->get($product->id) ?? collect())->concat(
                $name === ''
                    ? collect()
                    : $legacy->filter(
                        fn (StockMovement $movement) => mb_strtolower(trim((string) $movement->item_name)) === $name,
                    ),
            );

            $map[$product->id] = $this->sumBalance($movements);
        }

        return $map;
    }

    /**
     * @return \Illuminate\Support\Collection<int, StockMovement>
     */
    private function movementsForProduct(Product $product)
    {
        $linked = StockMovement::query()
            ->where('product_id', $product->id)
            ->get();

        $name = mb_strtolower(trim((string) $product->name));

        if ($name === '') {
            return $linked;
        }

        $legacy = StockMovement::query()
            ->whereNull('product_id')
            ->get()
            ->filter(fn (StockMovement $movement) => mb_strtolower(trim((string) $movement->item_name)) === $name);

        return $linked->concat($legacy);
    }

    /**
     * @param  iterable<StockMovement>  $movements
     */
    private function sumBalance(iterable $movements): float
    {
        $incoming = 0;
        $outgoing = 0;

        foreach ($movements as $movement) {
            $qty = (float) $movement->quantity;

            if ($movement->type === 'masuk') {
                $incoming += $qty;
            } elseif ($movement->type === 'keluar') {
                $outgoing += $qty;
            }
        }

        return max(0, round($incoming - $outgoing, 2));
    }
}
