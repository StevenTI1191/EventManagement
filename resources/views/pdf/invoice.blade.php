<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->nomor_invoice }}</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color:#1f2430; }
        .wrap { padding: 28px 34px; }
        .head { border-bottom: 3px solid #FF2D55; padding-bottom: 12px; margin-bottom: 18px; }
        .brand { font-size: 17px; font-weight: bold; color:#14153A; }
        .brand small { display:block; font-size: 9px; font-weight: normal; color:#6b7280; margin-top:2px; }
        .doc { float:right; text-align:right; margin-top:-34px; }
        .doc .title { font-size: 15px; font-weight: bold; color:#FF2D55; letter-spacing:1px; }
        .doc .meta { font-size: 9.5px; color:#6b7280; margin-top:3px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:8px; font-size:9px; font-weight:bold; }
        .lunas { background:#dcfce7; color:#166534; }
        .belum { background:#fee2e2; color:#991b1b; }
        .to { margin-bottom: 16px; }
        .label { font-size: 9px; color:#9ca3af; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }
        .to .nama { font-size: 12.5px; font-weight:bold; }
        .to .sub { font-size: 10px; color:#6b7280; }
        table { width:100%; border-collapse:collapse; }
        .detail td { padding: 5px 0; vertical-align: top; }
        .detail td.k { width: 34%; color:#6b7280; }
        .detail td.v { font-weight:bold; }
        .sec { font-size:11px; font-weight:bold; color:#14153A; margin:16px 0 7px; padding-bottom:4px; border-bottom:1px solid #e6e8ee; }
        .tag th { background:#14153A; color:#fff; font-size:10px; text-align:left; padding:7px 9px; }
        .tag th.r, .tag td.r { text-align:right; }
        .tag td { padding:8px 9px; border-bottom:1px solid #e6e8ee; }
        .total td { background:#FFF0F3; font-weight:bold; font-size:13px; color:#14153A; padding:10px 9px; border:none; }
        .note { margin-top:14px; font-size:10px; color:#4b5563; line-height:1.55; }
        .foot { margin-top:26px; padding-top:10px; border-top:1px solid #e6e8ee; font-size:9px; color:#9ca3af; text-align:center; }
    </style>
</head>
<body>
<div class="wrap">

    <div class="head">
        <div class="brand">
            PT LAKSAMANA MUDA BERSATU
            <small>Event Organizer &amp; Venue — Pekanbaru</small>
        </div>
        <div class="doc">
            <div class="title">INVOICE {{ strtoupper($invoice->tipe) }}</div>
            <div class="meta">
                No. {{ $invoice->nomor_invoice }}<br>
                Terbit: {{ $tglTerbit }}
                @if($tglJatuhTempo)<br>Jatuh tempo: {{ $tglJatuhTempo }}@endif
                <br>
                <span class="badge {{ $invoice->status === 'Lunas' ? 'lunas' : 'belum' }}">{{ strtoupper($invoice->status) }}</span>
            </div>
        </div>
    </div>

    <div class="to">
        <div class="label">Ditagihkan kepada</div>
        <div class="nama">{{ $event->client->perusahaan_client ?? ($event->client->nama_client ?? '—') }}</div>
        @if($event->client)
            <div class="sub">
                {{ $event->client->nama_client }}
                @if($event->client->no_telp_client) &middot; {{ $event->client->no_telp_client }} @endif
            </div>
        @endif
    </div>

    <div class="sec">Acara</div>
    <table class="detail">
        <tr><td class="k">Nama Acara</td><td class="v">{{ $event->nama_event }}</td></tr>
        <tr><td class="k">Tanggal</td><td class="v">{{ $tglAcara }}</td></tr>
        <tr><td class="k">Area / Lokasi</td><td class="v">{{ $event->area_event ?? '—' }}</td></tr>
    </table>

    <div class="sec">Rincian Tagihan</div>
    <table class="tag">
        <tr>
            <th>Keterangan</th>
            <th class="r">Jumlah</th>
        </tr>
        <tr>
            <td>
                {{ $invoice->tipe === 'DP' ? 'Uang muka (DP 50%)' : 'Pelunasan (sisa 50%)' }} — {{ $event->nama_event }}<br>
                <span style="color:#6b7280; font-size:9.5px;">
                    Total nilai acara: Rp {{ number_format($event->deal_harga_event ?? 0, 0, ',', '.') }}
                </span>
            </td>
            <td class="r">Rp {{ number_format($invoice->nominal, 0, ',', '.') }}</td>
        </tr>
        <tr class="total">
            <td>JUMLAH YANG HARUS DIBAYAR</td>
            <td class="r">Rp {{ number_format($invoice->nominal, 0, ',', '.') }}</td>
        </tr>
    </table>

    @if($invoice->keterangan)
        <div class="note"><b>Catatan:</b> {{ $invoice->keterangan }}</div>
    @endif

    <div class="note" style="margin-top:16px;">
        Mohon lakukan pembayaran ke rekening resmi PT Laksamana Muda Bersatu, lalu unggah bukti pembayaran
        melalui akun klien Anda pada sistem agar dapat segera kami verifikasi.
    </div>

    <div class="foot">
        Dokumen ini dibuat otomatis oleh Sistem Manajemen Event — PT Laksamana Muda Bersatu.
    </div>

</div>
</body>
</html>
