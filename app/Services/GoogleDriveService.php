<?php

namespace App\Services;

use App\Models\GoogleDriveSetting;
use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;
use Google\Service\Oauth2;
use Illuminate\Http\UploadedFile;
use RuntimeException;

class GoogleDriveService
{
    public const PREFIX = 'gdrive:';

    public function isConfigured(): bool
    {
        $setting = GoogleDriveSetting::current();

        return filled($setting->client_id) && filled($setting->client_secret);
    }

    public function isConnected(): bool
    {
        return filled(GoogleDriveSetting::current()->refresh_token);
    }

    public function redirectUri(): string
    {
        return route('admin.google-drive.callback', absolute: true);
    }

    public function authUrl(): string
    {
        return $this->makeClient()->createAuthUrl();
    }

    public function handleCallback(string $code): void
    {
        $client = $this->makeClient();
        $token = $client->fetchAccessTokenWithAuthCode($code);

        if (isset($token['error'])) {
            throw new RuntimeException($token['error_description'] ?? $token['error']);
        }

        $setting = GoogleDriveSetting::current();
        $setting->refresh_token = $token['refresh_token'] ?? $setting->refresh_token;
        $setting->access_token = $token['access_token'] ?? null;
        $setting->token_expires_at = isset($token['expires_in'])
            ? now()->addSeconds((int) $token['expires_in'])
            : null;
        $setting->connected_at = now();

        $client->setAccessToken($token);
        $oauth = new Oauth2($client);
        $setting->connected_email = $oauth->userinfo->get()->getEmail();
        $setting->save();
    }

    public function disconnect(): void
    {
        $setting = GoogleDriveSetting::current();
        $setting->update([
            'refresh_token' => null,
            'access_token' => null,
            'token_expires_at' => null,
            'connected_email' => null,
            'connected_at' => null,
        ]);
    }

    public function upload(UploadedFile $file, string $module, ?string $filename = null): string
    {
        $folderId = GoogleDriveSetting::current()->folderIdFor($module);

        if (! $folderId) {
            throw new RuntimeException("Folder Google Drive untuk modul [{$module}] belum dikonfigurasi.");
        }

        $filename ??= $this->buildFilename($file);
        $drive = new Drive($this->authorizedClient());

        $rawContents = file_get_contents($file->getRealPath());
        $contents = app(EncryptionService::class)->encryptBytes($rawContents);
        $mimeType = 'application/octet-stream';

        $metadata = new DriveFile([
            'name' => $filename,
            'parents' => [$folderId],
        ]);

        $created = $drive->files->create($metadata, [
            'data' => $contents,
            'mimeType' => $mimeType,
            'uploadType' => 'multipart',
            'fields' => 'id',
        ]);

        return self::PREFIX.$created->getId();
    }

    public function replaceContents(string $path, string $plainContents): void
    {
        if (! $this->isDrivePath($path)) {
            throw new RuntimeException('Berkas bukan dari Google Drive.');
        }

        $fileId = $this->fileIdFromPath($path);
        $drive = new Drive($this->authorizedClient());
        $encrypted = app(EncryptionService::class)->encryptBytes($plainContents);

        $drive->files->update($fileId, new DriveFile, [
            'data' => $encrypted,
            'mimeType' => 'application/octet-stream',
            'uploadType' => 'media',
        ]);
    }

    public function delete(?string $path): void
    {
        if (! $path || ! $this->isDrivePath($path)) {
            if ($path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($path);
            }

            return;
        }

        $fileId = $this->fileIdFromPath($path);
        $drive = new Drive($this->authorizedClient());

        try {
            $drive->files->delete($fileId);
        } catch (\Throwable) {
            // File mungkin sudah dihapus manual di Drive.
        }
    }

    public function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return route('media.show', ['t' => encrypt($path)], absolute: false);
    }

    /**
     * @return array{0: string, 1: string} [mimeType, contents]
     */
    public function download(string $path): array
    {
        if (! $this->isDrivePath($path)) {
            throw new RuntimeException('Berkas bukan dari Google Drive.');
        }

        $fileId = $this->fileIdFromPath($path);
        $drive = new Drive($this->authorizedClient());

        $meta = $drive->files->get($fileId, ['fields' => 'mimeType,name']);
        $response = $drive->files->get($fileId, ['alt' => 'media']);
        $encrypted = $response->getBody()->getContents();
        $contents = app(EncryptionService::class)->decryptBytes($encrypted);

        $mimeType = $this->guessMimeType($meta->getName(), $contents)
            ?: ($meta->getMimeType() !== 'application/octet-stream' ? $meta->getMimeType() : 'application/octet-stream');

        return [
            $mimeType,
            $contents,
        ];
    }

    private function guessMimeType(?string $filename, string $contents): ?string
    {
        if ($filename) {
            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

            return match ($ext) {
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                'pdf' => 'application/pdf',
                default => null,
            };
        }

        if (str_starts_with($contents, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }

        if (str_starts_with($contents, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }

        return null;
    }

    public function isDrivePath(?string $path): bool
    {
        return is_string($path) && str_starts_with($path, self::PREFIX);
    }

    private function fileIdFromPath(string $path): string
    {
        return substr($path, strlen(self::PREFIX));
    }

    private function buildFilename(UploadedFile $file): string
    {
        $original = basename($file->getClientOriginalName());

        return $original !== '' ? $original : 'berkas';
    }

    private function authorizedClient(): Client
    {
        $setting = GoogleDriveSetting::current();

        if (! filled($setting->refresh_token)) {
            throw new RuntimeException('Google Drive belum terhubung. Admin perlu menghubungkan akun Google terlebih dahulu.');
        }

        $client = $this->makeClient();
        $client->setAccessToken([
            'access_token' => $setting->access_token,
            'refresh_token' => $setting->refresh_token,
            'expires_in' => $setting->token_expires_at
                ? max(0, now()->diffInSeconds($setting->token_expires_at, false))
                : 0,
            'created' => $setting->updated_at?->getTimestamp() ?? time(),
        ]);

        if ($client->isAccessTokenExpired()) {
            $token = $client->fetchAccessTokenWithRefreshToken($setting->refresh_token);

            if (isset($token['error'])) {
                throw new RuntimeException('Token Google Drive kedaluwarsa. Hubungkan ulang akun Google.');
            }

            $setting->access_token = $token['access_token'] ?? $setting->access_token;
            $setting->token_expires_at = isset($token['expires_in'])
                ? now()->addSeconds((int) $token['expires_in'])
                : null;
            $setting->save();

            $client->setAccessToken($token);
        }

        return $client;
    }

    private function makeClient(): Client
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Kredensial Google OAuth belum dikonfigurasi.');
        }

        $setting = GoogleDriveSetting::current();

        $client = new Client;
        $client->setClientId($setting->client_id);
        $client->setClientSecret($setting->client_secret);
        $client->setRedirectUri($this->redirectUri());
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setScopes([
            Drive::DRIVE_FILE,
            'https://www.googleapis.com/auth/userinfo.email',
        ]);

        return $client;
    }
}
