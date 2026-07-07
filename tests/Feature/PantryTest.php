<?php

declare(strict_types=1);

use App\Models\PantryItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->token = $this->user->createToken('mobile')->plainTextToken;

    $this->product = Product::create([
        'barcode' => '1234567890',
        'name' => 'Test Product',
        'brand' => 'Test Brand',
        'category' => null,
        'image_url' => null,
        'quantity_unit' => null,
    ]);
});

it('returns empty pantry for a new user', function () {
    $this->withToken($this->token)
        ->getJson('/api/pantry')
        ->assertOk()
        ->assertJson([]);
});

it('adds a product to the pantry', function () {
    $response = $this->withToken($this->token)
        ->postJson('/api/pantry', [
            'product_id' => $this->product->id,
            'quantity' => 2,
            'unit' => 'stuks',
        ]);

    $response->assertStatus(201)
        ->assertJsonPath('product_id', $this->product->id)
        ->assertJsonPath('unit', 'stuks');

    expect($response->json('quantity'))->toEqual(2);

    $this->assertDatabaseHas('pantry_items', [
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 2,
    ]);
});

it('updates existing pantry item when adding the same product again', function () {
    $this->withToken($this->token)->postJson('/api/pantry', [
        'product_id' => $this->product->id,
        'quantity' => 1,
    ]);

    $this->withToken($this->token)->postJson('/api/pantry', [
        'product_id' => $this->product->id,
        'quantity' => 5,
    ]);

    expect(PantryItem::where('user_id', $this->user->id)->count())->toBe(1)
        ->and((float) PantryItem::where('user_id', $this->user->id)->value('quantity'))->toEqual(5.0);
});

it('updates a pantry item', function () {
    $item = PantryItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
    ]);

    $response = $this->withToken($this->token)
        ->patchJson("/api/pantry/{$item->id}", ['quantity' => 3, 'notes' => 'fridge'])
        ->assertOk()
        ->assertJsonPath('notes', 'fridge');

    expect($response->json('quantity'))->toEqual(3);
});

it('deletes a pantry item', function () {
    $item = PantryItem::create([
        'user_id' => $this->user->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
    ]);

    $this->withToken($this->token)
        ->deleteJson("/api/pantry/{$item->id}")
        ->assertStatus(204);

    $this->assertDatabaseMissing('pantry_items', ['id' => $item->id]);
});

it('cannot update another users pantry item', function () {
    $other = User::factory()->create();
    $item = PantryItem::create([
        'user_id' => $other->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
    ]);

    $this->withToken($this->token)
        ->patchJson("/api/pantry/{$item->id}", ['quantity' => 99])
        ->assertStatus(403);
});

it('cannot delete another users pantry item', function () {
    $other = User::factory()->create();
    $item = PantryItem::create([
        'user_id' => $other->id,
        'product_id' => $this->product->id,
        'quantity' => 1,
        'unit' => null,
        'notes' => null,
    ]);

    $this->withToken($this->token)
        ->deleteJson("/api/pantry/{$item->id}")
        ->assertStatus(403);
});
