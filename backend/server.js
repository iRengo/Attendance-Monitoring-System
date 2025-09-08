// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(cors());
app.use(bodyParser.json());


app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
  
    const tables = [
      { table: "students_acc", idField: "student_id", role: "student" },
      { table: "teachers_acc", idField: "teacher_id", role: "teacher" },
    ];

    for (const t of tables) {
      const result = await pool.query(
        `SELECT * FROM ${t.table} WHERE ${t.idField} = $1 AND password = $2`,
        [username.trim(), password.trim()]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        return res.json({
          success: true,
          message: "Login successful",
          user: { id: user.id, username: user[t.idField], role: t.role },
        });
      }
    }

    // No match in either table
    res.status(401).json({ success: false, message: "Invalid credentials" });

  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
