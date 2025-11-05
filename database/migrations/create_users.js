import pool from "../connection.js";

export async function up() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      user_name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      phone_number VARCHAR(255) NOT NULL,
      user_password VARCHAR(255) NOT NULL,
      user_type VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await pool.query(query);
  console.log("✅ users table created successfully");
}

export async function down() {
  await pool.query("DROP TABLE IF EXISTS users;");
  console.log("🗑️ users table dropped successfully");
}
