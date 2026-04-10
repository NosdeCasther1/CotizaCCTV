<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'category_id', 
        'brand_id',
        'sku', 
        'name', 
        'description',
        'margin_percentage'
    ];

    protected $casts = [
        'margin_percentage' => 'decimal:2',
    ];

    protected $appends = [
        'active_margin',
        'calculated_sale_price'
    ];

    protected $with = ['category', 'brand', 'suppliers'];


    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function suppliers()
    {
        return $this->belongsToMany(Supplier::class, 'supplier_product')
                    ->withPivot('cost', 'is_default', 'updated_at')
                    ->orderByPivot('updated_at', 'desc');
    }

    /**
     * Priority: 1. Product 2. Category 3. Global
     */
    public function getActiveMarginAttribute(): float
    {
        if ($this->margin_percentage !== null) {
            return (float) $this->margin_percentage;
        }

        if ($this->category && $this->category->margin_percentage !== null) {
            return (float) $this->category->margin_percentage;
        }

        return SystemSetting::getGlobalMargin();
    }

    /**
     * Formula: Cost / (1 - (Margin / 100))
     * Prioritizes default supplier, fallbacks to max cost for safety.
     */
    public function getCalculatedSalePriceAttribute(): float
    {
        if ($this->suppliers->isEmpty()) {
            return 0.0;
        }

        // 1. Find default supplier
        $defaultSupplier = $this->suppliers->firstWhere('pivot.is_default', true);

        // 2. Use default cost or fallback to MAX cost (protection)
        $baseCost = $defaultSupplier 
            ? (float) $defaultSupplier->pivot->cost 
            : (float) $this->suppliers->max('pivot.cost');
        
        $margin = $this->getActiveMarginAttribute();
        
        if ($margin >= 100) {
            return $baseCost; // Prevent division by zero or negative
        }

        return round($baseCost / (1 - ($margin / 100)), 0);
    }
}

