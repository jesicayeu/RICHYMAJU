@php
    $initial = strtoupper(mb_substr($printedBy ?? 'A', 0, 1));
    $uiStatusLabel = fn (?string $status) => match ($status) {
        'selesai' => 'Selesai',
        'belum_selesai' => 'Belum Selesai',
        default => ucfirst(str_replace('_', ' ', $status ?? '-')),
    };
    $typeLabel = fn (?string $type) => match ($type) {
        'pemasukan' => 'Pemasukan',
        'pengeluaran' => 'Pengeluaran',
        default => ucfirst($type ?? '-'),
    };
    $shownFrom = $total > 0 ? 1 : 0;
    $shownTo = $total;
@endphp
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Transaksi</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10.5px;
            color: #1a1a1a;
            margin: 0;
            padding: 22px 26px 18px;
            line-height: 1.5;
        }
        .doc-border-top {
            border-top: 3px solid #1e3a5f;
            margin-bottom: 18px;
            padding-top: 14px;
        }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .header-table td { vertical-align: top; border: none; padding: 0; }
        .brand-cell { width: 58%; }
        .meta-cell { width: 42%; text-align: right; }
        .avatar {
            display: inline-block;
            width: 36px;
            height: 36px;
            border: 2px solid #1e3a5f;
            background: #f8fafc;
            color: #1e3a5f;
            font-size: 15px;
            font-weight: bold;
            text-align: center;
            line-height: 32px;
            vertical-align: middle;
            margin-right: 10px;
        }
        .brand-name { font-size: 13px; font-weight: bold; color: #1e3a5f; margin: 0; }
        .brand-role { font-size: 9.5px; color: #4b5563; margin: 2px 0 0; }
        .meta-label {
            font-size: 9px;
            color: #6b7280;
            margin: 0 0 1px;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }
        .meta-value { font-size: 10.5px; font-weight: bold; color: #111827; margin: 0 0 10px; }
        .title-box {
            text-align: center;
            border: 1px solid #cbd5e1;
            background: #f9fafb;
            padding: 14px 12px;
            margin-bottom: 18px;
        }
        .doc-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e3a5f;
            margin: 0 0 4px;
            letter-spacing: 1.2px;
            text-transform: uppercase;
        }
        .doc-subtitle { font-size: 10px; color: #4b5563; margin: 0; }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .summary-table th,
        .summary-table td {
            border: 1px solid #94a3b8;
            padding: 10px 8px;
            text-align: center;
            vertical-align: middle;
        }
        .summary-table th {
            background: #1e3a5f;
            color: #ffffff;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .summary-table td {
            background: #ffffff;
            font-size: 12px;
            font-weight: bold;
            color: #111827;
        }
        .summary-table .summary-label {
            display: block;
            font-size: 8.5px;
            font-weight: normal;
            color: #6b7280;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }
        .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #1e3a5f;
            margin: 0 0 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding-bottom: 5px;
            border-bottom: 2px solid #1e3a5f;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
            border: 1px solid #94a3b8;
        }
        .data-table thead th {
            background: #1e3a5f;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: bold;
            padding: 8px 7px;
            text-align: center;
            border: 1px solid #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .data-table tbody td {
            padding: 7px;
            border: 1px solid #94a3b8;
            font-size: 9.5px;
            vertical-align: middle;
            text-align: center;
            color: #1f2937;
        }
        .data-table tbody tr:nth-child(even) td { background: #f3f4f6; }
        .status-text { font-weight: bold; color: #374151; }
        .status-done { color: #166534; }
        .status-pending { color: #92400e; }
        .nominal { font-weight: bold; white-space: nowrap; }
        .table-footer { width: 100%; margin-top: 10px; border-collapse: collapse; }
        .table-footer td { border: none; padding: 4px 0; font-size: 9px; color: #6b7280; }
        .table-footer .right { text-align: right; }
        .footer-box {
            border: 1px solid #cbd5e1;
            background: #f9fafb;
            padding: 10px 12px;
            margin-top: 14px;
            font-size: 9px;
            color: #4b5563;
        }
        .footer-box strong { color: #1e3a5f; }
    </style>
</head>
<body>
    <div class="doc-border-top">
        <table class="header-table">
            <tr>
                <td class="brand-cell">
                    <table style="border-collapse: collapse;">
                        <tr>
                            <td style="padding: 0; vertical-align: middle;">
                                <span class="avatar">{{ $initial }}</span>
                            </td>
                            <td style="padding: 0; vertical-align: middle;">
                                <p class="brand-name">{{ $printedBy }}</p>
                                <p class="brand-role">Sistem Manajemen Kasir</p>
                            </td>
                        </tr>
                    </table>
                </td>
                <td class="meta-cell">
                    <p class="meta-label">Tanggal Cetak</p>
                    <p class="meta-value">{{ $printedAt->locale('id')->translatedFormat('d F Y H:i') }}</p>
                    <p class="meta-label">Periode</p>
                    <p class="meta-value">{{ $periodRange }}</p>
                </td>
            </tr>
        </table>

        <div class="title-box">
            <h1 class="doc-title">Laporan Transaksi</h1>
            <p class="doc-subtitle">Ringkasan dan Rincian Data Transaksi</p>
        </div>

        <table class="summary-table">
            <thead>
                <tr>
                    <th>Total Pemasukan</th>
                    <th>Total Pengeluaran</th>
                    <th>Total Transaksi</th>
                    <th>Jumlah Kasir</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Rp {{ number_format($summary['income'], 0, ',', '.') }}</td>
                    <td>Rp {{ number_format($summary['expense'], 0, ',', '.') }}</td>
                    <td>{{ number_format($summary['count']) }}</td>
                    <td>{{ number_format($summary['cashierCount']) }}</td>
                </tr>
            </tbody>
        </table>

        <p class="section-title">Detail Transaksi</p>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 18%;">Tanggal</th>
                    <th style="width: 22%;">Nama Kasir</th>
                    <th style="width: 18%;">Jenis Transaksi</th>
                    <th style="width: 22%;">Nominal</th>
                    <th style="width: 20%;">Status</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($transactions as $transaction)
                    <tr>
                        <td>{{ $transaction->occurred_at->locale('id')->translatedFormat('d M Y H:i') }}</td>
                        <td>{{ $transaction->user->display_name ?? $transaction->user->name ?? '-' }}</td>
                        <td>{{ $typeLabel($transaction->type) }}</td>
                        <td class="nominal">Rp {{ number_format($transaction->amount, 0, ',', '.') }}</td>
                        <td>
                            <span class="status-text {{ $transaction->ui_status === 'selesai' ? 'status-done' : 'status-pending' }}">
                                {{ $uiStatusLabel($transaction->ui_status) }}
                            </span>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">Tidak ada data transaksi pada periode ini.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>

        <table class="table-footer">
            <tr>
                <td>
                    Menampilkan {{ $shownFrom }} sampai {{ $shownTo }} dari {{ number_format($total) }} entri
                </td>
                <td class="right">
                    <script type="text/php">
                        if (isset($pdf)) {
                            $text = 'Halaman {PAGE_NUM} dari {PAGE_COUNT}';
                            $font = $fontMetrics->getFont('DejaVu Sans');
                            $size = 9;
                            $width = $fontMetrics->getTextWidth($text, $font, $size);
                            $x = $pdf->get_width() - $width - 26;
                            $y = $pdf->get_height() - 32;
                            $pdf->page_text($x, $y, $text, $font, $size, [0.42, 0.45, 0.5]);
                        }
                    </script>
                </td>
            </tr>
        </table>

        <div class="footer-box">
            <strong>Catatan:</strong> Laporan ini dihasilkan secara otomatis oleh sistem dan bersifat resmi untuk keperluan arsip internal.<br>
            <strong>Dicetak oleh:</strong> {{ $printedBy }} &nbsp;|&nbsp; <strong>Tanggal:</strong> {{ $printedAt->locale('id')->translatedFormat('d F Y H:i') }}
        </div>
    </div>
</body>
</html>
