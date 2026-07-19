<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Mail\AppointmentDiterima;
use App\Models\Appointment;
use App\Models\BuktiPembayaran;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Events\AppointmentCreated;
use App\Events\BuktiPembayaranUploaded;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    public function index()
    {
        $client = Auth::guard('client')->user();

        $appointments = Appointment::with('pegawai')
            ->where('client_id', $client->id)
            ->latest()
            ->take(50)
            ->get();

        // Event milik client ini yang sudah terikat komitmen: Deal (menunggu DP),
        // Upcoming (berjalan), dan Done (selesai). Prospek pipeline (Lead/Negotiation)
        // dan event batal tidak ditampilkan. Deal disertakan agar client bisa
        // melihat & mengunduh invoice DP-nya lalu mengunggah bukti pembayaran.
        $events = Event::where('id_client', $client->id)
            ->untukFinance()
            ->with([
                'pic',
                'invoices' => fn($q) => $q->orderBy('tgl_terbit'),
                'buktiPembayaran' => fn($q) => $q->where('client_id', $client->id),
            ])
            ->latest('tgl_mulai_event')
            ->take(50)
            ->get();

        // Penawaran = event eksternal milik client yang masih di tahap Negotiation.
        // Klien bisa melihat detail ringkas + PDF harga, lalu menerima/menolak.
        $penawaran = Event::where('id_client', $client->id)
            ->eksternal()
            ->where('status_event', Event::STATUS_NEGOTIATION)
            ->with('pic:id_pegawai,nama_pegawai')
            ->latest('updated_at')
            ->get();

        // Hitungan acara dipisah tegas. "Total event" sebelumnya menjumlahkan
        // yang sudah selesai dengan yang baru disepakati, jadi angkanya tidak
        // bisa dibaca. Dihitung dari query sendiri, bukan dari $events di atas,
        // karena daftar itu disaring untukFinance() (Deal ke atas) dan dibatasi
        // 50 baris — acara yang masih Lead/Negotiation tidak akan ikut terhitung.
        $milikKlien = fn () => Event::where('id_client', $client->id);

        $praDeal = [Event::STATUS_LEAD, Event::STATUS_NEGOTIATION];
        $proses  = [Event::STATUS_LEAD, Event::STATUS_NEGOTIATION, Event::STATUS_DEAL,
                    Event::STATUS_UPCOMING, Event::STATUS_PENYELESAIAN];

        return Inertia::render('Client/Dashboard', [
            'appointments'      => $appointments,
            'events'            => $events,
            'penawaran'         => $penawaran,
            'totalAppointments' => $appointments->count(),
            'totalEvents'       => $events->count(),
            'eventDone'         => $milikKlien()->where('status_event', Event::STATUS_DONE)->count(),
            'eventProses'       => $milikKlien()->whereIn('status_event', $proses)->count(),
            'eventPraDeal'      => $milikKlien()->whereIn('status_event', $praDeal)->count(),
        ]);
    }

    /**
     * Slot meeting valid: 09:00–16:30, kelipatan 30 menit.
     * Meeting berdurasi 30 menit → slot mulai terakhir 16:30 (selesai 17:00).
     * Dipakai backend (validasi) & frontend (dropdown) agar konsisten.
     */
    public static function workingSlots(): array
    {
        $slots = [];
        for ($m = 9 * 60; $m <= 16 * 60 + 30; $m += 30) {
            $slots[] = sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
        }
        return $slots;
    }

    /** Status appointment yang dianggap "menempati" slot (untuk cek bentrok). */
    private const SLOT_BLOCKING_STATUS = ['Pending', 'Dikonfirmasi', 'Reschedule'];

    /** Validasi: bukan Minggu, jam dalam slot kerja, dan tidak bentrok. */
    private function validateSlot(string $tgl, string $jam): void
    {
        if (\Illuminate\Support\Carbon::parse($tgl)->isSunday()) {
            throw ValidationException::withMessages([
                'tgl_request' => 'Hari Minggu libur. Pilih hari Senin–Sabtu.',
            ]);
        }

        if (! in_array($jam, self::workingSlots(), true)) {
            throw ValidationException::withMessages([
                'jam_request' => 'Pilih jam dalam jam kerja (09:00–16:30, kelipatan 30 menit).',
            ]);
        }

        $bentrok = Appointment::where('tgl_request', $tgl)
            ->where('jam_request', $jam)
            ->whereIn('status', self::SLOT_BLOCKING_STATUS)
            ->exists();

        if ($bentrok) {
            throw ValidationException::withMessages([
                'jam_request' => 'Slot waktu ini sudah dipesan. Silakan pilih jam lain.',
            ]);
        }
    }

    /** JSON: daftar jam yang sudah dipesan pada satu tanggal (untuk disable di dropdown). */
    /**
     * Ketersediaan sebulan penuh: berapa slot sudah terpakai per tanggal.
     *
     * Dipakai kalender pemilih jadwal supaya klien langsung melihat hari mana
     * yang masih longgar tanpa menebak-nebak — satu permintaan untuk sebulan,
     * bukan satu per tanggal.
     */
    public function ketersediaan(Request $request)
    {
        $request->validate(['bulan' => 'required|date_format:Y-m']);

        $awal  = \Illuminate\Support\Carbon::createFromFormat('Y-m', $request->bulan)->startOfMonth();
        $akhir = $awal->copy()->endOfMonth();

        $slotKerja = self::workingSlots();

        $terpakai = Appointment::whereBetween('tgl_request', [$awal->toDateString(), $akhir->toDateString()])
            ->whereIn('status', self::SLOT_BLOCKING_STATUS)
            ->whereNotNull('jam_request')
            ->get(['tgl_request', 'jam_request'])
            // Data lama bisa menyimpan jam di luar jam kerja atau bukan kelipatan
            // 30 menit. Jam seperti itu tidak punya slot yang bisa dipilih klien,
            // jadi menghitungnya sebagai terpakai membuat kalender melaporkan
            // sisa slot lebih sedikit daripada yang sebenarnya bisa dipesan.
            ->filter(fn ($a) => in_array(substr((string) $a->jam_request, 0, 5), $slotKerja, true))
            ->countBy(fn ($a) => \Illuminate\Support\Carbon::parse($a->tgl_request)->toDateString());

        return response()->json([
            'terpakai' => $terpakai,
            'total'    => count(self::workingSlots()),
        ]);
    }

    public function bookedSlots(Request $request)
    {
        $request->validate(['tgl' => 'required|date']);

        $booked = Appointment::where('tgl_request', $request->tgl)
            ->whereIn('status', self::SLOT_BLOCKING_STATUS)
            ->whereNotNull('jam_request')
            ->pluck('jam_request')
            ->map(fn ($t) => substr($t, 0, 5))
            ->values();

        return response()->json(['booked' => $booked]);
    }

    public function create()
    {
        $client = Auth::guard('client')->user();

        // Wajib lengkapi profil (perusahaan + no HP) dulu — terutama akun Google
        // yang otomatis tanpa data ini. Arahkan ke profil sebelum buat appointment.
        if (empty($client->perusahaan_client) || empty($client->no_telp_client)) {
            return redirect()->route('client.profile')
                ->with('warning', 'Lengkapi nama perusahaan dan nomor HP terlebih dahulu sebelum membuat appointment.');
        }

        $hasActive = Appointment::where('client_id', $client->id)
            ->whereIn('status', ['Pending', 'Dikonfirmasi', 'Reschedule'])
            ->exists();

        return Inertia::render('Client/Appointment/Create', [
            'has_active_appointment' => $hasActive,
            'missing_phone'          => empty($client->no_telp_client),
            'missing_company'        => empty($client->perusahaan_client),
            'slots'                  => self::workingSlots(),
        ]);
    }

    public function store(Request $request)
    {
        $client = Auth::guard('client')->user();

        // Rate limiting — maks 5 appointment baru per jam per client
        $rateLimitKey = 'appointment-store:' . $client->id;
        if (RateLimiter::tooManyAttempts($rateLimitKey, 5)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            throw ValidationException::withMessages([
                'jenis_event' => "Terlalu banyak permintaan. Coba lagi dalam {$seconds} detik.",
            ]);
        }
        RateLimiter::hit($rateLimitKey, 3600);

        // Blokir jika nama perusahaan / no HP belum diisi
        if (empty($client->perusahaan_client) || empty($client->no_telp_client)) {
            return back()->withErrors([
                'jenis_event' => 'Lengkapi nama perusahaan dan nomor HP di profil terlebih dahulu.',
            ]);
        }

        $request->validate([
            'jenis_event'     => 'required|string|max:255',
            'deskripsi_event' => 'nullable|string|max:5000',
            'jumlah_tamu'     => 'nullable|integer|min:1|max:100000',
            'estimasi_budget' => 'nullable|numeric|min:0|max:9999999999999',
            'tgl_request'     => ['required', 'date', 'after:today'],
            'jam_request'     => ['required', 'date_format:H:i'],
        ], [
            'tgl_request.after'       => 'Tanggal meeting harus setelah hari ini.',
            'jam_request.required'    => 'Pilih jam meeting.',
            'jam_request.date_format' => 'Format jam tidak valid.',
        ]);

        // Validasi jam kerja (Senin–Sabtu, slot 30 menit 09:00–16:30) + cek bentrok
        $this->validateSlot($request->tgl_request, $request->jam_request);
        $appointment = Appointment::create([
            ...$request->only([
                'jenis_event', 'deskripsi_event', 'jumlah_tamu',
                'estimasi_budget', 'tgl_request', 'jam_request',
            ]),
            'client_id' => $client->id,
            'status'    => 'Pending',
        ]);

        // Load relasi client untuk email
        $appointment->load('client');

        // Kirim email konfirmasi penerimaan ke client
        if ($appointment->client?->email_client) {
            try {
                Mail::to($appointment->client->email_client)
                    ->send(new AppointmentDiterima($appointment));
            } catch (\Exception $e) {
                // Email gagal tidak menghentikan proses — log saja
                \Log::warning('Email AppointmentDiterima gagal: ' . $e->getMessage());
            }
        }

        try {
            broadcast(new AppointmentCreated($appointment))->toOthers();
        } catch (\Exception $e) {
            \Log::warning('Broadcast AppointmentCreated gagal: ' . $e->getMessage());
        }

        return redirect()->route('client.dashboard')
            ->with('success', 'Appointment berhasil dibuat! Tim kami akan segera menghubungi Anda untuk konfirmasi.');
    }

    public function destroy(Request $request, $id)
    {
        $request->validate([
            'alasan' => 'required|string|min:5|max:500',
        ]);

        $appointment = Appointment::where('id', $id)
            ->where('client_id', Auth::guard('client')->id())
            ->whereIn('status', ['Pending', 'Dikonfirmasi', 'Reschedule'])
            ->firstOrFail();

        $appointment->update([
            'status'               => 'Dibatalkan',
            'alasan_batal_client'  => $request->alasan,
        ]);

        return back()->with('success', 'Appointment berhasil dibatalkan.');
    }

    /**
     * Tagihan yang sedang ditunggu pembayarannya untuk sebuah event.
     * Dipakai sebagai cadangan bila klien mengunggah tanpa memilih invoice —
     * mis. dari tautan lama — supaya buktinya tetap punya tujuan yang jelas.
     */
    private function invoiceTertagih($idEvent): ?int
    {
        return \App\Models\Invoice::where('id_event', $idEvent)
            ->where('status', \App\Models\Invoice::STATUS_BELUM)
            ->orderBy('id_invoice')
            ->value('id_invoice');
    }

    public function uploadBukti(Request $request)
    {
        $client = Auth::guard('client')->user();

        // Rate limiting — maks 10 upload per jam per client (mencegah disk flooding)
        $rateLimitKey = 'bukti-upload:' . $client->id;
        if (RateLimiter::tooManyAttempts($rateLimitKey, 10)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            return back()->withErrors([
                'file_bukti' => "Terlalu banyak upload. Coba lagi dalam {$seconds} detik.",
            ]);
        }
        RateLimiter::hit($rateLimitKey, 3600);

        $request->validate([
            // Pastikan event milik client yang login — cegah IDOR
            'id_event'    => ['required', Rule::exists('events', 'id_event')->where('id_client', $client->id)],
            // Invoice yang dibayar harus milik event yang sama, supaya bukti
            // tidak bisa dikaitkan ke tagihan event lain.
            'id_invoice'  => ['nullable', Rule::exists('invoices', 'id_invoice')->where('id_event', $request->id_event)],
            'file_bukti'  => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'nominal'     => 'nullable|numeric|min:0|max:9999999999999',
            'keterangan'  => 'nullable|string|max:500',
        ]);

        $file     = $request->file('file_bukti');
        $filename = $file->hashName();
        Storage::disk('local')->putFileAs('bukti-pembayaran', $file, $filename);
        $path = 'bukti-pembayaran/' . $filename;

        // ── Pembacaan otomatis bukti transfer (OCR, berjalan di server sendiri) ──
        // Perannya menyaring & membantu, bukan memutuskan. Verifikasi akhir tetap
        // di Finance; OCR tidak pernah meloloskan pembayaran secara otomatis.
        $ocr = \App\Support\OcrBukti::baca(Storage::disk('local')->path($path));

        // Konservatif: hanya ditolak bila tidak ada satu pun tanda transaksi
        // (tanpa nominal, tanpa kata kunci transfer). Pesannya mengarahkan
        // klien mengunggah ulang, bukan menuduh.
        if (\App\Support\OcrBukti::bukanBuktiTransfer($ocr)) {
            Storage::disk('local')->delete($path);

            return back()->withErrors([
                'file_bukti' => 'Kami tidak menemukan keterangan transaksi pada gambar ini. '
                    . 'Mohon unggah tangkapan layar atau foto bukti transfer yang jelas — '
                    . 'pastikan nominal dan keterangan transaksinya terbaca.',
            ]);
        }

        $nominalDiisi = $request->nominal ? (float) $request->nominal : null;
        $cocok        = \App\Support\OcrBukti::cocokkanNominal($ocr, $nominalDiisi);
        $ocrNominal   = \App\Support\OcrBukti::nominalUtama($ocr);

        $ocrStatus = match (true) {
            ! $ocr['didukung'] => 'Tidak Dinilai',
            $cocok === true    => 'Cocok',
            $cocok === false   => 'Selisih',
            default            => 'Tidak Terbaca',
        };

        BuktiPembayaran::create([
            'id_event'    => $request->id_event,
            'id_invoice'  => $request->id_invoice ?: $this->invoiceTertagih($request->id_event),
            'client_id'   => $client->id,
            'file_bukti'  => $path,
            'nominal'     => $request->nominal,
            'keterangan'  => $request->keterangan,
            'status'      => 'Menunggu',
            'ocr_nominal' => $ocrNominal,
            'ocr_status'  => $ocrStatus,
            'ocr_teks'    => $ocr['teks'] ?: null,
        ]);

        // Kirim notifikasi ke Finance + broadcast WebSocket
        $event = \App\Models\Event::find($request->id_event);
        $notifikasi = \App\Models\Notifikasi::create([
            'judul'        => 'Bukti Pembayaran Baru',
            'pesan'        => ($client->nama_client ?? 'Client') . ' mengupload bukti pembayaran untuk event "' . ($event?->nama_event ?? '-') . '"' .
                              ($request->nominal ? ' sebesar Rp ' . number_format($request->nominal, 0, ',', '.') : '') . '.',
            'tipe'         => 'bukti_pembayaran',
            'reference_id' => $request->id_event,
            'is_read'      => false,
        ]);
        try {
            BuktiPembayaranUploaded::dispatch($notifikasi);
        } catch (\Exception $e) {
            \Log::warning('Broadcast BuktiPembayaranUploaded gagal: ' . $e->getMessage());
        }

        // Pesan disesuaikan dengan hasil pembacaan — tetap menegaskan bahwa
        // verifikasi Finance yang menentukan.
        $pesan = match ($ocrStatus) {
            'Cocok' => 'Bukti terbaca Rp ' . number_format((float) $ocrNominal, 0, ',', '.')
                     . ' dan cocok dengan nominal yang Anda isi. Menunggu verifikasi Finance.',
            'Selisih' => 'Bukti berhasil diupload. Catatan: nominal yang terbaca sistem Rp '
                     . number_format((float) $ocrNominal, 0, ',', '.')
                     . ' berbeda dari yang Anda isi. Tim Finance akan memeriksanya.',
            default => 'Bukti pembayaran berhasil diupload. Menunggu verifikasi Finance.',
        };

        return back()->with('success', $pesan);
    }

    public function deleteBukti($id)
    {
        $bukti = BuktiPembayaran::where('id', $id)
            ->where('client_id', Auth::guard('client')->id())
            ->where('status', 'Menunggu')
            ->firstOrFail();

        $filePath = $bukti->file_bukti;

        // Hapus DB record dulu — jika gagal, file tetap aman
        $bukti->delete();

        // Hapus file setelah DB sukses — dengan path traversal guard (konsisten dengan operasi file lain)
        if ($filePath) {
            $baseDir  = realpath(storage_path('app/private/bukti-pembayaran'));
            $fullPath = $baseDir ? realpath(storage_path('app/private/' . $filePath)) : false;
            if ($baseDir && $fullPath && str_starts_with($fullPath, $baseDir . DIRECTORY_SEPARATOR)) {
                @unlink($fullPath);
            }
        }

        return back()->with('success', 'Bukti pembayaran berhasil dihapus.');
    }

    /**
     * Unduh PDF invoice milik client sendiri. Dijaga kepemilikan: invoice harus
     * menempel pada event milik client yang sedang login.
     */
    public function downloadInvoice($id_invoice)
    {
        $client = Auth::guard('client')->user();

        $invoice = \App\Models\Invoice::with('event.client')
            ->whereHas('event', fn($q) => $q->where('id_client', $client->id))
            ->findOrFail($id_invoice);

        $event = $invoice->event;

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.invoice', [
            'invoice'       => $invoice,
            'event'         => $event,
            'tglTerbit'     => optional($invoice->tgl_terbit)->translatedFormat('d F Y'),
            'tglJatuhTempo' => optional($invoice->tgl_jatuh_tempo)?->translatedFormat('d F Y'),
            'tglAcara'      => $event->tgl_mulai_event
                ? \Carbon\Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y')
                : '—',
        ]);

        return $pdf->download(
            'Invoice-' . \Illuminate\Support\Str::slug($invoice->nomor_invoice)
            . '-' . \Illuminate\Support\Str::slug($event->nama_event) . '.pdf'
        );
    }

    /**
     * Unduh PDF "Detail Event" milik client sendiri — informasi acara lengkap
     * sekaligus ringkasan tagihan (invoice, sudah dibayar, sisa).
     */
    public function downloadDetailEvent($id_event)
    {
        $client = Auth::guard('client')->user();

        $event = Event::where('id_client', $client->id)
            ->untukFinance()
            ->with(['client', 'pic', 'invoices' => fn($q) => $q->orderBy('tgl_terbit'), 'transaksis'])
            ->findOrFail($id_event);

        $totalDibayar = (float) $event->transaksis->sum('nominal');
        $sisa         = max((float) $event->deal_harga_event - $totalDibayar, 0);

        $jamMulai   = substr((string) $event->jam_mulai, 0, 5);
        $jamSelesai = substr((string) $event->jam_selesai, 0, 5);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.detail-event', [
            'event'        => $event,
            'invoices'     => $event->invoices,
            'totalDibayar' => $totalDibayar,
            'sisa'         => $sisa,
            'tglCetak'     => now()->translatedFormat('d F Y'),
            'tglAcara'     => $event->tgl_mulai_event
                ? \Carbon\Carbon::parse($event->tgl_mulai_event)->translatedFormat('l, d F Y')
                : '—',
            'jam'          => $jamMulai ? ($jamSelesai ? "{$jamMulai} – {$jamSelesai} WIB" : "{$jamMulai} WIB") : null,
        ]);

        return $pdf->download('Detail-Event-' . \Illuminate\Support\Str::slug($event->nama_event) . '.pdf');
    }

    /** Ambil event penawaran milik client sendiri (Negotiation/Deal), atau 404. */
    private function penawaranMilikClient($id_event, array $status)
    {
        $client = Auth::guard('client')->user();

        return Event::eksternal()
            ->where('id_client', $client->id)
            ->whereIn('status_event', $status)
            ->with(['client', 'pic'])
            ->findOrFail($id_event);
    }

    /** Unduh PDF penawaran (harga) milik client sendiri. */
    public function downloadPenawaran($id_event)
    {
        $event = $this->penawaranMilikClient($id_event, [Event::STATUS_NEGOTIATION, Event::STATUS_DEAL]);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.penawaran', [
            'event'    => $event,
            'nomor'    => 'PNW/' . now()->format('Y/m') . '/' . str_pad((string) $event->id_event, 4, '0', STR_PAD_LEFT),
            'tanggal'  => now()->translatedFormat('d F Y'),
            'tglAcara' => \Carbon\Carbon::parse($event->tgl_mulai_event)->translatedFormat('d F Y'),
            'jam'      => substr((string) $event->jam_mulai, 0, 5) . ' – ' . substr((string) $event->jam_selesai, 0, 5) . ' WIB',
        ]);

        return $pdf->download('Penawaran-' . \Illuminate\Support\Str::slug($event->nama_event) . '.pdf');
    }

    /** Klien MENERIMA penawaran → event otomatis pindah ke Deal + notifikasi PIC. */
    public function terimaPenawaran($id_event)
    {
        $event = $this->penawaranMilikClient($id_event, [Event::STATUS_NEGOTIATION]);

        $jejak = '✅ Penawaran DITERIMA klien (' . now()->translatedFormat('d M Y H:i') . ') — otomatis pindah ke Deal.';

        $event->update([
            'status_event'     => Event::STATUS_DEAL,
            'respon_klien'     => 'Diterima',
            'tgl_respon_klien' => now(),
            'note_event'       => $event->note_event ? $event->note_event . ' | ' . $jejak : $jejak,
        ]);

        // Konsisten dengan alur pipeline: appointment terkait ditandai Selesai.
        Appointment::where('id_event', $event->id_event)
            ->whereIn('status', ['Dikonfirmasi', 'Reschedule'])
            ->update(['status' => 'Selesai']);

        $this->kabariPicPenawaran($event, 'diterima');

        return back()->with('success', 'Terima kasih! Penawaran telah Anda terima. Tim kami akan segera menindaklanjuti ke tahap berikutnya (uang muka).');
    }

    /** Klien MENOLAK penawaran → tetap Negotiation, PIC diberi tahu untuk tindak lanjut. */
    public function tolakPenawaran(Request $request, $id_event)
    {
        $data = $request->validate(['alasan' => 'nullable|string|max:500']);

        $event = $this->penawaranMilikClient($id_event, [Event::STATUS_NEGOTIATION]);

        $jejak = '❌ Penawaran DITOLAK klien (' . now()->translatedFormat('d M Y H:i') . ')'
            . (filled($data['alasan'] ?? null) ? ': ' . trim($data['alasan']) : '.');

        $event->update([
            'respon_klien'     => 'Ditolak',
            'tgl_respon_klien' => now(),
            'note_event'       => $event->note_event ? $event->note_event . ' | ' . $jejak : $jejak,
        ]);

        $this->kabariPicPenawaran($event, 'ditolak', $data['alasan'] ?? null);

        return back()->with('success', 'Penawaran telah Anda tolak. Tim kami akan menindaklanjuti.');
    }

    /** Kirim email pemberitahuan jelas ke PIC/EM saat klien merespon penawaran. */
    private function kabariPicPenawaran(Event $event, string $aksi, ?string $alasan = null): void
    {
        $email = $event->pic?->email_pegawai;
        if (! $email) {
            return;
        }

        $nama = $event->nama_event;

        if ($aksi === 'diterima') {
            $subjek = "✅ Penawaran DITERIMA klien — {$nama}";
            $isi = "Kabar baik! Klien telah MENERIMA penawaran untuk event \"{$nama}\".\n\n"
                 . "Event otomatis dipindahkan ke tahap DEAL. Silakan lanjutkan penerbitan invoice uang muka (DP) di modul Finance.\n\n"
                 . "— Sistem Laksamana Muda";
        } else {
            $subjek = "❌ Penawaran DITOLAK klien — {$nama}";
            $isi = "Klien MENOLAK penawaran untuk event \"{$nama}\"."
                 . ($alasan ? "\n\nAlasan dari klien: {$alasan}" : '')
                 . "\n\nEvent masih berada di tahap Negotiation. Silakan tindak lanjuti — negosiasi ulang, "
                 . "atau tandai \"Tidak jadi\" di papan Pipeline bila prospek tidak dilanjutkan.\n\n"
                 . "— Sistem Laksamana Muda";
        }

        try {
            Mail::raw($isi, function ($m) use ($email, $subjek) {
                $m->to($email)->subject($subjek);
            });
        } catch (\Exception $e) {
            \Log::warning('Email respon penawaran ke PIC gagal: ' . $e->getMessage());
        }
    }
}
