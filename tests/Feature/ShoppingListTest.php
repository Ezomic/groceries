<?php

declare(strict_types=1);

use App\Models\Product;
use App\Models\ShoppingListItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('mobile')->plainTextToken;

    $this->product = Product::create([
        'barcode' => '9876543210',
        'name' => 'Shopping Product',
        'brand' => null,
        'category' => null,
        'image_url' => null,
        'quantity_unit' => null,
    ]);
});

it('returns an empty shopping list', function () {
    $this->withToken($this->token)
        ->getJson('/api/shopping-list')
        ->assertOk()
        ->assertJson([]);
});

it('adds an item to the shopping list', function () {
    $response = $this->withToken($this->token)
        ->postJson('/api/shopping-list', [
            'product_id' => $this->product->id,
            'quantity' => 3,
            'unit' => 'kg',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('product_id', $this->product->id)
        ->assertJsonPath('purchased_at', null);

    expect($response->json('quantity'))->toEqual(3);

    $this->assertDatabaseHas('shopping_list_items', [
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
    ]);
});

it('lists only pending items on the shopping list', function () {
    $pending = ShoppingListItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => null,
        'sort_order' => 1,
    ]);

    ShoppingListItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => Carbon::now(),
        'sort_order' => 2,
    ]);

    $response = $this->withToken($this->token)
        ->getJson('/api/shopping-list')
        ->assertOk();

    expect($response->json())->toHaveCount(1)
        ->and($response->json('0.id'))->toBe($pending->id);
});

it('updates a shopping list item', function () {
    $item = ShoppingListItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => null,
        'sort_order' => 1,
    ]);

    $response = $this->withToken($this->token)
        ->patchJson("/api/shopping-list/{$item->id}", ['quantity' => 4, 'notes' => 'organic'])
        ->assertOk()
        ->assertJsonPath('notes', 'organic');

    expect($response->json('quantity'))->toEqual(4);
});

it('marks an item as purchased', function () {
    $item = ShoppingListItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => null,
        'sort_order' => 1,
    ]);

    $this->withToken($this->token)
        ->postJson("/api/shopping-list/{$item->id}/purchase")
        ->assertOk()
        ->assertJsonPath('id', $item->id);

    $this->assertDatabaseMissing('shopping_list_items', [
        'id' => $item->id,
        'purchased_at' => null,
    ]);
});

it('marks an item as purchased by barcode', function () {
    ShoppingListItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => null,
        'sort_order' => 1,
    ]);

    $this->withToken($this->token)
        ->postJson('/api/shopping-list/purchase-by-barcode', ['barcode' => $this->product->barcode])
        ->assertOk()
        ->assertJsonPath('product_id', $this->product->id);
});

it('returns 404 when purchasing by barcode not on list', function () {
    $this->withToken($this->token)
        ->postJson('/api/shopping-list/purchase-by-barcode', ['barcode' => '0000000000'])
        ->assertStatus(404);
});

it('removes an item from the shopping list', function () {
    $item = ShoppingListItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => null,
        'sort_order' => 1,
    ]);

    $this->withToken($this->token)
        ->deleteJson("/api/shopping-list/{$item->id}")
        ->assertStatus(204);

    $this->assertDatabaseMissing('shopping_list_items', ['id' => $item->id]);
});

it('clears all purchased items', function () {
    ShoppingListItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => Carbon::now(),
        'sort_order' => 1,
    ]);

    $this->withToken($this->token)
        ->deleteJson('/api/shopping-list/clear-purchased')
        ->assertOk();

    expect(ShoppingListItem::where('user_id', $this->user->id)->count())->toBe(0);
});

it('returns history of purchased items', function () {
    ShoppingListItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => Carbon::now(),
        'sort_order' => 1,
    ]);

    $response = $this->withToken($this->token)
        ->getJson('/api/shopping-list/history')
        ->assertOk();

    expect($response->json())->toHaveCount(1);
});

it('cannot update another users shopping list item', function () {
    $other = User::factory()->create();
    $item = ShoppingListItem::create([
        'user_id' => $other->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => null,
        'sort_order' => 1,
    ]);

    $this->withToken($this->token)
        ->patchJson("/api/shopping-list/{$item->id}", ['quantity' => 99])
        ->assertStatus(403);
});

it('cannot delete another users shopping list item', function () {
    $other = User::factory()->create();
    $item = ShoppingListItem::create([
        'user_id' => $other->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
        'purchased_at' => null,
        'sort_order' => 1,
    ]);

    $this->withToken($this->token)
        ->deleteJson("/api/shopping-list/{$item->id}")
        ->assertStatus(403);
});
