# Todo List CRUD — MySQL Aiven

Aplikasi Todo List sederhana untuk tugas CRUD, menggunakan Node.js, Express, JavaScript (frontend), dan MySQL di Aiven.

## Fitur
- **Create:** tambah tugas.
- **Read:** tampilkan semua tugas.
- **Update:** edit nama/deskripsi dan ubah status selesai.
- **Delete:** hapus tugas.
- Filter semua, belum selesai, dan selesai.
- Tabel `todos` dibuat otomatis saat server berhasil terhubung.

## 1. Persiapan
Pastikan Node.js dan npm sudah terpasang. Periksa dengan:

```bash
node -v
npm -v
```

## 2. Siapkan MySQL di Aiven
1. Di Aiven Console, buat service **MySQL** dan tunggu sampai statusnya `Running`.
2. Buka detail koneksi dan salin host, port, user, password, serta nama database.
3. Unduh **CA certificate** dari halaman layanan MySQL. Simpan di folder utama project dengan nama `ca.pem`.
4. Jangan gunakan informasi PostgreSQL (`postgres://` atau host yang diawali `pg-`) untuk project ini. Project ini memakai MySQL.

## 3. Atur file `.env`
Salin `.env.example` menjadi `.env`. Isi nilai dari Aiven:

```env
DB_HOST=host-dari-aiven
DB_PORT=port-dari-aiven
DB_USER=avnadmin
DB_PASSWORD=password-dari-aiven
DB_NAME=defaultdb
DB_SSL=true
DB_CA_PATH=./ca.pem
PORT=3000
```

Nilai di atas hanya contoh nama variabel. Ganti host, port, user, password, dan database dengan detail layanan milikmu. Jangan mengirim file `.env` atau `ca.pem` ke GitHub.

## 4. Install dan jalankan
Buka terminal VS Code di folder project:

```bash
npm install
npm run dev
```

Buka browser ke **http://localhost:3000**.

Untuk menghentikan server, tekan `Ctrl + C` pada terminal.

## 5. Endpoint API
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/todos` | Melihat semua tugas |
| POST | `/api/todos` | Menambah tugas |
| PUT | `/api/todos/:id` | Mengedit tugas |
| PATCH | `/api/todos/:id/status` | Mengubah status selesai |
| DELETE | `/api/todos/:id` | Menghapus tugas |
| GET | `/api/health` | Memeriksa koneksi database |

## 6. Struktur folder
```text
todo_list_aiven/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Catatan jika gagal terhubung
- Pastikan layanan Aiven berstatus `Running`.
- Periksa kembali host, port, user, password, dan database di `.env`.
- Pastikan `ca.pem` ada di folder project dan `DB_CA_PATH=./ca.pem`.
- Jangan mengubah konfigurasi menjadi PostgreSQL; aplikasi ini membutuhkan layanan MySQL.
- Jika muncul `ENOSPC`, kosongkan ruang penyimpanan sebelum menjalankan `npm install`.
