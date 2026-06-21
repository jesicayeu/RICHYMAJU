<?php

namespace App\Services;

use App\Models\Debt;
use App\Models\GoogleDriveSetting;
use App\Models\Product;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\User;
use Google\Service\Sheets;
use Google\Service\Sheets\BatchUpdateSpreadsheetRequest;
use Google\Service\Sheets\ClearValuesRequest;
use Google\Service\Sheets\DeleteTableRequest;
use Google\Service\Sheets\Request as SheetsRequest;
use Google\Service\Sheets\ValueRange;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Throwable;

class GoogleSheetsSyncService
{
    /** @var array<string, true> */
    private array $tablesRemoved = [];

    public function __construct(
        private GoogleDriveService $drive,
        private EncryptionService $encryption,
        private ProductStockService $stockService,
    ) {}

    public function upsert(Model $record): void
    {
        $this->syncModule($this->moduleFor($record));
    }

    public function syncModule(string $module): void
    {
        try {
            $this->performSyncModule($module);
        } catch (Throwable $e) {
            Log::warning('Google Sheets sync gagal.', [
                'action' => 'syncModule',
                'module' => $module,
                'message' => $e->getMessage(),
            ]);
        }
    }

    private function performSyncModule(string $module): void
    {
        if (! $this->drive->isConnected()) {
            Log::info('Google Sheets sync dilewati: Google belum terhubung.', compact('module'));

            return;
        }

        $sheetRef = GoogleDriveSetting::current()->sheetIdFor($module);
        if (! filled($sheetRef)) {
            Log::info('Google Sheets sync dilewati: ID sheet belum dikonfigurasi.', compact('module'));

            return;
        }

        if (! $this->encryption->isReady('text')) {
            Log::info('Google Sheets sync dilewati: kunci enkripsi teks belum dikonfigurasi.', compact('module'));

            return;
        }

        ['spreadsheet_id' => $spreadsheetId, 'gid' => $gid] = $this->parseSheetRef($sheetRef);
        $sheets = new Sheets($this->drive->resolveAuthorizedClient());
        $sheetTitle = $this->resolveSheetTitle($sheets, $spreadsheetId, $gid);

        $this->removeTables($sheets, $spreadsheetId, $sheetTitle);

        [$headers, $rows, $records] = $this->buildModuleSheet($module);
        $encryptedRows = array_map(fn (array $row) => $this->normalizeRow($row), $rows);
        $this->ensureHeaders($sheets, $spreadsheetId, $sheetTitle, $headers);

        $oldRowCount = count(
            $sheets->spreadsheets_values->get($spreadsheetId, "{$sheetTitle}!A:A")->getValues() ?? []
        );

        $sheets->spreadsheets_values->clear(
            $spreadsheetId,
            "{$sheetTitle}!A2:Z",
            new ClearValuesRequest,
        );

        $this->resetSheetRows($module);

        if ($encryptedRows === []) {
            $this->deleteExtraRows($sheets, $spreadsheetId, $gid, 1, $oldRowCount);

            return;
        }

        $lastColumn = $this->columnLetter(count($headers));
        $lastRow = count($encryptedRows) + 1;

        $sheets->spreadsheets_values->update(
            $spreadsheetId,
            "{$sheetTitle}!A2:{$lastColumn}{$lastRow}",
            new ValueRange(['values' => $encryptedRows]),
            ['valueInputOption' => 'USER_ENTERED'],
        );

        foreach ($records as $index => $record) {
            $record->forceFill(['sheet_row' => $index + 2])->saveQuietly();
        }

        $this->deleteExtraRows($sheets, $spreadsheetId, $gid, $lastRow, $oldRowCount);
    }

    public function rebuildModule(string $module): void
    {
        $this->syncModule($module);
    }

