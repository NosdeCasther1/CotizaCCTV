<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    /**
     * Display a listing of system settings.
     */
    public function index(): JsonResponse
    {
        $settings = SystemSetting::pluck('value', 'key');
        return response()->json($settings);
    }

    /**
     * Update system settings.
     */
    public function update(Request $request): JsonResponse
    {
        $settings = $request->all();
        
        foreach ($settings as $key => $value) {
            SystemSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'type' => 'string']
            );
        }
        
        return response()->json(['message' => 'Settings updated successfully']);
    }
}
