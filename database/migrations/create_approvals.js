import {pool} from "../connection.js";

export const createApprovalTable = async () => {
  try {
    const create = await pool.query(`CREATE TABLE IF NOT EXISTS approval(
    approval_id SERIAL PRIMARY KEY, 
    request_id BIGINT  NOT NULL REFERENCES requests(request_id), 
    approvers_id BIGINT NOT NULL REFERENCES users(user_id),
    to_be_approved_by VARCHAR DEFAULT 'Local_leader' CHECK (to_be_approved_by IN('Government', 'Local_leader', 'Architect')),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'In_progress')),
    notes TEXT DEFAULT 'Not Yet Reviewed',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
    );
    `);

     console.log("approval table created successfully");
     console.log(create.rowCount);
  } catch (error) {
    console.log(error);
  }
};

