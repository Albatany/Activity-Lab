<div align="center">

# Activity Lab

### Editor Activity Simulator for Visual Studio Code

*Eksplorasi perilaku editor, bahasa pemrograman, dan perubahan file dalam satu lingkungan percobaan.*

![Version](https://img.shields.io/badge/version-4.0.0-334155?style=for-the-badge)
![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-2563eb?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-0f766e?style=for-the-badge)

</div>

---

## About Activity Lab

**Activity Lab** adalah extension Visual Studio Code untuk mensimulasikan perubahan file menggunakan API resmi VS Code. Kamu bisa bereksperimen dengan berbagai profil bahasa, bidang teknologi, nama proyek, durasi, dan pola penambahan atau penghapusan baris.

Dirancang untuk pengguna **Windows** dan **Kali Linux**. Setelah memasang installer VSIX, kamu **tidak perlu** menginstal Python atau Node.js hanya untuk menjalankannya.

> [!IMPORTANT]
> **Ini adalah simulator, bukan pelacak jam coding.** Aktivitas yang dihasilkan bersifat otomatis dan **tidak boleh dianggap sebagai pengalaman profesional, jam kerja nyata, atau bukti produktivitas**. WakaTime maupun extension pelacak lain menentukan sendiri apakah suatu event dihitung. Activity Lab tidak dapat menjamin heartbeat, durasi, additions, atau deletions muncul pada dashboard mana pun.

## What's new in 4.0.0?

| Fitur | Detail |
| :--- | :--- |
| **32 mode teknologi** | Full Stack, Backend, AI Engineer, Data Analyst, Cyber Security, MLOps, Cloud, dan banyak lagi |
| **141 profil bahasa atau file** | Assembly, SQL, Bash, Markdown, Python, TypeScript, Rust, Go, dan lain sebagainya |
| **Nama proyek opsional** | Gunakan nama sendiri melalui file `.wakatime-project` di folder sesi |
| **Nama file variatif** | Contohnya `api_routes_a1b2c3.ts`, `model_training_4e2a1f.py`, `query_report_3a2b1c.sql` |
| **Rasio perubahan** | Seimbang 1:1, penambahan dominan 4:1, atau pertumbuhan tinggi 8:1 |
| **Durasi fleksibel** | Mulai 5 menit hingga 8 jam, atau sampai dihentikan sendiri |
| **Laporan sesi** | Menyimpan perubahan simulasi dan informasi proyek dalam `session-report.json` |
| **Mudah digunakan** | Pilihan interaktif langsung dari Command Palette dalam Bahasa Indonesia |

## Releases and changelog

- [Full changelog: v1.0.0 → v4.0.0](CHANGELOG.md)

**Current version:** `v4.0.0`. The VSIX is available under `release/`; for
public distribution, attach it to the corresponding GitHub Release.

## Quick Installation

### Metode 1: melalui VS Code

1. Unduh [installer Activity Lab v4](release/activity-lab-synthetic-4.0.0.vsix) dari folder `release` atau aset GitHub Releases.
2. Buka **Extensions** di VS Code dengan `Ctrl + Shift + X`.
3. Klik menu **···** lalu pilih **Install from VSIX**.
4. Pilih file `.vsix` dan reload VS Code jika diminta.
5. Buka Command Palette dengan `Ctrl + Shift + P`, lalu cari **Activity Lab: Mulai Simulasi**.

### Method 2: From Terminal

**Windows PowerShell**

```powershell
code --install-extension .\activity-lab-synthetic-4.0.0.vsix --force
```

**Kali Linux**

```bash
code --install-extension ./activity-lab-synthetic-4.0.0.vsix --force
```

> Extension ID tetap `localdev.activity-lab-synthetic` agar dapat memperbarui versi terdahulu. Ini **bukan** extension resmi WakaTime dan belum dipublikasikan di VS Code Marketplace.

## Workflow

1. Buka **Activity Lab: Mulai Simulasi**.
2. Pilih **Bahasa tunggal**, **Mode profesi**, **Katalog bahasa WakaTime**, atau **Bahasa kustom**.
3. Ketik nama proyek jika ingin menentukan namanya, atau kosongkan untuk memakai `ActivityLab Synthetic`.
4. Tentukan batas sesi, pola perubahan baris, dan interval edit.
5. Baca konfirmasi simulasi, kemudian mulai.
6. Klik status bar Activity Lab atau jalankan **Activity Lab: Hentikan Simulasi** untuk berhenti.
7. Lihat hasil lokal dalam `session-report.json`.

### Example

```text
Activity Lab: Mulai Simulasi
    ↓
Mode profesi → Data Analyst
    ↓
Nama proyek → Riset Analitik 2026
    ↓
Durasi → 1 jam
    ↓
Rasio → Penambahan dominan 4:1
    ↓
Interval → 30 detik
    ↓
Konfirmasi → Mulai simulasi
```

### Contoh struktur hasil

```text
session-2026-10-17T12-00-00-000Z-a1b2c3/
├── .wakatime-project
├── TENTANG_SIMULASI.txt
├── model_training_a81c2e.py
├── query_report_3e8f11.sql
├── statistical_report_51a8ba.r
├── research_6a7b8c.csv
└── session-report.json
```

*Nama file dipilih secara acak dan contoh di atas bersifat ilustratif. Ekstensi mengikuti profil bahasa yang tersedia.*

## Mode choice

| Bidang | Mode tersedia |
| :--- | :--- |
| **Pengembangan aplikasi** | Full Stack Developer, Frontend Engineer, Backend Engineer, API Developer, Mobile Developer, Desktop Application Developer, Game Developer, Software QA Engineer |
| **Data dan AI** | Data Analyst, Data Scientist, Data Engineer, Analytics Engineer, AI Engineer, Machine Learning Engineer, MLOps Engineer, Natural Language Processing Engineer, Computer Vision Engineer |
| **Infrastruktur dan keamanan** | Cloud Engineer, DevOps Engineer, Site Reliability Engineer, Cyber Security Analyst, Security Engineer, DevSecOps Engineer, Digital Forensics Researcher, Network Automation Engineer |
| **Sistem dan riset** | Systems Programmer, Embedded Systems Engineer, Robotics Developer, Blockchain Developer, Database Engineer, Scientific Computing Researcher, Technical Writer |

Mode profesi adalah **tema pilihan bahasa dan file** untuk eksperimen. Memilih mode tertentu tidak berarti penggunanya memiliki keterampilan atau jabatan tersebut.

## ◇ Kompatibilitas pencatat aktivitas

Activity Lab menggunakan `workspace.applyEdit()` dan penyimpanan dokumen melalui API VS Code. Akibatnya, extension lain **mungkin dapat mengamati event perubahan dokumen** jika mereka berlangganan event terkait.

Namun setiap extension memiliki aturan masing masing. **Tidak ada jaminan** bahwa WakaTime, Code Time, atau alat statistik lainnya akan mencatat event sintetis sebagai aktivitas kerja. Activity Lab tidak mengintegrasikan, mengendalikan, atau memalsukan heartbeat dari aplikasi eksternal.

**Nama proyek WakaTime.** Pada setiap folder sesi, Activity Lab menulis `.wakatime-project` dengan nama proyek yang kamu masukkan. Menurut dokumentasi WakaTime CLI, file ini dapat menggantikan nama proyek yang dideteksi secara otomatis. Hal itu **tidak** menjamin aktivitas akan tampil dan tidak memengaruhi catatan historis.

Sumber resmi:

* [Panduan deteksi proyek WakaTime](https://github.com/wakatime/wakatime-cli/blob/develop/USAGE.md#project-detection)
* [FAQ WakaTime](https://wakatime.com/faq)
* [WakaTime untuk VS Code](https://wakatime.com/vs-code)
* [VS Code Extension API](https://code.visualstudio.com/api/references/vscode-api)

## Security, privacy, and limit

* File simulasi hanya dibuat dalam `%USERPROFILE%\.vscode-activity-lab\` pada Windows atau `~/.vscode-activity-lab/` pada Linux.
* Program tidak membuka atau mengubah file pada repository pribadimu.
* Jika kamu mengedit file percobaan secara manual, Activity Lab menghentikan sesi untuk melindungi perubahanmu.
* Ukuran dibatasi hingga **2 MB per file** dan **10 MB per sesi**. Mode sampai dihentikan sendiri masih dapat berhenti bila batas ini tercapai, terjadi error, atau VS Code ditutup.
* Tidak meminta kredensial WakaTime. Permintaan jaringan hanya terjadi jika kamu memilih katalog bahasa WakaTime online yang bersifat publik.
* Metadata sesi dan penanda jelas bahwa kontennya adalah simulasi tetap disimpan pada folder hasil.

> [!NOTE]
> Angka `synthetic_additions` dan `synthetic_deletions` pada laporan hanya menghitung operasi internal. Angka ini **bukan** statistik yang sudah diterima atau diverifikasi oleh WakaTime.

## Run from source

Node.js versi 18 atau lebih baru diperlukan **untuk pengujian source**, bukan untuk memakai file `.vsix`.

```bash
npm test
npm run check
```

File penting:

```text
extension.js          Logika sesi dan integrasi VS Code
modes.js              Definisi 32 mode teknologi
fileNaming.js         Nama file acak dan validasi nama proyek
languages.json        Katalog 141 profil bahasa atau file
linePatterns.js       Rasio penambahan dan penghapusan
package.json          Manifest extension VS Code
tests/                Pengujian berbasis mock VS Code
docs/                 Panduan instalasi dan verifikasi
```

## Contribution

Masukan, perbaikan dokumentasi, dan pull request diterima dengan senang hati. Lihat [CONTRIBUTING.md](CONTRIBUTING.md) sebelum berkontribusi.

**© Albatany 2026. All rights reserved except as granted under the MIT License.**

</div>
