<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Supplier extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'phone', 'email'];

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'supplier_product')
                    ->withPivot('cost', 'is_default');
    }
}
