import dotenv from "dotenv";
dotenv.config();
import * as users from "./create_users";

export const run = async () => {
  await users.up();
};

run();
