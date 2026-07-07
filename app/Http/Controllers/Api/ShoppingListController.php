<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShoppingListItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ShoppingListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = $request->user()
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
        $items = $request->user()
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
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity'   => ['nullable', 'numeric', 'min:0'],
            'unit'       => ['nullable', 'string', 'max:50'],
            'notes'      => ['nullable', 'string', 'max:255'],
        ]);

        $item = $request->user()->shoppingListItems()->create([
            'product_id' => $data['product_id'],
            'quantity'   => $data['quantity'] ?? 1,
            'unit'       => $data['unit'] ?? null,
            'notes'      => $data['notes'] ?? null,
            'sort_order' => $request->user()->shoppingListItems()->pending()->max('sort_order') + 1,
        ]);

        return response()->json($item->load('product'), 201);
    }

    public function update(Request $request, ShoppingListItem $shoppingListItem): JsonResponse
    {
        $this->authorize('update', $shoppingListItem);

        $data = $request->validate([
            'quantity'   => ['nullable', 'numeric', 'min:0'],
            'unit'       => ['nullable', 'string', 'max:50'],
            'notes'      => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $shoppingListItem->update($data);

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
        $data = $request->validate([
            'barcode' => ['required', 'string'],
        ]);

        $item = $request->user()
            ->shoppingListItems()
            ->whereHas('product', fn ($q) => $q->where('barcode', $data['barcode']))
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
        $request->user()->shoppingListItems()->purchased()->delete();

        return response()->json(['message' => 'Cleared']);
    }
}
