@php
    $initial = strtoupper(mb_substr($printedBy ?? 'A', 0, 1));
    $uiStatusLabel = fn (?string $status) => match ($status) {
        'selesai' => 'Selesai',
        'belum_selesai' => 'Belum',
        default => ucfirst(str_replace('_', ' ', $status ?? '-')),
    };
    $typeLabel = fn (?string $type) => match ($type) {
        'pemasukan' => 'Pemasukan',
        'pengeluaran' => 'Pengeluaran',
        default => ucfirst($type ?? '-'),
    };
@endphp
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Ringkasan Transaksi</title>
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
        h1 {
            font-size: 22px;
            font-weight: bold;
            margin: 0 0 4px;
            color: #0f172a;
        }
        .period {
            color: #2563eb;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 0;
        }
        .header-table { width: 100%; margin-bottom: 18px; border-collapse: collapse; }
        .header-table td { vertical-align: top; border: none; padding: 0; }
        .profile-wrap { text-align: right; }
        .profile-inner { display: inline-block; text-align: left; }
        .avatar {
            display: inline-block;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #2563eb;
            color: #fff;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            line-height: 36px;
            vertical-align: middle;
            margin-right: 10px;
        }
        .profile-name { font-size: 13px; font-weight: bold; color: #1d4ed8; margin: 0; }
        .profile-role { font-size: 10px; color: #64748b; margin: 2px 0 0; }
        .divider { border: none; border-top: 1px solid #e2e8f0; margin: 0 0 18px; }
        .cards { width: 100%; border-collapse: separate; border-spacing: 10px 0; margin: 0 -10px 18px; }
        .card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 14px 12px;
            vertical-align: top;
            width: 25%;
        }
        .card-label { font-size: 10px; color: #64748b; margin-bottom: 6px; }
        .card-value { font-size: 15px; font-weight: bold; margin: 0; }
        .card-icon {
            display: inline-block;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            text-align: center;
            line-height: 28px;
            font-size: 13px;
            margin-bottom: 8px;
        }
        .icon-green { background: #d1fae5; color: #059669; }
        .icon-red { background: #ffe4e6; color: #e11d48; }
        .icon-blue { background: #dbeafe; color: #2563eb; }
        .icon-orange { background: #ffedd5; color: #ea580c; }
        .val-green { color: #059669; }
        .val-red { color: #e11d48; }
        .val-blue { color: #2563eb; }
        .val-orange { color: #ea580c; }
        .section-title { font-size: 14px; font-weight: bold; color: #0f172a; margin: 18px 0 10px; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        .data-table thead th {
            background: #1e40af;
            color: #fff;
            font-size: 10px;
            font-weight: bold;
            padding: 10px 8px;
            text-align: left;
        }
        .data-table thead th:first-child { border-radius: 8px 0 0 0; }
        .data-table thead th:last-child { border-radius: 0 8px 0 0; }
        .data-table tbody td {
            padding: 9px 8px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 10px;
            vertical-align: middle;
        }
        .data-table tbody tr:nth-child(even) td { background: #f8fafc; }
        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: bold;
        }
        .badge-done { background: #d1fae5; color: #047857; }
        .badge-pending { background: #fef3c7; color: #b45309; }
        .nominal { font-weight: bold; white-space: nowrap; }
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
                <h1>Laporan Ringkasan Transaksi</h1>
                <p class="period">Periode: {{ $periodLabel }}</p>
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
    <table class="cards">
        <tr>
            <td class="card">
                <span class="card-icon icon-green">&#8593;</span>
                <div class="card-label">Total Pemasukan</div>
                <p class="card-value val-green">Rp {{ number_format($summary['income'], 0, ',', '.') }}</p>
            </td>
            <td class="card">
                <span class="card-icon icon-red">&#8595;</span>
                <div class="card-label">Total Pengeluaran</div>
                <p class="card-value val-red">Rp {{ number_format($summary['expense'], 0, ',', '.') }}</p>
            </td>
            <td class="card">
                <span class="card-icon icon-blue">&#9776;</span>
                <div class="card-label">Total Transaksi</div>
                <p class="card-value val-blue">{{ number_format($summary['count']) }}</p>
            </td>
            <td class="card">
                <span class="card-icon icon-orange">&#9787;</span>
                <div class="card-label">Jumlah Kasir</div>
                <p class="card-value val-orange">{{ number_format($summary['cashierCount']) }}</p>
            </td>
        </tr>
    </table>
    <p class="section-title">Detail Transaksi</p>
    <table class="data-table">
        <thead>
            <tr>
                <th>Tanggal</th>
                <th>Nama Kasir</th>
                <th>Jenis Transaksi</th>
                <th>Nominal</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($transactions as $transaction)
                <tr>
                    <td>{{ $transaction->occurred_at->locale('id')->translatedFormat('d M Y H:i') }}</td>
                    <td>{{ $transaction->user->name ?? '-' }}</td>
                    <td>{{ $typeLabel($transaction->type) }}</td>
                    <td class="nominal">Rp {{ number_format($transaction->amount, 0, ',', '.') }}</td>
                    <td>
                        <span class="badge {{ $transaction->ui_status === 'selesai' ? 'badge-done' : 'badge-pending' }}">
                            {{ $uiStatusLabel($transaction->ui_status) }}
                        </span>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align:center; padding:24px; color:#94a3b8;">Belum ada data transaksi.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
    <hr class="footer-divider">
    <table class="doc-footer">
        <tr>
            <td>
                Dicetak pada: {{ now()->locale('id')->translatedFormat('d F Y H:i') }}<br>
                Dicetak oleh: {{ $printedBy }}
            </td>
            <td class="right">Halaman 1 dari 1</td>
        </tr>
    </table>
</body>
</html>
