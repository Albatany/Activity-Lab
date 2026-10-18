# Pemecahan Masalah

### Perintah Activity Lab tidak muncul

Pastikan VSIX sudah terinstal, kemudian jalankan **Developer: Reload Window** dari Command Palette. Cari kata `Activity Lab` dan periksa extension dalam panel Extensions.

### VS Code menampilkan file baru tetapi WakaTime tidak bertambah

Itu bukan selalu kesalahan Activity Lab. WakaTime memiliki aturan heartbeat sendiri dan tidak dijamin menerima aktivitas yang dibuat otomatis. Periksa extension resmi WakaTime, status autentikasi, serta dokumentasi debugging. Jangan mencoba memalsukan heartbeat.

### Nama proyek tidak muncul di dashboard

Periksa bahwa `.wakatime-project` di folder sesi berisi nama yang kamu tulis. WakaTime hanya dapat mengaitkannya bila event terkait benar benar direkam. Nama tersebut tidak mengubah riwayat sebelumnya.

### File tiba tiba tidak bertambah

Sesi akan berhenti apabila file percobaan diubah secara manual, kuota terlampaui, muncul error, atau host extension VS Code ditutup. Jalankan `Activity Lab: Lihat Status` untuk memastikan sesi aktif.

### Angka additions / deletions berbeda dengan WakaTime

Penghitung Activity Lab hanya menghitung operasi placeholder secara lokal. WakaTime tidak berkewajiban memakai algoritme hitung yang sama. File JSON diproses sebagai dokumen lengkap agar tetap valid.

### Perintah `code` tidak ditemukan di Windows atau Linux

Gunakan panel **Install from VSIX** pada VS Code. Pada Windows, pastikan VS Code masuk PATH; pada Kali Linux, pastikan pemasangan VS Code menyediakan executable `code`.

### Folder hasil terlalu besar

Hentikan sesi, lalu hapus folder percobaan lama di `.vscode-activity-lab` yang tidak dibutuhkan. Program tidak otomatis menghapus hasil lama untuk menghindari kehilangan laporan.

**© Albatany 2026**
