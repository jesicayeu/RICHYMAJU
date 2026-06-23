<?php

use App\Http\Controllers\Admin\EncryptionController;
use App\Http\Controllers\Admin\GoogleDriveController;
use App\Http\Controllers\Admin\PaymentSettingController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\WhatsAppController;
use App\Http\Controllers\Webhook\WahaWebhookController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\PresenceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DebtController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('welcome');

Route::post('/webhooks/waha/{user}', WahaWebhookController::class)->name('webhooks.waha');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, '__invoke'])->name('dashboard');
    Route::get('/dashboard-export.pdf', [DashboardController::class, 'export'])->middleware('role:admin')->name('dashboard.export');
    Route::get('/media', [MediaController::class, 'show'])->name('media.show');

    Route::get('/sales/pos', [SaleController::class, 'pos'])->name('sales.pos');
    Route::put('/sales/pos/cart', [SaleController::class, 'savePosCart'])->name('sales.pos.cart.save');
    Route::delete('/sales/pos/cart', [SaleController::class, 'clearPosCart'])->name('sales.pos.cart.clear');
    Route::get('/sales/scanner-test', [SaleController::class, 'scannerTest'])->middleware('role:admin')->name('sales.scanner-test');
    Route::get('/sales/scanner-setup', [SaleController::class, 'scannerSetup'])->middleware('role:admin')->name('sales.scanner-setup');
    Route::resource('sales', SaleController::class)->except(['destroy']);
    Route::post('/sales/{sale}/confirm-payment', [SaleController::class, 'confirmPayment'])->name('sales.confirm-payment');
    Route::delete('/sales/{sale}', [SaleController::class, 'destroy'])->middleware('role:admin')->name('sales.destroy');

    Route::get('/products/lookup/{barcode}', [ProductController::class, 'lookup'])->name('products.lookup');
    Route::get('/products/check/{barcode}', [ProductController::class, 'checkBarcode'])->name('products.check');
    Route::resource('products', ProductController::class)->except(['show', 'create', 'edit']);

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
    Route::delete('/stocks/product/{product}/clear', [StockController::class, 'clearProductStock'])->middleware('role:admin')->name('stocks.clear-product');
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
        Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
        Route::post('/settings/payment', [PaymentSettingController::class, 'update'])->name('settings.payment');

        Route::get('/google-drive', [GoogleDriveController::class, 'index'])->name('google-drive.index');
        Route::post('/google-drive/connect', [GoogleDriveController::class, 'connect'])->name('google-drive.connect');
        Route::get('/google-drive/folders/{module}', [GoogleDriveController::class, 'browseFolder'])->name('google-drive.folders.browse');
        Route::get('/google-drive/sheets/{module}', [GoogleDriveController::class, 'browseSheet'])->name('google-drive.sheets.browse');
        Route::post('/google-drive/folders', [GoogleDriveController::class, 'updateFolders'])->name('google-drive.folders');
        Route::post('/google-drive/sheets', [GoogleDriveController::class, 'updateSheets'])->name('google-drive.sheets');
        Route::get('/google-drive/callback', [GoogleDriveController::class, 'callback'])->name('google-drive.callback');
        Route::post('/google-drive/disconnect', [GoogleDriveController::class, 'disconnect'])->name('google-drive.disconnect');

        Route::get('/encryption', [EncryptionController::class, 'index'])->name('encryption.index');
        Route::post('/encryption/text', [EncryptionController::class, 'updateText'])->name('encryption.text');
        Route::post('/encryption/file', [EncryptionController::class, 'updateFile'])->name('encryption.file');
        Route::post('/encryption/migrate-storage-paths', [EncryptionController::class, 'migrateStoragePaths'])->name('encryption.migrate-storage-paths');
        Route::post('/encryption/reencrypt-all', [EncryptionController::class, 'reencryptAll'])->name('encryption.reencrypt-all');

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
        Route::post('/whatsapp/test-send', [WhatsAppController::class, 'sendTestMessage'])->name('whatsapp.test-send');
    });
});

require __DIR__.'/auth.php';
