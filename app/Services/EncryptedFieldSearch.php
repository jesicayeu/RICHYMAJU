<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class EncryptedFieldSearch
{
    /**
     * @param  Builder<Model>  $query
     * @param  list<string>  $attributes
     * @return list<int>
     */
    public static function matchingIds(Builder $query, string $term, array $attributes): array
    {
        $needle = mb_strtolower(trim($term));

        if ($needle === '') {
            return [];
        }

        return (clone $query)
            ->get()
            ->filter(function (Model $model) use ($attributes, $needle) {
                foreach ($attributes as $attribute) {
                    $value = mb_strtolower((string) ($model->{$attribute} ?? ''));

                    if ($value !== '' && str_contains($value, $needle)) {
                        return true;
                    }
                }

                return false;
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @param  list<string>  $attributes
     */
    public static function matchesTerm(Model $model, string $term, array $attributes): bool
    {
        $needle = mb_strtolower(trim($term));

        if ($needle === '') {
            return true;
        }

        foreach ($attributes as $attribute) {
            $value = mb_strtolower((string) ($model->{$attribute} ?? ''));

            if ($value !== '' && str_contains($value, $needle)) {
                return true;
            }
        }

        return false;
    }
}
