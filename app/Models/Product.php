<?php

namespace App\Models;

use App\Casts\EncryptedInteger;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'barcode',
    'name',
    'unit',
    'sell_price',
    'buy_price',
    'is_active',
    'sheet_row',
])]
class Product extends Model
{
    protected function casts(): array
    {
        return [
            'barcode' => EncryptedString::class,
            'name' => EncryptedString::class,
            'unit' => EncryptedString::class,
            'sell_price' => EncryptedInteger::class,
            'buy_price' => EncryptedInteger::class,
            'is_active' => 'boolean',
        ];
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
