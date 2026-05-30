<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DatabaseSchemaService
{
    /** @return array<int, string> */
    public function tables(): array
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            $rows = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");

            return array_map(fn ($r) => $r->name, $rows);
        }

        $database = Schema::getConnection()->getDatabaseName();
        $rows = DB::select(
            'SELECT TABLE_NAME as name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
            [$database]
        );

        return array_map(fn ($r) => $r->name, $rows);
    }

    /** @return array<int, string> */
    public function columns(string $table): array
    {
        if (! in_array($table, $this->tables(), true)) {
            return [];
        }

        return Schema::getColumnListing($table);
    }

    /** @return array<int, array{id: string, label: string}> */
    public function sampleRows(string $table, int $limit = 50): array
    {
        if (! in_array($table, $this->tables(), true)) {
            return [];
        }

        $columns = $this->columns($table);
        if ($columns === []) {
            return [];
        }

        $labelColumn = collect(['name', 'nama', 'title', 'label', 'username'])
            ->first(fn ($c) => in_array($c, $columns, true)) ?? $columns[0];

        $idColumn = in_array('id', $columns, true) ? 'id' : $columns[0];

        return DB::table($table)
            ->select([$idColumn, $labelColumn])
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'id' => (string) ($row->{$idColumn} ?? ''),
                'label' => (string) ($row->{$labelColumn} ?? $row->{$idColumn} ?? ''),
            ])
            ->all();
    }
}
