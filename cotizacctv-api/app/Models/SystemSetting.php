<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    public $timestamps = false; // No necesitamos created_at/updated_at aquí

    protected $fillable = ['key', 'value', 'type'];

    public static function getGlobalMargin(): float
    {
        $setting = self::where('key', 'global_margin_percentage')->first();
        return $setting ? (float) $setting->value : 30.00; // Fallback to 30% if not set
    }

}
