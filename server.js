require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2/promise");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function createDbConfig() {
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "defaultdb",
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  };

  if (String(process.env.DB_SSL).toLowerCase() === "true") {
    const caPath = process.env.DB_CA_PATH;
    if (caPath && fs.existsSync(path.resolve(caPath))) {
      config.ssl = { ca: fs.readFileSync(path.resolve(caPath), "utf8") };
    } else {
      // Sertifikat CA disarankan untuk verifikasi koneksi Aiven.
      // Jika koneksi gagal, pastikan file ca.pem sudah diunduh dari Aiven.
      config.ssl = { rejectUnauthorized: true };
    }
  }
  return config;
}

let pool;


async function initializeDatabase() {
  const required = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD"
  ];

  const missing = required.filter(
    (key) => !process.env[key]
  );

  if (missing.length) {
    throw new Error(
      `Isi variabel berikut di file .env: ${missing.join(", ")}`
    );
  }

  pool = mysql.createPool(createDbConfig());

  // Tabel 1: categories
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabel 2: todos
  // Jika tabel sudah ada, struktur lamanya tetap dipertahankan.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Tambahkan category_id jika tabel todos sudah ada sebelumnya.
  const [columns] = await pool.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'todos'
      AND COLUMN_NAME = 'category_id'
  `);

  if (columns.length === 0) {
    await pool.query(`
      ALTER TABLE todos
      ADD COLUMN category_id INT NULL
    `);
  }

  // Hubungkan todos dengan categories menggunakan foreign key.
  const [foreignKeys] = await pool.query(`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'todos'
      AND CONSTRAINT_NAME = 'fk_todos_category'
  `);

  if (foreignKeys.length === 0) {
    await pool.query(`
      ALTER TABLE todos
      ADD CONSTRAINT fk_todos_category
      FOREIGN KEY (category_id)
      REFERENCES categories(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL
    `);
  }

  // Masukkan kategori awal jika belum tersedia.
  await pool.query(`
    INSERT IGNORE INTO categories (name)
    VALUES ('Sekolah'), ('Pribadi'), ('Lainnya')
  `);

  console.log(
    "Berhasil terhubung ke MySQL. " +
    "Tabel categories dan todos siap digunakan."
  );
}
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `Todo List berjalan di http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("\nGagal memulai aplikasi:", error.message);
    console.error(
      "Periksa file .env, detail layanan MySQL Aiven, dan sertifikat ca.pem.\n"
    );
    process.exit(1);
  });
