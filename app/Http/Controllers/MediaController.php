<?php

namespace App\Http\Controllers;

use App\Services\EncryptionService;
use App\Services\GoogleDriveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    public function __construct(
        private GoogleDriveService $drive,
    ) {}

    public function show(Request $request): StreamedResponse
    {
        $token = $request->query('t');

        if (! is_string($token) || $token === '') {
            abort(404);
        }

        try {
            $path = decrypt($token);
        } catch (\Throwable) {
            abort(404);
        }

        if (! is_string($path) || $path === '') {
            abort(404);
        }

        if ($this->drive->isDrivePath($path)) {
            return $this->streamFromDrive($path);
        }

        if (! Storage::disk('public')->exists($path)) {
            abort(404);
        }

        $contents = Storage::disk('public')->get($path);
        $contents = app(EncryptionService::class)->tryDecryptBytes($contents) ?? $contents;
        $mimeType = $this->guessMimeType(basename($path), $contents) ?? Storage::disk('public')->mimeType($path);

        return response()->stream(function () use ($contents): void {
            echo $contents;
        }, 200, [
            'Content-Type' => $mimeType ?: 'application/octet-stream',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    private function guessMimeType(string $filename, string $contents): ?string
    {
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        return match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            default => str_starts_with($contents, "\xFF\xD8\xFF") ? 'image/jpeg'
                : (str_starts_with($contents, "\x89PNG\r\n\x1a\n") ? 'image/png' : null),
        };
    }

    private function streamFromDrive(string $path): StreamedResponse
    {
        try {
            [$mimeType, $contents] = $this->drive->download($path);
        } catch (RuntimeException) {
            abort(404);
        }

        return response()->stream(function () use ($contents): void {
            echo $contents;
        }, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
