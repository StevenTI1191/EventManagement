<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Kaitkan bukti pembayaran ke invoice yang dibayarnya.
 *
 * Sebelumnya bukti hanya menempel di event, sehingga saat sebuah event punya
 * tagihan DP dan Pelunasan sekaligus, Finance tidak bisa memastikan bukti yang
 * masuk itu untuk tagihan yang mana — harus dicocokkan manual dari nominalnya.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bukti_pembayaran', function (Blueprint $table) {
            $table->unsignedBigInteger('id_invoice')->nullable()->after('id_event');
            $table->foreign('id_invoice')
                ->references('id_invoice')->on('invoices')
                ->nullOnDelete();
        });

        $this->cocokkanBuktiLama();
    }

    /**
     * Isi id_invoice untuk bukti yang sudah ada, hanya bila kaitannya tidak
     * ambigu. Tebakan yang salah lebih berbahaya daripada kolom kosong: bukti
     * bisa tercatat melunasi tagihan yang keliru.
     */
    private function cocokkanBuktiLama(): void
    {
        $buktis = DB::table('bukti_pembayaran')
            ->whereNull('id_invoice')
            ->get(['id', 'id_event', 'nominal']);

        foreach ($buktis as $bukti) {
            $invoices = DB::table('invoices')->where('id_event', $bukti->id_event)->get(['id_invoice', 'nominal']);

            if ($invoices->isEmpty()) {
                continue;
            }

            // Satu-satunya invoice event ini — tidak mungkin salah.
            if ($invoices->count() === 1) {
                DB::table('bukti_pembayaran')->where('id', $bukti->id)
                    ->update(['id_invoice' => $invoices->first()->id_invoice]);
                continue;
            }

            // Beberapa invoice: hanya dipakai bila tepat satu yang nominalnya sama.
            $cocok = $invoices->filter(fn ($i) => (float) $i->nominal === (float) $bukti->nominal);

            if ($cocok->count() === 1) {
                DB::table('bukti_pembayaran')->where('id', $bukti->id)
                    ->update(['id_invoice' => $cocok->first()->id_invoice]);
            }
            // Sisanya sengaja dibiarkan kosong untuk dicocokkan manual.
        }
    }

    public function down(): void
    {
        Schema::table('bukti_pembayaran', function (Blueprint $table) {
            $table->dropForeign(['id_invoice']);
            $table->dropColumn('id_invoice');
        });
    }
};
