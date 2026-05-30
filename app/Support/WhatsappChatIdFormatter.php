<?php

namespace App\Support;

class WhatsappChatIdFormatter
{
    public static function fromPhone(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '0')) {
            $digits = '62'.substr($digits, 1);
        } elseif (! str_starts_with($digits, '62')) {
            $digits = '62'.ltrim($digits, '0');
        }

        return $digits.'@c.us';
    }
}
