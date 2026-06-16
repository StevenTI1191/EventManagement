# Use Case — Sistem Event Management (Revisi, Total 12 Use Case)

Berdasarkan **Use Case Diagram Revisi (Gambar 3.2.16)** yang memuat 9 use case, ditambahkan **3 use case** sesuai implementasi sehingga total menjadi **12 use case**. Use case boleh lebih dari 9.

## Aktor

| No | Aktor | Deskripsi |
|----|-------|-----------|
| 1 | Tim Event Marketing | Merencanakan & mengelola acara, mendata klien, menyusun to-do, menindaklanjuti permohonan jadwal klien. |
| 2 | Tim Finance | Memantau & mencatat pemasukan, serta memverifikasi bukti pembayaran. |
| 3 | Pihak Manajemen | Memantau performa bisnis dan mengevaluasi kinerja pegawai. |
| 4 | **Klien** | Login untuk mendaftar jadwal meeting & acara, serta mengunggah dan memantau bukti pembayaran event miliknya. |

## Daftar Lengkap 12 Use Case

| ID | Use Case | Aktor | Sumber |
|----|----------|-------|:------:|
| UC-01 | Mendaftarkan Acara | Tim Event Marketing | Diagram |
| UC-02 | Manajemen Klien & Kontrak | Tim Event Marketing | Diagram |
| UC-03 | Menyusun To-Do List Event | Tim Event Marketing | Diagram |
| UC-04 | Melihat Jadwal Acara | Tim Event Marketing | Diagram |
| UC-05 | Memantau Status Pembayaran | Tim Finance | Diagram |
| UC-06 | Mencatat Pemasukan Event | Tim Finance | Diagram |
| UC-07 | Memantau Event & Grafik Performa | Pihak Manajemen | Diagram |
| UC-08 | Mengevaluasi Kinerja Pegawai | Pihak Manajemen | Diagram |
| UC-09 | Mendaftar Jadwal Meeting dan Acara | Klien | Diagram |
| **UC-10** | **Mengunggah Bukti Pembayaran** | **Klien** | **Tambahan** |
| **UC-11** | **Memverifikasi Bukti Pembayaran** | **Tim Finance** | **Tambahan** |
| **UC-12** | **Mengelola Appointment** | **Tim Event Marketing** | **Tambahan** |

> Catatan diagram: tambahkan 3 garis pada Gambar 3.2.16 → Klien–Mengunggah Bukti Pembayaran, Tim Finance–Memverifikasi Bukti Pembayaran, Tim Event Marketing–Mengelola Appointment.

---

## Use Case Description (yang belum ada di proposal)

### UC-09 — Mendaftar Jadwal Meeting dan Acara

| Use Case Name: Mendaftar Jadwal Meeting dan Acara | ID: UC-09 | Importance Level: High |
|---|---|---|

**Actor:** Klien
**Brief Description:** Klien mengajukan permohonan jadwal pertemuan kepada Tim Event Marketing untuk membahas rencana acara, dengan validasi jam kerja dan ketersediaan slot.
**Trigger:** Klien ingin berkonsultasi atau memesan jasa penyelenggaraan acara.
**Relationship:** Association: Klien, Tim Event Marketing · Included use case: -
**Precondition:** Klien sudah login dan profil (nama perusahaan & nomor HP) lengkap.
**Normal Flow:**
1. Klien memilih jenis acara dan mengisi detail (deskripsi, estimasi tamu, estimasi budget).
2. Klien memilih tanggal (Senin–Sabtu, setelah hari ini) dan slot jam tersedia (slot 30 menit, 09:00–16:30).
3. Sistem memvalidasi jam kerja dan memastikan slot tidak bentrok.
4. Klien mengirim; sistem menyimpan permohonan berstatus "Pending".
5. Sistem mengirim email konfirmasi ke Klien dan notifikasi ke Tim Event Marketing.

**Alternate/Exceptional Flows:**
- Jika profil belum lengkap → diarahkan melengkapi profil dulu.
- Jika tanggal hari Minggu / sudah lewat → ditolak.
- Jika slot sudah dipesan → tidak tersedia.
- Jika melebihi batas pengajuan per jam → ditolak (rate limit).

---

### UC-10 — Mengunggah Bukti Pembayaran

| Use Case Name: Mengunggah Bukti Pembayaran | ID: UC-10 | Importance Level: High |
|---|---|---|

**Actor:** Klien
**Brief Description:** Klien mengunggah bukti transfer pembayaran untuk event miliknya agar diverifikasi Tim Finance.
**Trigger:** Klien telah melakukan pembayaran atau cicilan kontrak.
**Relationship:** Association: Klien, Tim Finance · Included use case: -
**Precondition:** Klien sudah login dan memiliki event yang sudah deal (memiliki nilai harga).
**Normal Flow:**
1. Klien memilih event lalu menekan "Upload Bukti".
2. Klien mengunggah file bukti (JPG/PNG/PDF, maks 5MB), mengisi nominal dan keterangan.
3. Sistem memvalidasi file dan menyimpan bukti berstatus "Menunggu".
4. Sistem mengirim notifikasi ke Tim Finance untuk diverifikasi.

**Alternate/Exceptional Flows:**
- Jika ukuran > 5MB atau format tidak didukung → ditolak.
- Klien dapat menghapus bukti selama berstatus "Menunggu".

---

### UC-11 — Memverifikasi Bukti Pembayaran

| Use Case Name: Memverifikasi Bukti Pembayaran | ID: UC-11 | Importance Level: High |
|---|---|---|

**Actor:** Tim Finance
**Brief Description:** Finance memeriksa bukti pembayaran yang diunggah Klien lalu menyetujui atau menolaknya.
**Trigger:** Ada bukti pembayaran baru berstatus "Menunggu".
**Relationship:** Association: Tim Finance, Klien · Included use case: Mencatat Pemasukan Event (UC-06)
**Precondition:** Aktor login sebagai Finance.
**Normal Flow:**
1. Aktor membuka daftar bukti pembayaran.
2. Aktor meninjau file bukti dan nominal.
3. Aktor menekan "Verifikasi" → status bukti menjadi Diverifikasi dan menambah akumulasi pembayaran event.
4. Sistem memberi tahu Klien.

**Alternate/Exceptional Flows:**
- Aktor dapat menolak dengan mengisi alasan (status → Ditolak); Klien diminta mengunggah ulang.

---

### UC-12 — Mengelola Appointment

| Use Case Name: Mengelola Appointment | ID: UC-12 | Importance Level: High |
|---|---|---|

**Actor:** Tim Event Marketing
**Brief Description:** Tim menindaklanjuti permohonan jadwal dari Klien: mengkonfirmasi, menjadwalkan ulang, menandai selesai, atau membatalkan.
**Trigger:** Ada permohonan jadwal (appointment) baru berstatus Pending.
**Relationship:** Association: Tim Event Marketing, Klien · Included use case: -
**Precondition:** Aktor login sebagai Event Marketing.
**Normal Flow:**
1. Aktor membuka detail appointment.
2. Aktor menetapkan tanggal & jam meeting lalu "Konfirmasi" (status → Dikonfirmasi).
3. Bila perlu, aktor menjadwalkan ulang (status → Reschedule).
4. Setelah meeting, aktor menandai "Selesai" (status → Selesai).
5. Sistem mengirim email & notifikasi ke Klien pada tiap perubahan status.

**Alternate/Exceptional Flows:**
- Aktor dapat membatalkan dengan mengisi alasan (status → Dibatalkan).
- Hanya appointment Dikonfirmasi/Reschedule yang dapat ditandai Selesai.
