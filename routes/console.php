<?php

use App\Mail\EventReminder;
use App\Models\Event;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Event Reminder — jalan setiap hari jam 09:00
| Kirim email ke client H-3 dan H-1 sebelum event berlangsung
|--------------------------------------------------------------------------
*/
// Kirim reminder H-7, H-3, H-1 — satu scheduler, tidak ada duplikasi
Schedule::call(function () {
    foreach ([7, 3, 1] as $hariLagi) {
        $events = Event::with(['client'])
            ->where('status_event', 'Upcoming')
            ->whereDate('tgl_mulai_event', now()->addDays($hariLagi))
            ->get();

        foreach ($events as $event) {
            $email = $event->client?->email_client;
            if (!$email) continue;

            try {
                Mail::to($email)->send(new EventReminder($event, $hariLagi));
                \Log::info("EventReminder H-{$hariLagi} terkirim: {$event->nama_event} → {$email}");
            } catch (\Exception $e) {
                \Log::warning("EventReminder gagal — {$event->nama_event}: " . $e->getMessage());
            }
        }
    }
})->dailyAt('08:00')->name('event-reminder')->withoutOverlapping();
