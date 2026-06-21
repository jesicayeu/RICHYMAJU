<?php

namespace App\Models;

use App\Casts\EncryptedDecimal;
use App\Casts\EncryptedInteger;
use App\Casts\EncryptedString;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'sale_id',
    'product_id',
    'barcode',
    'item_name',
    'quantity',
    'unit',
    'price',
    'subtotal',
])]
class SaleItem extends Model
{
    protected function casts(): array
    {
        return [
            'barcode' => EncryptedString::class,
            'item_name' => EncryptedString::class,
            'quantity' => EncryptedDecimal::class,
            'unit' => EncryptedString::class,
            'price' => EncryptedInteger::class,
            'subtotal' => EncryptedInteger::class,
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
