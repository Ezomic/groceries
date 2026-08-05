<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreApiTokenRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class ApiTokenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $tokens = $user->tokens()
            ->latest()
            ->get()
            ->map(fn (PersonalAccessToken $token): array => [
                'id' => $token->getKey(),
                'name' => $token->name,
                'created_at' => $token->created_at,
                'last_used_at' => $token->last_used_at,
            ]);

        return response()->json($tokens);
    }

    public function store(StoreApiTokenRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $token = $user->createToken($request->string('name')->toString());

        // The only time the plaintext exists; it is never stored or returned again.
        return response()->json([
            'id' => $token->accessToken->getKey(),
            'name' => $token->accessToken->name,
            'token' => $token->plainTextToken,
        ], 201);
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        // Scoped to the acting user's own tokens: another user's id deletes nothing.
        $user->tokens()->whereKey($token)->delete();

        return response()->json(null, 204);
    }
}
