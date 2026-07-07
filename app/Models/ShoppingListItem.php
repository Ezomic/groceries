<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShoppingListItem extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'quantity',
        'unit',
        'notes',
        'purchased_at',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'quantity'     => 'float',
            'purchased_at' => 'datetime',
        ];
    }

    public function scopePending($query)
    {
        return $query->whereNull('purchased_at');
    }

    public function scopePurchased($query)
    {
        return $query->whereNotNull('purchased_at');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
