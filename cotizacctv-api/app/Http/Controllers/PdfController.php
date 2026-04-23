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

        // Normalizar textos para evitar errores de codificación en PDF
        $quote->client_name = $this->normalizeText($quote->client_name);
        foreach ($quote->items as $item) {
            if ($item->product) {
                $item->product->name = $this->normalizeText($item->product->name);
                if ($item->product->description) {
                    $item->product->description = $this->normalizeText($item->product->description);
                }
            }
        }

        $pdf = Pdf::loadView('pdf.quote', compact('quote', 'settings', 'itemsByCategory'));

        return $pdf->download("Cotizacion_{$quote->id}.pdf");
    }

    /**
     * Normaliza caracteres especiales que suelen dar problemas en PDF (UTF-8).
     */
    private function normalizeText($text)
    {
        if (empty($text)) return $text;

        $search = [
            '—', // em dash
            '–', // en dash
            '“', // left double quote
            '”', // right double quote
            '‘', // left single quote
            '’', // right single quote
            '…', // ellipsis
            ' ', // non-breaking space
        ];
        
        $replace = [
            '-',
            '-',
            '"',
            '"',
            "'",
            "'",
            '...',
            ' ',
        ];

        return str_replace($search, $replace, $text);
    }
}
