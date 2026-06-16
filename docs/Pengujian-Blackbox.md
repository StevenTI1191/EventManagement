# Pengujian Black-Box — Sistem Event Management (Laksamana Muda)

**Metode:** Black-Box Testing (Equivalence Partitioning & Boundary Value Analysis)
**Tujuan:** Memverifikasi fungsionalitas sistem sesuai use case, tanpa melihat struktur kode internal — pengujian fokus pada input → output.

**Cara mengisi:** Kolom *Hasil Pengujian* diisi saat eksekusi (✅ Sesuai / ❌ Tidak Sesuai). Kolom *Hasil yang Diharapkan* adalah kriteria lulus.

**Aktor:** Client (Pelanggan), Pegawai — Manajemen, Pegawai — Event Marketing (EM), Pegawai — Finance.

---

## 1. Modul Autentikasi Client

### UC-01 — Registrasi Client

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-01.1 | Registrasi data valid | Nama: "Budi Santoso", Email: baru@mail.com, Perusahaan: "PT Maju", No HP: 081234567, Password: "rahasia12" | Registrasi berhasil, otomatis login, diarahkan ke dashboard | |
| TC-01.2 | Email sudah terdaftar | Email yang sudah ada di sistem | Ditolak, pesan "Email ini sudah terdaftar" | |
| TC-01.3 | Nama perusahaan kosong | Perusahaan: (kosong) | Ditolak, pesan "Nama perusahaan wajib diisi" | |
| TC-01.4 | No HP kosong | No HP: (kosong) | Ditolak, field no HP wajib | |
| TC-01.5 | Password < 8 karakter | Password: "abc123" (6) | Ditolak, pesan minimal 8 karakter | |
| TC-01.6 | Password = 8 karakter (batas) | Password: "abcd1234" | Diterima | |
| TC-01.7 | Format email salah | Email: "budi.mail" | Ditolak, format email tidak valid | |
| TC-01.8 | Format no HP salah | No HP: "abcd!!" | Ditolak, "Format nomor HP tidak valid" | |

### UC-02 — Login Client

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-02.1 | Login valid | Email & password benar | Berhasil masuk ke dashboard client | |
| TC-02.2 | Password salah | Password keliru | Ditolak, pesan kredensial salah | |
| TC-02.3 | Email tidak terdaftar | Email belum ada | Ditolak | |
| TC-02.4 | Field kosong | Email & password kosong | Validasi wajib isi | |
| TC-02.5 | Login via Google | Klik "Masuk dengan Google" | Redirect OAuth Google → kembali login sukses | |

### UC-03 — Lupa & Reset Password

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-03.1 | Minta reset email terdaftar | Email valid | Email berisi link reset terkirim | |
| TC-03.2 | Minta reset email tak terdaftar | Email asal | Tetap tampil pesan netral (tidak bocorkan keberadaan akun) | |
| TC-03.3 | Reset dengan token valid | Password baru valid | Password berhasil diubah, bisa login dgn password baru | |
| TC-03.4 | Reset token kedaluwarsa | Token lama | Ditolak | |

---

## 2. Modul Profil & Appointment (Client)

### UC-04 — Lengkapi Profil

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-04.1 | Update profil lengkap | Perusahaan & No HP diisi | Tersimpan, banner "lengkapi profil" hilang | |
| TC-04.2 | Simpan tanpa perusahaan | Perusahaan kosong | Ditolak, "Nama perusahaan wajib diisi" | |
| TC-04.3 | Akun Google belum lengkap klik Buat Appointment | Profil tanpa perusahaan/HP | Diarahkan ke halaman Profil + pesan lengkapi dulu | |

