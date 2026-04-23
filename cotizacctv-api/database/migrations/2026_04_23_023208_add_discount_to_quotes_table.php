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
        Schema::table('quotes', function (Blueprint $table) {
            $table->decimal('discount_amount', 12, 2)->default(0)->after('grand_total');
            $table->string('discount_type')->default('fixed')->after('discount_amount'); // 'fixed' or 'percentage'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropColumn(['discount_amount', 'discount_type']);
        });
    }
};
