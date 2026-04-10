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
        $validated = $request->validate([
            'primary_color' => 'nullable|string',
            'company_logo_base64' => 'nullable|string',
            'company_name' => 'nullable|string|max:255',
            'quote_footer_text' => 'nullable|string',
        ]);
        
        foreach ($validated as $key => $value) {
            SystemSetting::updateOrCreate(
                ['key' => $key],
                ['value' => $value, 'type' => 'string']
            );
        }
        
        return response()->json(['message' => 'Settings updated successfully']);
    }
}
