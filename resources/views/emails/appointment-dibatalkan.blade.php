<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Dibatalkan</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: #dc2626; padding: 36px 40px; text-align: center; }
        .header-logo { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.9); display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
        .header h1 { color: #fff; font-size: 22px; margin: 0 0 4px; font-weight: 700; }
        .header p { color: #fecaca; font-size: 14px; margin: 0; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 16px; color: #111827; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; color: #4b5563; line-height: 1.7; margin-bottom: 20px; }
        .card { background: #fff5f5; border: 1px solid #fecaca; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
        .card-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
        .card-row:last-child { margin-bottom: 0; }
        .card-label { color: #6b7280; padding-right: 12px; }
        .card-value { color: #111827; font-weight: 600; text-align: right; max-width: 60%; }
        .highlight { background: #fee2e2; color: #dc2626; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 99px; display: inline-block; }
        .reason-box { background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 24px; font-size: 14px; color: #7f1d1d; line-height: 1.6; }
        .footer { background: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #f3f4f6; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <div class="header-logo">❌</div>
        <h1>Appointment Dibatalkan</h1>
        <p>Kami mohon maaf atas ketidaknyamanan ini</p>
    </div>
    <div class="body">
        <p class="greeting">Halo, {{ $appointment->client?->nama_client ?? 'Client' }}!</p>
        <p class="text">
            Kami menginformasikan bahwa appointment Anda dengan
            <strong>Laksamana Muda Bersama</strong> telah dibatalkan.
        </p>

        <div class="card">
            <div class="card-row">
                <span class="card-label">Jenis Event</span>
                <span class="card-value">{{ $appointment->jenis_event }}</span>
            </div>
            @if($appointment->estimasi_budget)
            <div class="card-row">
                <span class="card-label">Estimasi Budget</span>
                <span class="card-value">Rp {{ number_format($appointment->estimasi_budget, 0, ',', '.') }}</span>
            </div>
            @endif
            <div class="card-row">
                <span class="card-label">Tanggal Request</span>
                <span class="card-value">
                    {{ $appointment->tgl_request
                        ? \Carbon\Carbon::parse($appointment->tgl_request)->translatedFormat('d F Y')
                        : '-' }}
                </span>
            </div>
            <div class="card-row">
                <span class="card-label">Status</span>
                <span class="card-value"><span class="highlight">Dibatalkan</span></span>
            </div>
        </div>

        @if($appointment->catatan_em)
        <p style="font-size:13px; font-weight:700; color:#374151; margin-bottom:8px;">Alasan Pembatalan:</p>
        <div class="reason-box">{{ $appointment->catatan_em }}</div>
        @endif

        <p class="text">
            Jika Anda ingin membuat appointment baru atau ada pertanyaan lebih lanjut,
            jangan ragu untuk menghubungi tim kami. Kami siap membantu Anda.
        </p>
    </div>
    <div class="footer">
        <p>© {{ date('Y') }} Laksamana Muda Bersama · Email ini dikirim otomatis, mohon tidak membalas.</p>
    </div>
</div>
</body>
</html>
