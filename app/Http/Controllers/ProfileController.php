<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Services\GoogleDriveService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ProfileController extends Controller
{
    public function __construct(
        private GoogleDriveService $drive,
    ) {}
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $avatarFile = $request->file('avatar');
        $removeAvatar = $request->boolean('remove_avatar');

        unset($validated['avatar'], $validated['remove_avatar']);

        $validated['display_name'] = $validated['name'];

        $user->fill($validated);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        try {
            if ($avatarFile) {
                $this->drive->delete($user->avatar_path);

                $extension = $avatarFile->getClientOriginalExtension() ?: 'jpg';
                $user->avatar_path = $this->drive->upload(
                    $avatarFile,
                    'profile',
                    'avatar-'.$user->id.'.'.$extension,
                );
            } elseif ($removeAvatar && $user->avatar_path) {
                $this->drive->delete($user->avatar_path);
                $user->avatar_path = null;
            }
        } catch (\Throwable $e) {
            $message = $e instanceof RuntimeException
                ? $e->getMessage()
                : 'Gagal menyimpan avatar ke Google Drive. Pastikan akun Google sudah terhubung dan coba lagi.';

            return Redirect::route('profile.edit')->with('error', $message);
        }

        $user->save();

        return Redirect::route('profile.edit')->with('success', 'Profil tersimpan.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
