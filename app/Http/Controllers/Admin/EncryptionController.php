<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EncryptionSetting;
use App\Services\DatabaseReencryptionService;
use App\Services\StoragePathMigrationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;

class EncryptionController extends Controller
{
    public function index(): RedirectResponse
    {
        return redirect()->route('admin.settings.index', ['tab' => 'encryption']);
    }

    /**
     * @return array<string, mixed>
     */
    public function settingsProps(): array
    {
        $setting = EncryptionSetting::current();

        return [
            'textSettings' => [
                'text_key' => $setting->text_key ?? '',
                'key_type' => $setting->text_key_type ?? 'aes-256-gcm',
                'configured' => filled($setting->text_key),
            ],
            'fileSettings' => [
                'file_key' => $setting->file_key ?? '',
                'key_type' => $setting->file_key_type ?? 'aes-256-gcm',
                'configured' => filled($setting->file_key),
            ],
            'keyTypes' => EncryptionSetting::KEY_TYPES,
        ];
    }

    public function updateText(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'text_key' => ['nullable', 'string', 'max:2000'],
            'key_type' => ['required', 'string', 'in:'.implode(',', array_keys(EncryptionSetting::KEY_TYPES))],
        ]);

        $setting = EncryptionSetting::current();

        if (! filled($data['text_key']) && ! filled($setting->text_key)) {
            return back()
                ->with('error', 'Kunci enkripsi teks wajib diisi.')
                ->with('encryption_tab', 'text');
        }

        $setting->text_key_type = $data['key_type'];

        $textKeyChanging = array_key_exists('text_key', $data)
            && filled($data['text_key'])
            && $data['text_key'] !== $setting->text_key;

        if ($textKeyChanging) {
            app(StoragePathMigrationService::class)->migrateAllToPlain();
        }

        if (array_key_exists('text_key', $data) && filled($data['text_key'])) {
            $setting->text_key = $data['text_key'];
        }

        $setting->save();

        return back()
            ->with('success', 'Pengaturan enkripsi teks tersimpan.')
            ->with('encryption_tab', 'text');
    }

    public function updateFile(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'file_key' => ['nullable', 'string', 'max:2000'],
            'key_type' => ['required', 'string', 'in:'.implode(',', array_keys(EncryptionSetting::KEY_TYPES))],
        ]);

        $setting = EncryptionSetting::current();

        if (! filled($data['file_key']) && ! filled($setting->file_key)) {
            return back()
                ->with('error', 'Kunci enkripsi file wajib diisi.')
                ->with('encryption_tab', 'file');
        }

        $setting->file_key_type = $data['key_type'];

        if (array_key_exists('file_key', $data) && filled($data['file_key'])) {
            $setting->file_key = $data['file_key'];
        }

        $setting->save();

        return back()
            ->with('success', 'Pengaturan enkripsi file tersimpan.')
            ->with('encryption_tab', 'file');
    }

    public function migrateStoragePaths(StoragePathMigrationService $migration): RedirectResponse
    {
        $result = $migration->migrateAllToPlain();

        if ($result['failed'] > 0) {
            return back()->with(
                'error',
                "{$result['migrated']} path diperbaiki, {$result['failed']} masih gagal. Gunakan kunci teks lama untuk mendekripsi path, lalu simpan lagi."
            );
        }

        return back()->with(
            'success',
            $result['migrated'] > 0
                ? "{$result['migrated']} path file diperbarui. Gambar tidak lagi bergantung pada kunci teks."
                : 'Semua path file sudah dalam format yang benar.'
        );
    }

    public function reencryptAll(DatabaseReencryptionService $reencryption): RedirectResponse
    {
        set_time_limit(0);

        try {
            $result = $reencryption->reencryptAll();
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            "Enkripsi ulang selesai. {$result['text_records']} record teks dan {$result['file_records']} file diperbarui."
        );
    }
}
