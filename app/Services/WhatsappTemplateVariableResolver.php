<?php

namespace App\Services;

use App\Models\Debt;
use App\Models\Message;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WhatsappActionTemplate;
use App\Models\WhatsappTemplateVariable;
use App\Services\EncryptionService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class WhatsappTemplateVariableResolver
{
    public const ALLOWED_TABLES = [
        'transactions' => 'Transaksi',
        'stock_movements' => 'Stok Barang',
        'debts' => 'Utang',
        'messages' => 'Chat',
        'users' => 'Profil',
    ];

    public const SYSTEM_VARIABLES = [
        'nama' => 'Nama pengguna yang sedang login (pengirim)',
        'nama_penerima' => 'Nama penerima: jika kasir → pemilik toko (admin), jika pemilik → kasir',
        'nama_pengirim' => 'Sama dengan {nama} — pengguna yang sedang login',
    ];

    /** @return array<string, string> */
    public function resolve(?User $actor = null, ?User $recipient = null): array
    {
        $actor ??= auth()->user();
        $values = $this->systemVariables($actor, $recipient);

        WhatsappTemplateVariable::query()->each(function (WhatsappTemplateVariable $variable) use (&$values, $actor, $recipient) {
            $resolved = $this->resolveVariable($variable, $actor, $recipient);
            if ($resolved !== null && $resolved !== '') {
                $values[$variable->var_name] = $resolved;
            }
        });

        return $values;
    }

    /** @return array<string, string> */
    protected function systemVariables(?User $actor, ?User $recipient): array
    {
        $counterpart = $recipient ?? $this->resolveCounterpartUser($actor);
        $actorName = $actor?->name ?? $actor?->display_name ?? '';
        $recipientName = $counterpart?->name ?? $counterpart?->display_name ?? '';

        return [
            'nama' => $actorName,
            'nama_pengirim' => $actorName,
            'nama_penerima' => $recipientName,
        ];
    }

    public function resolveVariable(WhatsappTemplateVariable $variable, ?User $actor = null, ?User $recipient = null): ?string
    {
        $actor ??= auth()->user();

        return match ($variable->var_source) {
            'auth' => $this->userColumnValue($actor, $variable->db_column),
            'counterpart' => $this->userColumnValue($recipient ?? $this->resolveCounterpartUser($actor), $variable->db_column),
            'database' => $variable->db_table === 'users'
                ? $this->userColumnValue($actor, $variable->db_column)
                : $this->latestTableValue($variable->db_table, $variable->db_column),
            default => $this->latestTableValue($variable->db_table, $variable->db_column),
        };
    }

    public function resolveCounterpartUser(?User $actor): ?User
    {
        if (! $actor) {
            return null;
        }

        if ($actor->role === 'kasir') {
            return User::query()
                ->where('role', 'admin')
                ->where('status', 'aktif')
                ->orderBy('name')
                ->first();
        }

        if ($actor->role === 'admin') {
            return User::query()
                ->where('role', 'kasir')
                ->where('status', 'aktif')
                ->orderBy('name')
                ->first();
        }

        return null;
    }

    protected function userColumnValue(?User $user, string $column): ?string
    {
        if (! $user || ! in_array($column, $this->columnsForTable('users'), true)) {
            return null;
        }

        $value = $user->{$column};

        return $value !== null ? (string) $value : null;
    }

    protected function latestTableValue(string $table, string $column): ?string
    {
        if (! array_key_exists($table, self::ALLOWED_TABLES)) {
            return null;
        }

        if (! in_array($column, $this->columnsForTable($table), true)) {
            return null;
        }

        $orderColumn = match ($table) {
            'transactions', 'debts', 'stock_movements' => 'occurred_at',
            'messages' => 'created_at',
            'users' => 'updated_at',
            default => 'created_at',
        };

        if (! in_array($orderColumn, $this->columnsForTable($table), true)) {
            $orderColumn = 'id';
        }

        $value = DB::table($table)->orderByDesc($orderColumn)->value($column);

        if ($value === null) {
            return null;
        }

        $decrypted = app(EncryptionService::class)->tryDecryptText((string) $value);

        return $decrypted ?? '';
    }

    /** @return array<int, string> */
    public function columnsForTable(string $table): array
    {
        if ($table === '__auth__' || $table === '__counterpart__') {
            return app(DatabaseSchemaService::class)->columns('users');
        }

        if (! array_key_exists($table, self::ALLOWED_TABLES)) {
            return [];
        }

        return app(DatabaseSchemaService::class)->columns($table);
    }

    /** @return array<int, array{value: string, label: string}> */
    public function tableOptions(): array
    {
        return collect(self::ALLOWED_TABLES)
            ->map(fn ($label, $value) => ['value' => $value, 'label' => $label])
            ->values()
            ->all();
    }

    /** @param array<string, mixed> $extra */
    public function renderFromContext(
        string $body,
        string $actionType,
        ?Model $record = null,
        ?User $actor = null,
        ?User $recipient = null,
        array $extra = [],
    ): string {
        $values = $this->buildContextValues($actionType, $record, $actor, $recipient, $extra);

        return $this->substituteVariables($body, $values);
    }

    /** @param array<string, mixed> $extra */
    public function buildContextValues(
        string $actionType,
        ?Model $record = null,
        ?User $actor = null,
        ?User $recipient = null,
        array $extra = [],
    ): array {
        $actor ??= auth()->user();
        $values = $this->systemVariables($actor, $recipient);

        if (str_starts_with($actionType, 'transaksi_') && $record instanceof Transaction) {
            $values = array_merge($values, $this->transactionValues($record, $actor, $extra));
        } elseif (str_starts_with($actionType, 'stok_') && $record instanceof StockMovement) {
            $values = array_merge($values, $this->stockValues($record, $actor));
        } elseif (str_starts_with($actionType, 'utang_') && $record instanceof Debt) {
            $values = array_merge($values, $this->debtValues($record, $actor));
        } elseif ($actionType === 'kirim_chat' && $record instanceof Message) {
            $values = array_merge($values, $this->chatValues($record, $recipient));
        }

        foreach (WhatsappActionTemplate::excludedVariableKeysFor($actionType) as $key) {
            unset($values[$key]);
        }

        return array_filter($values, fn ($value) => $value !== null && $value !== '');
    }

    /** @param array<string, mixed> $extra */
    protected function transactionValues(Transaction $transaction, ?User $actor, array $extra = []): array
    {
        return [
            'jenis' => $this->labelTransactionType($transaction->type),
            'jenis_pengeluaran' => $this->labelExpenseTarget($extra['expense_target'] ?? null),
            'nominal' => $this->formatMoney($transaction->amount),
            'keterangan' => (string) ($transaction->description ?? ''),
            'pihak' => (string) ($extra['party_name'] ?? ''),
            'barang' => (string) ($extra['item_name'] ?? ''),
            'status' => $this->labelTransactionStatus($transaction->ui_status),
            'gambar' => $this->formatEvidence($transaction->evidence_path),
            'pencatat' => $actor?->display_name ?: $actor?->name ?: '',
            'tanggal' => $this->formatDateTime($transaction->occurred_at),
            'kode' => (string) ($transaction->code ?? ''),
        ];
    }

    protected function stockValues(StockMovement $movement, ?User $actor): array
    {
        return [
            'nama_barang' => (string) ($movement->item_name ?? ''),
            'jenis' => $movement->type === 'masuk' ? 'Masuk' : 'Keluar',
            'jumlah' => (string) ($movement->quantity ?? ''),
            'satuan' => (string) ($movement->unit ?? ''),
            'status' => $movement->status === 'selesai' ? 'Selesai' : 'Diproses',
            'catatan' => (string) ($movement->notes ?? ''),
            'pencatat' => $actor?->display_name ?: $actor?->name ?: '',
            'tanggal' => $this->formatDateTime($movement->occurred_at),
            'kode' => (string) ($movement->code ?? ''),
        ];
    }

    protected function debtValues(Debt $debt, ?User $actor): array
    {
        return [
            'pihak' => (string) ($debt->party_name ?? ''),
            'barang' => (string) ($debt->item_name ?? ''),
            'nominal' => $this->formatMoney($debt->amount),
            'status' => $debt->status === 'sudah_selesai' ? 'Sudah Selesai' : 'Belum Selesai',
            'jenis_pihak' => (string) ($debt->party_type ?? ''),
            'gambar' => $this->formatEvidence($debt->evidence_path),
            'pencatat' => $actor?->display_name ?: $actor?->name ?: '',
            'tanggal' => $this->formatDateTime($debt->occurred_at),
            'kode' => (string) ($debt->code ?? ''),
        ];
    }

    protected function chatValues(Message $message, ?User $recipient): array
    {
        $body = (string) ($message->body ?? '');

        return [
            'isi_pesan' => $body,
            'message' => $body,
            'lampiran' => (string) ($message->attachment_original_name ?? ''),
        ];
    }

    protected function labelTransactionType(?string $type): string
    {
        return match ($type) {
            'pemasukan' => 'Pemasukan',
            'pengeluaran' => 'Pengeluaran',
            default => (string) $type,
        };
    }

    protected function labelExpenseTarget(?string $target): string
    {
        return match ($target) {
            'utang' => 'Utang',
            'toko' => 'Toko',
            default => '',
        };
    }

    protected function labelTransactionStatus(?string $status): string
    {
        return match ($status) {
            'selesai' => 'Selesai',
            'belum_selesai' => 'Belum Selesai',
            default => (string) $status,
        };
    }

    protected function formatMoney(mixed $amount): string
    {
        if ($amount === null || $amount === '') {
            return '';
        }

        return 'Rp '.number_format((int) $amount, 0, ',', '.');
    }

    protected function formatEvidence(?string $path): string
    {
        if (! $path) {
            return '';
        }

        return basename($path);
    }

    protected function formatDateTime(mixed $value): string
    {
        if (! $value) {
            return '';
        }

        return $value instanceof \DateTimeInterface
            ? $value->format('d/m/Y H:i')
            : (string) $value;
    }

    public function renderTemplateBody(string $body, ?User $actor = null, ?User $recipient = null): string
    {
        $values = $this->resolve($actor, $recipient);

        return $this->substituteVariables($body, $values);
    }

    /** @param array<string, string> $values */
    protected function substituteVariables(string $body, array $values): string
    {
        $result = preg_replace_callback(
            '/\{([a-zA-Z0-9_]+)\}/',
            fn (array $m) => trim((string) ($values[$m[1]] ?? '')),
            $body,
        ) ?? $body;

        return $this->cleanupEmptyAssignmentLines($this->cleanupEmptySeparators($result));
    }

    protected function cleanupEmptyAssignmentLines(string $text): string
    {
        $lines = preg_split("/\r\n|\n|\r/", $text) ?: [];
        $lines = array_values(array_filter(
            $lines,
            fn (string $line) => ! preg_match('/^\s*[^=\n]+\s*=\s*\.?\s*$/u', $line),
        ));

        return trim(implode("\n", $lines));
    }

    protected function cleanupEmptySeparators(string $text): string
    {
        // Hapus koma beruntun akibat variabel kosong (,,,)
        $text = preg_replace('/,\s*,+/', ',', $text) ?? $text;
        $text = preg_replace('/,{2,}/', '', $text) ?? $text;
        $text = preg_replace('/^\s*,+\s*|\s*,+\s*$/', '', $text) ?? $text;
        $text = preg_replace('/\s{2,}/', ' ', $text) ?? $text;

        return trim($text);
    }

    public function normalizeTableKey(string $table): array
    {
        return match ($table) {
            '__auth__' => ['var_source' => 'auth', 'db_table' => 'users'],
            '__counterpart__' => ['var_source' => 'counterpart', 'db_table' => 'users'],
            default => ['var_source' => 'database', 'db_table' => $table],
        };
    }
}
