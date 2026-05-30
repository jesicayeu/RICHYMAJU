<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class WhatsappActionTemplate extends Model
{
    public const MODULE_ACTIONS = [
        'Transaksi' => [
            'transaksi_tambah' => 'Tambah Transaksi',
            'transaksi_ubah' => 'Ubah Transaksi',
            'transaksi_hapus' => 'Hapus Transaksi',
        ],
        'Stok Barang' => [
            'stok_tambah' => 'Tambah Stok Barang',
            'stok_ubah' => 'Ubah Stok Barang',
            'stok_hapus' => 'Hapus Stok Barang',
        ],
        'Utang' => [
            'utang_tambah' => 'Tambah Utang',
            'utang_ubah' => 'Ubah Utang',
            'utang_hapus' => 'Hapus Utang',
        ],
        'Chat' => [
            'kirim_chat' => 'Kirim Chat',
        ],
    ];

    protected $fillable = [
        'title',
        'action_key',
        'body',
    ];

    public static function buildActionKey(int $userId, string $actionType): string
    {
        return "user_{$userId}_{$actionType}";
    }

    /** @return array{user_id: int, action_type: string}|null */
    public static function parseActionKey(string $actionKey): ?array
    {
        if (! preg_match('/^user_(\d+)_(.+)$/', $actionKey, $matches)) {
            return null;
        }

        return [
            'user_id' => (int) $matches[1],
            'action_type' => $matches[2],
        ];
    }

    /** @param Collection<int, User> $users */
    public static function actionGroupsForUsers(Collection $users): array
    {
        $groups = [];

        foreach (self::MODULE_ACTIONS as $module => $actions) {
            foreach ($users as $user) {
                $accountName = $user->display_name ?: $user->name;
                $groupKey = "{$module} — {$accountName}";
                $groups[$groupKey] = [];

                foreach ($actions as $type => $label) {
                    $groups[$groupKey][self::buildActionKey($user->id, $type)] = $label;
                }
            }
        }

        return $groups;
    }

    /** @param Collection<int, User> $users */
    public static function actionKeysForUsers(Collection $users): array
    {
        $keys = [];

        foreach (self::actionGroupsForUsers($users) as $options) {
            $keys = array_merge($keys, $options);
        }

        return $keys;
    }

    /** @param Collection<int, User> $users */
    public static function resolveActionLabel(string $actionKey, Collection $users): string
    {
        $parsed = self::parseActionKey($actionKey);

        if (! $parsed) {
            return $actionKey;
        }

        $user = $users->firstWhere('id', $parsed['user_id']);
        $accountName = $user ? ($user->display_name ?: $user->name) : 'Akun #'.$parsed['user_id'];

        foreach (self::MODULE_ACTIONS as $module => $actions) {
            if (isset($actions[$parsed['action_type']])) {
                return "{$module} — {$accountName}: {$actions[$parsed['action_type']]}";
            }
        }

        return $actionKey;
    }

    /** @return array<string, string> */
    public static function systemVariables(): array
    {
        return [
            'nama' => 'Nama pengguna (pencatat)',
            'nama_pengirim' => 'Nama pengirim',
            'nama_penerima' => 'Nama penerima',
        ];
    }

    /** @return array<string, string> */
    public static function transactionVariables(): array
    {
        return [
            'jenis' => 'Jenis',
            'jenis_pengeluaran' => 'Jenis Pengeluaran',
            'nominal' => 'Nominal (Rp)',
            'keterangan' => 'Keterangan',
            'pihak' => 'Pihak',
            'barang' => 'Barang',
            'status' => 'Status',
            'gambar' => 'Gambar',
            'pencatat' => 'Pencatat',
            'tanggal' => 'Tanggal',
            'kode' => 'Kode Transaksi',
        ];
    }

    /** @return array<string, string> */
    public static function stockVariables(): array
    {
        return [
            'nama_barang' => 'Nama Barang',
            'jenis' => 'Jenis',
            'jumlah' => 'Jumlah',
            'satuan' => 'Satuan',
            'status' => 'Status',
            'catatan' => 'Catatan',
            'pencatat' => 'Pencatat',
            'tanggal' => 'Tanggal',
            'kode' => 'Kode Stok',
        ];
    }

    /** @return array<string, string> */
    public static function debtVariables(): array
    {
        return [
            'pihak' => 'Pihak',
            'barang' => 'Barang',
            'nominal' => 'Nominal (Rp)',
            'status' => 'Status',
            'jenis_pihak' => 'Jenis Pihak',
            'gambar' => 'Gambar',
            'pencatat' => 'Pencatat',
            'tanggal' => 'Tanggal',
            'kode' => 'Kode Utang',
        ];
    }

    /** @return array<string, string> */
    public static function chatVariables(): array
    {
        return [
            'isi_pesan' => 'Isi Pesan',
            'lampiran' => 'Lampiran',
        ];
    }

    /** @return array<int, string> */
    public static function excludedVariableKeysFor(string $actionType): array
    {
        return match (true) {
            str_starts_with($actionType, 'transaksi_') => [
                'nama',
                'nama_penerima',
                'jenis_pengeluaran',
                'pihak',
                'pencatat',
                'kode',
                'barang',
            ],
            str_starts_with($actionType, 'stok_') => [
                'nama',
                'nama_penerima',
                'pencatat',
                'kode',
            ],
            str_starts_with($actionType, 'utang_') => [
                'nama',
                'nama_penerima',
                'jenis_pihak',
                'pencatat',
                'kode',
            ],
            default => [],
        };
    }

    /** @return array<string, string> */
    public static function variablesForActionType(string $actionType): array
    {
        $moduleVariables = match (true) {
            str_starts_with($actionType, 'transaksi_') => self::transactionVariables(),
            str_starts_with($actionType, 'stok_') => self::stockVariables(),
            str_starts_with($actionType, 'utang_') => self::debtVariables(),
            $actionType === 'kirim_chat' => self::chatVariables(),
            default => [],
        };

        $system = self::systemVariables();
        if ($actionType === 'kirim_chat') {
            unset($system['nama']);
        }

        $variables = array_merge($system, $moduleVariables);

        foreach (self::excludedVariableKeysFor($actionType) as $key) {
            unset($variables[$key]);
        }

        return $variables;
    }

    /** @return array<string, array<string, string>> */
    public static function variablesByActionType(): array
    {
        $map = [];

        foreach (self::MODULE_ACTIONS as $actions) {
            foreach (array_keys($actions) as $actionType) {
                $map[$actionType] = self::variablesForActionType($actionType);
            }
        }

        return $map;
    }

    public function render(array $data = []): string
    {
        $result = $this->body ?? '';

        foreach ($data as $key => $value) {
            $result = str_replace('{'.$key.'}', (string) $value, $result);
        }

        return $result;
    }
}
