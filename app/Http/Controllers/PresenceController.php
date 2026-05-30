<?php

namespace App\Http\Controllers;

use App\Services\PresenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PresenceController extends Controller
{
    public function heartbeat(Request $request): JsonResponse
    {
        $user = $request->user();
        PresenceService::markOnline($user);

        return response()->json([
            'ok' => true,
            'is_online' => $user->isOnline(),
        ]);
    }

    public function away(Request $request): JsonResponse
    {
        $user = $request->user();
        PresenceService::markOffline($user);

        return response()->json([
            'ok' => true,
            'is_online' => false,
        ]);
    }
}
