<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaintenanceReminder extends Model
{
    protected $fillable = [
        'quote_id',
        'client_name',
        'client_phone',
        'last_service_date',
        'next_service_date',
        'status',
        'equipment_summary',
    ];

    protected $casts = [
        'last_service_date' => 'date',
        'next_service_date' => 'date',
    ];

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }
}