    /**
     * @return array{headers: list<string>, rows: list<list<string>>}
     */
    public function previewModule(string $module): array
    {
        [$headers, $rows] = $this->buildModuleSheet($module);

        return [
            'headers' => $headers,
            'rows' => array_map(
                fn (array $row) => array_map(
                    fn ($value) => $value === null || $value === '' ? '' : (string) $value,
                    $row,
                ),
                $rows,
            ),
        ];
    }

    /**
     * @return array{0: list<string>, 1: list<list<string|int|float>>, 2: Collection<int, Model>}
     */
    private function buildModuleSheet(string $module): array
    {
        return match ($module) {
            'sales' => $this->buildSalesSheet(),
            'products' => $this->buildProductsSheet(),
            'transactions' => $this->buildTransactionSheet(),
            'debts' => $this->buildDebtSheet(),
            'stocks' => $this->buildStockSheet(),
            default => [[], [], collect()],
        };
    }

    /**
     * @return array{0: list<string>, 1: list<list<string|int|float>>, 2: Collection<int, Model>}
     */
    private function buildSalesSheet(): array
    {
        $headers = [
            'Kasir',
            'Kode',
            'Total',
            'Status Bayar',
            'Metode Bayar',
            'Detail Barang',
            'Catatan',
            'Waktu',
            'Waktu Lunas',
        ];

        $records = Sale::query()->with(['user', 'items'])->orderBy('id')->get();
        $rows = $records->map(fn (Sale $sale) => [
            $this->userLabel($sale->user),
            $sale->code,
            $this->formatAmount($sale->total_amount),
            $sale->payment_status,
            $sale->payment_method ?? 'tunai',
            $this->formatSaleItems($sale),
            $sale->notes ?? '',
            $this->formatDateTime($sale->occurred_at),
            $this->formatDateTime($sale->paid_at),
        ])->all();

        return [$headers, $rows, $records];
    }

    /**
     * @return array{0: list<string>, 1: list<list<string|int|float>>, 2: Collection<int, Model>}
     */
    private function buildProductsSheet(): array
    {
        $headers = [
            'Barcode',
            'Nama',
            'Satuan',
            'Harga Beli',
            'Harga Jual',
            'Stok',
            'Status',
        ];

        $records = Product::query()->orderBy('name')->get();
        $rows = $records->map(fn (Product $product) => [
            $product->barcode,
            $product->name,
            $product->unit,
            $this->formatAmount($product->buy_price ?? 0),
            $this->formatAmount($product->sell_price),
            (string) $this->stockService->availableStock($product),
            $product->is_active ? 'aktif' : 'nonaktif',
        ])->all();

        return [$headers, $rows, $records];
    }

    /**
     * @return array{0: list<string>, 1: list<list<string|int|float>>, 2: Collection<int, Model>}
     */
    private function buildTransactionSheet(): array
    {
        $headers = [
            'Kasir',
            'Jenis',
            'Nominal',
            'Keterangan',
            'Status',
            'Verifikasi',
            'Waktu',
            'Link Bukti',
        ];

        $records = Transaction::query()->with('user')->orderBy('id')->get();
        $rows = $records->map(fn (Transaction $transaction) => [
            $this->userLabel($transaction->user),
            $transaction->type,
            $this->formatAmount($transaction->amount),
            $transaction->description,
            $transaction->ui_status,
            $transaction->verification_status ?? 'menunggu',
            $this->formatDateTime($transaction->occurred_at),
            $this->evidenceLink($transaction->evidence_path),
        ])->all();

        return [$headers, $rows, $records];
    }

    /**
     * @return array{0: list<string>, 1: list<list<string|int|float>>, 2: Collection<int, Model>}
     */
    private function buildDebtSheet(): array
    {
        $headers = [
            'Kasir',
            'Pihak',
            'Barang',
            'Nominal',
            'Status',
            'Waktu',
            'Link Bukti',
        ];

        $records = Debt::query()->with('user')->orderBy('id')->get();
        $rows = $records->map(fn (Debt $debt) => [
            $this->userLabel($debt->user),
            $debt->party_name,
            $debt->item_name,
            $this->formatAmount($debt->amount),
            $debt->status,
            $this->formatDateTime($debt->occurred_at),
            $this->evidenceLink($debt->evidence_path),
        ])->all();

        return [$headers, $rows, $records];
    }

