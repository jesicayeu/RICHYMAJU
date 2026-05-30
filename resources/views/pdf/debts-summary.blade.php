@php
    $initial = strtoupper(mb_substr($printedBy ?? 'A', 0, 1));
    $statusLabel = fn (?string $status) => match ($status) {
        'sudah_selesai' => 'Selesai',
        'belum_selesai' => 'Belum',
        default => ucfirst(str_replace('_', ' ', $status ?? '-')),
    };
    $shownFrom = $total > 0 ? 1 : 0;
    $shownTo = $total;
@endphp
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Ringkasan Utang</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11px;
            color: #1e293b;
            margin: 0;
            padding: 24px 28px 20px;
            line-height: 1.45;
        }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .header-table td { vertical-align: top; border: none; padding: 0; }
        .brand-cell { width: 55%; }
        .meta-cell { width: 45%; text-align: right; }
        .avatar {
            display: inline-block;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #2563eb;
            color: #fff;
            font-size: 17px;
            font-weight: bold;
            text-align: center;
            line-height: 40px;
            vertical-align: middle;
            margin-right: 10px;
        }
        .brand-name { font-size: 14px; font-weight: bold; color: #1d4ed8; margin: 0; }
        .brand-role { font-size: 10px; color: #64748b; margin: 2px 0 0; }
        .meta-label { font-size: 10px; color: #64748b; margin: 0 0 2px; }
        .meta-value { font-size: 11px; font-weight: bold; color: #0f172a; margin: 0 0 8px; }
        .title-wrap { text-align: center; margin: 8px 0 20px; }
        .doc-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e3a8a;
            margin: 0 0 4px;
            letter-spacing: 0.5px;
        }
        .doc-subtitle { font-size: 11px; color: #64748b; margin: 0; }
        .cards { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin: 0 -6px 16px; }
        .card {
            border: 1px solid #dbeafe;
            border-radius: 10px;
            padding: 12px 8px;
            vertical-align: top;
            width: 20%;
            background: #f8fafc;
        }
        .card-icon {
            display: inline-block;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            text-align: center;
            line-height: 30px;
            font-size: 14px;
            margin-bottom: 6px;
            background: #dbeafe;
            color: #2563eb;
        }
        .card-label { font-size: 9px; color: #64748b; margin-bottom: 4px; }
        .card-value { font-size: 13px; font-weight: bold; color: #1d4ed8; margin: 0; }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #1e3a8a;
            margin: 0 0 8px;
            padding-bottom: 6px;
            border-bottom: 2px solid #3b82f6;
        }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        .data-table thead th {
            background: #dbeafe;
            color: #1e40af;
            font-size: 10px;
            font-weight: bold;
            padding: 9px 8px;
            text-align: left;
            border-bottom: 1px solid #93c5fd;
        }
        .data-table tbody td {
            padding: 8px;
            border-bottom: 1px solid #e2e8f0;
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
        .badge-pending { background: #ffedd5; color: #c2410c; }
        .nominal { font-weight: bold; white-space: nowrap; color: #0f172a; }
        .table-footer { width: 100%; margin-top: 8px; border-collapse: collapse; }
        .table-footer td { border: none; padding: 4px 0; font-size: 9px; color: #64748b; }
        .table-footer .right { text-align: right; }
        .footer-divider { border: none; border-top: 1px solid #e2e8f0; margin: 14px 0 10px; }
        .doc-footer { width: 100%; border-collapse: collapse; }
        .doc-footer td { border: none; padding: 0; font-size: 9px; color: #64748b; vertical-align: top; }
        .doc-footer .note-title { font-weight: bold; color: #475569; }
    </style>
</head>
<body>
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

    <div class="title-wrap">
        <h1 class="doc-title">RINGKASAN UTANG</h1>
        <p class="doc-subtitle">Laporan Ringkasan Data Utang</p>
    </div>

    <table class="cards">
        <tr>
            <td class="card">
                <span class="card-icon">&#128179;</span>
                <div class="card-label">Total Utang</div>
                <p class="card-value">Rp {{ number_format($summary['total'], 0, ',', '.') }}</p>
            </td>
            <td class="card">
                <span class="card-icon">&#10003;</span>
                <div class="card-label">Utang Sudah Lunas</div>
                <p class="card-value">Rp {{ number_format($summary['paid'], 0, ',', '.') }}</p>
            </td>
            <td class="card">
                <span class="card-icon">&#9201;</span>
                <div class="card-label">Utang Belum Lunas</div>
                <p class="card-value">Rp {{ number_format($summary['unpaid'], 0, ',', '.') }}</p>
            </td>
            <td class="card">
                <span class="card-icon">&#9776;</span>
                <div class="card-label">Total Data</div>
                <p class="card-value">{{ number_format($summary['count']) }}</p>
            </td>
            <td class="card">
                <span class="card-icon">&#9787;</span>
                <div class="card-label">Kasir Terlibat</div>
                <p class="card-value">{{ number_format($summary['cashierCount']) }}</p>
            </td>
        </tr>
    </table>

    <p class="section-title">Detail Ringkasan Utang</p>
    <table class="data-table">
        <thead>
            <tr>
                <th>Tanggal &amp; Waktu</th>
                <th>Nama Barang</th>
                <th>Nama Orang</th>
                <th>Kasir</th>
                <th>Status</th>
                <th>Nominal</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($debts as $debt)
                <tr>
                    <td>{{ $debt->occurred_at->locale('id')->translatedFormat('d M Y H:i') }}</td>
                    <td>{{ $debt->item_name }}</td>
                    <td>{{ $debt->party_name }}</td>
                    <td>{{ $debt->user->display_name ?? $debt->user->name ?? '-' }}</td>
                    <td>
                        <span class="badge {{ $debt->status === 'sudah_selesai' ? 'badge-done' : 'badge-pending' }}">
                            {{ $statusLabel($debt->status) }}
                        </span>
                    </td>
                    <td class="nominal">Rp {{ number_format($debt->amount, 0, ',', '.') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" style="text-align: center; padding: 24px; color: #94a3b8;">Belum ada data utang.</td>
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
                        $x = $pdf->get_width() - $width - 28;
                        $y = $pdf->get_height() - 32;
                        $pdf->page_text($x, $y, $text, $font, $size, [0.39, 0.45, 0.55]);
                    }
                </script>
            </td>
        </tr>
    </table>

    <hr class="footer-divider">
    <table class="doc-footer">
        <tr>
            <td>
                <span class="note-title">Catatan:</span>
                Laporan ini dihasilkan secara otomatis oleh sistem.<br>
                <span class="note-title">Dicetak oleh:</span> {{ $printedBy }}
            </td>
        </tr>
    </table>
</body>
</html>
