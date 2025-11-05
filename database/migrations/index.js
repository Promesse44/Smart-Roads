import { up as createUsersTable } from "./create_users.js";

(async () => {
  try {
    await createUsersTable();
    console.log("✅ Migration completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
})();
