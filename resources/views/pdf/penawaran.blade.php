<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Penawaran — {{ $event->nama_event }}</title>
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
        .to { margin-bottom: 16px; }
        .label { font-size: 9px; color:#9ca3af; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }
        .to .nama { font-size: 12.5px; font-weight:bold; }
        .to .sub { font-size: 10px; color:#6b7280; }
        table { width:100%; border-collapse:collapse; }
        .detail td { padding: 5px 0; vertical-align: top; }
        .detail td.k { width: 34%; color:#6b7280; }
        .detail td.v { font-weight:bold; }
        .sec { font-size:11px; font-weight:bold; color:#14153A; margin:16px 0 7px; padding-bottom:4px; border-bottom:1px solid #e6e8ee; }
        .biaya th { background:#14153A; color:#fff; font-size:10px; text-align:left; padding:7px 9px; }
        .biaya th.r, .biaya td.r { text-align:right; }
        .biaya td { padding:8px 9px; border-bottom:1px solid #e6e8ee; }
        .total td { background:#FFF0F3; font-weight:bold; font-size:12px; color:#14153A; padding:9px; border:none; }
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
            <div class="title">PENAWARAN</div>
            <div class="meta">
                No. {{ $nomor }}<br>
                Tanggal: {{ $tanggal }}
            </div>
        </div>
    </div>

    <div class="to">
        <div class="label">Kepada Yth.</div>
        <div class="nama">{{ $event->client->perusahaan_client ?? ($event->client->nama_client ?? '—') }}</div>
        @if($event->client)
            <div class="sub">
                {{ $event->client->nama_client }}
                @if($event->client->no_telp_client) &middot; {{ $event->client->no_telp_client }} @endif
            </div>
        @endif
    </div>

    <div class="sec">Detail Acara</div>
    <table class="detail">
        <tr><td class="k">Nama Acara</td><td class="v">{{ $event->nama_event }}</td></tr>
        @if($event->kategori_event)
            <tr><td class="k">Kategori</td><td class="v">{{ $event->kategori_event }}</td></tr>
        @endif
        <tr><td class="k">Tanggal</td><td class="v">{{ $tglAcara }}</td></tr>
        <tr><td class="k">Waktu</td><td class="v">{{ $jam }}</td></tr>
        <tr><td class="k">Area / Lokasi</td><td class="v">{{ $event->area_event ?? '—' }}</td></tr>
        @if($event->technical_meeting)
            <tr><td class="k">Technical Meeting</td><td class="v">{{ $event->technical_meeting }}</td></tr>
        @endif
    </table>

    <div class="sec">Rincian Biaya</div>
    <table class="biaya">
        <tr>
            <th>Keterangan</th>
            <th class="r">Jumlah</th>
            <th class="r">Harga Satuan</th>
            <th class="r">Subtotal</th>
        </tr>
        <tr>
            <td>Paket acara per pax</td>
            <td class="r">{{ number_format($event->jumlah_pax ?? 0, 0, ',', '.') }} pax</td>
            <td class="r">Rp {{ number_format($event->harga_per_pax ?? 0, 0, ',', '.') }}</td>
            <td class="r">Rp {{ number_format(($event->jumlah_pax ?? 0) * ($event->harga_per_pax ?? 0), 0, ',', '.') }}</td>
        </tr>
        <tr class="total">
            <td colspan="3">TOTAL PENAWARAN</td>
            <td class="r">Rp {{ number_format($event->deal_harga_event ?? 0, 0, ',', '.') }}</td>
        </tr>
    </table>

    @if($event->food_beverage_event || $event->entairtainment_event || $event->note_event)
        <div class="sec">Termasuk / Catatan</div>
        <div class="note">
            @if($event->food_beverage_event)<b>Food &amp; Beverage:</b> {{ $event->food_beverage_event }}<br>@endif
            @if($event->entairtainment_event)<b>Entertainment:</b> {{ $event->entairtainment_event }}<br>@endif
            @if($event->note_event)<b>Catatan:</b> {{ $event->note_event }}@endif
        </div>
    @endif

    <div class="note" style="margin-top:16px;">
        Pembayaran dilakukan dua tahap: <b>DP 50%</b> setelah penawaran disetujui, dan <b>pelunasan 50%</b> sebelum acara berlangsung.
        Penawaran ini berlaku 14 hari sejak tanggal terbit.
    </div>

    <div class="foot">
        Dokumen ini dibuat otomatis oleh Sistem Manajemen Event — PT Laksamana Muda Bersatu.
    </div>

</div>
</body>
</html>
