<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PantryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PantryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = $request->user()
            ->pantryItems()
            ->with('product')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $item = $request->user()->pantryItems()->updateOrCreate(
            ['product_id' => $data['product_id']],
            [
                'quantity' => $data['quantity'] ?? 1,
                'unit' => $data['unit'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]
        );

        return response()->json($item->load('product'), 201);
    }

    public function update(Request $request, PantryItem $pantryItem): JsonResponse
    {
        $this->authorize('update', $pantryItem);

        $data = $request->validate([
            'quantity' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $pantryItem->update($data);

        return response()->json($pantryItem->load('product'));
    }

    public function destroy(Request $request, PantryItem $pantryItem): JsonResponse
    {
        $this->authorize('delete', $pantryItem);

        $pantryItem->delete();

        return response()->json(null, 204);
    }
}
