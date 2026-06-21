@php
    $initial = strtoupper(mb_substr($printedBy ?? 'A', 0, 1));
    $totalIncome = $stats['totalIncomeToday'] ?? ($stats['incomeToday'] + $stats['salesToday']);
    $profit = $stats['profitToday'] ?? ($totalIncome - $stats['expenseToday']);
    $isProfit = $profit >= 0;
    $moduleCards = collect([
        [
            'show' => $hasPenjualanModule,
            'title' => 'Penjualan',
            'rows' => [
                ['label' => 'Total', 'value' => 'Rp '.number_format($summary['penjualan']['total'], 0, ',', '.')],
                ['label' => 'Hari ini', 'value' => 'Rp '.number_format($summary['penjualan']['today'], 0, ',', '.')],
                ['label' => 'Jumlah', 'value' => number_format($summary['penjualan']['count']).' transaksi'],
            ],
        ],
        [
            'show' => $hasTransaksiModule,
            'title' => 'Transaksi',
            'rows' => [
                ['label' => 'Pemasukan', 'value' => 'Rp '.number_format($summary['transaksi']['pemasukan'], 0, ',', '.')],
                ['label' => 'Pengeluaran', 'value' => 'Rp '.number_format($summary['transaksi']['pengeluaran'], 0, ',', '.')],
                ['label' => 'Total data', 'value' => number_format($summary['transaksi']['count'])],
            ],
        ],
        [
            'show' => $hasStokModule,
            'title' => 'Stok Barang',
            'rows' => [
                ['label' => 'Barang masuk', 'value' => number_format($summary['stok']['masuk'])],
                ['label' => 'Barang keluar', 'value' => number_format($summary['stok']['keluar'])],
                ['label' => 'Produk aktif', 'value' => number_format($summary['stok']['produk_aktif'])],
            ],
        ],
        [
            'show' => $hasUtangModule,
            'title' => 'Utang',
            'rows' => [
                ['label' => 'Belum selesai', 'value' => 'Rp '.number_format($summary['utang']['belum_selesai'], 0, ',', '.')],
                ['label' => 'Sudah selesai', 'value' => 'Rp '.number_format($summary['utang']['sudah_selesai'], 0, ',', '.')],
                ['label' => 'Total data', 'value' => number_format($summary['utang']['count'])],
            ],
        ],
    ])->filter(fn ($module) => $module['show'])->values();
