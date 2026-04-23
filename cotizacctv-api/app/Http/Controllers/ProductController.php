<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    /**
     * Retorna el catálogo completo con sus relaciones, opcionalmente filtrado.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'suppliers'])->orderBy('name', 'asc');

        if ($request->has('search') && $request->filled('search')) {
            $searchTerm = $request->query('search');
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'LIKE', "%{$searchTerm}%")
                  ->orWhere('sku', 'LIKE', "%{$searchTerm}%");
            });
        }

        $products = $query->get();
        
        return response()->json([
            'data' => $products
        ]);
    }

    /**
     * Registra un nuevo producto.
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        return \DB::transaction(function () use ($request) {
            $data = $request->validated();
            $suppliers = $data['suppliers'];
            unset($data['suppliers']);

            $product = Product::create($data);
            
            if (isset($data['description'])) {
                $product->description = clean($data['description']);
                $product->save();
            }

            // Preparar datos para la tabla pivote
            $syncData = [];
            foreach ($suppliers as $s) {
                $syncData[$s['supplier_id']] = [
                    'cost' => $s['cost'],
                    'is_default' => $s['is_default'] ?? false
                ];
            }

            $product->suppliers()->sync($syncData);
            $product->syncPurchasePrice();
            
            return response()->json([
                'message' => 'Producto creado correctamente',
                'data' => $product->load(['category', 'suppliers'])
            ], 201);
        });
    }

    /**
     * Muestra un producto específico.
     */
    public function show(Product $product): JsonResponse
    {
        return response()->json([
            'data' => $product->load(['category', 'suppliers'])
        ]);
    }

    /**
     * Actualiza un producto existente.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        return \DB::transaction(function () use ($request, $product) {
            $data = $request->validated();
            $suppliers = $data['suppliers'];
            unset($data['suppliers']);

            if (isset($data['description'])) {
                $data['description'] = clean($data['description']);
            }

            $product->update($data);

            // Preparar datos para la tabla pivote
            $syncData = [];
            foreach ($suppliers as $s) {
                $syncData[$s['supplier_id']] = [
                    'cost' => $s['cost'],
                    'is_default' => $s['is_default'] ?? false
                ];
            }

            $product->suppliers()->sync($syncData);
            $product->syncPurchasePrice();
            
            return response()->json([
                'message' => 'Producto actualizado correctamente',
                'data' => $product->load(['category', 'suppliers'])
            ]);
        });
    }

    /**
     * Elimina un producto.
     */
    public function destroy(Product $product): JsonResponse
    {
        try {
            $product->delete();
            return response()->json([
                'message' => 'Producto eliminado correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'No se puede eliminar el producto.'
            ], 422);
        }
    }
}
