<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'Pemilik Richy Maju',
                'display_name' => 'Pemilik Toko',
                'email' => 'jesicayeuyanan04@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'status' => 'aktif',
            ],
        );

        User::updateOrCreate(
            ['username' => 'kasir1'],
            [
                'name' => 'Kasir Richy Maju',
                'display_name' => 'Kasir 1',
                'email' => 'kasir1@richymaju.my.id',
                'password' => Hash::make('password'),
                'role' => 'kasir',
                'status' => 'aktif',
            ],
        );
    }
}
