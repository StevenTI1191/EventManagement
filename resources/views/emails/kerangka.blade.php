{{--
    Kerangka surel bersama.

    Disusun dengan TABEL, bukan flexbox atau grid. Outlook di Windows merender
    surel memakai mesin Word yang mengabaikan flex/grid sepenuhnya — tata letak
    yang tampak rapi di Gmail bisa runtuh total di sana. Tabel adalah satu-satunya
    tata letak yang berperilaku sama di seluruh peramban surel.

    Gayanya ditulis inline pada tiap elemen karena banyak klien surel membuang
    blok <style>. Satu blok <style> tetap disertakan khusus untuk media query,
    yang memang tidak bisa dibuat inline — klien yang membuangnya tetap
    mendapatkan tampilan desktop yang utuh.

    Parameter:
      $judul      — judul di kepala surel
      $subjudul   — keterangan singkat di bawah judul (opsional)
      $ikon       — satu emoji pada lingkaran kepala (opsional)
      $nada       — 'emas' | 'hijau' | 'merah' | 'biru' | 'jingga'
      $sapaan     — mis. "Halo, Budi!" (opsional)
      $paragraf   — array kalimat isi
      $detail     — array label => nilai, dirender sebagai tabel rincian
      $sorotan    — teks yang ditonjolkan dalam kotak berwarna (opsional)
      $catatan    — kutipan/catatan tambahan (opsional)
      $tombol     — ['label' => ..., 'url' => ...] (opsional)
      $penutup    — kalimat penutup sebelum kaki surel (opsional)
--}}
@php
    $palet = [
        'emas'   => ['#A9791F', '#C8961F', '#F2E9D3', '#7A560F'],
        'hijau'  => ['#15803d', '#16a34a', '#dcfce7', '#166534'],
        'merah'  => ['#b91c1c', '#dc2626', '#fee2e2', '#991b1b'],
        'biru'   => ['#1d4ed8', '#2563eb', '#dbeafe', '#1e40af'],
        'jingga' => ['#c2410c', '#ea580c', '#ffedd5', '#9a3412'],
    ];
    [$tua, $muda, $lembut, $teksTua] = $palet[$nada ?? 'emas'] ?? $palet['emas'];

    $paragraf = $paragraf ?? [];
    $detail   = $detail ?? [];

    // Lambang disisipkan ke dalam surel bila memungkinkan (cid:), sehingga
    // tidak ada gambar yang perlu diambil dari luar — itulah yang dulu membuat
    // lambangnya kadang tampil rusak. $message hanya ada saat surel benar-benar
    // dikirim; pada pratinjau/pengujian penyedia ini jatuh ke URL sendiri.
    $logo = \App\Support\Logo::untukEmail($message ?? null);
    $sisi = \App\Support\Logo::SISI;
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    {{-- Wajib agar tidak dikecilkan paksa di ponsel. --}}
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light">
    <title>{{ $judul }}</title>
    <style>
        /* Hanya media query di sini — sisanya inline agar tak terbuang klien surel. */
        @media only screen and (max-width: 600px) {
            .lm-bungkus  { width: 100% !important; border-radius: 0 !important; }
            .lm-isi      { padding: 24px 20px !important; }
            .lm-kepala   { padding: 28px 20px !important; }
            .lm-kaki     { padding: 20px !important; }
            .lm-judul    { font-size: 19px !important; }
            /* Label dan nilai menumpuk agar tidak terpotong di layar sempit. */
            .lm-label, .lm-nilai {
                display: block !important;
                width: 100% !important;
                text-align: left !important;
                padding: 0 0 2px 0 !important;
            }
            .lm-nilai    { padding-bottom: 12px !important; font-size: 15px !important; }
            .lm-tombol a { display: block !important; width: auto !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background:#f4f4f5; -webkit-font-smoothing:antialiased;">
    {{-- Pratinjau di daftar kotak masuk, disembunyikan dari badan surel. --}}
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
        {{ $subjudul ?? $judul }}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#f4f4f5; padding:24px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" class="lm-bungkus" width="600" cellpadding="0" cellspacing="0" border="0"
                       style="width:600px; max-width:600px; background:#ffffff; border-radius:16px; overflow:hidden;
                              font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

                    {{-- ── Lambang ────────────────────────────────────────
                         Ditaruh pada pita PUTIH tersendiri, bukan di atas
                         kepala berwarna: nada kepalanya berubah-ubah menurut
                         jenis pemberitahuan, sedangkan lambangnya berwarna
                         tetap. Latar putih menjamin kontrasnya aman pada
                         kelima nada.

                         Lebar & tinggi WAJIB ditulis. Berkas sumbernya
                         4500x4500 piksel, dan tanpa ukuran sebagian klien
                         surel merentangkannya selebar layar. --}}
                    <tr>
                        <td align="center" style="background:#ffffff; padding:22px 36px 0;">
                            @if($logo)
                                <img src="{{ $logo }}" width="{{ $sisi }}" height="{{ $sisi }}"
                                     alt="{{ \App\Support\Logo::namaPerusahaan() }}"
                                     style="display:block; width:{{ $sisi }}px; height:{{ $sisi }}px;
                                            max-width:{{ $sisi }}px; border:0; outline:none;
                                            text-decoration:none; margin:0 auto;">
                            @else
                                {{-- Berkas lambang tidak ada. Nama perusahaan dalam bentuk
                                     teks jauh lebih baik daripada ikon gambar rusak. --}}
                                <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                                            font-size:13px; font-weight:bold; letter-spacing:.5px;
                                            color:#14153A;">
                                    {{ \App\Support\Logo::namaPerusahaan() }}
                                </div>
                            @endif
                        </td>
                    </tr>

                    {{-- ── Kepala ─────────────────────────────────────────── --}}
                    <tr>
                        <td class="lm-kepala" align="center"
                            style="background:{{ $tua }}; padding:32px 36px;">
                            @if(!empty($ikon))
                                <div style="width:52px; height:52px; line-height:52px; margin:0 auto 14px;
                                            background:rgba(255,255,255,.92); border-radius:26px;
                                            font-size:24px; text-align:center;">{{ $ikon }}</div>
                            @endif
                            <div class="lm-judul" style="color:#ffffff; font-size:21px; font-weight:700; line-height:1.35;">
                                {{ $judul }}
                            </div>
                            @if(!empty($subjudul))
                                <div style="color:rgba(255,255,255,.85); font-size:13px; margin-top:6px; line-height:1.5;">
                                    {{ $subjudul }}
                                </div>
                            @endif
                        </td>
                    </tr>

                    {{-- ── Isi ────────────────────────────────────────────── --}}
                    <tr>
                        <td class="lm-isi" style="padding:32px 36px;">
                            @if(!empty($sapaan))
                                <p style="margin:0 0 12px; font-size:16px; font-weight:600; color:#111827;">{{ $sapaan }}</p>
                            @endif

                            @foreach($paragraf as $baris)
                                <p style="margin:0 0 14px; font-size:14px; line-height:1.75; color:#4b5563;">
                                    {!! nl2br(e($baris)) !!}
                                </p>
                            @endforeach

                            @if(!empty($sorotan))
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                                       style="margin:20px 0;">
                                    <tr>
                                        <td style="background:{{ $lembut }}; border-radius:12px; padding:16px 20px;
                                                   font-size:15px; font-weight:700; color:{{ $teksTua }}; line-height:1.5;">
                                            {!! nl2br(e($sorotan)) !!}
                                        </td>
                                    </tr>
                                </table>
                            @endif

                            @if(count($detail))
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                                       style="margin:4px 0 20px; background:#f9fafb; border:1px solid #f0f0f1;
                                              border-radius:12px;">
                                    @foreach($detail as $label => $nilai)
                                        <tr>
                                            <td class="lm-label" width="42%"
                                                style="padding:11px 20px; font-size:12px; color:#6b7280;
                                                       border-bottom:{{ $loop->last ? 'none' : '1px solid #f0f0f1' }};
                                                       vertical-align:top;">
                                                {{ $label }}
                                            </td>
                                            <td class="lm-nilai" align="right"
                                                style="padding:11px 20px; font-size:13px; font-weight:600; color:#111827;
                                                       border-bottom:{{ $loop->last ? 'none' : '1px solid #f0f0f1' }};
                                                       vertical-align:top;">
                                                {{ $nilai }}
                                            </td>
                                        </tr>
                                    @endforeach
                                </table>
                            @endif

                            @if(!empty($catatan))
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                                       style="margin:0 0 20px;">
                                    <tr>
                                        <td style="border-left:4px solid {{ $muda }}; background:#fafafa;
                                                   border-radius:0 8px 8px 0; padding:12px 16px;
                                                   font-size:13px; color:#4b5563; line-height:1.6; font-style:italic;">
                                            {!! nl2br(e($catatan)) !!}
                                        </td>
                                    </tr>
                                </table>
                            @endif

                            @if(!empty($tombol['url']) && !empty($tombol['label']))
                                <table role="presentation" class="lm-tombol" width="100%" cellpadding="0" cellspacing="0" border="0"
                                       style="margin:4px 0 8px;">
                                    <tr>
                                        <td align="center">
                                            <a href="{{ $tombol['url'] }}"
                                               style="display:inline-block; background:{{ $tua }}; color:#ffffff;
                                                      font-size:14px; font-weight:700; text-decoration:none;
                                                      padding:13px 28px; border-radius:10px;">
                                                {{ $tombol['label'] }}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            @endif

                            @if(!empty($penutup))
                                <p style="margin:18px 0 0; font-size:13px; line-height:1.7; color:#6b7280;">
                                    {!! nl2br(e($penutup)) !!}
                                </p>
                            @endif
                        </td>
                    </tr>

                    {{-- ── Kaki ───────────────────────────────────────────── --}}
                    <tr>
                        <td class="lm-kaki" align="center"
                            style="background:#f9fafb; border-top:1px solid #f3f4f6; padding:22px 36px;">
                            <p style="margin:0 0 4px; font-size:13px; font-weight:700; color:#374151;">
                                {{ config('perusahaan.nama') }}
                            </p>
                            <p style="margin:0; font-size:11px; color:#9ca3af; line-height:1.7;">
                                Event Organizer &amp; Venue — Pekanbaru<br>
                                Surel ini dikirim otomatis oleh Sistem Manajemen Event.
                            </p>
                        </td>
                    </tr>
                </table>

                <div style="max-width:600px; margin:14px auto 0; font-size:11px; color:#b0b0b6;
                            font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                    Mohon jangan membalas surel ini.
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
