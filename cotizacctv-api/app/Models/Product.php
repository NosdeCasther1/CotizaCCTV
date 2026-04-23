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
        'margin_percentage',
        'utility_type',
        'purchase_price',
        'tax_rate'
    ];

    protected $casts = [
        'margin_percentage' => 'decimal:2',
        'purchase_price' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'utility_type' => 'string',
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
     * Formula: 
     * If percentage: Cost / (1 - (Margin / 100))
     * If fixed_amount: Cost + Margin
     */
    public function getCalculatedSalePriceAttribute(): float
    {
        // 1. Use purchase_price if available, otherwise fallback to suppliers
        if ($this->purchase_price > 0) {
            $baseCost = (float) $this->purchase_price;
        } elseif ($this->suppliers->isNotEmpty()) {
            // Find default supplier or use max cost
            $defaultSupplier = $this->suppliers->firstWhere('pivot.is_default', true);
            $baseCost = $defaultSupplier 
                ? (float) $defaultSupplier->pivot->cost 
                : (float) $this->suppliers->max('pivot.cost');
        } else {
            return 0.0;
        }
        
        $margin = $this->getActiveMarginAttribute();
        
        if ($this->utility_type === 'fixed_amount') {
            return round($baseCost + $margin, 0);
        }

        if ($margin >= 100) {
            return $baseCost; // Prevent division by zero or negative
        }

        return round($baseCost / (1 - ($margin / 100)), 0);
    }

    /**
     * Sincroniza el purchase_price del producto con el costo del proveedor predeterminado.
     */
    public function syncPurchasePrice(): void
    {
        $defaultSupplier = $this->suppliers()->wherePivot('is_default', true)->first();
        
        if ($defaultSupplier) {
            $this->purchase_price = $defaultSupplier->pivot->cost;
        } else {
            // Si no hay predeterminado, tomamos el costo máximo entre los proveedores
            $maxCost = \DB::table('supplier_product')
                ->where('product_id', $this->id)
                ->max('cost');
            
            if ($maxCost) {
                $this->purchase_price = $maxCost;
            }
        }
        
        $this->save();
    }
}

