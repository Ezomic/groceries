<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\PantryItem;
use App\Models\User;

class PantryItemPolicy
{
    public function update(User $user, PantryItem $item): bool
    {
        return $user->id === $item->user_id;
    }

    public function delete(User $user, PantryItem $item): bool
    {
        return $user->id === $item->user_id;
    }
}
