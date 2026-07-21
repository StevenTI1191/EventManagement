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
    // Jeda 1 hari setelah acara berakhir: beri waktu bongkar & konfirmasi
    // lapangan sebelum sistem menyimpulkan apa pun.
    $batas = now()->subDay()->toDateString();

    $lewat = Event::with('pic')
        ->whereIn('status_event', [Event::STATUS_UPCOMING, Event::STATUS_PENYELESAIAN])
        ->whereRaw('COALESCE(tgl_selesai_event, tgl_mulai_event) < ?', [$batas])
        ->get();

    foreach ($lewat as $event) {
        $tugasTuntas = $event->tugasTuntas();
        $lunas       = $event->pembayaranLunas();
        $tglAkhir    = $event->tgl_selesai_event ?? $event->tgl_mulai_event;

        // Benar-benar kelar → baru ditutup.
        if ($tugasTuntas && $lunas) {
            $event->update(['status_event' => Event::STATUS_DONE]);
            \Log::info("Event auto-Done: {$event->nama_event} (berakhir {$tglAkhir}, tugas & pembayaran tuntas).");
            continue;
        }

        // Belum tuntas → masuk/tetap di Penyelesaian, JANGAN ditutup.
        $baruMasuk = $event->status_event !== Event::STATUS_PENYELESAIAN;
        if ($baruMasuk) {
            $event->update(['status_event' => Event::STATUS_PENYELESAIAN]);
        }

        $sisaTugas = $event->tugas()->where('status_tugas', '!=', 'Done')->count();
        $kurang    = [];
        if (! $tugasTuntas) $kurang[] = "{$sisaTugas} tugas belum selesai";
        if (! $lunas)       $kurang[] = 'pembayaran belum lunas';

        \Log::info("Event masuk Penyelesaian: {$event->nama_event} — " . implode(', ', $kurang) . '.');

        // Beri tahu PIC sekali saat pertama masuk Penyelesaian, dan ulangi tiap
        // 7 hari selama masih menggantung agar tidak terlupakan.
        $hariLewat = (int) \Illuminate\Support\Carbon::parse($tglAkhir)->diffInDays(now());
        if ($baruMasuk || $hariLewat % 7 === 0) {
            if ($email = $event->pic?->email_pegawai) {
                $pesan = "Acara \"{$event->nama_event}\" sudah berakhir pada "
                       . \Illuminate\Support\Carbon::parse($tglAkhir)->translatedFormat('d F Y')
                       . ", tetapi belum bisa ditutup karena: " . implode(' dan ', $kurang) . ".\n\n"
                       . "Event ditandai PENYELESAIAN — masih tampil di To-Do-List dan jadwalnya "
                       . "belum dilepas. Mohon dituntaskan; setelah semuanya beres, event otomatis "
                       . "berstatus Done.\n\n— Sistem Laksamana Muda";

                try {
                    Mail::raw($pesan, function ($m) use ($email, $event) {
                        $m->to($email)->subject("🔧 Belum tuntas — {$event->nama_event}");
                    });
                } catch (\Exception $e) {
                    \Log::warning('Email event penyelesaian gagal: ' . $e->getMessage());
                }
            }
        }
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
| Semua kartu yang tampil di papan pipeline dan tidak ada pergerakan selama
| 14 atau 30 hari mengingatkan PIC-nya untuk follow up. Termasuk rencana yang
| sudah menyasar klien tapi belum diajukan — tanpa itu, kartu rencana bisa
| mengendap di kolom Lead tanpa pernah ditegur sistem.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    foreach ([14, 30] as $hari) {
        $events = Event::with('pic')
            ->prospekAktif()
            ->whereDate('updated_at', now()->subDays($hari)->toDateString())
            ->get();

        foreach ($events as $event) {
            $email = $event->pic?->email_pegawai;
            if (! $email) {
                continue;
            }

            // Rencana yang belum diajukan butuh ajakan berbeda dari prospek
            // yang penawarannya sudah berjalan.
            $belumDiajukan = $event->status_event === Event::STATUS_PLANNING;

            $pesan = $belumDiajukan
                ? "Rencana \"{$event->nama_event}\" sudah {$hari} hari menyasar klien tapi belum diajukan.\n\n"
                    . "Bila konsepnya sudah siap, ajukan ke klien dari halaman Planning Event agar masuk "
                    . "pipeline sebagai prospek resmi.\n\n— Sistem Laksamana Muda"
                : "Prospek \"{$event->nama_event}\" sudah {$hari} hari tanpa pergerakan "
                    . "(masih di tahap {$event->status_event}).\n\n"
                    . "Mohon ditindaklanjuti — hubungi klien, perbarui penawaran, atau tandai \"Tidak jadi\" "
                    . "di papan Pipeline bila prospek tidak dilanjutkan.\n\n— Sistem Laksamana Muda";

            try {
                Mail::raw($pesan, function ($m) use ($email, $event, $belumDiajukan) {
                    $awalan = $belumDiajukan ? '💡 Rencana belum diajukan' : '⏳ Prospek mandek';
                    $m->to($email)->subject("{$awalan} — {$event->nama_event}");
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

/*
|--------------------------------------------------------------------------
| Pengingat Follow-up Klien — jalan setiap hari jam 08:00
| Catatan follow-up yang dijadwalkan ulang (tgl_berikutnya) mengingatkan
| pegawai yang mencatatnya. Flag reminder_terkirim memastikan sekali kirim
| saja, dan tetap terkirim walau schedulernya sempat tidak jalan sehari.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    $daftar = \App\Models\ClientFollowUp::with(['pegawai', 'client', 'event'])
        ->where('reminder_terkirim', false)
        ->whereNotNull('tgl_berikutnya')
        ->whereDate('tgl_berikutnya', '<=', now()->toDateString())
        ->get();

    foreach ($daftar as $f) {
        $email = $f->pegawai?->email_pegawai;
        $klien = $f->client?->nama_client ?? 'klien';

        if ($email) {
            $konteks = $f->event
                ? " untuk event \"{$f->event->nama_event}\" (tahap {$f->event->status_event})"
                : '';

            $pesan = "Waktunya follow-up {$klien}{$konteks}.\n\n"
                   . "Catatan terakhir Anda:\n\"{$f->catatan}\"\n\n"
                   . ($f->client?->no_telp_client ? "No. WhatsApp: {$f->client->no_telp_client}\n\n" : '')
                   . "— Sistem Laksamana Muda";

            try {
                Mail::raw($pesan, function ($m) use ($email, $klien) {
                    $m->to($email)->subject("🔔 Waktunya follow-up — {$klien}");
                });
            } catch (\Exception $e) {
                \Log::warning('Email pengingat follow-up gagal: ' . $e->getMessage());
            }
        }

        // Tandai terkirim walau email gagal, agar tidak menumpuk percobaan tiap hari.
        $f->update(['reminder_terkirim' => true]);
    }
})->dailyAt('08:00')->name('followup-reminder')->withoutOverlapping();

/*
|--------------------------------------------------------------------------
| Reminder Technical Meeting & Gladi Resik — jalan setiap hari jam 07:45
| Kedua agenda ini dijadwalkan menjelang hari-H. PIC diingatkan lewat email,
| klien lewat email + notifikasi in-app, pada H-1 dan hari-H agenda tersebut.
| Hanya untuk acara yang masih aktif (Upcoming/Penyelesaian) dan agendanya diisi.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    $agenda = [
        'technical_meeting' => 'Technical Meeting',
        'gladi_resik'       => 'Gladi Resik',
    ];

    foreach ($agenda as $kolom => $label) {
        foreach ([1, 0] as $offset) {
            $events = Event::with(['pic', 'client'])
                ->whereIn('status_event', [Event::STATUS_UPCOMING, Event::STATUS_PENYELESAIAN])
                ->whereNotNull($kolom)
                ->whereDate($kolom, now()->addDays($offset)->toDateString())
                ->get();

            foreach ($events as $event) {
                $kapan  = $offset === 0 ? 'HARI INI' : 'BESOK';
                $jam    = \Illuminate\Support\Carbon::parse($event->{$kolom})->translatedFormat('d F Y, H:i');
                $lokasi = $event->area_event ? " di {$event->area_event}" : '';

                // PIC (pegawai) — koordinasi persiapan tim.
                if ($emailPic = $event->pic?->email_pegawai) {
                    $subjectPic = "📋 {$label} {$kapan} — {$event->nama_event}";
                    $pesanPic   = "Pengingat: {$label} untuk acara \"{$event->nama_event}\" {$kapan} "
                                . "({$jam} WIB){$lokasi}.\n\nMohon pastikan persiapan & kehadiran tim.\n\n— Sistem Laksamana Muda";
                    try {
                        Mail::raw($pesanPic, function ($m) use ($emailPic, $subjectPic) {
                            $m->to($emailPic)->subject($subjectPic);
                        });
                    } catch (\Exception $e) {
                        \Log::warning("Email reminder {$label} (PIC) gagal: " . $e->getMessage());
                    }
                }

                // Klien — email + notifikasi in-app di dashboard.
                if ($client = $event->client) {
                    $pesanKlien = "Pengingat: {$label} untuk acara \"{$event->nama_event}\" dijadwalkan {$kapan} "
                                . "pada {$jam} WIB{$lokasi}.";

                    if ($emailKlien = $client->email_client) {
                        $subjectKlien = "📋 {$label} — {$event->nama_event}";
                        try {
                            Mail::raw($pesanKlien . "\n\nTerima kasih.\n— PT Laksamana Muda Bersatu", function ($m) use ($emailKlien, $subjectKlien) {
                                $m->to($emailKlien)->subject($subjectKlien);
                            });
                        } catch (\Exception $e) {
                            \Log::warning("Email reminder {$label} (klien) gagal: " . $e->getMessage());
                        }
                    }

                    if ($client->id) {
                        \App\Models\Notifikasi::create([
                            'judul'        => "📋 Pengingat {$label}",
                            'pesan'        => $pesanKlien,
                            'tipe'         => 'agenda',
                            'reference_id' => $event->id_event,
                            'client_id'    => $client->id,
                            'is_read'      => false,
                        ]);
                    }
                }
            }
        }
    }
})->dailyAt('07:45')->name('agenda-reminder')->withoutOverlapping();
