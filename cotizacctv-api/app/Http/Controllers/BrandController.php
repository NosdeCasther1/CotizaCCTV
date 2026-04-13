<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Http\Requests\StoreBrandRequest;
use App\Http\Requests\UpdateBrandRequest;
use Illuminate\Http\JsonResponse;

class BrandController extends Controller
{
    /**
     * Listado de marcas.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Brand::withCount('products')->orderBy('name', 'asc')->get()
        ]);
    }

    /**
     * Crear nueva marca.
     */
    public function store(StoreBrandRequest $request): JsonResponse
    {
        $brand = Brand::create($request->validated());
        
        return response()->json([
            'message' => 'Marca creada correctamente',
            'data' => $brand
        ], 201);
    }

    /**
     * Mostrar marca.
     */
    public function show(Brand $brand): JsonResponse
    {
        return response()->json([
            'data' => $brand
        ]);
    }

    /**
     * Actualizar marca.
     */
    public function update(UpdateBrandRequest $request, Brand $brand): JsonResponse
    {
        $brand->update($request->validated());
        
        return response()->json([
            'message' => 'Marca actualizada correctamente',
            'data' => $brand
        ]);
    }

    /**
     * Eliminar marca.
     */
    public function destroy(Brand $brand): JsonResponse
    {
        try {
            $brand->delete();
            return response()->json([
                'message' => 'Marca eliminada correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'No se puede eliminar la marca.'
            ], 422);
        }
    }
}
