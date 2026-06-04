<?php

namespace App\Services;

use App\Models\EncryptionSetting;
use RuntimeException;

class EncryptionService
{
    public const PREFIX = 'RM1.';

    public function isReady(string $context): bool
    {
        $setting = EncryptionSetting::current();

        return filled($context === 'file' ? $setting->file_key : $setting->text_key);
    }

    public function isEncrypted(?string $value): bool
    {
        return is_string($value) && str_starts_with($value, self::PREFIX);
    }

    public function encryptText(string $plaintext): string
    {
        return self::PREFIX.$this->encryptPayload($plaintext, 'text');
    }

    public function decryptText(?string $payload): ?string
    {
        if ($payload === null || $payload === '') {
            return $payload;
        }

        if (! $this->isEncrypted($payload)) {
            return $payload;
        }

        return $this->decryptPayload(substr($payload, strlen(self::PREFIX)), 'text');
    }

    public function tryDecryptText(?string $payload): ?string
    {
        try {
            return $this->decryptText($payload);
        } catch (RuntimeException) {
            return null;
        }
    }

    public function encryptBytes(string $bytes): string
    {
        return $this->encryptPayload($bytes, 'file');
    }

    public function decryptBytes(string $bytes): string
    {
        if ($bytes === '') {
            return $bytes;
        }

        if (! $this->looksLikeJson($bytes)) {
            return $bytes;
        }

        return $this->decryptPayload($bytes, 'file', prefixed: false);
    }

    public function tryDecryptBytes(string $bytes): ?string
    {
        try {
            return $this->decryptBytes($bytes);
        } catch (RuntimeException) {
            return null;
        }
    }

    private function encryptPayload(string $plaintext, string $context): string
    {
        [$key, $algorithm] = $this->resolveConfig($context);
        $ivLength = str_contains($algorithm, 'gcm') ? 12 : 16;
        $iv = random_bytes($ivLength);

        if (str_contains($algorithm, 'gcm')) {
            $tag = '';
            $ciphertext = openssl_encrypt(
                $plaintext,
                $this->opensslCipher($algorithm),
                $key,
                OPENSSL_RAW_DATA,
                $iv,
                $tag,
            );

            if ($ciphertext === false) {
                throw new RuntimeException('Enkripsi gagal.');
            }

            $payload = json_encode([
                'alg' => $algorithm,
                'iv' => base64_encode($iv),
                'tag' => base64_encode($tag),
                'data' => base64_encode($ciphertext),
            ], JSON_THROW_ON_ERROR);
        } else {
            $ciphertext = openssl_encrypt(
                $plaintext,
                $this->opensslCipher($algorithm),
                $key,
                OPENSSL_RAW_DATA,
                $iv,
            );

            if ($ciphertext === false) {
                throw new RuntimeException('Enkripsi gagal.');
            }

            $payload = json_encode([
                'alg' => $algorithm,
                'iv' => base64_encode($iv),
                'data' => base64_encode($ciphertext),
            ], JSON_THROW_ON_ERROR);
        }

        return $context === 'text'
            ? $payload
            : $payload;
    }

    private function decryptPayload(string $payload, string $context, bool $prefixed = true): string
    {
        if ($context === 'text' && ! $prefixed) {
            throw new RuntimeException('Format teks terenkripsi tidak valid.');
        }

        $json = $context === 'file' && ! $this->looksLikeJson($payload)
            ? $payload
            : $payload;

        try {
            /** @var array{alg?: string, iv?: string, tag?: string, data?: string} $data */
            $data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new RuntimeException('Data terenkripsi tidak valid.');
        }

        $algorithm = $data['alg'] ?? null;
        $iv = isset($data['iv']) ? base64_decode($data['iv'], true) : false;
        $cipher = isset($data['data']) ? base64_decode($data['data'], true) : false;

        if (! $algorithm || $iv === false || $cipher === false) {
            throw new RuntimeException('Data terenkripsi tidak valid.');
        }

        [$key] = $this->resolveConfig($context, $algorithm);

        if (str_contains($algorithm, 'gcm')) {
            $tag = isset($data['tag']) ? base64_decode($data['tag'], true) : false;

            if ($tag === false) {
                throw new RuntimeException('Data terenkripsi tidak valid.');
            }

            $plaintext = openssl_decrypt(
                $cipher,
                $this->opensslCipher($algorithm),
                $key,
                OPENSSL_RAW_DATA,
                $iv,
                $tag,
            );
        } else {
            $plaintext = openssl_decrypt(
                $cipher,
                $this->opensslCipher($algorithm),
                $key,
                OPENSSL_RAW_DATA,
                $iv,
            );
        }

        if ($plaintext === false) {
            throw new RuntimeException('Dekripsi gagal. Periksa kunci enkripsi.');
        }

        return $plaintext;
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolveConfig(string $context, ?string $algorithm = null): array
    {
        $setting = EncryptionSetting::current();
        $key = $context === 'file' ? $setting->file_key : $setting->text_key;
        $algorithm ??= $context === 'file'
            ? ($setting->file_key_type ?? 'aes-256-gcm')
            : ($setting->text_key_type ?? 'aes-256-gcm');

        if (! filled($key)) {
            throw new RuntimeException(
                $context === 'file'
                    ? 'Kunci enkripsi file belum dikonfigurasi di halaman Enkrip.'
                    : 'Kunci enkripsi teks belum dikonfigurasi di halaman Enkrip.'
            );
        }

        if (! str_starts_with($algorithm, 'aes-')) {
            throw new RuntimeException('Hanya algoritma AES yang didukung.');
        }

        return [$this->deriveKey($key, $algorithm), $algorithm];
    }

    private function deriveKey(string $key, string $algorithm): string
    {
        $hash = hash('sha256', $key, true);

        return str_starts_with($algorithm, 'aes-128')
            ? substr($hash, 0, 16)
            : $hash;
    }

    private function opensslCipher(string $algorithm): string
    {
        return match ($algorithm) {
            'aes-256-gcm' => 'aes-256-gcm',
            'aes-128-gcm' => 'aes-128-gcm',
            'aes-256-cbc' => 'aes-256-cbc',
            default => throw new RuntimeException("Algoritma [{$algorithm}] tidak didukung."),
        };
    }

    private function looksLikeJson(string $value): bool
    {
        $trimmed = ltrim($value);

        return str_starts_with($trimmed, '{') || str_starts_with($trimmed, '[');
    }
}
