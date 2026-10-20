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
  const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Isi variabel berikut di file .env: ${missing.join(", ")}`);
  }

  pool = mysql.createPool(createDbConfig());
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log("Berhasil terhubung ke MySQL. Tabel todos siap digunakan.");
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// READ: ambil semua tugas
app.get("/api/todos", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, description, is_completed, created_at, updated_at FROM todos ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Gagal mengambil todo:", error.message);
    res.status(500).json({ message: "Gagal mengambil daftar tugas." });
  }
});

// CREATE: tambah tugas
app.post("/api/todos", async (req, res) => {
  const title = cleanText(req.body.title);
  const description = cleanText(req.body.description);
  if (!title) return res.status(400).json({ message: "Nama tugas wajib diisi." });

  try {
    const [result] = await pool.execute(
      "INSERT INTO todos (title, description) VALUES (?, ?)",
      [title, description || null]
    );
    const [rows] = await pool.execute("SELECT * FROM todos WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Gagal menambah todo:", error.message);
    res.status(500).json({ message: "Gagal menambahkan tugas. Periksa koneksi database." });
  }
});

// UPDATE: ubah judul/deskripsi/status
app.put("/api/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  const title = cleanText(req.body.title);
  const description = cleanText(req.body.description);
  const isCompleted = req.body.is_completed === true || req.body.is_completed === 1;

  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "ID tugas tidak valid." });
  if (!title) return res.status(400).json({ message: "Nama tugas wajib diisi." });

  try {
    const [result] = await pool.execute(
      "UPDATE todos SET title = ?, description = ?, is_completed = ? WHERE id = ?",
      [title, description || null, isCompleted, id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Tugas tidak ditemukan." });
    const [rows] = await pool.execute("SELECT * FROM todos WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error("Gagal memperbarui todo:", error.message);
    res.status(500).json({ message: "Gagal memperbarui tugas." });
  }
});

// UPDATE khusus status selesai/belum
app.patch("/api/todos/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const isCompleted = req.body.is_completed === true;
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "ID tugas tidak valid." });

  try {
    const [result] = await pool.execute("UPDATE todos SET is_completed = ? WHERE id = ?", [isCompleted, id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Tugas tidak ditemukan." });
    const [rows] = await pool.execute("SELECT * FROM todos WHERE id = ?", [id]);
    res.json(rows[0]);
  } catch (error) {
    console.error("Gagal mengubah status:", error.message);
    res.status(500).json({ message: "Gagal mengubah status tugas." });
  }
});

// DELETE: hapus tugas
app.delete("/api/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: "ID tugas tidak valid." });

  try {
    const [result] = await pool.execute("DELETE FROM todos WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Tugas tidak ditemukan." });
    res.json({ message: "Tugas berhasil dihapus." });
  } catch (error) {
    console.error("Gagal menghapus todo:", error.message);
    res.status(500).json({ message: "Gagal menghapus tugas." });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Todo List berjalan di http://localhost:${PORT}`));
  })
  .catch((error) => {
    console.error("\nGagal memulai aplikasi:", error.message);
    console.error("Periksa file .env, detail layanan MySQL Aiven, dan sertifikat ca.pem.\n");
    process.exit(1);
  });