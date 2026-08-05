<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

it('rejects unauthenticated access to the tokens endpoints', function () {
    $this->getJson('/api/tokens')->assertUnauthorized();
    $this->postJson('/api/tokens', ['name' => 'CI'])->assertUnauthorized();
    $this->deleteJson('/api/tokens/1')->assertUnauthorized();
});

it('lists the users tokens without exposing the secret', function () {
    $user = User::factory()->create();
    $user->createToken('existing');
    Sanctum::actingAs($user);

    $response = $this->getJson('/api/tokens');

    $response->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'existing')
        ->assertJsonMissingPath('0.token');
});

it('only lists the acting users own tokens', function () {
    $user = User::factory()->create();
    $user->createToken('mine');
    User::factory()->create()->createToken('theirs');
    Sanctum::actingAs($user);

    $this->getJson('/api/tokens')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.name', 'mine');
});

it('creates a token and reveals the plaintext exactly once', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $response = $this->postJson('/api/tokens', ['name' => 'CI pipeline']);

    $response->assertStatus(201)
        ->assertJsonStructure(['id', 'name', 'token'])
        ->assertJsonPath('name', 'CI pipeline');

    expect($response->json('token'))->toContain('|');
    expect($user->tokens()->count())->toBe(1);

    // The plaintext is not recoverable from any later read.
    $listed = $this->getJson('/api/tokens')->assertOk()->json();
    expect($listed[0])->not->toHaveKey('token');
});

it('never persists the plaintext token', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $plainText = $this->postJson('/api/tokens', ['name' => 'CI'])->json('token');

    expect($plainText)->toBeString();
    $this->assertDatabaseMissing('personal_access_tokens', ['token' => $plainText]);
});

it('requires a token name', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->postJson('/api/tokens', ['name' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    expect($user->tokens()->count())->toBe(0);
});

it('rejects a duplicate token name for the same user', function () {
    $user = User::factory()->create();
    $user->createToken('CI');
    Sanctum::actingAs($user);

    $this->postJson('/api/tokens', ['name' => 'CI'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    expect($user->tokens()->count())->toBe(1);
});

it('allows the same token name for different users', function () {
    User::factory()->create()->createToken('CI');
    $second = User::factory()->create();
    Sanctum::actingAs($second);

    $this->postJson('/api/tokens', ['name' => 'CI'])->assertStatus(201);

    expect($second->tokens()->count())->toBe(1);
});

it('revokes the users own token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('CI')->accessToken;
    Sanctum::actingAs($user);

    $this->deleteJson('/api/tokens/'.$token->getKey())->assertNoContent();

    expect($user->tokens()->count())->toBe(0);
});

it('cannot revoke another users token', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $otherToken = $other->createToken('theirs')->accessToken;
    Sanctum::actingAs($user);

    $this->deleteJson('/api/tokens/'.$otherToken->getKey())->assertNoContent();

    expect($other->tokens()->count())->toBe(1);
});
