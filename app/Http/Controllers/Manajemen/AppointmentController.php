<?php

namespace App\Http\Controllers\Manajemen;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesAppointment;

/**
 * Appointment sisi Manajemen. Logikanya di ManagesAppointment, dipakai bersama
 * agar kedua peran tidak melenceng seperti yang sempat terjadi di Transaksi.
 */
class AppointmentController extends Controller
{
    use ChecksPegawaiRole, ManagesAppointment;

    /** Rute yang dipakai halaman — dikirim agar komponennya bisa dipakai bersama. */
    private function rute(): array
    {
        return [
            'index'          => 'manajemen.appointment.index',
            'show'           => 'manajemen.appointment.show',
            'konfirmasi'     => 'manajemen.appointment.konfirmasi',
            'selesai'        => 'manajemen.appointment.selesai',
            'batal'          => 'manajemen.appointment.batal',
            'catatanMeeting' => 'manajemen.appointment.catatan-meeting',
            'tolakUsulan'    => 'manajemen.appointment.tolak-usulan',
            'hapus'          => 'manajemen.appointment.hapus',
            'buatEvent'      => 'manajemen.event.create',
            'eventIndex'     => 'manajemen.event.index',
        ];
    }

    public function index(Request $request)
    {
        $this->checkManajemen();

        return $this->daftarAppointment($request, 'Manajemen/Appointment/Index', $this->rute());
    }

    public function show($id)
    {
        $this->checkManajemen();

        return $this->detailAppointment($id, 'Manajemen/Appointment/Show', $this->rute());
    }

    public function konfirmasi(Request $request, $id)
    {
        $this->checkManajemen();

        return $this->konfirmasiAppointment($request, $id);
    }

    public function selesai($id)
    {
        $this->checkManajemen();

        return $this->selesaikanAppointment($id);
    }

    public function simpanCatatanMeeting(Request $request, $id)
    {
        $this->checkManajemen();

        return $this->catatanMeetingAppointment($request, $id);
    }

    public function batal(Request $request, $id)
    {
        $this->checkManajemen();

        return $this->batalkanAppointment($request, $id);
    }

    public function tolakUsulan(Request $request, $id)
    {
        $this->checkManajemen();

        return $this->tolakUsulanAppointment($request, $id);
    }

    public function hapus(Request $request, $id)
    {
        $this->checkManajemen();

        $this->hapusAppointment($request, $id);

        return redirect()->route('manajemen.appointment.index')->with('success', 'Appointment dihapus permanen.');
    }
}
