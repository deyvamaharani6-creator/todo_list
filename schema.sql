-- Schema database Todo List untuk MySQL / Aiven
-- Pilih database yang akan digunakan terlebih dahulu (contoh: defaultdb).
-- Jalankan isi file ini melalui Aiven Query/SQL Editor jika ingin membuat tabel manual.

CREATE TABLE IF NOT EXISTS todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
