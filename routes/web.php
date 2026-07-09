<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Manajemen\DashboardController;
use App\Http\Controllers\Manajemen\EventController;
use App\Http\Controllers\Manajemen\TugasController;
use App\Http\Controllers\Manajemen\ClientController;
use App\Http\Controllers\Manajemen\TransaksiController;
use App\Http\Controllers\EventMarketing\EventController as EMEventController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| SERVE FILE BUKTI PEMBAYARAN (Protected — hanya bisa diakses yg login)
|--------------------------------------------------------------------------
*/
Route::get('/bukti-pembayaran/{filename}', function ($filename) {
    // Cek: harus login sebagai client ATAU pegawai
    if (!Auth::guard('client')->check() && !Auth::guard('pegawai')->check()) {
        abort(403, 'Akses ditolak.');
    }

    // IDOR guard: jika yang mengakses adalah client, pastikan file ini milik mereka.
    // Pegawai (Finance) dibolehkan akses semua bukti — tidak ada batasan role.
    if (Auth::guard('client')->check()) {
        $owned = \App\Models\BuktiPembayaran::where('file_bukti', 'bukti-pembayaran/' . $filename)
            ->where('client_id', Auth::guard('client')->id())
            ->exists();
        if (!$owned) {
            abort(403, 'Akses ditolak.');
        }
    }

    // Cegah path traversal: pastikan path hasil resolusi masih dalam direktori yang benar
    $baseDir   = realpath(storage_path('app/private/bukti-pembayaran'));
    $fullPath  = realpath($baseDir . DIRECTORY_SEPARATOR . $filename);

    if (!$baseDir || !$fullPath || !str_starts_with($fullPath, $baseDir . DIRECTORY_SEPARATOR)) {
        abort(404);
    }

    if (!file_exists($fullPath)) abort(404);

    $mime = mime_content_type($fullPath);
    return response()->file($fullPath, ['Content-Type' => $mime]);
})->name('bukti.serve')->where('filename', '[^/]+');

/*
|--------------------------------------------------------------------------
| SERVE BUKTI TRANSAKSI (Protected — hanya pegawai yang login)
|--------------------------------------------------------------------------
*/
Route::get('/bukti-transaksi/{filename}', function ($filename) {
    if (!Auth::guard('pegawai')->check()) {
        abort(403, 'Akses ditolak.');
    }

    $baseDir  = realpath(storage_path('app/private/bukti-transaksi'));
    $fullPath = $baseDir ? realpath($baseDir . DIRECTORY_SEPARATOR . $filename) : false;

    if (!$baseDir || !$fullPath || !str_starts_with($fullPath, $baseDir . DIRECTORY_SEPARATOR)) {
        abort(404);
    }

    if (!file_exists($fullPath)) abort(404);

    $mime = mime_content_type($fullPath);
    return response()->file($fullPath, ['Content-Type' => $mime]);
})->name('bukti-transaksi.serve')->where('filename', '[^/]+');

/*
|--------------------------------------------------------------------------
| SERVE KONTRAK FILE (Protected — hanya pegawai yang login)
|--------------------------------------------------------------------------
*/
Route::get('/kontrak/{filename}', function ($filename) {
    // Boleh diakses pegawai mana pun, ATAU klien pemilik event kontrak tersebut.
    $isPegawai = Auth::guard('pegawai')->check();
    $isOwner   = Auth::guard('client')->check()
        && \App\Models\Event::where('kontrak_file', $filename)
            ->where('id_client', Auth::guard('client')->id())->exists();
    if (!$isPegawai && !$isOwner) {
        abort(403, 'Akses ditolak.');
    }

    $baseDir  = realpath(storage_path('app/private/kontrak'));
    $fullPath = $baseDir ? realpath($baseDir . DIRECTORY_SEPARATOR . $filename) : false;

    if (!$baseDir || !$fullPath || !str_starts_with($fullPath, $baseDir . DIRECTORY_SEPARATOR)) {
        abort(404);
    }

    if (!file_exists($fullPath)) abort(404);

    // Nama unduhan ramah berdasarkan nama event (file disimpan dgn nama hash).
    $ext   = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION)) ?: 'pdf';
    $event = \App\Models\Event::where('kontrak_file', $filename)->first();
    $namaEvent = $event ? preg_replace('/[^A-Za-z0-9 _-]/', '', $event->nama_event) : null;
    $downloadName = $namaEvent ? "Kontrak - {$namaEvent}.{$ext}" : basename($fullPath);

    // Paksa download (attachment) — lebih andal untuk PDF/DOC/DOCX daripada
    // tampil inline (doc/docx tidak bisa dirender browser).
    return response()->download($fullPath, $downloadName);
})->name('kontrak.serve')->where('filename', '[^/]+');

