@extends('errors.layout')

@section('code', '419')
@section('title', 'Sesi Telah Berakhir')
@section('description', 'Sesi Anda telah habis atau token tidak valid. Silakan muat ulang halaman dan coba lagi.')

@section('actions')
    <a href="javascript:history.back()" class="btn-primary">← Kembali</a>
    <a href="/" class="btn-secondary">Ke Beranda</a>
@endsection
