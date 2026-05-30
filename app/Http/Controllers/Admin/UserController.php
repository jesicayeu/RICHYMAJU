<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'role', 'status']);
        $users = User::query()
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where(fn ($qq) => $qq->where('name', 'like', "%{$v}%")->orWhere('username', 'like', "%{$v}%")->orWhere('email', 'like', "%{$v}%")->orWhere('phone', 'like', "%{$v}%")))
            ->when($filters['role'] ?? null, fn ($q, $v) => $q->where('role', $v))
            ->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Admin/Users/Index', ['users' => $users, 'filters' => $filters]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Users/Form', ['managedUser' => null]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'alpha_dash', 'max:100', 'unique:users,username'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]*$/'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'in:admin,kasir'],
            'status' => ['required', 'in:aktif,nonaktif'],
        ]);
        $data['display_name'] = $data['name'];
        $user = User::create($data);
        Audit::record($user, 'tambah', [], $user->toArray(), 'Akun baru dibuat.');

        return redirect()->route('admin.users.index')->with('success', 'Akun dibuat.');
    }

    public function edit(User $user): Response
    {
        return Inertia::render('Admin/Users/Form', ['managedUser' => $user]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'alpha_dash', 'max:100', 'unique:users,username,'.$user->id],
            'email' => ['required', 'email', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]*$/'],
            'role' => ['required', 'in:admin,kasir'],
            'status' => ['required', 'in:aktif,nonaktif'],
        ]);
        $data['display_name'] = $data['name'];

        $before = $user->toArray();
        $user->update($data);
        Audit::record($user, 'ubah', $before, $user->fresh()->toArray(), 'Data akun diperbarui.');

        return redirect()->route('admin.users.index')->with('success', 'Akun diperbarui.');
    }

    public function show(User $user): Response
    {
        return Inertia::render('Admin/Users/Show', ['managedUser' => $user->load('transactions', 'debts')]);
    }

    public function toggle(User $user): RedirectResponse
    {
        $before = $user->toArray();
        $user->update(['status' => $user->status === 'aktif' ? 'nonaktif' : 'aktif']);
        Audit::record($user, 'aktivasi', $before, $user->fresh()->toArray(), 'Status akun diubah.');

        return back()->with('success', 'Status akun diubah.');
    }

    public function resetPassword(User $user, Request $request): RedirectResponse
    {
        $data = $request->validate(['password' => ['nullable', 'string', 'min:6']]);
        $password = $data['password'] ?: Str::password(10, symbols: false);
        $user->update(['password' => Hash::make($password)]);
        Audit::record($user, 'reset_password', [], [], 'Password akun direset.');

        return back()->with('success', 'Password baru: '.$password);
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_if($user->id === auth()->id(), 422, 'Tidak dapat menghapus akun sendiri.');
        $before = $user->toArray();
        $user->delete();
        Audit::record($user, 'hapus', $before, [], 'Akun dihapus secara soft delete.');

        return redirect()->route('admin.users.index')->with('success', 'Akun dihapus.');
    }
}