    /**
     * @return array{0: list<string>, 1: list<list<string|int|float>>, 2: Collection<int, Model>}
     */
    private function buildStockSheet(): array
    {
        $headers = [
            'Kasir',
            'Barang',
            'Jenis',
            'Jumlah',
            'Satuan',
            'Status',
            'Catatan',
            'Waktu',
        ];

        $records = StockMovement::query()->with('user')->orderBy('id')->get();
        $rows = $records->map(fn (StockMovement $movement) => [
            $this->userLabel($movement->user),
            $movement->item_name,
            $movement->type,
            (string) $movement->quantity,
            $movement->unit,
            $movement->status,
            $movement->notes ?? '',
            $this->formatDateTime($movement->occurred_at),
        ])->all();

        return [$headers, $rows, $records];
    }

    private function moduleFor(Model $record): string
    {
        return match (true) {
            $record instanceof Sale => 'sales',
            $record instanceof Product => 'products',
            $record instanceof Transaction => 'transactions',
            $record instanceof Debt => 'debts',
            $record instanceof StockMovement => 'stocks',
            default => throw new \InvalidArgumentException('Modul sheet tidak dikenali.'),
        };
    }

    private function resetSheetRows(string $module): void
    {
        match ($module) {
            'sales' => Sale::query()->update(['sheet_row' => null]),
            'products' => Product::query()->update(['sheet_row' => null]),
            'transactions' => Transaction::query()->update(['sheet_row' => null]),
            'debts' => Debt::query()->update(['sheet_row' => null]),
            'stocks' => StockMovement::query()->update(['sheet_row' => null]),
            default => null,
        };
    }

    private function deleteExtraRows(
        Sheets $sheets,
        string $spreadsheetId,
        int $gid,
        int $lastDataRow,
        int $oldRowCount,
    ): void {
        if ($oldRowCount <= $lastDataRow) {
            return;
        }

        $sheets->spreadsheets->batchUpdate($spreadsheetId, new BatchUpdateSpreadsheetRequest([
            'requests' => [
                new SheetsRequest([
                    'deleteDimension' => [
                        'range' => [
                            'sheetId' => $gid,
                            'dimension' => 'ROWS',
                            'startIndex' => $lastDataRow,
                            'endIndex' => $oldRowCount,
                        ],
                    ],
                ]),
            ],
        ]));
    }

    /**
     * @return array{spreadsheet_id: string, gid: int}
     */
    private function parseSheetRef(string $ref): array
    {
        $ref = trim($ref);

        if (preg_match('#docs\.google\.com/spreadsheets/d/([a-zA-Z0-9_-]+)#', $ref, $matches)) {
            $spreadsheetId = $matches[1];
        } elseif (preg_match('#^([a-zA-Z0-9_-]+)(?:/|$)#', $ref, $matches)) {
            $spreadsheetId = $matches[1];
        } else {
            $spreadsheetId = $ref;
        }

        $gid = 0;
        if (preg_match('/[?#&]gid=(\d+)/', $ref, $matches)) {
            $gid = (int) $matches[1];
        }

        return [
            'spreadsheet_id' => $spreadsheetId,
            'gid' => $gid,
        ];
    }

    private function resolveSheetTitle(Sheets $sheets, string $spreadsheetId, int $gid): string
    {
        $spreadsheet = $sheets->spreadsheets->get($spreadsheetId, ['fields' => 'sheets.properties']);
        $sheetList = $spreadsheet->getSheets() ?? [];

        foreach ($sheetList as $sheet) {
            if ((int) $sheet->getProperties()->getSheetId() === $gid) {
                return $sheet->getProperties()->getTitle();
            }
        }

        return $sheetList[0]?->getProperties()?->getTitle() ?? 'Sheet1';
    }

