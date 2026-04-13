<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Eliminar el índice único previo que solo contemplaba el SKU
            $table->dropUnique(['sku']);
            
            // Crear el nuevo índice único compuesto que incluye deleted_at para permitir SoftDeletes
            $table->unique(['sku', 'deleted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['sku', 'deleted_at']);
            $table->unique(['sku']);
        });
    }
};
