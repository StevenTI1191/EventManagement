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
| Pertemuan yang jadwalnya sudah lewat lebih dari 2 hari dan belum ditandai
| Selesai dianggap tidak terjadi, lalu dibatalkan supaya slotnya terlepas.
|
| Dulu penyapu ini hanya menyasar status Dikonfirmasi & Reschedule dan
| mensyaratkan tgl_konfirmasi terisi. Akibatnya permintaan klien yang TIDAK
| PERNAH dikonfirmasi tim tidak pernah kedaluwarsa: statusnya tetap Pending,
| dan karena Pending termasuk STATUS_AKTIF ia terus memegang slot_key sehingga
| jam itu tidak dapat dipakai siapa pun selamanya, sekaligus mengendap di
| daftar kerja Event Marketing. Kini ketiga status aktif ikut disapu, dan
| acuannya jadwal yang BERLAKU — bukan kolom konfirmasi saja.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    // COALESCE pada jamnya: appointment tanpa jam baru dianggap lewat pada
    // akhir hari, bukan langsung pada pukul 00:00.
    $sqlWaktu = 'TIMESTAMP(' . \App\Models\Appointment::SQL_TGL_BERLAKU
        . ", COALESCE(" . \App\Models\Appointment::SQL_JAM_BERLAKU . ", '23:59:59'))";

    $terlewat = \App\Models\Appointment::whereIn('status', \App\Models\Appointment::STATUS_AKTIF)
        ->whereRaw("{$sqlWaktu} < ?", [now()->subDays(2)->format('Y-m-d H:i:s')])
        // Pertemuan pembahasan penawaran dikemudikan alur negosiasinya sendiri:
        // membatalkannya diam-diam akan memutus alur itu di tengah jalan, dan
        // pembahasan yang hasilnya belum dicatat justru sedang ditunggu
        // (lihat penjadwal negosiasi-catat-hasil di bawah).
        ->whereDoesntHave('negosiasi', fn ($n) => $n->berjalan())
        ->get();

    foreach ($terlewat as $appointment) {
        $catatan = $appointment->status === 'Pending'
            ? 'Dibatalkan otomatis: lewat 2 hari dari tanggal yang diminta dan belum dikonfirmasi.'
            : 'Dibatalkan otomatis: lewat 2 hari dari jadwal meeting dan belum ditandai selesai.';

        $appointment->update([
            'status'     => 'Dibatalkan',
            'catatan_em' => $appointment->catatan_em
                ? $appointment->catatan_em . ' | ' . $catatan
                : $catatan,
        ]);

        \Log::info("Appointment #{$appointment->id} dibatalkan otomatis (status {$appointment->getOriginal('status')}, jadwalnya sudah lewat 2 hari).");
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

        // Acaranya sudah lewat, jadi permintaan ganti tanggal yang masih
        // menggantung tidak mungkin lagi dipenuhi — persetujuannya pun akan
        // menolaknya. Ditutup di sini supaya tidak tertinggal sebagai keadaan
        // yang tak seorang pun dapat membereskan: antrean tim sudah tidak
        // memuatnya, sementara dashboard klien akan terus berbunyi "sedang
        // ditinjau" dan menyembunyikan tombol ganti tanggal maupun pembatalan.
        $tertunda = \App\Models\EventReschedule::where('id_event', $event->id_event)
            ->where('status', \App\Models\EventReschedule::STATUS_DIAJUKAN)
            ->update([
                'status'        => \App\Models\EventReschedule::STATUS_DITOLAK,
                'catatan_tolak' => 'Acara sudah berlangsung sebelum permintaan ini ditinjau.',
            ]);

        if ($tertunda) {
            $event->catatJejak('Permintaan ganti tanggal ditutup otomatis — acara sudah berlangsung.');
            \Log::info("Reschedule tertunda ditutup: {$event->nama_event} ({$tertunda} pengajuan).");
        }

        // Benar-benar kelar → baru ditutup. Jejaknya masuk kolom jejak_event
        // supaya terlihat di panel Riwayat halaman detail acara — BUKAN ke
        // note_event, yang ikut tercetak pada PDF penawaran & PDF detail acara
        // yang diunduh klien.
        if ($tugasTuntas && $lunas) {
            $event->update(['status_event' => Event::STATUS_DONE]);
            $event->catatJejak('Otomatis ditandai selesai — tugas & pembayaran telah tuntas.');
            \Log::info("Event auto-Done: {$event->nama_event} (berakhir {$tglAkhir}, tugas & pembayaran tuntas).");
            continue;
        }

        // Belum tuntas → masuk/tetap di Penyelesaian, JANGAN ditutup.
        $sisaTugas = $event->tugas()->where('status_tugas', '!=', 'Done')->count();
        $kurang    = [];
        if (! $tugasTuntas) $kurang[] = "{$sisaTugas} tugas belum selesai";
        if (! $lunas)       $kurang[] = 'pembayaran belum lunas';

        $baruMasuk = $event->status_event !== Event::STATUS_PENYELESAIAN;
        if ($baruMasuk) {
            $event->update(['status_event' => Event::STATUS_PENYELESAIAN]);
            $event->catatJejak('Otomatis masuk Penyelesaian — acara sudah lewat tetapi '
                . implode(' dan ', $kurang) . '.');
        }

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
                    Mail::to($email)->send(new \App\Mail\PesanSistem(
                        judul:    'Acara Belum Dapat Ditutup',
                        subjudul: $event->nama_event,
                        ikon:     '🔧',
                        nada:     'jingga',
                        paragraf: [$pesan],
                        detail:   [
                            'Acara'           => $event->nama_event,
                            'Berakhir'        => \Illuminate\Support\Carbon::parse($tglAkhir)->translatedFormat('d F Y'),
                            'Belum tuntas'    => implode(', ', $kurang),
                            'Status saat ini' => 'Penyelesaian',
                        ],
                        penutup:  'Setelah semuanya beres, acara otomatis berstatus Done.',
                        subjek:   'Belum tuntas — ' . $event->nama_event,
                    ));
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
            // Acara yang sudah dibatalkan tidak ditagih lagi. Pengaman kedua:
            // alur pembatalan sudah menghapus tagihan yang belum dibayar, tapi
            // baris lama yang terlanjur yatim jangan sampai terus mengirim
            // "tagihan lewat jatuh tempo" untuk acara yang sudah batal.
            ->whereHas('event', fn ($q) => $q->where('status_event', '!=', Event::STATUS_BATAL))
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
                    $bank = config('perusahaan.bank');
                    Mail::to($email)->send(new \App\Mail\PesanSistem(
                        judul:    $lewat ? 'Tagihan Lewat Jatuh Tempo' : 'Pengingat Pembayaran',
                        subjudul: $nama,
                        ikon:     $lewat ? '⏰' : '💳',
                        nada:     $lewat ? 'merah' : 'emas',
                        sapaan:   'Halo, ' . ($client?->nama_client ?? 'Klien') . '!',
                        paragraf: [$pesan],
                        sorotan:  'Jumlah yang harus dibayar: ' . $nominal,
                        detail:   [
                            'Acara'         => $nama,
                            'Jenis tagihan' => $inv->tipe,
                            'Jatuh tempo'   => $tempo,
                            'Bank'          => $bank['nama'],
                            'No. Rekening'  => $bank['rekening'],
                            'Atas Nama'     => $bank['atas_nama'],
                        ],
                        penutup:  'Setelah melakukan transfer, mohon unggah bukti pembayaran melalui portal klien agar dapat segera kami verifikasi.',
                        subjek:   $lewat ? 'Tagihan lewat jatuh tempo' : 'Pengingat pembayaran',
                    ));
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
    // Sudah ditegur pada putaran ini — supaya prospek yang melewati kedua
    // ambang sekaligus hanya menerima teguran ambang tertingginya.
    $sudah = [];

    // Ambang terbesar didahulukan agar prospek yang mandek 40 hari menerima
    // teguran "30 hari", bukan "14 hari".
    foreach ([30, 14] as $hari) {
        // Dulu dicocokkan pada tanggal PERSIS. Bila penjadwal tidak berjalan
        // hari itu — server mati, container dibuat ulang, atau deploy — prospek
        // yang jatuh tepat pada hari tersebut tidak akan pernah ditegur sama
        // sekali. Kini yang dipakai adalah "sudah melewati ambang", lalu
        // pengulangannya dijaga kunci sekali-kirim di bawah.
        $events = Event::with('pic')
            ->prospekAktif()
            ->whereDate('updated_at', '<=', now()->subDays($hari)->toDateString())
            ->get();

        foreach ($events as $event) {
            if (isset($sudah[$event->id_event])) {
                continue;
            }

            // Satu ambang satu kali. Kuncinya menyertakan tanggal pergerakan
            // terakhir, jadi prospek yang sempat bergerak lalu mandek lagi tetap
            // bisa ditegur ulang pada ambang yang sama.
            $kunci = "mandek:{$event->id_event}:{$hari}:"
                . optional($event->updated_at)->toDateString();

            if (! \Illuminate\Support\Facades\Cache::add($kunci, true, now()->addDays(120))) {
                continue;
            }

            // Ambang yang lebih rendah ikut ditandai terpakai. Tanpa ini,
            // prospek yang sudah ditegur pada ambang 30 akan ditegur lagi
            // keesokan harinya pada ambang 14 — sebab penjaga $sudah hanya
            // berlaku dalam satu putaran, sedangkan kuncinya per ambang.
            foreach ([14] as $lebihRendah) {
                if ($lebihRendah < $hari) {
                    \Illuminate\Support\Facades\Cache::add(
                        "mandek:{$event->id_event}:{$lebihRendah}:" . optional($event->updated_at)->toDateString(),
                        true, now()->addDays(120));
                }
            }

            $sudah[$event->id_event] = true;

            $email = $event->pic?->email_pegawai;
            if (! $email) {
                \Log::warning("Prospek mandek tanpa email PIC: {$event->nama_event} ({$hari} hari).");
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
                Mail::to($email)->send(new \App\Mail\PesanSistem(
                    judul:    $belumDiajukan ? 'Rencana Belum Diajukan' : 'Prospek Tanpa Pergerakan',
                    subjudul: $event->nama_event,
                    ikon:     $belumDiajukan ? '💡' : '⏳',
                    nada:     $hari >= 30 ? 'merah' : 'jingga',
                    paragraf: [$pesan],
                    sorotan:  'Sudah ' . $hari . ' hari tanpa pergerakan',
                    detail:   [
                        'Acara'    => $event->nama_event,
                        'Tahap'    => $event->status_event,
                        'Nilai'    => 'Rp ' . number_format((float) ($event->deal_harga_event ?? 0), 0, ',', '.'),
                        'Terakhir bergerak' => optional($event->updated_at)->translatedFormat('d F Y'),
                    ],
                    subjek:   ($belumDiajukan ? 'Rencana belum diajukan' : 'Prospek mandek') . ' — ' . $event->nama_event,
                ));
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
                Mail::to($email)->send(new \App\Mail\PesanSistem(
                    judul:    'Tenggat Tugas Mendekat',
                    subjudul: $t->nama_tugas,
                    ikon:     '📌',
                    nada:     'biru',
                    paragraf: [$pesan],
                    detail:   array_filter([
                        'Tugas'    => $t->nama_tugas,
                        'Acara'    => $t->event?->nama_event,
                        'Kategori' => $t->kategori,
                        'Tenggat'  => optional($t->deadline_tugas)
                            ? \Illuminate\Support\Carbon::parse($t->deadline_tugas)->translatedFormat('d F Y') : null,
                        'Status'   => $t->status_tugas,
                        'Progres'  => $t->progress !== null ? $t->progress . '%' : null,
                    ]),
                    subjek:   'Tenggat tugas — ' . $t->nama_tugas,
                ));
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
                Mail::to($email)->send(new \App\Mail\PesanSistem(
                    judul:    'Waktunya Follow-up Klien',
                    subjudul: $klien,
                    ikon:     '🔔',
                    nada:     'emas',
                    paragraf: ['Jadwal follow-up yang Anda tetapkan sudah tiba.'],
                    detail:   array_filter([
                        'Klien'       => $klien,
                        'Acara'       => $f->event?->nama_event,
                        'Tahap'       => $f->event?->status_event,
                        'No. WhatsApp'=> $f->client?->no_telp_client,
                    ]),
                    catatan:  $f->catatan,
                    subjek:   'Waktunya follow-up — ' . $klien,
                ));
            } catch (\Exception $e) {
                \Log::warning('Email pengingat follow-up gagal: ' . $e->getMessage());
            }
        } else {
            // Tidak ada tujuan surel. Kolom email pegawai wajib diisi, jadi
            // keadaan ini praktis hanya muncul ketika pencatatnya SUDAH DIHAPUS
            // — relasi id_pegawai memang dilepas menjadi null, bukan ikut
            // menghapus catatan follow-up-nya. Sebelumnya pengingat itu langsung
            // ditandai terkirim sehingga lenyap tanpa seorang pun tahu. Kini
            // dialihkan ke seluruh Tim Event Marketing agar tetap ditindaklanjuti.
            $konteks = $f->event ? " untuk event \"{$f->event->nama_event}\"" : '';
            $pesan   = "Waktunya follow-up {$klien}{$konteks}, namun pencatatnya "
                     . ($f->pegawai?->nama_pegawai ? "({$f->pegawai->nama_pegawai}) " : '')
                     . "belum memiliki alamat email.\n\n"
                     . "Catatan terakhir:\n\"{$f->catatan}\"\n\n"
                     . ($f->client?->no_telp_client ? "No. WhatsApp: {$f->client->no_telp_client}\n\n" : '')
                     . 'Mohon ada yang menindaklanjuti.';

            foreach (\App\Models\Pegawai::pemegangPeran('EventMarketing')
                        ->whereNotNull('email_pegawai')->pluck('email_pegawai') as $tujuan) {
                try {
                    Mail::to($tujuan)->send(new \App\Mail\PesanSistem(
                        judul:    'Follow-up Tanpa Penanggung Jawab',
                        subjudul: $klien,
                        ikon:     '🔔',
                        nada:     'jingga',
                        paragraf: [$pesan],
                        detail:   array_filter([
                            'Klien'        => $klien,
                            'Acara'        => $f->event?->nama_event,
                            'No. WhatsApp' => $f->client?->no_telp_client,
                        ]),
                        catatan:  $f->catatan,
                        penutup:  'Mohon ada yang menindaklanjuti karena pencatat aslinya tidak dapat dihubungi.',
                        subjek:   'Follow-up tanpa penanggung jawab — ' . $klien,
                    ));
                } catch (\Exception $e) {
                    \Log::warning('Email pengalihan follow-up gagal: ' . $e->getMessage());
                }
            }

            \Log::warning("Follow-up dialihkan ke tim: pencatat tanpa email (klien {$klien}).");
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
                        Mail::to($emailPic)->send(new \App\Mail\PesanSistem(
                            judul:    $label . ' ' . $kapan,
                            subjudul: $event->nama_event,
                            ikon:     '📋',
                            nada:     'biru',
                            paragraf: [$pesanPic],
                            sorotan:  $label . ' ' . $kapan . ' pukul ' . $jam . ' WIB',
                            detail:   array_filter([
                                'Acara'  => $event->nama_event,
                                'Agenda' => $label,
                                'Waktu'  => $kapan . ', ' . $jam . ' WIB',
                                'Lokasi' => trim(str_replace(['di ', '.'], '', $lokasi)) ?: null,
                            ]),
                            penutup:  'Mohon pastikan persiapan dan kehadiran tim.',
                            subjek:   $label . ' ' . $kapan . ' — ' . $event->nama_event,
                        ));
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
                            Mail::to($emailKlien)->send(new \App\Mail\PesanSistem(
                                judul:    $label,
                                subjudul: $event->nama_event,
                                ikon:     '📋',
                                nada:     'emas',
                                sapaan:   'Halo, ' . ($client->nama_client ?? 'Klien') . '!',
                                paragraf: [$pesanKlien],
                                sorotan:  $label . ' ' . $kapan . ' pukul ' . $jam . ' WIB',
                                detail:   array_filter([
                                    'Acara'  => $event->nama_event,
                                    'Agenda' => $label,
                                    'Waktu'  => $kapan . ', ' . $jam . ' WIB',
                                    'Lokasi' => trim(str_replace(['di ', '.'], '', $lokasi)) ?: null,
                                ]),
                                penutup:  'Kami menantikan kehadiran Anda.',
                                subjek:   $label . ' — ' . $event->nama_event,
                            ));
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

/*
|--------------------------------------------------------------------------
| Reminder Hasil Pembahasan Penawaran — jalan setiap hari jam 08:45
| Pembahasan yang jadwalnya sudah lewat tetapi hasilnya belum dicatat Event
| Marketing. Selama menggantung, negosiasinya MENAHAN penawaran yang terpampang
| di portal klien (lihat Event::menungguRevisi()), jadi klien tidak dapat
| menerima maupun menolaknya — pekerjaan satu menit yang bila terlupakan
| menghentikan alur di sisi klien tanpa satu pun pemberitahuan.
| Dikirim saat pertama lewat, lalu diulang tiap 3 hari selama masih menggantung.
|--------------------------------------------------------------------------
*/
Schedule::call(function () {
    $tertunda = \App\Models\EventNegosiasi::with(['event.pic', 'client', 'appointment'])
        ->menungguPencatatan()
        ->get();

    foreach ($tertunda as $negosiasi) {
        $jadwal = $negosiasi->appointment?->jadwalBerlaku();
        if (! $jadwal) {
            continue;
        }

        $waktu = \Illuminate\Support\Carbon::parse($jadwal['tgl'] . ' ' . $jadwal['jam']);
        $hari  = (int) $waktu->copy()->startOfDay()->diffInDays(now()->startOfDay());

        // Hari pertama, lalu tiap 3 hari — cukup untuk mengingatkan tanpa
        // berubah menjadi surel harian yang justru diabaikan.
        if ($hari !== 0 && $hari % 3 !== 0) {
            continue;
        }

        $event = $negosiasi->event;
        $email = $event?->pic?->email_pegawai;
        if (! $email) {
            \Log::warning("Hasil pembahasan tertunda tanpa email PIC: negosiasi #{$negosiasi->id}.");
            continue;
        }

        $klien = $negosiasi->client?->perusahaan_client ?: $negosiasi->client?->nama_client;

        try {
            Mail::to($email)->send(new \App\Mail\PesanSistem(
                judul:    'Hasil Pembahasan Belum Dicatat',
                subjudul: $event->nama_event,
                ikon:     '📝',
                nada:     $hari >= 3 ? 'merah' : 'jingga',
                paragraf: [
                    "Pembahasan penawaran acara \"{$event->nama_event}\" dijadwalkan pada "
                    . $waktu->translatedFormat('l, d F Y') . ' pukul ' . $jadwal['jam']
                    . ', tetapi hasilnya belum dicatat.',
                    'Selama hasilnya belum dicatat, penawaran yang terpampang di portal klien '
                    . 'tetap tertahan — klien tidak dapat menerima maupun menolaknya, dan '
                    . 'penawaran revisi belum dapat diajukan.',
                ],
                sorotan:  $hari === 0 ? 'Pertemuannya sudah berlalu' : 'Sudah ' . $hari . ' hari berlalu',
                detail:   array_filter([
                    'Acara'    => $event->nama_event,
                    'Klien'    => $klien,
                    'Jadwal'   => $waktu->translatedFormat('d F Y H:i'),
                ]),
                penutup:  'Catat hasilnya dari menu Negosiasi Klien. Bila pembahasannya batal '
                    . 'atau tidak dilanjutkan, tutup saja pembahasannya agar penawaran klien terlepas.',
                subjek:   'Hasil pembahasan belum dicatat — ' . $event->nama_event,
            ));
            \Log::info("Reminder hasil pembahasan: negosiasi #{$negosiasi->id} ({$hari} hari).");
        } catch (\Exception $e) {
            \Log::warning('Email hasil pembahasan gagal: ' . $e->getMessage());
        }
    }
})->dailyAt('08:45')->name('negosiasi-catat-hasil')->withoutOverlapping();
