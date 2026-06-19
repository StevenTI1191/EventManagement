<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        {{-- Situs ini light-mode only. Tanpa ini, "Auto Dark Theme" di
             Chrome Android/Samsung Internet meng-invert warna sendiri
             (mis. kuning jadi maroon). --}}
        <meta name="color-scheme" content="light">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        @php
            // Hanya pasang SEO meta di domain CLIENT (publik), bukan backstage pegawai.
            $isClient = ! str_contains(request()->getHost(), config('app.backstage_domain'));
            $seoName  = config('seo.name');
            $seoDesc  = config('seo.description');
            $seoUrl   = rtrim(config('seo.url'), '/');
            $seoImg   = $seoUrl . config('seo.og_image');
            // Pakai path saja (tanpa query string) agar /events?search=... tidak
            // dianggap halaman duplikat oleh Google.
            $canonical = $seoUrl . request()->getPathInfo();
        @endphp

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        {{-- Favicon (logo Laksamana). ?v=filemtime agar browser ambil versi terbaru, bukan cache --}}
        @php $favicon = '/images/LaksamanaLogo.png'; $faviconVer = @filemtime(public_path('images/LaksamanaLogo.png')) ?: '1'; @endphp
        <link rel="icon" type="image/png" href="{{ $favicon }}?v={{ $faviconVer }}">
        <link rel="shortcut icon" type="image/png" href="{{ $favicon }}?v={{ $faviconVer }}">
        <link rel="apple-touch-icon" href="{{ $favicon }}?v={{ $faviconVer }}">

        @if ($isClient)
            {{-- ── SEO dasar ── --}}
            <meta name="description" content="{{ $seoDesc }}">
            <link rel="canonical" href="{{ $canonical }}">
            <meta name="robots" content="index, follow">

            {{-- ── Open Graph (preview share WA/IG/FB/Telegram) ── --}}
            <meta property="og:type"        content="website">
            <meta property="og:site_name"   content="{{ $seoName }}">
            <meta property="og:title"       content="{{ $seoName }} — {{ config('seo.tagline') }}">
            <meta property="og:description" content="{{ $seoDesc }}">
            <meta property="og:url"         content="{{ $canonical }}">
            <meta property="og:image"       content="{{ $seoImg }}">
            <meta property="og:locale"      content="{{ config('seo.locale') }}">

            {{-- ── Twitter Card ── --}}
            <meta name="twitter:card"        content="summary_large_image">
            <meta name="twitter:title"       content="{{ $seoName }} — {{ config('seo.tagline') }}">
            <meta name="twitter:description" content="{{ $seoDesc }}">
            <meta name="twitter:image"       content="{{ $seoImg }}">

            {{-- ── Structured Data JSON-LD (LocalBusiness) ── --}}
            <script type="application/ld+json">
            @php
                $addr = config('seo.address');
                $ld = [
                    '@context' => 'https://schema.org',
                    '@type'    => 'LocalBusiness',
                    'name'     => config('seo.legal_name'),
                    'image'    => $seoUrl . config('seo.logo'),
                    'description' => $seoDesc,
                    'url'      => $seoUrl,
                    'telephone' => config('seo.phone'),
                    'email'    => config('seo.email'),
                    'address'  => array_filter([
                        '@type'           => 'PostalAddress',
                        'streetAddress'   => $addr['street'] ?: null,
                        'addressLocality' => $addr['city'] ?: null,
                        'addressRegion'   => $addr['region'] ?: null,
                        'postalCode'      => $addr['postal'] ?: null,
                        'addressCountry'  => $addr['country'] ?: null,
                    ]),
                ];
                if (! empty(config('seo.social'))) {
                    $ld['sameAs'] = array_values(config('seo.social'));
                }
            @endphp
            {!! json_encode($ld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
            </script>
        @endif

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
