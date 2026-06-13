@extends('errors.layout')

@section('code', '500')
@section('title', 'Terjadi Kesalahan Server')
@section('description', 'Server kami mengalami masalah. Tim teknis sudah diberitahu. Silakan coba beberapa saat lagi.')

@section('actions')
    @include('errors.partials.actions')
@endsection
