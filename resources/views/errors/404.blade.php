@extends('errors.layout')

@section('code', '404')
@section('title', 'Halaman Tidak Ditemukan')
@section('description', 'Halaman yang Anda cari tidak ada, telah dipindahkan, atau URL-nya salah.')

@section('actions')
    @include('errors.partials.actions')
@endsection
