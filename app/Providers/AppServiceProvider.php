<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (app()->isProduction()) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);

        if ($replyTo = config('mail.reply_to.address')) {
            Mail::alwaysReplyTo($replyTo, config('mail.reply_to.name'));
        }

        ResetPassword::toMailUsing(function (object $notifiable, string $token) {
            $url = url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));

            $name = $notifiable->display_name ?? $notifiable->name ?? $notifiable->username ?? null;

            return (new MailMessage)
                ->subject('Reset Password — Richy Maju')
                ->markdown('emails.reset-password', [
                    'url' => $url,
                    'name' => $name,
                    'expireMinutes' => config('auth.passwords.users.expire'),
                ]);
        });
    }
}
