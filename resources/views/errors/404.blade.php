@extends('errors.layout')

@section('code', '404')
@section('title', 'Halaman Tidak Ditemukan')
@section('description', 'Halaman yang Anda cari tidak ada, telah dipindahkan, atau URL-nya salah.')

@section('actions')
    <a href="/" class="btn-primary">← Kembali ke Beranda</a>
    <a href="/dashboard" class="btn-secondary">Dashboard</a>
@endsection
