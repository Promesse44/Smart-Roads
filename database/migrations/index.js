import { up as createUsersTable } from "./create_users.js";
import { createRequestsTable } from "./create_requests.js";
import { createApprovalTable } from "./create_approvals.js";

(async () => {
  try {
    await createUsersTable();
    await createRequestsTable();
    await createApprovalTable();
    console.log("Migration completed.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
})();
