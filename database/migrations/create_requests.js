import { pool } from "../connection.js";

export const up = async () => {
  try {
    const sql = `CREATE TABLE requests IF NOT EXISTS(
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    user_password VARCHAR(255) NOT NULL,
    user_type VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
`;
    const send = await pool.query(sql);

    console.log("user table created");
    console.log(send.rowCount);
  } catch (error) {
    console.log(error);
  }
};
