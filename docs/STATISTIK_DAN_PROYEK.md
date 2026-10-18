# Nama Proyek, Event VS Code, dan Statistik Eksternal

## Nama proyek

WakaTime CLI dapat mendeteksi proyek dari file `.wakatime-project`. Activity Lab membuat file ini di root setiap sesi dengan nama yang dimasukkan pengguna. Nama dapat dipakai WakaTime jika aktivitas memenuhi syarat untuk dideteksi dan diproses oleh WakaTime.

Ini **tidak menjamin** munculnya suatu proyek di dashboard dan tidak mengubah nama proyek yang pernah dicatat sebelumnya.

Sumber resmi: https://github.com/wakatime/wakatime-cli/blob/develop/USAGE.md#project-detection

## Event perubahan dan penyimpanan

Activity Lab menggunakan `workspace.applyEdit()` untuk mengubah teks dan `TextDocument.save()` untuk menyimpan file. Extension lain boleh mengamati event dari VS Code sesuai implementasi masing masing. Tidak ada API universal yang memaksa setiap pencatat waktu memperlakukan perubahan sintetis seperti input manusia.

Sumber API VS Code: https://code.visualstudio.com/api/references/vscode-api

## Verifikasi WakaTime secara bertanggung jawab

1. Pastikan extension WakaTime resmi aktif dan sudah terautentikasi.
2. Amati kondisi dashboard sebelum memulai eksperimen singkat.
3. Jalankan satu sesi Activity Lab selama 5 atau 15 menit.
4. Periksa halaman https://wakatime.com/dashboard beberapa saat sesudahnya.
5. Jika tidak terlihat, buka Command Palette lalu pilih `WakaTime: Debug`, aktifkan debugging, dan periksa log sesuai dokumentasi WakaTime.
6. Bandingkan hasil layanan dengan nilai simulasi lokal pada `session-report.json`. Jangan menganggap keduanya sama.

WakaTime mungkin tidak mencatat apa pun, menampilkan nama proyek berbeda, mengklasifikasikan AI atau otomatisasi secara terpisah, atau menampilkan statistik yang berbeda. Activity Lab tidak meminta API key WakaTime maupun mengirim heartbeat langsung.

**Penting:** jangan gunakan aktivitas sintetis sebagai bukti jam kerja atau keterampilan profesional.

Sumber resmi:

* https://wakatime.com/faq
* https://github.com/wakatime/vscode-wakatime
* https://wakatime.com/features

**© Albatany 2026**
