<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quote extends Model
{
    protected $fillable = [
        'client_name',
        'subtotal_materials',
        'margin_applied',
        'freight_cost',
        'gasoline_cost',
        'per_diem_cost',
        'installation_total',
        'grand_total',
        'status',
        'expires_at',
        'installation_days',
        'distance_km'
    ];

    // Casteo estricto para proteger la integridad financiera del ERP
    protected $casts = [
        'subtotal_materials' => 'decimal:2',
        'margin_applied'     => 'decimal:2',
        'freight_cost'       => 'decimal:2',
        'gasoline_cost'      => 'decimal:2',
        'per_diem_cost'      => 'decimal:2',
        'installation_total' => 'decimal:2',
        'grand_total'        => 'decimal:2',
        'expires_at'         => 'datetime',
        'installation_days'  => 'integer',
        'distance_km'        => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class);
    }
}