### UC-05 — Buat Appointment

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-05.1 | Appointment valid | Jenis event, tanggal (besok, Senin–Sabtu), jam slot 10:00 | Berhasil dibuat, status Pending, email konfirmasi terkirim | |
| TC-05.2 | Profil belum lengkap | Perusahaan/HP kosong | Diblokir, diarahkan lengkapi profil | |
| TC-05.3 | Tanggal hari Minggu | Pilih tanggal Minggu | Ditolak, "Hari Minggu libur" | |
| TC-05.4 | Tanggal hari ini / lampau | Pilih tanggal ≤ hari ini | Ditolak, "harus setelah hari ini" | |
| TC-05.5 | Jam di luar jam kerja | (Sistem hanya tampilkan slot 09:00–16:30) | Slot di luar tidak tersedia | |
| TC-05.6 | Slot bentrok | Pilih slot yang sudah dipesan | Slot ditandai "sudah dipesan" & tidak bisa dipilih; backend tolak jika dipaksa | |
| TC-05.7 | Slot batas akhir 16:30 | Pilih 16:30 | Diterima (meeting 30 menit, selesai 17:00) | |
| TC-05.8 | Tidak pilih jam | Jam kosong | Tombol submit nonaktif / ditolak "Pilih jam meeting" | |
| TC-05.9 | Spam appointment | Buat > 5 appointment dalam 1 jam | Ditolak (rate limit) | |

### UC-06 — Kelola Appointment

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-06.1 | Lihat daftar appointment | Buka dashboard | Daftar appointment + status tampil | |
| TC-06.2 | Batalkan appointment | Isi alasan ≥ 5 karakter | Status jadi Dibatalkan, tim dapat notifikasi | |
| TC-06.3 | Batalkan tanpa alasan | Alasan kosong | Ditolak (wajib alasan) | |

### UC-07 — Upload Bukti Pembayaran

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-07.1 | Upload bukti valid | File JPG/PNG/PDF ≤ 5MB | Tersimpan, status "Menunggu", Finance dapat notifikasi | |
| TC-07.2 | File > 5MB | File 6MB | Ditolak | |
| TC-07.3 | Format tidak didukung | File .exe / .docx | Ditolak | |
| TC-07.4 | Hapus bukti status Menunggu | Klik hapus | Terhapus | |
| TC-07.5 | Lihat tab Pembayaran | Buka tab Pembayaran | Ringkasan tagihan/terbayar/sisa + riwayat bukti tampil | |

---

## 3. Modul Event Marketing (EM)

### UC-08 — Konfirmasi / Reschedule / Batal Appointment

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-08.1 | Konfirmasi appointment Pending | Isi tgl & jam konfirmasi | Status → Dikonfirmasi, email + notifikasi ke client | |
| TC-08.2 | Reschedule | Centang reschedule + jadwal baru | Status → Reschedule, client diberi tahu | |
| TC-08.3 | Tandai selesai (Dikonfirmasi) | Klik Tandai Selesai | Status → Selesai | |
| TC-08.4 | Tandai selesai (Reschedule) | Klik Tandai Selesai pada appointment Reschedule | Status → Selesai (tidak 404) | |
| TC-08.5 | Batalkan oleh EM | Isi catatan ≥ 5 karakter | Status → Dibatalkan, email ke client | |
| TC-08.6 | Tandai selesai appointment Pending | (belum dikonfirmasi) | Ditolak (state tidak valid) | |

### UC-09 — Kelola Event (CRUD)

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-09.1 | Tambah event valid | Semua field wajib + poster ≤ 10MB | Event tersimpan, poster tampil | |
| TC-09.2 | Poster > 10MB | File 12MB | Ditolak, "melebihi batas 10 MB" | |
| TC-09.3 | Poster format salah | File .pdf sbg poster | Ditolak, "format tidak didukung" | |
| TC-09.4 | Kontrak > 5MB | File 6MB | Ditolak | |
| TC-09.5 | Jadwal bentrok | Tgl, jam, area sama dgn event lain | Ditolak, pesan bentrok | |
| TC-09.6 | Sifat acara Privat | Set Privat | Event TIDAK tampil di homepage/halaman event publik | |
| TC-09.7 | Sifat acara Publik | Set Publik | Event tampil di homepage & /events | |
| TC-09.8 | Edit event | Ubah data + simpan | Perubahan tersimpan | |
| TC-09.9 | Download kontrak | Klik download kontrak | File ter-download dengan benar | |

