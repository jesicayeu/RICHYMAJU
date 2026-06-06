<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GoogleDriveSetting;
use App\Services\GoogleDriveService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class GoogleDriveController extends Controller
{
    public function __construct(
        private GoogleDriveService $drive,
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

        $setting->save();

        try {
            return Inertia::location($this->drive->authUrl());
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
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

        GoogleDriveSetting::current()->update([
            'folder_transactions' => $data['folder_transactions'],
            'folder_stocks' => $data['folder_stocks'],
            'folder_debts' => $data['folder_debts'],
            'folder_chat' => $data['folder_chat'],
            'folder_profile' => $data['folder_profile'],
        ]);

        return back()->with('success', 'Folder Google Drive tersimpan.');
    }

    public function updateSheets(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'sheet_transactions' => ['required', 'string', 'max:500'],
            'sheet_stocks' => ['required', 'string', 'max:500'],
            'sheet_debts' => ['required', 'string', 'max:500'],
        ]);

        GoogleDriveSetting::current()->update([
            'sheet_transactions' => $data['sheet_transactions'],
            'sheet_stocks' => $data['sheet_stocks'],
            'sheet_debts' => $data['sheet_debts'],
        ]);

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
        } catch (RuntimeException $e) {
            return redirect()->route('admin.settings.index', ['tab' => 'google-drive'])->with('error', $e->getMessage());
        }

        $email = GoogleDriveSetting::current()->connected_email;

        return redirect()->route('admin.settings.index', ['tab' => 'google-drive'])->with(
            'success',
            $email ? "Google Drive terhubung ke {$email}." : 'Google Drive berhasil terhubung.'
        );
    }

    public function disconnect(): RedirectResponse
    {
        $this->drive->disconnect();

        return back()->with('success', 'Google Drive telah diputus.');
    }
}
