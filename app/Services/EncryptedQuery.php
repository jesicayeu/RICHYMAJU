<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;

class EncryptedQuery
{
    /** @var list<string> */
    private const ENCRYPTED_SORT_FIELDS = [
        'code',
        'type',
        'amount',
        'ui_status',
        'verification_status',
        'status',
        'party_type',
        'quantity',
        'unit',
        'item_name',
        'party_name',
        'description',
    ];

    /**
     * @param  Builder<Model>  $query
     */
    public static function applyExactFilter(Builder $query, string $attribute, mixed $value): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $ids = self::matchingIdsExact($query, $attribute, $value);
        $query->whereIn('id', $ids !== [] ? $ids : [-1]);
    }

    /**
     * @param  Builder<Model>  $query
     * @return list<int>
     */
    public static function matchingIdsExact(Builder $query, string $attribute, mixed $expected): array
    {
        $needle = (string) $expected;

        return (clone $query)
            ->get()
            ->filter(fn (Model $model) => (string) ($model->{$attribute} ?? '') === $needle)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @param  Builder<Model>  $query
     */
    public static function sum(Builder $query, string $attribute, ?callable $filter = null): int|float
    {
        $collection = (clone $query)->get();

        if ($filter !== null) {
            $collection = $collection->filter($filter);
        }

        return $collection->sum($attribute);
    }

    /**
     * @param  Builder<Model>  $query
     */
    public static function countWhere(Builder $query, string $attribute, mixed $value): int
    {
        return (clone $query)
            ->get()
            ->filter(fn (Model $model) => (string) ($model->{$attribute} ?? '') === (string) $value)
            ->count();
    }

    /**
     * @param  Builder<Model>  $query
     */
    public static function paginate(
        Builder $query,
        int $perPage,
        string $sort = 'occurred_at',
        string $direction = 'desc',
    ): LengthAwarePaginator {
        if (! in_array($sort, self::ENCRYPTED_SORT_FIELDS, true)) {
            return $query->orderBy($sort, $direction)->paginate($perPage)->withQueryString();
        }

        $items = $query->get();
        $sorted = $direction === 'asc'
            ? $items->sortBy($sort, SORT_NATURAL)->values()
            : $items->sortByDesc($sort, SORT_NATURAL)->values();

        $page = max(1, (int) request()->query('page', 1));
        $total = $sorted->count();
        $slice = $sorted->slice(($page - 1) * $perPage, $perPage)->values();

        return (new LengthAwarePaginator(
            $slice,
            $total,
            $perPage,
            $page,
            ['path' => request()->url(), 'query' => request()->query()],
        ))->withQueryString();
    }
}
