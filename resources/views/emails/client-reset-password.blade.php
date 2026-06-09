<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: #111827; padding: 36px 40px; text-align: center; border-bottom: 3px solid #F59E0B; }
        .header-icon { font-size: 36px; margin-bottom: 12px; }
        .header h1 { color: #fff; font-size: 20px; margin: 0 0 4px; font-weight: 700; }
        .header p { color: #9ca3af; font-size: 13px; margin: 0; }
        .body { padding: 36px 40px; }
        .greeting { font-size: 16px; color: #111827; font-weight: 600; margin-bottom: 12px; }
        .text { font-size: 14px; color: #4b5563; line-height: 1.7; margin-bottom: 24px; }
        .btn-wrap { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: #F59E0B; color: #000; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 99px; }
        .expiry { background: #fefce8; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-bottom: 24px; }
        .url-fallback { font-size: 11px; color: #9ca3af; word-break: break-all; text-align: center; }
        .footer { background: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #f3f4f6; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="header">
        <div class="header-icon">🔑</div>
        <h1>Reset Password</h1>
        <p>Permintaan reset password akun Anda</p>
    </div>
    <div class="body">
        <p class="greeting">Halo, {{ $namaClient }}!</p>
        <p class="text">
            Kami menerima permintaan untuk mereset password akun Anda di
            <strong>Laksamana Muda</strong>. Klik tombol di bawah untuk membuat password baru.
        </p>

        <div class="btn-wrap">
            <a href="{{ $resetUrl }}" class="btn">Reset Password Sekarang</a>
        </div>

        <div class="expiry">
            ⏱ Link ini hanya berlaku selama <strong>60 menit</strong> sejak email ini dikirim.
        </div>

        <p class="text">
            Jika Anda tidak merasa meminta reset password, abaikan email ini.
            Password Anda tidak akan berubah.
        </p>

        <p class="url-fallback">
            Jika tombol tidak berfungsi, salin link berikut ke browser:<br>
            {{ $resetUrl }}
        </p>
    </div>
    <div class="footer">
        <p>© {{ date('Y') }} Laksamana Muda · Email ini dikirim otomatis, mohon tidak membalas.</p>
    </div>
</div>
</body>
</html>
