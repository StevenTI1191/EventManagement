@extends('errors.layout')

@section('code', '403')
@section('title', 'Akses Ditolak')
@section('description', 'Anda tidak memiliki izin untuk mengakses halaman ini.')

@section('actions')
    @include('errors.partials.actions')
@endsection
