import express from "express";
import pkg from "pg";
import { Pool } from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

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
    } else if (!role) {
      res.status(400).json("Role is missing");
    } else {
      const newUser = await pool.query(
        "INSERT INTO users(user_name, user_type, phone_number, user_password, email) VALUES($1,$2,$3,$4,$5)",
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
        const token = generateToken(user.user_id);
        res.json({ msg: "Login successful", token, user });
        console.log(token);
      } else {
        res.status(401).json("Invalid password");
      }
    } else {
      res.status(401).json(`User with email: ${email} not found!`);
    }
  } catch (error) {
    res.status(500).json(error);
    console.log(error);
  }
});

// adding request
app.post("/request/:id", async (req, res) => {
  try {
    const title = req.body.title;
    const description = req.body.description;
    const address = req.body.address;
    const photos = req.body.photos;
    const user_id = req.params.id;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;

    const newRequest = await pool.query(
      "INSERT INTO requests(title, description, address, photos, user_id, latitude, longitude) VALUES($1,$2 ,$3 ,$4,$5,$6,$7 );",
      [title, description, address, photos, user_id, latitude, longitude]
    );
    const requested = await pool.query(
      "SELECT request_id, user_id FROM requests WHERE user_id = $1 ORDER BY request_id DESC",
      [user_id]
    );

    const availabeLocalLeader = await pool.query(
      "SELECT * FROM users WHERE user_type = 'local_leader'"
    );

    const requestId = requested.rows[0].request_id;
    const userRequestedID = requested.rows[0].user_id;
    const localLeader = availabeLocalLeader.rows[0].user_id;

    const newApproval = await pool.query(
      "INSERT INTO approval(request_id, user_id, requested_by) VALUES($1,$2,$3)",
      [requestId, localLeader, userRequestedID]
    );

    return res.json({
      msg: `Request for ${title} road recieved successfully`,
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

// Get request
app.get("/request", async (req, res) => {
  const allRequests = await pool.query("SELECT * FROM requests");
  res.json(allRequests.rows);
});

//local leader approve request
app.post("/approved/:id", async (req, res) => {
  try {
    const requestId = req.params.id;
    const getRequest = await pool.query(
      "SELECT * FROM requests WHERE request_id =$1",
      [requestId]
    );
    const government = await pool.query(
      "SELECT * FROM users WHERE user_type = 'government'"
    );

    const requestTitle = getRequest.rows[0].title;
    const requestedUserId = getRequest.rows[0].user_id;
    const governmentUserId = government.rows[0].user_id;

    const newApproval = await pool.query(
      "INSERT INTO approval(request_id, user_id, requested_by) VALUES($1,$2,$3)",
      [requestId, governmentUserId, requestedUserId]
    );

    const setApproved = await pool.query(
      "UPDATE approval SET to_be_approved_by ='government' WHERE request_id =$1",
      [requestId]
    );

    return res.json(
      `You approved ${requestTitle} request, It is now waiting for Government Approval`
    );
  } catch (error) {
    res.status(500).json(error);
  }
});

//Government approve request
app.post("/governmentapproved/:id", async (req, res) => {
  try {
    const requestId = req.params.id;
    const getRequest = await pool.query(
      "SELECT requests.title, approval.approval_id FROM requests WHERE request_id =$1 INNER JOIN ",
      [requestId]
    );
    const requestTitle = getRequest.rows[0].title;

    const setStatus = await pool.query(
      "UPDATE requests SET status ='approved' WHERE request_id =$1",
      [requestId]
    );

    return res.json(`You approved ${requestTitle} request successfuly`);
  } catch (error) {
    res.status(500).json(error);
  }
});

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