Route::domain(config('app.backstage_domain'))->group(function () {

    // --- 1. ROUTE PUBLIK (LOGIN) ---
    Route::get('/', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/', [AuthenticatedSessionController::class, 'store']);

    // --- 2. ROUTE TERPROTEKSI ---
    Route::middleware('auth:pegawai')->group(function () {

        // MANAJEMEN Dashboard
        Route::get('/manajemen/dashboard', [DashboardController::class, 'index'])
            ->name('manajemen.dashboard');

        // --- EVENT CRUD (MANAJEMEN) ---
        Route::get('/manajemen/event', [EventController::class, 'index'])
            ->name('manajemen.event.index');
        Route::get('/manajemen/event/create', [EventController::class, 'create'])
            ->name('manajemen.event.create');
        Route::post('/manajemen/event/store', [EventController::class, 'store'])
            ->name('manajemen.event.store');
        Route::get('/manajemen/event/{id}/edit', [EventController::class, 'edit'])
            ->name('manajemen.event.edit');
        Route::put('/manajemen/event/{id}', [EventController::class, 'update'])
            ->name('manajemen.event.update');
        Route::delete('/manajemen/event/{id}', [EventController::class, 'destroy'])
            ->name('manajemen.event.destroy');

        // --- TODO / TUGAS ---
        Route::get('/manajemen/event/{id_event}/todo', [TugasController::class, 'index'])
            ->name('manajemen.todo.index');
        Route::post('/manajemen/event/{id_event}/todo', [TugasController::class, 'store'])
            ->name('manajemen.todo.store');
        Route::put('/manajemen/todo/{id_tugas}', [TugasController::class, 'update'])
            ->name('manajemen.todo.update');
        Route::delete('/manajemen/todo/{id_tugas}', [TugasController::class, 'destroy'])
            ->name('manajemen.todo.destroy');
        Route::get('/manajemen/event/{id_event}/todo-json', function ($id_event) {
            if (\Illuminate\Support\Facades\Auth::guard('pegawai')->user()->posisi_pegawai !== 'Manajemen') {
                abort(403);
            }
            \App\Models\Event::findOrFail($id_event); // pastikan event valid
            return response()->json(\App\Models\Tugas::where('id_event', $id_event)->latest()->take(500)->get());
        })->name('manajemen.todo.json');

        // --- JADWAL ACARA (MANAJEMEN) ---
        Route::get('/manajemen/jadwal-acara', [EventController::class, 'jadwal'])
            ->name('jadwal.index');

        // --- MANAJEMEN: PLANNING EVENT ---
        Route::get('/manajemen/planning', [\App\Http\Controllers\Manajemen\PlanningController::class, 'index'])
            ->name('manajemen.planning.index');
        Route::get('/manajemen/planning/create', [\App\Http\Controllers\Manajemen\PlanningController::class, 'create'])
            ->name('manajemen.planning.create');
        Route::post('/manajemen/planning', [\App\Http\Controllers\Manajemen\PlanningController::class, 'store'])
            ->name('manajemen.planning.store');
        Route::get('/manajemen/planning/{id}', [\App\Http\Controllers\Manajemen\PlanningController::class, 'show'])
            ->whereNumber('id')->name('manajemen.planning.show');
        Route::patch('/manajemen/planning/{id}/finalize', [\App\Http\Controllers\Manajemen\PlanningController::class, 'finalize'])
            ->name('manajemen.planning.finalize');
        Route::get('/manajemen/planning/{id}/edit', [\App\Http\Controllers\Manajemen\PlanningController::class, 'edit'])
            ->whereNumber('id')->name('manajemen.planning.edit');
        Route::put('/manajemen/planning/{id}', [\App\Http\Controllers\Manajemen\PlanningController::class, 'update'])
            ->whereNumber('id')->name('manajemen.planning.update');
        Route::delete('/manajemen/planning/{id}', [\App\Http\Controllers\Manajemen\PlanningController::class, 'destroy'])
            ->whereNumber('id')->name('manajemen.planning.destroy');

        // --- CLIENT ---
        Route::get('/manajemen/client', [ClientController::class, 'index'])
            ->name('manajemen.client.index');
        Route::get('/manajemen/client/create', [ClientController::class, 'create'])
            ->name('manajemen.client.create');
        Route::post('/manajemen/client', [ClientController::class, 'store'])
            ->name('manajemen.client.store');
        Route::get('/manajemen/client/{id}', [ClientController::class, 'show'])
            ->name('manajemen.client.show');
        Route::get('/manajemen/client/{id}/edit', [ClientController::class, 'edit'])
            ->name('manajemen.client.edit');
        Route::put('/manajemen/client/{id}', [ClientController::class, 'update'])
            ->name('manajemen.client.update');
        Route::delete('/manajemen/client/{id}', [ClientController::class, 'destroy'])
            ->name('manajemen.client.destroy');

        // --- TRANSAKSI ---
        Route::get('/manajemen/transaksi', [TransaksiController::class, 'index'])
            ->name('manajemen.transaksi.index');
        Route::post('/manajemen/transaksi', [TransaksiController::class, 'store'])
            ->name('manajemen.transaksi.store');
        Route::delete('/manajemen/transaksi/{id}', [TransaksiController::class, 'destroy'])
            ->name('manajemen.transaksi.destroy');
        Route::post('/manajemen/transaksi/item', [TransaksiController::class, 'storeItem'])
            ->name('manajemen.transaksi.item.store');
        Route::delete('/manajemen/transaksi/item/{id}', [TransaksiController::class, 'destroyItem'])
            ->name('manajemen.transaksi.item.destroy');
        Route::put('/manajemen/transaksi/{id}', [TransaksiController::class, 'update'])
            ->name('manajemen.transaksi.update');
        Route::put('/manajemen/transaksi/item/{id}', [TransaksiController::class, 'updateItem'])
            ->name('manajemen.transaksi.item.update');

        // --- EVALUASI ---
        Route::get('/manajemen/evaluasi', [\App\Http\Controllers\Manajemen\EvaluasiController::class, 'index'])
            ->name('manajemen.evaluasi.index');
        Route::get('/manajemen/evaluasi/pegawai/{id}', [\App\Http\Controllers\Manajemen\EvaluasiController::class, 'pegawai'])
            ->name('manajemen.evaluasi.pegawai');
        Route::get('/manajemen/evaluasi/event/{id}', [\App\Http\Controllers\Manajemen\EvaluasiController::class, 'event'])
            ->name('manajemen.evaluasi.event');
        Route::patch('/manajemen/evaluasi/pegawai/{id}/rehire', [\App\Http\Controllers\Manajemen\EvaluasiController::class, 'updateRehire'])
            ->name('manajemen.evaluasi.rehire');

        // --- MANAJEMEN APPOINTMENT ---
        Route::get('/manajemen/appointment', [\App\Http\Controllers\Manajemen\AppointmentController::class, 'index'])
            ->name('manajemen.appointment.index');

        // --- MANAJEMEN PEGAWAI ---
        Route::get('/manajemen/pegawai', [\App\Http\Controllers\Manajemen\PegawaiController::class, 'index'])
            ->name('manajemen.pegawai.index');
        Route::get('/manajemen/pegawai/create', [\App\Http\Controllers\Manajemen\PegawaiController::class, 'create'])
            ->name('manajemen.pegawai.create');
        Route::post('/manajemen/pegawai', [\App\Http\Controllers\Manajemen\PegawaiController::class, 'store'])
            ->name('manajemen.pegawai.store');
        Route::get('/manajemen/pegawai/{id}/edit', [\App\Http\Controllers\Manajemen\PegawaiController::class, 'edit'])
            ->name('manajemen.pegawai.edit');
        Route::put('/manajemen/pegawai/{id}', [\App\Http\Controllers\Manajemen\PegawaiController::class, 'update'])
            ->name('manajemen.pegawai.update');
        Route::delete('/manajemen/pegawai/{id}', [\App\Http\Controllers\Manajemen\PegawaiController::class, 'destroy'])
            ->name('manajemen.pegawai.destroy');
        Route::patch('/manajemen/pegawai/{id}/note', [\App\Http\Controllers\Manajemen\PegawaiController::class, 'updateNote'])
            ->name('manajemen.pegawai.note');

        // --- NOTIFIKASI ---
        Route::get('/notifikasi', [\App\Http\Controllers\EventMarketing\NotifikasiController::class, 'index'])
            ->name('notifikasi.index');
        Route::post('/notifikasi/read-all', [\App\Http\Controllers\EventMarketing\NotifikasiController::class, 'markAllRead'])
            ->name('notifikasi.read');
        Route::delete('/notifikasi/{id}', [\App\Http\Controllers\EventMarketing\NotifikasiController::class, 'destroy'])
            ->name('notifikasi.destroy');

        // --- PROFILE & LOGOUT ---
        Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
            ->name('logout');
        Route::get('/profile', [ProfileController::class, 'edit'])
            ->name('profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])
            ->name('profile.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])
            ->name('profile.destroy');

        // --- ROLE: EVENT MARKETING DASHBOARD ---
        Route::get('/event-marketing/dashboard', [\App\Http\Controllers\EventMarketing\DashboardController::class, 'index'])
            ->name('event.dashboard');

        // --- EVENT MARKETING: JADWAL ACARA --- ← tambah ini
        Route::get('/event-marketing/jadwal-acara', [EMEventController::class, 'jadwal'])
            ->name('em.jadwal.index');

        // --- EVENT MARKETING: APPOINTMENTS ---
        Route::get('/event-marketing/appointments', [\App\Http\Controllers\EventMarketing\AppointmentController::class, 'index'])
            ->name('em.appointment.index');
        Route::get('/event-marketing/appointments/{id}', [\App\Http\Controllers\EventMarketing\AppointmentController::class, 'show'])
            ->name('em.appointment.show');
        Route::patch('/event-marketing/appointments/{id}/konfirmasi', [\App\Http\Controllers\EventMarketing\AppointmentController::class, 'konfirmasi'])
            ->name('em.appointment.konfirmasi');
        Route::patch('/event-marketing/appointments/{id}/selesai', [\App\Http\Controllers\EventMarketing\AppointmentController::class, 'selesai'])
            ->name('em.appointment.selesai');
        Route::patch('/event-marketing/appointments/{id}/batal', [\App\Http\Controllers\EventMarketing\AppointmentController::class, 'batal'])
            ->name('em.appointment.batal');

        // --- EVENT MARKETING: EVENT CRUD ---
        Route::get('/event-marketing/event', [EMEventController::class, 'index'])
            ->name('em.event.index');
        Route::get('/event-marketing/event/create', [EMEventController::class, 'create'])
            ->name('em.event.create');
        Route::post('/event-marketing/event/store', [EMEventController::class, 'store'])
            ->name('em.event.store');
        Route::get('/event-marketing/event/{id}/edit', [EMEventController::class, 'edit'])
            ->name('em.event.edit');
        Route::put('/event-marketing/event/{id}', [EMEventController::class, 'update'])
            ->name('em.event.update');
        Route::delete('/event-marketing/event/{id}', [EMEventController::class, 'destroy'])
            ->name('em.event.destroy');

        // --- EVENT MARKETING: PLANNING EVENT ---
        Route::get('/event-marketing/planning', [\App\Http\Controllers\EventMarketing\PlanningController::class, 'index'])
            ->name('em.planning.index');
        Route::get('/event-marketing/planning/create', [\App\Http\Controllers\EventMarketing\PlanningController::class, 'create'])
            ->name('em.planning.create');
        Route::post('/event-marketing/planning', [\App\Http\Controllers\EventMarketing\PlanningController::class, 'store'])
            ->name('em.planning.store');
        Route::get('/event-marketing/planning/{id}', [\App\Http\Controllers\EventMarketing\PlanningController::class, 'show'])
            ->whereNumber('id')->name('em.planning.show');
        Route::patch('/event-marketing/planning/{id}/finalize', [\App\Http\Controllers\EventMarketing\PlanningController::class, 'finalize'])
            ->name('em.planning.finalize');
        Route::get('/event-marketing/planning/{id}/edit', [\App\Http\Controllers\EventMarketing\PlanningController::class, 'edit'])
            ->whereNumber('id')->name('em.planning.edit');
        Route::put('/event-marketing/planning/{id}', [\App\Http\Controllers\EventMarketing\PlanningController::class, 'update'])
            ->whereNumber('id')->name('em.planning.update');
        Route::delete('/event-marketing/planning/{id}', [\App\Http\Controllers\EventMarketing\PlanningController::class, 'destroy'])
            ->whereNumber('id')->name('em.planning.destroy');
        Route::get('/event-marketing/transaksi', [\App\Http\Controllers\EventMarketing\TransaksiController::class, 'index'])
        ->name('em.transaksi.index');
        // --- EVENT MARKETING: TODO / TUGAS ---
        Route::get('/event-marketing/event/{id_event}/todo', [\App\Http\Controllers\EventMarketing\TugasController::class, 'index'])
            ->name('em.todo.index');
        Route::post('/event-marketing/event/{id_event}/todo', [\App\Http\Controllers\EventMarketing\TugasController::class, 'store'])
            ->name('em.todo.store');
        Route::put('/event-marketing/todo/{id_tugas}', [\App\Http\Controllers\EventMarketing\TugasController::class, 'update'])
            ->name('em.todo.update');
        Route::delete('/event-marketing/todo/{id_tugas}', [\App\Http\Controllers\EventMarketing\TugasController::class, 'destroy'])
            ->name('em.todo.destroy');
        // --- EVENT MARKETING: CLIENT (CRUD) ---
        Route::get('/event-marketing/client', [\App\Http\Controllers\EventMarketing\ClientViewController::class, 'index'])->name('em.client.index');
        Route::get('/event-marketing/client/create', [\App\Http\Controllers\EventMarketing\ClientViewController::class, 'create'])->name('em.client.create');
        Route::post('/event-marketing/client', [\App\Http\Controllers\EventMarketing\ClientViewController::class, 'store'])->name('em.client.store');
        Route::get('/event-marketing/client/{id}', [\App\Http\Controllers\EventMarketing\ClientViewController::class, 'show'])->name('em.client.show');
        Route::get('/event-marketing/client/{id}/edit', [\App\Http\Controllers\EventMarketing\ClientViewController::class, 'edit'])->name('em.client.edit');
        Route::put('/event-marketing/client/{id}', [\App\Http\Controllers\EventMarketing\ClientViewController::class, 'update'])->name('em.client.update');
        Route::delete('/event-marketing/client/{id}', [\App\Http\Controllers\EventMarketing\ClientViewController::class, 'destroy'])->name('em.client.destroy');
        // --- ROLE: FINANCE ---
        Route::get('/finance/dashboard', [\App\Http\Controllers\Finance\DashboardController::class, 'index'])
            ->name('finance.dashboard');
        Route::get('/finance/jadwal-acara', [\App\Http\Controllers\Finance\EventController::class, 'jadwal'])
            ->name('finance.jadwal.index');
        Route::get('/finance/transaksi', [\App\Http\Controllers\Finance\TransaksiController::class, 'index'])
            ->name('finance.transaksi.index');
        Route::post('/finance/transaksi', [\App\Http\Controllers\Finance\TransaksiController::class, 'store'])
            ->name('finance.transaksi.store');
        Route::put('/finance/transaksi/{id}', [\App\Http\Controllers\Finance\TransaksiController::class, 'update'])
            ->name('finance.transaksi.update');
        Route::delete('/finance/transaksi/{id}', [\App\Http\Controllers\Finance\TransaksiController::class, 'destroy'])
            ->name('finance.transaksi.destroy');
        Route::post('/finance/transaksi/item', [\App\Http\Controllers\Finance\TransaksiController::class, 'storeItem'])
            ->name('finance.transaksi.item.store');
        Route::put('/finance/transaksi/item/{id}', [\App\Http\Controllers\Finance\TransaksiController::class, 'updateItem'])
            ->name('finance.transaksi.item.update');
        Route::delete('/finance/transaksi/item/{id}', [\App\Http\Controllers\Finance\TransaksiController::class, 'destroyItem'])
            ->name('finance.transaksi.item.destroy');
        Route::get('/finance/event', [\App\Http\Controllers\Finance\EventController::class, 'index'])
            ->name('finance.event.index');
        Route::get('/finance/client', [\App\Http\Controllers\Finance\ClientController::class, 'index'])
            ->name('finance.client.index');
        Route::get('/finance/client/{id}', [\App\Http\Controllers\Finance\ClientController::class, 'show'])
            ->name('finance.client.show');
        // --- LAPORAN KEUANGAN ---
        Route::get('/finance/laporan', [\App\Http\Controllers\Finance\LaporanController::class, 'index'])
            ->name('finance.laporan.index');
        Route::get('/finance/laporan/preview', [\App\Http\Controllers\Finance\LaporanController::class, 'preview'])
            ->name('finance.laporan.preview');
        Route::get('/finance/laporan/excel', [\App\Http\Controllers\Finance\LaporanController::class, 'exportExcel'])
            ->name('finance.laporan.excel');

        Route::get('/finance/bukti-pembayaran', [\App\Http\Controllers\Finance\BuktiPembayaranController::class, 'index'])
            ->name('finance.bukti.index');
        // Notifikasi Finance — hanya notifikasi internal (client_id IS NULL),
        // agar notifikasi konfirmasi yang dikirim ke client (client_id IS NOT NULL)
        // tidak ikut muncul di panel Finance.
        Route::get('/finance/notifikasi', function () {
            if (auth('pegawai')->user()->posisi_pegawai !== 'Finance') abort(403);
            $notifikasi = \App\Models\Notifikasi::where('tipe', 'bukti_pembayaran')
                ->whereNull('client_id')
                ->latest()->take(30)->get();
            $unread = \App\Models\Notifikasi::where('tipe', 'bukti_pembayaran')
                ->whereNull('client_id')
                ->where('is_read', false)->count();
            return response()->json(['notifikasi' => $notifikasi, 'unread' => $unread]);
        })->name('finance.notifikasi.index');
        Route::post('/finance/notifikasi/read-all', function () {
            if (auth('pegawai')->user()->posisi_pegawai !== 'Finance') abort(403);
            \App\Models\Notifikasi::where('tipe', 'bukti_pembayaran')
                ->whereNull('client_id')
                ->where('is_read', false)->update(['is_read' => true]);
            return response()->json(['success' => true]);
        })->name('finance.notifikasi.read');
        Route::delete('/finance/notifikasi/{id}', function ($id) {
            if (auth('pegawai')->user()->posisi_pegawai !== 'Finance') abort(403);
            \App\Models\Notifikasi::where('id', $id)
                ->where('tipe', 'bukti_pembayaran')
                ->whereNull('client_id')
                ->delete();
            return response()->json(['success' => true]);
        })->name('finance.notifikasi.destroy');
        Route::patch('/finance/bukti-pembayaran/{id}/verifikasi', [\App\Http\Controllers\Finance\BuktiPembayaranController::class, 'verifikasi'])
            ->name('finance.bukti.verifikasi');
    });
});

/*
|--------------------------------------------------------------------------
| GLOBAL ROUTES
|--------------------------------------------------------------------------
*/
Route::get('/welcome', function () {
    return Inertia::render('Welcome');
});

/*
|--------------------------------------------------------------------------
| CLIENT DOMAIN ROUTES (laksamana.test)
|--------------------------------------------------------------------------
*/
Route::domain(config('app.domain'))->group(function () {

    Route::get('/', [\App\Http\Controllers\Client\HomeController::class, 'index'])
        ->name('client.home');
    Route::get('/events', [\App\Http\Controllers\Client\HomeController::class, 'events'])
        ->name('client.events');

    // ── SEO: sitemap.xml dinamis (halaman publik) ──────────────────────
    Route::get('/sitemap.xml', function () {
        $base    = rtrim(config('seo.url'), '/');
        $lastmod = optional(\App\Models\Event::max('updated_at'))
            ? \Illuminate\Support\Carbon::parse(\App\Models\Event::max('updated_at'))->toAtomString()
            : now()->toAtomString();

        $urls = [
            ['loc' => $base . '/',         'priority' => '1.0', 'freq' => 'weekly',  'lastmod' => $lastmod],
            ['loc' => $base . '/events',   'priority' => '0.8', 'freq' => 'daily',   'lastmod' => $lastmod],
            ['loc' => $base . '/login',    'priority' => '0.3', 'freq' => 'monthly', 'lastmod' => null],
            ['loc' => $base . '/register', 'priority' => '0.3', 'freq' => 'monthly', 'lastmod' => null],
        ];

        $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($urls as $u) {
            $xml .= "  <url>\n";
            $xml .= "    <loc>{$u['loc']}</loc>\n";
            if ($u['lastmod']) {
                $xml .= "    <lastmod>{$u['lastmod']}</lastmod>\n";
            }
            $xml .= "    <changefreq>{$u['freq']}</changefreq>\n";
            $xml .= "    <priority>{$u['priority']}</priority>\n";
            $xml .= "  </url>\n";
        }
        $xml .= '</urlset>';

        return response($xml, 200)->header('Content-Type', 'application/xml');
    })->name('client.sitemap');
    Route::get('/login', [\App\Http\Controllers\Client\AuthController::class, 'showLogin'])
        ->name('client.login');
    Route::post('/login', [\App\Http\Controllers\Client\AuthController::class, 'login']);
    Route::get('/register', [\App\Http\Controllers\Client\AuthController::class, 'showRegister'])
        ->name('client.register');
    Route::post('/register', [\App\Http\Controllers\Client\AuthController::class, 'register']);
    Route::post('/logout', [\App\Http\Controllers\Client\AuthController::class, 'logout'])
        ->name('client.logout');

    // Google OAuth
    Route::get('/auth/google', [\App\Http\Controllers\Client\GoogleAuthController::class, 'redirect'])
        ->name('client.google.redirect');
    Route::get('/auth/google/callback', [\App\Http\Controllers\Client\GoogleAuthController::class, 'callback'])
        ->name('client.google.callback');

    // Forgot / Reset Password
    Route::get('/forgot-password', [\App\Http\Controllers\Client\ForgotPasswordController::class, 'showForgot'])
        ->name('client.forgot-password');
    Route::post('/forgot-password', [\App\Http\Controllers\Client\ForgotPasswordController::class, 'sendLink'])
        ->name('client.forgot-password.send');
    Route::get('/reset-password', [\App\Http\Controllers\Client\ForgotPasswordController::class, 'showReset'])
        ->name('client.reset-password');
    Route::post('/reset-password', [\App\Http\Controllers\Client\ForgotPasswordController::class, 'reset'])
        ->name('client.reset-password.update');

    Route::middleware('auth:client')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\Client\AppointmentController::class, 'index'])
            ->name('client.dashboard');

        // Notifikasi client
        Route::get('/notifikasi', function () {
            $clientId = auth('client')->id();
            $notifikasi = \App\Models\Notifikasi::where('client_id', $clientId)
                ->latest()->take(20)->get();
            $unread = \App\Models\Notifikasi::where('client_id', $clientId)
                ->where('is_read', false)->count();
            return response()->json(['notifikasi' => $notifikasi, 'unread' => $unread]);
        })->name('client.notifikasi.index');

        Route::post('/notifikasi/read-all', function () {
            \App\Models\Notifikasi::where('client_id', auth('client')->id())
                ->where('is_read', false)->update(['is_read' => true]);
            return response()->json(['success' => true]);
        })->name('client.notifikasi.read');

        Route::delete('/notifikasi/{id}', function ($id) {
            \App\Models\Notifikasi::where('id', $id)
                ->where('client_id', auth('client')->id())->delete();
            return response()->json(['success' => true]);
        })->name('client.notifikasi.destroy');
        Route::get('/appointment/create', [\App\Http\Controllers\Client\AppointmentController::class, 'create'])
            ->name('client.appointment.create');
        Route::get('/appointment/slots', [\App\Http\Controllers\Client\AppointmentController::class, 'bookedSlots'])
            ->name('client.appointment.slots');
        Route::post('/appointment', [\App\Http\Controllers\Client\AppointmentController::class, 'store'])
            ->name('client.appointment.store');
        Route::delete('/appointment/{id}', [\App\Http\Controllers\Client\AppointmentController::class, 'destroy'])
            ->name('client.appointment.destroy');

        Route::get('/profile', [\App\Http\Controllers\Client\ProfileController::class, 'index'])
            ->name('client.profile');
        Route::patch('/profile', [\App\Http\Controllers\Client\ProfileController::class, 'update'])
            ->name('client.profile.update');

        Route::post('/bukti-pembayaran', [\App\Http\Controllers\Client\AppointmentController::class, 'uploadBukti'])
            ->name('client.bukti.upload');
        Route::delete('/bukti-pembayaran/{id}', [\App\Http\Controllers\Client\AppointmentController::class, 'deleteBukti'])
            ->name('client.bukti.delete');
    }); // auth:client
}); // domain
