<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Category;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Limpiar tablas para evitar duplicados o basura (Truncate maneja FK con precaución)
        Schema::disableForeignKeyConstraints();
        DB::table('quote_items')->delete();
        DB::table('quotes')->delete();
        DB::table('supplier_product')->delete();
        Product::query()->delete();
        Schema::enableForeignKeyConstraints();

        // 2. Obtener datos base
        $suppliers = Supplier::all();
        $categories = Category::all();

        if ($suppliers->isEmpty() || $categories->isEmpty()) {
            $this->command->warn('Asegúrate de tener categorías y proveedores antes de ejecutar este seeder.');
            return;
        }

        // 3. Definición de productos aleatorios
        $sampleProducts = [
            ['name' => 'Cámara Bala IP 4MP Hikvision', 'sku' => 'HIK-B4MP-IP', 'slug' => 'camaras'],
            ['name' => 'Cámara Domo Dahua 2MP FullColor', 'sku' => 'DAH-D2MP-FC', 'slug' => 'camaras'],
            ['name' => 'NVR Hikvision 8 Canales PoE', 'sku' => 'HIK-NVR08-POE', 'slug' => 'dvrs'],
            ['name' => 'DVR Dahua 16 Canales WizSense', 'sku' => 'DAH-DVR16-WS', 'slug' => 'dvrs'],
            ['name' => 'Disco Púrpura 4TB WD', 'sku' => 'WD40-PURZ', 'slug' => 'accesorios'],
            ['name' => 'Fuente Centralizada 20A 18CH', 'sku' => 'PWR-CENT-20A', 'slug' => 'accesorios'],
            ['name' => 'Monitor LED 22" Full HD', 'sku' => 'MON-22-FHD', 'slug' => 'accesorios'],
            ['name' => 'Cable UTP Cat5e 100% Cobre', 'sku' => 'UTP-C5E-COP', 'slug' => 'accesorios'],
            ['name' => 'Kit de 4 Cámaras 1080p', 'sku' => 'KIT-4CAM-HIK', 'slug' => 'camaras'],
            ['name' => 'Cámara PTZ 25x Autotracking', 'sku' => 'HIK-PTZ-25X', 'slug' => 'camaras'],
        ];

        $descriptions = [
            '<ul><li>Visión nocturna avanzada hasta 40 metros.</li><li>Resistencia a climas extremos IP67.</li><li>Análisis de video inteligente (IVS).</li></ul>',
            '<p>Producto de alta gama diseñado para seguridad profesional. Incluye garantía de 2 años con el fabricante y soporte técnico prioritario.</p>',
            '<p><strong>Especificaciones técnicas:</strong></p><ul><li>Procesador Quad-core</li><li>Salida HDMI 4K</li><li>Soporta doble flujo de video</li></ul>',
            '<div>Ideal para instalaciones comerciales que requieren máxima fidelidad de imagen y durabilidad.</div>',
        ];

        // 4. Seeding
        foreach ($sampleProducts as $index => $data) {
            $category = $categories->where('slug', $data['slug'])->first() ?: $categories->random();
            
            $product = Product::create([
                'category_id' => $category->id,
                'sku' => $data['sku'],
                'name' => $data['name'],
                'description' => $descriptions[array_rand($descriptions)],
                'margin_percentage' => rand(20, 45), // Margen aleatorio entre 20% y 45%
            ]);

            // Asignar 1 o 2 proveedores aleatorios
            $chosenSuppliers = $suppliers->random(rand(1, min(2, $suppliers->count())));
            
            foreach ($chosenSuppliers as $i => $supplier) {
                $product->suppliers()->attach($supplier->id, [
                    'cost' => rand(150, 1500),
                    'is_default' => ($i === 0), // El primero elegido es el principal
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info('10 productos aleatorios creados exitosamente.');
    }
}