@endphp
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Dashboard Terpusat</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #1e293b;
            margin: 0;
            padding: 28px 32px 24px;
            line-height: 1.4;
        }
        h1 { font-size: 22px; font-weight: bold; margin: 0 0 4px; color: #0f172a; }
        .period { color: #2563eb; font-size: 12px; font-weight: bold; margin-bottom: 0; }
        .header-table { width: 100%; margin-bottom: 18px; border-collapse: collapse; }
        .header-table td { vertical-align: top; border: none; padding: 0; }
        .profile-wrap { text-align: right; }
        .avatar {
            display: inline-block;
            width: 36px; height: 36px; border-radius: 50%;
            background: #2563eb; color: #fff; font-size: 16px; font-weight: bold;
            text-align: center; line-height: 36px; vertical-align: middle; margin-right: 10px;
        }
        .profile-name { font-size: 13px; font-weight: bold; color: #1d4ed8; margin: 0; }
        .profile-role { font-size: 10px; color: #64748b; margin: 2px 0 0; }
        .divider { border: none; border-top: 1px solid #e2e8f0; margin: 0 0 18px; }
        .finance-grid { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 0 -8px 18px; }
        .finance-card {
            border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 10px;
            vertical-align: top; width: 25%;
        }
        .finance-label { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; margin: 0 0 4px; }
        .finance-value { font-size: 13px; font-weight: bold; color: #0f172a; margin: 0; }
        .finance-note { font-size: 9px; color: #94a3b8; margin: 4px 0 0; }
        .module-grid { width: 100%; border-collapse: separate; border-spacing: 10px 0; margin: 0 -10px 18px; }
        .module-card {
            border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 12px;
            vertical-align: top;
        }
        .module-title { font-size: 11px; font-weight: bold; color: #0f172a; margin: 0 0 8px; }
        .module-row { font-size: 10px; color: #64748b; margin: 3px 0; }
        .module-value { font-weight: bold; color: #1e293b; }
        .section-title { font-size: 14px; font-weight: bold; color: #0f172a; margin: 18px 0 10px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .data-table thead th {
            background: #1e40af; color: #fff; font-size: 10px; font-weight: bold;
            padding: 8px 6px; text-align: left;
        }
        .data-table tbody td {
            padding: 7px 6px; border-bottom: 1px solid #f1f5f9; font-size: 10px; vertical-align: middle;
        }
        .data-table tbody tr:nth-child(even) td { background: #f8fafc; }
        .nominal { font-weight: bold; white-space: nowrap; }
        .badge {
            display: inline-block; padding: 2px 8px; border-radius: 999px;
            font-size: 9px; font-weight: bold; background: #dbeafe; color: #1d4ed8;
        }
        .doc-footer { width: 100%; margin-top: 22px; border-collapse: collapse; }
        .doc-footer td { border: none; padding: 0; font-size: 9px; color: #94a3b8; vertical-align: top; }
        .doc-footer .right { text-align: right; }
        .footer-divider { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0 10px; }
    </style>
</head>
<body>
    <table class="header-table">
        <tr>
            <td>
                <h1>Laporan Dashboard Terpusat</h1>
                <p class="period">{{ $periodLabel }}</p>
            </td>
            <td class="profile-wrap">
                <table style="border-collapse:collapse; margin-left:auto;">
                    <tr>
                        <td style="padding:0; vertical-align:middle;">
                            <span class="avatar">{{ $initial }}</span>
                        </td>
                        <td style="padding:0; vertical-align:middle;">
                            <p class="profile-name">{{ $printedBy }}</p>
                            <p class="profile-role">Sistem Manajemen Kasir</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    <hr class="divider">

    <p class="section-title" style="margin-top:0;">Rincian Keuangan Hari Ini</p>
    <table class="finance-grid">
        <tr>
            <td class="finance-card">
                <p class="finance-label">Pemasukan</p>
                <p class="finance-value">Rp {{ number_format($stats['incomeToday'], 0, ',', '.') }}</p>
            </td>
            <td class="finance-card">
                <p class="finance-label">Pengeluaran</p>
                <p class="finance-value">Rp {{ number_format($stats['expenseToday'], 0, ',', '.') }}</p>
            </td>
            <td class="finance-card">
                <p class="finance-label">Penjualan POS</p>
                <p class="finance-value">Rp {{ number_format($stats['salesToday'], 0, ',', '.') }}</p>
            </td>
            <td class="finance-card">
                <p class="finance-label">{{ $isProfit ? 'Laba Hari Ini' : 'Kerugian Hari Ini' }}</p>
                <p class="finance-value">Rp {{ number_format(abs($profit), 0, ',', '.') }}</p>
                <p class="finance-note">Total pemasukan Rp {{ number_format($totalIncome, 0, ',', '.') }}</p>
            </td>
        </tr>
    </table>

    @if ($moduleCards->isNotEmpty())
        <p class="section-title">Ringkasan Modul</p>
        <table class="module-grid">
            <tr>
                @foreach ($moduleCards as $module)
                    <td class="module-card" style="width: {{ round(100 / $moduleCards->count(), 2) }}%;">
                        <p class="module-title">{{ $module['title'] }}</p>
                        @foreach ($module['rows'] as $row)
                            <p class="module-row">{{ $row['label'] }}: <span class="module-value">{{ $row['value'] }}</span></p>
                        @endforeach
                    </td>
                @endforeach
            </tr>
        </table>
    @endif

    @if ($recentSales->isNotEmpty())
        <p class="section-title">Penjualan Terbaru</p>
        <table class="data-table">
            <thead>
                <tr>
                    @if($isAdmin)<th>Kasir</th>@endif
                    <th>Total</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($recentSales as $sale)
                    <tr>
                        @if($isAdmin)<td>{{ $sale->user->name ?? '-' }}</td>@endif
                        <td class="nominal">Rp {{ number_format($sale->total_amount, 0, ',', '.') }}</td>
                        <td><span class="badge">{{ $sale->payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}</span></td>
                        <td>{{ $sale->occurred_at->locale('id')->translatedFormat('d M Y H:i') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    @if ($recentTransactions->isNotEmpty())
        <p class="section-title">Transaksi Terbaru</p>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Tanggal</th>
                    @if($isAdmin)<th>Kasir</th>@endif
                    <th>Jenis</th>
                    <th>Nominal</th>
                    <th>Keterangan</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($recentTransactions as $transaction)
                    <tr>
                        <td>{{ $transaction->occurred_at->locale('id')->translatedFormat('d M Y H:i') }}</td>
                        @if($isAdmin)<td>{{ $transaction->user->name ?? '-' }}</td>@endif
                        <td>{{ $transaction->type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran' }}</td>
                        <td class="nominal">Rp {{ number_format($transaction->amount, 0, ',', '.') }}</td>
                        <td>{{ $transaction->description }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    @if ($recentStocks->isNotEmpty())
        <p class="section-title">Stok Terbaru</p>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Barang</th>
                    <th>Jenis</th>
                    <th>Jumlah</th>
                    <th>Tanggal</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($recentStocks as $stock)
                    <tr>
                        <td>{{ $stock->item_name }}</td>
                        <td>{{ $stock->type === 'masuk' ? 'Masuk' : 'Keluar' }}</td>
                        <td>{{ number_format($stock->quantity, 2, ',', '.') }} {{ $stock->unit }}</td>
                        <td>{{ $stock->occurred_at->locale('id')->translatedFormat('d M Y H:i') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    @if ($recentDebts->isNotEmpty())
        <p class="section-title">Utang Terbaru</p>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Pihak</th>
                    <th>Nominal</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($recentDebts as $debt)
                    <tr>
                        <td>{{ $debt->party_name }}</td>
                        <td class="nominal">Rp {{ number_format($debt->amount, 0, ',', '.') }}</td>
                        <td>{{ $debt->status === 'sudah_selesai' ? 'Selesai' : 'Belum Selesai' }}</td>
                        <td>{{ $debt->occurred_at->locale('id')->translatedFormat('d M Y H:i') }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <hr class="footer-divider">
    <table class="doc-footer">
        <tr>
            <td>
                Dicetak pada: {{ now()->locale('id')->translatedFormat('d F Y H:i') }}<br>
                Dicetak oleh: {{ $printedBy }}
            </td>
            <td class="right">Laporan Terpusat — Keuangan · Penjualan · Transaksi · Stok · Utang</td>
        </tr>
    </table>
</body>
</html>
