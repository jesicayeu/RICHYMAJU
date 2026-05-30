<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Throwable;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower($request->string('email')->toString());

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereIn('role', ['admin', 'kasir'])
            ->where('status', 'aktif')
            ->first();

        if (! $user) {
            return back()->with(
                'status',
                'Jika email terdaftar, link reset password telah dikirim ke kotak masuk Anda.',
            );
        }

        try {
            $status = Password::sendResetLink(['email' => $user->email]);
        } catch (TransportExceptionInterface $e) {
            Log::error('Gagal kirim email reset password (SMTP)', [
                'email' => $user->email,
                'message' => $e->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['Gagal mengirim email. Periksa konfigurasi SMTP atau coba lagi nanti.'],
            ]);
        } catch (Throwable $e) {
            Log::error('Gagal kirim email reset password', [
                'email' => $user->email,
                'message' => $e->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'email' => ['Terjadi kesalahan saat mengirim email. Silakan coba lagi.'],
            ]);
        }

        if ($status === Password::RESET_LINK_SENT) {
            return back()->with(
                'status',
                'Link reset password telah dikirim ke '.$user->email.'. Periksa kotak masuk dan folder spam.',
            );
        }

        if ($status === Password::RESET_THROTTLED) {
            $waitSeconds = (int) config('auth.passwords.users.throttle', 60);

            throw ValidationException::withMessages([
                'email' => ["Terlalu banyak permintaan. Tunggu {$waitSeconds} detik (1 menit) lalu coba lagi."],
            ]);
        }

        Log::error('Gagal kirim reset password', [
            'status' => $status,
            'email' => $user->email,
        ]);

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }
}
