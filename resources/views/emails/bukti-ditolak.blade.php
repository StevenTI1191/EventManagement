<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bukti Pembayaran Ditolak</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: #dc2626; padding: 36px 40px; text-align: center; }
        .header img { width: 56px; height: 56px; border-radius: 50%; background: #fff; padding: 4px; }
        .header h1 { color: #ffffff; font-size: 22px; margin: 16px 0 4px; font-weight: 700; }
        .header p { color: #fecaca; font-size: 14px; margin: 0; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 16px; color: #111827; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; color: #4b5563; line-height: 1.7; margin-bottom: 20px; }
        .card { background: #fff5f5; border: 1px solid #fecaca; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
        .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
        .card-row:last-child { margin-bottom: 0; }
        .card-label { color: #6b7280; padding-right: 12px; }
        .card-value { color: #111827; font-weight: 600; text-align: right; max-width: 60%; }
        .reason-box { background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 24px; font-size: 14px; color: #7f1d1d; line-height: 1.6; }
        .badge { display: inline-block; background: #fee2e2; color: #dc2626; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 99px; }
        .footer { background: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #f3f4f6; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <img src="{{ asset('images/LaksamanaLogo.png') }}" alt="Laksamana">
        <h1>Bukti Pembayaran Ditolak</h1>
        <p>Tindakan diperlukan dari Anda</p>
    </div>
    <div class="body">
        <p class="greeting">Halo, {{ $bukti->client?->nama_client ?? 'Client' }}!</p>
        <p class="text">
            Kami menginformasikan bahwa bukti pembayaran Anda untuk event berikut
            <strong>tidak dapat diverifikasi</strong> oleh tim Finance kami.
        </p>

        <div class="card">
            <div class="card-row">
                <span class="card-label">Event</span>
                <span class="card-value">{{ $bukti->event?->nama_event ?? '-' }}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Tanggal Event</span>
                <span class="card-value">
                    {{ $bukti->event?->tgl_mulai_event
                        ? \Carbon\Carbon::parse($bukti->event->tgl_mulai_event)->translatedFormat('d F Y')
                        : '-' }}
                </span>
            </div>
            @if($bukti->nominal)
            <div class="card-row">
                <span class="card-label">Nominal</span>
                <span class="card-value">Rp {{ number_format($bukti->nominal, 0, ',', '.') }}</span>
            </div>
            @endif
            <div class="card-row">
                <span class="card-label">Status</span>
                <span class="card-value"><span class="badge">Ditolak</span></span>
            </div>
        </div>

        @if($bukti->catatan_finance)
        <p style="font-size:13px; font-weight:700; color:#374151; margin-bottom:8px;">Alasan Penolakan:</p>
        <div class="reason-box">{{ $bukti->catatan_finance }}</div>
        @endif

        <p class="text">
            Mohon upload ulang bukti pembayaran yang sesuai melalui portal client kami.
            Jika ada pertanyaan, hubungi tim kami untuk bantuan lebih lanjut.
        </p>
    </div>
    <div class="footer">
        <p>© {{ date('Y') }} Laksamana Muda Bersama · Email ini dikirim otomatis, mohon tidak membalas.</p>
    </div>
</div>
</body>
</html>
