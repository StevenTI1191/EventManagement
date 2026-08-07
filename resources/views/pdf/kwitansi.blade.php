<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Kwitansi {{ $nomor }}</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color:#1f2430; }
        .wrap { padding: 28px 34px; }
        .head { border-bottom: 3px solid #16a34a; padding-bottom: 12px; margin-bottom: 20px; }
        .brand { font-size: 17px; font-weight: bold; color:#14153A; }
        .brand small { display:block; font-size: 9px; font-weight: normal; color:#6b7280; margin-top:2px; }
        .title { font-size: 15px; font-weight: bold; color:#16a34a; letter-spacing:1px; }
        .meta { font-size: 9.5px; color:#6b7280; margin-top:3px; }
        .badge { display:inline-block; padding:2px 8px; border-radius:8px; font-size:9px; font-weight:bold; background:#dcfce7; color:#166534; }
        table { width:100%; border-collapse:collapse; }
        .rows td { padding: 8px 0; vertical-align: top; }
        .rows td.k { width: 30%; color:#6b7280; }
        .rows td.v { font-weight:bold; }
        .amount { margin: 18px 0; padding: 12px 16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; }
        .amount .num { font-size: 18px; font-weight:bold; color:#14153A; }
        .amount .words { font-size: 10.5px; color:#4b5563; font-style:italic; margin-top:4px; text-transform:capitalize; }
        .sign { margin-top: 34px; }
        .sign .box { float:right; width: 210px; text-align:center; }
        .sign .role { font-size: 10px; color:#6b7280; }
        .sign .name { margin-top: 48px; font-weight:bold; border-top:1px solid #9ca3af; padding-top:4px; }
        .foot { clear:both; margin-top:40px; padding-top:10px; border-top:1px solid #e6e8ee; font-size:9px; color:#9ca3af; text-align:center; }
    </style>
</head>
<body>
<div class="wrap">

    <div class="head">
        <table>
            <tr>
                <td style="vertical-align:top;">
                    {{-- Lambang ditanam sebagai data URI (lihat Support/Logo).
                         DomPDF tidak mengambil berkas dari jaringan, jadi gambar
                         ber-URL biasa berakhir sebagai kotak kosong. Bila lambangnya
                         tidak tersedia, yang tampil hanyalah nama perusahaan.
                         Tata letaknya memakai tabel karena inline-block tidak
                         diterjemahkan DomPDF secara andal. --}}
                    <table style="border-collapse:collapse;"><tr>
                        @if($logoPdf = \App\Support\Logo::dataUri())
                            <td style="vertical-align:middle; padding-right:9px; width:42px;">
                                <img src="{{ $logoPdf }}" width="42" height="42"
                                     alt="" style="width:42px; height:42px;">
                            </td>
                        @endif
                        <td style="vertical-align:middle;">
                            <div class="brand">
                                PT LAKSAMANA MUDA BERSATU
                                <small>Event Organizer &amp; Venue — Pekanbaru</small>
                            </div>
                        </td>
                    </tr></table>
                </td>
                <td style="vertical-align:top; text-align:right;">
                    <div class="title">KWITANSI</div>
                    <div class="meta">
                        No. {{ $nomor }}<br>
                        Tanggal: {{ $tglTerima }}<br>
                        <span class="badge">PEMBAYARAN DITERIMA</span>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <table class="rows">
        <tr>
            <td class="k">Telah terima dari</td>
            <td class="v">{{ $client->perusahaan_client ?? ($client->nama_client ?? '—') }}
                @if($client && $client->perusahaan_client)<br><span style="font-weight:normal; color:#6b7280;">{{ $client->nama_client }}</span>@endif
            </td>
        </tr>
        <tr>
            <td class="k">Untuk pembayaran</td>
            <td class="v">
                {{ $keteranganBayar }} — {{ $event->nama_event }}
                @if($event->tgl_mulai_event)<br><span style="font-weight:normal; color:#6b7280;">Acara: {{ $tglAcara }}</span>@endif
            </td>
        </tr>
        <tr>
            <td class="k">Metode</td>
            <td class="v">{{ $metode }}</td>
        </tr>
    </table>

    <div class="amount">
        <div class="num">Rp {{ number_format($nominal, 0, ',', '.') }}</div>
        <div class="words">Terbilang: {{ $terbilang }} rupiah</div>
    </div>

    <div class="sign">
        <div class="box">
            <div class="role">Pekanbaru, {{ $tglTerima }}<br>Penerima,</div>
            <div class="name">Tim Finance — PT LMB</div>
        </div>
    </div>

    <div class="foot">
        Kwitansi ini sah sebagai tanda terima pembayaran dan dibuat otomatis oleh Sistem Manajemen Event — PT Laksamana Muda Bersatu.
    </div>

</div>
</body>
</html>
