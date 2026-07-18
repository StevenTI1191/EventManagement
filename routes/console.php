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

/*
|--------------------------------------------------------------------------
| Auto-batal Appointment — jalan setiap hari jam 01:00
| Appointment yang sudah dikonfirmasi/di-reschedule tetapi jadwal meeting-nya
| sudah lewat lebih dari 2 hari dan belum ditandai "Selesai" oleh Event
| Marketing, dianggap tidak terjadi dan otomatis dibatalkan.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    $batas = now()->subDays(2)->toDateString();

    $terlewat = \App\Models\Appointment::whereIn('status', ['Dikonfirmasi', 'Reschedule'])
        ->whereNotNull('tgl_konfirmasi')
        ->whereDate('tgl_konfirmasi', '<', $batas)
        ->get();

    foreach ($terlewat as $appointment) {
        $catatan = 'Dibatalkan otomatis: lewat 2 hari dari jadwal meeting dan belum ditandai selesai.';

        $appointment->update([
            'status'     => 'Dibatalkan',
            'catatan_em' => $appointment->catatan_em
                ? $appointment->catatan_em . ' | ' . $catatan
                : $catatan,
        ]);

        \Log::info("Appointment #{$appointment->id} dibatalkan otomatis (lewat 2 hari dari jadwal meeting).");
    }
})->dailyAt('01:00')->name('appointment-auto-batal')->withoutOverlapping();

/*
|--------------------------------------------------------------------------
| Auto-Done Event — jalan setiap hari jam 02:00
| Event yang sudah Upcoming (DP dibayar, terkonfirmasi) dan tanggal
| berakhirnya sudah lewat otomatis ditandai selesai (Done). Tanggal akhir
| memakai tgl_selesai_event; kalau kosong pakai tgl_mulai_event. Perbandingan
| ketat "< hari ini" supaya event yang masih berlangsung di hari-H tidak
| keburu ditandai selesai. Setelah Done, jadwalnya juga lepas dari deteksi
| bentrok sehingga tanggal & area bisa dipakai lagi.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    $hariIni = now()->toDateString();

    $selesai = Event::where('status_event', Event::STATUS_UPCOMING)
        ->whereRaw('COALESCE(tgl_selesai_event, tgl_mulai_event) < ?', [$hariIni])
        ->get();

    foreach ($selesai as $event) {
        $event->update(['status_event' => Event::STATUS_DONE]);

        $tglAkhir = $event->tgl_selesai_event ?? $event->tgl_mulai_event;
        \Log::info("Event auto-Done: {$event->nama_event} (berakhir {$tglAkhir}).");
    }
})->dailyAt('02:00')->name('event-auto-done')->withoutOverlapping();

/*
|--------------------------------------------------------------------------
| Reminder Pembayaran Invoice — jalan setiap hari jam 08:30
| Mengingatkan klien H-3, H-1, dan hari-H jatuh tempo; lalu sekali lagi pada
| H+1 dan H+7 bila sudah lewat tempo (dibatasi agar tidak mengirim tiap hari).
| Dikirim lewat email + notifikasi in-app di dashboard klien.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    foreach ([3, 1, 0, -1, -7] as $offset) {
        $invoices = \App\Models\Invoice::with('event.client')
            ->where('status', \App\Models\Invoice::STATUS_BELUM)
            ->whereDate('tgl_jatuh_tempo', now()->addDays($offset)->toDateString())
            ->get();

        foreach ($invoices as $inv) {
            $client  = $inv->event?->client;
            $nama    = $inv->event?->nama_event ?? 'acara Anda';
            $nominal = 'Rp ' . number_format((float) $inv->nominal, 0, ',', '.');
            $tempo   = optional($inv->tgl_jatuh_tempo)->translatedFormat('d F Y');
            $lewat   = $offset < 0;

            $judul = $lewat ? '⏰ Tagihan Lewat Jatuh Tempo' : '💳 Pengingat Pembayaran';
            $pesan = $lewat
                ? "Invoice {$inv->tipe} untuk \"{$nama}\" sebesar {$nominal} sudah lewat jatuh tempo ({$tempo}). Mohon segera diselesaikan."
                : "Invoice {$inv->tipe} untuk \"{$nama}\" sebesar {$nominal} jatuh tempo pada {$tempo}. Mohon diselesaikan sebelum tanggal tersebut.";

            if ($email = $client?->email_client) {
                try {
                    Mail::raw($pesan . "\n\nTerima kasih.\n— PT Laksamana Muda Bersatu", function ($m) use ($email, $judul) {
                        $m->to($email)->subject($judul . ' — Laksamana Muda');
                    });
                } catch (\Exception $e) {
                    \Log::warning('Email reminder invoice gagal: ' . $e->getMessage());
                }
            }

            if ($client?->id) {
                \App\Models\Notifikasi::create([
                    'judul'        => $judul,
                    'pesan'        => $pesan,
                    'tipe'         => 'invoice',
                    'reference_id' => $inv->id_invoice,
                    'client_id'    => $client->id,
                    'is_read'      => false,
                ]);
            }
        }
    }
})->dailyAt('08:30')->name('invoice-reminder')->withoutOverlapping();

/*
|--------------------------------------------------------------------------
| Prospek Mandek — jalan setiap hari jam 08:15
| Event eksternal yang masih di pipeline (Lead/Negotiation) dan tidak ada
| pergerakan selama 14 atau 30 hari mengingatkan PIC-nya untuk follow up.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    foreach ([14, 30] as $hari) {
        $events = Event::with('pic')
            ->eksternal()
            ->pipeline()
            ->whereDate('updated_at', now()->subDays($hari)->toDateString())
            ->get();

        foreach ($events as $event) {
            $email = $event->pic?->email_pegawai;
            if (! $email) {
                continue;
            }

            $pesan = "Prospek \"{$event->nama_event}\" sudah {$hari} hari tanpa pergerakan "
                   . "(masih di tahap {$event->status_event}).\n\n"
                   . "Mohon ditindaklanjuti — hubungi klien, perbarui penawaran, atau tandai \"Tidak jadi\" "
                   . "di papan Pipeline bila prospek tidak dilanjutkan.\n\n— Sistem Laksamana Muda";

            try {
                Mail::raw($pesan, function ($m) use ($email, $event) {
                    $m->to($email)->subject("⏳ Prospek mandek — {$event->nama_event}");
                });
                \Log::info("Reminder prospek mandek: {$event->nama_event} ({$hari} hari).");
            } catch (\Exception $e) {
                \Log::warning('Email prospek mandek gagal: ' . $e->getMessage());
            }
        }
    }
})->dailyAt('08:15')->name('prospek-mandek')->withoutOverlapping();

/*
|--------------------------------------------------------------------------
| Reminder Deadline Tugas — jalan setiap hari jam 07:30
| Tugas to-do yang belum Done dan deadline-nya besok / hari ini / lewat
| kemarin mengingatkan PIC tugas tersebut.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    foreach ([1, 0, -1] as $offset) {
        $daftar = \App\Models\Tugas::with(['pegawai', 'event'])
            ->where('status_tugas', '!=', 'Done')
            ->whereNotNull('id_pegawai')
            ->whereDate('deadline_tugas', now()->addDays($offset)->toDateString())
            ->get();

        foreach ($daftar as $t) {
            $email = $t->pegawai?->email_pegawai;
            if (! $email) {
                continue;
            }

            $kapan = match (true) {
                $offset < 0  => 'sudah LEWAT deadline (kemarin)',
                $offset === 0 => 'jatuh tempo HARI INI',
                default       => 'jatuh tempo BESOK',
            };

            $pesan = "Tugas \"{$t->nama_tugas}\"" . ($t->kategori ? " ({$t->kategori})" : '')
                   . " untuk event \"" . ($t->event?->nama_event ?? '-') . "\" {$kapan}.\n\n"
                   . "Status saat ini: {$t->status_tugas}. Mohon diselesaikan atau perbarui progresnya "
                   . "di papan To-Do.\n\n— Sistem Laksamana Muda";

            try {
                Mail::raw($pesan, function ($m) use ($email, $t) {
                    $m->to($email)->subject("📌 Deadline tugas — {$t->nama_tugas}");
                });
            } catch (\Exception $e) {
                \Log::warning('Email deadline tugas gagal: ' . $e->getMessage());
            }
        }
    }
})->dailyAt('07:30')->name('tugas-deadline')->withoutOverlapping();
