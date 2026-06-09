<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Error') — Laksamana Muda</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: #000;
            color: #fff;
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        /* Subtle radial glow */
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            background: radial-gradient(ellipse at 50% 40%, rgba(245,158,11,0.08) 0%, transparent 60%);
            pointer-events: none;
        }

        .card {
            position: relative;
            width: 100%;
            max-width: 480px;
            text-align: center;
        }

        /* Logo */
        .logo {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 40px;
            text-decoration: none;
        }
        .logo-ring {
            width: 44px; height: 44px;
            border-radius: 50%;
            border: 2px solid #F59E0B;
            background: #000;
            display: flex; align-items: center; justify-content: center;
            overflow: hidden;
        }
        .logo-ring img { width: 32px; height: 32px; object-fit: contain; }
        .logo-text { font-size: 15px; font-weight: 900; color: #fff; letter-spacing: -0.3px; }
        .logo-text span { color: #F59E0B; }

        /* Error code */
        .code {
            font-size: clamp(80px, 20vw, 120px);
            font-weight: 900;
            line-height: 1;
            color: transparent;
            background: linear-gradient(135deg, #F59E0B 0%, #d97706 100%);
            -webkit-background-clip: text;
            background-clip: text;
            margin-bottom: 4px;
            letter-spacing: -4px;
        }

        .title {
            font-size: clamp(18px, 4vw, 24px);
            font-weight: 800;
            color: #fff;
            margin-bottom: 12px;
        }

        .desc {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.7;
            margin-bottom: 36px;
            max-width: 340px;
            margin-left: auto;
            margin-right: auto;
        }

        /* Buttons */
        .btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
        }
        .btn-primary {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 12px 28px;
            background: #F59E0B;
            color: #000;
            font-size: 14px; font-weight: 800;
            border-radius: 999px;
            text-decoration: none;
            transition: background 0.15s, transform 0.15s;
            border: none; cursor: pointer;
        }
        .btn-primary:hover { background: #fbbf24; transform: translateY(-1px); }

        .btn-secondary {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 12px 28px;
            background: transparent;
            color: #9ca3af;
            font-size: 14px; font-weight: 700;
            border-radius: 999px;
            text-decoration: none;
            border: 1px solid #374151;
            transition: color 0.15s, border-color 0.15s;
            cursor: pointer;
        }
        .btn-secondary:hover { color: #F59E0B; border-color: rgba(245,158,11,0.5); }

        /* Divider line */
        .divider {
            width: 48px; height: 3px;
            background: #F59E0B;
            border-radius: 99px;
            margin: 0 auto 28px;
        }

        /* Footer */
        .footer {
            position: fixed;
            bottom: 24px;
            font-size: 11px;
            color: #374151;
        }
    </style>
</head>
<body>
    <div class="card">
        <a href="/" class="logo">
            <div class="logo-ring">
                <img src="/images/LaksamanaLogo.png" alt="Logo"
                     onerror="this.style.display='none'">
            </div>
            <span class="logo-text">Laksamana <span>Muda</span></span>
        </a>

        <div class="code">@yield('code', '?')</div>
        <div class="divider"></div>
        <h1 class="title">@yield('title', 'Terjadi Kesalahan')</h1>
        <p class="desc">@yield('description', 'Terjadi sesuatu yang tidak diharapkan. Silakan kembali ke halaman utama.')</p>

        <div class="btn-group">
            @yield('actions')
        </div>
    </div>

    <p class="footer">© {{ date('Y') }} Laksamana Muda</p>
</body>
</html>
