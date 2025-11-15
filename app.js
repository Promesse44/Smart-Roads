import express from "express";
import cors from "cors";
import pkg from "pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import { pool } from './database/connection.js';
import path, {dirname} from 'path';
import { fileURLToPath } from "url";

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(cors());
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));


const storage = multer.diskStorage({destination: (req, file, cb)=>{
cb(null, 'public/');
}, filename: (req, file, cb)=> {
const ext = path.extname(file.originalname);

const uniqueName = `${Date.now()}${ext}`;
cb(null, uniqueName);
}});

const upload = multer({ storage });

// verify token
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token || token === "null" || token === "undefined") {
    return res.status(403).send("Please login first");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    // req.userId = decoded.userId;
    req.userId = decoded.userId || decoded.id;
    console.log(`Token for user Id: ${req.userId} verified.`);
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

// signup
app.post("/signup", async (req, res) => {
  try {
    const name = req.body.name;
    const email = req.body.email;
    const phone = req.body.phone;
    const password = req.body.password;
    const hash = bcrypt.hashSync(password, 10);
    const role = req.body.role;

    if (!name) {
      res.status(400).json("Name Missing!");
    } else if (!email) {
      res.status(400).json("Email is missing");
    } else if (!phone) {
      res.status(400).json("Phone Number is missing");
    } else if (!password) {
      res.status(400).json("Password is missing");
      // } else if (!role) {
      //   res.status(400).json("Role is missing");
    } else {
      const newUser = await pool.query(
        `INSERT INTO users(user_name, user_type, phone_number, user_password, email) 
        VALUES($1,$2,$3,$4,$5)`,
        [name, role, phone, hash, email]
      );

      return res.json({ message: "User created", data: newUser.rows[0] });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

//login
app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const userData = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userData.rows.length) {
      const user = userData.rows[0];
      const validPassword = await bcrypt.compare(password, user.user_password);

      if (validPassword) {
        const token = jwt.sign(
          { userId: user.user_id },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );
        res.json({ msg: "Login successful", token, user, success: true });
        console.log(token);
      } else {
        res.status(401).json({ msg: "Invalid password", success: false });
      }
    } else {
      res
        .status(401)
        .json({ msg: `User with email: ${email} not found!`, success: false });
    }
  } catch (error) {
    res
      .status(500)
      .json({ msg: "Internal Server Error", error, success: false });
    console.log(error);
  }
});

// adding request
app.post("/request", verifyToken, upload.single("photo"), async (req, res) => {
  try {
 
    const filename = req.file.filename;
    const host = req.host;
    const protocal = req.protocol;


  
    const title = req.body.title;
    const description = req.body.description;
    const address = req.body.address;
    const photoString = `${protocal}://${host}/${filename}`;

    const user_id = req.userId;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;

    const newRequest = await pool.query(
      `INSERT INTO requests(title, description, address, photo, user_id, latitude, longitude) 
      VALUES($1,$2 ,$3 ,$4,$5,$6,$7 );`,
      [title, description, address, photoString, user_id, latitude, longitude]
    );
    const requested = await pool.query(
      "SELECT request_id, user_id FROM requests WHERE user_id = $1 ORDER BY request_id DESC",
      [user_id]
    );

    const availabeLocalLeader = await pool.query(
      "SELECT * FROM users WHERE user_type = 'Local_leader'"
    );

    const requestId = requested.rows[0].request_id;
    const userRequestedID = requested.rows[0].user_id;
    const localLeader = availabeLocalLeader.rows[0].user_id;

    const newApproval = await pool.query(
      "INSERT INTO approval(request_id, approvers_id) VALUES($1,$2)",
      [requestId, localLeader]
    );

    return res.json({
      msg: `Request for ${title} road recieved successfully`,
    });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error!" });
    console.log(error);
  }
});

// Get request
app.get("/request", verifyToken, async (req, res) => {
  try {
    const allRequests = await pool.query(`SELECT requests.title, 
          requests.request_id,
          requests.created_at, 
          requests.description, 
          users.user_name, 
          requests.photo,
          approval.status
        FROM requests
        INNER JOIN users ON users.user_id = requests.user_id
        LEFT JOIN LATERAL (
          SELECT status FROM approval WHERE request_id = requests.request_id
          ORDER BY approval_id DESC
          LIMIT 1
        ) approval ON TRUE
        ORDER BY requests.created_at DESC;
    `);
    res.json(allRequests.rows);
  } catch (error) {
    console.log(error);
  }
});

// Get single request
app.get("/request/:id", verifyToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    const allRequests = await pool.query(
      `SELECT *
        FROM requests
        INNER JOIN users ON users.user_id = requests.user_id
        LEFT JOIN LATERAL (
          SELECT status, approvers_id FROM approval WHERE request_id = requests.request_id
          ORDER BY approval_id DESC
          LIMIT 1
        ) approval ON TRUE
         WHERE request_id = $1
        ORDER BY requests.created_at DESC;
    `,
      [requestId]
    );
    res.json(allRequests.rows[0]);
  } catch (error) {
    console.log(error);
  }
});

