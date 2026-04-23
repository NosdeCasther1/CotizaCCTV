<?php

namespace App\Http\Controllers;

use App\Http\Requests\QuoteRequest;
use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QuoteController extends Controller
{
    /**
     * Display a listing of quotes.
     */
    public function index(): JsonResponse
    {
        $quotes = Quote::with([
            'items.product' => function ($query) {
                $query->withTrashed();
            },
            'extraExpenses'
        ])->latest()->get();
        return response()->json($quotes);
    }

    /**
     * Store a newly created quote in storage.
     */
    public function store(QuoteRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            // 1. Inicializar acumuladores y datos
            $subtotalMaterials = 0;
            $itemsData = [];

            // 2. Procesar ítems (Materiales)
            // Se confía en el precio unitario calculado que viene del catálogo (Product->calculated_sale_price)
            foreach ($request->items as $item) {
                $product = Product::withTrashed()->findOrFail($item['product_id']);
                $price = (float) ($item['unit_price'] ?? $product->calculated_sale_price);
                $quantity = (int) $item['quantity'];
                
                $subtotalMaterials += round($price * $quantity, 0);
                
                $itemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'frozen_unit_cost' => $price
                ];
            }

            // 3. Obtener costos externos enviados desde el frontend (o defaults)
            $freightCost = round((float) ($request->freight_cost ?? 0), 0);
            $installationTotal = round((float) ($request->installation_total ?? 0), 0);
            $installationDays = (int) ($request->installation_days ?? 1);

            // El margen ahora va implícito en el precio de venta de los materiales
            $marginApplied = 0;
            
            // Los campos gasoline_cost y per_diem_cost se mantienen en el modelo por compatibilidad
            // pero el "Costo de Logística/Flete" del frontend se mapea a freight_cost.
            $gasolineCost = 0;
            $perDiemCost = 0;

            $discountAmount = (float) ($request->discount_amount ?? 0);
            $discountType = $request->discount_type ?? 'fixed';

            $baseTotal = $subtotalMaterials + $freightCost + $installationTotal;
            $finalDiscount = $discountType === 'percentage' 
                ? round($baseTotal * ($discountAmount / 100), 0)
                : round($discountAmount, 0);

            $grandTotal = max(0, round($baseTotal - $finalDiscount, 0));

            // 4. Persistir Cotización
            $quote = Quote::create([
                'client_name' => $request->client_name,
                'client_phone' => $request->client_phone,
                'subtotal_materials' => $subtotalMaterials,
                'margin_applied' => $marginApplied,
                'freight_cost' => $freightCost,
                'gasoline_cost' => $gasolineCost,
                'per_diem_cost' => $perDiemCost,
                'installation_total' => $installationTotal,
                'discount_amount' => $discountAmount,
                'discount_type' => $discountType,
                'grand_total' => $grandTotal,
                'installation_days' => $installationDays,
                'distance_km' => round((float) ($request->distance_km ?? 0), 2),
                'status' => 'pending',
                'expires_at' => now()->addDays(15),
            ]);

            // 5. Persistir Ítems
            foreach ($itemsData as $item) {
                $quote->items()->create($item);
            }

            // 6. Persistir Gastos Extra
            if ($request->has('extra_expenses')) {
                foreach ($request->extra_expenses as $expense) {
                    $quote->extraExpenses()->create([
                        'description' => $expense['description'],
                        'amount' => (float) $expense['amount']
                    ]);
                }
            }

            return response()->json([
                'message' => 'Cotización generada con éxito',
                'data' => $quote->load(['items', 'extraExpenses'])
            ], 201);
        });
    }

    /**
     * Display the specified quote.
     */
    public function show(string $id): JsonResponse
    {
        $quote = Quote::with([
            'items.product' => function ($query) {
                $query->withTrashed();
            },
            'items.product.category', 
            'items.product.suppliers',
            'extraExpenses'
        ])->findOrFail($id);
        return response()->json($quote);
    }

    /**
     * Update the specified quote.
     */
    public function update(QuoteRequest $request, string $id): JsonResponse
    {
        $quote = Quote::findOrFail($id);

        return DB::transaction(function () use ($request, $quote) {
            // 1. Inicializar acumuladores y datos
            $subtotalMaterials = 0;
            $itemsData = [];

            // 2. Procesar ítems (Materiales)
            foreach ($request->items as $item) {
                $product = Product::withTrashed()->findOrFail($item['product_id']);
                $price = (float) ($item['unit_price'] ?? $product->calculated_sale_price);
                $quantity = (int) $item['quantity'];
                
                $subtotalMaterials += round($price * $quantity, 0);
                
                $itemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'frozen_unit_cost' => $price
                ];
            }

            // 3. Obtener costos externos
            $freightCost = round((float) ($request->freight_cost ?? 0), 0);
            $installationTotal = round((float) ($request->installation_total ?? 0), 0);
            $installationDays = (int) ($request->installation_days ?? 1);

            $discountAmount = (float) ($request->discount_amount ?? 0);
            $discountType = $request->discount_type ?? 'fixed';

            $baseTotal = $subtotalMaterials + $freightCost + $installationTotal;
            $finalDiscount = $discountType === 'percentage' 
                ? round($baseTotal * ($discountAmount / 100), 0)
                : round($discountAmount, 0);

            $grandTotal = max(0, round($baseTotal - $finalDiscount, 0));

            // 4. Actualizar Cotización
            $quote->update([
                'client_name' => $request->client_name,
                'client_phone' => $request->client_phone,
                'subtotal_materials' => $subtotalMaterials,
                'freight_cost' => $freightCost,
                'installation_total' => $installationTotal,
                'discount_amount' => $discountAmount,
                'discount_type' => $discountType,
                'grand_total' => $grandTotal,
                'installation_days' => $installationDays,
                'distance_km' => round((float) ($request->distance_km ?? 0), 2),
            ]);

            // 5. Reemplazar Ítems
            $quote->items()->delete();
            foreach ($itemsData as $item) {
                $quote->items()->create($item);
            }

            // 6. Reemplazar Gastos Extra
            $quote->extraExpenses()->delete();
            if ($request->has('extra_expenses')) {
                foreach ($request->extra_expenses as $expense) {
                    $quote->extraExpenses()->create([
                        'description' => $expense['description'],
                        'amount' => (float) $expense['amount']
                    ]);
                }
            }

            return response()->json([
                'message' => 'Cotización actualizada con éxito',
                'data' => $quote->load(['items', 'extraExpenses'])
            ]);
        });
    }

    /**
     * Update the status of the specified quote.
     */
    public function updateStatus(\Illuminate\Http\Request $request, string $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|string|in:pending,accepted,rejected,completed'
        ]);

        $quote = Quote::findOrFail($id);
        $quote->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Estado actualizado con éxito',
            'status' => $quote->status
        ]);
    }
}
