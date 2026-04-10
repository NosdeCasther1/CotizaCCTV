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
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->string('client_name');
            $table->decimal('subtotal_materials', 10, 2)->default(0);
            $table->decimal('margin_applied', 10, 2)->default(0);
            $table->decimal('freight_cost', 10, 2)->default(0);
            $table->decimal('gasoline_cost', 10, 2)->default(0);
            $table->decimal('per_diem_cost', 10, 2)->default(0);
            $table->decimal('installation_total', 10, 2)->default(0);
            $table->decimal('grand_total', 10, 2)->default(0);
            $table->enum('status', ['draft', 'sent', 'approved', 'rejected'])->default('draft');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotes');
    }
};
