# Groceries App

React Native (Expo) app for scanning groceries, managing a pantry, and maintaining a shopping list.

## Stack

- Expo SDK (blank TypeScript template)
- React Navigation (bottom tabs + native stack)
- `expo-barcode-scanner` for camera/barcode
- Axios for API calls
- `@react-native-async-storage/async-storage` for token persistence

## Running locally

```bash
cd ~/groceries/app
npx expo start
```

Scan the QR code with **Expo Go** on your Android phone. Phone and Mac must be on the same WiFi, or use `--tunnel` flag.

## API URL

Defined in [`src/api.ts`](src/api.ts):

```ts
export const API_URL = 'https://api.thijssensoftware.nl/api';
```

Change to `http://groceries-api.test/api` for local dev (also add `"usesCleartextTraffic": true` under `android` in `app.json` for HTTP on Android).

## File structure

```
src/
├── api.ts              Axios instance + TypeScript interfaces (Product, PantryItem, ShoppingListItem)
├── AuthContext.tsx      Auth state, token storage, login/register/logout
├── Navigation.tsx      Root navigator — shows AuthStack when logged out, AppTabs when logged in
└── screens/
    ├── LoginScreen.tsx
    ├── RegisterScreen.tsx
    ├── ScanScreen.tsx          Barcode scanner with three modes
    ├── ShoppingListScreen.tsx  Pending shopping list
    ├── PantryScreen.tsx        Pantry inventory
    └── HistoryScreen.tsx       Purchase history
```

## Screens

### ScanScreen

Three modes selectable at the top of the scanner:

| Mode | What scan does |
|------|---------------|
| `+ List` | Looks up barcode → shows product modal → adds to shopping list |
| `+ Pantry` | Looks up barcode → shows product modal → adds to pantry |
| `✓ Purchase` | Calls `purchase-by-barcode` directly → marks item purchased without a modal |

Flow: scan → `GET /products/lookup/{barcode}` → modal with product info + quantity → confirm → API call.

### ShoppingListScreen

- Lists all pending items (no `purchased_at`)
- Tap ○ to mark purchased → removes from list
- Tap ✕ to delete with confirmation
- Pull to refresh

### PantryScreen

- Lists all pantry items
- Tap **Edit** → modal to update quantity/notes
- Tap **+ List** → adds the item to the shopping list
- Tap ✕ to delete with confirmation

### HistoryScreen

- Last 100 purchased items ordered by purchase date
- Tap **+ List** to re-add any item to the shopping list

## Auth flow

`AuthContext` stores the Sanctum token in AsyncStorage under key `token`. On app start it restores the logged-in state without re-login. `Navigation.tsx` switches between `AuthStack` and `AppTabs` based on `token` presence.

## Building the APK

```bash
eas login
eas build --platform android --profile preview
```

The `preview` profile in [`eas.json`](eas.json) builds a plain `.apk` for direct sideloading. Bump `android.versionCode` in `app.json` for each new build.

## Linear

Team: **THI** (Thijssen Software) — `3b1bf7b2-5ff4-4e70-9ca5-a1efb1280839`

Branch format: `feature/thi-{number}-{description}` or `fix/thi-{number}-{description}`

Follow the full workflow in `~/.claude/CLAUDE.md`. See parent context in `~/Projects/groceries/CLAUDE.md`.
