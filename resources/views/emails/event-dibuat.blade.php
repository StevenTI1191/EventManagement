<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event Dikonfirmasi</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #FF2D55, #ff6b35); padding: 36px 40px; text-align: center; }
        .header img { width: 56px; height: 56px; border-radius: 50%; background: #fff; padding: 4px; }
        .header h1 { color: #ffffff; font-size: 22px; margin: 16px 0 4px; font-weight: 700; }
        .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 16px; color: #111827; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; color: #4b5563; line-height: 1.7; margin-bottom: 20px; }
        .card { background: #fff5f7; border: 1px solid #ffd6de; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
        .card-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
        .card-row:last-child { margin-bottom: 0; }
        .card-label { color: #6b7280; min-width: 120px; padding-right: 12px; }
        .card-value { color: #111827; font-weight: 600; text-align: right; max-width: 60%; }
        .highlight { font-size: 20px; font-weight: 800; color: #FF2D55; }
        .divider { border: none; border-top: 1px solid #f3f4f6; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #f3f4f6; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <img src="{{ asset('images/LaksamanaLogo.png') }}" alt="Laksamana">
        <h1>Event Anda Telah Dikonfirmasi 🎉</h1>
        <p>Tim Event Marketing telah menyiapkan event Anda</p>
    </div>
    <div class="body">
        <p class="greeting">Halo, {{ $event->client?->nama_client ?? 'Client' }}!</p>
        <p class="text">
            Kabar baik! Tim <strong>Laksamana Muda Bersama</strong> telah mengkonfirmasi dan menambahkan
            event Anda ke dalam sistem kami. Berikut detail event yang telah disiapkan:
        </p>

        <div class="card">
            <p class="highlight">{{ $event->nama_event }}</p>
            <hr class="divider">
            <div class="card-row">
                <span class="card-label">Tanggal Pelaksanaan</span>
                <span class="card-value">
                    {{ \Carbon\Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y') }}
                </span>
            </div>
            <div class="card-row">
                <span class="card-label">Waktu</span>
                <span class="card-value">{{ $event->jam_mulai }} – {{ $event->jam_selesai }} WIB</span>
            </div>
            <div class="card-row">
                <span class="card-label">Lokasi / Area</span>
                <span class="card-value">{{ $event->area_event ?? '-' }}</span>
            </div>
            @if($event->jumlah_pax)
            <div class="card-row">
                <span class="card-label">Jumlah Pax</span>
                <span class="card-value">{{ number_format($event->jumlah_pax, 0, ',', '.') }} orang</span>
            </div>
            @endif
            @if($event->deal_harga_event)
            <div class="card-row">
                <span class="card-label">Nilai Deal</span>
                <span class="card-value">Rp {{ number_format($event->deal_harga_event, 0, ',', '.') }}</span>
            </div>
            @endif
            @if($event->kategori_event)
            <div class="card-row">
                <span class="card-label">Kategori</span>
                <span class="card-value">{{ $event->kategori_event }}</span>
            </div>
            @endif
        </div>

        <p class="text">
            Selanjutnya, tim kami akan menghubungi Anda untuk koordinasi lebih lanjut.
            Apabila ada pertanyaan terkait event ini, jangan ragu untuk menghubungi kami.
        </p>
        <p class="text">Terima kasih telah mempercayakan momen spesial Anda kepada kami! 🙏</p>
    </div>
    <div class="footer">
        <p>© {{ date('Y') }} Laksamana Muda Bersama · Email ini dikirim otomatis, mohon tidak membalas.</p>
    </div>
</div>
</body>
</html>
