<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GoogleDriveSetting;
use App\Services\GoogleDriveService;
use App\Services\GoogleSheetsSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class GoogleDriveController extends Controller
{
    /** @var array<string, string> */
    private const FOLDER_MODULES = [
        'transactions' => 'Transaksi',
        'stocks' => 'Stok Barang',
        'debts' => 'Utang',
        'chat' => 'Chat',
        'profile' => 'Profil',
    ];

    /** @var array<string, string> */
    private const SHEET_MODULES = [
        'sales' => 'Penjualan',
        'products' => 'Kelola Produk',
        'transactions' => 'Transaksi',
        'stocks' => 'Stok Barang',
        'debts' => 'Utang',
    ];

    public function __construct(
        private GoogleDriveService $drive,
        private GoogleSheetsSyncService $sheets,
    ) {}

    public function index(): RedirectResponse
    {
        return redirect()->route('admin.settings.index', ['tab' => 'google-drive']);
    }

    /**
     * @return array<string, mixed>
     */
    public function settingsProps(): array
    {
        $setting = GoogleDriveSetting::current();

        return [
            'settings' => [
                'client_id' => $setting->client_id ?? '',
                'client_secret' => $setting->client_secret ?? '',
                'redirect_uri' => $this->drive->redirectUri(),
                'connection_status' => $this->drive->isConnected() ? 'terhubung' : 'belum_terhubung',
                'connected_email' => $setting->connected_email,
                'connected_at' => $setting->connected_at?->toIso8601String(),
            ],
            'folders' => [
                'transactions' => $setting->folder_transactions ?? '',
                'stocks' => $setting->folder_stocks ?? '',
                'debts' => $setting->folder_debts ?? '',
                'chat' => $setting->folder_chat ?? '',
                'profile' => $setting->folder_profile ?? '',
            ],
            'sheets' => [
                'sales' => $setting->sheet_sales ?? '',
                'products' => $setting->sheet_products ?? '',
                'transactions' => $setting->sheet_transactions ?? '',
                'stocks' => $setting->sheet_stocks ?? '',
                'debts' => $setting->sheet_debts ?? '',
            ],
        ];
    }

    public function connect(Request $request): RedirectResponse|SymfonyResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'string', 'max:255'],
            'client_secret' => ['nullable', 'string', 'max:500'],
        ]);

        $setting = GoogleDriveSetting::current();
        $setting->client_id = $data['client_id'];

        if (filled($data['client_secret'])) {
            $setting->client_secret = $data['client_secret'];
        }

        if (! filled($setting->client_secret)) {
            return back()->with('error', 'Client Secret wajib diisi.');
        }

        try {
            $setting->save();
            return Inertia::location($this->drive->authUrl());
        } catch (Throwable $e) {
            $message = $e instanceof RuntimeException ? $e->getMessage() : 'Gagal memulai koneksi Google Drive. Silakan coba lagi.';
            return back()->with('error', $message);
        }
    }

    public function browseFolder(string $module): Response|RedirectResponse
    {
        if (! array_key_exists($module, self::FOLDER_MODULES)) {
            abort(404);
        }

        $folderId = GoogleDriveSetting::current()->folderIdFor($module);

        if (! filled($folderId)) {
            return redirect()
                ->route('admin.settings.index', ['tab' => 'google-drive'])
                ->with('error', 'Folder belum dikonfigurasi.');
        }

        $files = [];
        $error = null;

        try {
            if (! $this->drive->isConnected()) {
                throw new RuntimeException('Google Drive belum terhubung.');
            }

            $files = $this->drive->listFilesInFolder($folderId);
        } catch (Throwable $e) {
            $error = $e instanceof RuntimeException
                ? $e->getMessage()
                : 'Gagal memuat daftar file dari Google Drive.';
        }

        return Inertia::render('Admin/GoogleDrive/FolderBrowse', [
            'module' => $module,
            'moduleLabel' => self::FOLDER_MODULES[$module],
            'folderId' => $folderId,
            'driveFolderUrl' => $this->drive->folderUrl($folderId),
            'files' => $files,
            'error' => $error,
        ]);
    }

    public function browseSheet(string $module): Response|RedirectResponse
    {
        if (! array_key_exists($module, self::SHEET_MODULES)) {
            abort(404);
        }

        $sheetRef = GoogleDriveSetting::current()->sheetIdFor($module);

        if (! filled($sheetRef)) {
            return redirect()
                ->route('admin.settings.index', ['tab' => 'google-drive'])
                ->with('error', 'Sheet belum dikonfigurasi.');
        }

        $headers = [];
        $rows = [];
        $error = null;

        try {
            if (! $this->drive->isConnected()) {
                throw new RuntimeException('Google Drive belum terhubung.');
            }

            $preview = $this->sheets->previewModule($module);
            $headers = $preview['headers'];
            $rows = $preview['rows'];
        } catch (Throwable $e) {
            $error = $e instanceof RuntimeException
                ? $e->getMessage()
                : 'Gagal memuat pratinjau sheet.';
        }

        return Inertia::render('Admin/GoogleDrive/SheetBrowse', [
            'module' => $module,
            'moduleLabel' => self::SHEET_MODULES[$module],
            'sheetRef' => $sheetRef,
            'sheetUrl' => $this->sheetUrl($sheetRef),
            'headers' => $headers,
            'rows' => $rows,
            'error' => $error,
        ]);
    }

    private function sheetUrl(string $sheetRef): string
    {
        $trimmed = trim($sheetRef);

        if ($trimmed === '') {
            return '';
        }

        if (str_starts_with($trimmed, 'http')) {
            return $trimmed;
        }

        return 'https://docs.google.com/spreadsheets/d/'.$trimmed;
    }

    public function updateFolders(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'folder_transactions' => ['required', 'string', 'max:255'],
            'folder_stocks' => ['required', 'string', 'max:255'],
            'folder_debts' => ['required', 'string', 'max:255'],
            'folder_chat' => ['required', 'string', 'max:255'],
            'folder_profile' => ['required', 'string', 'max:255'],
        ]);

        try {
            GoogleDriveSetting::current()->update([
                'folder_transactions' => $data['folder_transactions'],
                'folder_stocks' => $data['folder_stocks'],
                'folder_debts' => $data['folder_debts'],
                'folder_chat' => $data['folder_chat'],
                'folder_profile' => $data['folder_profile'],
            ]);
        } catch (Throwable $e) {
            return back()->with('error', 'Gagal menyimpan konfigurasi Folder Google Drive. Silakan coba lagi.');
        }

        return back()->with('success', 'Folder Google Drive tersimpan.');
    }

    public function updateSheets(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'sheet_sales' => ['required', 'string', 'max:500'],
            'sheet_products' => ['required', 'string', 'max:500'],
            'sheet_transactions' => ['required', 'string', 'max:500'],
            'sheet_stocks' => ['required', 'string', 'max:500'],
            'sheet_debts' => ['required', 'string', 'max:500'],
        ]);

        try {
            GoogleDriveSetting::current()->update([
                'sheet_sales' => $data['sheet_sales'],
                'sheet_products' => $data['sheet_products'],
                'sheet_transactions' => $data['sheet_transactions'],
                'sheet_stocks' => $data['sheet_stocks'],
                'sheet_debts' => $data['sheet_debts'],
            ]);
        } catch (Throwable $e) {
            return back()->with('error', 'Gagal menyimpan konfigurasi Sheet Google Drive. Silakan coba lagi.');
        }

        return back()->with('success', 'Sheet Google Sheets tersimpan.');
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->filled('error')) {
            return redirect()->route('admin.settings.index', ['tab' => 'google-drive'])->with('error', 'Autorisasi Google Drive dibatalkan.');
        }

        if (! $request->filled('code')) {
            return redirect()->route('admin.settings.index', ['tab' => 'google-drive'])->with('error', 'Kode autorisasi Google tidak ditemukan.');
        }

        try {
            $this->drive->handleCallback((string) $request->query('code'));
        } catch (Throwable $e) {
            $message = $e instanceof RuntimeException ? $e->getMessage() : 'Gagal menyelesaikan proses koneksi Google Drive. Silakan coba lagi.';
            return redirect()->route('admin.settings.index', ['tab' => 'google-drive'])->with('error', $message);
        }

        $email = GoogleDriveSetting::current()->connected_email;

        return redirect()->route('admin.settings.index', ['tab' => 'google-drive'])->with(
            'success',
            $email ? "Google Drive terhubung ke {$email}." : 'Google Drive berhasil terhubung.'
        );
    }

    public function disconnect(): RedirectResponse
    {
        try {
            $this->drive->disconnect();
        } catch (Throwable) {
            return back()->with('error', 'Gagal memutus koneksi Google Drive. Silakan coba lagi.');
        }

        return back()->with('success', 'Google Drive telah diputus.');
    }
}
