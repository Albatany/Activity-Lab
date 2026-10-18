# Panduan Singkat Merilis Activity Lab v4.0.0

Panduan lengkap tersedia di [GITHUB_RELEASE_GUIDE.md](GITHUB_RELEASE_GUIDE.md).

## Jika repository GitHub masih versi 1.0.0

1. Ekstrak paket rilis terbaru.
2. Clone repository GitHub lamamu memakai `git clone`.
3. Salin seluruh isi folder `Activity-Lab-GitHub/` ke folder repository clone,
   **tanpa menghapus `.git`**.
4. Periksa perubahan lewat `git status` dan jalankan `npm test`.
5. Commit, push, lalu buat tag `v4.0.0` pada commit v4 yang benar.
6. Buka **GitHub → Releases → Draft a new release**.
7. Pilih tag `v4.0.0`, tempel isi `docs/releases/v4.0.0.md`, dan unggah
   `activity-lab-synthetic-4.0.0.vsix`.
8. Publikasikan dan tandai sebagai release terbaru.

Perintah setelah file disalin (Windows PowerShell atau Kali Linux):

```bash
git status
npm test
npm run check
git add -A
git commit -m "release: Activity Lab v4.0.0"
git push origin HEAD
git tag -a v4.0.0 -m "Activity Lab v4.0.0"
git push origin v4.0.0
```

**Catatan:** Jangan tag versi lama dengan commit v4. Kalau versi 2 dan 3
belum pernah punya commit masing masing, cukup cantumkan riwayatnya di
[CHANGELOG.md](../CHANGELOG.md).

© Albatany 2026
