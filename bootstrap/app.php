<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Configuration\ApplicationBuilder;
use Illuminate\Console\Scheduling\Schedule;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        channels: __DIR__.'/../routes/channels.php',
        web: __DIR__ . '/../routes/web.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\SecurityHeaders::class,
        ]);

        $middleware->redirectGuestsTo(function ($request) {
            // Domain client → redirect ke halaman login client
            if ($request->getHost() === config('app.domain')) {
                return $request->getScheme() . '://' . $request->getHttpHost() . '/login';
            }
            // Domain backstage → redirect ke login pegawai
            return route('login');
        });
    })
    ->withSchedule(function (Schedule $schedule): void {
        // Scheduler event reminder dipusatkan di routes/console.php
        // agar tidak ada duplikasi nama dan H-3 tidak dikirim dua kali
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