    /**
     * @param  list<string>  $headers
     */
    private function ensureHeaders(Sheets $sheets, string $spreadsheetId, string $sheetTitle, array $headers): void
    {
        $lastColumn = $this->columnLetter(count($headers));
        $range = "{$sheetTitle}!A1:{$lastColumn}1";

        $sheets->spreadsheets_values->clear(
            $spreadsheetId,
            "{$sheetTitle}!A1:Z1",
            new ClearValuesRequest,
        );

        $sheets->spreadsheets_values->update(
            $spreadsheetId,
            $range,
            new ValueRange(['values' => [$headers]]),
            ['valueInputOption' => 'RAW'],
        );
    }

    private function removeTables(Sheets $sheets, string $spreadsheetId, string $sheetTitle): void
    {
        if (isset($this->tablesRemoved[$sheetTitle])) {
            return;
        }

        $spreadsheet = $sheets->spreadsheets->get($spreadsheetId, [
            'fields' => 'sheets(properties.title,tables(tableId))',
        ]);

        $requests = [];

        foreach ($spreadsheet->getSheets() ?? [] as $sheet) {
            if ($sheet->getProperties()->getTitle() !== $sheetTitle) {
                continue;
            }

            foreach ($sheet->getTables() ?? [] as $table) {
                if ($table->getTableId()) {
                    $requests[] = new SheetsRequest([
                        'deleteTable' => new DeleteTableRequest([
                            'tableId' => $table->getTableId(),
                        ]),
                    ]);
                }
            }
        }

        if ($requests !== []) {
            $sheets->spreadsheets->batchUpdate($spreadsheetId, new BatchUpdateSpreadsheetRequest([
                'requests' => $requests,
            ]));
        }

        $this->tablesRemoved[$sheetTitle] = true;
    }

    private function columnLetter(int $columnCount): string
    {
        $letter = '';
        $number = max(1, $columnCount);

        while ($number > 0) {
            $number--;
            $letter = chr(65 + ($number % 26)).$letter;
            $number = intdiv($number, 26);
        }

        return $letter;
    }

    private function userLabel(?User $user): string
    {
        if (! $user) {
            return '-';
        }

        return $user->display_name ?: $user->name ?: $user->username ?: '-';
    }

    private function formatAmount(int|string|null $amount): int
    {
        return (int) $amount;
    }

    private function formatDateTime(mixed $value): string
    {
        if (! $value) {
            return '-';
        }

        return $value->timezone('Asia/Jakarta')->format('d/m/Y H:i');
    }

    private function formatSaleItems(Sale $sale): string
    {
        return $sale->items
            ->map(function ($item) {
                $qty = rtrim(rtrim(number_format((float) $item->quantity, 2, '.', ''), '0'), '.');
                $price = number_format((int) $item->price, 0, ',', '.');
                $subtotal = number_format((int) $item->subtotal, 0, ',', '.');

                return "{$item->item_name} ({$qty} {$item->unit} @ Rp{$price}) = Rp{$subtotal}";
            })
            ->implode('; ');
    }

    private function evidenceLink(?string $path): string
    {
        if (! $path) {
            return '';
        }

        return route('media.show', ['t' => encrypt($path)], absolute: true);
    }

    /**
     * @param  list<string|int|float|null>  $row
     * @return list<string>
     */
    private function normalizeRow(array $row): array
    {
        return array_map(
            fn ($value) => $this->encryptSheetValue($value),
            array_values($row),
        );
    }

    private function encryptSheetValue(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $plaintext = is_int($value) || is_float($value)
            ? (string) $value
            : (string) $value;

        return $this->encryption->encryptText($plaintext);
    }
}
