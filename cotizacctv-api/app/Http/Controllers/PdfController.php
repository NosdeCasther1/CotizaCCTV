<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\SystemSetting;
use Barryvdh\DomPDF\Facade\Pdf;

class PdfController extends Controller
{
    /**
     * Generate a PDF for the specified quote and return it directly.
     */
    public function generateQuotePdf(Quote $quote)
    {
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', '120');

        $quote->load([
            'items.product' => function ($query) {
                $query->withTrashed();
            },
            'items.product.category'
        ]);

        $itemsByCategory = $quote->items->groupBy(function($item) {
            return $item->product->category->name ?? 'Equipos y Materiales';
        });

        $settings = SystemSetting::pluck('value', 'key')->toArray();
        $pdf = Pdf::loadView('pdf.quote', compact('quote', 'settings', 'itemsByCategory'));

        return $pdf->download("Cotizacion_{$quote->id}.pdf");
    }
}
