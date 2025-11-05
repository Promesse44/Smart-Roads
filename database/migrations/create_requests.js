import { pool } from "../connection.js";

export const createRequestsTable = async () => {
  try {
    const sql = `CREATE TABLE IF NOT EXISTS requests(
    request_id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id),
    title VARCHAR(255) NOT NULL,
    address VARCHAR(255), 
    description TEXT NOT NULL,
    photo VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
`;
    const send = await pool.query(sql);

    console.log("requests table created successfully");
    console.log(send.rowCount);
  } catch (error) {
    console.log(error);
  }
};
