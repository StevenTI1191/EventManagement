<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Detail Event — {{ $event->nama_event }}</title>
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
        .st-upcoming { background:#dbeafe; color:#1e40af; }
        .st-done     { background:#dcfce7; color:#166534; }
        .st-deal     { background:#fef3c7; color:#92400e; }
        .lunas { background:#dcfce7; color:#166534; }
        .belum { background:#fee2e2; color:#991b1b; }

        .hero { background:#14153A; color:#fff; padding:13px 16px; border-radius:6px; margin-bottom:16px; }
        .hero .nm { font-size:15px; font-weight:bold; }
        .hero .sub { font-size:9.5px; color:#c7cad6; margin-top:3px; }

        .label { font-size: 9px; color:#9ca3af; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }
        .sec { font-size:11px; font-weight:bold; color:#14153A; margin:16px 0 7px; padding-bottom:4px; border-bottom:1px solid #e6e8ee; }

        table { width:100%; border-collapse:collapse; }
        .detail td { padding: 5px 0; vertical-align: top; }
        .detail td.k { width: 32%; color:#6b7280; }
        .detail td.v { font-weight:bold; }

        .box { background:#f8f9fb; border:1px solid #e6e8ee; border-radius:5px; padding:9px 11px; margin-top:7px; }
        .box .bt { font-size:9px; color:#9ca3af; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }
        .box .bv { font-size:10.5px; line-height:1.5; }

        .tag th { background:#14153A; color:#fff; font-size:10px; text-align:left; padding:7px 9px; }
        .tag th.r, .tag td.r { text-align:right; }
        .tag td { padding:8px 9px; border-bottom:1px solid #e6e8ee; font-size:10px; }
        .total td { background:#FFF0F3; font-weight:bold; font-size:12.5px; color:#14153A; padding:10px 9px; border:none; }
        .sisa td { background:#f8f9fb; font-weight:bold; font-size:11px; color:#14153A; padding:8px 9px; border:none; }

        .note { margin-top:14px; font-size:10px; color:#4b5563; line-height:1.55; }
        .foot { margin-top:26px; padding-top:10px; border-top:1px solid #e6e8ee; font-size:9px; color:#9ca3af; text-align:center; }
    </style>
</head>
<body>
<div class="wrap">

    <div class="head">
        <div class="brand">
            PT LAKSAMANA MUDA BERSATU
            <small>Event Organizer &amp; Venue — Pekanbaru, Riau</small>
        </div>
        <div class="doc">
            <div class="title">DETAIL EVENT</div>
            <div class="meta">
                Dicetak: {{ $tglCetak }}<br>
                <span class="badge {{ $event->status_event === 'Done' ? 'st-done' : ($event->status_event === 'Upcoming' ? 'st-upcoming' : 'st-deal') }}">
                    {{ strtoupper($event->status_event) }}
                </span>
            </div>
        </div>
    </div>

    <div class="hero">
        <div class="nm">{{ $event->nama_event }}</div>
        <div class="sub">
            {{ $tglAcara }}@if($jam) &middot; {{ $jam }}@endif
            @if($event->area_event) &middot; {{ $event->area_event }}@endif
        </div>
    </div>

    <div class="label">Klien</div>
    <table class="detail">
        <tr>
            <td class="k">Nama</td>
            <td class="v">{{ $event->client->nama_client ?? '—' }}</td>
        </tr>
        @if($event->client?->perusahaan_client)
        <tr><td class="k">Perusahaan</td><td class="v">{{ $event->client->perusahaan_client }}</td></tr>
        @endif
        @if($event->client?->no_telp_client)
        <tr><td class="k">Kontak</td><td class="v">{{ $event->client->no_telp_client }}</td></tr>
        @endif
    </table>

    <div class="sec">Informasi Acara</div>
    <table class="detail">
        @if($event->kategori_event)
        <tr><td class="k">Kategori</td><td class="v">{{ $event->kategori_event }}</td></tr>
        @endif
        <tr><td class="k">Tanggal</td><td class="v">{{ $tglAcara }}</td></tr>
        @if($jam)
        <tr><td class="k">Waktu</td><td class="v">{{ $jam }}</td></tr>
        @endif
        <tr><td class="k">Lokasi</td><td class="v">{{ $event->area_event ?: '—' }}</td></tr>
        <tr><td class="k">Jumlah tamu</td><td class="v">{{ $event->jumlah_pax ? number_format($event->jumlah_pax, 0, ',', '.') . ' orang' : '—' }}</td></tr>
        @if($event->pic)
        <tr><td class="k">Penanggung jawab</td><td class="v">{{ $event->pic->nama_pegawai }}</td></tr>
        @endif
        @if($event->technical_meeting)
        <tr><td class="k">Technical meeting</td><td class="v">{{ $event->technical_meeting }}</td></tr>
        @endif
        @if($event->gladi_resik)
        <tr><td class="k">Gladi resik</td><td class="v">{{ $event->gladi_resik }}</td></tr>
        @endif
    </table>

    @if($event->deskripsi_event || $event->entairtainment_event || $event->food_beverage_event)
        <div class="sec">Rincian Acara</div>
        @if($event->deskripsi_event)
            <div class="box"><div class="bt">Tentang acara</div><div class="bv">{{ $event->deskripsi_event }}</div></div>
        @endif
        @if($event->entairtainment_event)
            <div class="box"><div class="bt">Entertainment</div><div class="bv">{{ $event->entairtainment_event }}</div></div>
        @endif
        @if($event->food_beverage_event)
            <div class="box"><div class="bt">Food &amp; Beverage</div><div class="bv">{{ $event->food_beverage_event }}</div></div>
        @endif
    @endif

    <div class="sec">Ringkasan Tagihan</div>
    @if($invoices->isEmpty())
        <table class="tag">
            <tr><th>Keterangan</th><th class="r">Nominal</th></tr>
            <tr>
                <td>Nilai kesepakatan acara</td>
                <td class="r">Rp {{ number_format((float) $event->deal_harga_event, 0, ',', '.') }}</td>
            </tr>
        </table>
        <div class="note">Invoice belum diterbitkan. Rincian tagihan akan dikirimkan oleh tim Finance kami.</div>
    @else
        <table class="tag">
            <tr>
                <th>Invoice</th>
                <th>Jatuh tempo</th>
                <th>Status</th>
                <th class="r">Nominal</th>
            </tr>
            @foreach($invoices as $inv)
                <tr>
                    <td>
                        <strong>{{ $inv->tipe }}</strong><br>
                        <span style="color:#9ca3af;font-size:9px;">{{ $inv->nomor_invoice }}</span>
                    </td>
                    <td>{{ $inv->tgl_jatuh_tempo ? $inv->tgl_jatuh_tempo->translatedFormat('d M Y') : '—' }}</td>
                    <td><span class="badge {{ $inv->status === 'Lunas' ? 'lunas' : 'belum' }}">{{ strtoupper($inv->status) }}</span></td>
                    <td class="r">Rp {{ number_format((float) $inv->nominal, 0, ',', '.') }}</td>
                </tr>
            @endforeach
            <tr class="total">
                <td colspan="3">NILAI KESEPAKATAN</td>
                <td class="r">Rp {{ number_format((float) $event->deal_harga_event, 0, ',', '.') }}</td>
            </tr>
            <tr class="sisa">
                <td colspan="3">Sudah dibayar</td>
                <td class="r">Rp {{ number_format($totalDibayar, 0, ',', '.') }}</td>
            </tr>
            <tr class="sisa">
                <td colspan="3">{{ $sisa > 0 ? 'Sisa pembayaran' : 'Status' }}</td>
                <td class="r">{{ $sisa > 0 ? 'Rp ' . number_format($sisa, 0, ',', '.') : 'LUNAS' }}</td>
            </tr>
        </table>
    @endif

    @if($event->note_event)
        <div class="sec">Catatan</div>
        <div class="box"><div class="bv">{{ $event->note_event }}</div></div>
    @endif

    <div class="note">
        Dokumen ini diterbitkan otomatis oleh sistem sebagai ringkasan acara dan tagihan Anda.
        Bila ada perbedaan data atau pertanyaan, silakan hubungi tim kami.
    </div>

    <div class="foot">
        PT Laksamana Muda Bersatu &middot; Pekanbaru, Riau &middot; contactus@laksamanamuda.com &middot; +62 853-6523-4898
    </div>

</div>
</body>
</html>
