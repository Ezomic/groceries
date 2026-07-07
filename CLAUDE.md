# Groceries API

Laravel 13 REST API for the Groceries app. Handles auth, product lookups, pantry, and shopping list.

## Stack

- PHP 8.4, Laravel 13
- SQLite (`database/database.sqlite`)
- Laravel Sanctum for token auth
- Open Food Facts for barcode lookups

## Running locally

Served by Herd at `http://groceries-api.test` — no `php artisan serve` needed.

```bash
php artisan migrate          # run pending migrations
php artisan test             # Pest suite
```

## Architecture

### Models

| Model | Table | Notes |
|-------|-------|-------|
| `User` | `users` | Sanctum `HasApiTokens`; has many pantry/shopping items |
| `Product` | `products` | Barcode → name/brand/image. Populated on first scan via Open Food Facts |
| `PantryItem` | `pantry_items` | User owns products; unique per (user, product) |
| `ShoppingListItem` | `shopping_list_items` | `purchased_at` nullable — null = pending, set = purchased |

### Controllers (`app/Http/Controllers/Api/`)

| Controller | Responsibility |
|-----------|---------------|
| `AuthController` | Register, login, logout (token-per-device named `mobile`) |
| `ProductController` | `GET /products/lookup/{barcode}` — hits DB first, falls back to Open Food Facts and saves result |
| `PantryController` | CRUD for the user's pantry; `store` uses `updateOrCreate` so scanning the same item twice increments rather than errors |
| `ShoppingListController` | Shopping list CRUD, mark purchased by ID or barcode, purchase history, clear purchased |

### Policies

`PantryItemPolicy` and `ShoppingListItemPolicy` — both check `user_id === auth user`. All mutating endpoints call `$this->authorize()`.

### Routes (`routes/api.php`)

All routes are prefixed `/api/`. Auth routes are public; everything else requires `auth:sanctum`.

## API reference

### Auth

```
POST /api/register   { name, email, password, password_confirmation }
POST /api/login      { email, password }
POST /api/logout     (Bearer token)
```

Response includes `{ token, user }`.

### Products

```
GET /api/products/lookup/{barcode}
```

Returns a `Product` object. Hits DB first; on miss fetches Open Food Facts and persists the result. Returns 404 if not found on either.

### Pantry

```
GET    /api/pantry
POST   /api/pantry                { product_id, quantity?, unit?, notes? }
PATCH  /api/pantry/{id}           { quantity?, unit?, notes? }
DELETE /api/pantry/{id}
```

`POST` uses `updateOrCreate` keyed on `product_id` — safe to call on re-scan.

### Shopping list

```
GET    /api/shopping-list                      pending items, ordered by sort_order
GET    /api/shopping-list/history              last 100 purchased items
POST   /api/shopping-list                      { product_id, quantity?, unit?, notes? }
PATCH  /api/shopping-list/{id}                 { quantity?, unit?, notes?, sort_order? }
POST   /api/shopping-list/{id}/purchase        marks purchased_at = now
POST   /api/shopping-list/purchase-by-barcode  { barcode } — finds pending item and marks it
DELETE /api/shopping-list/{id}
DELETE /api/shopping-list/clear-purchased      bulk-delete all purchased items
```

## Deployment

See `deploy/` directory.

```bash
# First time
bash deploy/first-deploy.sh <server-ip>

# Subsequent deploys
bash deploy/deploy.sh <server-ip>
```

Files in `deploy/`:
- `server-setup.sh` — run once on a fresh Ubuntu 24.04 droplet as root
- `first-deploy.sh` — rsync + migrate + cache, run from local machine
- `deploy.sh` — ongoing deploys (puts app in maintenance mode during migration)
- `.env.production` — production env file (not committed; copied to server as `.env`)

## Key gotchas

- `PantryController::store` uses `updateOrCreate` — scanning the same barcode twice updates the existing row instead of creating a duplicate.
- The `purchase-by-barcode` route must come before `{shoppingListItem}` in `routes/api.php` to avoid route binding treating `purchase-by-barcode` as an ID.
- `clear-purchased` (DELETE) must also come before `{shoppingListItem}` for the same reason.
- Open Food Facts can be slow (~2-3s); product lookup has a 5s timeout. Once a product is saved locally it's never re-fetched.

## Linear

Team: **THI** (Thijssen Software) — `3b1bf7b2-5ff4-4e70-9ca5-a1efb1280839`

Branch format: `feature/thi-{number}-{description}` or `fix/thi-{number}-{description}`

Follow the full workflow in `~/.claude/CLAUDE.md`. See parent context in `~/Projects/groceries/CLAUDE.md`.
