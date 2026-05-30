@php
    $initial = strtoupper(mb_substr($printedBy ?? 'A', 0, 1));
    $typeLabel = fn (?string $type) => match ($type) {
        'masuk' => 'Masuk',
        'keluar' => 'Keluar',
        default => ucfirst($type ?? '-'),
    };
    $statusLabel = fn (?string $status) => match ($status) {
        'selesai' => 'Selesai',
        'diproses' => 'Diproses',
        default => ucfirst(str_replace('_', ' ', $status ?? '-')),
    };
    $shownFrom = $total > 0 ? 1 : 0;
    $shownTo = $total;
@endphp
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Laporan Stok Barang</title>
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
            font-size: 11px;
            font-weight: bold;
            color: #111827;
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
            vertical-align: middle;
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
        .type-in { color: #166534; font-weight: bold; }
        .type-out { color: #b91c1c; font-weight: bold; }
        .qty { font-weight: bold; white-space: nowrap; }
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
            <h1 class="doc-title">Laporan Stok Barang</h1>
            <p class="doc-subtitle">Ringkasan dan Rincian Pergerakan Stok</p>
        </div>

        <table class="summary-table">
            <thead>
                <tr>
                    <th>Total Jenis Barang</th>
                    <th>Barang Masuk</th>
                    <th>Barang Keluar</th>
                    <th>Total Data</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ number_format($summary['itemTypes']) }}</td>
                    <td>{{ number_format($summary['incoming']) }} transaksi</td>
                    <td>{{ number_format($summary['outgoing']) }} transaksi</td>
                    <td>{{ number_format($summary['count']) }}</td>
                </tr>
            </tbody>
        </table>

        <p class="section-title">Detail Stok Barang</p>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width: 18%;">Tanggal</th>
                    <th style="width: 24%;">Nama Barang</th>
                    <th style="width: 12%;">Jenis</th>
                    <th style="width: 16%;">Jumlah</th>
                    <th style="width: 14%;">Status</th>
                    <th style="width: 16%;">Kasir</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($movements as $movement)
                    <tr>
                        <td>{{ $movement->occurred_at->locale('id')->translatedFormat('d M Y H:i') }}</td>
                        <td>{{ $movement->item_name }}</td>
                        <td>
                            <span class="{{ $movement->type === 'masuk' ? 'type-in' : 'type-out' }}">
                                {{ $typeLabel($movement->type) }}
                            </span>
                        </td>
                        <td class="qty">{{ number_format($movement->quantity, 0, ',', '.') }} {{ $movement->unit }}</td>
                        <td>
                            <span class="status-text {{ $movement->status === 'selesai' ? 'status-done' : 'status-pending' }}">
                                {{ $statusLabel($movement->status) }}
                            </span>
                        </td>
                        <td>{{ $movement->user->display_name ?? $movement->user->name ?? '-' }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 20px; color: #9ca3af;">Tidak ada data stok pada periode ini.</td>
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
