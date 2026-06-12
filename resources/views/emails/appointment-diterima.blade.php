<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Diterima</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: #111827; padding: 36px 40px; text-align: center; border-bottom: 3px solid #F59E0B; }
        .header-icon { font-size: 36px; margin-bottom: 12px; }
        .header h1 { color: #fff; font-size: 20px; margin: 0 0 4px; font-weight: 700; }
        .header p { color: #9ca3af; font-size: 13px; margin: 0; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 16px; color: #111827; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; color: #4b5563; line-height: 1.7; margin-bottom: 20px; }
        .card { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
        .card-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
        .card-row:last-child { margin-bottom: 0; }
        .card-label { color: #6b7280; padding-right: 12px; }
        .card-value { color: #111827; font-weight: 600; text-align: right; max-width: 60%; }
        .badge { background: #F59E0B; color: #000; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; display: inline-block; }
        .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #0369a1; line-height: 1.6; }
        .footer { background: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #f3f4f6; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <div class="header-icon">🎉</div>
        <h1>Appointment Diterima!</h1>
        <p>Terima kasih telah menghubungi Laksamana Muda</p>
    </div>
    <div class="body">
        <p class="greeting">Halo, {{ $appointment->client?->nama_client ?? 'Client' }}!</p>
        <p class="text">
            Kami telah menerima permintaan appointment Anda. Tim <strong>Event Marketing</strong> kami
            akan segera meninjau dan mengkonfirmasi jadwal meeting.
        </p>

        <div class="card">
            <div class="card-row">
                <span class="card-label">Jenis Event</span>
                <span class="card-value">{{ $appointment->jenis_event }}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Tanggal Diinginkan</span>
                <span class="card-value">
                    {{ $appointment->tgl_request
                        ? \Carbon\Carbon::parse($appointment->tgl_request)->translatedFormat('d F Y')
                        : '-' }}
                </span>
            </div>
            @if($appointment->jam_request)
            <div class="card-row">
                <span class="card-label">Jam</span>
                <span class="card-value">{{ $appointment->jam_request }} WIB</span>
            </div>
            @endif
            @if($appointment->jumlah_tamu)
            <div class="card-row">
                <span class="card-label">Est. Tamu</span>
                <span class="card-value">{{ number_format($appointment->jumlah_tamu) }} orang</span>
            </div>
            @endif
            <div class="card-row">
                <span class="card-label">Status</span>
                <span class="card-value"><span class="badge">Menunggu Konfirmasi</span></span>
            </div>
        </div>

        <div class="info-box">
            ⏱ Tim kami akan mengkonfirmasi jadwal meeting dalam <strong>1×24 jam kerja</strong>.
            Konfirmasi akan dikirim melalui email ini dan notifikasi di dashboard Anda.
        </div>

        <p class="text">
            Jika ada pertanyaan, jangan ragu untuk menghubungi kami melalui WhatsApp atau email.
            Kami siap membantu mewujudkan event impian Anda!
        </p>
    </div>
    <div class="footer">
        <p>© {{ date('Y') }} Laksamana Muda · Email ini dikirim otomatis, mohon tidak membalas.</p>
    </div>
</div>
</body>
</html>
