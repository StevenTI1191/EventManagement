<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reminder Event</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 36px 40px; text-align: center; }
        .header-logo { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.9); display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px; }
        .header h1 { color: #fff; font-size: 22px; margin: 0 0 4px; font-weight: 700; }
        .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 0; }
        .countdown { display: inline-block; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.5); border-radius: 12px; padding: 8px 24px; margin-top: 16px; }
        .countdown-number { color: #fff; font-size: 36px; font-weight: 900; line-height: 1; }
        .countdown-label { color: rgba(255,255,255,0.85); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 16px; color: #111827; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; color: #4b5563; line-height: 1.7; margin-bottom: 20px; }
        .card { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
        .event-title { font-size: 18px; font-weight: 800; color: #f59e0b; margin: 0 0 16px; }
        .card-table { width: 100%; border-collapse: collapse; }
        .card-table td { padding: 6px 0; font-size: 13px; vertical-align: top; }
        .card-table td.card-label { color: #6b7280; white-space: nowrap; width: 42%; }
        .card-table td.card-value { color: #111827; font-weight: 600; text-align: right; }
        .checklist { background: #f9fafb; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
        .checklist-title { font-size: 13px; font-weight: 700; color: #374151; margin: 0 0 12px; }
        .checklist-table { width: 100%; border-collapse: collapse; }
        .checklist-table td { padding: 5px 0; font-size: 13px; color: #4b5563; vertical-align: top; line-height: 1.5; }
        .checklist-table td.check-icon { width: 26px; color: #f59e0b; font-weight: 700; }
        .divider { border: none; border-top: 1px solid #f3f4f6; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #f3f4f6; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <div class="header-logo">⏰</div>
        <h1>Pengingat Event Anda!</h1>
        <p>Jangan sampai terlewat — persiapkan dari sekarang</p>
        <div class="countdown">
            <div class="countdown-number">{{ $hariLagi }}</div>
            <div class="countdown-label">Hari Lagi</div>
        </div>
    </div>

    <div class="body">
        <p class="greeting">Halo, {{ $event->client?->nama_client ?? 'Client' }}!</p>
        <p class="text">
            Kami mengingatkan bahwa event Anda akan berlangsung
            <strong>{{ $hariLagi }} hari lagi</strong>. Pastikan semua persiapan sudah siap agar hari H berjalan lancar!
        </p>

        <div class="card">
            <p class="event-title">{{ $event->nama_event }}</p>
            <table class="card-table" role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="card-label">Tanggal Pelaksanaan</td>
                    <td class="card-value">{{ \Carbon\Carbon::parse($event->tgl_mulai_event)->translatedFormat('l, d F Y') }}</td>
                </tr>
                <tr>
                    <td class="card-label">Waktu</td>
                    <td class="card-value">{{ substr($event->jam_mulai, 0, 5) }} – {{ substr($event->jam_selesai, 0, 5) }} WIB</td>
                </tr>
                @if($event->area_event)
                <tr>
                    <td class="card-label">Lokasi / Area</td>
                    <td class="card-value">{{ $event->area_event }}</td>
                </tr>
                @endif
                @if($event->jumlah_pax)
                <tr>
                    <td class="card-label">Jumlah Pax</td>
                    <td class="card-value">{{ number_format($event->jumlah_pax, 0, ',', '.') }} orang</td>
                </tr>
                @endif
                @if($event->kategori_event)
                <tr>
                    <td class="card-label">Kategori</td>
                    <td class="card-value">{{ $event->kategori_event }}</td>
                </tr>
                @endif
            </table>
        </div>

        <div class="checklist">
            <p class="checklist-title">📋 Checklist Persiapan:</p>
            @php
                $sisa = $event->deal_harga_event - ($event->transaksis?->sum('nominal') ?? 0);
            @endphp
            <table class="checklist-table" role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="check-icon">@if($sisa <= 0)<span style="color:#16a34a">&#10003;</span>@else<span style="color:#ef4444">&#33;</span>@endif</td>
                    <td>
                        Pelunasan pembayaran
                        @if($sisa > 0)
                            <strong style="color:#ef4444">(Sisa: Rp {{ number_format($sisa, 0, ',', '.') }})</strong>
                        @else
                            <strong style="color:#16a34a">(Lunas)</strong>
                        @endif
                    </td>
                </tr>
                <tr>
                    <td class="check-icon">&bull;</td>
                    <td>Konfirmasi jumlah tamu final ke tim kami</td>
                </tr>
                <tr>
                    <td class="check-icon">&bull;</td>
                    <td>Pastikan semua detail acara sudah sesuai</td>
                </tr>
                <tr>
                    <td class="check-icon">&bull;</td>
                    <td>Siapkan transportasi dan akomodasi</td>
                </tr>
            </table>
        </div>

        <p class="text">
            Jika ada perubahan atau hal yang perlu dikonfirmasi, segera hubungi tim kami
            sebelum hari H. Kami siap membantu memastikan event Anda berjalan sempurna! 🎯
        </p>
    </div>
    <div class="footer">
        <p>© {{ date('Y') }} Laksamana Muda Bersama · Email ini dikirim otomatis, mohon tidak membalas.</p>
    </div>
</div>
</body>
</html>
