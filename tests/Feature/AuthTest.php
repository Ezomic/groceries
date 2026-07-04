<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('registers a new user and returns a token', function () {
    $response = $this->postJson('/api/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
});

it('logs in an existing user', function () {
    User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password123'),
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $response->assertOk()->assertJsonStructure(['token', 'user']);
});

it('rejects login with wrong credentials', function () {
    User::factory()->create(['email' => 'test@example.com']);

    $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'wrongpassword',
    ])->assertStatus(422);
});

it('logs out successfully', function () {
    $user = User::factory()->create();
    $token = $user->createToken('mobile')->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/logout')
        ->assertOk()
        ->assertJsonPath('message', 'Logged out');

    expect($user->tokens()->count())->toBe(0);
});

it('returns 401 for unauthenticated pantry request', function () {
    $this->getJson('/api/pantry')->assertStatus(401);
});

it('returns 401 for unauthenticated shopping-list request', function () {
    $this->getJson('/api/shopping-list')->assertStatus(401);
});

it('returns 401 for unauthenticated product lookup', function () {
    $this->getJson('/api/products/lookup/1234567890')->assertStatus(401);
});