### UC-10 — Filter Event

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-10.1 | Filter kategori | Pilih "Konser" | Hanya event kategori Konser tampil | |
| TC-10.2 | Filter status | Pilih "Done" | Hanya event Done tampil | |
| TC-10.3 | Filter rentang tanggal | Isi tgl awal & akhir | Event dalam rentang tampil | |
| TC-10.4 | Pencarian nama | Ketik nama event | Hasil sesuai kata kunci | |
| TC-10.5 | Recent Event dashboard diklik | Klik event di Recent Events | Modal detail event terbuka | |

---

## 4. Modul Finance

### UC-11 — Verifikasi Bukti Pembayaran

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-11.1 | Verifikasi bukti | Klik Verifikasi | Status bukti → Diverifikasi, progres bayar client bertambah | |
| TC-11.2 | Tolak bukti | Isi alasan tolak | Status → Ditolak, client diberi tahu | |
| TC-11.3 | Notifikasi bukti baru | Client upload bukti | Lonceng notifikasi Finance bertambah | |

### UC-12 — Kelola Transaksi & Laporan

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-12.1 | Tambah transaksi | Nominal, tgl, bukti | Tersimpan | |
| TC-12.2 | Nominal 0 / negatif | Nominal: 0 | Ditolak (min 1) | |
| TC-12.3 | Lihat laporan keuangan | Buka menu Laporan | Ringkasan pemasukan/pengeluaran tampil | |

---

## 5. Modul Manajemen

### UC-13 — Kelola Pegawai

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-13.1 | Tambah pegawai valid | Data + password ≥ 8 karakter | Tersimpan | |
| TC-13.2 | Password < 8 karakter | Password "abc12" | Ditolak, "minimal 8 karakter" | |
| TC-13.3 | Edit pegawai | Ubah data | Tersimpan | |

### UC-14 — Evaluasi Kinerja & Akses

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-14.1 | Beri evaluasi pegawai | Isi penilaian | Tersimpan | |
| TC-14.2 | Akses menu lintas-role | Login Finance buka URL Manajemen | Ditolak (403 Akses Ditolak) | |

---

## 6. Modul Publik & Keamanan

| ID | Skenario | Data / Aksi Input | Hasil yang Diharapkan | Hasil Pengujian |
|----|----------|-------------------|------------------------|-----------------|
| TC-15.1 | Homepage tampilkan event publik | Buka homepage | Hanya event Publik tampil; event Privat tidak | |
| TC-15.2 | Akses dashboard tanpa login | Buka /dashboard tanpa sesi | Diarahkan ke halaman login | |
| TC-15.3 | Akses bukti milik client lain | Ubah ID di URL bukti | Ditolak (403 / 404) — cegah IDOR | |
| TC-15.4 | Tampilan responsif mobile | Buka di layar < 1024px | Sidebar jadi drawer + hamburger berfungsi | |
| TC-15.5 | Email notifikasi terkirim | Trigger (konfirmasi appointment dll) | Email masuk inbox client | |

---

## Ringkasan Pengujian

| Modul | Jumlah Test Case | Lulus | Gagal |
|-------|:----------------:|:-----:|:-----:|
| Autentikasi Client | 17 | | |
| Profil & Appointment | 17 | | |
| Event Marketing | 20 | | |
| Finance | 6 | | |
| Manajemen | 5 | | |
| Publik & Keamanan | 5 | | |
| **Total** | **70** | | |

> Catatan: isi kolom *Lulus/Gagal* dan *Hasil Pengujian* setelah eksekusi pengujian aktual pada lingkungan yang berjalan.
