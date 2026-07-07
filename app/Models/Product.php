<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'barcode',
        'name',
        'brand',
        'category',
        'image_url',
        'quantity_unit',
    ];

    /**
     * @return HasMany<PantryItem, $this>
     */
    public function pantryItems(): HasMany
    {
        return $this->hasMany(PantryItem::class);
    }

    /**
     * @return HasMany<ShoppingListItem, $this>
     */
    public function shoppingListItems(): HasMany
    {
        return $this->hasMany(ShoppingListItem::class);
    }
}
