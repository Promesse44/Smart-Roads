import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
// Defensive: strip accidental surrounding quotes/whitespace from env values.
const sanitize = (v) => {
  if (typeof v !== "string") return v;
  // trim whitespace and remove surrounding single/double quotes
  return v.trim().replace(/^['\"]|['\"]$/g, "");
};

const rawConnectionString = process.env.DATABASE_URL || null;
const connectionString = sanitize(rawConnectionString) || null;

let poolConfig;
if (connectionString) {
  poolConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
} else {
  const rawPort = process.env.DB_PORT;
  const port = parseInt(sanitize(rawPort), 10);
  poolConfig = {
    host: sanitize(process.env.DB_HOST),
    user: sanitize(process.env.DB_USER),
    password: sanitize(process.env.DB_PASSWORD),
    database: sanitize(process.env.DB_NAME),
    port: Number.isFinite(port) ? port : undefined,
    ssl: { require: true, rejectUnauthorized: false },
  };
}

export const pool = new Pool(poolConfig);
export default pool;