// get all approvals
app.get("/approvals", verifyToken, async (req, res) => {
  // const user_id = req.userId
  const allApproval = await pool.query(
    `SELECT * FROM approval 
      INNER JOIN users ON users.user_id=approval.approvers_id 
      INNER JOIN requests ON requests.request_id = approval.request_id WHERE approvers_id = $1 ORDER BY approval_id DESC;`,
    [req.userId]
  );

  return res.json(allApproval.rows);
});

//Approve request
app.post("/approve", verifyToken, async (req, res) => {
  try {
    const approvalId = req.body.approvalId;
    const requestId = req.body.requestId;
    const status = req.body.status;
    const note = req.body.note;

    // console.log("sdsdsd++++", req.body);

    const checkApproval = await pool.query(
      `SELECT approval.*, users.user_type FROM approval INNER JOIN users ON users.user_id=approval.approvers_id 
      WHERE approval_id =$1`,
      [approvalId]
    );

    if (checkApproval.rowCount === 0) {
      return res.status(404).json({ msg: "Approval not found" });
    } else {
      //
      const approval = checkApproval.rows[0];

      if (approval.status.toUpperCase() === "PENDING") {
        if (approval.approvers_id != req.userId) {
          return res
            .status(403)
            .json(`You are not authorized to approve this request.`);
        }
        let userType;

        if (approval.user_type === "Local_leader") {
          userType = "Government";
        }

        if (approval.user_type === "Government") {
          userType = "Architect";
        }

        // update approval
        const query = await pool.query(
          `UPDATE approval SET status =$1, notes=$2 WHERE approval_id=$3`,
          [status, note, approvalId]
        );

        if (status.toUpperCase() === "REJECTED") {
          return res.json({ message: "Approval rejected" });
        }

        if (userType) {
          const findUserByType = await pool.query(
            "SELECT * FROM users WHERE user_type=$1 LIMIT 1",
            [userType]
          );

          if (findUserByType.rowCount === 0) {
            return res
              .status(404)
              .json({ message: "approval user type not found" });
          }

          const newApprovalUserId = findUserByType.rows[0].user_id;

          // create new approval
          await pool.query(
            "INSERT INTO approval(request_id, approvers_id, to_be_approved_by) VALUES($1,$2, $3)",
            [requestId, newApprovalUserId, userType]
          );

          return res.json({
            message: `Approval approved and has been assigned to ${userType}`,
          });
        }

        return res.json({
          message: `Approval approved`,
        });
      } else {
        res.status(409).json({ msg: "You can approve only Pending approvals" });
      }

      // console.log(status);
      // console.log(approvalId);
    }
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error" });
    console.log(error);
  }
});

//Government approve request
// app.post("/governmentapproved/:id", async (req, res) => {

// });

// approve request
// app.post("/approved/:id", async (req, res) => {
//   try {
//     const requestId = req.params.id;
//     const reviewedRequest = await pool.query(
//       "SELECT requests.request_id, users.user_name,requests.title, requests.description, requests.address, requests.photos, requests.user_id, requests.latitude, requests.longitude FROM requests INNER JOIN users ON requests.user_id=users.user_id WHERE request_id = $1",
//       [requestId]
//     );
//     const userName = reviewedRequest.rows[0].user_name;
//     const title = reviewedRequest.rows[0].title;
//     const description = reviewedRequest.rows[0].description;
//     const address = reviewedRequest.rows[0].address;
//     const photos = reviewedRequest.rows[0].photos;
//     const status = reviewedRequest.rows[0].status;
//     const userId = reviewedRequest.rows[0].user_id;
//     const latitude = reviewedRequest.rows[0].latitude;
//     const longitude = reviewedRequest.rows[0].longitude;

//     const approved = await pool.query(
//       "INSERT INTO approval(requested_by, request_id, title, description, address, photos, status, user_id, latitude, longitude) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
//       [
//         userName,
//         requestId,
//         title,
//         description,
//         address,
//         photos,
//         status,
//         userId,
//         latitude,
//         longitude,
//       ]
//     );

//     res.json(`Request of the road ${title} Approved`);
//   } catch (error) {
//     res.status(500).json(error);
//     console.log(error);
//   }
// });

app.listen(port, () => console.log(`Server listenig to port ${port}`));
