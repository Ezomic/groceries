<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class ProductController extends Controller
{
    public function lookup(string $barcode): JsonResponse
    {
        $product = Product::where('barcode', $barcode)->first();

        if ($product) {
            return response()->json($product);
        }

        $product = $this->fetchFromOpenFoodFacts($barcode);

        if ($product) {
            return response()->json($product);
        }

        return response()->json(['message' => 'Product not found'], 404);
    }

    private function fetchFromOpenFoodFacts(string $barcode): ?Product
    {
        $response = Http::timeout(5)
            ->get("https://world.openfoodfacts.org/api/v2/product/{$barcode}.json");

        if (! $response->ok()) {
            return null;
        }

        $data = $response->json();

        if (($data['status'] ?? 0) !== 1) {
            return null;
        }

        $p = $data['product'];

        return Product::create([
            'barcode' => $barcode,
            'name' => $p['product_name'] ?? $p['product_name_nl'] ?? $p['product_name_en'] ?? 'Unknown',
            'brand' => $p['brands'] ?? null,
            'category' => $p['categories_tags'][0] ?? null,
            'image_url' => $p['image_front_url'] ?? $p['image_url'] ?? null,
            'quantity_unit' => $p['quantity'] ?? null,
        ]);
    }
}
