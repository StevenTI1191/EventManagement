<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Dikonfirmasi</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: #16a34a; padding: 36px 40px; text-align: center; }
        .header-logo { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.9); display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
        .header h1 { color: #fff; font-size: 22px; margin: 0 0 4px; font-weight: 700; }
        .header p { color: #bbf7d0; font-size: 14px; margin: 0; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 16px; color: #111827; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; color: #4b5563; line-height: 1.7; margin-bottom: 20px; }
        .card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
        .card-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
        .card-row:last-child { margin-bottom: 0; }
        .card-label { color: #6b7280; padding-right: 12px; }
        .card-value { color: #111827; font-weight: 600; text-align: right; max-width: 60%; }
        .highlight { background: #dcfce7; color: #16a34a; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 99px; display: inline-block; }
        .catatan { background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; color: #166534; }
        .footer { background: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #f3f4f6; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <div class="header-logo">✅</div>
        <h1>Appointment Dikonfirmasi!</h1>
        <p>Tim kami siap bertemu dengan Anda</p>
    </div>
    <div class="body">
        <p class="greeting">Halo, {{ $appointment->client?->nama_client ?? 'Client' }}!</p>
        <p class="text">
            Kabar baik! Tim <strong>Laksamana Muda Bersama</strong> telah mengkonfirmasi appointment Anda.
            Berikut detail jadwal meeting yang telah ditetapkan:
        </p>

        <div class="card">
            <div class="card-row">
                <span class="card-label">Jenis Event</span>
                <span class="card-value">{{ $appointment->jenis_event }}</span>
            </div>
            <div class="card-row">
                <span class="card-label">Tanggal Meeting</span>
                <span class="card-value">
                    {{ $appointment->tgl_konfirmasi
                        ? \Carbon\Carbon::parse($appointment->tgl_konfirmasi)->translatedFormat('d F Y')
                        : '-' }}
                </span>
            </div>
            @if($appointment->jam_konfirmasi)
            <div class="card-row">
                <span class="card-label">Jam</span>
                <span class="card-value">{{ $appointment->jam_konfirmasi }} WIB</span>
            </div>
            @endif
            <div class="card-row">
                <span class="card-label">Status</span>
                <span class="card-value"><span class="highlight">Dikonfirmasi</span></span>
            </div>
        </div>

        @if($appointment->catatan_em)
        <p style="font-size:13px; font-weight:700; color:#374151; margin-bottom:8px;">Catatan dari Tim:</p>
        <div class="catatan">{{ $appointment->catatan_em }}</div>
        @endif

        <p class="text">
            Mohon hadir tepat waktu sesuai jadwal yang telah ditentukan.
            Jika ada pertanyaan, jangan ragu untuk menghubungi tim kami.
        </p>
    </div>
    <div class="footer">
        <p>© {{ date('Y') }} Laksamana Muda Bersama · Email ini dikirim otomatis, mohon tidak membalas.</p>
    </div>
</div>
</body>
</html>
