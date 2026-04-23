<?php

namespace App\Observers;

use App\Models\Quote;

class QuoteObserver
{
    /**
     * Handle the Quote "created" event.
     */
    public function created(Quote $quote): void
    {
        //
    }

    public function updated(Quote $quote): void
    {
        if ($quote->isDirty('status') && $quote->status === 'completed') {
            // Evitar duplicados si ya existe uno para esta cotización
            if (\App\Models\MaintenanceReminder::where('quote_id', $quote->id)->exists()) {
                return;
            }

            // Obtener resumen de equipos instalados
            $equipmentSummary = $quote->items()
                ->with('product')
                ->get()
                ->map(function($item) {
                    return $item->product ? "{$item->quantity}x {$item->product->name}" : null;
                })
                ->filter()
                ->implode(', ');

            \App\Models\MaintenanceReminder::create([
                'quote_id' => $quote->id,
                'client_name' => $quote->client_name,
                'client_phone' => $quote->client_phone,
                'last_service_date' => now(),
                'next_service_date' => now()->addDays(180),
                'status' => 'pending',
                'equipment_summary' => $equipmentSummary,
            ]);
        }
    }

    /**
     * Handle the Quote "deleted" event.
     */
    public function deleted(Quote $quote): void
    {
        //
    }

    /**
     * Handle the Quote "restored" event.
     */
    public function restored(Quote $quote): void
    {
        //
    }

    /**
     * Handle the Quote "force deleted" event.
     */
    public function forceDeleted(Quote $quote): void
    {
        //
    }
}
