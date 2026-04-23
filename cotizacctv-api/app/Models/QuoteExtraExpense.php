<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuoteExtraExpense extends Model
{
    protected $fillable = [
        'quote_id',
        'description',
        'amount'
    ];

    protected $casts = [
        'amount' => 'decimal:2'
    ];

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }
}
