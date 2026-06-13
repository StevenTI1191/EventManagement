@php
    // Tentukan tombol sesuai siapa yang login, agar tidak menyesatkan
    // (mis. "/" di backstage = halaman login → terkesan logout).
    $pegawai = auth('pegawai')->user();
    $pegawaiDash = $pegawai ? match ($pegawai->posisi_pegawai) {
        'Manajemen'      => route('manajemen.dashboard'),
        'EventMarketing' => route('event.dashboard'),
        'Finance'        => route('finance.dashboard'),
        default          => null,
    } : null;
@endphp

@if ($pegawaiDash)
    <a href="{{ $pegawaiDash }}" class="btn-primary">← Ke Dashboard</a>
@elseif (auth('client')->check())
    <a href="{{ route('client.dashboard') }}" class="btn-primary">← Ke Dashboard</a>
    <a href="{{ url('/') }}" class="btn-secondary">Beranda</a>
@else
    <a href="{{ url('/') }}" class="btn-primary">← Kembali ke Beranda</a>
@endif
