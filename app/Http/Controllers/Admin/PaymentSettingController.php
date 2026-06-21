<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Services\QrisPaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PaymentSettingController extends Controller
{
    public function __construct(
        private QrisPaymentService $qrisPaymentService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function settingsProps(): array
    {
        $setting = PaymentSetting::current();

        return [
            'merchant_name' => $setting->account_holder ?? '',
            'merchant_id' => $setting->account_number ?? '',
            'provider_name' => $setting->bank_name ?? '',
            'static_qris_payload' => $setting->static_qris_payload ?? '',
            'configured' => $setting->isConfigured(),
        ];
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'merchant_name' => ['required', 'string', 'max:150'],
            'merchant_id' => ['required', 'string', 'max:50'],
            'provider_name' => ['nullable', 'string', 'max:100'],
            'static_qris_payload' => ['required', 'string', 'max:2000'],
        ]);

        $payload = $this->normalizeQrisPayload($data['static_qris_payload']);

        if (! str_starts_with($payload, '000201')) {
            throw ValidationException::withMessages([
                'static_qris_payload' => 'Payload QRIS tidak valid. Salin string QRIS tanpa mengubah isinya.',
            ]);
        }

        try {
            $this->qrisPaymentService->assertValidStatic($payload);
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'static_qris_payload' => 'Payload QRIS tidak dapat diproses. Tempel ulang string QRIS asli dari poster/aplikasi Anda.',
            ]);
        }

        PaymentSetting::current()->update([
            'bank_name' => filled($data['provider_name']) ? $data['provider_name'] : 'QRIS Merchant',
            'account_number' => $data['merchant_id'],
            'account_holder' => $data['merchant_name'],
            'static_qris_payload' => $payload,
            'dana_phone' => null,
            'dana_account_holder' => null,
            'dana_static_qris_payload' => null,
            'gopay_phone' => null,
            'gopay_account_holder' => null,
            'gopay_static_qris_payload' => null,
        ]);

        return back()
            ->with('success', 'Pengaturan pembayaran QRIS berhasil disimpan.')
            ->with('settings_tab', 'payment');
    }

    private function normalizeQrisPayload(?string $payload): string
    {
        if (! filled($payload)) {
            return '';
        }

        return $this->qrisPaymentService->normalizeStatic($payload);
    }
}
