@extends('errors.layout')

@section('code', '500')
@section('title', 'Terjadi Kesalahan Server')
@section('description', 'Server kami mengalami masalah. Tim teknis sudah diberitahu. Silakan coba beberapa saat lagi.')

@section('actions')
    <a href="/" class="btn-primary">← Kembali ke Beranda</a>
@endsection
