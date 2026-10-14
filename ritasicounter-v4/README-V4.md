# RitasiCounter V4 — Duplikat Modern

Duplikat `ritasicounter-api-main` dengan tampilan lebih modern dan sistem lebih canggih.
Seluruh API & skema database lama tetap kompatibel (PostgreSQL yang sama bisa dipakai langsung).

## Yang baru di V4

**Tampilan**
- Design system baru (`styles/globals.css`): kartu modern, KPI, dark/light mode, responsif HP → desktop.
- Sidebar navigasi di desktop (232px), topbar ringkas di HP.
- Halaman utama: hero shift + 4 kartu KPI (total rit, jam berjalan, fleet aktif, top material).
- Rekap dikelompokkan **per Fleet** (collapsible) + filter PIT + pencarian — menjawab backlog "rekap per fleet" di PRD lama.
- Indikator **LIVE/SYNC** di topbar (status koneksi realtime).
- Dashboard: kartu KPI + 4 grafik (bucket, per unit, material, tren jam).
- PWA manifest (`/public/manifest.json`), judul & meta SEO di `_app.js`.
- `Combobox.js` ditulis ulang dari nol (file di zip asli kosong/korup sehingga halaman register gagal build).

**Sistem**
- `GET /api/realtime` — **Server-Sent Events**: push rekap tiap 3 detik (satu koneksi, bukan polling buta). Halaman utama & dashboard berlangganan SSE dengan fallback polling otomatis.
- `POST /api/shift/review` — **approval shift eksplisit** oleh pengawas (`approve: true/false`), tercatat di `activity_log` — menjawab backlog approval di PRD lama.
- `GET /api/public-stats` — statistik publik tanpa login (total, unit aktif, per PIT) untuk landing page / TV.
- Semua endpoint lama (`/api/ritasi`, `/api/shift/*`, `/api/dashboard`, `/api/display-data`, export Excel, dsb.) tidak diubah.

## Setup

Sama seperti aplikasi aslinya:

```bash
npm install
npm run build
npm start
```

Env yang dibutuhkan: `DATABASE_URL`, `TZ_NAME` (Asia/Jakarta / Asia/Makassar / Asia/Jayapura), `JWT_SECRET`.
Jalankan `schema.sql` sekali di database baru (opsional — aplikasi juga auto-migrasi via `lib/db.js`).

## Struktur perubahan (vs asli)

```
styles/globals.css            -> ditulis ulang (design system V4)
components/home/Topbar.js     -> ditulis ulang (sidebar + live pill + menu Live TV)
components/Combobox.js        -> BARU (pengganti file korup combobox.js)
hooks/useRealtime.js          -> BARU (SSE + fallback polling)
pages/index.js                -> ditulis ulang (hero, KPI, rekap per fleet, approval)
pages/dashboard.js            -> ditulis ulang (KPI + SSE)
pages/api/realtime.js         -> BARU (SSE)
pages/api/shift/review.js     -> BARU (approval)
pages/api/public-stats.js     -> BARU (statistik publik)
pages/_app.js                 -> judul/meta/manifest
public/manifest.json          -> BARU
```

_File lain disalin apa adanya dari aplikasi asli._
