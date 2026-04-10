<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Supplier;

class SupplierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Supplier::create([
            'name' => 'Distribuidora Segura S.A.',
            'phone' => '2233-4455',
            'email' => 'ventas@distsegura.com',
        ]);

        Supplier::create([
            'name' => 'TecnoSistemas Global',
            'phone' => '2455-8899',
            'email' => 'soporte@tecnosistemas.gt',
        ]);
    }
}
