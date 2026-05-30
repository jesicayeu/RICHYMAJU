<?php

use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WhatsAppController;
use App\Http\Controllers\Webhook\WahaWebhookController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\PresenceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DebtController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard');

Route::post('/webhooks/waha/{user}', WahaWebhookController::class)->name('webhooks.waha');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::resource('transactions', TransactionController::class)->except(['destroy']);
    Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy'])->middleware('role:admin')->name('transactions.destroy');
    Route::post('/transactions/{transaction}/lunas', [TransactionController::class, 'markPaid'])->name('transactions.lunas');
    Route::post('/transactions/{transaction}/verify', [TransactionController::class, 'verify'])->middleware('role:admin')->name('transactions.verify');
    Route::get('/transactions-export.pdf', [TransactionController::class, 'export'])->middleware('role:admin')->name('transactions.export');
    Route::get('/transactions-export-summary.pdf', [TransactionController::class, 'exportSummary'])->middleware('role:admin')->name('transactions.export.summary');

    Route::resource('debts', DebtController::class)->except(['destroy', 'create', 'store']);
    Route::delete('/debts/{debt}', [DebtController::class, 'destroy'])->middleware('role:admin')->name('debts.destroy');
    Route::post('/debts/{debt}/verify', [DebtController::class, 'verify'])->middleware('role:admin')->name('debts.verify');
    Route::get('/debts-export.pdf', [DebtController::class, 'export'])->middleware('role:admin')->name('debts.export');

    Route::resource('stocks', StockController::class)->except(['destroy']);
    Route::delete('/stocks/{stock}', [StockController::class, 'destroy'])->middleware('role:admin')->name('stocks.destroy');
    Route::get('/stocks-export.pdf', [StockController::class, 'export'])->middleware('role:admin')->name('stocks.export');

    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::get('/notifications-poll', [NotificationController::class, 'poll'])->name('notifications.poll');

    Route::get('/chat', [ChatController::class, 'index'])->name('chat.index');
    Route::get('/chat/presence', [ChatController::class, 'presence'])->name('chat.presence');
    Route::post('/chat/messages', [ChatController::class, 'store'])->name('chat.messages.store');
    Route::get('/chat/poll', [ChatController::class, 'poll'])->name('chat.poll');
    Route::post('/chat/conversations/{conversation}/read', [ChatController::class, 'markRead'])->name('chat.conversations.read');
    Route::delete('/chat/conversations/{conversation}', [ChatController::class, 'destroy'])->name('chat.conversations.destroy');
    Route::post('/presence/heartbeat', [PresenceController::class, 'heartbeat'])->name('presence.heartbeat');
    Route::post('/presence/away', [PresenceController::class, 'away'])->name('presence.away');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        Route::resource('users', UserController::class)->only(['index', 'create', 'store', 'edit', 'update', 'show', 'destroy']);
        Route::patch('/users/{user}/toggle-active', [UserController::class, 'toggle'])->name('users.toggle');
        Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');

        Route::get('/whatsapp', [WhatsAppController::class, 'index'])->name('whatsapp.index');
        Route::post('/whatsapp/connect', [WhatsAppController::class, 'connect'])->name('whatsapp.connect');
        Route::post('/whatsapp/message-templates', [WhatsAppController::class, 'storeMessageTemplate'])->name('whatsapp.message-templates.store');
        Route::put('/whatsapp/message-templates/{template}', [WhatsAppController::class, 'updateMessageTemplate'])->name('whatsapp.message-templates.update');
        Route::delete('/whatsapp/message-templates/{template}', [WhatsAppController::class, 'destroyMessageTemplate'])->name('whatsapp.message-templates.destroy');
        Route::post('/whatsapp/contacts', [WhatsAppController::class, 'storeContact'])->name('whatsapp.contacts.store');
        Route::put('/whatsapp/contacts/{contact}', [WhatsAppController::class, 'updateContact'])->name('whatsapp.contacts.update');
        Route::delete('/whatsapp/contacts/{contact}', [WhatsAppController::class, 'destroyContact'])->name('whatsapp.contacts.destroy');
    });
});

require __DIR__.'/auth.php';
