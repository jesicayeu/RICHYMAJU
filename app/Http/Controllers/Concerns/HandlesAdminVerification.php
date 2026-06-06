<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Debt;
use App\Models\Transaction;
use App\Services\GoogleSheetsSyncService;
use App\Services\WhatsappNotificationService;
use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

trait HandlesAdminVerification
{
    protected function blockedByVerificationLock(Transaction|Debt $record, ?string $routeName = null): ?RedirectResponse
    {
        if (! $record->isVerificationLocked()) {
            return null;
        }

        $message = 'Data sudah disetujui dan terkunci permanen.';

        if ($routeName) {
            return redirect()->route($routeName, $record)->with('error', $message);
        }

        return back()->with('error', $message);
    }

    protected function blockedByPendingVerification(Transaction|Debt $record): ?RedirectResponse
    {
        if ($record->isPendingVerification()) {
            return null;
        }

        return back()->with('error', 'Data sudah diverifikasi sebelumnya.');
    }

    protected function rejectAndDeleteRecord(
        Transaction|Debt $record,
        Request $request,
        array $data,
        string $redirectRoute,
        string $label,
        string $whatsappAction,
    ): RedirectResponse {
        DB::transaction(function () use ($record, $request, $data, $whatsappAction) {
            $before = $record->toArray();
            $snapshot = [
                ...$before,
                'verification_status' => 'ditolak',
                'verification_note' => $data['verification_note'] ?? null,
                'verified_by' => $request->user()->id,
                'verified_at' => now()->toISOString(),
            ];

            Audit::record(
                $record,
                'verifikasi',
                $before,
                $snapshot,
                $data['verification_note'] ?? 'Verifikasi ditolak, data dihapus permanen.',
            );

            app(WhatsappNotificationService::class)->dispatch(
                $whatsappAction,
                $request->user(),
                $record,
            );

            if ($record->evidence_path) {
                $this->drive->delete($record->evidence_path);
            }

            $module = $record instanceof Transaction ? 'transactions' : 'debts';
            $record->delete();
            app(GoogleSheetsSyncService::class)->syncModule($module);
        });

        return redirect()->route($redirectRoute)->with('success', "{$label} ditolak dan dihapus permanen.");
    }
}
