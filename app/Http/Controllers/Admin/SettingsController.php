<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(
        private WhatsAppController $whatsapp,
        private GoogleDriveController $googleDrive,
        private EncryptionController $encryption,
        private PaymentSettingController $payment,
    ) {}

    public function index(Request $request): Response
    {
        $tab = $request->query('tab', 'whatsapp');

        if (! in_array($tab, ['whatsapp', 'google-drive', 'encryption', 'payment'], true)) {
            $tab = 'whatsapp';
        }

        return Inertia::render('Admin/Settings/Index', [
            'activeSection' => $tab,
            'whatsapp' => $this->whatsapp->settingsProps(),
            'googleDrive' => $this->googleDrive->settingsProps(),
            'encryption' => $this->encryption->settingsProps(),
            'payment' => $this->payment->settingsProps(),
        ]);
    }
}
