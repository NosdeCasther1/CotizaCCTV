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
            // Actualizamos la columna status a string con valores permitidos: pending, accepted, rejected, completed
            // El valor por defecto es pending
            $table->string('status')->default('pending')->change();
        });

        // Opcionalmente, podemos actualizar los registros existentes si es necesario, 
        // pero como es un cambio de draft/sent/approved/rejected a pending/accepted/rejected/completed:
        // draft -> pending
        // approved -> accepted
        // rejected -> rejected
        // sent -> pending (o lo que convenga)
        \DB::table('quotes')->where('status', 'draft')->update(['status' => 'pending']);
        \DB::table('quotes')->where('status', 'sent')->update(['status' => 'pending']);
        \DB::table('quotes')->where('status', 'approved')->update(['status' => 'accepted']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotes', function (Blueprint $table) {
            $table->enum('status', ['draft', 'sent', 'approved', 'rejected'])->default('draft')->change();
        });
    }
};
