<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PantryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ShoppingListController;
use Illuminate\Support\Facades\Route;

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('logout', [AuthController::class, 'logout']);

    Route::get('products/lookup/{barcode}', [ProductController::class, 'lookup']);

    Route::get('pantry', [PantryController::class, 'index']);
    Route::post('pantry', [PantryController::class, 'store']);
    Route::patch('pantry/{pantryItem}', [PantryController::class, 'update']);
    Route::delete('pantry/{pantryItem}', [PantryController::class, 'destroy']);

    Route::get('shopping-list', [ShoppingListController::class, 'index']);
    Route::get('shopping-list/history', [ShoppingListController::class, 'history']);
    Route::post('shopping-list', [ShoppingListController::class, 'store']);
    Route::patch('shopping-list/{shoppingListItem}', [ShoppingListController::class, 'update']);
    Route::post('shopping-list/{shoppingListItem}/purchase', [ShoppingListController::class, 'purchase']);
    Route::post('shopping-list/purchase-by-barcode', [ShoppingListController::class, 'purchaseByBarcode']);
    Route::delete('shopping-list/clear-purchased', [ShoppingListController::class, 'clearPurchased']);
    Route::delete('shopping-list/{shoppingListItem}', [ShoppingListController::class, 'destroy']);
});
