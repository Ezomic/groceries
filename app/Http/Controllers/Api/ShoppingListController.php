<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ShoppingListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $items = $user
            ->shoppingListItems()
            ->with('product')
            ->pending()
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        return response()->json($items);
    }

    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $items = $user
            ->shoppingListItems()
            ->with('product')
            ->purchased()
            ->orderBy('purchased_at', 'desc')
            ->limit(100)
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

        $maxSort = $user->shoppingListItems()->pending()->max('sort_order');

        $item = $user->shoppingListItems()->create([
            'product_id' => $request->integer('product_id'),
            'quantity' => $request->filled('quantity') ? $request->float('quantity') : 1,
            'unit' => $request->string('unit')->toString() ?: null,
            'notes' => $request->string('notes')->toString() ?: null,
            'sort_order' => (is_numeric($maxSort) ? (int) $maxSort : 0) + 1,
        ]);

        return response()->json($item->load('product'), 201);
    }

    public function update(Request $request, ShoppingListItem $shoppingListItem): JsonResponse
    {
        $this->authorize('update', $shoppingListItem);

        $request->validate([
            'quantity' => ['nullable', 'numeric', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
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
        if ($request->has('sort_order')) {
            $attributes['sort_order'] = $request->filled('sort_order') ? $request->integer('sort_order') : null;
        }

        $shoppingListItem->update($attributes);

        return response()->json($shoppingListItem->load('product'));
    }

    public function purchase(Request $request, ShoppingListItem $shoppingListItem): JsonResponse
    {
        $this->authorize('update', $shoppingListItem);

        $shoppingListItem->update(['purchased_at' => Carbon::now()]);

        return response()->json($shoppingListItem->load('product'));
    }

    public function purchaseByBarcode(Request $request): JsonResponse
    {
        $request->validate([
            'barcode' => ['required', 'string'],
        ]);

        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $item = $user
            ->shoppingListItems()
            ->whereHas('product', fn ($q) => $q->where('barcode', $request->string('barcode')->toString()))
            ->pending()
            ->first();

        if (! $item) {
            return response()->json(['message' => 'Item not on shopping list'], 404);
        }

        $item->update(['purchased_at' => Carbon::now()]);

        return response()->json($item->load('product'));
    }

    public function destroy(Request $request, ShoppingListItem $shoppingListItem): JsonResponse
    {
        $this->authorize('delete', $shoppingListItem);

        $shoppingListItem->delete();

        return response()->json(null, 204);
    }

    public function clearPurchased(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $user->shoppingListItems()->purchased()->delete();

        return response()->json(['message' => 'Cleared']);
    }
}
