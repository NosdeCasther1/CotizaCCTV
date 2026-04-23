<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MaintenanceReminderController extends Controller
{
    public function index(Request $request)
    {
        $query = \App\Models\MaintenanceReminder::query();

        if ($request->has('upcoming')) {
            $query->where('next_service_date', '<=', now()->addDays(15))
                  ->where('status', '!=', 'completed');
        }

        return $query->orderBy('next_service_date', 'asc')->get();
    }

    public function markAsCalled(string $id)
    {
        $reminder = \App\Models\MaintenanceReminder::findOrFail($id);
        $reminder->update(['status' => 'called']);
        return response()->json($reminder);
    }
}
