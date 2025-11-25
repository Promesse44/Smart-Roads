import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
// Quick helper to trim env strings and remove accidental surrounding quotes
// This matches our sanitize logic used in other files (avoid double quotes from Render UI)
const sanitize = (v) => {
  if (typeof v !== "string") return v;
  // trim whitespace and remove surrounding single/double quotes
  return v.trim().replace(/^['\"]|['\"]$/g, "");
};

// Prefer full connection string if provided (Render gives this by default)
const rawConnectionString = process.env.DATABASE_URL || null;
const connectionString = sanitize(rawConnectionString) || null;

// Build poolConfig based on which envs are available
let poolConfig;
if (connectionString) {
  // Using DATABASE_URL, trust Render-provided ssl defaults with rejectUnauthorized set false
  poolConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
} else {
  // Read DB_PORT and parse to number. If parse fails, omit the port (fall back to default behavior)
  const rawPort = process.env.DB_PORT;
  const port = parseInt(sanitize(rawPort), 10);
  poolConfig = {
    // Use sanitized env values to avoid quoted host strings
    host: sanitize(process.env.DB_HOST),
    user: sanitize(process.env.DB_USER),
    password: sanitize(process.env.DB_PASSWORD),
    database: sanitize(process.env.DB_NAME),
    port: Number.isFinite(port) ? port : undefined,
    // Make sure SSL is used for managed Postgres services
    ssl: { require: true, rejectUnauthorized: false },
  };
}

export const pool = new Pool(poolConfig);
export default pool;
