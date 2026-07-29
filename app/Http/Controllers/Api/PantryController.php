<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PantryItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PantryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $items = $user
            ->pantryItems()
            ->with('product')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $item = $user->pantryItems()->updateOrCreate(
            ['product_id' => $request->integer('product_id')],
            [
                'quantity' => $request->filled('quantity') ? $request->float('quantity') : 1,
                'unit' => $request->string('unit')->toString() ?: null,
                'notes' => $request->string('notes')->toString() ?: null,
            ]
        );

        return response()->json($item->load('product'), 201);
    }

    public function update(Request $request, PantryItem $pantryItem): JsonResponse
    {
        $this->authorize('update', $pantryItem);

        $request->validate([
            'quantity' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $attributes = [];
        if ($request->has('quantity')) {
            $attributes['quantity'] = $request->filled('quantity') ? $request->float('quantity') : null;
        }
        if ($request->has('unit')) {
            $attributes['unit'] = $request->string('unit')->toString() ?: null;
        }
        if ($request->has('notes')) {
            $attributes['notes'] = $request->string('notes')->toString() ?: null;
        }

        $pantryItem->update($attributes);

        return response()->json($pantryItem->load('product'));
    }

    public function destroy(Request $request, PantryItem $pantryItem): JsonResponse
    {
        $this->authorize('delete', $pantryItem);

        $pantryItem->delete();

        return response()->json(null, 204);
    }
}
