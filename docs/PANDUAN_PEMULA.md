# Panduan Pemula Activity Lab 4.0

Selamat datang! Panduan ini menjelaskan penggunaan Activity Lab pada Windows dan Kali Linux tanpa memerlukan pengalaman pemrograman.

## 1. Persiapan

Pastikan Visual Studio Code sudah terpasang. WakaTime boleh terpasang sebagai extension tambahan untuk melakukan eksperimen observasi event, tetapi tidak wajib.

## 2. Instalasi

**Cara termudah:** buka Extensions → menu tiga titik → Install from VSIX → pilih `activity-lab-synthetic-4.0.0.vsix`.

Jika ingin memakai terminal, buka folder tempat file VSIX disimpan, lalu gunakan salah satu perintah berikut:

Windows PowerShell:

```powershell
code --install-extension .\activity-lab-synthetic-4.0.0.vsix --force
```

Kali Linux:

```bash
code --install-extension ./activity-lab-synthetic-4.0.0.vsix --force
```

Jika `code` tidak ditemukan, pasang VS Code dengan benar atau gunakan metode GUI.

## 3. Menjalankan simulasi

1. Tekan `Ctrl + Shift + P`.
2. Ketik `Activity Lab`.
3. Klik **Activity Lab: Mulai Simulasi**.
4. Pilih **Mode profesi** lalu coba **Data Analyst** atau **AI Engineer**.
5. Masukkan nama proyek opsional, misalnya `Eksperimen Data 2026`. Tekan Enter tanpa mengetik untuk menggunakan nama default.
6. Pilih durasi `15 menit` agar percobaan pertama tetap singkat.
7. Pilih pola `Seimbang 1:1`.
8. Pilih interval `30 detik`.
9. Baca konfirmasi, kemudian klik **Mulai simulasi**.

File baru akan dibuka oleh VS Code. Sesuai pilihan, Activity Lab mengubah file tersebut menggunakan editor API dalam folder khusus.

## 4. Menghentikan dan membaca laporan

Tekan `Ctrl + Shift + P` lalu jalankan **Activity Lab: Hentikan Simulasi**. Kamu juga bisa mengklik area Activity Lab pada status bar.

Laporan tersimpan di `session-report.json`. Di dalamnya terdapat nama proyek, nama mode, nama file, waktu mulai, waktu berhenti, serta jumlah perubahan **simulasi lokal**.

## 5. Mode berjalan sampai dihentikan

Pilih **Jalankan sampai saya hentikan** pada menu durasi. Ingat, sesi dapat berhenti ketika VS Code ditutup atau kuota file tercapai.

## 6. Hapus hasil percobaan jika sudah selesai

Windows: buka `%USERPROFILE%\.vscode-activity-lab` melalui File Explorer.

Linux: buka `~/.vscode-activity-lab` melalui File Manager.

Hentikan sesi dahulu, kemudian hapus hanya folder sesi yang memang tidak dibutuhkan. Menghapus file lokal tidak menghapus data yang mungkin tersimpan pada layanan pihak ketiga.

**© Albatany 2026**
