<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create pivot table
        Schema::create('supplier_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->decimal('cost', 10, 2);
            $table->timestamp('updated_at')->useCurrent();
        });

        // 2. Migrate existing data from products to supplier_product
        $products = DB::table('products')->get();
        foreach ($products as $product) {
            DB::table('supplier_product')->insert([
                'product_id' => $product->id,
                'supplier_id' => $product->supplier_id,
                'cost' => $product->current_cost,
                'updated_at' => $product->updated_at ?? now(),
            ]);
        }

        // 3. Drop columns from products table
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn(['supplier_id', 'current_cost']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore columns to products
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->constrained()->restrictOnDelete();
            $table->decimal('current_cost', 10, 2)->default(0);
        });

        // Migrate back if possible (taking the first supplier/cost)
        $supplierProducts = DB::table('supplier_product')
            ->orderBy('updated_at', 'desc')
            ->get()
            ->unique('product_id');

        foreach ($supplierProducts as $sp) {
            DB::table('products')
                ->where('id', $sp->product_id)
                ->update([
                    'supplier_id' => $sp->supplier_id,
                    'current_cost' => $sp->cost,
                ]);
        }

        Schema::dropIfExists('supplier_product');
    }
};
