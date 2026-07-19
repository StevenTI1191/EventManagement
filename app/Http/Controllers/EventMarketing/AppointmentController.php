<?php

namespace App\Http\Controllers\EventMarketing;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Traits\ChecksPegawaiRole;
use App\Traits\ManagesAppointment;

/**
 * Appointment sisi Event Marketing. Logikanya di ManagesAppointment, dipakai bersama
 * agar kedua peran tidak melenceng seperti yang sempat terjadi di Transaksi.
 */
class AppointmentController extends Controller
{
    use ChecksPegawaiRole, ManagesAppointment;

    /** Rute yang dipakai halaman — dikirim agar komponennya bisa dipakai bersama. */
    private function rute(): array
    {
        return [
            'index'          => 'em.appointment.index',
            'show'           => 'em.appointment.show',
            'konfirmasi'     => 'em.appointment.konfirmasi',
            'selesai'        => 'em.appointment.selesai',
            'batal'          => 'em.appointment.batal',
            'catatanMeeting' => 'em.appointment.catatan-meeting',
            'buatEvent'      => 'em.event.create',
        ];
    }

    public function index(Request $request)
    {
        $this->checkEventMarketing();

        return $this->daftarAppointment($request, 'EventMarketing/Appointment/Index', $this->rute());
    }

    public function show($id)
    {
        $this->checkEventMarketing();

        return $this->detailAppointment($id, 'EventMarketing/Appointment/Show', $this->rute());
    }

    public function konfirmasi(Request $request, $id)
    {
        $this->checkEventMarketing();

        return $this->konfirmasiAppointment($request, $id);
    }

    public function selesai($id)
    {
        $this->checkEventMarketing();

        return $this->selesaikanAppointment($id);
    }

    public function simpanCatatanMeeting(Request $request, $id)
    {
        $this->checkEventMarketing();

        return $this->catatanMeetingAppointment($request, $id);
    }

    public function batal(Request $request, $id)
    {
        $this->checkEventMarketing();

        return $this->batalkanAppointment($request, $id);
    }
}
