<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SystemSetting;

class SystemSettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            [
                'key' => 'gas_rate_per_km',
                'value' => '3.50',
                'type' => 'numeric',
            ],
            [
                'key' => 'per_diem_rate',
                'value' => '250.00',
                'type' => 'numeric',
            ],
            [
                'key' => 'install_fee_camera',
                'value' => '150.00',
                'type' => 'numeric',
            ],
            [
                'key' => 'install_fee_dvr',
                'value' => '150.00',
                'type' => 'numeric',
            ],
            [
                'key' => 'labor_cost_per_device',
                'value' => '125.00',
                'type' => 'numeric',
            ],
            [
                'key' => 'freight_cost_per_km',
                'value' => '5.00',
                'type' => 'numeric',
            ],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value'], 'type' => $setting['type']]
            );
        }
    }
}
