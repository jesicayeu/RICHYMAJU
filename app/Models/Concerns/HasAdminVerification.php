<?php

namespace App\Models\Concerns;

trait HasAdminVerification
{
    public function isVerificationLocked(): bool
    {
        return $this->verification_status === 'disetujui';
    }

    public function isPendingVerification(): bool
    {
        $status = $this->verification_status;

        return $status === null || $status === '' || $status === 'menunggu';
    }
}
