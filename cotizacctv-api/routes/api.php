<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\QuoteController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\PdfController;
use App\Http\Controllers\SettingController;

// Endpoint de Configuraciones
Route::get('settings', [SettingController::class, 'index']);
Route::post('settings', [SettingController::class, 'update']);

// Endpoint del Motor Financiero
Route::apiResource('quotes', QuoteController::class)->only(['index', 'store', 'show', 'update']);

// Endpoints del Catálogo (CRUD)
Route::apiResource('suppliers', SupplierController::class);
Route::apiResource('categories', CategoryController::class);
Route::apiResource('brands', BrandController::class);
Route::apiResource('products', ProductController::class);

// Generación de Documentos
Route::get('/quotes/{quote}/pdf', [PdfController::class, 'generateQuotePdf']);
