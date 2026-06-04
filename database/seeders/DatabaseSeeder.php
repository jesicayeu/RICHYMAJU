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
        $this->seedUser(
            ['email' => 'jesicayeuyanan04@gmail.com'],
            [
                'username' => 'admin',
                'name' => 'Pemilik Richy Maju',
                'display_name' => 'Pemilik Toko',
                'email' => 'jesicayeuyanan04@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'status' => 'aktif',
            ],
        );

        $this->seedUser(
            ['email' => 'kasir1@richymaju.my.id'],
            [
                'username' => 'kasir1',
                'name' => 'Kasir Richy Maju',
                'display_name' => 'Kasir 1',
                'email' => 'kasir1@richymaju.my.id',
                'password' => Hash::make('password'),
                'role' => 'kasir',
                'status' => 'aktif',
            ],
        );
    }

    /** @param  array<string, mixed>  $match
     * @param  array<string, mixed>  $attributes
     */
    protected function seedUser(array $match, array $attributes): void
    {
        $user = User::withTrashed()->updateOrCreate($match, $attributes);

        if ($user->trashed()) {
            $user->restore();
        }
    }
}
